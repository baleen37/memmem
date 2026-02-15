/**
 * V3 Database Schema
 *
 * Clean slate redesign with simplified architecture:
 * - pending_events: Temporary storage for tool events before LLM extraction
 * - observations: Long-term storage for extracted insights
 * - vec_observations: Vector embeddings for semantic search
 *
 * Removed tables (no migration):
 * - exchanges (use conversation-archive directly)
 * - vec_exchanges (no longer needed)
 * - tool_calls (no longer needed)
 * - session_summaries (moved to observations)
 * - observations_fts (full-text search removed - use vector search only)
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import * as sqliteVec from 'sqlite-vec';
import { getDbPath } from './paths.js';

export interface PendingEventV3 {
  sessionId: string;
  project: string;
  toolName: string;
  compressed: string;
  timestamp: number;
  createdAt: number;
}

export interface ObservationV3 {
  title: string;
  content: string;
  project: string;
  sessionId?: string;
  timestamp: number;
  createdAt: number;
}

export interface ObservationResultV3 {
  id: number;
  title: string;
  content: string;
  project: string;
  sessionId: string | null;
  timestamp: number;
  createdAt: number;
}

interface SearchOptionsV3 {
  project?: string;
  sessionId?: string;
  after?: number;
  before?: number;
  limit?: number;
}

/**
 * Initialize V3 database with new schema
 * Deletes old database file if it exists (clean slate)
 */
export function initDatabaseV3(): Database.Database {
  return createDatabase(true);
}

/**
 * Open existing database or create new one if not exists.
 * Does not delete existing database.
 */
export function openDatabase(): Database.Database {
  return createDatabase(false);
}

/**
 * Create or open database.
 * @param wipe Whether to delete existing database file first
 */
function createDatabase(wipe: boolean): Database.Database {
  const dbPath = getDbPath();

  // Ensure directory exists
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  // Delete old database file if wipe is true (only if not in-memory)
  if (wipe && dbPath !== ':memory:' && fs.existsSync(dbPath)) {
    console.log('Deleting old database file for V3 clean slate...');
    fs.unlinkSync(dbPath);
  }

  const db = new Database(dbPath);

  // Load sqlite-vec extension
  sqliteVec.load(db);

  // Enable WAL mode for better concurrency
  db.pragma('journal_mode = WAL');

  // Check if tables exist, create if not
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[];
  const tableNames = new Set(tables.map(t => t.name));

  // Validate schema version - detect v2 database and prevent accidental use
  if (!wipe && tableNames.size > 0) {
    const v3Tables = ['pending_events', 'observations', 'vec_observations'];
    const hasV3Tables = v3Tables.every(t => tableNames.has(t));

    // If tables exist but v3 tables are missing, it might be a v2 database
    if (!hasV3Tables && tableNames.has('exchanges')) {
      throw new Error(
        'Database schema mismatch: v2 database detected. ' +
        'Please remove the old database (~/.config/memmem/conversation-index/conversations.db) ' +
        'and restart. V3 will create a fresh schema. ' +
        'Note: v2 data cannot be migrated to v3.'
      );
    }
  }

  // Create pending_events table if not exists
  if (!tableNames.has('pending_events')) {
    db.exec(`
      CREATE TABLE pending_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        project TEXT NOT NULL,
        tool_name TEXT NOT NULL,
        compressed TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);
    db.exec(`CREATE INDEX idx_pending_session ON pending_events(session_id)`);
    db.exec(`CREATE INDEX idx_pending_project ON pending_events(project)`);
    db.exec(`CREATE INDEX idx_pending_timestamp ON pending_events(timestamp)`);
  }

  // Create observations table if not exists
  if (!tableNames.has('observations')) {
    db.exec(`
      CREATE TABLE observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        project TEXT NOT NULL,
        session_id TEXT,
        timestamp INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);
    db.exec(`CREATE INDEX idx_observations_project ON observations(project)`);
    db.exec(`CREATE INDEX idx_observations_session ON observations(session_id)`);
    db.exec(`CREATE INDEX idx_observations_timestamp ON observations(timestamp DESC)`);
  }

  // Create vector table if not exists
  if (!tableNames.has('vec_observations')) {
    db.exec(`
      CREATE VIRTUAL TABLE vec_observations USING vec0(
        id TEXT PRIMARY KEY,
        embedding float[768]
      )
    `);
  }

  return db;
}

/**
 * Insert a pending event into the database
 */
export function insertPendingEventV3(
  db: Database.Database,
  event: PendingEventV3
): number {
  const stmt = db.prepare(`
    INSERT INTO pending_events (session_id, project, tool_name, compressed, timestamp, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    event.sessionId,
    event.project,
    event.toolName,
    event.compressed,
    event.timestamp,
    event.createdAt
  );

  return result.lastInsertRowid as number;
}

/**
 * Insert an observation into the database
 * Optionally includes vector embedding for semantic search
 */
export function insertObservationV3(
  db: Database.Database,
  observation: ObservationV3,
  embedding?: number[]
): number {
  // Insert into main table
  const stmt = db.prepare(`
    INSERT INTO observations (title, content, project, session_id, timestamp, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    observation.title,
    observation.content,
    observation.project,
    observation.sessionId ?? null,
    observation.timestamp,
    observation.createdAt
  );

  const rowid = result.lastInsertRowid as number;

  // Insert into vector table if embedding provided
  // Use the string id to link the tables
  if (embedding) {
    const vecStmt = db.prepare(`
      INSERT INTO vec_observations (id, embedding)
      VALUES (?, ?)
    `);
    vecStmt.run(String(rowid), Buffer.from(new Float32Array(embedding).buffer));
  }

  return rowid;
}

/**
 * Get all pending events for a session (no limit).
 * Used by Stop hook for batch extraction.
 */
export function getAllPendingEventsV3(
  db: Database.Database,
  sessionId: string
): Array<PendingEventV3 & { id: number }> {
  const stmt = db.prepare(`
    SELECT id, session_id as sessionId, project, tool_name as toolName, compressed, timestamp, created_at as createdAt
    FROM pending_events
    WHERE session_id = ?
    ORDER BY created_at ASC
  `);

  return stmt.all(sessionId) as Array<PendingEventV3 & { id: number }>;
}

/**
 * Search observations with filters
 */
export function searchObservationsV3(
  db: Database.Database,
  options: SearchOptionsV3 = {}
): ObservationResultV3[] {
  const { project, sessionId, after, before, limit = 100 } = options;

  const params: any[] = [];

  // Build query with optional filters
  let sql = `
    SELECT id, title, content, project, session_id as sessionId, timestamp, created_at as createdAt
    FROM observations
    WHERE 1=1
  `;

  if (project) {
    sql += ' AND project = ?';
    params.push(project);
  }

  if (sessionId) {
    sql += ' AND session_id = ?';
    params.push(sessionId);
  }

  if (after) {
    sql += ' AND timestamp >= ?';
    params.push(after);
  }

  if (before) {
    sql += ' AND timestamp <= ?';
    params.push(before);
  }

  sql += ' ORDER BY timestamp DESC LIMIT ?';
  params.push(limit);

  const stmt = db.prepare(sql);
  return stmt.all(...params) as ObservationResultV3[];
}

/**
 * Get a single observation by ID
 */
export function getObservationV3(
  db: Database.Database,
  id: number
): ObservationResultV3 | null {
  const stmt = db.prepare(`
    SELECT id, title, content, project, session_id as sessionId, timestamp, created_at as createdAt
    FROM observations
    WHERE id = ?
  `);

  const result = stmt.get(id) as ObservationResultV3 | undefined;
  return result ?? null;
}
