#!/usr/bin/env bash
# Runs the app on this Mac against a throwaway local Postgres database,
# seeded with a test league whose final is open for picks.
# Usage (from anywhere):  bash ~/gbbo_fantasy_league/scripts/run-local-test.sh
set -euo pipefail
cd "$(dirname "$0")/.."

DB=gbbo_fantasy_local
PG=postgresql@16

if ! command -v brew >/dev/null; then
  echo "Homebrew is needed to install Postgres: https://brew.sh" ; exit 1
fi

# Postgres: use one that's already installed, otherwise install postgresql@16
PGBIN=""
for f in postgresql@17 postgresql@16 postgresql@15 postgresql@14 postgresql; do
  if brew list --versions "$f" >/dev/null 2>&1; then PG=$f; PGBIN="$(brew --prefix "$f")/bin"; break; fi
done
if [ -z "$PGBIN" ]; then
  echo "==> Installing $PG with Homebrew"
  brew install "$PG"
  PGBIN="$(brew --prefix "$PG")/bin"
fi
export PATH="$PGBIN:$PATH"

echo "==> Starting $PG"
brew services start "$PG" >/dev/null || true
for i in $(seq 1 20); do pg_isready -q -h localhost && break; sleep 1; done
pg_isready -h localhost

echo "==> Creating database $DB (if needed)"
createdb -h localhost "$DB" 2>/dev/null || true

URL="postgresql://$(whoami)@localhost:5432/$DB?schema=public"
if [ -f .env ]; then
  if ! grep -q "$DB" .env; then
    echo "A .env already exists and doesn't point at $DB. Stopping so it isn't overwritten."; exit 1
  fi
else
  echo "==> Writing .env for the local test database"
  cat > .env <<ENV
DATABASE_URL="$URL"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
ENV
fi
set -a; source .env; set +a

echo "==> Installing packages"
npm install

echo "==> Pushing the schema to $DB"
npx prisma db push --accept-data-loss

echo "==> Seeding the test league"
node scripts/seed-local.mjs

echo "==> Starting the app at http://localhost:3000 (Ctrl+C to stop)"
npm run dev
