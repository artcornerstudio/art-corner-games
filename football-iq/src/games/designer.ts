import type { Assignment, Formation, FormationPlayer, Play, Point, Variant } from "../types/play";
import { distance } from "../field/geometry";

/**
 * Play Designer rules and helpers. A drawn play is an ordinary Play object, so
 * everything else in the app (viewer, outcome engine, Play Lab) already understands it.
 */

export interface LegalityReport {
  ok: boolean;
  problems: string[];
  /** Ids of players on the line of scrimmage (within a yard of it). */
  onLine: string[];
  /** Ids of eligible receivers: the two ends of the line plus the backs. */
  eligible: string[];
}

const LINE_DEPTH = 1.2;

/** Checks an offensive alignment against the rules kids learn in the Offense unit. */
export function checkLegality(players: FormationPlayer[], variant: Variant): LegalityReport {
  const problems: string[] = [];
  const expected = variant === "tackle11" ? 11 : variant === "flag7" ? 7 : 5;
  if (players.length !== expected) problems.push(`Needs ${expected} players, has ${players.length}.`);
  const over = players.filter((p) => p.y > 0);
  if (over.length) problems.push(`${over.length} player${over.length > 1 ? "s are" : " is"} past the line of scrimmage.`);
  const onLine = players.filter((p) => p.y <= 0 && p.y >= -LINE_DEPTH).sort((a, b) => a.x - b.x);
  const backs = players.filter((p) => p.y < -LINE_DEPTH);
  if (variant === "tackle11") {
    if (onLine.length < 7) problems.push(`Only ${onLine.length} on the line. You need at least 7.`);
    if (backs.length > 4) problems.push(`${backs.length} in the backfield. Only 4 can be off the line.`);
    const center = players.find((p) => p.position === "C");
    if (!center) problems.push("Somebody has to snap the ball: you need a center.");
    else if (Math.abs(center.x) > 0.6 || center.y < -LINE_DEPTH) problems.push("The center has to be over the ball on the line.");
    const qb = players.find((p) => p.position === "QB");
    if (!qb) problems.push("You need a quarterback.");
  } else {
    const center = players.find((p) => p.position === "C");
    if (!center) problems.push("Somebody has to snap the ball: you need a center.");
    if (onLine.length < 1) problems.push("At least one player must be on the line.");
  }
  const wide = players.filter((p) => Math.abs(p.x) > (variant === "tackle11" ? 26 : 14.5));
  if (wide.length) problems.push("A player is standing out of bounds.");
  const eligible = new Set<string>(backs.map((p) => p.id));
  if (onLine.length) {
    eligible.add(onLine[0].id);
    eligible.add(onLine[onLine.length - 1].id);
  }
  return { ok: problems.length === 0, problems, onLine: onLine.map((p) => p.id), eligible: [...eligible] };
}

/** Which players can run a route (everyone in flag; the eligible receivers in tackle). */
export function canRunRoute(playerId: string, players: FormationPlayer[], variant: Variant): boolean {
  if (variant !== "tackle11") return true;
  return checkLegality(players, variant).eligible.includes(playerId);
}

/** Describes the play to the outcome engine from what was drawn. */
export function deriveTags(assignments: Assignment[], starts: Map<string, Point>): string[] {
  const tags = new Set<string>();
  const carries = assignments.filter((a) => a.kind === "carry");
  const routes = assignments.filter((a) => a.kind === "route");
  if (carries.length > 0 && routes.length === 0) {
    tags.add("run");
    const c = carries[0];
    const end = c.path[c.path.length - 1];
    if (end && Math.abs(end.x - (starts.get(c.playerId)?.x ?? 0)) > 7) tags.add("outside-run");
    else tags.add("inside-run");
    return [...tags];
  }
  tags.add("pass");
  let deepest = 0;
  for (const r of routes) for (const p of r.path) deepest = Math.max(deepest, p.y);
  if (deepest >= 15) tags.add("deep");
  else if (deepest <= 7) tags.add("quick");
  else tags.add("intermediate");
  return [...tags];
}

/** Total route length, used to pick a sensible throw time. */
export function routeLength(start: Point, path: Point[]): number {
  let len = 0;
  let prev = start;
  for (const p of path) {
    len += distance(prev, p);
    prev = p;
  }
  return len;
}

export interface DesignInput {
  id: string;
  name: string;
  variant: Variant;
  offense: Formation;
  defenseFormationId: string;
  /** Player id -> waypoints drawn after the snap. */
  routes: Record<string, Point[]>;
  /** Player id -> kind chosen for that player. Defaults: linemen block, others route. */
  kinds: Record<string, Assignment["kind"]>;
  /** Player id the ball goes to: a receiver (throw) or a runner (handoff). Null keeps it with the QB. */
  target: string | null;
}

const BLOCKERS = new Set(["C", "G", "T"]);

/** Turns a drawing into a Play the viewer can animate and the engine can resolve. */
export function buildPlay(input: DesignInput, defense: Formation): Play {
  const starts = new Map(input.offense.players.map((p) => [p.id, { x: p.x, y: p.y }] as const));
  const qb = input.offense.players.find((p) => p.position === "QB");
  const assignments: Assignment[] = input.offense.players.map((p) => {
    const path = input.routes[p.id] ?? [];
    let kind = input.kinds[p.id];
    if (!kind) kind = BLOCKERS.has(p.position) ? "block" : path.length ? "route" : "stay";
    if (kind === "block" && path.length === 0) return { playerId: p.id, kind: "block", path: [{ x: p.x, y: input.variant === "tackle11" ? -1.5 : p.y }], speed: 3 };
    if (kind === "dropback" && path.length === 0) return { playerId: p.id, kind: "dropback", path: [{ x: p.x, y: p.y - (p.y > -3 ? 5 : 2) }], speed: 4 };
    if (path.length === 0) return { playerId: p.id, kind: "stay", path: [] };
    return { playerId: p.id, kind, path, speed: kind === "carry" ? 6.5 : kind === "block" ? 3.5 : 7 };
  });
  // A quarterback with nothing drawn drops back on passes.
  const targetKind = input.target ? assignments.find((a) => a.playerId === input.target)?.kind : undefined;
  if (qb && !input.routes[qb.id]?.length && input.kinds[qb.id] !== "carry") {
    const qa = assignments.find((a) => a.playerId === qb.id)!;
    qa.kind = "dropback";
    qa.path = [{ x: qb.x, y: qb.y - (qb.y > -3 ? 4 : 2) }];
    qa.speed = 4;
  }
  // Defense: generic reactions so the picture moves. Linemen rush, everyone else covers a spot 6 yards deeper.
  for (const d of defense.players) {
    const rushers = new Set(["DE", "DT", "NT", "R", "RS"]);
    assignments.push(
      rushers.has(d.position)
        ? { playerId: d.id, kind: "rush", path: [{ x: d.x * 0.8, y: -1 }], speed: 3, delay: 0.1 }
        : { playerId: d.id, kind: "cover", path: [{ x: d.x, y: d.y + 6 }], speed: 5, delay: 0.4 },
    );
  }
  const events: Play["ball"]["events"] = [];
  const center = input.offense.players.find((p) => p.position === "C");
  if (qb) events.push({ t: 0, to: qb.id });
  if (input.target && input.target !== qb?.id) {
    const start = starts.get(input.target)!;
    const len = routeLength(start, input.routes[input.target] ?? []);
    if (targetKind === "carry") events.push({ t: 0.7, to: input.target });
    else events.push({ t: Math.min(3, Math.max(0.8, len / 7 * 0.7)), to: input.target, throw: true });
  }
  const tags = deriveTags(assignments.filter((a) => starts.has(a.playerId)), starts);
  return {
    id: input.id,
    name: input.name,
    variant: input.variant,
    type: tags.includes("run") ? "run" : "pass",
    tags: [...tags, "custom"],
    formationId: input.offense.id,
    defenseFormationId: defense.id,
    description: `Your play: ${input.name}.`,
    why: "You drew it. Test it against three defenses and see what works.",
    assignments,
    ball: { start: center?.id ?? input.offense.players[0].id, events },
  };
}

/** Saved custom plays live in localStorage next to progress. */
export interface SavedPlay {
  play: Play;
  offense: Formation;
  savedAt: string;
}
const KEY = "football-iq.playbook.v1";

export function loadPlaybook(): SavedPlay[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedPlay[]) : [];
  } catch {
    return [];
  }
}

export function savePlay(entry: SavedPlay): SavedPlay[] {
  const book = loadPlaybook().filter((s) => s.play.id !== entry.play.id);
  book.unshift(entry);
  try {
    localStorage.setItem(KEY, JSON.stringify(book.slice(0, 30)));
  } catch {
    // storage blocked; the play still works for this session
  }
  return book;
}

export function deletePlay(id: string): SavedPlay[] {
  const book = loadPlaybook().filter((s) => s.play.id !== id);
  try {
    localStorage.setItem(KEY, JSON.stringify(book));
  } catch {
    // ignore
  }
  return book;
}
