import { describe, expect, it } from "vitest";
import { buildPlay, checkLegality, deriveTags } from "./designer";
import { validateContent } from "../content/validate";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Formation, PositionBook, Unit, Lesson, Situation } from "../types/play";

const root = join(__dirname, "..", "content");
const readDir = <T,>(dir: string): T[] => readdirSync(join(root, dir)).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(join(root, dir, f), "utf8")) as T);
const formations = readDir<Formation>("formations");
const by = (id: string) => formations.find((f) => f.id === id)!;

describe("legality", () => {
  it("accepts every shipped offensive formation", () => {
    const specialTeams = /kickoff|punt|fg-/;
    for (const f of formations.filter((x) => x.side === "offense" && !specialTeams.test(x.id))) {
      const r = checkLegality(f.players, f.variant);
      expect(r.problems, f.id).toEqual([]);
    }
  });
  it("flags fewer than seven on the line and a player past the line", () => {
    const f = structuredClone(by("singleback-tackle"));
    f.players.find((p) => p.id === "te")!.y = -3;
    f.players.find((p) => p.id === "wr-z")!.y = 2;
    const r = checkLegality(f.players, "tackle11");
    expect(r.problems.some((p) => p.includes("on the line"))).toBe(true);
    expect(r.problems.some((p) => p.includes("past the line"))).toBe(true);
  });
  it("names the ends of the line and the backs as eligible", () => {
    const r = checkLegality(by("singleback-tackle").players, "tackle11");
    expect(r.eligible).toContain("wr-x");
    expect(r.eligible).toContain("te");
    expect(r.eligible).toContain("rb");
    expect(r.eligible).not.toContain("lg");
  });
});

describe("buildPlay", () => {
  it("produces a play that passes the content validator", () => {
    const offense = by("shotgun-tackle");
    const defense = by("base-43-tackle");
    const play = buildPlay(
      { id: "custom-test", name: "My Slant", variant: "tackle11", offense, defenseFormationId: defense.id, routes: { "wr-x": [{ x: -19, y: 3 }, { x: -12, y: 6 }] }, kinds: {}, target: "wr-x" },
      defense,
    );
    const problems = validateContent({ formations, plays: [play], positions: JSON.parse(readFileSync(join(root, "positions.json"), "utf8")) as PositionBook, lessons: [] as Lesson[], units: [] as Unit[], situations: [] as Situation[] });
    expect(problems.filter((p) => !p.includes("has no lessons"))).toEqual([]);
    expect(play.type).toBe("pass");
    expect(play.tags).toContain("quick");
    expect(play.ball.events.some((e) => e.throw && e.to === "wr-x")).toBe(true);
  });
  it("calls a handoff a run", () => {
    const starts = new Map([["rb", { x: 0, y: -7 }]]);
    expect(deriveTags([{ playerId: "rb", kind: "carry", path: [{ x: 2, y: 8 }] }], starts)).toContain("run");
  });
});
