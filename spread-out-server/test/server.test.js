// End-to-end checks of the purchase flow with Stripe stood in by a fake client.
// Webhook signatures are real (made with Stripe's own helper), so the signature
// check is exercised for real.   Run: npm test
const test = require("node:test");
const assert = require("node:assert/strict");
const Stripe = require("stripe");
const { createApp, secretFromFile, COOKIE } = require("../server");
const { openStore } = require("../lib/store");
const { splitGame } = require("../lib/shell");
const { makeCode, parseCode } = require("../lib/license");

const SECRET = "test-secret-".padEnd(48, "x");
const WHSEC = "whsec_testsecret";

function fakeStripe() {
  const sessions = new Map();
  let n = 0;
  return {
    sessions,
    checkout: {
      sessions: {
        async create(params) {
          const id = `cs_test_${++n}abc`;
          const s = { id, url: `https://checkout.stripe.com/c/pay/${id}`, payment_status: "unpaid", payment_intent: `pi_${n}`, metadata: params.metadata, customer_details: { email: `buyer${n}@example.com` }, amount_total: 499, currency: "usd" };
          sessions.set(id, s);
          return s;
        },
        async retrieve(id) {
          const s = sessions.get(id);
          if (!s) { const e = new Error("No such checkout.session"); e.statusCode = 404; throw e; }
          return s;
        },
      },
    },
    webhooks: new Stripe("sk_test_fake").webhooks,
  };
}

async function start() {
  const stripe = fakeStripe();
  const { app, store } = createApp({ jwtSecret: SECRET, webhookSecret: WHSEC, priceId: "price_test", publicUrl: "http://localhost", stripe, store: openStore(":memory:") });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const f = (p, init = {}) => fetch(base + p, { redirect: "manual", ...init });
  const json = (p, body, cookie) => f(p, { method: "POST", headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });
  const webhook = (type, object) => {
    const payload = JSON.stringify({ id: "evt_1", object: "event", type, data: { object } });
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: WHSEC });
    return f("/api/stripe/webhook", { method: "POST", headers: { "content-type": "application/json", "stripe-signature": header }, body: payload });
  };
  const cookieOf = (res) => (res.headers.get("set-cookie") || "").split(";")[0];
  return { stripe, store, f, json, webhook, cookieOf, close: () => server.close() };
}

test("free shell: premium code is cut out, config and paywall are in", async () => {
  const t = await start();
  const res = await t.f("/");
  const html = await res.text();
  assert.equal(res.status, 200);
  assert.match(html, /window\.SPREAD_OUT_CONFIG=\{"paywall":true/);
  assert.match(html, /id="paywall"/);
  assert.doesNotMatch(html, /const match=\{/);
  assert.doesNotMatch(html, /const positions=\{/);
  assert.match(html, /const getopen=\{/);
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.match(res.headers.get("content-security-policy"), /default-src 'self'/);
  t.close();
});

test("premium files need the cookie", async () => {
  const t = await start();
  assert.equal((await t.f("/premium/premium.js")).status, 401);
  assert.equal((await t.f("/voice/manifest.json")).status, 401);
  assert.equal((await t.f("/voice/00000000000000.mp3")).status, 401);
  const me = await (await t.f("/api/me")).json();
  assert.deepEqual(me, { premium: false });
  // a forged cookie signed with the wrong secret
  const jwt = require("jsonwebtoken");
  const forged = jwt.sign({ pid: 1 }, "not-the-secret", { issuer: "spread-out" });
  assert.equal((await t.f("/premium/premium.js", { headers: { cookie: `${COOKIE}=${forged}` } })).status, 401);
  t.close();
});

test("buy -> webhook -> claim -> premium unlocked, refund locks again", async () => {
  const t = await start();
  const co = await (await t.json("/api/checkout", {})).json();
  assert.equal(co.ok, true);
  assert.match(co.url, /^https:\/\/checkout\.stripe\.com\//);
  const sid = [...t.stripe.sessions.keys()][0];

  // claiming before paying is refused
  assert.equal((await t.json("/api/claim", { session_id: sid })).status, 402);

  // Stripe tells us it was paid
  t.stripe.sessions.get(sid).payment_status = "paid";
  const bad = await t.f("/api/stripe/webhook", { method: "POST", headers: { "stripe-signature": "t=1,v1=nope" }, body: "{}" });
  assert.equal(bad.status, 400);
  const ok = await t.webhook("checkout.session.completed", t.stripe.sessions.get(sid));
  assert.equal(ok.status, 200);
  assert.equal(t.store.count(), 1);
  await t.webhook("checkout.session.completed", t.stripe.sessions.get(sid)); // delivered twice: still one row
  assert.equal(t.store.count(), 1);

  // the buyer lands back on the game
  const claim = await t.json("/api/claim", { session_id: sid });
  assert.equal(claim.status, 200);
  const body = await claim.json();
  assert.equal(body.ok, true);
  assert.match(body.licenseCode, /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  const setCookie = claim.headers.get("set-cookie");
  assert.match(setCookie, /HttpOnly/);
  assert.match(setCookie, /SameSite=Lax/);
  const cookie = t.cookieOf(claim);

  assert.deepEqual(await (await t.f("/api/me", { headers: { cookie } })).json(), { premium: true });
  const prem = await t.f("/premium/premium.js", { headers: { cookie } });
  assert.equal(prem.status, 200);
  assert.equal(prem.headers.get("cache-control"), "private, no-store");
  const js = await prem.text();
  assert.match(js, /const match=\{/);
  assert.match(js, /Object\.assign\(modes,\{positions,match\}\)/);
  assert.equal((await t.f("/voice/manifest.json", { headers: { cookie } })).status, 200);

  // restore on another device with the code (typed sloppily)
  const sloppy = " " + body.licenseCode.toLowerCase().replace(/-/g, " ") + " ";
  const r = await t.json("/api/restore", { code: sloppy });
  assert.equal(r.status, 200);
  const cookie2 = t.cookieOf(r);
  assert.deepEqual(await (await t.f("/api/me", { headers: { cookie: cookie2 } })).json(), { premium: true });
  assert.equal((await t.json("/api/restore", { code: "AAAA-BBBB-CCCC-DDDD" })).status, 401);
  assert.equal((await t.json("/api/restore", { code: 12345 })).status, 401);

  // refund: both cookies stop working at once
  await t.webhook("charge.refunded", { id: "ch_1", payment_intent: t.stripe.sessions.get(sid).payment_intent });
  assert.deepEqual(await (await t.f("/api/me", { headers: { cookie } })).json(), { premium: false });
  assert.equal((await t.f("/premium/premium.js", { headers: { cookie: cookie2 } })).status, 401);
  assert.equal((await t.json("/api/claim", { session_id: sid })).status, 403);
  assert.equal((await t.json("/api/restore", { code: body.licenseCode })).status, 401);
  t.close();
});

test("claim works even if the webhook has not arrived yet (Stripe is asked directly)", async () => {
  const t = await start();
  await t.json("/api/checkout", {});
  const sid = [...t.stripe.sessions.keys()][0];
  t.stripe.sessions.get(sid).payment_status = "paid";
  const claim = await t.json("/api/claim", { session_id: sid });
  assert.equal(claim.status, 200);
  assert.equal(t.store.count(), 1);
  assert.equal((await t.json("/api/claim", { session_id: "cs_test_doesnotexist" })).status, 502);
  assert.equal((await t.json("/api/claim", { session_id: "../etc/passwd" })).status, 400);
  // a paid session for some other product on the same Stripe account does not unlock this game
  t.stripe.sessions.set("cs_test_other", { id: "cs_test_other", payment_status: "paid", metadata: { product: "something-else" } });
  assert.equal((await t.json("/api/claim", { session_id: "cs_test_other" })).status, 400);
  t.close();
});

test("restore is rate limited", async () => {
  const t = await start();
  let last;
  for (let i = 0; i < 13; i++) last = await t.json("/api/restore", { code: "AAAA-BBBB-CCCC-DDDD" });
  assert.equal(last.status, 429);
  t.close();
});

test("license codes", () => {
  const c = makeCode(SECRET, 123456);
  assert.equal(parseCode(SECRET, c), 123456);
  assert.equal(parseCode("another-secret".padEnd(40, "y"), c), null);
  assert.equal(parseCode(SECRET, c.slice(0, -1) + (c.endsWith("A") ? "B" : "A")), null);
  assert.equal(parseCode(SECRET, ""), null);
  assert.equal(parseCode(SECRET, null), null);
  assert.notEqual(makeCode(SECRET, 1), makeCode(SECRET, 2));
});

test("splitGame cuts every marked region and injects the config", () => {
  const html = "<head><!--SERVER-CONFIG--></head><script>a();/*PREMIUM-START*/secret1();/*PREMIUM-END*/b();/*PREMIUM-START*/secret2();/*PREMIUM-END*/c();</script>";
  const out = splitGame(html, { paywall: true, price: "$1", note: "</script>" });
  assert.doesNotMatch(out.free, /secret/);
  assert.match(out.free, /a\(\);\/\* premium content loads from the server after purchase \*\/b\(\);/);
  assert.match(out.free, /window\.SPREAD_OUT_CONFIG=\{"paywall":true,"price":"\$1","note":"\\u003c\/script>"\}/);
  assert.equal(out.premium, "secret1();\nsecret2();\n");
  assert.throws(() => splitGame("<head><!--SERVER-CONFIG--></head>", {}), /no premium regions/);
  assert.throws(() => splitGame("/*PREMIUM-START*/x", {}), /without a PREMIUM-END/);
});

test("refuses to start without secrets", () => {
  assert.throws(() => createApp({ jwtSecret: "short", webhookSecret: WHSEC, priceId: "p", stripe: fakeStripe(), store: openStore(":memory:") }), /JWT_SECRET/);
  assert.throws(() => createApp({ jwtSecret: SECRET, webhookSecret: WHSEC, priceId: "p", stripe: fakeStripe(), store: openStore(":memory:"), production: true, publicUrl: "http://plain" }), /https/);
});

test("JWT_SECRET_FILE: created once, then reused", () => {
  const fs = require("node:fs");
  const os = require("node:os");
  const path = require("node:path");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "so-secret-"));
  const file = path.join(dir, "nested", "jwt_secret");
  const a = secretFromFile(file);
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.equal(fs.statSync(file).mode & 0o777, 0o600);
  assert.equal(secretFromFile(file), a);
  assert.equal(secretFromFile(undefined), undefined);
  fs.rmSync(dir, { recursive: true, force: true });
});
