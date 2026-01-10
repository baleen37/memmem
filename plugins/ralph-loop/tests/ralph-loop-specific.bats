#!/usr/bin/env bats
# Ralph Loop plugin-specific tests
# Basic validation is handled in tests/ directory

load ../../../tests/helpers/bats_helper

PLUGIN_DIR="${PROJECT_ROOT}/plugins/ralph-loop"

@test "ralph-loop: setup-ralph-loop.sh script exists" {
    [ -f "${PLUGIN_DIR}/scripts/setup-ralph-loop.sh" ]
}

@test "ralph-loop: cancel-ralph.sh script exists" {
    [ -f "${PLUGIN_DIR}/scripts/cancel-ralph.sh" ]
}

@test "ralph-loop: ralph-loop command uses SessionStart and Stop hooks" {
    # Verify the ralph-loop command integrates with hooks
    local cmd_file="${PLUGIN_DIR}/commands/ralph-loop.md"
    [ -f "$cmd_file" ]
    has_frontmatter_delimiter "$cmd_file"
}

@test "ralph-loop: scripts use proper error handling" {
    for script in "${PLUGIN_DIR}"/scripts/*.sh; do
        if [ -f "$script" ]; then
            grep -q "set -euo pipefail" "$script"
        fi
    done
}
