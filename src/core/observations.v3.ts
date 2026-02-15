/**
 * V3 Observations CRUD Operations
 *
 * Simplified observation system with just title + content.
 * Uses db.v3.ts for database operations.
 */

import Database from 'better-sqlite3';
import {
  ObservationV3,
  ObservationResultV3,
  insertObservationV3,
  getObservationV3,
  searchObservationsV3
} from './db.v3.js';
import { generateEmbedding, initEmbeddings } from './embeddings.js';

/**
 * Simplified Observation type for public API
 */
export interface Observation {
  id: number;
  title: string;
  content: string;
  project: string;
  sessionId: string | null;
  timestamp: number;
}

/**
 * Create a new observation with embedding.
 *
 * @param db - Database instance
 * @param title - Observation title
 * @param content - Observation content
 * @param project - Project name
 * @param sessionId - Optional session ID
 * @param timestamp - Optional timestamp (defaults to now)
 * @returns The ID of the created observation
 */
export async function create(
  db: Database.Database,
  title: string,
  content: string,
  project: string,
  sessionId?: string,
  timestamp?: number
): Promise<number> {
  const now = Date.now();
  const obsTimestamp = timestamp ?? now;

  const observation: ObservationV3 = {
    title,
    content,
    project,
    sessionId,
    timestamp: obsTimestamp,
    createdAt: now
  };

  // Initialize embeddings if not already done
  await initEmbeddings();

  // Generate embedding for the observation content
  // Use title and content for better searchability
  const embeddingText = `${title}\n${content}`;
  const embedding = await generateEmbedding(embeddingText);

  return insertObservationV3(db, observation, embedding);
}

/**
 * Find a single observation by ID.
 *
 * @param db - Database instance
 * @param id - Observation ID
 * @returns Observation or null if not found
 */
export async function findById(
  db: Database.Database,
  id: number
): Promise<Observation | null> {
  const result = getObservationV3(db, id);

  if (!result) {
    return null;
  }

  return {
    id: result.id,
    title: result.title,
    content: result.content,
    project: result.project,
    sessionId: result.sessionId,
    timestamp: result.timestamp
  };
}

/**
 * Find multiple observations by IDs.
 *
 * @param db - Database instance
 * @param ids - Array of observation IDs
 * @returns Array of observations (empty if none found)
 */
export async function findByIds(
  db: Database.Database,
  ids: number[]
): Promise<Observation[]> {
  if (ids.length === 0) {
    return [];
  }

  const placeholders = ids.map(() => '?').join(',');
  const stmt = db.prepare(`
    SELECT id, title, content, project, session_id as sessionId, timestamp
    FROM observations
    WHERE id IN (${placeholders})
    ORDER BY timestamp DESC
  `);

  const results = stmt.all(...ids) as ObservationResultV3[];

  return results.map(r => ({
    id: r.id,
    title: r.title,
    content: r.content,
    project: r.project,
    sessionId: r.sessionId,
    timestamp: r.timestamp
  }));
}

/**
 * Find observations by project.
 *
 * @param db - Database instance
 * @param project - Project name
 * @param limit - Optional limit (defaults to 100)
 * @returns Array of observations (empty if none found)
 */
export async function findByProject(
  db: Database.Database,
  project: string,
  limit: number = 100
): Promise<Observation[]> {
  const results = searchObservationsV3(db, { project, limit });

  return results.map(r => ({
    id: r.id,
    title: r.title,
    content: r.content,
    project: r.project,
    sessionId: r.sessionId,
    timestamp: r.timestamp
  }));
}
