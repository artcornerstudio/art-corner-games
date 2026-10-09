/**
 * Two builds of the same app: "demo" (free) and "full" (paid).
 *
 * The demo build must not contain the paid content at all. Vite bundles every
 * JSON file in the content folders, so for the demo we add negative patterns to
 * those globs and the paid files are never read. Nothing in the browser can
 * unlock what is not there.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { Plugin } from "vite";

interface Edition {
  freeUnits: string[];
  freeGames: string[];
  freePlays: string[];
  spotRounds: number;
}

const content = join(__dirname, "src", "content");

function readJson<T>(file: string): T {
  return JSON.parse(readFileSync(file, "utf8")) as T;
}

function jsonFiles(dir: string): string[] {
  return readdirSync(join(content, dir)).filter((f) => f.endsWith(".json")).sort();
}

/** Every string anywhere in a JSON value. */
function strings(value: unknown, out: Set<string>): Set<string> {
  if (typeof value === "string") out.add(value);
  else if (Array.isArray(value)) for (const v of value) strings(v, out);
  else if (value && typeof value === "object") for (const v of Object.values(value)) strings(v, out);
  return out;
}

/** Ids of the plays that stay in the demo. */
export function freePlayIds(): Set<string> {
  const edition = readJson<Edition>(join(content, "edition.json"));
  const lessons = jsonFiles("lessons").map((name) => readJson<{ unitId: string }>(join(content, "lessons", name)));
  const mentioned = new Set<string>();
  for (const l of lessons) if (edition.freeUnits.includes(l.unitId)) strings(l, mentioned);
  const ids = new Set<string>();
  for (const name of jsonFiles("plays")) {
    const id = readJson<{ id: string }>(join(content, "plays", name)).id;
    if (edition.freePlays.includes(id) || mentioned.has(id)) ids.add(id);
  }
  return ids;
}

export interface PaidFiles {
  lessons: string[];
  situations: string[];
  plays: string[];
}

/** The content files the demo leaves out, as file names inside each content folder. */
export function paidFiles(): PaidFiles {
  const edition = readJson<Edition>(join(content, "edition.json"));
  const lessons = jsonFiles("lessons").map((name) => ({ name, data: readJson<{ unitId: string }>(join(content, "lessons", name)) }));
  const freeLessons = lessons.filter((l) => edition.freeUnits.includes(l.data.unitId));

  // A play stays in the demo when it is on the free list or a free lesson shows it.
  const mentioned = new Set<string>();
  for (const l of freeLessons) strings(l.data, mentioned);
  const keepPlay = (id: string) => edition.freePlays.includes(id) || mentioned.has(id);
  const plays = jsonFiles("plays").filter((name) => !keepPlay(readJson<{ id: string }>(join(content, "plays", name)).id));

  return {
    lessons: lessons.filter((l) => !edition.freeUnits.includes(l.data.unitId)).map((l) => l.name),
    situations: jsonFiles("situations"),
    plays,
  };
}

/** Adds "!./folder/file.json" patterns to the content globs when building the demo. */
export function editionPlugin(edition: string): Plugin {
  const paid = edition === "demo" ? paidFiles() : null;
  return {
    name: "football-iq-edition",
    enforce: "pre",
    transform(code, id) {
      if (!paid || !id.replace(/\\/g, "/").endsWith("/src/content/index.ts")) return null;
      let out = code;
      for (const folder of ["lessons", "situations", "plays"] as const) {
        const files = paid[folder];
        if (files.length === 0) continue;
        const pattern = new RegExp(`import\\.meta\\.glob<([A-Za-z]+)>\\("\\./${folder}/\\*\\.json"`);
        if (!pattern.test(out)) throw new Error(`edition plugin: cannot find the ${folder} glob in src/content/index.ts`);
        const list = [`"./${folder}/*.json"`, ...files.map((f) => `"!./${folder}/${f}"`)].join(", ");
        out = out.replace(pattern, (_m, type) => `import.meta.glob<${type}>([${list}]`);
      }
      return { code: out, map: null };
    },
  };
}
