#!/usr/bin/env bash
# Builds pokedex-tcg and ships it to the server as a new release, in a
# releases/ + current symlink layout. The one-time server setup is in
# deploy/README.md.
#
# Usage: pnpm deploy:server   (DEPLOY_HOST and DEPLOY_SITE in .env)
set -euo pipefail

# Run as root (sudo), the build would leave files the next build can't
# replace. Nothing here needs root on the Mac.
if [[ $EUID -eq 0 ]]; then
  echo "Run it without sudo: pnpm deploy:server" >&2
  exit 1
fi

cd "$(dirname "$0")/.."

# The server and the site's address come from the environment or .env, so the
# repository holds no one's server.
env_value() {
  local name=$1
  if [[ -n "${!name:-}" ]]; then
    echo "${!name}"
  elif [[ -f .env ]]; then
    # A missing line is fine (no output), not a failure under pipefail.
    { grep -E "^$name=" .env || true; } | tail -n 1 | cut -d= -f2-
  fi
}

# ============================================
# Configuration
# ============================================
SERVER_USER="deploy"
SERVER_HOST="$(env_value DEPLOY_HOST)"   # the server's IP or name
SSH_KEY="$(env_value DEPLOY_SSH_KEY)"    # optional, e.g. ~/.ssh/hetzner_deploy_key
DEPLOY_PATH="/var/www/pokedex-tcg"
NODE="/opt/node22/bin/node --disable-warning=ExperimentalWarning"
SERVICE="pokedex-tcg"
API_PORT="3002"
SITE="$(env_value DEPLOY_SITE)"           # e.g. https://pokedex.example.com
# ============================================

SSH_KEY="${SSH_KEY/#\~/$HOME}"   # a ~ from .env isn't expanded by the shell

if [[ -z "$SERVER_HOST" || -z "$SITE" ]]; then
  echo "Set DEPLOY_HOST and DEPLOY_SITE in .env first (see .env.example)." >&2
  exit 1
fi

SSH="ssh"
[[ -n "$SSH_KEY" ]] && SSH="ssh -i $SSH_KEY"
REMOTE="$SERVER_USER@$SERVER_HOST"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RELEASE_PATH="$DEPLOY_PATH/releases/$TIMESTAMP"

# The build ships the Pokémon artwork, which isn't in the repository.
ART_COUNT=$(find public/pokemon -name '*.webp' 2>/dev/null | wc -l | tr -d ' ')
if [[ "$ART_COUNT" -lt 1025 ]]; then
  echo "The Pokémon artwork is missing ($ART_COUNT of 1025): run pnpm pokemon:art first." >&2
  exit 1
fi

echo "Checking and building..."
pnpm lint
pnpm build
pnpm build:server

echo "Uploading release $TIMESTAMP..."
$SSH "$REMOTE" "mkdir -p $RELEASE_PATH"
# The app, the bundled API + db tool, and the SQL (not the TypeScript).
rsync -az --exclude='*.ts' -e "$SSH" dist dist-server db "$REMOTE:$RELEASE_PATH/"

echo "Backing up, migrating and activating..."
$SSH "$REMOTE" bash -s <<REMOTE_SCRIPT
set -euo pipefail
set -a; . $DEPLOY_PATH/shared/.env; set +a
# A copy before every migration, so a bad one can be undone.
$NODE $RELEASE_PATH/dist-server/cli.mjs backup
$NODE $RELEASE_PATH/dist-server/cli.mjs migrate
ln -snf $RELEASE_PATH $DEPLOY_PATH/current
sudo systemctl restart $SERVICE
for attempt in 1 2 3 4 5; do
  STATUS=\$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:$API_PORT/api/health || true)
  [ "\$STATUS" = 200 ] && break
  if [ "\$STATUS" = 503 ]; then
    echo "The API is up but refuses everything: no login is set. See deploy/README.md, part 3."
    exit 1
  fi
  if [ \$attempt = 5 ]; then
    echo "The API isn't answering. Logs: sudo journalctl -u $SERVICE -n 50"
    exit 1
  fi
  sleep 1
done
cd $DEPLOY_PATH/releases && ls -t | tail -n +6 | xargs -r rm -rf
REMOTE_SCRIPT

echo ""
echo "Deployment complete: $SITE"
echo "   Release: $TIMESTAMP"
