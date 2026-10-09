/**
 * Spread Out! server: serves the game, sells the one-time unlock through
 * Stripe Checkout, and gates the premium files behind a signed session cookie.
 *
 *   npm start                         (reads .env when started with --env-file=.env)
 *
 * How entitlement works (nothing in the browser is trusted):
 *   1. "Buy now" -> POST /api/checkout -> Stripe Checkout (Stripe's page, Stripe's HTTPS).
 *   2. Stripe calls POST /api/stripe/webhook (signature-checked) -> the purchase is recorded.
 *   3. Stripe sends the buyer back to /?session_id=... -> POST /api/claim asks Stripe directly
 *      whether that session is paid -> a signed, httpOnly cookie is set and the license code shown.
 *   4. Every premium file (premium/premium.js, voice clips) is served only when the cookie
 *      verifies AND the purchase is still not refunded. Editing localStorage changes nothing,
 *      because the premium code is simply not in the free page.
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const Stripe = require("stripe");
const { openStore } = require("./lib/store");
const { splitGame } = require("./lib/shell");
const { makeCode, parseCode } = require("./lib/license");

const COOKIE = "so_session";
const PRODUCT = "spread-out";

function limiter(max, windowMs) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    const rec = hits.get(key) ?? { n: 0, reset: now + windowMs };
    if (now > rec.reset) { rec.n = 0; rec.reset = now + windowMs; }
    rec.n++;
    hits.set(key, rec);
    if (hits.size > 10000) for (const [k, v] of hits) if (now > v.reset) hits.delete(k);
    if (rec.n > max) return res.status(429).json({ ok: false, error: "Too many tries. Please wait a few minutes." });
    next();
  };
}

function createApp(opts = {}) {
  const env = process.env;
  const cfg = {
    // Render sets RENDER_EXTERNAL_URL to the service's https address, so PUBLIC_URL can stay unset there.
    publicUrl: (opts.publicUrl ?? (env.PUBLIC_URL || env.RENDER_EXTERNAL_URL || "http://localhost:3000")).replace(/\/$/, ""),
    jwtSecret: opts.jwtSecret ?? env.JWT_SECRET,
    stripeSecretKey: opts.stripeSecretKey ?? env.STRIPE_SECRET_KEY,
    webhookSecret: opts.webhookSecret ?? env.STRIPE_WEBHOOK_SECRET,
    priceId: opts.priceId ?? env.STRIPE_PRICE_ID,
    priceLabel: opts.priceLabel ?? env.PRICE_LABEL ?? "$4.99",
    gameDir: opts.gameDir ?? path.join(__dirname, "..", "spread-out"),
    dbPath: opts.dbPath ?? env.DB_PATH ?? path.join(__dirname, "data", "purchases.sqlite"),
    production: opts.production ?? env.NODE_ENV === "production",
    demo: opts.demo ?? { getopenLevels: 2, pickpassRounds: 6 },
    cookieDays: 365,
  };
  if (!cfg.jwtSecret || cfg.jwtSecret.length < 32) throw new Error("JWT_SECRET must be set to 32+ random characters");
  if (!opts.stripe && !cfg.stripeSecretKey) throw new Error("STRIPE_SECRET_KEY is not set");
  if (!cfg.webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  if (!cfg.priceId) throw new Error("STRIPE_PRICE_ID is not set");
  if (cfg.production && !cfg.publicUrl.startsWith("https://")) throw new Error("PUBLIC_URL must be https:// in production");

  const stripe = opts.stripe ?? new Stripe(cfg.stripeSecretKey);
  const store = opts.store ?? openStore(cfg.dbPath);
  const game = splitGame(fs.readFileSync(path.join(cfg.gameDir, "index.html"), "utf8"), {
    paywall: true,
    price: cfg.priceLabel,
    demo: cfg.demo,
  });
  const secureCookie = cfg.publicUrl.startsWith("https://");

  // ---- session cookie helpers
  function setSession(res, purchaseId) {
    const token = jwt.sign({ pid: purchaseId }, cfg.jwtSecret, { algorithm: "HS256", expiresIn: `${cfg.cookieDays}d`, issuer: PRODUCT });
    res.cookie(COOKIE, token, { httpOnly: true, secure: secureCookie, sameSite: "lax", path: "/", maxAge: cfg.cookieDays * 864e5 });
  }
  function clearSession(res) {
    res.clearCookie(COOKIE, { httpOnly: true, secure: secureCookie, sameSite: "lax", path: "/" });
  }
  /** The live purchase behind the request's cookie, or null. Checks the database every time so refunds take effect at once. */
  function purchaseOf(req) {
    const token = req.cookies?.[COOKIE];
    if (!token) return null;
    try {
      const { pid } = jwt.verify(token, cfg.jwtSecret, { algorithms: ["HS256"], issuer: PRODUCT });
      const row = store.byId(pid);
      return row && !row.revoked_at ? row : null;
    } catch {
      return null;
    }
  }
  function requirePremium(req, res, next) {
    if (!purchaseOf(req)) return res.status(401).json({ ok: false, error: "unlock required" });
    next();
  }

  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1); // Render / Fly / Railway sit in front; needed for req.ip and req.protocol

  app.use((req, res, next) => {
    if (cfg.production && req.protocol !== "https") return res.redirect(301, cfg.publicUrl + req.originalUrl);
    res.set({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
      "X-Frame-Options": "SAMEORIGIN",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; " +
        "media-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'",
    });
    if (cfg.production) res.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    next();
  });

  // ---- Stripe webhook: raw body, before any JSON parsing, signature verified
  app.post("/api/stripe/webhook", express.raw({ type: "*/*", limit: "1mb" }), (req, res) => {
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, req.headers["stripe-signature"], cfg.webhookSecret);
    } catch (err) {
      return res.status(400).send(`Webhook signature failed: ${err.message}`);
    }
    const obj = event.data.object;
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        if (obj.payment_status === "paid" && obj.metadata?.product === PRODUCT) store.insertFromSession(obj);
        break;
      case "charge.refunded":
        if (obj.payment_intent) store.revokeByPaymentIntent(typeof obj.payment_intent === "string" ? obj.payment_intent : obj.payment_intent.id);
        break;
      default:
        break; // other events are fine to ignore; Stripe only needs the 200
    }
    res.json({ received: true });
  });

  app.use(cookieParser());
  app.use(express.json({ limit: "10kb" }));

  // ---- the game itself
  const sendShell = (req, res) => {
    res.set("Cache-Control", "no-cache");
    res.type("html").send(game.free);
  };
  app.get("/", sendShell);
  app.get("/index.html", sendShell);

  app.get("/premium/premium.js", requirePremium, (req, res) => {
    res.set("Cache-Control", "private, no-store");
    res.type("application/javascript").send(game.premium);
  });
  app.use("/voice", requirePremium, (req, res, next) => {
    res.set("Cache-Control", "private, max-age=31536000"); // clip names are content hashes
    next();
  });
  app.use(express.static(cfg.gameDir, { index: false, dotfiles: "ignore", setHeaders: (res, file) => {
    if (file.endsWith("sw.js") || file.endsWith("manifest.json")) res.set("Cache-Control", "no-cache");
  } }));

  // ---- purchase flow
  app.post("/api/checkout", limiter(30, 60 * 60 * 1000), async (req, res) => {
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{ price: cfg.priceId, quantity: 1 }],
        success_url: `${cfg.publicUrl}/?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${cfg.publicUrl}/?canceled=1`,
        metadata: { product: PRODUCT },
        allow_promotion_codes: true,
      });
      res.json({ ok: true, url: session.url });
    } catch (err) {
      console.error("checkout session failed:", err.message);
      res.status(502).json({ ok: false, error: "Checkout is not available right now." });
    }
  });

  app.post("/api/claim", limiter(30, 15 * 60 * 1000), async (req, res) => {
    const id = typeof req.body?.session_id === "string" ? req.body.session_id : "";
    if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return res.status(400).json({ ok: false, error: "bad session id" });
    try {
      const session = await stripe.checkout.sessions.retrieve(id);
      if (session.metadata?.product !== PRODUCT) return res.status(400).json({ ok: false, error: "not a Spread Out! purchase" });
      if (session.payment_status !== "paid") return res.status(402).json({ ok: false, error: "payment not completed" });
      const row = store.insertFromSession(session);
      if (row.revoked_at) return res.status(403).json({ ok: false, error: "this purchase was refunded" });
      setSession(res, row.id);
      res.json({ ok: true, licenseCode: makeCode(cfg.jwtSecret, row.id) });
    } catch (err) {
      console.error("claim failed:", err.message);
      res.status(502).json({ ok: false, error: "could not confirm the payment" });
    }
  });

  app.post("/api/restore", limiter(12, 15 * 60 * 1000), (req, res) => {
    const id = parseCode(cfg.jwtSecret, req.body?.code);
    const row = id ? store.byId(id) : null;
    if (!row || row.revoked_at) return res.status(401).json({ ok: false, error: "That code did not work. Check it and try again." });
    setSession(res, row.id);
    res.json({ ok: true });
  });

  app.get("/api/me", (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ premium: !!purchaseOf(req) });
  });

  app.post("/api/logout", (req, res) => {
    clearSession(res);
    res.json({ ok: true });
  });

  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    if (err.type === "entity.parse.failed" || err.type === "entity.too.large") return res.status(400).json({ ok: false, error: "bad request" });
    console.error(err);
    res.status(500).json({ ok: false, error: "server error" });
  });

  return { app, cfg, store, stripe };
}

if (require.main === module) {
  const { app, cfg } = createApp();
  const port = Number(process.env.PORT ?? 3000);
  // HOST=127.0.0.1 keeps the app reachable only through the HTTPS proxy in front of it (the VPS installer sets this).
  const host = process.env.HOST || undefined;
  app.listen(port, host, () => console.log(`Spread Out! server on ${host ?? "all interfaces"}:${port} (public URL ${cfg.publicUrl}, ${cfg.production ? "production" : "development"})`));
}

module.exports = { createApp, COOKIE, PRODUCT };
