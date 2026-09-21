import { describe, expect, it } from "vitest";
import { describeSpot, downLabel } from "./callThePlay";
import { buildRounds, roundPrompt, SPOT_ROUNDS } from "./spotThePosition";
import { mulberry32, shuffle } from "../utils/random";

describe("Call the Play labels", () => {
  it("describes field position from the offense's point of view", () => {
    expect(describeSpot(25)).toBe("your own 25");
    expect(describeSpot(50)).toBe("midfield");
    expect(describeSpot(80)).toBe("the other team's 20");
  });
  it("says 'and goal' when the first-down line is past the goal line", () => {
    expect(downLabel(3, 8, 40)).toBe("3rd and 8");
    expect(downLabel(4, 2, 98)).toBe("4th and goal");
    expect(downLabel(4, 1, 98)).toBe("4th and 1");
  });
});

describe("Spot the Position rounds", () => {
  it("builds ten rounds that never repeat a position back to back", () => {
    const rounds = buildRounds("tackle11", mulberry32(7));
    expect(rounds).toHaveLength(SPOT_ROUNDS);
    for (let i = 1; i < rounds.length; i++) expect(rounds[i].position).not.toBe(rounds[i - 1].position);
    for (const r of rounds) expect(r.count).toBeGreaterThan(0);
  });
  it("asks for 'a' when several players share the position and 'the' when one does", () => {
    const rounds = buildRounds("tackle11", mulberry32(3));
    const many = rounds.find((r) => r.count > 1);
    const one = rounds.find((r) => r.count === 1);
    if (many) expect(roundPrompt(many)).toMatch(/^Tap a /);
    if (one) expect(roundPrompt(one)).toMatch(/^Tap the /);
  });
  it("works for flag 5v5 too", () => {
    expect(buildRounds("flag5", mulberry32(1))).toHaveLength(SPOT_ROUNDS);
  });
});

describe("shuffle", () => {
  it("is deterministic with a seeded generator and keeps every item", () => {
    const a = shuffle([1, 2, 3, 4, 5, 6], mulberry32(42));
    const b = shuffle([1, 2, 3, 4, 5, 6], mulberry32(42));
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});
