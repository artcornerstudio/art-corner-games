# ⚽ Spread Out!

A free browser game that teaches kids ages 6–12 real soccer smarts: **getting open, spreading out, and passing to the open teammate.**

**▶️ Play it live:** https://artcornerstudio.github.io/art-corner-agents/
*(live once GitHub Pages is switched on for this repo — see below)*

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

It's a single file — no build step. Open `index.html` in a browser, or serve the folder with any static file server (needed for the "install to home screen" and offline features to work):

```
python3 -m http.server 8000
```

## Publishing this game (GitHub Pages)

This repo is ready for GitHub Pages — the game already sits at the repo root as `index.html`. To switch it on:

1. Go to this repo's **Settings** tab on GitHub.
2. Click **Pages** in the left sidebar.
3. Under **Source**, choose **Deploy from a branch**.
4. Pick the branch this game lives on, and folder **`/ (root)`**.
5. Click **Save**.

GitHub will publish the site (usually within a minute or two) at a `github.io` address shown on that same settings page. Every future `git push` to that branch updates the live site automatically — no extra steps needed.

## License

See [`LICENSE.md`](LICENSE.md).
