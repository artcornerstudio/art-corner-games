// Football IQ on the shared server: the demo and the full game, the purchase flow, refunds,
// and the voice clips. Stripe is a fake client; webhook signatures are real.   Run: npm test
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const Stripe = require("stripe");
const { createApp } = require("../server");
const { openStore } = require("../lib/store");
const { makeCode } = require("../lib/license");

const SECRET = "test-secret-".padEnd(48, "x");
const WHSEC = "whsec_testsecret";
const FREE_ID = "aaaaaaaaaaaaaa";
const PAID_ID = "bbbbbbbbbbbbbb";
const FREE_PRICE = "price_free";

function fakeStripe() {
  const sessions = new Map();
  const created = [];
  let n = 0;
  return {
    sessions,
    created,
    checkout: {
      sessions: {
        async create(params) {
          const id = `cs_test_${++n}fiq`;
          created.push(params);
          const s = { id, url: `https://checkout.stripe.com/c/pay/${id}`, payment_status: "unpaid", payment_intent: `pi_${n}`, metadata: params.metadata, customer_details: { email: `parent${n}@example.com` }, amount_total: 999, currency: "usd" };
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

/** Two tiny builds and a voice folder on disk, so the server serves real files. */
function makeSite({ withBuilds = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fiq-"));
  const demo = path.join(root, "dist-demo");
  const full = path.join(root, "dist-full");
  const voice = path.join(root, "voice");
  fs.mkdirSync(voice);
  if (withBuilds) {
    for (const [dir, edition] of [[demo, "DEMO"], [full, "FULL"]]) {
      fs.mkdirSync(path.join(dir, "assets"), { recursive: true });
      fs.writeFileSync(path.join(dir, "index.html"), `<!doctype html><html><head><title>t</title></head><body>${edition} BUILD</body></html>`);
      fs.writeFileSync(path.join(dir, "privacy.html"), `<p>privacy ${edition}</p>`);
      fs.writeFileSync(path.join(dir, "sw.js"), `// ${edition} worker`);
      fs.writeFileSync(path.join(dir, "assets", "shared.js"), "shared();");
    }
    fs.writeFileSync(path.join(demo, "assets", "demo-only.js"), "demo();");
    fs.writeFileSync(path.join(full, "assets", "full-only.js"), "paid lesson content");
  }
  fs.writeFileSync(path.join(voice, `${FREE_ID}.mp3`), "free clip");
  fs.writeFileSync(path.join(voice, `${PAID_ID}.mp3`), "paid clip");
  fs.writeFileSync(path.join(voice, "manifest.json"), JSON.stringify({ voice: "am_eric", count: 2, ids: [FREE_ID, PAID_ID] }));
  const units = path.join(root, "units.json");
  fs.writeFileSync(units, JSON.stringify([{ id: FREE_ID, text: "Free." }, { id: PAID_ID, text: "Paid.", p: 1 }]));
  return { root, fiq: { demoDir: demo, fullDir: full, voiceDir: voice, unitsFile: units, priceId: FREE_PRICE } };
}

async function start({ site = makeSite(), key } = {}) {
  const stripe = fakeStripe();
  const { app, store, fiqStore } = createApp({
    jwtSecret: SECRET, webhookSecret: WHSEC, priceId: "price_spread", publicUrl: "http://localhost", stripe,
    stripeSecretKey: key, store: openStore(":memory:"), fiqStore: openStore(":memory:"), fiq: site.fiq,
  });
  const server = app.listen(0, "127.0.0.1");
  server.unref(); // a failed test must never leave the runner waiting on an open server
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const f = (p, init = {}) => fetch(base + p, { redirect: "manual", ...init });
  const post = (p, body, cookie) => f(p, { method: "POST", headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  const webhook = (type, object) => {
    const payload = JSON.stringify({ id: "evt_1", object: "event", type, data: { object } });
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: WHSEC });
    return f("/api/stripe/webhook", { method: "POST", headers: { "content-type": "application/json", "stripe-signature": header }, body: payload });
  };
  const cookieOf = (res) => (res.headers.get("set-cookie") || "").split(";")[0];
  /** Buy the game: checkout, "pay", claim. Returns the cookie and the license code. */
  const buy = async () => {
    await post("/football-iq/api/checkout");
    const session = [...stripe.sessions.values()].at(-1);
    session.payment_status = "paid";
    const claim = await post("/football-iq/api/claim", { session_id: session.id });
    const body = await claim.json();
    return { session, cookie: cookieOf(claim), code: body.licenseCode, claim };
  };
  return { stripe, store, fiqStore, f, post, webhook, buy, cookieOf, site, close: () => server.close() };
}

test("the demo is what everyone gets without a purchase", async () => {
  const t = await start();
  const res = await t.f("/football-iq/");
  const html = await res.text();
  assert.equal(res.status, 200);
  assert.match(html, /DEMO BUILD/);
  assert.doesNotMatch(html, /FULL BUILD/);
  assert.match(html, /window\.FIQ_CONFIG=\{"paywall":true,"premium":false,"price":"\$9\.99"\}/);
  assert.equal(res.headers.get("cache-control"), "no-cache");
  assert.match(res.headers.get("vary"), /Cookie/);
  assert.equal((await t.f("/football-iq/assets/demo-only.js")).status, 200);
  assert.equal((await t.f("/football-iq/assets/shared.js")).status, 200);
  // The paid build is not reachable by name.
  assert.equal((await t.f("/football-iq/assets/full-only.js")).status, 404);
  assert.equal(await (await t.f("/football-iq/sw.js")).text(), "// DEMO worker");
  t.close();
});

test("/football-iq redirects to /football-iq/ so relative addresses work", async () => {
  const t = await start();
  const res = await t.f("/football-iq?session_id=cs_test_abc");
  assert.equal(res.status, 301);
  assert.equal(res.headers.get("location"), "/football-iq/?session_id=cs_test_abc");
  t.close();
});

test("checkout sells the Football IQ price with its own product tag", async () => {
  const t = await start();
  const res = await t.post("/football-iq/api/checkout");
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.match(body.url, /checkout\.stripe\.com/);
  const params = t.stripe.created[0];
  assert.equal(params.line_items[0].price, FREE_PRICE);
  assert.deepEqual(params.metadata, { product: "football-iq" });
  assert.equal(params.success_url, "http://localhost/football-iq/?session_id={CHECKOUT_SESSION_ID}");
  assert.equal(params.cancel_url, "http://localhost/football-iq/?canceled=1");
  t.close();
});

test("the live key sells the live price and any other key the test price", async () => {
  const config = require("../lib/football-iq.config.json");
  for (const [key, want] of [["rk_live_abc", config.prices.live], ["sk_live_abc", config.prices.live], ["sk_test_abc", config.prices.test], [undefined, config.prices.test]]) {
    const site = makeSite();
    delete site.fiq.priceId;
    const t = await start({ site, key });
    await t.post("/football-iq/api/checkout");
    assert.equal(t.stripe.created[0].line_items[0].price, want, `key ${key}`);
    t.close();
  }
});

test("buying unlocks the full build, for that browser only", async () => {
  const t = await start();
  const { cookie, code, claim } = await t.buy();
  assert.equal(claim.status, 200);
  assert.match(cookie, /^fiq_session=/);
  assert.match(claim.headers.get("set-cookie"), /Path=\/football-iq/);
  assert.match(claim.headers.get("set-cookie"), /HttpOnly/i);
  assert.match(code, /^[A-Z2-9]{4}(-[A-Z2-9]{4}){3}$/);

  const page = await (await t.f("/football-iq/", { headers: { cookie } })).text();
  assert.match(page, /FULL BUILD/);
  assert.match(page, /"premium":true/);
  assert.equal(await (await t.f("/football-iq/assets/full-only.js", { headers: { cookie } })).text(), "paid lesson content");
  assert.deepEqual(await (await t.f("/football-iq/api/me", { headers: { cookie } })).json(), { premium: true });

  // A different browser is still on the demo.
  assert.match(await (await t.f("/football-iq/")).text(), /DEMO BUILD/);
  assert.equal((await t.f("/football-iq/assets/full-only.js")).status, 404);
  t.close();
});

test("a forged or foreign cookie unlocks nothing", async () => {
  const t = await start();
  const jwt = require("jsonwebtoken");
  const forged = jwt.sign({ pid: 1 }, "wrong-secret".padEnd(40, "y"), { algorithm: "HS256", issuer: "football-iq" });
  assert.deepEqual(await (await t.f("/football-iq/api/me", { headers: { cookie: `fiq_session=${forged}` } })).json(), { premium: false });
  // Right secret but the other game's issuer and cookie name.
  const other = jwt.sign({ pid: 1 }, SECRET, { algorithm: "HS256", issuer: "spread-out" });
  assert.deepEqual(await (await t.f("/football-iq/api/me", { headers: { cookie: `fiq_session=${other}` } })).json(), { premium: false });
  t.close();
});

test("the license code unlocks another device, and only for this game", async () => {
  const t = await start();
  const { code } = await t.buy();
  const ok = await t.post("/football-iq/api/restore", { code: code.toLowerCase().replace(/-/g, " ") });
  assert.equal(ok.status, 200);
  assert.match(t.cookieOf(ok), /^fiq_session=/);
  assert.equal((await t.post("/football-iq/api/restore", { code: "AAAA-AAAA-AAAA-AAAA" })).status, 401);
  // The same purchase number, signed for Spread Out!, is not a Football IQ code.
  const spreadOutCode = makeCode(SECRET, 1, "spread-out");
  assert.equal((await t.post("/football-iq/api/restore", { code: spreadOutCode })).status, 401);
  assert.equal((await t.post("/api/restore", { code })).status, 401);
  t.close();
});

test("a refund locks every device at once", async () => {
  const t = await start();
  const { session, cookie, code } = await t.buy();
  assert.deepEqual(await (await t.f("/football-iq/api/me", { headers: { cookie } })).json(), { premium: true });
  const res = await t.webhook("charge.refunded", { id: "ch_1", payment_intent: session.payment_intent });
  assert.equal(res.status, 200);
  assert.deepEqual(await (await t.f("/football-iq/api/me", { headers: { cookie } })).json(), { premium: false });
  assert.match(await (await t.f("/football-iq/", { headers: { cookie } })).text(), /DEMO BUILD/);
  assert.equal((await t.post("/football-iq/api/restore", { code })).status, 401);
  assert.equal((await t.post("/football-iq/api/claim", { session_id: session.id })).status, 403);
  t.close();
});

test("the shared webhook files each purchase under the right game", async () => {
  const t = await start();
  const fiqSession = { id: "cs_test_wh1", payment_status: "paid", payment_intent: "pi_a", metadata: { product: "football-iq" }, customer_details: { email: "a@example.com" }, amount_total: 999, currency: "usd" };
  const soSession = { id: "cs_test_wh2", payment_status: "paid", payment_intent: "pi_b", metadata: { product: "spread-out" }, customer_details: { email: "b@example.com" }, amount_total: 499, currency: "usd" };
  assert.equal((await t.webhook("checkout.session.completed", fiqSession)).status, 200);
  assert.equal((await t.webhook("checkout.session.completed", soSession)).status, 200);
  assert.equal((await t.webhook("checkout.session.completed", fiqSession)).status, 200); // delivered twice
  assert.equal(t.fiqStore.count(), 1);
  assert.equal(t.store.count(), 1);
  assert.equal(t.fiqStore.bySession("cs_test_wh1").amount, 999);
  assert.equal(t.store.bySession("cs_test_wh2").amount, 499);
  // Refunding one game's payment leaves the other alone.
  await t.webhook("charge.refunded", { id: "ch_1", payment_intent: "pi_a" });
  assert.ok(t.fiqStore.bySession("cs_test_wh1").revoked_at);
  assert.equal(t.store.bySession("cs_test_wh2").revoked_at, null);
  // A bad signature is refused, as before.
  const bad = await t.f("/api/stripe/webhook", { method: "POST", headers: { "content-type": "application/json", "stripe-signature": "t=1,v1=bad" }, body: "{}" });
  assert.equal(bad.status, 400);
  t.close();
});

test("claim refuses a payment that is not Football IQ's", async () => {
  const t = await start();
  t.stripe.sessions.set("cs_test_other1", { id: "cs_test_other1", payment_status: "paid", payment_intent: "pi_o", metadata: { product: "spread-out" }, amount_total: 499, currency: "usd" });
  assert.equal((await t.post("/football-iq/api/claim", { session_id: "cs_test_other1" })).status, 400);
  t.stripe.sessions.set("cs_test_unpaid1", { id: "cs_test_unpaid1", payment_status: "unpaid", metadata: { product: "football-iq" } });
  assert.equal((await t.post("/football-iq/api/claim", { session_id: "cs_test_unpaid1" })).status, 402);
  assert.equal((await t.post("/football-iq/api/claim", { session_id: "../etc/passwd" })).status, 400);
  t.close();
});

test("Spread Out!'s purchase does not unlock Football IQ, and the reverse", async () => {
  const t = await start();
  // Buy Spread Out! the way its own tests do.
  await t.post("/api/checkout");
  const so = [...t.stripe.sessions.values()].at(-1);
  so.payment_status = "paid";
  const claim = await t.post("/api/claim", { session_id: so.id });
  const soCookie = t.cookieOf(claim);
  assert.match(soCookie, /^so_session=/);
  assert.deepEqual(await (await t.f("/football-iq/api/me", { headers: { cookie: soCookie } })).json(), { premium: false });
  const { cookie } = await t.buy();
  assert.deepEqual(await (await t.f("/api/me", { headers: { cookie } })).json(), { premium: false });
  t.close();
});

test("voice clips: free ones for everyone, paid ones only for buyers", async () => {
  const t = await start();
  const manifest = await (await t.f("/football-iq/voice/manifest.json")).json();
  assert.deepEqual(manifest.ids, [FREE_ID]);
  assert.equal(manifest.count, 1);
  const free = await t.f(`/football-iq/voice/${FREE_ID}.mp3`);
  assert.equal(free.status, 200);
  assert.match(free.headers.get("cache-control"), /immutable/);
  assert.equal((await t.f(`/football-iq/voice/${PAID_ID}.mp3`)).status, 401);

  const { cookie } = await t.buy();
  const all = await (await t.f("/football-iq/voice/manifest.json", { headers: { cookie } })).json();
  assert.deepEqual(all.ids, [FREE_ID, PAID_ID]);
  assert.equal(await (await t.f(`/football-iq/voice/${PAID_ID}.mp3`, { headers: { cookie } })).text(), "paid clip");
  const paid = await t.f(`/football-iq/voice/${PAID_ID}.mp3`, { headers: { cookie } });
  assert.match(paid.headers.get("cache-control"), /private/);

  // Only clip-shaped names are served, and nothing outside the voice folder.
  for (const bad of ["manifest.json.bak", "..%2Funits.json", "%2e%2e/units.json", "cccccccccccccc.mp3", "..%2F..%2Fserver.js", `${FREE_ID}.mp3%2F..%2F..%2Fserver.js`]) {
    for (const headers of [{}, { cookie }]) {
      const res = await t.f(`/football-iq/voice/${bad}`, { headers });
      assert.notEqual(res.status, 200, bad);
      assert.doesNotMatch(await res.text(), /Free\.|Paid\./, bad); // nothing from units.json
    }
  }
  t.close();
});

test("before the game is built the page says so and Spread Out! still works", async () => {
  const t = await start({ site: makeSite({ withBuilds: false }) });
  const res = await t.f("/football-iq/");
  assert.equal(res.status, 503);
  assert.match(await res.text(), /getting ready/);
  // The other game on the same server is unaffected.
  assert.equal((await t.f("/api/me")).status, 200);
  assert.equal((await t.f("/")).status, 200);
  t.close();
});

test("hardening headers cover the new paths too", async () => {
  const t = await start();
  const res = await t.f("/football-iq/");
  assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  assert.match(res.headers.get("content-security-policy"), /default-src 'self'/);
  t.close();
});
