import { describe, expect, it } from "vitest";
import { assignmentDuration, compilePlay, frameAt, positionAt } from "./animation";
import type { Formation, Play } from "../types/play";

const offense: Formation = {
  id: "o", name: "O", variant: "flag5", side: "offense", description: "d",
  players: [
    { id: "c", position: "C", x: 0, y: -0.5 },
    { id: "qb", position: "QB", x: 0, y: -5 },
    { id: "a", position: "WR", x: -10, y: -0.5 },
    { id: "b", position: "WR", x: 10, y: -0.5 },
    { id: "rb", position: "RB", x: 5, y: -2 },
  ],
};
const defense: Formation = {
  id: "d", name: "D", variant: "flag5", side: "defense", description: "d",
  players: [
    { id: "d1", position: "D", x: -8, y: 5 },
    { id: "d2", position: "D", x: 8, y: 5 },
    { id: "d3", position: "R", x: 0, y: 7 },
    { id: "d4", position: "S", x: -5, y: 12 },
    { id: "d5", position: "S", x: 5, y: 12 },
  ],
};
const play: Play = {
  id: "p", name: "P", variant: "flag5", type: "pass", formationId: "o", defenseFormationId: "d",
  description: "d", why: "w",
  assignments: [
    { playerId: "qb", kind: "dropback", path: [{ x: 0, y: -8 }], speed: 3 },
    { playerId: "a", kind: "route", path: [{ x: -10, y: 9.5 }], speed: 5 },
  ],
  ball: { start: "c", events: [{ t: 0, to: "qb" }, { t: 1, to: "a", throw: true }] },
};

describe("positionAt", () => {
  it("stays at the start before the delay ends", () => {
    const p = positionAt({ x: 0, y: 0 }, { playerId: "x", kind: "route", path: [{ x: 0, y: 10 }], delay: 1, speed: 5 }, 0.5);
    expect(p).toEqual({ x: 0, y: 0 });
  });
  it("moves at constant speed along a straight segment", () => {
    const p = positionAt({ x: 0, y: 0 }, { playerId: "x", kind: "route", path: [{ x: 0, y: 10 }], speed: 5 }, 1);
    expect(p.y).toBeCloseTo(5);
  });
  it("turns the corner on a two-segment path and stops at the end", () => {
    const a = { playerId: "x", kind: "route" as const, path: [{ x: 0, y: 3 }, { x: 4, y: 3 }], speed: 1 };
    expect(positionAt({ x: 0, y: 0 }, a, 5)).toEqual({ x: 2, y: 3 });
    expect(positionAt({ x: 0, y: 0 }, a, 99)).toEqual({ x: 4, y: 3 });
    expect(assignmentDuration({ x: 0, y: 0 }, a)).toBe(7);
  });
});

describe("frameAt", () => {
  const compiled = compilePlay(play, offense, defense);
  it("gives every player a position and hands the ball to the quarterback at the snap", () => {
    const f = frameAt(compiled, 0);
    expect(f.players.size).toBe(10);
    expect(f.carrier).toBe("qb");
    expect(f.ball).toEqual(f.players.get("qb"));
  });
  it("puts the ball in the air after the throw and in the receiver's hands after it lands", () => {
    const mid = frameAt(compiled, 1.3);
    expect(mid.carrier).toBeNull();
    const landed = frameAt(compiled, 2);
    expect(landed.carrier).toBe("a");
    expect(landed.ball).toEqual(landed.players.get("a"));
  });
  it("runs long enough for the slowest player to finish", () => {
    expect(compiled.duration).toBeGreaterThan(2);
  });
});
