#!/usr/bin/env bash
set -euo pipefail

# Deploy Jay workspace files to production
# Usage: ./deploy.sh [--restart] [--dry-run]

SERVER="hetzner-prod"
REMOTE_WORKSPACE="/opt/openclaw-jay/data/.openclaw/workspace"
REMOTE_OPENCLAW="/opt/openclaw-jay"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

RESTART=false
DRY_RUN=false

for arg in "$@"; do
  case $arg in
    --restart) RESTART=true ;;
    --dry-run) DRY_RUN=true ;;
    --help|-h)
      echo "Usage: $0 [--restart] [--dry-run]"
      echo ""
      echo "Syncs workspace files (skills, .md) and docker-compose.override.yml to production."
      echo ""
      echo "  --restart   Restart the gateway after deploy"
      echo "  --dry-run   Show what would be synced without doing it"
      exit 0
      ;;
  esac
done

RSYNC_FLAGS="-avz --checksum"
if $DRY_RUN; then
  RSYNC_FLAGS="$RSYNC_FLAGS --dry-run"
  echo "=== DRY RUN ==="
fi

echo "--- Syncing workspace files ---"
rsync $RSYNC_FLAGS \
  --exclude='node_modules/' \
  --exclude='memory/' \
  --exclude='MEMORY.md' \
  --exclude='USER.md' \
  --exclude='BOOTSTRAP.md' \
  --exclude='package*.json' \
  "$LOCAL_DIR/workspace/" \
  "$SERVER:$REMOTE_WORKSPACE/"

echo ""
echo "--- Syncing docker-compose.override.yml ---"
rsync $RSYNC_FLAGS \
  "$LOCAL_DIR/docker-compose.override.yml" \
  "$SERVER:$REMOTE_OPENCLAW/docker-compose.override.yml"

if $RESTART && ! $DRY_RUN; then
  echo ""
  echo "--- Recreating gateway (to pick up env/config changes) ---"
  ssh "$SERVER" "cd $REMOTE_OPENCLAW && docker compose up -d openclaw-gateway"
  echo "Waiting for gateway to start..."
  sleep 5
  ssh "$SERVER" "curl -fsS http://127.0.0.1:18789/healthz && echo ' OK' || echo ' FAILED'"
fi

echo ""
echo "Done."
