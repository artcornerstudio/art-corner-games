/**
 * Plays through every mode of Spread Out! with the list of recorded sentences
 * loaded, and reports each line that would still be spoken by the device voice
 * because a sentence has no clip.
 *
 *   node spread-out/voice/coverage.mjs        (from the repository root)
 *
 * Clips are stood in for by a silent mp3, so this checks coverage, not sound.
 * Lines with a player's name are expected to use the device voice.
 * Needs football-iq's node_modules for playwright-core (npm ci there).
 */
import { createRequire } from "node:module";
import { createServer } from "node:http";
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, extname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const game = join(here, "..");
const require = createRequire(join(here, "..", "..", "football-iq", "package.json"));
const { chromium } = require("playwright-core");
const CHROME = process.env.CHROME ?? "/opt/pw-browsers/chromium";
const units = JSON.parse(readFileSync(join(here, "units.json"), "utf8"));
const SILENT_MP3 = Buffer.from("SUQzBAAAAAAAIlRTU0UAAAAOAAADTGF2ZjYxLjEuMTAwAAAAAAAAAAAAAAD/84TAAAAAAAAAAAAASW5mbwAAAA8AAAAFAAABsACOjo6Ojo6Ojo6Ojo6Ojo6Ojo6OqqqqqqqqqqqqqqqqqqqqqqqqqqrHx8fHx8fHx8fHx8fHx8fHx8fHx+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj//////////////////////////8AAAAATGF2YzYxLjMuAAAAAAAAAAAAAAAAJANgAAAAAAAAAbAJwoR/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8yTEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/8yTEIwAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/8yTERgAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/8yTEaQAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/8yTEjAAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=", "base64");

// Serve the game folder at /spread-out/ the way GitHub Pages does.
const MIME = { ".html": "text/html", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".webp": "image/webp", ".mp3": "audio/mpeg" };
const server = createServer((req, res) => {
  const u = decodeURIComponent(req.url.split("?")[0]);
  if (!u.startsWith("/spread-out/")) { res.writeHead(404); return res.end(); }
  let p = join(game, u.slice("/spread-out/".length));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); return res.end("not found"); }
  res.writeHead(200, { "Content-Type": MIME[extname(p)] ?? "application/octet-stream", "Cache-Control": "no-cache" });
  createReadStream(p).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const APP = `http://127.0.0.1:${server.address().port}/spread-out/`;

const browser = await chromium.launch({ executablePath: CHROME, args: ["--autoplay-policy=no-user-gesture-required"] });
const ctx = await browser.newContext({ viewport: { width: 420, height: 860 }, serviceWorkers: "block" });
await ctx.route("**/voice/manifest.json", (r) => r.fulfill({ json: { voice: "am_eric", count: units.length, ids: units.map((u) => u.id) } }));
await ctx.route(/\/voice\/[0-9a-f]{14}\.mp3$/, (r) => r.fulfill({ body: SILENT_MP3, contentType: "audio/mpeg" }));
const collected = [];
await ctx.exposeFunction("__collect", (e) => collected.push(e));
await ctx.addInitScript(() => {
  const synth = { speaking: false, pending: false, getVoices: () => [{ name: "Samantha", lang: "en-US", localService: true }], addEventListener() {}, speak() {}, cancel() {} };
  Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
  Object.defineProperty(window, "SpeechSynthesisUtterance", { value: function (t) { this.text = t; }, configurable: true });
  try { localStorage.setItem("sp_voice", "true"); localStorage.setItem("sp_muted", "false"); } catch {}
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
await page.goto(APP);
await page.waitForTimeout(500);
await page.evaluate(() => {
  const v = window.__debug.voice;
  v.debug = (e) => window.__collect(e);
  window.__ended = 0;
  v.element().addEventListener("ended", () => { window.__ended++; });
});
const pause = (ms) => page.waitForTimeout(ms);
const back = async () => { await page.locator("#backBtn").click(); await pause(250); };
const mode = async (id) => { await page.locator(id).click(); await pause(500); };

// Voice toggle line
await page.locator("#voiceBtnHome").click(); await pause(150);
await page.locator("#voiceBtnHome").click(); await pause(400);

// Get Open!: the robot kid wanders to corners and the middle, so every hint comes up
await mode("#playGetOpen");
await page.evaluate(async () => {
  const M = window.__debug.modes.getopen, p = M.player;
  const spots = [[80, 120], [520, 120], [300, 400], [80, 700], [520, 700], [300, 100], [300, 700]];
  const t0 = Date.now();
  let i = 0;
  while (Date.now() - t0 < 16000) {
    const s = spots[i++ % spots.length];
    p.tx = s[0]; p.ty = s[1];
    await new Promise((r) => setTimeout(r, 1400));
  }
});
await back();

// Pick the Pass!: right, right, right (streak star), wrong, right, wrong, right
await mode("#playPickPass");
const box = await page.locator("#field").boundingBox();
const toScreen = (m) => ({ x: box.x + (m.x / 600) * box.width, y: box.y + (m.y / 800) * box.height });
for (const wantOpen of [true, true, true, false, true, false, true]) {
  const target = await page.evaluate((wantOpen) => {
    const p = window.__debug.modes.pickpass;
    const list = p.mates.map((m) => ({ x: m.x, y: m.y, open: p.mateOpen(m) }));
    return list.find((m) => m.open === wantOpen) ?? list[0];
  }, wantOpen);
  const s = toScreen(target);
  await page.mouse.click(s.x, s.y);
  await pause(wantOpen ? 1700 : 2600);
}
await back();

// Where Do I Stand?: run to each prompt until level 2 with sides
await mode("#playPositions");
await page.evaluate(async () => {
  const m = window.__debug.modes.positions, st = window.__debug.state;
  const Z = { striker: [40, 800 / 3], mid: [800 / 3, 1600 / 3], defender: [1600 / 3, 760] };
  const t0 = Date.now();
  while (st.score < 5 && Date.now() - t0 < 25000) {
    const z = Z[m.prompt.role];
    let x = 300;
    if (m.prompt.side === "left") x = 150;
    if (m.prompt.side === "right") x = 450;
    m.player.tx = x; m.player.ty = (z[0] + z[1]) / 2;
    await new Promise((r) => setTimeout(r, 120));
  }
});
await back();

// Mini Match!: kickoff lesson, play with the robot kid, goals both ways, full time, next match
await mode("#playMatch");
await page.locator("#ovBtn").click();
await pause(300);
await page.evaluate(async () => {
  const M = window.__debug.modes.match;
  const t0 = Date.now();
  while (Date.now() - t0 < 24000 && (M.phase === "play" || M.phase === "goal")) {
    const b = M.ball, kid = M.kid;
    if (M.phase === "play") {
      if (b.holder === kid) {
        const guard = M.them.find((e) => e.role === "oppD");
        const sideX = guard && guard.x > 300 ? 170 : 430;
        if (kid.y > 240) { kid.tx = sideX; kid.ty = kid.y - 120; } else M.pointer("down", kid.x < 300 ? 350 : 250, 60);
      } else if (b.holder && b.holder.team === "us") {
        let bp = null, bs = -1;
        for (let x = 80; x < 540; x += 46) for (let y = 180; y < 520; y += 46) {
          let nd = 1e9;
          for (const e of M.them) nd = Math.min(nd, Math.hypot(e.x - x, e.y - y));
          if (nd > bs) { bs = nd; bp = { x, y }; }
        }
        kid.tx = bp.x; kid.ty = bp.y;
      } else if (b.holder && b.holder.team === "them") { kid.tx = b.holder.x; kid.ty = b.holder.y; }
      else { kid.tx = b.x; kid.ty = b.y; }
    }
    await new Promise((r) => setTimeout(r, 120));
  }
  // let them score once, then end the match
  M.scoreThem = Math.max(M.scoreThem, 1);
  M.t = M.duration - 0.01;
});
await pause(1200);
await page.locator("#ovBtn").click(); // next match / rematch -> "Match 2" lesson
await pause(400);
await back();

// Coach Corner read-aloud buttons
await page.locator("#openCoach").click(); await pause(300);
for (const b of await page.locator(".readBtn").all()) { await b.click(); await pause(400); }
await back();

// ---- Report
const clip = collected.filter((e) => e.how === "clip");
const device = collected.filter((e) => e.how === "device");
const missing = new Map();
for (const e of device) for (const t of e.missing) missing.set(t, (missing.get(t) ?? 0) + 1);
const expected = (t) => /^(Hi |Welcome, )/.test(t);
const unexpected = [...missing.entries()].filter(([t]) => !expected(t));
const ended = await page.evaluate(() => window.__ended);
console.log(`spoken lines: ${collected.length}, in Coach Eric's voice: ${clip.length} (${Math.round((100 * clip.length) / Math.max(1, collected.length))}%), device voice: ${device.length}`);
console.log(`clips that played to the end: ${ended}`);
console.log(`distinct sentences with no clip: ${missing.size}${unexpected.length ? "" : " (all expected)"}`);
for (const [t, n] of unexpected) console.log(String(n).padStart(4), t);
if (process.env.VERBOSE) for (const e of collected) console.log(` ${e.how === "clip" ? "🎙" : "📱"} ${e.text}`);
if (errors.length) console.log("page errors:", errors.slice(0, 5));
await browser.close();
server.close();
process.exit(unexpected.length || errors.length || ended === 0 ? 1 : 0);
