#!/usr/bin/env bats
# Test: marketplace.json validation

load bats_helper

MARKETPLACE_JSON="${PROJECT_ROOT}/.claude-plugin/marketplace.json"

setup() {
    ensure_jq
}

@test "marketplace.json exists" {
    [ -f "$MARKETPLACE_JSON" ]
}

@test "marketplace.json is valid JSON" {
    validate_json "$MARKETPLACE_JSON"
}

@test "marketplace.json has required fields" {
    json_has_field "$MARKETPLACE_JSON" "name"
    json_has_field "$MARKETPLACE_JSON" "owner.name"
    json_has_field "$MARKETPLACE_JSON" "plugins"
}

@test "marketplace.json owner.name is not empty" {
    owner_name=$(json_get "$MARKETPLACE_JSON" "owner.name")
    [ -n "$owner_name" ]
}

@test "marketplace.json plugins array exists" {
    plugins=$($JQ_BIN -r '.plugins | type' "$MARKETPLACE_JSON")
    [ "$plugins" == "array" ]
}
