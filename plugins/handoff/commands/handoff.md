---
name: handoff
description: Save current session context to a handoff file for later restoration
argument-hint: ""
allowed-tools: ["Bash(${CLAUDE_PLUGIN_ROOT}/scripts/handoff.sh)"]
---

# Save Handoff

Analyze the conversation and extract a brief summary (2-3 sentences) of what was being worked on.

Then execute the handoff script:
```!
SUMMARY="..." "${CLAUDE_PLUGIN_ROOT}/scripts/handoff.sh" "$SUMMARY"
```
