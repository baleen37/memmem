---
name: research
description: Use when exploring unfamiliar codebases, investigating bugs, or learning new technologies before acting
---

# Research

## Overview

Evidence-based exploration: **Observe → Explore → Verify → Summarize**.

**Core principle:** 30 minutes of targeted research beats hours of wrong implementation.

## When to Use

```
Need to understand before acting?
    │
    ├─ Unfamiliar codebase/architecture? → YES
    ├─ Investigating bug or unexpected behavior? → YES
    ├─ Learning new technology/framework? → YES
    └─ Simple, well-understood task? → NO (just do it)
```

**Use for:**
- Understanding requirements before implementation
- Investigating root causes
- Learning new domains
- Comparing approaches

**Don't use for:**
- Routine fixes in familiar code
- Well-documented APIs you know
- Simple mechanical changes

## Quick Reference

| Phase | Action | Tools | Output |
|-------|--------|-------|--------|
| **Observe** | Clarify question, identify unknowns | Ask clarifying questions | Clear research scope |
| **Explore** | Gather information from multiple sources | Read, Grep, Glob, mgrep --web, Explore agent | Raw findings with sources |
| **Verify** | Cross-check, test assumptions | Run code, compare sources, edge cases | Evidence-backed conclusions |
| **Summarize** | Document findings with confidence levels | Structured output | Actionable recommendations |

## Tool Selection

| Research Type | Primary Tools | Evidence Required |
|---------------|---------------|-------------------|
| **Codebase exploration** | Read, Grep, Glob, LSP | File paths, line numbers, actual code |
| **Bug investigation** | Read, Grep, logs, RUN CODE | Error messages, stack traces, reproduction |
| **New technology** | mgrep --web, Context7 | Official docs, version info, code examples |
| **Architecture understanding** | Read, diagram, compare | Component relationships, data flows |

## Evidence Standards

**Cross-reference threshold:** Verify with 3+ independent sources before concluding.

**Insufficient evidence:**
- "Read the code, it does X" → Which files? Which lines?
- "This approach works" → Tested? Verified?
- "Confident based on experience" → Experience ≠ verification
- Single source without verification → Cross-reference required

**Sufficient evidence:**
- "lib/state.sh:45-52 validates session_id with regex `^[a-zA-Z0-9_-]+$`"
- "Tested with empty session_id → exits with error code 1"
- "Verified against official docs v5.3.0"
- Cross-referenced across 3+ sources with consistent findings

**Negative evidence:** Explicitly document what's NOT there:
- "No 'prompt' or 'agent' hook type examples found in codebase"
- "No locking mechanism exists despite concurrent execution"
- "No test coverage for parallel execution scenarios"

## Rationalization (REJECT ALL)

| Excuse | Reality |
|--------|---------|
| "Code review is enough" | Code ≠ behavior. Test it. |
| "User wants fast answer" | Fast right > fast wrong. Rework takes longer. |
| "This is straightforward" | Simple still requires verification. Don't guess. |
| "Confident based on experience" | Confidence ≠ correctness. Verify with evidence. |
| "Too much to read" | 30 min targeted research vs hours of rework. |
| "Logic is sound" | Logical ≠ correct. Reality beats theory. |
| "Tests pass, must be user error" | Tests may not cover your scenario. Verify actual conditions. |
| "Simple read-write can't be broken" | Simple operations have race conditions without synchronization. |
| "Race conditions are rare" | Rare bugs become common at scale. Verify, don't assume. |
| "Just add a lock" | Locks add complexity. Verify the problem exists first. |
| "I've seen enough examples" | Patterns may have edge cases you haven't seen. Keep verifying. |
| "The schema tells me everything" | Schema defines structure, not behavior. Test it. |

## Red Flags - STOP

These thoughts mean you're rushing or rationalizing:

### Skipping Verification
- "Read enough, let's summarize" → Evidence ≠ volume. Quality sources matter.
- "Logic makes sense" → Theory ≠ reality. Test it.
- "No time to verify" → Verification prevents rework.

### Insufficient Evidence
- "I understand the pattern" → Verify in current codebase context.
- "This is standard practice" → Standard for what? When? Prove it.
- "Good enough to proceed" → Evidence-based or assumption-based?

### Premature Conclusions
- "Findings align with expectation" → Confirmation bias risk. Look for contradictions.
- "No issues found" → Did you look for edge cases? Error paths? Negative evidence?
- "Ready to implement" → Are findings documented with sources?
- "Seen enough examples" → Keep verifying. Patterns may have unseen edge cases.

**Research means evidence-first. Always.**

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Single-source reliance | Cross-reference findings from multiple sources (3+ minimum) |
| No documentation | Document as you go with file paths/line numbers |
| Skipping edge cases | Explicitly check error paths and boundaries |
| Logical inference only | Run code, verify actual behavior |
| Premature recommendations | Findings first, recommendations second |
| Ignoring negative evidence | Explicitly document what's NOT there or NOT working |
| Assuming tests cover everything | Tests may miss race conditions, parallel execution |
| Schema without verification | Schema defines structure, not behavior. Test it. |
| Codebase-only research | Check official docs for version-specific behavior |

## Output Format

```markdown
# Research Findings: [topic]

## Context
[Original question and research scope]

## Key Findings
[Primary discoveries with specific file paths and line numbers]

## Evidence Summary
- Source 1: [file:line or URL] - [specific quote or observation]
- Source 2: [file:line or URL] - [specific quote or observation]
- Source 3: [file:line or URL] - [specific quote or observation]

## Verification
[Test performed, actual results, edge cases checked]

## Open Questions
[Unresolved items requiring further research]

## Confidence Level
High / Medium / Low with rationale

## Recommendations
[Actionable next steps based on findings]
```
