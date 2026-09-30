/**
 * Drives the built app through every lesson and every game with the list of
 * recorded sentences loaded, and reports each line that would still be spoken
 * by the device voice because a sentence has no clip.
 *
 *   npm run build && npx vite preview --port 4173 &
 *   node scripts/voice-coverage.mjs            # add what it lists to voice/extra-lines.json
 *
 * Clips are stood in for by a silent mp3, so this checks coverage, not sound.
 * Lines the AI Coach writes are expected to use the device voice and are not driven here.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const APP = process.env.URL ?? "http://localhost:4173/";
const CHROME = process.env.CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const SILENT_MP3 = Buffer.from("SUQzBAAAAAAAIlRTU0UAAAAOAAADTGF2ZjYxLjEuMTAwAAAAAAAAAAAAAAD/84TAAAAAAAAAAAAASW5mbwAAAA8AAAAFAAABsACOjo6Ojo6Ojo6Ojo6Ojo6Ojo6OqqqqqqqqqqqqqqqqqqqqqqqqqqrHx8fHx8fHx8fHx8fHx8fHx8fHx+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj//////////////////////////8AAAAATGF2YzYxLjMuAAAAAAAAAAAAAAAAJANgAAAAAAAAAbAJwoR/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/8yTEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/8yTEIwAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/8yTERgAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/8yTEaQAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/8yTEjAAAA0gAAAAAVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=", "base64");
const units = JSON.parse(readFileSync(new URL("../voice/units.json", import.meta.url), "utf8"));

const browser = await chromium.launch({ executablePath: CHROME, args: ["--autoplay-policy=no-user-gesture-required"] });
const ctx = await browser.newContext({ viewport: { width: 1000, height: 1100 } });
await ctx.route("**/voice/manifest.json", (r) => r.fulfill({ json: { ids: units.map((u) => u.id) } }));
await ctx.route(/\/voice\/[0-9a-f]{14}\.mp3$/, (r) => r.fulfill({ body: SILENT_MP3, contentType: "audio/mpeg" }));
const collected = [];
await ctx.exposeFunction("__collect", (e) => collected.push(e));
await ctx.addInitScript(() => {
  window.__voiceDebug = (e) => window.__collect(e);
  const synth = { speaking: false, pending: false, getVoices: () => [{ name: "Samantha", lang: "en-US", localService: true }], addEventListener() {}, speak() {}, cancel() {} };
  Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
  Object.defineProperty(window, "SpeechSynthesisUtterance", { value: function (t) { this.text = t; }, configurable: true });
  try {
    if (!localStorage.getItem("football-iq.progress.v1")) {
      localStorage.setItem("football-iq.progress.v1", JSON.stringify({ version: 1, lessons: {}, badges: {}, games: {}, tier: "rookie", readAloud: true }));
    }
  } catch {}
});
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

const pause = (ms = 90) => page.waitForTimeout(ms);
const visible = async (loc) => (await loc.count()) > 0 && (await loc.first().isVisible().catch(() => false));

async function home() {
  await page.goto(APP);
  await page.waitForSelector(".home");
  await pause(200);
}
async function tapField() {
  const box = await page.locator("canvas").first().boundingBox();
  if (box) await page.mouse.click(box.x + box.width * (0.3 + Math.random() * 0.4), box.y + box.height * (0.35 + Math.random() * 0.4));
}
async function clickBtn(name) {
  const b = page.getByRole("button", { name, exact: false }).first();
  if (await visible(b)) { await b.click(); await pause(); return true; }
  return false;
}
async function openGame(title) {
  await home();
  await page.locator(".gcard", { hasText: title }).first().click();
  await pause(250);
}
const ADVANCE = /^(Next question|Next situation|Next decision|Next look|Next snap|Next drive|Next|See my score|See final score|Final score|Now play defense|Now you have the ball|Back to the season|Play again)$/;
async function advance() {
  for (const b of await page.getByRole("button").all()) {
    const t = ((await b.innerText().catch(() => "")) || "").trim();
    if (ADVANCE.test(t) && (await b.isVisible().catch(() => false))) { await b.click(); await pause(); return t; }
  }
  return null;
}
async function answerOnce(pick) {
  const choices = page.locator(".choice:not([disabled])");
  const n = await choices.count();
  if (n > 0) { await choices.nth(pick % n).click(); await pause(); return true; }
  if (await visible(page.locator("canvas"))) { await tapField(); await pause(); return true; }
  return false;
}

// ---- Every lesson: read each step, then answer the quiz (alternating right-ish and wrong-ish picks)
await home();
const unitCount = await page.locator(".ucard").count();
let lessonsWalked = 0;
for (let u = 0; u < unitCount; u++) {
  await home();
  await page.locator(".ucard").nth(u).click();
  await pause(200);
  const lessonCount = await page.locator(".lesson-card").count();
  for (let l = 0; l < lessonCount; l++) {
    if (!(await visible(page.locator(".lesson-card")))) {
      await home();
      await page.locator(".ucard").nth(u).click();
      await pause(150);
    }
    await page.locator(".lesson-card").nth(l).click();
    await pause(150);
    for (let i = 0; i < 12 && !(await visible(page.getByRole("button", { name: "Take the quiz" }))); i++) await clickBtn(/^Next$/);
    await clickBtn("Take the quiz");
    for (let q = 0; q < 5; q++) {
      await answerOnce(l + q);
      await advance();
    }
    lessonsWalked++;
    await page.locator(".toolbar .btn-ghost").first().click().catch(() => {});
    await pause(120);
  }
}
console.log("lessons walked:", lessonsWalked);

// ---- Position cards in the Play Lab
await home();
await page.locator(".lab-card .btn-primary").click();
await pause(400);
for (let i = 0; i < 8; i++) { await tapField(); await pause(150); }

// ---- Games
async function rounds(title, max, pick, variant = 0) {
  await openGame(title);
  if (variant > 0) {
    const seg = page.locator(".toolbar .segmented .seg").nth(variant);
    if (!(await visible(seg))) return;
    await seg.click();
    await pause(200);
  }
  for (let i = 0; i < max; i++) {
    const did = await answerOnce(pick + i);
    const adv = await advance();
    if (!did && !adv) break;
  }
  await advance();
}
for (const tier of ["rookie", "pro"]) {
  await page.evaluate((t) => { const p = JSON.parse(localStorage.getItem("football-iq.progress.v1")); p.tier = t; localStorage.setItem("football-iq.progress.v1", JSON.stringify(p)); }, tier);
  for (const v of [0, 1, 2]) {
    await rounds("Call the Play", 14, 0, v);
    await rounds("Spot the Position", 24, 0, v);
    await rounds("Hot Read", 14, 0, v);
  }
  await rounds("Beat the Coverage", 14, 1);
  await rounds("Fourth-Down Decision", 14, 1);
}
await openGame("Drive Simulator");
for (let i = 0; i < 90; i++) {
  if (await advance()) continue;
  const c = page.locator(".choice");
  const n = await c.count();
  if (n === 0) break;
  await c.nth(i % Math.min(n, 6)).click();
  await pause(60);
}
await home();
await page.locator(".gcard", { hasText: "Season" }).first().click();
await pause(200);
for (let g = 0; g < 2; g++) {
  const play = page.locator(".season .grid .btn-primary:not([disabled])").first();
  if (!(await visible(play))) break;
  await play.click();
  await pause(150);
  for (let i = 0; i < 120; i++) {
    if (await clickBtn(/Back to the season/)) break;
    if (await advance()) continue;
    const c = page.locator(".choice");
    const n = await c.count();
    if (n === 0) break;
    await c.nth(i % Math.min(n, 5)).click();
    await pause(60);
  }
}

// ---- Report
const events = collected;
const coach = events.filter((e) => e.voice === "coach").length;
const device = events.filter((e) => e.voice === "device");
const missing = new Map();
for (const e of device) for (const t of e.missing) missing.set(t, (missing.get(t) ?? 0) + 1);
console.log(`spoken lines: ${events.length}, in the coach voice: ${coach} (${Math.round((100 * coach) / Math.max(1, events.length))}%), device voice: ${device.length}`);
console.log(`distinct sentences with no clip: ${missing.size}`);
const list = [...missing.entries()].sort((a, b) => b[1] - a[1]);
for (const [t, n] of list.slice(0, 120)) console.log(String(n).padStart(4), t);
if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify({ total: events.length, coach, missing: list }, null, 1));
if (errors.length) console.log("page errors:", errors.slice(0, 5));
await browser.close();
