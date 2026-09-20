import type { Assignment, AssignmentKind, BallEvent, Formation, Play, Point } from "../types/play";
import { distance } from "./geometry";

/** Seconds a thrown ball spends in the air. */
export const THROW_FLIGHT = 0.6;
/** Seconds a kicked ball spends in the air when the play does not say. */
export const KICK_FLIGHT = 2.5;

function flightOf(e: BallEvent): number {
  if (e.flight) return e.flight;
  if (e.toPoint) return KICK_FLIGHT;
  return e.throw ? THROW_FLIGHT : 0;
}
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
  for (const e of play.ball.events) duration = Math.max(duration, e.t + flightOf(e));
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
  /** Where the ball was released or last came to rest, for the next flight. */
  let releasePoint = (at: number): Point => {
    if (carrier) {
      const a = c.assignments.get(carrier) ?? { playerId: carrier, kind: "stay" as const, path: [] };
      return positionAt(c.starts.get(carrier)!, a, at);
    }
    return ball;
  };
  for (const e of c.play.ball.events) {
    if (t < e.t) break;
    const flight = flightOf(e);
    const from = releasePoint(e.t);
    if (flight > 0 && t < e.t + flight) {
      // In the air: from the release spot toward the receiver (wherever they are now) or the landing spot.
      const to = e.toPoint ?? players.get(e.to!)!;
      const k = (t - e.t) / flight;
      ball = { x: from.x + (to.x - from.x) * k, y: from.y + (to.y - from.y) * k };
      return { players, ball, carrier: null };
    }
    if (e.toPoint) {
      ball = e.toPoint;
      carrier = null;
      releasePoint = () => e.toPoint!;
    } else {
      carrier = e.to!;
      ball = players.get(e.to!)!;
      const settled = carrier;
      releasePoint = (at: number) => positionAt(c.starts.get(settled)!, c.assignments.get(settled) ?? { playerId: settled, kind: "stay", path: [] }, at);
    }
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
