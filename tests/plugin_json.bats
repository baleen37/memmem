#!/usr/bin/env bats
# Test: plugin.json validation

load bats_helper

PLUGIN_JSON="${PROJECT_ROOT}/plugins/example-plugin/.claude-plugin/plugin.json"

setup() {
    ensure_jq
}

@test "plugin.json exists" {
    [ -f "$PLUGIN_JSON" ]
}

@test "plugin.json is valid JSON" {
    validate_json "$PLUGIN_JSON"
}

@test "plugin.json has required fields" {
    json_has_field "$PLUGIN_JSON" "name"
    json_has_field "$PLUGIN_JSON" "description"
    json_has_field "$PLUGIN_JSON" "version"
    json_has_field "$PLUGIN_JSON" "author"
}

@test "plugin.json name follows naming convention" {
    name=$(json_get "$PLUGIN_JSON" "name")
    is_valid_plugin_name "$name"
}

@test "plugin.json fields are not empty" {
    name=$(json_get "$PLUGIN_JSON" "name")
    description=$(json_get "$PLUGIN_JSON" "description")
    version=$(json_get "$PLUGIN_JSON" "version")
    author=$(json_get "$PLUGIN_JSON" "author")

    [ -n "$name" ]
    [ -n "$description" ]
    [ -n "$version" ]
    [ -n "$author" ]
}
