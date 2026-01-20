#!/usr/bin/env bats

# Tests for jira plugin structure and validity

@test "jira plugin directory exists" {
  [ -d "plugins/jira" ]
}

@test "jira .claude-plugin directory exists" {
  [ -d "plugins/jira/.claude-plugin" ]
}

@test "jira plugin.json exists" {
  [ -f "plugins/jira/.claude-plugin/plugin.json" ]
}

@test "jira .mcp.json exists" {
  [ -f "plugins/jira/.mcp.json" ]
}

@test "jira README.md exists" {
  [ -f "plugins/jira/README.md" ]
}

@test "jira plugin.json is valid JSON" {
  jq empty plugins/jira/.claude-plugin/plugin.json
}

@test "jira .mcp.json is valid JSON" {
  jq empty plugins/jira/.mcp.json
}

@test "jira plugin.json has required name field" {
  name=$(jq -r '.name' plugins/jira/.claude-plugin/plugin.json)
  [ "$name" = "jira" ]
}

@test "jira plugin.json has required version field" {
  version=$(jq -r '.version' plugins/jira/.claude-plugin/plugin.json)
  [ -n "$version" ]
  [[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]
}

@test "jira plugin.json has required description field" {
  description=$(jq -r '.description' plugins/jira/.claude-plugin/plugin.json)
  [ -n "$description" ]
}

@test "jira plugin.json has required author field" {
  author=$(jq -r '.author.name' plugins/jira/.claude-plugin/plugin.json)
  [ -n "$author" ]
}

@test "jira plugin registered in marketplace.json" {
  jq -e '.plugins[] | select(.name == "jira")' .claude-plugin/marketplace.json
}

@test "jira marketplace entry has matching version" {
  plugin_version=$(jq -r '.version' plugins/jira/.claude-plugin/plugin.json)
  marketplace_version=$(jq -r '.plugins[] | select(.name == "jira") | .version' .claude-plugin/marketplace.json)
  [ "$plugin_version" = "$marketplace_version" ]
}

@test "jira marketplace entry has correct source path" {
  source=$(jq -r '.plugins[] | select(.name == "jira") | .source' .claude-plugin/marketplace.json)
  [ "$source" = "./plugins/jira" ]
}

@test "jira marketplace entry has category" {
  category=$(jq -r '.plugins[] | select(.name == "jira") | .category' .claude-plugin/marketplace.json)
  [ -n "$category" ]
}

@test "jira marketplace entry has tags" {
  tags=$(jq -r '.plugins[] | select(.name == "jira") | .tags | length' .claude-plugin/marketplace.json)
  [ "$tags" -gt 0 ]
}

@test "jira .mcp.json has mcpServers wrapper" {
  jq -e '.mcpServers' plugins/jira/.mcp.json
}

@test "jira .mcp.json has atlassian server configuration" {
  jq -e '.mcpServers.atlassian' plugins/jira/.mcp.json
}

@test "jira .mcp.json atlassian config has command field" {
  command=$(jq -r '.mcpServers.atlassian.command' plugins/jira/.mcp.json)
  [ "$command" = "npx" ]
}

@test "jira .mcp.json atlassian config has args array" {
  args=$(jq -r '.mcpServers.atlassian.args | length' plugins/jira/.mcp.json)
  [ "$args" -gt 0 ]
}

@test "jira .mcp.json uses mcp-remote proxy" {
  args=$(jq -r '.mcpServers.atlassian.args | join(" ")' plugins/jira/.mcp.json)
  [[ "$args" =~ mcp-remote ]]
}
