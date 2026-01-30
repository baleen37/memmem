#!/usr/bin/env bats
# docker-sandbox.bats: Tests for docker-sandbox skill

load 'helpers/bats_helper.bash'

setup() {
    # Source the helper libraries
    DOCKER_SANDBOX_DIR="${BATS_TEST_DIRNAME}/../skills/docker-sandbox"
    export DOCKER_SANDBOX_DIR
}

teardown() {
    # Cleanup any containers created during tests
    docker ps -a --filter "name=claude-test-bats-" --format '{{.Names}}' | xargs -r docker stop -t 0 &>/dev/null || true
    docker ps -a --filter "name=claude-test-bats-" --format '{{.Names}}' | xargs -r docker rm &>/dev/null || true
}

@test "docker-helpers.sh: check_docker_available returns true when Docker is running" {
    if ! command -v docker &>/dev/null || ! docker ps &>/dev/null; then
        skip "Docker not available"
    fi

    source "$DOCKER_SANDBOX_DIR/scripts/lib/docker-helpers.sh"

    run check_docker_available
    [ "$status" -eq 0 ]
}

@test "docker-helpers.sh: check_docker_available returns false when Docker is not available" {
    # Save PATH
    OLD_PATH="$PATH"

    # Temporarily remove docker from PATH
    PATH=$(echo "$PATH" | tr ':' '\n' | grep -v '/docker' | tr '\n' ':')

    source "$DOCKER_SANDBOX_DIR/scripts/lib/docker-helpers.sh"

    run check_docker_available
    [ "$status" -ne 0 ]

    # Restore PATH
    PATH="$OLD_PATH"
}

@test "docker-helpers.sh: create_container creates a running container" {
    if ! command -v docker &>/dev/null || ! docker ps &>/dev/null; then
        skip "Docker not available"
    fi

    source "$DOCKER_SANDBOX_DIR/scripts/lib/docker-helpers.sh"

    local container_name="claude-test-bats-$$-$RANDOM"
    local test_token="test-token-12345"

    # Create container (use a simple image for testing)
    create_container "$container_name" "ubuntu:24.04" "$test_token" "/tmp"

    # Verify container exists and is running
    run container_exists "$container_name"
    [ "$status" -eq 0 ]

    run container_running "$container_name"
    [ "$status" -eq 0 ]

    # Cleanup
    cleanup_container "$container_name"

    # Verify cleanup
    run container_exists "$container_name"
    [ "$status" -ne 0 ]
}

@test "test-helpers.sh: verify_contains checks all expected strings" {
    source "$DOCKER_SANDBOX_DIR/scripts/lib/test-helpers.sh"

    local output="This is a test output with multiple lines"

    run verify_contains "$output" "test output" "multiple"
    [ "$status" -eq 0 ]

    run verify_contains "$output" "test output" "NOTPRESENT"
    [ "$status" -ne 0 ]
}

@test "run-docker-test.sh: script exists and is executable" {
    local script="$DOCKER_SANDBOX_DIR/scripts/run-docker-test.sh"

    [ -f "$script" ]
    [ -x "$script" ]
}

@test "run-docker-test.sh: shows usage when called without arguments" {
    if ! command -v docker &>/dev/null; then
        skip "Docker not available"
    fi

    local script="$DOCKER_SANDBOX_DIR/scripts/run-docker-test.sh"

    run "$script"
    [ "$status" -ne 0 ]
    [[ "$output" == *"Usage:"* ]]
}

@test "run-docker-test.sh: skips when test file not found" {
    if ! command -v docker &>/dev/null; then
        skip "Docker not available"
    fi

    local script="$DOCKER_SANDBOX_DIR/scripts/run-docker-test.sh"

    run "$script" "/nonexistent/test.yaml"
    [ "$status" -ne 0 ]
    [[ "$output" == *"not found"* ]]
}
