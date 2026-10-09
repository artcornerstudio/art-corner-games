# Football IQ landing page for GitHub Pages

Once the Pages workflow runs from `main`, `https://artcornerstudio.github.io/art-corner-games/` no longer
serves the free, fully open copy of Football IQ. It shows this page instead, pointing to the game at
`https://play.artcornerstudio.cloud/football-iq/`. `sw.js` retires the old offline copy on devices that
installed it.

This was switched on after the paid game was bought once with a real card and refunded (the lock and unlock
both worked on two devices).

## How it is published

`.github/workflows/deploy-pages.yml` copies `index.html`, `sw.js`, the privacy page, the favicon, the mascot
and one icon into a folder, adds the Spread Out! landing page under `/spread-out/`, and uploads that folder.
Nothing of the game is built or published there. To change the page, edit `index.html` here.

## Undoing it

Restore the previous version of the workflow (two build steps, `npm ci` and `npm run build` with
`VITE_BASE=/art-corner-games/`) from git history. That puts the free, fully open copy back on Pages.
