#!/usr/bin/env bats
# Git Guard plugin-specific tests
# Basic validation is handled in tests/ directory

load ../../../tests/helpers/bats_helper

PLUGIN_DIR="${PROJECT_ROOT}/plugins/git-guard"

@test "git-guard: commit-guard.sh hook script exists" {
    [ -f "${PLUGIN_DIR}/hooks/commit-guard.sh" ]
}

@test "git-guard: pre-commit-guard.sh hook script exists" {
    [ -f "${PLUGIN_DIR}/hooks/pre-commit-guard.sh" ]
}

@test "git-guard: hook scripts use proper error handling" {
    grep -q "set -euo pipefail" "${PLUGIN_DIR}/hooks/commit-guard.sh"
    grep -q "set -euo pipefail" "${PLUGIN_DIR}/hooks/pre-commit-guard.sh"
}

@test "git-guard: hooks.json references hook scripts" {
    local hooks_json="${PLUGIN_DIR}/hooks/hooks.json"
    validate_json "$hooks_json"
    # Verify hook scripts are referenced
    grep -q "commit-guard.sh" "$hooks_json" || grep -q "pre-commit-guard.sh" "$hooks_json"
}
