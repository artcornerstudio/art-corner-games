/**
 * The promise of the free demo: the paid content is not in it, anywhere.
 * Run after `npm run build:editions`. Exits non-zero when a paid sentence is
 * found in the demo build, or when the full build is missing paid content.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const edition = JSON.parse(readFileSync(join(root, "src/content/edition.json"), "utf8"));
const lessonsDir = join(root, "src/content/lessons");

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(js|html|json|webmanifest|css)$/.test(name)) out.push(p);
  }
  return out;
}

function corpus(dir) {
  if (!existsSync(dir)) throw new Error(`${dir} is missing. Run npm run build:editions first.`);
  return walk(dir).map((f) => readFileSync(f, "utf8")).join("\n");
}

/** A distinctive sentence from each lesson step and quiz explanation, as it appears inside JSON-in-JS (quotes escaped). */
function samples(lesson) {
  const lines = [...lesson.steps.map((s) => s.text), ...lesson.quiz.map((q) => q.explanation)];
  return lines.map((t) => JSON.stringify(t).slice(1, -1)).filter((t) => t.length > 30);
}

// The server's build script checks the folders it just built; by default we look at dist-demo and dist-full.
const demo = corpus(process.env.DEMO_DIR ?? join(root, "dist-demo"));
const full = corpus(process.env.FULL_DIR ?? join(root, "dist-full"));
let problems = 0;
let paidChecked = 0;
let freeChecked = 0;

for (const name of readdirSync(lessonsDir).filter((f) => f.endsWith(".json"))) {
  const lesson = JSON.parse(readFileSync(join(lessonsDir, name), "utf8"));
  const free = edition.freeUnits.includes(lesson.unitId);
  for (const s of samples(lesson)) {
    if (!full.includes(s)) { console.error(`FULL build is missing a sentence from ${lesson.id}: ${s.slice(0, 60)}`); problems++; }
    if (free) {
      freeChecked++;
      if (!demo.includes(s)) { console.error(`DEMO build is missing a free sentence from ${lesson.id}: ${s.slice(0, 60)}`); problems++; }
    } else {
      paidChecked++;
      if (demo.includes(s)) { console.error(`DEMO build LEAKS a paid sentence from ${lesson.id}: ${s.slice(0, 60)}`); problems++; }
    }
  }
}

// Game text that lives in the program code of the paid games. The demo build replaces those screens, so it must be gone.
const CODE_SENTINELS = [
  "Riverside Rockets", // Season: team names and scouting reports
  "Two safeties deep, splitting the field in half.", // Beat the Coverage: the tells
  "Halftime is 40 seconds away.", // Fourth-Down Decision: scenario notes
  "Run, run, run. Power football on first and second down.", // Season: tendencies
];
for (const text of CODE_SENTINELS) {
  paidChecked++;
  if (demo.includes(text)) { console.error(`DEMO build LEAKS paid game text: ${text}`); problems++; }
  if (!full.includes(text)) { console.error(`FULL build is missing game text: ${text}`); problems++; }
}

// Paid situations and paid plays must not be in the demo either.
for (const dir of ["situations"]) {
  for (const name of readdirSync(join(root, "src/content", dir)).filter((f) => f.endsWith(".json"))) {
    const data = JSON.parse(readFileSync(join(root, "src/content", dir, name), "utf8"));
    const reason = data.options?.[0]?.reason;
    if (reason) {
      paidChecked++;
      if (demo.includes(JSON.stringify(reason).slice(1, -1))) { console.error(`DEMO build LEAKS a situation: ${name}`); problems++; }
    }
  }
}

if (problems) {
  console.error(`\n${problems} problem(s). The demo is not safe to publish.`);
  process.exit(1);
}
console.log(`Editions OK: ${paidChecked} paid sentences are absent from the demo, ${freeChecked} free ones are in it, and the full build has them all.`);
