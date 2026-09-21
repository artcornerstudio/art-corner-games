import { describe, expect, it } from "vitest";
import { applyCall, callablePlays, chooseLook, describeDownAndDistance, newDrive } from "./drive";
import { mulberry32 } from "../utils/random";

describe("drive simulator", () => {
  it("has real plays to call and no special teams or demos", () => {
    const names = callablePlays().map((p) => p.id);
    expect(names.length).toBeGreaterThan(6);
    expect(names).not.toContain("kickoff-tackle");
    expect(names).not.toContain("route-tree-demo");
  });
  it("moves the chains and ends every drive one way or another", () => {
    const rand = mulberry32(11);
    const pool = callablePlays();
    let endings = 0;
    for (let d = 0; d < 40; d++) {
      let state = newDrive();
      let guard = 0;
      while (!state.ended && guard++ < 40) {
        const call = state.down === 4 ? (state.yardLine >= 65 ? ({ kind: "field-goal" } as const) : ({ kind: "punt" } as const)) : ({ kind: "play", play: pool[Math.floor(rand() * pool.length)] } as const);
        state = applyCall(state, call, rand, d * 100 + guard);
        expect(state.yardLine).toBeGreaterThanOrEqual(1);
        expect(state.yardLine).toBeLessThanOrEqual(100);
        expect(state.distance).toBeGreaterThanOrEqual(1);
      }
      expect(state.ended).not.toBeNull();
      endings++;
    }
    expect(endings).toBe(40);
  });
  it("labels goal-to-go correctly", () => {
    expect(describeDownAndDistance({ ...newDrive(95), distance: 5 })).toBe("1st and goal");
    expect(describeDownAndDistance(newDrive())).toBe("1st and 10");
  });
  it("stacks the box on short yardage more than on long yardage", () => {
    const rand = mulberry32(3);
    const short = Array.from({ length: 300 }, () => chooseLook({ ...newDrive(), distance: 1 }, rand)).filter((l) => l === "stacked-box").length;
    const long = Array.from({ length: 300 }, () => chooseLook({ ...newDrive(), distance: 10 }, rand)).filter((l) => l === "stacked-box").length;
    expect(short).toBeGreaterThan(long);
  });
});
