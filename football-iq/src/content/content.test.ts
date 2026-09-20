import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { validateContent } from "./validate";
import type { Formation, Play, PositionBook } from "../types/play";

const root = join(__dirname);
const readDir = <T,>(dir: string): T[] =>
  readdirSync(join(root, dir)).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(join(root, dir, f), "utf8")) as T);

const bundle = {
  formations: readDir<Formation>("formations"),
  plays: readDir<Play>("plays"),
  positions: JSON.parse(readFileSync(join(root, "positions.json"), "utf8")) as PositionBook,
};

describe("shipped content", () => {
  it("passes every schema and cross-reference check", () => {
    expect(validateContent(bundle)).toEqual([]);
  });
  it("catches a play that references a missing player", () => {
    const broken = structuredClone(bundle);
    broken.plays[0].assignments[0].playerId = "nobody";
    expect(validateContent(broken).some((p) => p.includes("unknown player nobody"))).toBe(true);
  });
  it("catches a formation with the wrong player count", () => {
    const broken = structuredClone(bundle);
    broken.formations[0].players.pop();
    expect(validateContent(broken).some((p) => p.includes("needs"))).toBe(true);
  });
});
