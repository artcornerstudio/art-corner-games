import { describe, expect, it } from "vitest";
import { fieldGoalChance, puntResult, resolvePlay } from "./outcome";
import type { Play, Situation } from "../types/play";

const run: Play = { id: "r", name: "Run", variant: "tackle11", type: "run", tags: ["run", "inside-run"], formationId: "a", defenseFormationId: "b", description: "", why: "", assignments: [], ball: { start: "c", events: [] } };
const deep: Play = { ...run, id: "d", type: "pass", tags: ["pass", "deep"] };
const sit: Situation = { id: "s", variant: "tackle11", down: 2, distance: 5, yardLine: 95, options: [] };

describe("resolvePlay", () => {
  it("is repeatable with a seed", () => {
    expect(resolvePlay({ play: run, seed: 5 })).toEqual(resolvePlay({ play: run, seed: 5 }));
  });
  it("never gains more than the field that is left, and calls a touchdown at the goal line", () => {
    for (let seed = 0; seed < 200; seed++) {
      const o = resolvePlay({ play: deep, situation: sit, seed });
      expect(o.yards).toBeLessThanOrEqual(5);
      if (o.yards === 5) expect(o.touchdown).toBe(true);
    }
  });
  it("marks a first down when the gain covers the distance", () => {
    const outcomes = Array.from({ length: 300 }, (_, seed) => resolvePlay({ play: run, situation: { ...sit, yardLine: 30, distance: 2 }, seed }));
    const firsts = outcomes.filter((o) => o.firstDown && !o.touchdown);
    expect(firsts.length).toBeGreaterThan(50);
    for (const o of firsts) expect(o.yards).toBeGreaterThanOrEqual(2);
  });
  it("gives deep passes more busts and bigger booms than runs", () => {
    const n = 2000;
    const bust = (p: Play) => Array.from({ length: n }, (_, s) => resolvePlay({ play: p, seed: s })).filter((o) => o.yards <= 0).length / n;
    expect(bust(deep)).toBeGreaterThan(bust(run));
  });
});

describe("kicks", () => {
  it("makes short field goals almost always and long ones rarely", () => {
    expect(fieldGoalChance(90)).toBeGreaterThan(0.9);
    expect(fieldGoalChance(50)).toBeLessThan(0.1);
  });
  it("turns a punt near the goal line into a touchback", () => {
    expect(puntResult(70, () => 0.9).touchback).toBe(true);
    expect(puntResult(20, () => 0.5).touchback).toBe(false);
  });
});
