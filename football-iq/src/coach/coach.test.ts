import { afterEach, describe, expect, it, vi } from "vitest";
import { askCoach, coachUrl, type CoachContext, type CoachQuestion } from "./client";
import { offlineAnswer } from "./offline";

const base: CoachContext = {
  playName: "Slant Flat",
  playType: "pass",
  description: "The outside receiver runs a quick slant while the back runs to the flat.",
  why: "One defender has to pick the slant or the flat, and the quarterback throws to the one he leaves.",
  offense: { name: "Spread", description: "Four receivers spread out wide." },
  defense: { name: "Cover 3", description: "Three deep defenders split the deep field and four cover underneath." },
  positionCode: "WR",
  positionName: "Wide receiver",
  positionJob: "Runs routes and catches passes.",
  situation: { down: 3, distance: 8, yardLine: 40 },
  outcome: { yards: 11, result: "first-down", story: "The slant is open and the receiver turns upfield for 11." },
  ageBand: "11-13",
};

const QUESTIONS: CoachQuestion[] = ["what-happens", "why-it-works", "who-is-open", "what-beats-it", "explain-position", "explain-result"];

describe("offlineAnswer", () => {
  it("returns a non-empty answer for every question type", () => {
    for (const q of QUESTIONS) {
      const a = offlineAnswer(q, base);
      expect(a.length, q).toBeGreaterThan(20);
    }
  });

  it("uses the context facts", () => {
    expect(offlineAnswer("what-happens", base)).toContain(base.description);
    expect(offlineAnswer("why-it-works", base)).toContain(base.why);
    expect(offlineAnswer("who-is-open", base)).toContain("Slant Flat");
    expect(offlineAnswer("what-beats-it", base)).toContain(base.defense.description);
    expect(offlineAnswer("explain-position", base)).toContain("Wide receiver");
    expect(offlineAnswer("explain-position", base)).toContain(base.positionJob!);
    expect(offlineAnswer("explain-result", base)).toContain(base.outcome!.story);
    expect(offlineAnswer("explain-result", base)).toContain("first down");
  });

  it("compares yards with the distance", () => {
    const short = { ...base, outcome: { yards: 3, result: "gain", story: "The back is tackled after 3." } };
    expect(offlineAnswer("explain-result", short)).toContain("5 yards left");
    const none = { ...base, outcome: { yards: 0, result: "incomplete", story: "The pass falls incomplete." } };
    expect(offlineAnswer("explain-result", none)).toContain("still 8 to go");
  });

  it("explains a run's 'who is open' without pretending there is a receiver", () => {
    const run = { ...base, playType: "run" as const, playName: "Inside Zone" };
    expect(offlineAnswer("who-is-open", run)).toMatch(/nobody has to get open/);
  });

  it("copes with missing optional facts", () => {
    const bare: CoachContext = { ...base, positionCode: undefined, positionName: undefined, positionJob: undefined, situation: undefined, outcome: undefined };
    expect(offlineAnswer("explain-position", bare).length).toBeGreaterThan(0);
    expect(offlineAnswer("explain-result", bare)).toContain("Slant Flat");
  });

  it("keeps answers shorter for the youngest band", () => {
    const young = offlineAnswer("who-is-open", { ...base, ageBand: "8-10" });
    const older = offlineAnswer("who-is-open", { ...base, ageBand: "14-16" });
    const count = (s: string) => (s.match(/[.!?](\s|$)/g) ?? []).length;
    expect(count(young)).toBeLessThanOrEqual(3);
    expect(count(older)).toBeGreaterThanOrEqual(count(young));
  });
});

describe("askCoach", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("falls back to the offline answer when VITE_COACH_URL is unset", async () => {
    vi.stubEnv("VITE_COACH_URL", "");
    const fetchSpy = vi.fn(() => {
      throw new Error("network down");
    });
    vi.stubGlobal("fetch", fetchSpy);
    expect(coachUrl()).toBeUndefined();
    const res = await askCoach("why-it-works", base);
    expect(res.source).toBe("offline");
    expect(res.answer).toBe(offlineAnswer("why-it-works", base));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("falls back to offline when the proxy request throws", async () => {
    vi.stubEnv("VITE_COACH_URL", "https://coach.example.test/");
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("network down"))));
    const res = await askCoach("what-happens", base);
    expect(res.source).toBe("offline");
    expect(res.answer).toContain(base.description);
  });

  it("falls back to offline when the proxy returns something that is not an answer", async () => {
    vi.stubEnv("VITE_COACH_URL", "https://coach.example.test");
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(JSON.stringify({ error: "nope" }), { status: 200, headers: { "Content-Type": "application/json" } }))));
    const res = await askCoach("what-beats-it", base);
    expect(res.source).toBe("offline");
  });

  it("uses the proxy answer when it is a string", async () => {
    vi.stubEnv("VITE_COACH_URL", "https://coach.example.test");
    const fetchSpy = vi.fn((_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      expect(body.question).toBe("who-is-open");
      expect(body.context.playName).toBe("Slant Flat");
      return Promise.resolve(new Response(JSON.stringify({ answer: "Look for the slant first." }), { status: 200 }));
    });
    vi.stubGlobal("fetch", fetchSpy);
    const res = await askCoach("who-is-open", base);
    expect(res).toEqual({ answer: "Look for the slant first.", source: "coach" });
    expect(fetchSpy).toHaveBeenCalledWith("https://coach.example.test/coach", expect.objectContaining({ method: "POST" }));
  });
});
