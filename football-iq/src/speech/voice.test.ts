import { describe, expect, it } from "vitest";
import { choicesForSpeech, joinForSpeech, pickVoice, prosodyFor, readable } from "./voice";

describe("pickVoice", () => {
  it("prefers a known-good English voice", () => {
    const v = pickVoice([
      { name: "Google Deutsch", lang: "de-DE" },
      { name: "Google UK English Male", lang: "en-GB" },
      { name: "Samantha", lang: "en-US", localService: true },
    ]);
    expect(v?.name).toBe("Samantha");
  });
  it("falls back to a local en-US voice, then any English voice", () => {
    expect(pickVoice([{ name: "Zed", lang: "en-GB" }, { name: "Local", lang: "en_US", localService: true }])?.name).toBe("Local");
    expect(pickVoice([{ name: "Zed", lang: "en-AU" }])?.name).toBe("Zed");
  });
  it("returns null with no English voice", () => {
    expect(pickVoice([{ name: "Google Deutsch", lang: "de-DE" }])).toBeNull();
    expect(pickVoice([])).toBeNull();
  });
});

describe("prosodyFor", () => {
  it("slows down for rookies and reads plainly for pros", () => {
    expect(prosodyFor("rookie").rate).toBeLessThan(prosodyFor("pro").rate);
    expect(prosodyFor("pro")).toEqual({ rate: 1, pitch: 1 });
  });
});

describe("readable", () => {
  it("expands position codes and symbols", () => {
    expect(readable("The QB throws to the WR · +2")).toBe("The quarterback throws to the wide receiver. plus 2");
    expect(readable("Ball on your 25 vs Cover 2")).toBe("Ball on your 25 versus Cover 2");
    expect(readable("Up 21-17")).toBe("Up 21 to 17");
  });
  it("leaves ordinary sentences alone", () => {
    expect(readable("Tap the player on the field.")).toBe("Tap the player on the field.");
  });
});

describe("joinForSpeech", () => {
  it("adds periods between parts and drops blanks", () => {
    expect(joinForSpeech(["Yes!", "", null, "The slant is quick", false, "Next question"])).toBe("Yes! The slant is quick. Next question.");
  });
});

describe("choicesForSpeech", () => {
  it("reads the choices as a list", () => {
    expect(choicesForSpeech(["Run", "Pass"])).toBe("Your choices are: Run, or Pass.");
    expect(choicesForSpeech([])).toBe("");
  });
});
