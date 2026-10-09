# Football IQ landing page for GitHub Pages

Not published yet. When it is, `https://artcornerstudio.github.io/art-corner-games/` stops serving the
free, fully open copy of Football IQ and shows this page instead, pointing to the game at
`https://play.artcornerstudio.cloud/football-iq/`. `sw.js` retires the old offline copy on devices that
installed it.

Why it matters: while the full free copy stays on Pages, anyone can play everything there for free,
and the paywall sells nothing. Switch only after the paid game has been bought once with a real card
and refunded (see "Before the first real sale" in `spread-out-server/README.md`).

## Switching it on

In `.github/workflows/deploy-pages.yml`, replace the two build steps and the Spread Out step with:

```yaml
      - name: Football IQ landing page (the game itself is at play.artcornerstudio.cloud/football-iq/)
        run: |
          mkdir -p football-iq/dist/art football-iq/dist/icons football-iq/dist/spread-out
          cp football-iq-pages/index.html football-iq-pages/sw.js football-iq/public/privacy.html football-iq/public/favicon.svg football-iq/dist/
          cp football-iq/public/art/mascot.png football-iq/dist/art/
          cp football-iq/public/icons/icon-192.png football-iq/dist/icons/
```

keeping the Spread Out! landing step and the upload step as they are, and add `"football-iq-pages/**"`
to the `paths` list. `football-iq/dist` here is just a folder to assemble the site in.
