# ⚽ Spread Out!

A free browser game that teaches kids ages 6–12 real soccer smarts: **getting open, spreading out, and passing to the open teammate.**

**▶️ Play it live:** https://play.artcornerstudio.cloud/ (free demo; the full game is a one-time $4.99 with a 30-day money-back guarantee)

The old address, https://artcornerstudio.github.io/art-corner-games/spread-out/, now shows a landing page
(`../spread-out-pages/`) that points to the new one.

## What's in the game

- **Get Open!** — drag to find open space so a teammate can pass to you
- **Pick the Pass!** — tap the teammate nobody is guarding
- **Where Do I Stand?** — learn striker/midfield/defense zones and sliding with the ball
- **Mini Match!** — a real 3-on-3 game where good spacing wins
- Player profiles, stars, jerseys, and a **Coach Corner** with a printable practice plan
- **Coach Eric** reads every coach line out loud in the same recorded voice as Football IQ (see [`voice/README.md`](voice/README.md)); lines without a clip use the device's own voice

See [`PRD.md`](PRD.md) for the full plan and phased roadmap.

## Selling the full game (optional)

`../spread-out-server/` is a small Node.js server that serves this game with a
free demo and sells a one-time unlock through Stripe Checkout; the premium modes
are served only to verified buyers. This free copy does not use it. See
[`../spread-out-server/README.md`](../spread-out-server/README.md).

## Privacy

No accounts, no ads, no tracking. See [`privacy.html`](privacy.html) — everything the game remembers stays on your own device. The coach's voice clips are plain files served from this site, and the fallback voice runs on the device itself.

## Running it locally

It's a single file — no build step. Open `index.html` in a browser, or serve this folder with any static file server (needed for the "install to home screen" and offline features to work):

```
python3 -m http.server 8000
```

## How it gets published

The game is served by `../spread-out-server/` on a Hostinger VPS at play.artcornerstudio.cloud (see that folder's README). The repository's "Deploy to GitHub Pages" workflow publishes only the landing page from `../spread-out-pages/` plus this folder's privacy page and icons at `/art-corner-games/spread-out/`.

## License

See [`LICENSE.md`](LICENSE.md).
