#!/usr/bin/env bash
set -euo pipefail

# Pull workspace changes from production (changes Jay made)
# Usage: ./pull.sh [--dry-run] [--force]

SERVER="hetzner-prod"
REMOTE_WORKSPACE="/opt/openclaw-jay/data/.openclaw/workspace"
LOCAL_DIR="$(cd "$(dirname "$0")" && pwd)"

DRY_RUN=false
FORCE=false

for arg in "$@"; do
  case $arg in
    --dry-run) DRY_RUN=true ;;
    --force) FORCE=true ;;
    --help|-h)
      echo "Usage: $0 [--dry-run] [--force]"
      echo ""
      echo "Pulls workspace file changes from production (skills, .md files Jay edited)."
      echo "Only pulls files we manage: top-level .md files and skills/."
      echo ""
      echo "  --dry-run  Do not write files (rsync dry-run only)"
      echo "  --force    Skip preflight: overwrite local changes without git safety check"
      exit 0
      ;;
  esac
done

RSYNC_FLAGS="-avz --checksum"
if $DRY_RUN; then
  RSYNC_FLAGS="$RSYNC_FLAGS --dry-run"
  echo "=== DRY RUN ==="
fi

# Before real pull: dry-run rsync + itemize; abort if any file to be updated
# intersects paths with local git changes under workspace/.
preflight_pull_or_exit() {
  if $FORCE; then
    return 0
  fi

  local out1 out2
  out1=$(rsync -avz --checksum --dry-run -i \
    --include='*.md' --exclude='*' \
    "$SERVER:$REMOTE_WORKSPACE/" \
    "$LOCAL_DIR/workspace/" 2>&1) || return $?

  out2=$(rsync -avz --checksum --dry-run -i \
    "$SERVER:$REMOTE_WORKSPACE/skills/" \
    "$LOCAL_DIR/workspace/skills/" 2>&1) || return $?

  local would dirty
  would=$(mktemp)
  dirty=$(mktemp)
  trap 'rm -f "$would" "$dirty"' RETURN

  {
    echo "$out1" | awk '/^>/ { $1=""; sub(/^ /, ""); print }' | while read -r r; do
      [[ -z "$r" ]] && continue
      r="${r#./}"
      printf '%s\n' "workspace/${r}"
    done
    echo "$out2" | awk '/^>/ { $1=""; sub(/^ /, ""); print }' | while read -r r; do
      [[ -z "$r" ]] && continue
      r="${r#./}"
      printf '%s\n' "workspace/skills/${r}"
    done
  } | sort -u >"$would"

  if git -C "$LOCAL_DIR" rev-parse --is-inside-work-tree &>/dev/null; then
    {
      git -C "$LOCAL_DIR" diff --name-only
      git -C "$LOCAL_DIR" diff --cached --name-only
      git -C "$LOCAL_DIR" ls-files --others --exclude-standard -- workspace/
    } | sort -u >"$dirty"
  else
    : >"$dirty"
  fi

  sort -u "$would" -o "$would"
  sort -u "$dirty" -o "$dirty"

  local conflicts
  conflicts=$(comm -12 "$would" "$dirty" || true)
  if [[ -n "$conflicts" ]]; then
    echo "Aborting: pull would update files that have local git changes (modified, staged, or untracked under workspace/):" >&2
    echo "$conflicts" | sed 's/^/  /' >&2
    echo "" >&2
    echo "Commit or stash your changes, or run: $0 --force" >&2
    return 1
  fi
  return 0
}

preflight_pull_or_exit || exit 1

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
