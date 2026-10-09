#!/usr/bin/env bash
# Spread Out! server installer for an Ubuntu or Debian VPS (made for a Hostinger VPS).
#
# First install, as root, with the address the game should live at:
#   curl -fsSL https://raw.githubusercontent.com/artcornerstudio/art-corner-games/main/spread-out-server/deploy/install.sh | bash -s -- play.artcornerstudio.cloud
#
# Update to the latest version later: run the same line again, without the address.
# Change the Stripe keys (for example test -> live): add --reconfigure.
#
# What it sets up:
#   Node.js 22        runs the game server (installed from NodeSource if missing or too old)
#   the game code     /opt/spread-out/app (only the spread-out folders of the repository)
#   the settings      /etc/spread-out/env (readable by root only; Stripe keys live here)
#   the purchases     /var/lib/spread-out/purchases.sqlite (kept across updates)
#   a service         "spread-out" (starts on boot, restarts if it crashes)
#   Caddy             the HTTPS front door: gets and renews the certificate automatically
set -euo pipefail

REPO="${REPO:-https://github.com/artcornerstudio/art-corner-games.git}"
BRANCH="${BRANCH:-main}"
APP=/opt/spread-out/app
SERVER_DIR="$APP/spread-out-server"
ENVDIR=/etc/spread-out
ENVFILE="$ENVDIR/env"
PORT=3000
TEST_PRICE=price_1UORF3JMJd2TdRXlcf6CpEbm   # the $4.99 test-mode price made for this game

say()  { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
note() { printf '    %s\n' "$*"; }
warn() { printf '\033[1;33m!!  %s\033[0m\n' "$*"; }
die()  { printf '\n\033[1;31mXX  %s\033[0m\n' "$*" >&2; exit 1; }

DOMAIN=""
RECONF=0
for a in "$@"; do
  case "$a" in
    --reconfigure) RECONF=1 ;;
    -*) die "Unknown option: $a" ;;
    *) DOMAIN="$(printf '%s' "$a" | tr 'A-Z' 'a-z' | sed -e 's#^https\?://##' -e 's#/.*$##')" ;;
  esac
done

[ "$(id -u)" -eq 0 ] || die "Please run this as root (Hostinger's browser terminal logs in as root), or put sudo in front of bash."
[ -r /etc/os-release ] && . /etc/os-release
case " ${ID:-} ${ID_LIKE:-} " in
  *" ubuntu "*|*" debian "*) ;;
  *) die "This installer supports Ubuntu or Debian. This VPS reports: ${PRETTY_NAME:-unknown}." ;;
esac
command -v systemctl >/dev/null || die "This VPS has no systemd, which the installer needs."

# The address: from the command line, or from the last install.
if [ -z "$DOMAIN" ] && [ -f "$ENVFILE" ]; then
  DOMAIN="$(sed -n 's#^PUBLIC_URL=https://##p' "$ENVFILE" | head -n1)"
fi
[ -n "$DOMAIN" ] || die "Tell me the game's address, for example:  ... | bash -s -- play.artcornerstudio.cloud"
printf '%s' "$DOMAIN" | grep -Eq '^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$' || die "\"$DOMAIN\" does not look like a web address (example: play.artcornerstudio.cloud)."

# Nothing else may be using the web ports (a control-panel template would be).
if command -v ss >/dev/null; then
  busy="$(ss -Htlnp '( sport = :80 or sport = :443 )' 2>/dev/null | grep -v '"caddy"' || true)"
  if [ -n "$busy" ]; then
    printf '%s\n' "$busy"
    die "Another program already answers on port 80 or 443 (above). This VPS may run a control panel or another website. Stop here and tell Claude what the line above says."
  fi
fi

say "Installing system packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl git gnupg debian-keyring debian-archive-keyring apt-transport-https >/dev/null

node_ok() {
  command -v node >/dev/null || return 1
  node -e 'const [a,b]=process.versions.node.split(".").map(Number); process.exit(a>22||(a===22&&b>=13)?0:1)'
}
if node_ok; then
  note "Node.js $(node -v) is already installed."
else
  say "Installing Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
  node_ok || die "Node.js 22.13 or newer is needed; found $(node -v 2>/dev/null || echo none)."
  note "Node.js $(node -v) installed."
fi
NODE_BIN="$(command -v node)"

if ! command -v caddy >/dev/null; then
  say "Installing Caddy (automatic HTTPS)"
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --batch --yes --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq
  apt-get install -y -qq caddy >/dev/null
fi

say "Getting the game code ($BRANCH)"
if [ -d "$APP/.git" ]; then
  git -C "$APP" fetch -q --depth 1 origin "$BRANCH"
  git -C "$APP" reset -q --hard FETCH_HEAD
else
  mkdir -p "$(dirname "$APP")"
  git clone -q --depth 1 --branch "$BRANCH" --filter=blob:none --sparse "$REPO" "$APP"
  git -C "$APP" sparse-checkout set spread-out spread-out-server
fi
note "Version $(git -C "$APP" log -1 --format='%h, %cd' --date=short)"
( cd "$SERVER_DIR" && npm ci --omit=dev --no-audit --no-fund --loglevel=error )

# ---- settings (Stripe keys are asked for once and kept; JWT_SECRET is never changed,
#      because changing it signs everyone out and breaks every license code)
getv() { [ -f "$ENVFILE" ] && sed -n "s#^$1=##p" "$ENVFILE" | head -n1 || true; }
if [ ! -f "$ENVFILE" ] || [ "$RECONF" -eq 1 ]; then
  [ -r /dev/tty ] || die "The installer needs to ask for your Stripe keys, but there is no keyboard attached. Run it in a terminal window."
  say "Stripe settings (typing is hidden for the secret ones; paste and press Enter)"
  while :; do
    read -r -s -p "    Stripe secret key (starts with sk_test_ or sk_live_): " SK </dev/tty; echo
    printf '%s' "$SK" | grep -Eq '^(sk|rk)_(test|live)_[A-Za-z0-9]+$' && break
    warn "That doesn't look like a Stripe secret key. Dashboard -> Developers -> API keys -> Secret key -> Reveal."
  done
  while :; do
    read -r -s -p "    Webhook signing secret (starts with whsec_): " WH </dev/tty; echo
    printf '%s' "$WH" | grep -Eq '^whsec_[A-Za-z0-9]+$' && break
    warn "That doesn't look like a webhook signing secret. Dashboard -> Developers -> Webhooks -> your endpoint -> Signing secret -> Reveal."
  done
  DEF_PRICE="$(getv STRIPE_PRICE_ID)"; DEF_PRICE="${DEF_PRICE:-$TEST_PRICE}"
  while :; do
    read -r -p "    Price id [$DEF_PRICE]: " PRICE </dev/tty
    PRICE="${PRICE:-$DEF_PRICE}"
    printf '%s' "$PRICE" | grep -Eq '^price_[A-Za-z0-9]+$' && break
    warn "A price id starts with price_ (Dashboard -> Product catalog -> the product -> the price)."
  done
  case "$SK" in sk_live_*|rk_live_*) [ "$PRICE" = "$TEST_PRICE" ] && warn "You entered a LIVE key with the TEST price. Checkout will fail until you use the live price id (run again with --reconfigure).";; esac
else
  SK="$(getv STRIPE_SECRET_KEY)"; WH="$(getv STRIPE_WEBHOOK_SECRET)"; PRICE="$(getv STRIPE_PRICE_ID)"
  note "Keeping the Stripe settings from the last install (add --reconfigure to change them)."
fi
JWT="$(getv JWT_SECRET)"
[ -n "$JWT" ] || JWT="$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
mkdir -p "$ENVDIR"; chmod 700 "$ENVDIR"
( umask 077
  {
    echo "# Spread Out! server settings. Written by deploy/install.sh. Keep this file private."
    echo "NODE_ENV=production"
    echo "HOST=127.0.0.1"
    echo "PORT=$PORT"
    echo "PUBLIC_URL=https://$DOMAIN"
    echo "DB_PATH=/var/lib/spread-out/purchases.sqlite"
    echo "JWT_SECRET=$JWT"
    echo "STRIPE_SECRET_KEY=$SK"
    echo "STRIPE_WEBHOOK_SECRET=$WH"
    echo "STRIPE_PRICE_ID=$PRICE"
  } > "$ENVFILE.new" )
mv "$ENVFILE.new" "$ENVFILE"

say "Setting up the spread-out service"
cat > /etc/systemd/system/spread-out.service <<UNIT
[Unit]
Description=Spread Out! game server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
DynamicUser=yes
StateDirectory=spread-out
EnvironmentFile=$ENVFILE
WorkingDirectory=$SERVER_DIR
ExecStart=$NODE_BIN --no-warnings=ExperimentalWarning server.js
Restart=on-failure
RestartSec=3
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
PrivateDevices=yes
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectControlGroups=yes
RestrictSUIDSGID=yes
LockPersonality=yes

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable -q spread-out
systemctl restart spread-out
ok=0
for _ in $(seq 1 30); do
  if curl -fsS -o /dev/null -H 'X-Forwarded-Proto: https' "http://127.0.0.1:$PORT/api/me"; then ok=1; break; fi
  sleep 1
done
if [ "$ok" -ne 1 ]; then
  journalctl -u spread-out -n 30 --no-pager || true
  die "The game server did not start (its last messages are above)."
fi
note "The game server is running."

say "Setting up HTTPS for $DOMAIN"
SITE="# Spread Out! (managed by spread-out-server/deploy/install.sh)
$DOMAIN {
	encode zstd gzip
	reverse_proxy 127.0.0.1:$PORT
}"
if [ ! -s /etc/caddy/Caddyfile ] || grep -q '/usr/share/caddy' /etc/caddy/Caddyfile || grep -q 'managed by spread-out-server' /etc/caddy/Caddyfile; then
  printf '%s\n' "$SITE" > /etc/caddy/Caddyfile          # the stock Caddyfile, or ours: replace it
else
  printf '%s\n' "$SITE" > /etc/caddy/spread-out.caddy   # someone else's Caddyfile: add ours beside it
  grep -q '^import spread-out.caddy' /etc/caddy/Caddyfile || printf '\nimport spread-out.caddy\n' >> /etc/caddy/Caddyfile
fi
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1 || { caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile || true; die "The Caddy settings did not validate (see above)."; }
systemctl enable -q caddy
systemctl reload caddy 2>/dev/null || systemctl restart caddy
if command -v ufw >/dev/null && ufw status 2>/dev/null | grep -q 'Status: active'; then
  ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null
  note "Opened ports 80 and 443 in this VPS's firewall (ufw)."
fi

# ---- does the address point here yet?
MYIP="$(curl -4 -fsS --max-time 10 https://api.ipify.org 2>/dev/null || true)"
DNSIP="$(getent ahostsv4 "$DOMAIN" 2>/dev/null | awk 'NR==1{print $1}' || true)"
if [ -z "$DNSIP" ]; then
  warn "$DOMAIN does not point anywhere yet. In Hostinger: Domains -> $(printf '%s' "$DOMAIN" | cut -d. -f2-) -> DNS records -> add an A record:"
  warn "    Type A   Name $(printf '%s' "$DOMAIN" | cut -d. -f1)   Points to ${MYIP:-the IP address of this VPS}   TTL default"
  warn "HTTPS will switch on by itself a few minutes after that record exists. Nothing to re-run."
elif [ -n "$MYIP" ] && [ "$DNSIP" != "$MYIP" ]; then
  warn "$DOMAIN points to $DNSIP, but this VPS is $MYIP. Fix the A record in Hostinger's DNS settings; HTTPS starts once it matches."
else
  ok=0
  for _ in $(seq 1 45); do
    if curl -fsS -o /dev/null --max-time 5 "https://$DOMAIN/api/me"; then ok=1; break; fi
    sleep 2
  done
  if [ "$ok" -eq 1 ]; then note "https://$DOMAIN answers with a valid certificate."
  else warn "The address points here but HTTPS isn't answering yet. Give it a few minutes; check with:  journalctl -u caddy -n 30"
  fi
fi

say "Done"
note "Game:            https://$DOMAIN"
note "Stripe webhook:  https://$DOMAIN/api/stripe/webhook"
note "Server log:      journalctl -u spread-out -f"
note "Update later:    run the same install command again (no address needed)"
note "Purchases are stored in /var/lib/spread-out/purchases.sqlite. Hostinger's VPS backups include it."
