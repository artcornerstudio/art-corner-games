import type { Formation, Play, PositionBook, Variant } from "../types/play";
import positionsJson from "./positions.json";

// Vite bundles every JSON file in these folders. Adding a play is adding a file.
const formationModules = import.meta.glob<Formation>("./formations/*.json", { eager: true, import: "default" });
const playModules = import.meta.glob<Play>("./plays/*.json", { eager: true, import: "default" });

export const formations: Formation[] = Object.values(formationModules);
export const plays: Play[] = Object.values(playModules).sort((a, b) => a.name.localeCompare(b.name));
export const positions: PositionBook = positionsJson as PositionBook;

export function formationById(id: string): Formation {
  const f = formations.find((x) => x.id === id);
  if (!f) throw new Error(`Unknown formation ${id}`);
  return f;
}

export function playsForVariant(variant: Variant): Play[] {
  return plays.filter((p) => p.variant === variant);
}

export const VARIANT_LABEL: Record<Variant, string> = {
  tackle11: "11-on-11",
  flag5: "Flag 5v5",
  flag7: "Flag 7v7",
};
