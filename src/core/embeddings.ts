/**
 * Embeddings IPC client.
 * Delegates all embedding generation to the singleton embedding worker process.
 * Worker is auto-spawned on first use via Unix domain socket.
 *
 * Public API is unchanged: isEmbeddingsDisabled(), initEmbeddings(), generateEmbedding()
 */

import net from 'net';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';
import { getSuperpowersDir } from './paths.js';

function getSocketPath(): string {
  return path.join(getSuperpowersDir(), 'embedding-worker.sock');
}

export function isEmbeddingsDisabled(): boolean {
  return process.env.MEMMEM_DISABLE_EMBEDDINGS === 'true';
}

// No-op: worker starts lazily on first generateEmbedding() call
export async function initEmbeddings(): Promise<void> {}

// ── IPC client ──────────────────────────────────────────────────────────────

type PendingEntry = { resolve: (v: number[]) => void; reject: (e: Error) => void };

const RETRIES = 5;
const DELAYS_MS = [50, 100, 200, 400, 800];

let sharedSocket: net.Socket | null = null;
const pending = new Map<string, PendingEntry>();
let reqCounter = 0;
let workerSpawned = false;

// Test injection hook
let _workerConnector: (() => Promise<net.Socket>) | null = null;
export function __setWorkerConnectorForTests(fn: (() => Promise<net.Socket>) | null): void {
  _workerConnector = fn;
  sharedSocket = null; // reset shared socket
  pending.clear();
  reqCounter = 0;
  workerSpawned = false;
}

function getWorkerBinaryPath(): string {
  if (process.env.MEMMEM_WORKER_BINARY) return process.env.MEMMEM_WORKER_BINARY;
  const currentFile = fileURLToPath(import.meta.url);
  return path.join(path.dirname(currentFile), 'embedding-worker.mjs');
}

function spawnWorker(): void {
  if (workerSpawned) return;
  workerSpawned = true;
  const child = spawn(process.execPath, [getWorkerBinaryPath()], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env },
  });
  child.unref();
}

function tryConnect(sockPath: string): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(sockPath);
    socket.once('connect', () => resolve(socket));
    socket.once('error', reject);
    setTimeout(() => { socket.destroy(); reject(new Error('connect timeout')); }, 500);
  });
}

async function connectToWorker(): Promise<net.Socket> {
  if (_workerConnector) return _workerConnector();

  const sockPath = getSocketPath();
  for (let i = 0; i < RETRIES; i++) {
    try {
      return await tryConnect(sockPath);
    } catch {
      if (i === 0) spawnWorker();
      if (i < DELAYS_MS.length) await new Promise(r => setTimeout(r, DELAYS_MS[i]));
    }
  }
  throw new Error('embedding worker unavailable after retries');
}

async function getSocket(): Promise<net.Socket> {
  if (sharedSocket && !sharedSocket.destroyed) return sharedSocket;

  const socket = await connectToWorker();
  sharedSocket = socket;
  workerSpawned = false;

  let recvBuf = '';
  socket.on('data', chunk => {
    recvBuf += chunk.toString();
    let nl: number;
    while ((nl = recvBuf.indexOf('\n')) !== -1) {
      const line = recvBuf.slice(0, nl).trim();
      recvBuf = recvBuf.slice(nl + 1);
      if (!line) continue;
      try {
        const resp = JSON.parse(line) as { id: string; embedding?: number[]; error?: string };
        const entry = pending.get(resp.id);
        if (entry) {
          pending.delete(resp.id);
          if (resp.embedding) entry.resolve(resp.embedding);
          else entry.reject(new Error(resp.error ?? 'worker error'));
        }
      } catch { /* malformed response, ignore */ }
    }
  });

  socket.on('close', () => {
    sharedSocket = null;
    const err = new Error('embedding worker disconnected');
    for (const [, e] of pending) e.reject(err);
    pending.clear();
  });

  socket.on('error', () => { /* 'close' follows */ });

  return socket;
}

export async function generateEmbedding(text: string): Promise<number[] | null> {
  if (isEmbeddingsDisabled()) return null;

  try {
    const socket = await getSocket();
    const id = `emb-${++reqCounter}`;

    return await new Promise<number[]>((resolve, reject) => {
      pending.set(id, { resolve, reject });
      socket.write(JSON.stringify({ id, text }) + '\n', err => {
        if (err) { pending.delete(id); reject(err); }
      });
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error('embedding request timeout'));
        }
      }, 30_000);
    });
  } catch {
    return null;
  }
}
