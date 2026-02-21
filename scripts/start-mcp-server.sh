#!/bin/sh
# MCP server launcher - resolves plugin root and starts the server.
# Workaround for: https://github.com/anthropics/claude-code/issues/9354

# Resolve plugin root:
# 1. $CLAUDE_PLUGIN_ROOT if set (official mechanism, when bug is fixed)
# 2. installPath from installed_plugins.json via cpr.sh
# 3. Fallback: parent of scripts/ directory (works when invoked via absolute path)
if [ -n "$CLAUDE_PLUGIN_ROOT" ]; then
  PLUGIN_ROOT="$CLAUDE_PLUGIN_ROOT"
else
  CPR="$HOME/.claude/cpr.sh"
  if [ -f "$CPR" ]; then
    PLUGIN_ROOT="$(sh "$CPR" memmem@baleen-marketplace)"
  fi

  if [ -z "$PLUGIN_ROOT" ]; then
    SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
    PLUGIN_ROOT="$(dirname "$SCRIPT_DIR")"
  fi
fi

exec node "$PLUGIN_ROOT/scripts/mcp-server-wrapper.mjs"
