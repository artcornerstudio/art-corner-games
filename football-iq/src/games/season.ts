import type { Play } from "../types/play";
import { applyCall, callablePlays, newDrive, situationOf, type DriveState } from "./drive";
import { LOOK_LABEL, matchupNote, resolvePlay, fieldGoalChance, puntResult, type DefenseLook } from "./outcome";
import { pick } from "../utils/random";

/**
 * Season lite: four games against fictional teams with tendencies. In each game
 * you call four drives on offense and four defensive looks per snap when the
 * opponent has the ball. The outcome engine resolves both.
 */

export interface Opponent {
  id: string;
  name: string;
  /** What this team does most, in kid language. Shown before the game. */
  tendency: string;
  /** Weights for the plays it calls. Tags match play tags. */
  likes: Partial<Record<"run" | "quick" | "deep" | "screen" | "power" | "intermediate", number>>;
  /** Which defensive looks it leans on when you have the ball. */
  defense: DefenseLook[];
}

export const OPPONENTS: Opponent[] = [
  { id: "rockets", name: "Riverside Rockets", tendency: "They love the deep ball. Almost every third down is a shot downfield.", likes: { deep: 4, intermediate: 2, quick: 1, run: 1 }, defense: ["cover1", "blitz", "base"] },
  { id: "bulldozers", name: "Brickyard Bulldozers", tendency: "Run, run, run. Power football on first and second down.", likes: { run: 5, power: 3, quick: 1 }, defense: ["stacked-box", "base", "cover3"] },
  { id: "hornets", name: "Hilltop Hornets", tendency: "Quick passes and screens. They get the ball out fast.", likes: { quick: 4, screen: 3, run: 2 }, defense: ["cover2", "cover3", "light-box"] },
  { id: "storm", name: "Summit Storm", tendency: "Balanced and sneaky. They mix everything and love play action.", likes: { run: 3, intermediate: 3, deep: 2, quick: 2 }, defense: ["cover2", "cover1", "blitz", "base"] },
];

export const LOOKS: DefenseLook[] = ["base", "cover1", "cover2", "cover3", "blitz", "light-box", "stacked-box"];

export interface GameState {
  opponent: Opponent;
  /** Drive index 0 to 7: even = you on offense, odd = opponent on offense. */
  driveIndex: number;
  yourPoints: number;
  theirPoints: number;
  drive: DriveState;
  /** Last snap summary for the scoreboard. */
  last: { call: string; look: DefenseLook | null; result: string; note: string } | null;
  finished: boolean;
}

export const DRIVES_PER_TEAM = 4;

export function newGame(opponent: Opponent): GameState {
  return { opponent, driveIndex: 0, yourPoints: 0, theirPoints: 0, drive: newDrive(), last: null, finished: false };
}

export function onOffense(g: GameState): boolean {
  return g.driveIndex % 2 === 0;
}

/** The opponent picks a play from the callable pool by its tendencies and the situation. */
export function opponentPlay(opp: Opponent, drive: DriveState, rand: () => number = Math.random): Play {
  const pool = callablePlays();
  const weights = pool.map((p) => {
    const tags = new Set(p.tags ?? []);
    let w = 0.5;
    for (const [tag, weight] of Object.entries(opp.likes)) if (tags.has(tag)) w += weight ?? 0;
    if (drive.distance >= 8 && p.type === "run") w *= 0.4;
    if (drive.distance <= 2 && p.type === "run") w *= 1.8;
    return w;
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) return pool[i];
  }
  return pool[pool.length - 1];
}

/** Your snap on offense. */
export function yourSnap(g: GameState, call: Parameters<typeof applyCall>[1], rand: () => number = Math.random): GameState {
  const drive = applyCall(g.drive, call, rand);
  const entry = drive.log[drive.log.length - 1];
  const next: GameState = { ...g, drive, last: { call: entry.call, look: entry.look, result: entry.outcome ? resultLine(entry.outcome.yards, entry.outcome.firstDown, entry.outcome.touchdown, entry.outcome.turnover) : entry.note, note: entry.note } };
  if (drive.ended) next.yourPoints += drive.ended.points;
  return next;
}

/** Their snap: you called a look, they called a play. */
export function theirSnap(g: GameState, look: DefenseLook, rand: () => number = Math.random): GameState & { theirPlay: Play } {
  const play = opponentPlay(g.opponent, g.drive, rand);
  const state = g.drive;
  const next: DriveState = { ...state, log: [...state.log], plays: state.plays + 1 };
  const base = { down: state.down, distance: state.distance, yardLine: state.yardLine };
  // Fourth down: they punt or kick like a sensible team.
  if (state.down === 4) {
    const fgDist = 100 - state.yardLine + 17;
    if (fgDist <= 50) {
      const good = rand() < fieldGoalChance(state.yardLine);
      next.ended = { how: good ? "field-goal" : "missed-field-goal", points: good ? 3 : 0, summary: good ? `${fgDist}-yard field goal is good.` : `${fgDist}-yard field goal is no good.` };
      next.log.push({ ...base, call: `Field goal (${fgDist} yards)`, look: null, outcome: null, note: next.ended.summary });
    } else {
      const r = puntResult(state.yardLine, rand);
      next.ended = { how: "punt", points: 0, summary: r.touchback ? "They punt into the end zone. Touchback." : `They punt. You will start at your ${Math.max(1, 100 - state.yardLine - r.netYards)}.` };
      next.log.push({ ...base, call: "Punt", look: null, outcome: null, note: next.ended.summary });
    }
    return { ...g, drive: next, theirPoints: g.theirPoints + (next.ended.points ?? 0), last: { call: next.log[next.log.length - 1].call, look, result: next.ended.summary, note: "" }, theirPlay: play };
  }
  const outcome = resolvePlay({ play, situation: situationOf(state), look });
  const note = `${LOOK_LABEL[look]}. ${matchupNote(play, look)}`;
  next.log.push({ ...base, call: play.name, look, outcome, note });
  next.yardsGained += outcome.yards;
  let points = 0;
  if (outcome.turnover) next.ended = { how: "turnover", points: 0, summary: `${outcome.story} You get the ball!` };
  else if (outcome.touchdown) {
    next.yardLine = 100;
    points = 7;
    next.ended = { how: "touchdown", points: 7, summary: `${outcome.story} They score 7.` };
  } else {
    next.yardLine = Math.max(1, state.yardLine + outcome.yards);
    if (outcome.firstDown) {
      next.down = 1;
      next.distance = Math.min(10, 100 - next.yardLine);
    } else {
      next.down = (state.down + 1) as DriveState["down"];
      next.distance = Math.max(1, state.distance - outcome.yards);
    }
  }
  return { ...g, drive: next, theirPoints: g.theirPoints + points, last: { call: play.name, look, result: resultLine(outcome.yards, outcome.firstDown, outcome.touchdown, outcome.turnover), note }, theirPlay: play };
}

export function resultLine(yards: number, firstDown: boolean, touchdown: boolean, turnover: boolean): string {
  if (touchdown) return "Touchdown!";
  if (turnover) return "Turnover!";
  const gained = yards >= 0 ? `Gain of ${yards}` : `Loss of ${-yards}`;
  return firstDown ? `${gained}. First down.` : `${gained}.`;
}

/** After a drive ends, move to the next one or finish the game. */
export function nextDrive(g: GameState): GameState {
  const driveIndex = g.driveIndex + 1;
  if (driveIndex >= DRIVES_PER_TEAM * 2) return { ...g, driveIndex, finished: true, last: null };
  return { ...g, driveIndex, drive: newDrive(), last: null };
}

export interface SeasonRecord {
  games: { opponentId: string; yourPoints: number; theirPoints: number; won: boolean }[];
}

export function seasonSummary(rec: SeasonRecord): { wins: number; losses: number; ties: number } {
  let wins = 0, losses = 0, ties = 0;
  for (const g of rec.games) {
    if (g.yourPoints > g.theirPoints) wins++;
    else if (g.yourPoints < g.theirPoints) losses++;
    else ties++;
  }
  return { wins, losses, ties };
}

export function pickLook(rand: () => number = Math.random): DefenseLook {
  return pick(LOOKS, rand);
}
