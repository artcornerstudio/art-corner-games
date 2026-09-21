# ⚽ Spread Out!

A free browser game that teaches kids ages 6–12 real soccer smarts: **getting open, spreading out, and passing to the open teammate.**

**▶️ Play it live:** https://artcornerstudio.github.io/art-corner-games/spread-out/

## What's in the game

- **Get Open!** — drag to find open space so a teammate can pass to you
- **Pick the Pass!** — tap the teammate nobody is guarding
- **Where Do I Stand?** — learn striker/midfield/defense zones and sliding with the ball
- **Mini Match!** — a real 3-on-3 game where good spacing wins
- Player profiles, stars, jerseys, and a **Coach Corner** with a printable practice plan

See [`PRD.md`](PRD.md) for the full plan and phased roadmap.

## Privacy

No accounts, no ads, no tracking. See [`privacy.html`](privacy.html) — everything the game remembers stays on your own device.

## Running it locally

It's a single file — no build step. Open `index.html` in a browser, or serve this folder with any static file server (needed for the "install to home screen" and offline features to work):

```
python3 -m http.server 8000
```

## How it gets published

This game lives in the shared **art-corner-games** website alongside Football IQ. The repository's "Deploy to GitHub Pages" workflow copies this `spread-out/` folder into the site whenever changes to it land on `main`, so it's served at `/art-corner-games/spread-out/`. No build step is needed for this game — every file in this folder is published as-is.

## License

See [`LICENSE.md`](LICENSE.md).
