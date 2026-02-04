---
description: "Load a handoff session to restore context from a previous session with automatic reference resolution"
argument-hint: "[uuid]"
allowed-tools: ["Bash(${CLAUDE_PLUGIN_ROOT}/scripts/pickup.sh ${PASS_THROUGH_ARGS})"]
hide-from-slash-command-tool: "true"
---
# Pickup Handoff

Execute the pickup script:

```!
"${CLAUDE_PLUGIN_ROOT}/scripts/pickup.sh" ${PASS_THROUGH_ARGS}
```
