import type { Assignment, AssignmentKind, Formation, Play, Point } from "../types/play";
import { distance } from "./geometry";

/** Seconds a thrown ball spends in the air. */
export const THROW_FLIGHT = 0.6;
/** Seconds of stillness added after the last player stops. */
const TAIL = 0.6;

const DEFAULT_SPEED: Record<AssignmentKind, number> = {
  route: 7,
  carry: 6.5,
  dropback: 4,
  block: 3,
  rush: 3.5,
  cover: 5,
  pursue: 5,
  stay: 0,
};

export function assignmentSpeed(a: Assignment): number {
  return a.speed ?? DEFAULT_SPEED[a.kind];
}

/** Total seconds this player moves for, including the delay before the first step. */
export function assignmentDuration(start: Point, a: Assignment): number {
  const speed = assignmentSpeed(a);
  if (speed <= 0 || a.path.length === 0) return a.delay ?? 0;
  let length = 0;
  let prev = start;
  for (const p of a.path) {
    length += distance(prev, p);
    prev = p;
  }
  return (a.delay ?? 0) + length / speed;
}

/** Where a player is `t` seconds after the snap, moving at constant speed along their path. */
export function positionAt(start: Point, a: Assignment, t: number): Point {
  const speed = assignmentSpeed(a);
  const elapsed = t - (a.delay ?? 0);
  if (elapsed <= 0 || speed <= 0 || a.path.length === 0) return start;
  let remaining = elapsed * speed;
  let prev = start;
  for (const p of a.path) {
    const seg = distance(prev, p);
    if (remaining <= seg) {
      const k = seg === 0 ? 1 : remaining / seg;
      return { x: prev.x + (p.x - prev.x) * k, y: prev.y + (p.y - prev.y) * k };
    }
    remaining -= seg;
    prev = p;
  }
  return prev;
}

export interface PlayFrame {
  /** Player id to position, for every player on both sides. */
  players: Map<string, Point>;
  ball: Point;
  /** Player id holding the ball, or null while it is in the air. */
  carrier: string | null;
}

export interface CompiledPlay {
  play: Play;
  offense: Formation;
  defense: Formation;
  starts: Map<string, Point>;
  assignments: Map<string, Assignment>;
  duration: number;
}

export function compilePlay(play: Play, offense: Formation, defense: Formation): CompiledPlay {
  const starts = new Map<string, Point>();
  for (const p of [...offense.players, ...defense.players]) starts.set(p.id, { x: p.x, y: p.y });
  const assignments = new Map(play.assignments.map((a) => [a.playerId, a] as const));
  let duration = 0;
  for (const [id, a] of assignments) {
    duration = Math.max(duration, assignmentDuration(starts.get(id)!, a));
  }
  for (const e of play.ball.events) duration = Math.max(duration, e.t + (e.throw ? THROW_FLIGHT : 0));
  return { play, offense, defense, starts, assignments, duration: duration + TAIL };
}

export function frameAt(c: CompiledPlay, t: number): PlayFrame {
  const players = new Map<string, Point>();
  for (const [id, start] of c.starts) {
    const a = c.assignments.get(id);
    players.set(id, a ? positionAt(start, a, t) : start);
  }

  let carrier: string | null = c.play.ball.start;
  let ball = players.get(carrier)!;
  let previousCarrier = carrier;
  for (const e of c.play.ball.events) {
    if (t < e.t) break;
    if (e.throw && t < e.t + THROW_FLIGHT) {
      // Ball in flight: from where the thrower was at release to where the receiver is now.
      const from = positionAt(c.starts.get(previousCarrier!)!, c.assignments.get(previousCarrier!) ?? { playerId: previousCarrier!, kind: "stay", path: [] }, e.t);
      const to = players.get(e.to)!;
      const k = (t - e.t) / THROW_FLIGHT;
      ball = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
      carrier = null;
      return { players, ball, carrier };
    }
    previousCarrier = e.to;
    carrier = e.to;
    ball = players.get(e.to)!;
  }
  return { players, ball, carrier };
}

/** A still diagram: two formations facing each other with nobody moving. */
export function compileFormations(offense: Formation, defense: Formation): CompiledPlay {
  const play: Play = {
    id: `static-${offense.id}-${defense.id}`,
    name: offense.name,
    variant: offense.variant,
    type: "run",
    formationId: offense.id,
    defenseFormationId: defense.id,
    description: offense.description,
    why: "",
    assignments: [],
    ball: { start: offense.players[0]?.id ?? "", events: [] },
  };
  return compilePlay(play, offense, defense);
}
