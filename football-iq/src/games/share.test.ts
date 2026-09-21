import { describe, expect, it } from "vitest";
import { decodePlaybook, encodePlaybook } from "./share";
import type { SavedPlay } from "./designer";

const entry: SavedPlay = {
  savedAt: "2026-09-21T00:00:00Z",
  offense: { id: "f", name: "F", variant: "tackle11", side: "offense", description: "d", players: [{ id: "c", position: "C", x: 0, y: -0.5 }, { id: "qb", position: "QB", x: 0, y: -5 }] },
  play: { id: "custom-1", name: "Shared Slant", variant: "tackle11", type: "pass", tags: ["pass", "quick", "custom"], formationId: "f", defenseFormationId: "base-43-tackle", description: "d", why: "w", assignments: [{ playerId: "qb", kind: "dropback", path: [{ x: 0, y: -7 }] }], ball: { start: "c", events: [{ t: 0, to: "qb" }] } },
};

describe("playbook sharing", () => {
  it("round-trips a playbook through the link payload", async () => {
    const payload = await encodePlaybook([entry]);
    expect(payload).toMatch(/^[dr][A-Za-z0-9_-]+$/);
    const back = await decodePlaybook(payload);
    expect(back).toHaveLength(1);
    expect(back[0].play.name).toBe("Shared Slant");
    expect(back[0].offense.players).toHaveLength(2);
  });
  it("rejects junk", async () => {
    await expect(decodePlaybook("dnotbase64!!")).rejects.toBeTruthy();
  });
});
