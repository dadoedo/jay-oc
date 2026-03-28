#!/usr/bin/env bash
set -euo pipefail

# Pull workspace changes from production (changes Jay made)
# Usage: ./pull.sh [--dry-run]

SERVER="hetzner-prod"
REMOTE_WORKSPACE="/opt/openclaw-jay/data/.openclaw/workspace"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

DRY_RUN=false

for arg in "$@"; do
  case $arg in
    --dry-run) DRY_RUN=true ;;
    --help|-h)
      echo "Usage: $0 [--dry-run]"
      echo ""
      echo "Pulls workspace file changes from production (skills, .md files Jay edited)."
      echo "Only pulls files we manage: top-level .md files and skills/."
      exit 0
      ;;
  esac
done

RSYNC_FLAGS="-avz --checksum"
if $DRY_RUN; then
  RSYNC_FLAGS="$RSYNC_FLAGS --dry-run"
  echo "=== DRY RUN ==="
fi

echo "--- Pulling top-level .md files ---"
rsync $RSYNC_FLAGS \
  --include='*.md' \
  --exclude='*' \
  "$SERVER:$REMOTE_WORKSPACE/" \
  "$LOCAL_DIR/workspace/"

echo ""
echo "--- Pulling skills/ ---"
rsync $RSYNC_FLAGS \
  "$SERVER:$REMOTE_WORKSPACE/skills/" \
  "$LOCAL_DIR/workspace/skills/"

echo ""
echo "Done. Review changes with: git diff"
