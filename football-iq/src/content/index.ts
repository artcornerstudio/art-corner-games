import type { Formation, Lesson, Play, PositionBook, Situation, Unit, Variant } from "../types/play";
import positionsJson from "./positions.json";
import unitsJson from "./units.json";

// Vite bundles every JSON file in these folders. Adding a play or a lesson is adding a file.
const formationModules = import.meta.glob<Formation>("./formations/*.json", { eager: true, import: "default" });
const playModules = import.meta.glob<Play>("./plays/*.json", { eager: true, import: "default" });
const lessonModules = import.meta.glob<Lesson>("./lessons/*.json", { eager: true, import: "default" });
const situationModules = import.meta.glob<Situation>("./situations/*.json", { eager: true, import: "default" });

export const formations: Formation[] = Object.values(formationModules);
export const plays: Play[] = Object.values(playModules).sort((a, b) => a.name.localeCompare(b.name));
export const positions: PositionBook = positionsJson as PositionBook;
export const units: Unit[] = [...(unitsJson as Unit[])].sort((a, b) => a.order - b.order);
export const lessons: Lesson[] = Object.values(lessonModules).sort((a, b) => a.order - b.order);
export const situations: Situation[] = Object.values(situationModules);

export function situationsForVariant(variant: Variant): Situation[] {
  return situations.filter((s) => s.variant === variant);
}

/** Formations the Spot the Position game can draw for a variant, by side. */
export function formationsForVariant(variant: Variant): { offense: Formation[]; defense: Formation[] } {
  const mine = formations.filter((f) => f.variant === variant);
  return { offense: mine.filter((f) => f.side === "offense"), defense: mine.filter((f) => f.side === "defense") };
}

export function formationById(id: string): Formation {
  const f = formations.find((x) => x.id === id);
  if (!f) throw new Error(`Unknown formation ${id}`);
  return f;
}

export function playById(id: string): Play {
  const p = plays.find((x) => x.id === id);
  if (!p) throw new Error(`Unknown play ${id}`);
  return p;
}

export function lessonById(id: string): Lesson {
  const l = lessons.find((x) => x.id === id);
  if (!l) throw new Error(`Unknown lesson ${id}`);
  return l;
}

export function unitById(id: string): Unit {
  const u = units.find((x) => x.id === id);
  if (!u) throw new Error(`Unknown unit ${id}`);
  return u;
}

export function lessonsForUnit(unitId: string): Lesson[] {
  return lessons.filter((l) => l.unitId === unitId);
}

/** Plays the Play Lab lists: real plays, not teaching demos. */
export function playsForVariant(variant: Variant): Play[] {
  return plays.filter((p) => p.variant === variant && !(p.tags ?? []).includes("demo"));
}

/** Opponent shown behind a formation when a lesson draws the formation on its own. */
export const DEFAULT_OPPONENT: Record<Variant, { offense: string; defense: string }> = {
  tackle11: { offense: "singleback-tackle", defense: "base-43-tackle" },
  flag5: { offense: "trips-flag5", defense: "cover2-flag5" },
  flag7: { offense: "trips-flag5", defense: "cover2-flag5" },
};

export const VARIANT_LABEL: Record<Variant, string> = {
  tackle11: "11-on-11",
  flag5: "Flag 5v5",
  flag7: "Flag 7v7",
};
