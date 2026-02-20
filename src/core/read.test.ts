import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { tmpdir } from 'os';
import { join } from 'path';
import { existsSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import {
  readConversation,
  formatConversationAsMarkdown,
  filterValidMessages,
  formatTokenUsage,
  formatSidechainStart,
  formatSidechainEnd,
  getRoleLabel
} from './read.js';

interface ConversationMessage {
  uuid: string;
  parentUuid: string | null;
  timestamp: string;
  type: 'user' | 'assistant';
  isSidechain: boolean;
  message: {
    role: string;
    content: string | Array<{ type: string; text?: string; id?: string; name?: string; input?: any }>;
    usage?: {
      input_tokens: number;
      output_tokens: number;
    };
  };
}

describe('read.ts', () => {
  let db: Database.Database;
  let dbPath: string;
  let tempDir: string;

  beforeEach(() => {
    // Create a temporary database for testing
    dbPath = join(tmpdir(), `test-read-${Date.now()}.db`);
    db = new Database(dbPath);

    // Create temp directory for JSONL files
    tempDir = join(tmpdir(), `test-read-jsonl-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
    if (existsSync(dbPath)) {
      // Use rmSync instead of unlinkSync for directories
      rmSync(dbPath, { force: true });
    }
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  const createMessage = (overrides: any = {}): string => {
    const defaults = {
      uuid: 'msg-123',
      parentUuid: null,
      timestamp: '2024-01-01T12:00:00.000Z',
      type: 'user',
      isSidechain: false,
      sessionId: 'session-456',
      gitBranch: 'main',
      cwd: '/project',
      version: '1.0.0',
      message: {
        role: 'user',
        content: 'Hello, world!'
      }
    };
    return JSON.stringify({ ...defaults, ...overrides });
  };

  describe('readConversation()', () => {
    test('returns null when path does not exist', () => {
      const result = readConversation( '/nonexistent/path.jsonl');
      expect(result).toBeNull();
    });

    test('reads from JSONL file', () => {
      const jsonlPath = join(tempDir, 'test-conversation.jsonl');
      const jsonl = [
        createMessage({ type: 'user', message: { role: 'user', content: 'Hello from JSONL!' } }),
        createMessage({
          type: 'assistant',
          message: { role: 'assistant', content: 'Hi from JSONL!' }
        })
      ].join('\n');

      writeFileSync(jsonlPath, jsonl);

      const result = readConversation( jsonlPath);

      expect(result).not.toBeNull();
      expect(result).toContain('# Conversation');
      expect(result).toContain('Hello from JSONL!');
      expect(result).toContain('Hi from JSONL!');
      expect(result).toContain('**Session ID:** session-456');
    });

    test('returns null when JSONL file does not exist', () => {
      const result = readConversation( '/nonexistent/file.jsonl');
      expect(result).toBeNull();
    });

    test('respects startLine parameter when reading from JSONL', () => {
      const jsonlPath = join(tempDir, 'test-pagination.jsonl');
      const jsonl = [
        createMessage({ type: 'user', message: { role: 'user', content: 'Message 1' } }),
        createMessage({
          type: 'assistant',
          message: { role: 'assistant', content: 'Response 1' }
        }),
        createMessage({ type: 'user', message: { role: 'user', content: 'Message 2' } }),
        createMessage({
          type: 'assistant',
          message: { role: 'assistant', content: 'Response 2' }
        })
      ].join('\n');

      writeFileSync(jsonlPath, jsonl);

      const result = readConversation( jsonlPath, 3);

      expect(result).toContain('Message 2');
      expect(result).not.toContain('Message 1');
    });

    test('respects endLine parameter when reading from JSONL', () => {
      const jsonlPath = join(tempDir, 'test-pagination.jsonl');
      const jsonl = [
        createMessage({ type: 'user', message: { role: 'user', content: 'Message 1' } }),
        createMessage({
          type: 'assistant',
          message: { role: 'assistant', content: 'Response 1' }
        }),
        createMessage({ type: 'user', message: { role: 'user', content: 'Message 2' } }),
        createMessage({
          type: 'assistant',
          message: { role: 'assistant', content: 'Response 2' }
        })
      ].join('\n');

      writeFileSync(jsonlPath, jsonl);

      const result = readConversation( jsonlPath, undefined, 2);

      expect(result).toContain('Message 1');
      expect(result).toContain('Response 1');
      expect(result).not.toContain('Message 2');
    });

    test('respects startLine and endLine when reading from JSONL', () => {
      const jsonlPath = join(tempDir, 'test-pagination.jsonl');
      const jsonl = [
        createMessage({ type: 'user', message: { role: 'user', content: 'Message 1' } }),
        createMessage({
          type: 'assistant',
          message: { role: 'assistant', content: 'Response 1' }
        }),
        createMessage({ type: 'user', message: { role: 'user', content: 'Message 2' } }),
        createMessage({
          type: 'assistant',
          message: { role: 'assistant', content: 'Response 2' }
        }),
        createMessage({ type: 'user', message: { role: 'user', content: 'Message 3' } })
      ].join('\n');

      writeFileSync(jsonlPath, jsonl);

      const result = readConversation( jsonlPath, 3, 4);

      expect(result).not.toContain('Message 1');
      expect(result).toContain('Message 2');
      expect(result).toContain('Response 2');
      expect(result).not.toContain('Message 3');
    });

    test('formats tool use and results when reading from JSONL', () => {
      const jsonlPath = join(tempDir, 'test-tool.jsonl');
      const jsonl = [
        createMessage({ type: 'user', message: { role: 'user', content: 'Read file' } }),
        createMessage({
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [
              { type: 'text', text: 'I will read it' },
              {
                type: 'tool_use',
                id: 'tool-123',
                name: 'read_file',
                input: { file_path: '/path/to/file.txt' }
              }
            ]
          }
        })
      ].join('\n');

      writeFileSync(jsonlPath, jsonl);

      const result = readConversation( jsonlPath);

      expect(result).toContain('**Tool Use:** `read_file`');
      expect(result).toContain('**file_path:**');
      expect(result).toContain('/path/to/file.txt');
    });

    test('handles sidechain messages when reading from JSONL', () => {
      const jsonlPath = join(tempDir, 'test-sidechain.jsonl');
      const jsonl = [
        createMessage({
          type: 'user',
          isSidechain: true,
          message: { role: 'user', content: 'Sidechain user' }
        }),
        createMessage({
          type: 'assistant',
          isSidechain: true,
          message: { role: 'assistant', content: 'Sidechain agent' }
        })
      ].join('\n');

      writeFileSync(jsonlPath, jsonl);

      const result = readConversation( jsonlPath);

      expect(result).toContain('🔀 SIDECHAIN START');
      expect(result).toContain('🔀 SIDECHAIN END');
    });
  });

  describe('formatConversationAsMarkdown()', () => {
    test('formats simple user/assistant conversation', () => {
      const jsonl = [
        createMessage({ type: 'user', message: { role: 'user', content: 'Hello' } }),
        createMessage({
          type: 'assistant',
          message: { role: 'assistant', content: 'Hi there!' }
        })
      ].join('\n');

      const result = formatConversationAsMarkdown(jsonl);

      expect(result).toContain('# Conversation');
      expect(result).toContain('## Metadata');
      expect(result).toContain('**Session ID:** session-456');
      expect(result).toContain('**Git Branch:** main');
      expect(result).toContain('**Working Directory:** /project');
      expect(result).toContain('**Claude Code Version:** 1.0.0');
      expect(result).toContain('## Messages');
      expect(result).toContain('### **User**');
      expect(result).toContain('Hello');
      expect(result).toContain('### **Agent**');
      expect(result).toContain('Hi there!');
    });

    test('handles line range with 1-indexed line numbers', () => {
      const jsonl = [
        createMessage({ type: 'user', message: { role: 'user', content: 'Message 1' } }),
        createMessage({
          type: 'assistant',
          message: { role: 'assistant', content: 'Response 1' }
        }),
        createMessage({ type: 'user', message: { role: 'user', content: 'Message 2' } }),
        createMessage({
          type: 'assistant',
          message: { role: 'assistant', content: 'Response 2' }
        })
      ].join('\n');

      // startLine=3 should return from line 3 onwards (1-indexed)
      const result = formatConversationAsMarkdown(jsonl, 3);

      expect(result).toContain('Message 2');
      expect(result).not.toContain('Message 1');
    });

    test('handles empty input', () => {
      const result = formatConversationAsMarkdown('');
      expect(result).toBe('');
    });

    test('filters out system messages', () => {
      const jsonl = [
        createMessage({ type: 'system', message: { role: 'system', content: 'System msg' } }),
        createMessage({ type: 'user', message: { role: 'user', content: 'Hello' } }),
        createMessage({
          type: 'assistant',
          message: { role: 'assistant', content: 'Hi!' }
        })
      ].join('\n');

      const result = formatConversationAsMarkdown(jsonl);

      expect(result).not.toContain('System msg');
      expect(result).toContain('Hello');
    });

    test('groups sidechain content with markers', () => {
      const jsonl = [
        createMessage({
          type: 'user',
          message: { role: 'user', content: 'Main message' }
        }),
        createMessage({
          type: 'assistant',
          message: { role: 'assistant', content: 'Main response' }
        }),
        createMessage({
          type: 'user',
          isSidechain: true,
          message: { role: 'user', content: 'Sidechain user' }
        }),
        createMessage({
          type: 'assistant',
          isSidechain: true,
          message: { role: 'assistant', content: 'Sidechain agent' }
        }),
        createMessage({
          type: 'user',
          message: { role: 'user', content: 'Back to main' }
        })
      ].join('\n');

      const result = formatConversationAsMarkdown(jsonl);

      expect(result).toContain('🔀 SIDECHAIN START');
      expect(result).toContain('🔀 SIDECHAIN END');
      expect(result).toContain('Sidechain user');
      expect(result).toContain('Sidechain agent');
    });
  });
});

describe('filterValidMessages()', () => {
  const createMsg = (overrides: Partial<ConversationMessage> = {}): ConversationMessage => ({
    uuid: 'msg-1',
    parentUuid: null,
    timestamp: '2024-01-01T00:00:00Z',
    type: 'user',
    isSidechain: false,
    message: { role: 'user', content: 'Hello' },
    ...overrides
  });

  test('keeps user and assistant messages', () => {
    const messages = [
      createMsg({ type: 'user' }),
      createMsg({ type: 'assistant' })
    ];

    const result = filterValidMessages(messages);

    expect(result).toHaveLength(2);
  });

  test('filters out system messages', () => {
    const messages = [
      createMsg({ type: 'system' as any }),
      createMsg({ type: 'user' })
    ];

    const result = filterValidMessages(messages);

    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('user');
  });

  test('filters out messages without timestamp', () => {
    const messages = [
      createMsg({ timestamp: '' as any }),
      createMsg({ type: 'user' })
    ];

    const result = filterValidMessages(messages);

    expect(result).toHaveLength(1);
  });

  test('keeps assistant messages with only usage info', () => {
    const messages = [
      createMsg({
        type: 'assistant',
        message: { role: 'assistant', content: '', usage: { input_tokens: 10, output_tokens: 5 } }
      })
    ];

    const result = filterValidMessages(messages);

    expect(result).toHaveLength(1);
  });

  test('filters out messages with empty content array', () => {
    const messages = [
      createMsg({
        type: 'user',
        message: { role: 'user', content: [] }
      })
    ];

    const result = filterValidMessages(messages);

    expect(result).toHaveLength(0);
  });
});

describe('formatTokenUsage()', () => {
  test('formats basic usage', () => {
    const usage = { input_tokens: 100, output_tokens: 50 };

    const result = formatTokenUsage(usage);

    expect(result).toContain('in: 100');
    expect(result).toContain('out: 50');
  });

  test('formats cache read tokens', () => {
    const usage = { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 80 };

    const result = formatTokenUsage(usage);

    expect(result).toContain('cache read: 80');
  });

  test('formats cache creation tokens', () => {
    const usage = { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 20 };

    const result = formatTokenUsage(usage);

    expect(result).toContain('cache create: 20');
  });

  test('formats all token types together', () => {
    const usage = {
      input_tokens: 1000,
      output_tokens: 500,
      cache_read_input_tokens: 800,
      cache_creation_input_tokens: 200
    };

    const result = formatTokenUsage(usage);

    expect(result).toContain('in: 1,000');
    expect(result).toContain('cache read: 800');
    expect(result).toContain('cache create: 200');
    expect(result).toContain('out: 500');
  });
});

describe('formatSidechainStart()', () => {
  test('returns sidechain start marker', () => {
    const result = formatSidechainStart();

    expect(result).toContain('SIDECHAIN START');
    expect(result).toContain('---');
  });
});

describe('formatSidechainEnd()', () => {
  test('returns sidechain end marker', () => {
    const result = formatSidechainEnd();

    expect(result).toContain('SIDECHAIN END');
    expect(result).toContain('---');
  });
});

describe('getRoleLabel()', () => {
  test('returns User for non-sidechain user message', () => {
    const result = getRoleLabel('user', false);
    expect(result).toBe('User');
  });

  test('returns Agent for non-sidechain assistant message', () => {
    const result = getRoleLabel('assistant', false);
    expect(result).toBe('Agent');
  });

  test('returns Agent for sidechain user message', () => {
    const result = getRoleLabel('user', true);
    expect(result).toBe('Agent');
  });

  test('returns Subagent for sidechain assistant message', () => {
    const result = getRoleLabel('assistant', true);
    expect(result).toBe('Subagent');
  });
});
