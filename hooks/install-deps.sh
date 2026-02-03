#!/bin/bash
set -euo pipefail

# Auto-build conversation-memory plugin on first use
# This runs when Claude Code session starts
# Also rebuilds when package.json is newer than dist (version update)

# If dist exists, check if we need to rebuild
if [ -f "${CLAUDE_PLUGIN_ROOT}/dist/mcp-server.mjs" ]; then
  # Rebuild if package.json is newer than dist (version update)
  if [ "${CLAUDE_PLUGIN_ROOT}/package.json" -nt "${CLAUDE_PLUGIN_ROOT}/dist/mcp-server.mjs" ]; then
    cd "${CLAUDE_PLUGIN_ROOT}"
    npm run build --silent
  fi
  exit 0
fi

# Install dependencies if node_modules is missing or empty
if [ ! -d "${CLAUDE_PLUGIN_ROOT}/node_modules" ] || [ -z "$(ls -A "${CLAUDE_PLUGIN_ROOT}/node_modules" 2>/dev/null)" ]; then
  cd "${CLAUDE_PLUGIN_ROOT}"
  npm install --silent
fi

# Build the plugin
cd "${CLAUDE_PLUGIN_ROOT}"
npm run build --silent

exit 0
