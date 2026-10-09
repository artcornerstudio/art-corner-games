/**
 * Runs the real server on this computer with a PRETEND Stripe, so the whole purchase can be tried
 * in a browser without real money or a Stripe account:
 *
 *   node test/dev-fake-stripe.js            # then open http://127.0.0.1:3100/football-iq/
 *
 * "Checkout" is a plain page with a Pay button. Pay marks the session paid and sends the browser
 * back the way Stripe does. /__pretend-refund/<session id> sends a real, signed refund webhook.
 * Binds to 127.0.0.1 only. It never talks to Stripe and is not used in production.
 *
 * Environment: FIQ_DEMO_DIR, FIQ_FULL_DIR (the two builds), PORT (default 3100).
 */
const Stripe = require("stripe");
const { createApp } = require("../server");
const { openStore } = require("../lib/store");

const PORT = Number(process.env.PORT ?? 3100);
const PUBLIC = `http://127.0.0.1:${PORT}`;
const WHSEC = "whsec_pretend";
const sessions = new Map();
let n = 0;

const stripe = {
  checkout: {
    sessions: {
      async create(params) {
        const id = `cs_test_pretend${++n}`;
        const session = { id, params, url: `${PUBLIC}/__pretend-checkout/${id}`, payment_status: "unpaid", payment_intent: `pi_pretend${n}`, metadata: params.metadata, customer_details: { email: `parent${n}@example.com` }, amount_total: 999, currency: "usd" };
        sessions.set(id, session);
        return session;
      },
      async retrieve(id) {
        const s = sessions.get(id);
        if (!s) throw new Error("No such checkout.session");
        return s;
      },
    },
  },
  webhooks: new Stripe("sk_test_fake").webhooks,
};

const { app } = createApp({
  jwtSecret: "pretend-secret-".padEnd(48, "x"),
  webhookSecret: WHSEC,
  priceId: "price_pretend",
  publicUrl: PUBLIC,
  stripe,
  store: openStore(":memory:"),
  fiqStore: openStore(":memory:"),
  fiq: { priceLabel: "$9.99" },
});

app.get("/__pretend-checkout/:id", (req, res) => {
  const s = sessions.get(req.params.id);
  if (!s) return res.status(404).send("no such session");
  res.type("html").send(`<!doctype html><meta name=viewport content="width=device-width"><title>Pretend checkout</title>
    <body style="font:18px system-ui;max-width:28em;margin:2em auto;padding:0 1em">
    <h1>Pretend Stripe checkout</h1><p>${s.metadata.product}: <strong>$9.99</strong></p>
    <form method=post action="/__pretend-checkout/${s.id}/pay"><button style="font:inherit;padding:.6em 1.2em" id=pay>Pay $9.99</button></form>
    <p><a id=cancel href="${s.params.cancel_url}">Cancel</a></p>`);
});
app.post("/__pretend-checkout/:id/pay", (req, res) => {
  const s = sessions.get(req.params.id);
  if (!s) return res.status(404).send("no such session");
  s.payment_status = "paid";
  res.redirect(303, s.params.success_url.replace("{CHECKOUT_SESSION_ID}", s.id));
});
app.get("/__pretend-refund/:id", async (req, res) => {
  const s = sessions.get(req.params.id);
  if (!s) return res.status(404).send("no such session");
  const payload = JSON.stringify({ id: "evt_pretend", object: "event", type: "charge.refunded", data: { object: { id: "ch_pretend", payment_intent: s.payment_intent } } });
  const header = Stripe.webhooks.generateTestHeaderString({ payload, secret: WHSEC });
  const r = await fetch(`${PUBLIC}/api/stripe/webhook`, { method: "POST", headers: { "content-type": "application/json", "stripe-signature": header }, body: payload });
  res.json({ refunded: r.status === 200 });
});
app.get("/__pretend-sessions", (req, res) => res.json([...sessions.values()].map((s) => ({ id: s.id, paid: s.payment_status === "paid", product: s.metadata.product }))));

app.listen(PORT, "127.0.0.1", () => console.log(`Server with a pretend Stripe on ${PUBLIC}`));
