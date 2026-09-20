import { plays } from "../content";
import type { Play } from "../types/play";
import { pick, shuffle } from "../utils/random";

/** A defensive look and the play concept that beats it. */
export interface CoverageRound {
  /** Defense formation to show pre-snap. */
  formationId: string;
  name: string;
  /** What the kid should notice. */
  tell: string;
  /** The play that beats it, animated after the answer. */
  answerPlayId: string;
  /** Why it works. */
  why: string;
  /** Defenders to ring on the pre-snap picture, e.g. blitzers creeping up. */
  highlight?: string[];
}

export const COVERAGE_LOOKS: CoverageRound[] = [
  { formationId: "cover2-tackle", name: "Cover 2", tell: "Two safeties deep, splitting the field in half. Cornerbacks short, guarding the flats.", answerPlayId: "smash-vs-cover2", why: "The corner route lands along the sideline between the short cornerback and the deep safety. That gap is the soft spot in Cover 2." },
  { formationId: "cover3-tackle", name: "Cover 3", tell: "One safety deep in the middle and both cornerbacks backed way up: three deep defenders.", answerPlayId: "four-verts-vs-cover3", why: "Three deep defenders cannot cover four deep receivers. The seams between the thirds come open." },
  { formationId: "cover1-tackle", name: "Cover 1 man", tell: "One safety deep, and every cornerback lined up right on top of a receiver. That is man coverage.", answerPlayId: "mesh-vs-cover1", why: "Crossing routes make man defenders run into each other. One crosser comes out open." },
  { formationId: "cover1-tackle", name: "Blitz", tell: "The middle linebacker and strong safety are creeping toward the line. Six rushers are coming.", answerPlayId: "blitz-hot-slant", why: "More rushers means fewer defenders in coverage. Throw the quick slant before the blitz arrives.", highlight: ["mike", "ss"] },
];

/** Plays a kid can choose from when beating a coverage, by id. */
export const COVERAGE_OPTIONS: string[] = ["smash-vs-cover2", "four-verts-vs-cover3", "mesh-vs-cover1", "blitz-hot-slant"];

export const COVERAGE_OPTION_LABEL: Record<string, string> = {
  "smash-vs-cover2": "Smash (hitch + corner)",
  "four-verts-vs-cover3": "Four Verticals (seams)",
  "mesh-vs-cover1": "Mesh (crossing routes)",
  "blitz-hot-slant": "Hot slant (quick throw)",
};

export function buildCoverageRounds(count: number, rand: () => number = Math.random): CoverageRound[] {
  const out: CoverageRound[] = [];
  let last: CoverageRound | null = null;
  while (out.length < count) {
    const next = pick(COVERAGE_LOOKS.filter((l) => l !== last), rand);
    out.push(next);
    last = next;
  }
  return out;
}

/** Pass plays with a hot receiver, for the Hot Read game. */
export function hotReadPlays(variant: "tackle11" | "flag5" | "flag7"): Play[] {
  return plays.filter((p) => p.variant === variant && p.type === "pass" && p.hot && !(p.tags ?? []).includes("demo"));
}

export function buildHotReadRounds(variant: "tackle11" | "flag5" | "flag7", count: number, rand: () => number = Math.random): Play[] {
  const pool = hotReadPlays(variant);
  const rounds: Play[] = [];
  while (rounds.length < count && pool.length > 0) rounds.push(...shuffle(pool, rand));
  return rounds.slice(0, count);
}

/** Defenders drawn as blitzers on a Hot Read diagram: linebackers and the strong safety. */
export function blitzers(defenseFormationPlayers: { id: string; position: string; label?: string }[]): string[] {
  return defenseFormationPlayers.filter((p) => p.position === "LB" || p.label === "SS" || p.position === "R").map((p) => p.id);
}
