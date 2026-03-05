import Database from 'better-sqlite3';
import path from 'path';
import { logger } from '../logger.js';
import type { AgentRecord, ActionRecord, ActionStatus, ActionType } from '@aws/core';

const DB_PATH = process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'agents.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  // Ensure data dir exists
  const dir = path.dirname(DB_PATH);
  import('fs').then((fs) => fs.mkdirSync(dir, { recursive: true }));

  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  migrate(_db);
  logger.info({ path: DB_PATH }, 'Database opened');
  return _db;
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      publicKey TEXT NOT NULL UNIQUE,
      encryptedPrivateKey TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS actions (
      id TEXT PRIMARY KEY,
      agentId TEXT NOT NULL REFERENCES agents(id),
      type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      amount REAL,
      mint TEXT,
      signature TEXT,
      explorerUrl TEXT,
      startedAt TEXT NOT NULL,
      finishedAt TEXT,
      error TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_actions_agentId ON actions(agentId);
    CREATE INDEX IF NOT EXISTS idx_actions_status ON actions(status);
    CREATE INDEX IF NOT EXISTS idx_actions_type ON actions(type);
    CREATE INDEX IF NOT EXISTS idx_actions_startedAt ON actions(startedAt DESC);

    CREATE TABLE IF NOT EXISTS spl_mints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mint TEXT NOT NULL UNIQUE,
      decimals INTEGER NOT NULL DEFAULT 6,
      createdAt TEXT NOT NULL
    );
  `);
  logger.debug('DB migrations applied');
}

// ─── Agent DAO ───────────────────────────────────────────────────────────────

export function insertAgent(agent: AgentRecord): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO agents (id, name, publicKey, encryptedPrivateKey, createdAt)
    VALUES (@id, @name, @publicKey, @encryptedPrivateKey, @createdAt)
  `).run(agent);
}

export function getAllAgents(): AgentRecord[] {
  return getDb().prepare('SELECT * FROM agents ORDER BY createdAt DESC').all() as AgentRecord[];
}

export function getAgentById(id: string): AgentRecord | undefined {
  return getDb().prepare('SELECT * FROM agents WHERE id = ?').get(id) as AgentRecord | undefined;
}

export function getAgentCount(): number {
  const row = getDb().prepare('SELECT COUNT(*) as count FROM agents').get() as { count: number };
  return row.count;
}

// ─── Action DAO ──────────────────────────────────────────────────────────────

export function insertAction(action: ActionRecord): void {
  getDb()
    .prepare(`
    INSERT INTO actions (id, agentId, type, status, amount, mint, signature, explorerUrl, startedAt, finishedAt, error)
    VALUES (@id, @agentId, @type, @status, @amount, @mint, @signature, @explorerUrl, @startedAt, @finishedAt, @error)
  `)
    .run(action);
}

export function updateAction(
  id: string,
  updates: Partial<Pick<ActionRecord, 'status' | 'signature' | 'explorerUrl' | 'finishedAt' | 'error' | 'amount'>>
): void {
  const entries = Object.entries(updates).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return;
  const sets = entries.map(([k]) => `${k} = @${k}`).join(', ');
  getDb()
    .prepare(`UPDATE actions SET ${sets} WHERE id = @id`)
    .run({ id, ...Object.fromEntries(entries) });
}

export interface ListActionsFilter {
  agentId?: string;
  status?: ActionStatus;
  type?: ActionType;
  limit?: number;
  offset?: number;
}

export function listActions(filter: ListActionsFilter = {}): { actions: ActionRecord[]; total: number } {
  const db = getDb();
  const wheres: string[] = [];
  const params: Record<string, unknown> = {};

  if (filter.agentId) {
    wheres.push('agentId = @agentId');
    params.agentId = filter.agentId;
  }
  if (filter.status) {
    wheres.push('status = @status');
    params.status = filter.status;
  }
  if (filter.type) {
    wheres.push('type = @type');
    params.type = filter.type;
  }

  const where = wheres.length ? `WHERE ${wheres.join(' AND ')}` : '';
  const limit = filter.limit ?? 20;
  const offset = filter.offset ?? 0;

  const total = (db.prepare(`SELECT COUNT(*) as count FROM actions ${where}`).get(params) as { count: number }).count;
  const actions = db
    .prepare(`SELECT * FROM actions ${where} ORDER BY startedAt DESC LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit, offset }) as ActionRecord[];

  return { actions, total };
}

export function getLastActionForAgent(agentId: string): ActionRecord | undefined {
  return getDb()
    .prepare('SELECT * FROM actions WHERE agentId = ? ORDER BY startedAt DESC LIMIT 1')
    .get(agentId) as ActionRecord | undefined;
}

// ─── SPL Mint DAO ────────────────────────────────────────────────────────────

export function upsertSplMint(mint: string, decimals: number): void {
  getDb()
    .prepare(`
    INSERT INTO spl_mints (mint, decimals, createdAt)
    VALUES (@mint, @decimals, @createdAt)
    ON CONFLICT(mint) DO UPDATE SET decimals = excluded.decimals
  `)
    .run({ mint, decimals, createdAt: new Date().toISOString() });
}

export function getActiveSplMint(): { mint: string; decimals: number } | undefined {
  return getDb()
    .prepare('SELECT mint, decimals FROM spl_mints ORDER BY id DESC LIMIT 1')
    .get() as { mint: string; decimals: number } | undefined;
}
