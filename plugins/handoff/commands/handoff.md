---
name: handoff
description: Save current session context to a handoff file for later restoration
---

# Save Handoff

Save the current session context to a handoff file.

## Steps

1. **Analyze the conversation** and generate:
   - A brief summary (2-3 sentences) of what was being worked on
   - Next steps (array of actionable items)
   - Key decisions made (array of decisions)

2. **Execute the handoff script** with the generated information:

```bash
SUMMARY="Brief summary of current work"
NEXT_STEPS='["Step 1", "Step 2"]'
DECISIONS='["Decision 1", "Decision 2"]'

"${CLAUDE_PLUGIN_ROOT}/scripts/handoff.sh" "$SUMMARY" "$NEXT_STEPS" "$DECISIONS"
```

## Example

```bash
# After analyzing conversation:
SUMMARY="Implementing handoff plugin pickup feature with bash scripts"
NEXT_STEPS='["Test pickup.sh with real handoff data", "Update documentation"]'
DECISIONS='["Use bash scripts instead of skills for simple commands", "Keep handoff.md for summary generation"]'

"${CLAUDE_PLUGIN_ROOT}/scripts/handoff.sh" "$SUMMARY" "$NEXT_STEPS" "$DECISIONS"
```
