#!/bin/sh
# Starts the Spread Out! server inside the stock node:22 image.
# deploy/docker-compose.yml downloads (or updates) the code into /srv/app,
# then runs this file from there.
set -e
cd /srv/app/spread-out-server
echo "Spread Out! code version: $(git -C /srv/app log -1 --format='%h %cd' --date=short)"
npm ci --omit=dev --no-audit --no-fund --loglevel=error
export JWT_SECRET_FILE="${JWT_SECRET_FILE:-/data/jwt_secret}"
exec node --no-warnings=ExperimentalWarning server.js
