import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { initDatabaseV3 } from './db.v3.js';
import {
  create,
  findById,
  findByIds,
  findByProject
} from './observations.v3.js';

// Mock embedding generation - create a valid 768-dimensional vector
const createMockEmbedding = (): number[] => Array.from({ length: 768 }, () => Math.random() * 2 - 1);

// Mock generateEmbedding to avoid loading the model in tests
vi.mock('./embeddings.js', () => ({
  generateEmbedding: async () => createMockEmbedding(),
  initEmbeddings: async () => {}
}));

describe('observations.v3', () => {
  let db: Database.Database;
  let testDbPath: string;

  beforeEach(() => {
    // Use in-memory database for tests
    testDbPath = ':memory:';
    process.env.CONVERSATION_MEMORY_DB_PATH = testDbPath;
    db = initDatabaseV3();
  });

  afterEach(() => {
    db.close();
  });

  describe('create', () => {
    it('should create an observation with embedding and return id', async () => {
      const id = await create(
        db,
        'Test Observation',
        'This is the content of the observation',
        'test-project',
        'session-123',
        Date.now()
      );

      expect(id).toBeGreaterThan(0);

      // Verify the observation was inserted
      const obs = db.prepare('SELECT * FROM observations WHERE id = ?').get(id) as Record<string, unknown>;
      expect(obs).toBeDefined();
      expect(obs.title).toBe('Test Observation');
      expect(obs.content).toBe('This is the content of the observation');
      expect(obs.project).toBe('test-project');
      expect(obs.session_id).toBe('session-123');
    });

    it('should create observation without session_id', async () => {
      const id = await create(
        db,
        'Session-less Observation',
        'Content without session',
        'test-project'
      );

      expect(id).toBeGreaterThan(0);

      const obs = db.prepare('SELECT * FROM observations WHERE id = ?').get(id) as Record<string, unknown>;
      expect(obs).toBeDefined();
      expect(obs.session_id).toBeNull();
    });

    it('should generate and store embedding', async () => {
      const id = await create(
        db,
        'Test',
        'Content',
        'test-project'
      );

      // Check vector table
      const vecStmt = db.prepare('SELECT embedding FROM vec_observations WHERE id = ?');
      const vecResult = vecStmt.get(String(id)) as { embedding: Buffer } | undefined;

      expect(vecResult).toBeDefined();
      expect(Buffer.isBuffer(vecResult!.embedding)).toBe(true);
      expect(vecResult!.embedding.length).toBe(768 * 4); // 768 floats * 4 bytes
    });

    it('should use provided timestamp', async () => {
      const timestamp = 1234567890000;
      const id = await create(
        db,
        'Test',
        'Content',
        'test-project',
        undefined,
        timestamp
      );

      const obs = db.prepare('SELECT timestamp FROM observations WHERE id = ?').get(id) as Record<string, unknown>;
      expect(obs.timestamp).toBe(timestamp);
    });
  });

  describe('findById', () => {
    it('should retrieve observation by id', async () => {
      const id = await create(
        db,
        'Find Me',
        'Find my content',
        'test-project'
      );

      const observation = await findById(db, id);

      expect(observation).toBeDefined();
      expect(observation!.id).toBe(id);
      expect(observation!.title).toBe('Find Me');
      expect(observation!.content).toBe('Find my content');
      expect(observation!.project).toBe('test-project');
    });

    it('should return null for non-existent id', async () => {
      const observation = await findById(db, 99999);
      expect(observation).toBeNull();
    });
  });

  describe('findByIds', () => {
    it('should retrieve multiple observations by ids', async () => {
      const now = Date.now();
      const id1 = await create(db, 'Obs 1', 'Content 1', 'test-project', undefined, now - 200);
      await create(db, 'Obs 2', 'Content 2', 'test-project', undefined, now - 100);
      const id3 = await create(db, 'Obs 3', 'Content 3', 'test-project', undefined, now);

      const observations = await findByIds(db, [id1, id3]);

      expect(observations).toHaveLength(2);
      // Results are ordered by timestamp DESC, so id3 (newest timestamp) comes first
      expect(observations[0].title).toBe('Obs 3');
      expect(observations[1].title).toBe('Obs 1');
    });

    it('should return empty array for empty ids', async () => {
      const observations = await findByIds(db, []);
      expect(observations).toHaveLength(0);
    });

    it('should return empty array for non-existent ids', async () => {
      const observations = await findByIds(db, [99998, 99999]);
      expect(observations).toHaveLength(0);
    });
  });

  describe('findByProject', () => {
    it('should retrieve observations by project', async () => {
      await create(db, 'Obs 1', 'Content 1', 'project-a');
      await create(db, 'Obs 2', 'Content 2', 'project-a');
      await create(db, 'Obs 3', 'Content 3', 'project-b');

      const observations = await findByProject(db, 'project-a');

      expect(observations).toHaveLength(2);
      expect(observations[0].project).toBe('project-a');
      expect(observations[1].project).toBe('project-a');
    });

    it('should respect limit parameter', async () => {
      for (let i = 0; i < 5; i++) {
        await create(db, `Obs ${i}`, `Content ${i}`, 'project-c');
      }

      const observations = await findByProject(db, 'project-c', 3);

      expect(observations).toHaveLength(3);
    });

    it('should return empty array for non-existent project', async () => {
      const observations = await findByProject(db, 'non-existent');
      expect(observations).toHaveLength(0);
    });

    it('should order by timestamp DESC', async () => {
      const now = Date.now();
      await create(db, 'Old', 'Old content', 'project-d', undefined, now - 1000);
      await create(db, 'New', 'New content', 'project-d', undefined, now);
      await create(db, 'Middle', 'Middle content', 'project-d', undefined, now - 500);

      const observations = await findByProject(db, 'project-d');

      expect(observations[0].title).toBe('New');
      expect(observations[1].title).toBe('Middle');
      expect(observations[2].title).toBe('Old');
    });
  });
});
