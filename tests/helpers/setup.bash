#!/usr/bin/env bash
# Test setup/teardown helpers for claude-plugins project
# This file provides reusable setup and teardown functions
# Load this instead of duplicating setup/teardown in test files

# Project root directory
# BATS_TEST_DIRNAME is the directory containing the test file
# shellcheck disable=SC2155
if [ -f "${BATS_TEST_DIRNAME}/../../helpers/bats_helper.bash" ]; then
    # Running from tests/ directory
    export PROJECT_ROOT="$(cd "${BATS_TEST_DIRNAME}/.." && pwd)"
elif [ -f "${BATS_TEST_DIRNAME}/../../../tests/helpers/bats_helper.bash" ]; then
    # Running from plugins/{plugin}/tests/ directory
    export PROJECT_ROOT="$(cd "${BATS_TEST_DIRNAME}/../../.." && pwd)"
else
    # Fallback for tests/skills/ directory
    export PROJECT_ROOT="$(cd "${BATS_TEST_DIRNAME}/../.." && pwd)"
fi

# Setup function - runs before each test
# Creates temp directory for test-specific files
setup_test_temp() {
    local temp_dir
    temp_dir=$(mktemp -d -t claude-plugins-test.XXXXXX)
    export TEST_TEMP_DIR="$temp_dir"
}

# Teardown function - runs after each test
# Clean up temp directory
teardown_test_temp() {
    if [ -n "${TEST_TEMP_DIR:-}" ] && [ -d "$TEST_TEMP_DIR" ]; then
        rm -rf "$TEST_TEMP_DIR"
    fi
}

# Alias functions for backward compatibility
setup_test_environment() {
    setup_test_temp
}

teardown_test_environment() {
    teardown_test_temp
}

# Ensure jq is available
ensure_jq() {
    local jq_bin="${JQ_BIN:-jq}"
    if ! command -v "$jq_bin" &> /dev/null; then
        skip "jq not available"
    fi
}
