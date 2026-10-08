# Spread Out! server: the full-game unlock

This small Node.js server does three jobs:

1. **Serves the game** at `/` with the premium parts cut out.
2. **Sells the one-time unlock** through [Stripe Checkout](https://stripe.com/payments/checkout)
   and records paid purchases from Stripe's webhook.
3. **Gates the premium files** (`premium/premium.js`, the Coach Eric voice
   clips) behind a signed, httpOnly session cookie that is checked on every
   request against the purchase record.

The free copy on GitHub Pages does not use this server and stays exactly as it
is. This server is for a paid copy hosted on its own address.

## What is free and what is paid

| Free demo (no account, nothing collected) | Full game (one-time purchase) |
| --- | --- |
| Get Open! levels 1 to 2 | Unlimited levels in Get Open! and Pick the Pass! |
| Pick the Pass! first 6 rounds | Where Do I Stand? |
| Device voice for the coach | Mini Match! and the match journey |
| | Coach Eric's recorded voice |
| | Coach Corner (practice plan, diagrams, print) |

The demo limits live in `createApp()` (`demo`) and are sent to the browser as
part of the config. The premium split is decided by two comment markers in
`spread-out/index.html`: everything between `/*PREMIUM-START*/` and
`/*PREMIUM-END*/` is removed from the free page and served as
`premium/premium.js` only to a verified buyer.

## How the security works (and what it does not do)

**Nothing in the browser is trusted.** A player can set
`localStorage.isPremium = true`, edit `paywall.premium`, or delete the demo
counters, and nothing happens, because the premium modes are **not in the page**.
They exist only in `premium/premium.js`, and the server sends that file only
when the request carries a valid cookie. The same gate covers the voice clips.

- **Cookie:** `so_session`, a JWT (HS256, signed with `JWT_SECRET`) holding the
  purchase id, 1 year, `httpOnly` (scripts cannot read it), `Secure` on https,
  `SameSite=Lax`. On every premium request the server verifies the signature
  **and** looks the purchase up, so a refund locks every device at once.
- **Webhook:** `POST /api/stripe/webhook` reads the raw body and verifies
  Stripe's signature before trusting anything. Delivered twice? Still one row.
- **Claim:** when Stripe sends the buyer back to `/?session_id=...`, the server
  asks Stripe directly whether that session is paid and belongs to this
  product. The id in the URL is never trusted on its own.
- **License code:** `XXXX-XXXX-XXXX-XXXX` shown once after purchase, for
  unlocking a second device. It is the purchase id plus an HMAC under
  `JWT_SECRET`, so no list of codes is stored and a copied database leaks none.
  Restore attempts are rate limited (12 per 15 minutes per IP).
- **Transport:** HTTPS is the host's job (Render, Fly, Railway all terminate
  TLS). In production the server redirects http to https, sets HSTS, and sends
  a Content-Security-Policy plus the usual hardening headers.

What it does **not** do: stop a paying customer from saving the premium script
after they have bought it. No web game can prevent that. The goal is that
**non-payers cannot get the premium content**, and that holds as long as the
premium content is not published anywhere else.

> **Important:** this repository is public and the free copy of the game on
> GitHub Pages contains the whole game. For the paywall to protect anything,
> that free copy must become the demo (or be taken down) and the repository
> made private. See "Going live" below.

## Setup, step by step

### 1. Install

```bash
cd spread-out-server
npm install            # express, stripe, jsonwebtoken, cookie-parser
cp .env.example .env   # then fill it in (next steps)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # paste as JWT_SECRET
```

Node 22.13 or newer (it uses Node's built-in SQLite, so nothing to compile).

### 2. Stripe (test mode first)

1. Dashboard → **Product catalog** → **Add product**: "Spread Out! full game",
   one-time price (for example $4.99). Copy the price id (`price_...`) into
   `STRIPE_PRICE_ID`.
2. Dashboard → **Developers → API keys**: copy the **secret** test key
   (`sk_test_...`) into `STRIPE_SECRET_KEY`. The publishable key is not needed
   (Checkout is a redirect, no Stripe JavaScript in the game).
3. Webhook secret: for local testing it comes from the Stripe CLI (step 4);
   for production from Dashboard → **Developers → Webhooks → Add endpoint**
   with the URL `https://your-domain/api/stripe/webhook` and the events
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `charge.refunded`.

### 3. Run it

```bash
node --env-file=.env server.js     # or: npm run dev   (restarts on file changes)
```

Open http://localhost:3000. You should see the game with 🔒 on Find Your Spot,
Mini Match and Coach Corner and an **Unlock the full game** button.

### 4. Test the whole purchase locally (no real money)

Install the [Stripe CLI](https://stripe.com/docs/stripe-cli), then in a second
terminal:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

It prints `whsec_...`: put that in `.env` as `STRIPE_WEBHOOK_SECRET` and restart
the server. Then in the browser:

1. Tap **Unlock the full game → Buy now**. You land on Stripe's test checkout.
2. Pay with the test card `4242 4242 4242 4242`, any future date, any CVC.
3. Stripe sends you back to the game: the **Full game unlocked** panel shows
   your code, the locks disappear, and Mini Match plays. The `stripe listen`
   terminal shows the webhook arriving with a 200.
4. Open a private window, tap **Unlock → Already bought it?**, type the code:
   it unlocks too.
5. Refund the payment in the Stripe dashboard (test mode): reload either
   window and the game is locked again.

Automated checks of the same flow, with Stripe stood in by a fake client but
real webhook signatures:

```bash
npm test
```

### 5. Going live

1. Pick a host that runs Node and gives you HTTPS and a persistent disk:
   Render (web service + disk), Fly.io (volume), or Railway (volume). Point the
   disk at `DB_PATH` (for example `/data/purchases.sqlite`). Without a
   persistent disk, every redeploy forgets who bought the game.
2. Set the environment variables from `.env.example` on the host with the
   **live** Stripe keys, `NODE_ENV=production`, and `PUBLIC_URL=https://...`.
3. Add the production webhook endpoint in Stripe (step 2.3) and set its
   signing secret.
4. Make the free GitHub Pages copy the demo: either stop publishing
   `spread-out/` there (remove it from `.github/workflows/deploy-pages.yml`) and
   link to the new address instead, or keep a landing page that points to the
   paid game. Then make the repository private so the premium code is not
   readable on GitHub.
5. Buy it once yourself with a real card, then refund it, to see the live
   webhook and the lock/unlock both work.

## Endpoints

| Method and path | What it does |
| --- | --- |
| `GET /` | The game with premium parts removed and the paywall config injected |
| `GET /premium/premium.js` | The premium modes. Needs the cookie (401 otherwise) |
| `GET /voice/...` | Coach Eric's clips. Needs the cookie |
| `POST /api/checkout` | Creates a Stripe Checkout Session, returns its URL |
| `POST /api/stripe/webhook` | Stripe calls this; records purchases and refunds |
| `POST /api/claim` `{session_id}` | After checkout: confirms with Stripe, sets the cookie, returns the license code |
| `POST /api/restore` `{code}` | Unlock another device with the code |
| `GET /api/me` | `{premium: true|false}` for this browser |
| `POST /api/logout` | Clears the cookie |

## Files

| File | What it is |
| --- | --- |
| `server.js` | The Express app: routes, cookie, gating, Stripe calls |
| `lib/shell.js` | Cuts the premium regions out of `index.html` and injects the config |
| `lib/store.js` | The purchase table (SQLite, one file) |
| `lib/license.js` | Makes and checks the license codes |
| `test/server.test.js` | The automated purchase-flow tests |

## Support jobs

- **Lost code:** find the purchase by email in the database, then
  `node -e "console.log(require('./lib/license').makeCode(process.env.JWT_SECRET, ID))"`
  with the row id, and send it to the buyer.
- **Refund outside Stripe's dashboard:** refunds made in Stripe lock the game
  automatically through the webhook.
