#!/usr/bin/env node
/**
 * Observe CLI - Handle PostToolUse and Stop hooks for memmem.
 *
 * This script is called by the hooks system and:
 * - For PostToolUse: Compresses and stores tool events in pending_events
 * - For Stop: Batch extracts observations from pending_events using LLM
 */

import { openDatabase } from '../core/db.js';
import { handlePostToolUse } from '../hooks/post-tool-use.js';
import { handleStop } from '../hooks/stop.js';
import { loadConfig, createProvider } from '../core/llm/index.js';

/**
 * PostToolUse hook input from Claude Code.
 * See: https://code.claude.com/docs/en/hooks.md
 */
interface PostToolUseInput {
  tool_name: string;
  tool_input: Record<string, unknown>;
  tool_response: unknown;
  session_id?: string;
  tool_use_id?: string;
}

/**
 * Read stdin as JSON.
 */
function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.on('data', (chunk) => data += chunk);
    process.stdin.on('end', () => resolve(data));
  });
}

/**
 * Get session ID from stdin JSON first, then environment variables.
 * Claude Code injects session_id into the hook stdin JSON payload.
 */
function getSessionId(stdinSessionId?: string): string {
  return stdinSessionId || process.env.CLAUDE_SESSION_ID || process.env.CLAUDE_SESSION || 'unknown';
}

/**
 * Get project name from environment.
 */
function getProject(): string {
  return process.env.CLAUDE_PROJECT || process.env.CLAUDE_PROJECT_NAME || 'default';
}

/**
 * Derive the Claude project slug from CLAUDE_PROJECT_DIR.
 * Claude Code injects CLAUDE_PROJECT_DIR into all hook commands.
 * ~/.claude/projects/ directories are named by replacing '/' and '.' with '-' in the path.
 */
function getProjectSlug(): string | undefined {
  const projectDir = process.env.CLAUDE_PROJECT_DIR;
  if (!projectDir) {
    return undefined;
  }
  return projectDir.replace(/[/.]/g, '-');
}

/**
 * Handle PostToolUse hook.
 */
async function handleObserve(toolName: string, toolInput: unknown, toolResponse: unknown, stdinSessionId?: string): Promise<void> {
  const db = openDatabase();
  try {
    const sessionId = getSessionId(stdinSessionId);
    const project = getProject();

    // Merge tool_input and tool_response for compression
    // tool_input contains the arguments (file_path, command, etc.)
    // tool_response contains the result
    const mergedData = {
      ...((toolInput && typeof toolInput === 'object') ? toolInput : {}),
      ...(typeof toolResponse === 'object' && toolResponse !== null ? toolResponse : {}),
      // Include primitive responses as 'result' field
      ...(typeof toolResponse !== 'object' ? { result: toolResponse } : {}),
    };

    handlePostToolUse(db, sessionId, project, toolName, mergedData);
  } finally {
    db.close();
  }
}

/**
 * Handle Stop hook with summarization.
 */
async function handleSummarize(stdinSessionId?: string): Promise<void> {
  const db = openDatabase();
  try {
    const sessionId = getSessionId(stdinSessionId);
    const project = getProject();

    // Load LLM config
    const config = loadConfig();

    if (!config) {
      console.error('[memmem] No LLM config found, skipping observation extraction');
      return;
    }

    // Create LLM provider from config using factory function
    const provider = await createProvider(config);

    await handleStop(db, {
      provider,
      sessionId,
      project,
      projectSlug: getProjectSlug(),
    });
  } finally {
    db.close();
  }
}

async function main() {
  try {
    const command = process.argv[2];
    const shouldSummarize = command === '--summarize' || process.argv.includes('--summarize');

    // Read stdin for both PostToolUse and Stop hooks
    // Both hook types include session_id in their stdin JSON payload
    const stdinData = await readStdin();

    if (shouldSummarize) {
      // Stop hook - extract observations from pending events
      const stdinSessionId = stdinData.trim() ? (JSON.parse(stdinData) as { session_id?: string }).session_id : undefined;
      await handleSummarize(stdinSessionId);
    } else {
      // PostToolUse hook - compress and store tool event
      // Handle empty stdin (hook might not send data for all tools)
      if (!stdinData.trim()) {
        return;
      }

      const input = JSON.parse(stdinData) as PostToolUseInput;
      await handleObserve(input.tool_name, input.tool_input, input.tool_response, input.session_id);
    }
  } catch (error) {
    // Silent failure for async hooks to avoid disrupting session
    console.error(`[memmem] Error in observe: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(0);
  }
}

main();
