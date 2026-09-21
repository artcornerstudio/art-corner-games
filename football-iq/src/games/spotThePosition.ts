import { formationsForVariant, positions } from "../content";
import type { Formation, Variant } from "../types/play";
import { pick, shuffle } from "../utils/random";

export const SPOT_ROUNDS = 10;
/** Seconds on the Varsity clock for the whole game. */
export const VARSITY_SECONDS = 45;

export interface SpotRound {
  offense: Formation;
  defense: Formation;
  /** Position code to find, e.g. "CB". Any player with that code counts. */
  position: string;
  /** Number of players on the diagram with that position. */
  count: number;
}

export function buildRounds(variant: Variant, rand: () => number = Math.random): SpotRound[] {
  const { offense, defense } = formationsForVariant(variant);
  const rounds: SpotRound[] = [];
  let last = "";
  for (let i = 0; i < SPOT_ROUNDS; i++) {
    const o = pick(offense, rand);
    const d = pick(defense, rand);
    const codes = shuffle([...new Set([...o.players, ...d.players].map((p) => p.position))].filter((c) => c !== last), rand);
    const position = codes[0];
    last = position;
    rounds.push({ offense: o, defense: d, position, count: [...o.players, ...d.players].filter((p) => p.position === position).length });
  }
  return rounds;
}

export function roundPrompt(round: SpotRound): string {
  const name = positions[round.position].name.toLowerCase();
  const article = round.count > 1 ? "a" : "the";
  return `Tap ${article} ${name}.`;
}
