#!/usr/bin/env bash
# Start API (wrangler :8787) + web (vite :5173) for local dev.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env && ! -f .env.local ]]; then
  echo "Missing .env — set VITE_CLERK_PUBLISHABLE_KEY."
  exit 1
fi

if [[ ! -f .dev.vars ]]; then
  echo "Missing .dev.vars — set CLERK_SECRET_KEY (and optional ANTHROPIC_API_KEY)."
  exit 1
fi

echo "→ Applying local D1 migrations…"
if ! npx wrangler d1 migrations apply patrimonio-db --local; then
  echo "⚠ Local migrate skipped (DB may already be up to date)."
fi

echo ""
echo "→ Starting API on http://localhost:8787"
echo "→ Starting web on http://localhost:5173  (vite proxies /api → wrangler)"
echo "→ Press Ctrl+C to stop both"
echo ""

cleanup() {
  kill "$API_PID" "$WEB_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

npm run dev:api &
API_PID=$!

sleep 2

npm run dev &
WEB_PID=$!

wait "$API_PID" "$WEB_PID"
