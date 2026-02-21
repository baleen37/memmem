#!/bin/sh
# Resolves CLAUDE_PLUGIN_ROOT for local plugin installations.
# Workaround for: https://github.com/anthropics/claude-code/issues/9354
#
# Priority:
# 1. $CLAUDE_PLUGIN_ROOT if already set (future-proof when bug is fixed)
# 2. installPath from ~/.claude/plugins/installed_plugins.json
# 3. Fallback: directory of this script's parent

if [ -n "$CLAUDE_PLUGIN_ROOT" ]; then
  echo "$CLAUDE_PLUGIN_ROOT"
  exit 0
fi

PLUGIN_ID="memmem@baleen-marketplace"
INSTALLED_PLUGINS="$HOME/.claude/plugins/installed_plugins.json"

if [ -f "$INSTALLED_PLUGINS" ]; then
  INSTALL_PATH=$(python3 -c "
import json, sys
data = json.load(open('$INSTALLED_PLUGINS'))
entries = data.get('$PLUGIN_ID', [])
if entries:
    print(entries[0].get('installPath', ''))
" 2>/dev/null)
  if [ -n "$INSTALL_PATH" ]; then
    echo "$INSTALL_PATH"
    exit 0
  fi
fi

# Fallback: two levels up from this script (scripts/ -> project root)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "$(dirname "$SCRIPT_DIR")"
