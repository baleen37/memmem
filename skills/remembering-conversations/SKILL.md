---
name: remembering-conversations
description: Use when user asks 'how should I...' or 'what's the best approach...' after exploring code, OR when you've tried to solve something and are stuck, OR for unfamiliar workflows, OR when user references past work. Searches conversation history.
---

# Remembering Conversations

**Core principle:** Search before reinventing. Searching costs nothing; reinventing or repeating mistakes costs
everything.

## When to Use

You often get value out of consulting your episodic memory once you understand what you're being asked. Search memory
in these situations:

**After understanding the task:**

- User asks "how should I..." or "what's the best approach..."
- You've explored current codebase and need to make architectural decisions
- User asks for implementation approach after describing what they want

**When you're stuck:**

- You've investigated a problem and can't find the solution
- Facing a complex problem without obvious solution in current code
- Need to follow an unfamiliar workflow or process

**When historical signals are present:**

- User says "last time", "before", "we discussed", "you implemented"
- User asks "why did we...", "what was the reason..."
- User says "do you remember...", "what do we know about..."

**Don't search first:**

- For current codebase structure (use Grep/Read to explore first)
- For info in current conversation
- Before understanding what you're being asked to do

## How to Search

Use the MCP tools provided by conversation-memory plugin:

### Step 1: Search

Use `mcp__plugin_conversation-memory_conversation-memory__search` to find relevant conversations:

```typescript
{
  query: "React Router authentication errors",  // Single concept
  mode: "both",  // "vector" | "text" | "both" (default)
  limit: 10      // Max results (1-50, default: 10)
}
```

**Multi-concept AND search** (finds conversations containing ALL concepts):

```typescript
{
  query: ["authentication", "React Router", "error handling"],
  limit: 10
}
```

**Date filtering:**

```typescript
{
  query: "refactoring patterns",
  after: "2025-09-01",   // YYYY-MM-DD
  before: "2025-10-01"
}
```

### Step 2: Read Details

Use `mcp__plugin_conversation-memory_conversation-memory__read` to view full conversations:

```typescript
{
  path: "/path/from/search/results/conversation.jsonl"
}
```

**Paginate large conversations:**

```typescript
{
  path: "/path/to/conversation.jsonl",
  startLine: 100,  // 1-indexed
  endLine: 200
}
```

## Search Strategy

1. **Start broad**, then narrow:
   - First: `{ query: "authentication" }`
   - Then: `{ query: ["authentication", "JWT", "Express"] }`

2. **Use text mode for exact terms**:
   - IDs, error codes, exact phrases: `{ query: "ERR_AUTH_FAILED", mode: "text" }`

3. **Check top 2-5 results**:
   - Read snippets from search results
   - Use `read` tool for promising conversations
   - Focus on decisions, gotchas, patterns

4. **Synthesize findings**:
   - Summarize key insights (200-1000 words)
   - Include source paths and dates
   - Extract actionable recommendations

## Search Modes

- **`vector`** - Semantic similarity (best for concepts, ideas)
- **`text`** - Exact text matching (best for IDs, codes, exact phrases)
- **`both`** - Combined search (default, recommended for general use)

## Performance Tips

- Search is fast (< 100ms typically)
- Read can be slow for large conversations - use pagination
- Multi-concept search is more precise but may return fewer results
- Text search is case-insensitive

## Example Workflow

```text
User: "How should we implement authentication in the new API?"

1. Understand context:
   - Read current API code
   - Check existing auth patterns

2. Search memory:
   {
     query: ["authentication", "API", "JWT"],
     limit: 10
   }

3. Review top results:
   - Read 2-3 most relevant conversations
   - Note past decisions and rationale

4. Synthesize:
   - Summarize findings
   - Apply to current context
   - Recommend approach with sources
```

## Important Notes

- **Search costs nothing** - always check before reinventing
- **Past mistakes are valuable** - learn from failed approaches
- **Context matters** - past decisions may not apply to new situations
- **Sources are essential** - always cite conversation paths and dates
- **Saves 50-100x context** vs. loading raw conversations directly

## MCP Tools Reference

See README.md for complete API documentation of:

- `conversation-memory__search`
- `conversation-memory__read`
