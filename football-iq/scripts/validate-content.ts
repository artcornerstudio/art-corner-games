/**
 * Validates every formation and play file. Run with `npm run validate`.
 * Exits non-zero when anything is wrong so CI can block a broken lesson.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { validateContent } from "../src/content/validate";
import type { Formation, Play, PositionBook } from "../src/types/play";

const root = join(process.cwd(), "src", "content");

function readJsonDir<T>(dir: string): T[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as T);
}

const bundle = {
  formations: readJsonDir<Formation>(join(root, "formations")),
  plays: readJsonDir<Play>(join(root, "plays")),
  positions: JSON.parse(readFileSync(join(root, "positions.json"), "utf8")) as PositionBook,
};

const problems = validateContent(bundle);
if (problems.length > 0) {
  console.error(`Content check failed with ${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`Content OK: ${bundle.formations.length} formations, ${bundle.plays.length} plays, ${Object.keys(bundle.positions).length} positions.`);
