import Ajv from "ajv";
import type { Formation, Play, PositionBook } from "../types/play";
import formationSchema from "./schema/formation.schema.json";
import playSchema from "./schema/play.schema.json";

export interface ContentBundle {
  formations: Formation[];
  plays: Play[];
  positions: PositionBook;
}

const ajv = new Ajv({ allErrors: true });
const validFormation = ajv.compile(formationSchema);
const validPlay = ajv.compile(playSchema);

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

  return problems;
}
