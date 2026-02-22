#!/bin/sh
# Hook runner - resolves plugin root and executes CLI command.
# Workaround for CLAUDE_PLUGIN_ROOT not being set for local installs.
# See: https://github.com/anthropics/claude-code/issues/9354

PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(sh "$HOME/.claude/cpr.sh" memmem@baleen-marketplace)}"
exec node "$PLUGIN_ROOT/dist/cli.mjs" "$@"
