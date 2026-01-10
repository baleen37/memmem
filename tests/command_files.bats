#!/usr/bin/env bats
# Test: Command files have valid frontmatter

load bats_helper

@test "Command files exist in plugins" {
    command_count=$(count_files "*.md" "${PROJECT_ROOT}/plugins/*/commands")
    [ "$command_count" -gt 0 ]
}

@test "Command files have frontmatter delimiter" {
    while IFS= read -r -d '' file; do
        has_frontmatter_delimiter "$file"
    done < <(find "${PROJECT_ROOT}/plugins" -path "*/commands/*.md" -type f -print0 2>/dev/null)
}
