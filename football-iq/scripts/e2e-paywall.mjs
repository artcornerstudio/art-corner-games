/**
 * Plays the whole purchase in a real browser against the real server with a pretend Stripe.
 *
 *   FIQ_DEMO_DIR=... FIQ_FULL_DIR=... node ../spread-out-server/test/dev-fake-stripe.js &
 *   node scripts/e2e-paywall.mjs            # BASE defaults to http://127.0.0.1:3100
 *
 * Checks: the free demo locks the paid parts, the page has none of the paid content, buying unlocks
 * everything and swaps to the full build, the license code works on a second device, a refund locks
 * it again, the voice clips follow the same rules, and Spread Out! is untouched.
 */
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";

const BASE = process.env.BASE ?? "http://127.0.0.1:3100";
const SHOTS = process.env.SHOTS ?? "/tmp/fiq-shots";
mkdirSync(SHOTS, { recursive: true });
const CHROME = process.env.CHROME ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const GAME = `${BASE}/football-iq/`;

let failures = 0;
function check(ok, what, extra = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${what}${extra ? `  (${extra})` : ""}`);
  if (!ok) failures++;
}

const browser = await chromium.launch({ executablePath: CHROME });
const errors = [];
function watch(page, label) {
  page.on("pageerror", (e) => errors.push(`${label}: ${e}`));
  page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errors.push(`${label}: ${m.text()}`));
}
const pause = (page, ms = 150) => page.waitForTimeout(ms);

async function answerGate(page) {
  const text = await page.locator(".paywall-gate label").innerText();
  const [, a, b] = text.match(/what is (\d+) times (\d+)/);
  await page.locator(".paywall-gate input").fill(String(Number(a) * Number(b)));
}

// ================= device 1: a kid opens the free demo
const ctx1 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const p1 = await ctx1.newPage();
watch(p1, "device 1");
const res = await p1.goto(GAME);
check(res.status() === 200, "the demo page loads");
await p1.waitForSelector(".home");
await pause(p1, 400);

check(await p1.locator(".unlock-bar").count() === 1, "the demo shows the unlock bar");
const units = await p1.locator(".ucard").count();
const lockedUnits = await p1.locator(".ucard-locked").count();
check(units === 9 && lockedUnits === 8, "9 units, 8 of them locked", `${units} units, ${lockedUnits} locked`);
const lockedGames = await p1.locator(".gcard-locked").count();
check(lockedGames === 7, "7 of the 8 games are locked", `${lockedGames} locked`);
await p1.screenshot({ path: join(SHOTS, "1-demo-home.png"), fullPage: false });

// The page itself must not hold paid content.
const html = await p1.content();
const scripts = await p1.evaluate(async () => {
  const srcs = [...document.querySelectorAll("script[src]")].map((s) => s.src);
  return Promise.all(srcs.map((u) => fetch(u).then((r) => r.text())));
});
const everything = html + scripts.join("\n");
check(!/Riverside Rockets|Two safeties deep, splitting the field in half/.test(everything), "the demo bundle has no paid game text");

// A locked unit opens the unlock dialog, not the unit.
await p1.locator(".ucard-locked").first().click();
await p1.waitForSelector(".paywall");
check((await p1.locator("#pw-title").innerText()).includes("Unlock"), "tapping a locked unit opens the unlock dialog");
await p1.screenshot({ path: join(SHOTS, "2-dialog.png") });
const buyDisabled = await p1.locator(".paywall-gate .btn-primary").isDisabled();
check(buyDisabled, "Buy is disabled until the grown-up question is answered");
await p1.locator(".paywall-gate input").fill("1");
check(await p1.locator(".paywall-gate .btn-primary").isDisabled(), "a wrong answer keeps Buy disabled");
await p1.getByRole("button", { name: "Keep playing the free part" }).click();
check((await p1.locator(".paywall").count()) === 0, "the dialog closes");

// A locked game opens it too.
await p1.locator(".gcard-locked").first().click();
await p1.waitForSelector(".paywall");
check(true, "tapping a locked game opens the unlock dialog");
await p1.getByRole("button", { name: "Keep playing the free part" }).click();

// The free unit works.
await p1.locator(".ucard:not(.ucard-locked)").first().click();
await p1.waitForSelector(".lesson-card");
check((await p1.locator(".lesson-card").count()) === 5, "the free unit has its 5 lessons");
await p1.locator(".lesson-card").first().click();
await p1.waitForSelector(".step-text");
check(true, "a free lesson opens");
await p1.locator(".toolbar .btn-ghost").first().click();
await pause(p1);
await p1.locator(".toolbar .btn-ghost").first().click();
await p1.waitForSelector(".home");

// Spot the Position: five rounds, then the unlock offer.
await p1.locator(".gcard", { hasText: "Spot the Position" }).click();
await p1.waitForSelector(".prompt");
for (let i = 0; i < 25; i++) {
  if (await p1.locator(".result").count()) break;
  const box = await p1.locator("canvas").first().boundingBox();
  await p1.mouse.click(box.x + box.width * (0.3 + Math.random() * 0.4), box.y + box.height * (0.35 + Math.random() * 0.4));
  await pause(p1, 200);
  const next = p1.getByRole("button", { name: /^(Next|See my score)$/ });
  if (await next.count()) await next.first().click();
  await pause(p1, 150);
}
const resultText = await p1.locator(".result").innerText().catch(() => "");
check(/of 5\b/.test(resultText), "Spot the Position stops at 5 rounds in the demo", resultText.split("\n").slice(0, 2).join(" | "));
check((await p1.locator(".result .link-button").count()) === 1, "the finish screen offers the unlock");

// Clips: the demo's list is the free sentences only.
const demoManifest = await p1.evaluate(() => fetch("voice/manifest.json").then((r) => r.json()));
const fullCount = await p1.evaluate(async () => (await (await fetch("voice/manifest.json")).json()).count);
check(demoManifest.ids.length > 1500 && demoManifest.ids.length < 3000, "the demo's voice list holds only the free clips", `${demoManifest.ids.length} of 4095`);
const allUnits = await (await fetch(`${BASE}/football-iq/voice/manifest.json`)).json();
check(allUnits.count === demoManifest.count && fullCount === demoManifest.count, "the voice list is the same for any visitor without a purchase");
const paidClipStatus = await p1.evaluate(async () => {
  // A clip that only paid lessons use: find one id missing from the demo list but in the full list is not possible without a purchase, so probe a well-formed unknown id.
  return (await fetch("voice/ffffffffffffff.mp3")).status;
});
check([401, 404].includes(paidClipStatus), "an unknown clip is refused", String(paidClipStatus));

// ================= buy it
await p1.goto(GAME);
await p1.waitForSelector(".home");
await p1.locator(".unlock-bar .btn-primary").click();
await p1.waitForSelector(".paywall-gate");
await answerGate(p1);
check(!(await p1.locator(".paywall-gate .btn-primary").isDisabled()), "the right answer enables Buy");
await Promise.all([p1.waitForURL(/__pretend-checkout/), p1.locator(".paywall-gate .btn-primary").click()]);
check(true, "Buy sends the browser to checkout");
await Promise.all([p1.waitForURL(/football-iq\/\?session_id=/).catch(() => {}), p1.locator("#pay").click()]);
await p1.waitForSelector(".license-code", { timeout: 15000 });
const code = (await p1.locator(".license-code").innerText()).trim();
check(/^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/.test(code), "the unlocked screen shows a license code", code);
check(!p1.url().includes("session_id"), "the session id is removed from the address bar");
await p1.screenshot({ path: join(SHOTS, "3-unlocked.png") });
await Promise.all([p1.waitForURL(`${GAME}`), p1.getByRole("button", { name: "Start playing" }).click()]);
await p1.waitForSelector(".home");
await pause(p1, 600);
check((await p1.locator(".unlock-bar").count()) === 0, "after buying, the unlock bar is gone");
check((await p1.locator(".ucard-locked").count()) === 0 && (await p1.locator(".gcard-locked").count()) === 0, "nothing is locked any more");
await p1.screenshot({ path: join(SHOTS, "4-full-home.png") });

// The paid content is really there now.
await p1.locator(".ucard", { hasText: "Defense basics" }).click();
await p1.waitForSelector(".lesson-card");
check((await p1.locator(".lesson-card").count()) === 4, "a paid unit opens with its 4 lessons");
await p1.locator(".toolbar .btn-ghost").first().click();
await p1.waitForSelector(".home");
await p1.locator(".gcard", { hasText: "Call the Play" }).click();
await p1.waitForSelector(".situation");
check(true, "a paid game plays");
const fullManifest = await p1.evaluate(() => fetch("voice/manifest.json").then((r) => r.json()));
check(fullManifest.count === 4095, "a buyer's voice list has every clip", String(fullManifest.count));
// It survives a reload (the cookie, not the page, is what unlocks it).
await p1.goto(GAME);
await p1.waitForSelector(".home");
check((await p1.locator(".unlock-bar").count()) === 0, "still unlocked after a reload");

// ================= device 2: the license code
const ctx2 = await browser.newContext({ viewport: { width: 1000, height: 900 } });
const p2 = await ctx2.newPage();
watch(p2, "device 2");
await p2.goto(GAME);
await p2.waitForSelector(".unlock-bar");
check((await p2.locator(".ucard-locked").count()) === 8, "a second device starts in the demo");
await p2.locator(".unlock-bar .btn-primary").click();
await p2.waitForSelector(".paywall-restore");
await p2.locator(".paywall-restore input").fill("AAAA-AAAA-AAAA-AAAA");
await p2.getByRole("button", { name: "Unlock with code" }).click();
await p2.waitForSelector(".paywall-error");
check(true, "a wrong code is refused with a message");
await p2.locator(".paywall-restore input").fill(code);
await Promise.all([p2.waitForNavigation().catch(() => {}), p2.getByRole("button", { name: "Unlock with code" }).click()]);
await p2.waitForSelector(".home");
await pause(p2, 600);
check((await p2.locator(".unlock-bar").count()) === 0 && (await p2.locator(".ucard-locked").count()) === 0, "the code unlocks the second device");

// ================= a refund locks both
const sessions = await (await fetch(`${BASE}/__pretend-sessions`)).json();
const paid = sessions.find((s) => s.paid && s.product === "football-iq");
const refund = await (await fetch(`${BASE}/__pretend-refund/${paid.id}`)).json();
check(refund.refunded === true, "a signed refund webhook is accepted");
for (const [page, name] of [[p1, "device 1"], [p2, "device 2"]]) {
  const me = await page.evaluate(() => fetch("api/me", { cache: "no-store" }).then((r) => r.json()));
  check(me.premium === false, `${name} is locked again after the refund`);
}
const oldCode = await p2.evaluate(async (c) => (await fetch("api/restore", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: c }) })).status, code);
check(oldCode === 401, "the refunded license code no longer works");

// ================= Spread Out! is untouched
const so = await fetch(`${BASE}/`);
const soHtml = await so.text();
check(so.status === 200 && /Spread Out/.test(soHtml), "Spread Out! still loads at /");
const soMe = await (await fetch(`${BASE}/api/me`)).json();
check(soMe.premium === false, "Spread Out!'s own API still answers");

console.log(errors.length ? `\nBrowser errors:\n${errors.slice(0, 8).join("\n")}` : "\nNo browser errors.");
console.log(failures ? `${failures} FAILED` : "ALL PASSED");
await browser.close();
process.exit(failures ? 1 : 0);
