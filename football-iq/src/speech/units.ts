/**
 * Spoken lines are split into sentence "units". Each unit gets a short, stable
 * id made from its text, and each id is one recorded clip of the coach voice.
 *
 * Pure code with no browser or content imports: the game uses it to find clips
 * at play time, and the extraction script uses it to decide what to record, so
 * both always agree.
 */
import { readable } from "./voice";

/** 53-bit string hash (cyrb53). Same result in Node and in every browser. */
export function hashText(text: string, seed = 0): string {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const n = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  return n.toString(16).padStart(14, "0");
}

export interface Unit {
  id: string;
  text: string;
}

const CHOICES_INTRO = "Your choices are:";
const CHOICE_SEPARATOR = ", or ";

function ensureEnding(text: string): string {
  return /[.!?:]$/.test(text) ? text : `${text}.`;
}

/**
 * Split one line of speech into sentence units. "Your choices are: A, or B, or C."
 * becomes the intro plus one unit per choice, so the same recorded choice works
 * in any order and in any question. A colon inside a sentence also starts a new unit.
 */
export function splitUnits(text: string): string[] {
  const clean = readable(text);
  if (!clean) return [];
  const sentences = clean
    .replace(/([.!?]+)\s+/g, "$1\u0001")
    .split("\u0001")
    .map((s) => s.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const sentence of sentences) {
    if (sentence.startsWith(CHOICES_INTRO) && sentence.length > CHOICES_INTRO.length) {
      out.push(CHOICES_INTRO);
      const rest = sentence.slice(CHOICES_INTRO.length).trim().replace(/\.$/, "");
      for (const item of rest.split(CHOICE_SEPARATOR)) {
        const t = item.trim();
        if (t) out.push(/[!?]$/.test(t) ? t : `${t.replace(/\.+$/, "")}.`);
      }
    } else {
      // "Hint: read the safeties" and "Four Verticals: Gain of 7" become separate sentences,
      // so a play name never has to be recorded once for every possible number.
      for (const part of sentence.split(/:\s+/)) if (part.trim()) out.push(ensureEnding(part.trim()));
    }
  }
  return out;
}

export function unitsFor(text: string): Unit[] {
  return splitUnits(text).map((t) => ({ id: hashText(t), text: t }));
}
