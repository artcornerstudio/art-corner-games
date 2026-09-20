import Ajv from "ajv";
import type { DiagramRef, Formation, Lesson, Play, PositionBook, Unit } from "../types/play";
import formationSchema from "./schema/formation.schema.json";
import lessonSchema from "./schema/lesson.schema.json";
import playSchema from "./schema/play.schema.json";
import unitSchema from "./schema/unit.schema.json";

export interface ContentBundle {
  formations: Formation[];
  plays: Play[];
  positions: PositionBook;
  lessons: Lesson[];
  units: Unit[];
}

const ajv = new Ajv({ allErrors: true });
const validFormation = ajv.compile(formationSchema);
const validPlay = ajv.compile(playSchema);
const validLesson = ajv.compile(lessonSchema);
const validUnits = ajv.compile(unitSchema);

const PLAYER_COUNT: Record<string, number> = { tackle11: 11, flag5: 5, flag7: 7 };

function schemaErrors(prefix: string, errors: typeof validPlay.errors): string[] {
  return (errors ?? []).map((e) => `${prefix}: ${e.instancePath || "/"} ${e.message ?? ""}`.trim());
}

/**
 * Validates every formation and play against its JSON schema, then runs the
 * cross-file checks that a schema cannot express (ids exist, counts match,
 * every player in a play has an assignment). Returns a list of problems;
 * an empty list means the content is good.
 */
export function validateContent(bundle: ContentBundle): string[] {
  const problems: string[] = [];
  const formationsById = new Map<string, Formation>();

  for (const f of bundle.formations) {
    if (!validFormation(f)) {
      problems.push(...schemaErrors(`formation ${f.id ?? "?"}`, validFormation.errors));
      continue;
    }
    if (formationsById.has(f.id)) problems.push(`formation ${f.id}: duplicate id`);
    formationsById.set(f.id, f);

    const expected = PLAYER_COUNT[f.variant];
    if (f.players.length !== expected) {
      problems.push(`formation ${f.id}: ${f.variant} needs ${expected} players, has ${f.players.length}`);
    }
    const ids = new Set<string>();
    for (const p of f.players) {
      if (ids.has(p.id)) problems.push(`formation ${f.id}: duplicate player id ${p.id}`);
      ids.add(p.id);
      const info = bundle.positions[p.position];
      if (!info) problems.push(`formation ${f.id}: player ${p.id} has unknown position ${p.position}`);
      else if (info.side !== f.side) problems.push(`formation ${f.id}: ${p.position} is a ${info.side} position on a ${f.side} formation`);
      if (f.side === "offense" && p.y > 0) problems.push(`formation ${f.id}: offense player ${p.id} is past the line of scrimmage`);
      if (f.side === "defense" && p.y <= 0) problems.push(`formation ${f.id}: defense player ${p.id} is not past the line of scrimmage`);
    }
  }

  const playIds = new Set<string>();
  for (const play of bundle.plays) {
    if (!validPlay(play)) {
      problems.push(...schemaErrors(`play ${play.id ?? "?"}`, validPlay.errors));
      continue;
    }
    if (playIds.has(play.id)) problems.push(`play ${play.id}: duplicate id`);
    playIds.add(play.id);

    const offense = formationsById.get(play.formationId);
    const defense = formationsById.get(play.defenseFormationId);
    if (!offense) problems.push(`play ${play.id}: unknown formation ${play.formationId}`);
    if (!defense) problems.push(`play ${play.id}: unknown defense formation ${play.defenseFormationId}`);
    if (!offense || !defense) continue;

    if (offense.side !== "offense") problems.push(`play ${play.id}: ${offense.id} is not an offense formation`);
    if (defense.side !== "defense") problems.push(`play ${play.id}: ${defense.id} is not a defense formation`);
    if (offense.variant !== play.variant || defense.variant !== play.variant) {
      problems.push(`play ${play.id}: formations must match variant ${play.variant}`);
    }

    const allPlayers = new Set([...offense.players, ...defense.players].map((p) => p.id));
    const offensePlayers = new Set(offense.players.map((p) => p.id));
    const assigned = new Set<string>();
    for (const a of play.assignments) {
      if (!allPlayers.has(a.playerId)) problems.push(`play ${play.id}: assignment for unknown player ${a.playerId}`);
      if (assigned.has(a.playerId)) problems.push(`play ${play.id}: player ${a.playerId} has two assignments`);
      assigned.add(a.playerId);
      if (a.kind !== "stay" && a.path.length === 0) problems.push(`play ${play.id}: ${a.playerId} has an empty path`);
    }
    for (const id of allPlayers) {
      if (!assigned.has(id)) problems.push(`play ${play.id}: player ${id} has no assignment (use kind "stay" with an empty path)`);
    }

    if (!offensePlayers.has(play.ball.start)) problems.push(`play ${play.id}: ball must start with an offense player`);
    let lastT = -1;
    for (const e of play.ball.events) {
      if (!offensePlayers.has(e.to)) problems.push(`play ${play.id}: ball event to unknown offense player ${e.to}`);
      if (e.t < lastT) problems.push(`play ${play.id}: ball events must be in time order`);
      lastT = e.t;
    }
  }

  // Lessons and units.
  if (!validUnits(bundle.units)) problems.push(...schemaErrors("units", validUnits.errors));
  const unitIds = new Set(bundle.units.map((u) => u.id));
  const playsById = new Map(bundle.plays.map((p) => [p.id, p] as const));

  const diagramPlayers = (d: DiagramRef): Set<string> | null => {
    if (d.playId) {
      const play = playsById.get(d.playId);
      const o = play && formationsById.get(play.formationId);
      const de = play && formationsById.get(play.defenseFormationId);
      if (!play || !o || !de) return null;
      return new Set([...o.players, ...de.players].map((p) => p.id));
    }
    if (d.formationId) {
      const f = formationsById.get(d.formationId);
      return f ? new Set(f.players.map((p) => p.id)) : null;
    }
    return null;
  };
  const checkDiagram = (where: string, d: DiagramRef | undefined) => {
    if (!d) return null;
    if (!d.playId && !d.formationId) problems.push(`${where}: diagram needs a playId or a formationId`);
    if (d.playId && !playsById.has(d.playId)) problems.push(`${where}: unknown play ${d.playId}`);
    if (d.formationId && !formationsById.has(d.formationId)) problems.push(`${where}: unknown formation ${d.formationId}`);
    const players = diagramPlayers(d);
    for (const h of d.highlight ?? []) {
      if (players && !players.has(h)) problems.push(`${where}: highlight names unknown player ${h}`);
    }
    return players;
  };

  const lessonIds = new Set<string>();
  for (const lesson of bundle.lessons) {
    if (!validLesson(lesson)) {
      problems.push(...schemaErrors(`lesson ${lesson.id ?? "?"}`, validLesson.errors));
      continue;
    }
    if (lessonIds.has(lesson.id)) problems.push(`lesson ${lesson.id}: duplicate id`);
    lessonIds.add(lesson.id);
    if (!unitIds.has(lesson.unitId)) problems.push(`lesson ${lesson.id}: unknown unit ${lesson.unitId}`);
    lesson.steps.forEach((step, i) => checkDiagram(`lesson ${lesson.id} step ${i + 1}`, step.diagram));
    lesson.quiz.forEach((q, i) => {
      const where = `lesson ${lesson.id} question ${i + 1}`;
      if (q.type === "choice") {
        checkDiagram(where, q.diagram);
        if (q.answer >= q.choices.length) problems.push(`${where}: answer index ${q.answer} is out of range`);
        if (new Set(q.choices).size !== q.choices.length) problems.push(`${where}: duplicate choices`);
      } else {
        const players = checkDiagram(where, q.diagram);
        if (players && !players.has(q.target)) problems.push(`${where}: tap target ${q.target} is not on the diagram`);
      }
    });
  }
  for (const u of bundle.units) {
    if (!bundle.lessons.some((l) => l.unitId === u.id)) problems.push(`unit ${u.id}: has no lessons`);
  }

  return problems;
}
