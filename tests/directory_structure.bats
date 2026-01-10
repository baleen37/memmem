#!/usr/bin/env bats
# Test: Required directory structure

load helpers/bats_helper

@test "Required directories exist" {
    [ -d "${PROJECT_ROOT}/.claude-plugin" ]
    [ -d "${PROJECT_ROOT}/plugins" ]

    # Check example plugin structure
    [ -d "${PROJECT_ROOT}/plugins/example-plugin" ]
    [ -d "${PROJECT_ROOT}/plugins/example-plugin/.claude-plugin" ]
    [ -d "${PROJECT_ROOT}/plugins/example-plugin/commands" ]
    [ -d "${PROJECT_ROOT}/plugins/example-plugin/agents" ]
    [ -d "${PROJECT_ROOT}/plugins/example-plugin/skills" ]
    [ -d "${PROJECT_ROOT}/plugins/example-plugin/hooks" ]
}

@test "Plugin directories follow naming convention" {
    # Plugin directories should be lowercase with hyphens
    for plugin_dir in "${PROJECT_ROOT}/plugins"/*; do
        if [ -d "$plugin_dir" ]; then
            plugin_name=$(basename "$plugin_dir")
            is_valid_plugin_name "$plugin_name"
        fi
    done
}
