# Dead Code Removal & Refactoring Design

## Approach: Bottom-up

Safe, incremental changes. Each phase is independent and testable. Run tests and commit after each phase.

## Phase 1: Dead Code Removal

Remove functions, types, and files that are not used in production code. Related tests are also deleted.

| # | Target | File | Action |
|---|--------|------|--------|
| 1 | `types.ts` | `src/core/types.ts` | Delete entire file (V2 legacy, never imported) |
| 2 | `generateExchangeEmbedding()` | `src/core/embeddings.ts:48-62` | Delete function (V2 legacy) |
| 3 | `getObserverPidPath()` | `src/core/paths.ts:120-122` | Delete function (completely unused) |
| 4 | `getExcludeConfigPath()` + `getExcludedProjects()` | `src/core/paths.ts:76-100` | Delete functions (feature not implemented) |
| 5 | `getPendingEventsV3()` (limit version) | `src/core/db.v3.ts:255-269` | Delete function (`getAllPendingEventsV3` is used instead) |
| 6 | `deleteOldPendingEventsV3()` | `src/core/db.v3.ts:275-292` | Delete function (cleanup feature not implemented) |
| 7 | `getPendingEventCountV3()` | `src/core/db.v3.ts:399-415` | Delete function (stats feature removed) |
| 8 | `getObservationCountV3()` | `src/core/db.v3.ts:378-394` | Delete function (test-only usage) |
| 9 | `searchByVector()` | `src/core/observations.v3.ts:169-226` | Delete function (`search.v3.ts` has its own implementation) |
| 10 | `findByProject()` | `src/core/observations.v3.ts:143-166` | Delete function (production unused) |
| 11 | `deleteObservation()` | `src/core/observations.v3.ts:228-245` | Delete function (production unused) |
| 12 | `createRateLimiter()` | `src/core/ratelimiter.ts:164-166` | Delete function (only singletons used) |

## Phase 2: Unnecessary Export Cleanup

| # | Target | File | Action |
|---|--------|------|--------|
| 1 | `formatConversationAsMarkdown()` | `src/core/read.ts:70` | Remove `export` (only called by `readConversation` in same file) |
| 2 | `SearchOptionsV3` | `src/core/db.v3.ts:51-57` | Remove `export` (only used within same file) |
| 3 | `deleteObservationV3()` | `src/core/db.v3.ts:359-373` | Delete function (sole consumer `deleteObservation()` removed in Phase 1) |

## Phase 3: LLM Provider Deduplication

Extract `BaseLLMProvider` abstract class to eliminate duplicated patterns across `GeminiProvider` and `ZAIProvider`:

- Rate limit acquisition
- Start/success/error logging
- Timing measurement
- Error wrapping

New file: `src/core/llm/base-provider.ts`

Each provider implements only `doComplete()` with API-specific logic.

## Phase 4: `formatConversationAsMarkdown()` Decomposition

Split 200-line function into focused helpers:

- `filterMessages()` - filter valid messages
- `formatMetadata()` - generate metadata header
- `formatMessage()` - format individual message (user/assistant branching, tool use/result matching)
- `formatSidechainTransition()` - sidechain boundary markers

`formatConversationAsMarkdown()` becomes a thin orchestrator composing these functions.

## Phase 5: `withDatabase()` Helper + Magic Number

Introduce `withDatabase<T>(fn: (db) => T): T` in `db.v3.ts` to replace repeated `openDatabase() → try/finally → db.close()` pattern in 5 call sites:

- `inject-cli.ts`
- `observe-cli.ts` (2 sites)
- `server.ts` (2 sites)

Extract magic number in `src/hooks/session-start.ts`:

```typescript
const CHARS_PER_TOKEN_ESTIMATE = 4;
```
