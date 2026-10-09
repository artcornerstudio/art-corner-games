#!/bin/sh
# Starts the Spread Out! server inside the stock node:22 image.
# deploy/docker-compose.yml downloads (or updates) the code into /srv/app,
# then runs this file from there.
#
# The same server also sells Football IQ at /football-iq/. Its two builds are made by
# deploy/football-iq-build.sh in the background, after this server is already running.
set -e
cd /srv/app/spread-out-server
echo "Spread Out! code version: $(git -C /srv/app log -1 --format='%h %cd' --date=short)"
npm ci --omit=dev --no-audit --no-fund --loglevel=error
export JWT_SECRET_FILE="${JWT_SECRET_FILE:-/data/jwt_secret}"

# Where the server finds Football IQ. The builds appear here once the background job below finishes.
export FIQ_DEMO_DIR="${FIQ_DEMO_DIR:-/srv/football-iq/demo}"
export FIQ_FULL_DIR="${FIQ_FULL_DIR:-/srv/football-iq/full}"
export FIQ_VOICE_DIR="${FIQ_VOICE_DIR:-/srv/app/football-iq/public/voice}"
export FIQ_UNITS_FILE="${FIQ_UNITS_FILE:-/srv/app/football-iq/voice/units.json}"

# Build Football IQ in the background, at low priority. Whatever happens in there, Spread Out! keeps running:
# the subshell ignores its own errors and its output goes to the container log and a file on the disk.
(
  set +e
  nice -n 15 sh /srv/app/spread-out-server/deploy/football-iq-build.sh 2>&1 | tee -a /data/football-iq-build.log
) >/proc/1/fd/1 2>&1 &

exec node --no-warnings=ExperimentalWarning server.js
