import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import edition from "../src/content/edition.json";
import { freePlayIds, paidFiles } from "../vite.edition";

const content = join(process.cwd(), "src", "content");
const read = <T>(dir: string, name: string): T => JSON.parse(readFileSync(join(content, dir, name), "utf8")) as T;
const files = (dir: string) => readdirSync(join(content, dir)).filter((f) => f.endsWith(".json"));

function strings(value: unknown, out = new Set<string>()): Set<string> {
  if (typeof value === "string") out.add(value);
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out));
  else if (value && typeof value === "object") Object.values(value).forEach((v) => strings(v, out));
  return out;
}

describe("free demo content", () => {
  const paid = paidFiles();
  const lessons = files("lessons").map((f) => ({ file: f, data: read<{ id: string; unitId: string }>("lessons", f) }));
  const freeLessons = lessons.filter((l) => edition.freeUnits.includes(l.data.unitId));
  const playIds = new Map(files("plays").map((f) => [read<{ id: string }>("plays", f).id, f]));
  const units = JSON.parse(readFileSync(join(content, "units.json"), "utf8")) as { id: string }[];

  it("names units that exist, and leaves the rest paid", () => {
    for (const id of edition.freeUnits) expect(units.map((u) => u.id)).toContain(id);
    expect(units.length).toBeGreaterThan(edition.freeUnits.length);
    expect(freeLessons.length).toBeGreaterThan(0);
  });

  it("leaves out exactly the lessons of the paid units, and every situation", () => {
    expect(paid.lessons.sort()).toEqual(lessons.filter((l) => !edition.freeUnits.includes(l.data.unitId)).map((l) => l.file).sort());
    expect(paid.situations.sort()).toEqual(files("situations").sort());
  });

  it("keeps every play a free lesson shows, so no free lesson breaks", () => {
    const kept = freePlayIds();
    for (const lesson of freeLessons) {
      for (const text of strings(lesson.data)) {
        if (playIds.has(text)) expect(kept.has(text), `${lesson.data.id} shows play ${text}`).toBe(true);
      }
    }
  });

  it("keeps the plays named on the free list, and they exist", () => {
    const kept = freePlayIds();
    for (const id of edition.freePlays) {
      expect(playIds.has(id), `${id} exists`).toBe(true);
      expect(kept.has(id)).toBe(true);
    }
  });

  it("leaves some plays paid, or there is nothing to sell", () => {
    expect(paid.plays.length).toBeGreaterThan(0);
    expect(new Set(paid.plays).size).toBe(paid.plays.length);
  });

  it("names free games that are real game screens", () => {
    const games = ["call-the-play", "spot-the-position", "beat-the-coverage", "hot-read", "fourth-down", "drive-simulator", "play-designer", "season"];
    for (const g of edition.freeGames) expect(games).toContain(g);
    expect(edition.freeGames.length).toBeLessThan(games.length);
    expect(edition.spotRounds).toBeGreaterThan(0);
  });
});
