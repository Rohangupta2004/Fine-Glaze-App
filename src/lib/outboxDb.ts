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

import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

let _db: any = null;

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

class WebOutboxDb {
  private getStorage(): any[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const data = localStorage.getItem('__outbox_items__');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  private setStorage(items: any[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem('__outbox_items__', JSON.stringify(items));
    } catch (e) {
      console.warn('Failed to save outbox to localStorage', e);
    }
  }

  async execAsync(_sql: string): Promise<void> {}

  async runAsync(sql: string, params: any[] = []): Promise<{ lastInsertRowId: number; changes: number }> {
    let items = this.getStorage();
    if (sql.includes('INSERT INTO outbox_items')) {
      const [id, type, payload, next_retry_at, created_at, updated_at] = params;
      items.push({
        id,
        type,
        payload,
        status: 'pending',
        attempts: 0,
        last_error: null,
        next_retry_at,
        created_at,
        updated_at,
      });
      this.setStorage(items);
    } else if (sql.includes("status='syncing'")) {
      const [updated_at, id] = params;
      items = items.map((item) => (item.id === id ? { ...item, status: 'syncing', updated_at } : item));
      this.setStorage(items);
    } else if (sql.includes("status='done'")) {
      const [updated_at, id] = params;
      items = items.map((item) => (item.id === id ? { ...item, status: 'done', last_error: null, updated_at } : item));
      this.setStorage(items);
    } else if (sql.includes("status='error'")) {
      const [attempts, last_error, next_retry_at, updated_at, id] = params;
      items = items.map((item) =>
        item.id === id ? { ...item, status: 'error', attempts, last_error, next_retry_at, updated_at } : item,
      );
      this.setStorage(items);
    } else if (sql.includes("WHERE status='done'")) {
      items = items.filter((item) => item.status !== 'done');
      this.setStorage(items);
    }
    return { lastInsertRowId: 1, changes: 1 };
  }

  async getAllAsync<T>(sql: string, params: any[] = []): Promise<T[]> {
    const items = this.getStorage();
    if (sql.includes("WHERE status IN ('pending','error')")) {
      const [now] = params;
      return items.filter(
        (i) => (i.status === 'pending' || i.status === 'error') && (!i.next_retry_at || i.next_retry_at <= now),
      ) as T[];
    } else if (sql.includes("WHERE status != 'done'")) {
      return items.filter((i) => i.status !== 'done') as T[];
    }
    return items as T[];
  }

  async getFirstAsync<T>(_sql: string, params: any[] = []): Promise<T | null> {
    const items = this.getStorage();
    const [id] = params;
    const found = items.find((i) => i.id === id);
    return (found as T) || null;
  }
}

export async function getOutboxDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  if (Platform.OS === 'web') {
    _db = new WebOutboxDb() as unknown as SQLite.SQLiteDatabase;
    return _db;
  }
  _db = await SQLite.openDatabaseAsync(DB_NAME);
  await _db.execAsync(SCHEMA_SQL);
  return _db;
}
