import { describe, expect, it } from "vitest";
import { FOURTH_DOWN_SCENARIOS, judge } from "./fourthDown";

describe("fourth-down judgement", () => {
  it("has exactly one best call for every scenario", () => {
    for (const s of FOURTH_DOWN_SCENARIOS) {
      const best = (["go", "punt", "field-goal"] as const).filter((c) => judge(s, c).verdict === "best");
      expect(best, s.id).toHaveLength(1);
    }
  });
  it("punts on fourth and long from its own 20", () => {
    expect(judge(FOURTH_DOWN_SCENARIOS[0], "punt").verdict).toBe("best");
  });
  it("goes for it when down by 8 late", () => {
    const s = FOURTH_DOWN_SCENARIOS.find((x) => x.id === "opp-35-late-down8")!;
    expect(judge(s, "go").verdict).toBe("best");
    expect(judge(s, "field-goal").verdict).toBe("bad");
  });
  it("kicks when down by 2 with 35 seconds left in range", () => {
    const s = FOURTH_DOWN_SCENARIOS.find((x) => x.id === "opp-25-late-down3")!;
    expect(judge(s, "field-goal").verdict).toBe("best");
  });
});
