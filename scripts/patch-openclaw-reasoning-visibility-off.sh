#!/usr/bin/env bash
# Apply on the gateway host (Hetzner).
# - Removes invalid agents.defaults.reasoningDefault (not in schema; breaks gateway).
# - Sets agents.list[].reasoningDefault to "off" so thinking stays on but chat does not show reasoning.
set -euo pipefail

CONFIG="${OPENCLAW_CONFIG_FILE:-/opt/openclaw-jay/data/.openclaw/openclaw.json}"

if [[ ! -f "$CONFIG" ]]; then
  echo "error: $CONFIG not found" >&2
  exit 1
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "error: python3 is required" >&2
  exit 1
fi

backup="${CONFIG}.bak.$(date +%Y%m%d%H%M%S)"
cp "$CONFIG" "$backup"

python3 -c "
import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
data = json.loads(path.read_text())
agents = data.setdefault('agents', {})
defaults = agents.setdefault('defaults', {})
# Schema allows reasoningDefault only on agents.list[], not on defaults
defaults.pop('reasoningDefault', None)
for agent in agents.get('list') or []:
    if isinstance(agent, dict):
        agent['reasoningDefault'] = 'off'
path.write_text(json.dumps(data, indent=2) + '\n')
" "$CONFIG"

echo "Set agents.list[].reasoningDefault to off; removed invalid agents.defaults.reasoningDefault if present (backup: $backup)"
