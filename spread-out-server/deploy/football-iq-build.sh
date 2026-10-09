#!/bin/sh
# Builds the two editions of Football IQ (free demo and full game) for the server to serve.
#
# docker-start.sh runs this in the background AFTER Spread Out! is already up, so a problem
# here can never keep Spread Out! from starting. Until the first build finishes, /football-iq/
# shows "getting ready". Later builds replace the old ones in one quick swap.
#
# Everything is built from the same checkout of the repository the server code came from.
set -eu

APP="${APP:-/srv/app}"
OUT="${FIQ_OUT:-/srv/football-iq}"
say() { echo "[football-iq build] $*"; }

say "start"
cd "$APP"
git sparse-checkout add football-iq
cd football-iq

say "installing build tools"
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --no-audit --no-fund --loglevel=error

mkdir -p "$OUT"
rm -rf "$OUT/demo.next" "$OUT/full.next"
export VITE_BASE=/football-iq/

say "type check"
npx tsc --noEmit

say "building the free demo"
VITE_EDITION=demo npx vite build --outDir "$OUT/demo.next" --emptyOutDir --logLevel warn
say "building the full game"
VITE_EDITION=full npx vite build --outDir "$OUT/full.next" --emptyOutDir --logLevel warn

# Coach Eric's clips are served from the checkout, with a per-buyer list; no copies in the builds.
rm -rf "$OUT/demo.next/voice" "$OUT/full.next/voice"

say "checking that the demo contains none of the paid content"
DEMO_DIR="$OUT/demo.next" FULL_DIR="$OUT/full.next" node scripts/check-editions.mjs

say "switching to the new build"
rm -rf "$OUT/demo" "$OUT/full"
mv "$OUT/demo.next" "$OUT/demo"
mv "$OUT/full.next" "$OUT/full"
say "done"
