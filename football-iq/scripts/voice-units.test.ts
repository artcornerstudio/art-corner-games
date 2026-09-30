import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { hashText, splitUnits } from "../src/speech/units";
import { choicesForSpeech, joinForSpeech } from "../src/speech/voice";

const root = process.cwd();
const listed = JSON.parse(readFileSync(join(root, "voice", "units.json"), "utf8")) as { id: string; text: string }[];
const ids = new Set(listed.map((u) => u.id));

describe("voice/units.json", () => {
  it("has a matching id for every sentence, with no duplicates", () => {
    for (const u of listed) expect(u.id, u.text).toBe(hashText(u.text));
    expect(ids.size).toBe(listed.length);
  });

  it("lists every sentence of every lesson, so no lesson line falls back to the device voice", () => {
    const dir = join(root, "src", "content", "lessons");
    const missing: string[] = [];
    const need = (line: string) => {
      for (const t of splitUnits(line)) if (!ids.has(hashText(t))) missing.push(t);
    };
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".json"))) {
      const lesson = JSON.parse(readFileSync(join(dir, f), "utf8")) as {
        title: string;
        steps: { text: string }[];
        quiz: { prompt: string; explanation: string; choices?: string[] }[];
      };
      need(joinForSpeech([lesson.title]));
      for (const s of lesson.steps) need(joinForSpeech([s.text]));
      for (const q of lesson.quiz) {
        need(joinForSpeech([q.prompt]));
        need(joinForSpeech([q.explanation]));
        if (q.choices) need(choicesForSpeech(q.choices));
      }
    }
    // If this fails, run `npm run voice:units` and commit voice/units.json.
    expect(missing).toEqual([]);
  });
});
