import type { CoachContext, AgeBand } from "./client";
import type { CompiledPlay } from "../field/animation";
import type { Outcome } from "../games/outcome";
import type { Situation, Tier } from "../types/play";

export function ageBandFor(tier: Tier): AgeBand {
  return tier === "rookie" ? "8-10" : tier === "varsity" ? "11-13" : "14-16";
}

/** Builds what Coach is allowed to know about the current play. Nothing about the kid. */
export function coachContextFor(compiled: CompiledPlay, tier: Tier, extra: { situation?: Situation; outcome?: Outcome } = {}): CoachContext {
  const { play, offense, defense } = compiled;
  const ctx: CoachContext = {
    playName: play.name,
    playType: play.type,
    description: play.description,
    why: play.why,
    offense: { name: offense.name, description: offense.description },
    defense: { name: defense.name, description: defense.description },
    ageBand: ageBandFor(tier),
  };
  if (extra.situation) {
    const s = extra.situation;
    ctx.situation = { down: s.down, distance: s.distance, yardLine: s.yardLine, ...(s.context ? { context: s.context } : {}) };
  }
  if (extra.outcome) ctx.outcome = { yards: extra.outcome.yards, result: extra.outcome.result, story: extra.outcome.story };
  return ctx;
}
