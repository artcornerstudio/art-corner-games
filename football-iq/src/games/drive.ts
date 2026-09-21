import { plays } from "../content";
import type { Play, Situation } from "../types/play";
import { fieldGoalChance, LOOK_LABEL, matchupNote, puntResult, resolvePlay, type DefenseLook, type Outcome } from "./outcome";
import { pick } from "../utils/random";

/**
 * Drive Simulator state machine. One drive at a time: start at your own 25,
 * pick a play each down, the AI defense picks a look, the outcome engine
 * resolves it. Ends on a touchdown, field goal, punt, turnover, or turnover on downs.
 */

export interface DriveState {
  down: 1 | 2 | 3 | 4;
  distance: number;
  /** Yards from the offense's own goal line. */
  yardLine: number;
  plays: number;
  yardsGained: number;
  ended: null | { how: "touchdown" | "field-goal" | "missed-field-goal" | "punt" | "turnover" | "downs"; points: number; summary: string };
  log: DriveLogEntry[];
}

export interface DriveLogEntry {
  down: number;
  distance: number;
  yardLine: number;
  call: string;
  look: DefenseLook | null;
  outcome: Outcome | null;
  note: string;
}

export type DriveCall = { kind: "play"; play: Play } | { kind: "punt" } | { kind: "field-goal" };

export function newDrive(yardLine = 25): DriveState {
  return { down: 1, distance: 10, yardLine, plays: 0, yardsGained: 0, ended: null, log: [] };
}

/** Plays a coach can call in the simulator: real 11-on-11 plays, no special teams, no demos. */
export function callablePlays(): Play[] {
  return plays.filter((p) => p.variant === "tackle11" && !(p.tags ?? []).some((t) => ["demo", "special-teams", "two-point"].includes(t)));
}

/** The AI defense's call. It leans on tendencies a kid can learn to read: long yardage brings deep shells, short yardage stacks the box, and it blitzes now and then. */
export function chooseLook(state: DriveState, rand: () => number = Math.random): DefenseLook {
  const { down, distance } = state;
  const roll = rand();
  if (distance >= 8) return roll < 0.3 ? "cover2" : roll < 0.55 ? "cover3" : roll < 0.7 ? "light-box" : roll < 0.85 ? "blitz" : "cover1";
  if (distance <= 2) return roll < 0.45 ? "stacked-box" : roll < 0.7 ? "cover1" : roll < 0.85 ? "blitz" : "base";
  if (down === 3) return roll < 0.3 ? "blitz" : roll < 0.55 ? "cover1" : roll < 0.8 ? "cover3" : "cover2";
  return pick<DefenseLook>(["base", "cover2", "cover3", "cover1", "light-box"], rand);
}

export function situationOf(state: DriveState): Situation {
  return { id: "drive", variant: "tackle11", down: state.down, distance: state.distance, yardLine: state.yardLine, options: [] };
}

export function describeDownAndDistance(state: DriveState): string {
  const ordinal = ["1st", "2nd", "3rd", "4th"][state.down - 1];
  const goal = state.yardLine + state.distance >= 100;
  return `${ordinal} and ${goal ? "goal" : state.distance}`;
}

export function fieldGoalDistance(yardLine: number): number {
  return 100 - yardLine + 17;
}

export function applyCall(state: DriveState, call: DriveCall, rand: () => number = Math.random, seed?: number): DriveState {
  if (state.ended) return state;
  const next: DriveState = { ...state, log: [...state.log], plays: state.plays + 1 };
  const base = { down: state.down, distance: state.distance, yardLine: state.yardLine };

  if (call.kind === "punt") {
    const r = puntResult(state.yardLine, rand);
    const summary = r.touchback ? "Punt into the end zone. Touchback." : `Punt. They take over at their own ${Math.max(1, 100 - state.yardLine - r.netYards)}.`;
    next.ended = { how: "punt", points: 0, summary };
    next.log.push({ ...base, call: "Punt", look: null, outcome: null, note: summary });
    return next;
  }
  if (call.kind === "field-goal") {
    const dist = fieldGoalDistance(state.yardLine);
    const good = rand() < fieldGoalChance(state.yardLine);
    const summary = good ? `${dist}-yard field goal is good! Three points.` : `${dist}-yard field goal is no good.`;
    next.ended = { how: good ? "field-goal" : "missed-field-goal", points: good ? 3 : 0, summary };
    next.log.push({ ...base, call: `Field goal (${dist} yards)`, look: null, outcome: null, note: summary });
    return next;
  }

  const look = chooseLook(state, rand);
  const outcome = resolvePlay({ play: call.play, situation: situationOf(state), look, seed });
  const note = `${LOOK_LABEL[look]}. ${matchupNote(call.play, look)}`;
  next.log.push({ ...base, call: call.play.name, look, outcome, note });
  next.yardsGained += outcome.yards;

  if (outcome.turnover) {
    next.ended = { how: "turnover", points: 0, summary: `${outcome.story} Drive over.` };
    return next;
  }
  if (outcome.touchdown) {
    next.yardLine = 100;
    next.ended = { how: "touchdown", points: 7, summary: `${outcome.story} Extra point is good: 7 points.` };
    return next;
  }
  next.yardLine = Math.max(1, state.yardLine + outcome.yards);
  if (outcome.firstDown) {
    next.down = 1;
    next.distance = Math.min(10, 100 - next.yardLine);
    return next;
  }
  if (state.down === 4) {
    next.ended = { how: "downs", points: 0, summary: `${outcome.story} Short of the line. Turnover on downs at your ${next.yardLine < 50 ? next.yardLine : "opponent's " + (100 - next.yardLine)}.` };
    return next;
  }
  next.down = (state.down + 1) as DriveState["down"];
  next.distance = Math.max(1, state.distance - outcome.yards);
  return next;
}
