import type { Play, Situation } from "../types/play";
import { mulberry32 } from "../utils/random";

/**
 * A small, readable play-outcome engine. It is not a simulation of 22 players;
 * it is a rules table a kid can understand: each play has a typical gain, a
 * boom chance, and a bust chance, and the defense the play is called against
 * nudges those numbers. Everything is in yards and is explained in words.
 */

export interface Outcome {
  yards: number;
  /** "gain" | "loss" | "incomplete" | "sack" | "turnover" | "touchdown" */
  result: "gain" | "loss" | "incomplete" | "sack" | "turnover" | "touchdown" | "first-down";
  firstDown: boolean;
  touchdown: boolean;
  turnover: boolean;
  /** One line in kid language. */
  story: string;
}

interface Profile {
  /** Typical yards when the play works as drawn. */
  typical: number;
  /** Chance of a big play, 0 to 1. */
  boom: number;
  /** Yards on a boom. */
  boomYards: number;
  /** Chance the play fails outright (incomplete, stuffed, sacked). */
  bust: number;
  /** Chance of a turnover (interception or fumble). */
  turnover: number;
  /** Words for a bust. */
  bustStory: string;
}

function baseProfile(play: Play): Profile {
  const tags = new Set(play.tags ?? []);
  if (play.type === "run") {
    if (tags.has("power")) return { typical: 4, boom: 0.12, boomYards: 14, bust: 0.22, turnover: 0.02, bustStory: "The defense stacks the hole and the back is stopped at the line." };
    return { typical: 4.5, boom: 0.15, boomYards: 16, bust: 0.2, turnover: 0.02, bustStory: "A linebacker fills the lane and the runner goes down after a yard." };
  }
  if (tags.has("screen")) return { typical: 6, boom: 0.2, boomYards: 22, bust: 0.3, turnover: 0.03, bustStory: "A defender sniffs out the screen and tackles the receiver as he catches it." };
  if (tags.has("deep")) return { typical: 20, boom: 0.25, boomYards: 38, bust: 0.5, turnover: 0.08, bustStory: "The deep ball sails out of reach. Incomplete." };
  if (tags.has("quick")) return { typical: 6, boom: 0.15, boomYards: 18, bust: 0.28, turnover: 0.03, bustStory: "The defender jumps the route and the pass falls incomplete." };
  return { typical: 9, boom: 0.18, boomYards: 24, bust: 0.35, turnover: 0.04, bustStory: "Coverage is tight and the quarterback throws it away." };
}

/** How the defensive look on the play's own diagram changes the odds. */
function adjust(play: Play, p: Profile): Profile {
  const tags = new Set(play.tags ?? []);
  const out = { ...p };
  if (tags.has("beats-cover2") || tags.has("beats-cover3") || tags.has("beats-man") || tags.has("beats-blitz") || tags.has("beats-zone")) {
    out.bust *= 0.7;
    out.boom *= 1.3;
  }
  if (tags.has("hot")) out.turnover *= 0.6;
  return out;
}

function situationFactor(s: Situation | undefined, p: Profile): Profile {
  if (!s) return p;
  const out = { ...p };
  // Near the goal line there is less room for big plays.
  const room = 100 - s.yardLine;
  if (room < 15) {
    out.boomYards = Math.min(out.boomYards, room);
    out.typical = Math.min(out.typical, Math.max(1, room - 1));
  }
  return out;
}

export interface ResolveInput {
  play: Play;
  situation?: Situation;
  /** Seed for repeatable results; omit for a real random play. */
  seed?: number;
}

export function resolvePlay({ play, situation, seed }: ResolveInput): Outcome {
  const rand = seed === undefined ? Math.random : mulberry32(seed);
  const p = situationFactor(situation, adjust(play, baseProfile(play)));
  const roll = rand();
  const distance = situation?.distance ?? 10;
  const room = situation ? 100 - situation.yardLine : 100;

  let yards: number;
  let story: string;
  let result: Outcome["result"];
  if (roll < p.turnover) {
    yards = play.type === "run" ? 0 : -1;
    return { yards: 0, result: "turnover", firstDown: false, touchdown: false, turnover: true, story: play.type === "run" ? "The ball pops loose and the defense falls on it. Turnover." : "The defender steps in front of the receiver. Intercepted." };
  }
  if (roll < p.turnover + p.bust) {
    const sack = play.type === "pass" && rand() < 0.3;
    yards = sack ? -Math.round(4 + rand() * 5) : play.type === "run" ? Math.round(rand() * 2) : 0;
    result = sack ? "sack" : yards > 0 ? "gain" : play.type === "run" ? "loss" : "incomplete";
    story = sack ? "The rush gets home. Sacked for a loss." : p.bustStory;
    return { yards, result, firstDown: false, touchdown: false, turnover: false, story };
  }
  if (roll < p.turnover + p.bust + p.boom) {
    yards = Math.round(p.boomYards * (0.8 + rand() * 0.5));
    story = play.type === "run" ? "He finds the crease and breaks into the open field." : "The receiver comes wide open and turns it upfield.";
  } else {
    yards = Math.round(p.typical * (0.6 + rand() * 0.9));
    story = play.type === "run" ? "A solid run. He falls forward for extra yards." : "Good throw, clean catch, and the receiver is brought down.";
  }
  const touchdown = yards >= room;
  if (touchdown) {
    yards = room;
    story = play.type === "run" ? "He is not going down. Touchdown!" : "Caught, and he walks into the end zone. Touchdown!";
    return { yards, result: "touchdown", firstDown: true, touchdown: true, turnover: false, story };
  }
  const firstDown = yards >= distance;
  return { yards, result: firstDown ? "first-down" : "gain", firstDown, touchdown: false, turnover: false, story: firstDown ? `${story} That moves the chains.` : story };
}

/** Chance a field goal is good, by distance from the spot of the kick (yard line + 17). */
export function fieldGoalChance(yardLine: number): number {
  const distance = 100 - yardLine + 17;
  if (distance <= 30) return 0.97;
  if (distance <= 40) return 0.9;
  if (distance <= 50) return 0.75;
  if (distance <= 55) return 0.55;
  if (distance <= 60) return 0.3;
  return 0.05;
}

/** Typical punt: where the other team starts, from the punting team's own goal line. */
export function puntResult(yardLine: number, rand: () => number = Math.random): { netYards: number; touchback: boolean } {
  const net = Math.round(38 + rand() * 10);
  const landing = yardLine + net;
  if (landing >= 100) return { netYards: 100 - yardLine - 20, touchback: true };
  return { netYards: net, touchback: false };
}
