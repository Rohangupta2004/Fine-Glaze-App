/**
 * outboxDb.ts
 *
 * Initialises and exports the shared expo-sqlite database used exclusively by
 * the local-first outbox queue.  All tables live in `outbox.db` so they stay
 * isolated from any other SQLite usage in the project.
 *
 * Schema
 * ──────
 * outbox_items
 *   id            TEXT PRIMARY KEY   – uuid generated at enqueue time
 *   type          TEXT NOT NULL      – 'punch_in' | 'dpr'
 *   payload       TEXT NOT NULL      – JSON-serialised operation payload
 *   status        TEXT NOT NULL      – 'pending' | 'syncing' | 'done' | 'error'
 *   attempts      INTEGER NOT NULL   – number of sync attempts made
 *   last_error    TEXT               – last error message if any
 *   next_retry_at INTEGER            – Unix-ms timestamp before which we won't retry
 *   created_at    INTEGER NOT NULL   – Unix-ms timestamp
 *   updated_at    INTEGER NOT NULL   – Unix-ms timestamp
 */

import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

const DB_NAME = 'outbox.db';

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS outbox_items (
    id            TEXT    PRIMARY KEY NOT NULL,
    type          TEXT    NOT NULL,
    payload       TEXT    NOT NULL,
    status        TEXT    NOT NULL DEFAULT 'pending',
    attempts      INTEGER NOT NULL DEFAULT 0,
    last_error    TEXT,
    next_retry_at INTEGER,
    created_at    INTEGER NOT NULL,
    updated_at    INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_outbox_status ON outbox_items(status);
`;

export async function getOutboxDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync(DB_NAME);
  await _db.execAsync(SCHEMA_SQL);
  return _db;
}
