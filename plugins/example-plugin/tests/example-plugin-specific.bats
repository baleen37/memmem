#!/usr/bin/env bats
# Example Plugin plugin-specific tests
# Basic validation is handled in tests/ directory
# This plugin serves as a template, so minimal specific tests needed

load ../../../tests/helpers/bats_helper

PLUGIN_DIR="${PROJECT_ROOT}/plugins/example-plugin"

@test "example-plugin: demonstrates all component types" {
    # Should have at least one of each component type
    [ -d "${PLUGIN_DIR}/commands" ]
    [ -d "${PLUGIN_DIR}/agents" ]
    [ -d "${PLUGIN_DIR}/skills" ]
    [ -d "${PLUGIN_DIR}/hooks" ]
}

@test "example-plugin: hello command exists" {
    [ -f "${PLUGIN_DIR}/commands/hello.md" ]
}

@test "example-plugin: code-explorer agent exists" {
    [ -f "${PLUGIN_DIR}/agents/code-explorer.md" ]
}

@test "example-plugin: hello-skill exists" {
    [ -f "${PLUGIN_DIR}/skills/hello-skill/SKILL.md" ]
}
