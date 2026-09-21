import { describe, expect, it } from "vitest";
import { DRIVES_PER_TEAM, newGame, nextDrive, onOffense, OPPONENTS, opponentPlay, seasonSummary, theirSnap, yourSnap } from "./season";
import { callablePlays } from "./drive";
import { mulberry32 } from "../utils/random";

describe("season", () => {
  it("opponents call plays that match their tendencies", () => {
    const rand = mulberry32(9);
    const rockets = OPPONENTS.find((o) => o.id === "rockets")!;
    const dozers = OPPONENTS.find((o) => o.id === "bulldozers")!;
    const drive = { down: 1 as const, distance: 10, yardLine: 30, plays: 0, yardsGained: 0, ended: null, log: [] };
    const deep = (o: typeof rockets) => Array.from({ length: 300 }, () => opponentPlay(o, drive, rand)).filter((p) => (p.tags ?? []).includes("deep")).length;
    expect(deep(rockets)).toBeGreaterThan(deep(dozers) * 2);
  });
  it("plays a whole game to the end with alternating possessions", () => {
    const rand = mulberry32(21);
    let g = newGame(OPPONENTS[0]);
    const pool = callablePlays();
    let guard = 0;
    while (!g.finished && guard++ < 400) {
      if (g.drive.ended) { g = nextDrive(g); continue; }
      if (onOffense(g)) {
        const call = g.drive.down === 4 ? ({ kind: "punt" } as const) : ({ kind: "play", play: pool[Math.floor(rand() * pool.length)] } as const);
        g = yourSnap(g, call, rand);
      } else {
        g = theirSnap(g, "base", rand);
      }
    }
    expect(g.finished).toBe(true);
    expect(g.driveIndex).toBe(DRIVES_PER_TEAM * 2);
    expect(g.yourPoints).toBeGreaterThanOrEqual(0);
    expect(g.theirPoints).toBeGreaterThanOrEqual(0);
  });
  it("summarizes a season record", () => {
    expect(seasonSummary({ games: [{ opponentId: "a", yourPoints: 14, theirPoints: 7, won: true }, { opponentId: "b", yourPoints: 3, theirPoints: 3, won: false }] })).toEqual({ wins: 1, losses: 0, ties: 1 });
  });
});
