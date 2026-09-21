/**
 * Pure helpers for read-aloud. No browser APIs here so they can be unit tested.
 */
import type { Tier } from "../types/play";

export interface VoiceLike {
  name: string;
  lang: string;
  localService?: boolean;
  default?: boolean;
}

/** Voices that sound warm and clear on the devices kids actually use. Earlier wins. */
const PREFERRED = ["Samantha", "Karen", "Moira", "Daniel", "Google US English", "Microsoft Aria", "Microsoft Jenny", "Microsoft Zira", "Alex"];

/** Pick an English voice: a known-good one first, then any local English voice, then any English voice. */
export function pickVoice<V extends VoiceLike>(voices: V[]): V | null {
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  if (english.length === 0) return null;
  for (const wanted of PREFERRED) {
    const hit = english.find((v) => v.name.toLowerCase().startsWith(wanted.toLowerCase()));
    if (hit) return hit;
  }
  const us = english.filter((v) => v.lang.toLowerCase().replace("_", "-") === "en-us");
  const local = (us.length ? us : english).find((v) => v.localService);
  return local ?? english.find((v) => v.default) ?? english[0];
}

export interface Prosody {
  rate: number;
  pitch: number;
}

/** Rookies get a slower, slightly brighter voice. Pro is plain reading speed. */
export function prosodyFor(tier: Tier): Prosody {
  switch (tier) {
    case "rookie":
      return { rate: 0.88, pitch: 1.08 };
    case "varsity":
      return { rate: 0.95, pitch: 1.02 };
    default:
      return { rate: 1, pitch: 1 };
  }
}

/** Speech engines say "3rd and 7" fine but choke on symbols and abbreviations we use on screen. */
export function readable(text: string): string {
  return text
    .replace(/\s*·\s*/g, ". ")
    .replace(/→/g, " to ")
    .replace(/←/g, "")
    .replace(/[★✦]/g, "")
    .replace(/\bvs\.?\b/gi, "versus")
    .replace(/\byds?\b/gi, "yards")
    .replace(/\bQB\b/g, "quarterback")
    .replace(/\bRB\b/g, "running back")
    .replace(/\bWR\b/g, "wide receiver")
    .replace(/\bTE\b/g, "tight end")
    .replace(/\bLB\b/g, "linebacker")
    .replace(/\bCB\b/g, "cornerback")
    .replace(/\bDB\b/g, "defensive back")
    .replace(/\bFG\b/g, "field goal")
    .replace(/\bTD\b/g, "touchdown")
    .replace(/\+(\d)/g, "plus $1")
    .replace(/(\d)-(\d)/g, "$1 to $2")
    .replace(/\s+/g, " ")
    .trim();
}

/** Join lines into one utterance with a pause between them. Empty lines are dropped. */
export function joinForSpeech(parts: Array<string | null | undefined | false>): string {
  return parts
    .filter((p): p is string => typeof p === "string" && p.trim().length > 0)
    .map((p) => readable(p))
    .map((p) => (/[.!?:]$/.test(p) ? p : `${p}.`))
    .join(" ");
}

/** Spell out answer choices so a kid can match what they hear to what they see. */
export function choicesForSpeech(choices: string[]): string {
  if (choices.length === 0) return "";
  return `Your choices are: ${choices.map((c) => readable(c)).join(", or ")}.`;
}
