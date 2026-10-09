/**
 * Football IQ: Flag and Field, the second game this server sells.
 *
 * It lives under /football-iq/ so it can share the address, the HTTPS front
 * door, the Stripe webhook, and the signing secret with Spread Out!, and so
 * that Spread Out! itself is not touched. It has its own purchase table,
 * session cookie, and license codes.
 *
 * Two builds of the app sit on disk (npm run build:editions in football-iq/):
 *   dist-demo  the free demo. The paid lessons, situations, and plays are NOT in it.
 *   dist-full  the whole game.
 * A browser with a valid purchase is served dist-full; everyone else gets
 * dist-demo. Nothing the browser says about itself is believed, and the paid
 * content cannot be unlocked by editing the page because it is not in the page.
 *
 * Coach Eric's clips: the clips for free content are free; the clips that read
 * paid lessons are served only to buyers.
 */
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const jwt = require("jsonwebtoken");
const { makeCode, parseCode } = require("./license");

const config = require("./football-iq.config.json");

const PRODUCT = config.product;
const COOKIE = "fiq_session";
const BASE = "/football-iq";
const CLIP = /^[0-9a-f]{14}\.mp3$/;

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

/** Reads a file again only when it changes on disk (the build can be replaced while the server runs). */
function cachedFile(file) {
  let mtime = 0;
  let text = null;
  return () => {
    let st;
    try {
      st = fs.statSync(file);
    } catch {
      return null;
    }
    if (st.mtimeMs !== mtime || text === null) {
      text = fs.readFileSync(file, "utf8");
      mtime = st.mtimeMs;
    }
    return text;
  };
}

function createFootballIq({ cfg, stripe, store, limiter, secureCookie }) {
  const repoRoot = path.join(__dirname, "..", "..");
  const env = process.env;
  const dirs = {
    demo: cfg.fiq?.demoDir ?? env.FIQ_DEMO_DIR ?? path.join(repoRoot, "football-iq", "dist-demo"),
    full: cfg.fiq?.fullDir ?? env.FIQ_FULL_DIR ?? path.join(repoRoot, "football-iq", "dist-full"),
    voice: cfg.fiq?.voiceDir ?? env.FIQ_VOICE_DIR ?? path.join(repoRoot, "football-iq", "public", "voice"),
    units: cfg.fiq?.unitsFile ?? env.FIQ_UNITS_FILE ?? path.join(repoRoot, "football-iq", "voice", "units.json"),
  };
  const priceLabel = cfg.fiq?.priceLabel ?? env.FIQ_PRICE_LABEL ?? config.priceLabel;
  // A live key sells the live price, anything else the test price. FIQ_PRICE_ID overrides both.
  const key = cfg.stripeSecretKey ?? "";
  const priceId = cfg.fiq?.priceId ?? env.FIQ_PRICE_ID ?? (/^(sk|rk)_live_/.test(key) ? config.prices.live : config.prices.test);

  // ---- entitlement
  function setSession(res, purchaseId) {
    const token = jwt.sign({ pid: purchaseId }, cfg.jwtSecret, { algorithm: "HS256", expiresIn: `${cfg.cookieDays}d`, issuer: PRODUCT });
    res.cookie(COOKIE, token, { httpOnly: true, secure: secureCookie, sameSite: "lax", path: BASE, maxAge: cfg.cookieDays * 864e5 });
  }
  function clearSession(res) {
    res.clearCookie(COOKIE, { httpOnly: true, secure: secureCookie, sameSite: "lax", path: BASE });
  }
  /** The live purchase behind the cookie, or null. Looks in the database every time, so a refund locks at once. */
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

  // ---- the two builds
  const html = { demo: cachedFile(path.join(dirs.demo, "index.html")), full: cachedFile(path.join(dirs.full, "index.html")) };
  const serve = {
    demo: express.static(dirs.demo, { index: false, dotfiles: "ignore", fallthrough: true, setHeaders: staticHeaders }),
    full: express.static(dirs.full, { index: false, dotfiles: "ignore", fallthrough: true, setHeaders: staticHeaders }),
  };
  function staticHeaders(res, file) {
    const name = path.basename(file);
    if (name === "sw.js" || name === "registerSW.js" || name.endsWith(".webmanifest") || name === "privacy.html") res.set("Cache-Control", "no-cache");
    else if (file.includes(`${path.sep}assets${path.sep}`)) res.set("Cache-Control", "public, max-age=31536000, immutable");
    res.set("Vary", "Cookie");
  }
  /** The page, with the settings the app reads at startup. */
  function pageFor(edition, premium) {
    const source = html[edition]();
    if (source === null) return null;
    const settings = JSON.stringify({ paywall: true, premium, price: priceLabel }).replace(/</g, "\\u003c");
    return source.replace("</head>", `<script>window.FIQ_CONFIG=${settings};</script></head>`);
  }

  // ---- Coach Eric's clips
  const unitsFile = cachedFile(dirs.units);
  let freeIds = { stamp: null, set: new Set() };
  function freeClipIds() {
    const text = unitsFile();
    if (text !== freeIds.stamp) {
      let units = [];
      try {
        units = JSON.parse(text ?? "[]");
      } catch {
        units = [];
      }
      freeIds = { stamp: text, set: new Set(units.filter((u) => !u.p).map((u) => u.id)) };
    }
    return freeIds.set;
  }
  const manifestFile = cachedFile(path.join(dirs.voice, "manifest.json"));

  const router = express.Router();

  router.use((req, res, next) => {
    res.set("Cache-Control", "no-store"); // each route below sets what it needs
    next();
  });

  // A trailing slash keeps every relative address in the app working.
  router.get(["", "/"], (req, res, next) => {
    if (!req.originalUrl.split("?")[0].endsWith("/")) {
      const query = req.originalUrl.includes("?") ? req.originalUrl.slice(req.originalUrl.indexOf("?")) : "";
      return res.redirect(301, `${BASE}/${query}`);
    }
    return next();
  });

  const sendPage = (req, res) => {
    const premium = !!purchaseOf(req);
    const page = pageFor(premium ? "full" : "demo", premium);
    res.set({ "Cache-Control": "no-cache", Vary: "Cookie" });
    if (page === null) {
      return res.status(503).type("html").send("<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width'><title>Football IQ</title><body style='font:18px system-ui;max-width:32em;margin:3em auto;padding:0 1em'><h1>Football IQ is getting ready</h1><p>The game is being set up. Please try again in a minute.</p>");
    }
    return res.type("html").send(page);
  };
  router.get(["/", "/index.html"], sendPage);

  // ---- purchase flow
  router.use(express.json({ limit: "10kb" }));

  router.post("/api/checkout", limiter(30, 60 * 60 * 1000), async (req, res) => {
    try {
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${cfg.publicUrl}${BASE}/?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${cfg.publicUrl}${BASE}/?canceled=1`,
        metadata: { product: PRODUCT },
        allow_promotion_codes: true,
      });
      res.json({ ok: true, url: session.url });
    } catch (err) {
      console.error("football-iq checkout failed:", err.message);
      res.status(502).json({ ok: false, error: "Checkout is not available right now." });
    }
  });

  router.post("/api/claim", limiter(30, 15 * 60 * 1000), async (req, res) => {
    const id = typeof req.body?.session_id === "string" ? req.body.session_id : "";
    if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return res.status(400).json({ ok: false, error: "bad session id" });
    try {
      const session = await stripe.checkout.sessions.retrieve(id);
      if (session.metadata?.product !== PRODUCT) return res.status(400).json({ ok: false, error: "not a Football IQ purchase" });
      if (session.payment_status !== "paid") return res.status(402).json({ ok: false, error: "payment not completed" });
      const row = store.insertFromSession(session);
      if (row.revoked_at) return res.status(403).json({ ok: false, error: "this purchase was refunded" });
      setSession(res, row.id);
      res.json({ ok: true, licenseCode: makeCode(cfg.jwtSecret, row.id, PRODUCT) });
    } catch (err) {
      console.error("football-iq claim failed:", err.message);
      res.status(502).json({ ok: false, error: "could not confirm the payment" });
    }
  });

  router.post("/api/restore", limiter(12, 15 * 60 * 1000), (req, res) => {
    const id = parseCode(cfg.jwtSecret, req.body?.code, PRODUCT);
    const row = id ? store.byId(id) : null;
    if (!row || row.revoked_at) return res.status(401).json({ ok: false, error: "That code did not work. Check it and try again." });
    setSession(res, row.id);
    res.json({ ok: true });
  });

  router.get("/api/me", (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({ premium: !!purchaseOf(req) });
  });

  router.post("/api/logout", (req, res) => {
    clearSession(res);
    res.json({ ok: true });
  });

  // ---- clips
  router.get("/voice/manifest.json", (req, res) => {
    const text = manifestFile();
    if (text === null) return res.status(404).json({ ok: false });
    const manifest = JSON.parse(text);
    if (!purchaseOf(req)) {
      const free = freeClipIds();
      manifest.ids = manifest.ids.filter((id) => free.has(id));
      manifest.count = manifest.ids.length;
    }
    res.set({ "Cache-Control": "no-cache", Vary: "Cookie" });
    res.json(manifest);
  });

  router.get("/voice/:file", (req, res) => {
    const file = req.params.file;
    if (!CLIP.test(file)) return res.status(404).end();
    const free = freeClipIds().has(file.slice(0, 14));
    if (!free && !purchaseOf(req)) return res.status(401).json({ ok: false, error: "unlock required" });
    res.set("Cache-Control", free ? "public, max-age=31536000, immutable" : "private, max-age=31536000, immutable");
    res.set("Vary", "Cookie");
    res.sendFile(file, { root: dirs.voice, dotfiles: "deny" }, (err) => {
      if (err && !res.headersSent) res.status(err.statusCode === 404 ? 404 : 500).end();
    });
  });

  // ---- everything else is a file of the build this browser is entitled to
  router.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    const premium = !!purchaseOf(req);
    (premium ? serve.full : serve.demo)(req, res, next);
  });
  router.use((req, res) => res.status(404).type("text").send("Not found"));

  return {
    router,
    purchaseOf,
    /** Record purchases and refunds from Stripe's signed webhook. Returns true when the event was this game's. */
    handleEvent(event) {
      const obj = event.data.object;
      switch (event.type) {
        case "checkout.session.completed":
        case "checkout.session.async_payment_succeeded":
          if (obj.payment_status === "paid" && obj.metadata?.product === PRODUCT) {
            store.insertFromSession(obj);
            return true;
          }
          return false;
        case "charge.refunded":
          if (obj.payment_intent) return store.revokeByPaymentIntent(typeof obj.payment_intent === "string" ? obj.payment_intent : obj.payment_intent.id) > 0;
          return false;
        default:
          return false;
      }
    },
    info: { priceId, priceLabel, dirs },
  };
}

module.exports = { createFootballIq, PRODUCT, COOKIE, BASE };
