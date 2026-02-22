import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../core/db.js', () => ({
  openDatabase: vi.fn(),
}));

vi.mock('../hooks/post-tool-use.js', () => ({
  handlePostToolUse: vi.fn(),
}));

vi.mock('../hooks/stop.js', () => ({
  handleStop: vi.fn(),
}));

vi.mock('../core/llm/index.js', () => ({
  loadConfig: vi.fn(),
  createProvider: vi.fn(),
}));

type MockDb = {
  close: ReturnType<typeof vi.fn>;
};

type ObserveCliMocks = {
  openDatabase: ReturnType<typeof vi.fn>;
  handlePostToolUse: ReturnType<typeof vi.fn>;
  handleStop: ReturnType<typeof vi.fn>;
  loadConfig: ReturnType<typeof vi.fn>;
  createProvider: ReturnType<typeof vi.fn>;
};

async function getMocks(): Promise<ObserveCliMocks> {
  const db = await import('../core/db.js');
  const postToolUse = await import('../hooks/post-tool-use.js');
  const stop = await import('../hooks/stop.js');
  const llm = await import('../core/llm/index.js');

  return {
    openDatabase: db.openDatabase as ReturnType<typeof vi.fn>,
    handlePostToolUse: postToolUse.handlePostToolUse as ReturnType<typeof vi.fn>,
    handleStop: stop.handleStop as ReturnType<typeof vi.fn>,
    loadConfig: llm.loadConfig as ReturnType<typeof vi.fn>,
    createProvider: llm.createProvider as ReturnType<typeof vi.fn>,
  };
}

async function flushMain(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

async function runObserveCli(options: {
  argv?: string[];
  env?: Record<string, string | undefined>;
  stdin?: string;
}): Promise<void> {
  const originalArgv = process.argv;
  const originalEnv = process.env;

  process.argv = options.argv ?? ['node', 'observe-cli.js'];
  process.env = { ...originalEnv, ...(options.env ?? {}) };

  const stdinOnSpy = vi.spyOn(process.stdin, 'on').mockImplementation(((event: string, handler: (...args: unknown[]) => void) => {
    if (event === 'data' && typeof options.stdin === 'string') {
      handler(options.stdin);
    }
    if (event === 'end') {
      handler();
    }
    return process.stdin;
  }) as typeof process.stdin.on);

  try {
    await import('./observe-cli.js');
    await flushMain();
  } finally {
    stdinOnSpy.mockRestore();
    process.argv = originalArgv;
    process.env = originalEnv;
  }
}

describe('observe-cli behavior', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('routes summarize flow and calls handleStop with derived values', async () => {
    const mocks = await getMocks();
    const mockDb: MockDb = { close: vi.fn() };
    const mockConfig = { provider: 'gemini', apiKey: 'test-key', model: 'gemini-2.0-flash' };
    const mockProvider = { complete: vi.fn() };

    mocks.openDatabase.mockReturnValue(mockDb);
    mocks.loadConfig.mockReturnValue(mockConfig);
    mocks.createProvider.mockResolvedValue(mockProvider);
    mocks.handleStop.mockResolvedValue(undefined);

    await runObserveCli({
      argv: ['node', 'observe-cli.js', '--summarize'],
      env: {
        CLAUDE_SESSION_ID: 'env-session',
        CLAUDE_PROJECT: 'env-project',
        CLAUDE_PROJECT_DIR: '/Users/jito.hello/dev/wooto/memmem',
      },
      stdin: JSON.stringify({ session_id: 'stdin-session' }),
    });

    expect(mocks.loadConfig).toHaveBeenCalled();
    expect(mocks.createProvider).toHaveBeenCalledWith(mockConfig);
    expect(mocks.handleStop).toHaveBeenCalledWith(mockDb, {
      provider: mockProvider,
      sessionId: 'stdin-session',
      project: 'env-project',
      projectSlug: '-Users-jito-hello-dev-wooto-memmem',
    });
    expect(mocks.handlePostToolUse).not.toHaveBeenCalled();
    expect(mockDb.close).toHaveBeenCalled();
  });

  test('calls handlePostToolUse with merged payload and env fallback values', async () => {
    const mocks = await getMocks();
    const mockDb: MockDb = { close: vi.fn() };
    mocks.openDatabase.mockReturnValue(mockDb);

    await runObserveCli({
      argv: ['node', 'observe-cli.js'],
      env: {
        CLAUDE_SESSION_ID: undefined,
        CLAUDE_SESSION: 'fallback-session',
        CLAUDE_PROJECT: undefined,
        CLAUDE_PROJECT_NAME: 'fallback-project',
      },
      stdin: JSON.stringify({
        tool_name: 'Bash',
        tool_input: { command: 'npm test' },
        tool_response: { exitCode: 0 },
      }),
    });

    expect(mocks.handlePostToolUse).toHaveBeenCalledWith(
      mockDb,
      'fallback-session',
      'fallback-project',
      'Bash',
      { command: 'npm test', exitCode: 0 }
    );
    expect(mocks.handleStop).not.toHaveBeenCalled();
    expect(mockDb.close).toHaveBeenCalled();
  });

  test('prefers stdin session_id over env session for PostToolUse', async () => {
    const mocks = await getMocks();
    const mockDb: MockDb = { close: vi.fn() };
    mocks.openDatabase.mockReturnValue(mockDb);

    await runObserveCli({
      argv: ['node', 'observe-cli.js'],
      env: {
        CLAUDE_SESSION_ID: 'env-session-id',
        CLAUDE_PROJECT: 'test-project',
      },
      stdin: JSON.stringify({
        tool_name: 'Read',
        tool_input: { file_path: '/src/test.ts' },
        tool_response: { lines: 10 },
        session_id: 'stdin-session-id',
      }),
    });

    expect(mocks.handlePostToolUse).toHaveBeenCalledWith(
      mockDb,
      'stdin-session-id',
      'test-project',
      'Read',
      { file_path: '/src/test.ts', lines: 10 }
    );
  });

  test('returns early for empty stdin in non-summarize path', async () => {
    const mocks = await getMocks();

    await runObserveCli({
      argv: ['node', 'observe-cli.js'],
      stdin: '   \n\t  ',
    });

    expect(mocks.openDatabase).not.toHaveBeenCalled();
    expect(mocks.handlePostToolUse).not.toHaveBeenCalled();
    expect(mocks.handleStop).not.toHaveBeenCalled();
  });

  test('logs skip message when summarize config is missing', async () => {
    const mocks = await getMocks();
    const mockDb: MockDb = { close: vi.fn() };
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    mocks.openDatabase.mockReturnValue(mockDb);
    mocks.loadConfig.mockReturnValue(null);

    await runObserveCli({
      argv: ['node', 'observe-cli.js', '--summarize'],
      stdin: JSON.stringify({ session_id: 's1' }),
    });

    expect(errorSpy).toHaveBeenCalledWith('[memmem] No LLM config found, skipping observation extraction');
    expect(mocks.createProvider).not.toHaveBeenCalled();
    expect(mocks.handleStop).not.toHaveBeenCalled();
    expect(mockDb.close).toHaveBeenCalled();
  });

  test('logs error and exits 0 on invalid stdin JSON', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

    await runObserveCli({
      argv: ['node', 'observe-cli.js'],
      stdin: '{ invalid json }',
    });

    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('[memmem] Error in observe:'));
    expect(exitSpy).toHaveBeenCalledWith(0);
  });
});
