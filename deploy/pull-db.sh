#!/usr/bin/env bash
# Replaces the local database with a copy of the server's, to work on the
# real data. The server makes a fresh backup first (the nightly one can be
# hours behind, and the main file without its WAL even more), and sends it
# down in the same SSH login. The local database is backed up before it's
# replaced, and the copy then gets this checkout's migrations.
#
# Usage: pnpm db:pull   (with pnpm dev stopped; DEPLOY_HOST in .env)
set -euo pipefail

cd "$(dirname "$0")/.."

# The same settings as deploy.sh, from the environment or .env.
env_value() {
  local name=$1
  if [[ -n "${!name:-}" ]]; then
    echo "${!name}"
  elif [[ -f .env ]]; then
    { grep -E "^$name=" .env || true; } | tail -n 1 | cut -d= -f2-
  fi
}

SERVER_USER="deploy"
SERVER_HOST="$(env_value DEPLOY_HOST)"
SSH_KEY="$(env_value DEPLOY_SSH_KEY)"
DEPLOY_PATH="/var/www/pokedex-tcg"
NODE="/opt/node22/bin/node --disable-warning=ExperimentalWarning"
DATA_DIR="$(env_value DATA_DIR)"
DB="${DATA_DIR:-data}/pokedex-tcg.sqlite"
DOWNLOAD="$DB.download"

SSH_KEY="${SSH_KEY/#\~/$HOME}"

if [[ -z "$SERVER_HOST" ]]; then
  echo "Set DEPLOY_HOST in .env first (see .env.example)." >&2
  exit 1
fi

# The API keeps the database open: replaced underneath it, its next write
# would go into the old file's WAL and corrupt the new one.
if lsof -t -- "$DB" >/dev/null 2>&1; then
  echo "The database is open (pnpm dev?). Stop it first, then run pnpm db:pull again." >&2
  exit 1
fi

# One login only: a few failed ones get this machine banned from SSH for a
# while, so this never retries.
SSH=(ssh)
[[ -n "$SSH_KEY" ]] && SSH+=(-i "$SSH_KEY" -o IdentitiesOnly=yes)

mkdir -p "$(dirname "$DB")"
trap 'rm -f "$DOWNLOAD"' EXIT

echo "Backing up the server's database and downloading it..."
# The backup prints its path relative to the release, so cd to the release
# itself (-P), not the current symlink.
"${SSH[@]}" "$SERVER_USER@$SERVER_HOST" bash -s >"$DOWNLOAD" <<REMOTE_SCRIPT
set -euo pipefail
set -a; . $DEPLOY_PATH/shared/.env; set +a
cd -P $DEPLOY_PATH/current
OUT=\$($NODE dist-server/cli.mjs backup | tail -n 1)
echo "server \$OUT" >&2
cat "\${OUT#backup: }"
REMOTE_SCRIPT

# A broken download stops here, before anything local changes.
node --disable-warning=ExperimentalWarning -e '
const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync(process.argv[1], { readOnly: true });
let check;
try {
  check = db.prepare("pragma integrity_check").get().integrity_check;
} catch (error) {
  check = error.message;
}
if (check !== "ok") {
  console.error(`The download is damaged (${check}). Nothing was replaced.`);
  process.exit(1);
}
const { n, newest } = db.prepare("select count(*) n, max(created_at) newest from cards").get();
console.log(`downloaded: ${n} cards, the newest added ${newest ?? "never"}`);
' "$DOWNLOAD"

pnpm --silent db:backup
rm -f "$DB-wal" "$DB-shm"
mv "$DOWNLOAD" "$DB"
echo "replaced: $DB"

# Migrations on this branch that the server hasn't had yet.
pnpm --silent db:migrate
