/**
 * Lists every sentence the soccer coach can say, so each one can be recorded
 * once in Coach Eric's voice. Writes voice/units.json.
 *
 *   node spread-out/voice/extract-units.mjs        (from the repository root)
 *
 * It opens the game in a headless browser and asks the game itself for its
 * lines (window.__debug.voiceLines) and for how it splits them into sentences
 * (voice.units), so the ids here always match what the game looks for at play
 * time. Needs football-iq's node_modules for playwright-core (npm ci there).
 */
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(here, "..", "..", "football-iq", "package.json"));
const { chromium } = require("playwright-core");
const CHROME = process.env.CHROME ?? "/opt/pw-browsers/chromium";

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto("file://" + join(here, "..", "index.html"));
await page.waitForTimeout(400);

const units = await page.evaluate(() => {
  const d = window.__debug;
  const map = new Map();
  for (const line of d.voiceLines()) for (const u of d.voice.units(line)) map.set(u.id, u.text);
  return [...map.entries()].map(([id, text]) => ({ id, text }));
});
await browser.close();
if (errors.length) {
  console.error("page errors:", errors);
  process.exit(1);
}

units.sort((a, b) => a.text.localeCompare(b.text));
const out = join(here, "units.json");
let before = [];
try { before = JSON.parse(readFileSync(out, "utf8")); } catch {}
const had = new Set(before.map((u) => u.id));
writeFileSync(out, JSON.stringify(units, null, 1) + "\n");
const chars = units.reduce((n, u) => n + u.text.length, 0);
console.log(`${units.length} sentences to record (${units.filter((u) => !had.has(u.id)).length} new), ${chars} characters, about ${Math.ceil(chars / 15 / 60)} minute(s) of speech.`);
