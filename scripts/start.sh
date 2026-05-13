#!/usr/bin/env bash
# Pico's TTRPG Toolkit — one-shot starter for local dev (POSIX shells).
#
# Usage:
#   ./scripts/start.sh
#   ./scripts/start.sh --reset      # clear DB + uploads, re-seed
#   ./scripts/start.sh --no-migrate # skip the prisma migrate step

set -euo pipefail

cd "$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

RESET=0
NOMIGRATE=0
for arg in "$@"; do
  case "$arg" in
    --reset) RESET=1 ;;
    --no-migrate) NOMIGRATE=1 ;;
    *) echo "Unknown arg: $arg" >&2; exit 2 ;;
  esac
done

step() { echo; echo "==> $*"; }

free_port() {
  local port=$1
  local pids
  if command -v lsof >/dev/null 2>&1; then
    pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  elif command -v ss >/dev/null 2>&1; then
    pids=$(ss -lptn "sport = :$port" 2>/dev/null | awk -F'pid=' '/pid=/ {print $2}' | cut -d, -f1)
  else
    return
  fi
  if [ -n "$pids" ]; then
    echo "   killing pids on port $port: $pids"
    kill -9 $pids || true
  fi
}

step ".env"
if [ ! -f .env ]; then
  cp .env.example .env
  key=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
  # sed -i is finicky cross-platform; use a portable awk.
  awk -v k="$key" 'BEGIN{FS=OFS="="} /^SESSION_KEY=/{sub(/.*/,"SESSION_KEY=\""k"\"")} {print}' .env > .env.tmp && mv .env.tmp .env
  echo "   created .env (generated SESSION_KEY)."
fi

step "dependencies"
if [ ! -d node_modules ]; then
  echo "   installing npm packages…"
  npm install
else
  echo "   node_modules present"
fi

if [ "$RESET" = 1 ]; then
  step "reset"
  rm -rf apps/server/data
  echo "   wiped apps/server/data"
fi

if [ "$NOMIGRATE" = 0 ]; then
  step "database"
  npm run migrate -w apps/server -- --name auto
  npm run seed -w apps/server
fi

step "ports"
free_port 3000
free_port 5173

step "starting dev"
echo "   server: http://localhost:3000"
echo "   web   : http://localhost:5173"
echo
npm run dev
