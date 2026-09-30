import { describe, expect, it } from "vitest";
import { choicesForSpeech, joinForSpeech } from "./voice";
import { hashText, splitUnits, unitsFor } from "./units";

describe("hashText", () => {
  it("is stable and distinguishes texts", () => {
    expect(hashText("Yes!")).toBe(hashText("Yes!"));
    expect(hashText("Yes!")).not.toBe(hashText("Yes."));
    expect(hashText("Yes!")).toMatch(/^[0-9a-f]{14}$/);
  });
});

describe("splitUnits", () => {
  it("splits sentences and keeps decimals and clock times together", () => {
    expect(splitUnits("A down is one play. About 1.3 seconds! 0:40 left.")).toEqual(["A down is one play.", "About 1.3 seconds!", "0:40 left."]);
  });
  it("starts a new unit at a colon", () => {
    expect(splitUnits("Hint: read the safeties. Four Verticals: Gain of 7.")).toEqual(["Hint.", "read the safeties.", "Four Verticals.", "Gain of 7."]);
  });
  it("gives every unit an ending", () => {
    expect(splitUnits("Quarterback")).toEqual(["Quarterback."]);
  });
  it("splits choices into one unit each", () => {
    const line = joinForSpeech(["Question 2.", "What now?", choicesForSpeech(["Run", "Pass it, fast", "Punt"])]);
    expect(splitUnits(line)).toEqual(["Question 2.", "What now?", "Your choices are:", "Run.", "Pass it, fast.", "Punt."]);
  });
  it("uses the same unit for a choice in any position", () => {
    const a = unitsFor(choicesForSpeech(["Run", "Pass"]));
    const b = unitsFor(choicesForSpeech(["Pass", "Run", "Punt"]));
    expect(b.map((u) => u.id)).toContain(a.find((u) => u.text === "Run.")!.id);
  });
  it("is compositional: splitting a joined line equals joining the splits", () => {
    const parts = ["Yes!", "The slant beats a blitz. The ball is out fast.", "Gain of 7."];
    const whole = splitUnits(joinForSpeech(parts));
    const pieces = parts.flatMap((p) => splitUnits(joinForSpeech([p])));
    expect(whole).toEqual(pieces);
  });
  it("returns nothing for empty text", () => {
    expect(splitUnits("   ")).toEqual([]);
  });
});
