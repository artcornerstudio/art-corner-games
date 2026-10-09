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

### 5. Hosting it on your own VPS (Hostinger), test mode first

`deploy/install.sh` turns a fresh Ubuntu or Debian VPS into the game server in
one command. It installs Node.js 22 and Caddy (which gets and renews the HTTPS
certificate by itself), copies only the `spread-out` folders of this repository
to `/opt/spread-out/app`, asks for the Stripe keys once and keeps them in
`/etc/spread-out/env` (root only), generates `JWT_SECRET` once and never
changes it, stores purchases in `/var/lib/spread-out/purchases.sqlite`, and
runs everything as a locked-down service called `spread-out` that starts on
boot. The app listens only on 127.0.0.1; Caddy is the only way in.

1. **Point the address at the VPS.** Hostinger hPanel → **Domains** →
   artcornerstudio.cloud → **DNS / Nameservers** → **DNS records** → add:
   Type `A`, Name `play`, Points to *your VPS IP address* (hPanel → **VPS** →
   Overview shows it), TTL default. Leave other records alone.
2. **Open a terminal on the VPS.** hPanel → **VPS** → **Browser terminal**
   (or `ssh root@YOUR-VPS-IP` with the root password from the VPS settings).
3. **Run the installer** and paste the Stripe keys when it asks (the secret
   ones don't show while you paste; that's normal):

   ```bash
   curl -fsSL https://raw.githubusercontent.com/artcornerstudio/art-corner-games/main/spread-out-server/deploy/install.sh | bash -s -- play.artcornerstudio.cloud
   ```

   - Stripe secret key: Dashboard → Developers → API keys → Secret key (test
     mode, `sk_test_...`).
   - Webhook signing secret: Dashboard → Developers → Webhooks → the endpoint
     `https://play.artcornerstudio.cloud/api/stripe/webhook` → Signing secret →
     Reveal (`whsec_...`).
   - Price id: press Enter to keep the $4.99 test price.
4. Open https://play.artcornerstudio.cloud. The locks should be on. Run the full
   test purchase from step 4: Buy now, the `4242` card, the unlocked panel, the
   code on a second device, then a refund from the Stripe dashboard that locks
   it again.

Day-to-day:

| Job | Command (on the VPS) |
| --- | --- |
| Update to the latest `main` | run the install command again, without the address |
| Change Stripe keys (test → live) | the install command with `--reconfigure` |
| See what the server is doing | `journalctl -u spread-out -f` |
| Restart it | `systemctl restart spread-out` |
| HTTPS problems | `journalctl -u caddy -n 50` |

If the installer stops because something else uses ports 80/443, the VPS runs a
control panel or another website; the installer changes nothing in that case.
If Hostinger's VPS **Firewall** page has rules, allow TCP 80 and 443.

### 5a. The Docker way (what play.artcornerstudio.cloud runs)

`deploy/docker-compose.yml` runs the server with no terminal needed, for
Hostinger's VPS **Docker Manager** (VPS image "Ubuntu 24.04 with Docker"). It
uses ready-made images only, because the Docker Manager does not build images
from GitHub:

- `app` is the stock `node:22-bookworm` image. On every start it downloads (or
  updates) the `spread-out` folders of `BRANCH` from GitHub into the `code`
  volume and runs `deploy/docker-start.sh`, which installs the server and
  starts it inside the Docker network. The purchase database and the signing
  secret (created on first start, never changed) live in the `purchases`
  volume.
- `caddy` is the HTTPS front door on ports 80/443 with automatic Let's Encrypt
  certificates for `DOMAIN`, forwarding to `app`.

Settings go in the project's environment: `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, and optionally `STRIPE_PRICE_ID`, `DOMAIN`, `BRANCH`
(`main` by default).

| Job | How |
| --- | --- |
| Update to the latest code | Docker Manager → the project → Restart |
| Read the logs | Docker Manager → the project → Logs |
| Change Stripe keys | edit the project's environment, then restart |

Hosts that can build images can use `spread-out-server/Dockerfile` instead
(Node 22 slim, production dependencies, non-root, health check on `/api/me`):
`docker build -f spread-out-server/Dockerfile -t spread-out-server .` from the
repository root.

### 5b. Alternative: Render (instead of the VPS)


The repository root has a `render.yaml` blueprint that describes the server:
Node 22, the `spread-out-server` folder, a 1 GB disk at `/data` for the purchase
database, `JWT_SECRET` generated by Render, and the test-mode price already
filled in. `PUBLIC_URL` is not needed on Render (the server reads
`RENDER_EXTERNAL_URL`).

1. Sign up at https://render.com and connect your GitHub account.
2. **New → Blueprint**, choose the `art-corner-games` repository, branch `main`.
   Render shows the service from `render.yaml` and asks for the two values
   marked `sync: false`:
   - `STRIPE_SECRET_KEY`: Dashboard → Developers → API keys → Secret key
     (test mode, starts with `sk_test_`).
   - `STRIPE_WEBHOOK_SECRET`: Dashboard → Developers → Webhooks → the endpoint
     `https://spread-out-game.onrender.com/api/stripe/webhook` (already
     created) → **Reveal** signing secret (starts with `whsec_`).
3. Click **Apply**. The first deploy takes a few minutes. The game is then at
   https://spread-out-game.onrender.com with the locks on.
   The Stripe webhook currently points at the VPS address; if you use Render,
   change its URL in Stripe to `https://<your-render-address>/api/stripe/webhook`.
4. Run the full test purchase from step 4 against that address: Buy now, the
   `4242` card, the unlocked panel, the code on a second device, then a refund
   from the Stripe dashboard that locks it again.

### 6. Going live

1. In Stripe, switch to **live mode** and make the same product and one-time
   price; put the live price id in `STRIPE_PRICE_ID` on Render, and the live
   secret key in `STRIPE_SECRET_KEY`.
2. Add the live webhook endpoint (same URL and events as the test one) and put
   its signing secret in `STRIPE_WEBHOOK_SECRET`. Redeploy.
3. Make the free GitHub Pages copy the demo: either stop publishing
   `spread-out/` there (remove it from `.github/workflows/deploy-pages.yml`) and
   link to the Render address instead, or keep a landing page that points to
   the paid game. Then make the repository private so the premium code is not
   readable on GitHub. (The VPS installer downloads the code from GitHub: once
   the repository is private, set up a read-only deploy key on the VPS first,
   or updates will stop working.)
4. Buy it once yourself with a real card, then refund it, to see the live
   webhook and the lock/unlock both work.

## Your Stripe setup (test mode)

Created on the artcornerstudio.net Stripe account, test mode, so no real money
moves until the live keys are used:

| What | Id |
| --- | --- |
| Product "Spread Out! Full Game" | `prod_VPFkR0k1HhnwmY` |
| One-time price, $4.99 USD | `price_1UORF3JMJd2TdRXlcf6CpEbm` (use as `STRIPE_PRICE_ID`) |
| Webhook endpoint (test mode) | `we_1UORThJMJd2TdRXltvgFThB3` → `https://play.artcornerstudio.cloud/api/stripe/webhook` |
| Reusable test checkout link (preview only; the game makes its own) | https://buy.stripe.com/test_00w7sM0gs1MI6rY0Macs800 |

Ids are not secrets. The secret key and the webhook signing secret must still
be copied from the Dashboard into `.env` and never committed. When the game
goes live, make the same product in live mode (ids will differ) and add the
production webhook endpoint.

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
