/**
 * outbox.ts
 *
 * Core outbox queue helpers.  These are pure async functions that read/write
 * to outboxDb and contain no React or Zustand dependencies.
 *
 * Retry / back-off policy
 * ───────────────────────
 *  attempt 0 → immediate
 *  attempt 1 → 30 s
 *  attempt 2 → 2 min
 *  attempt 3 → 10 min
 *  attempt 4+ → 30 min (cap)
 */

import { getOutboxDb } from './outboxDb';

// ── Types ────────────────────────────────────────────────────────────────────

export type OutboxItemType = 'punch_in' | 'dpr';

export type OutboxItemStatus = 'pending' | 'syncing' | 'done' | 'error';

export interface PunchInPayload {
  profileId: string;
  projectId: string;
  lat: number;
  lng: number;
  selfieUri: string;
  locationVerified: boolean;
  capturedAt: string;
}

export interface DprPayload {
  projectId: string;
  submittedBy: string;
  workType: string;
  levelZone: string;
  workDone: string;
  reportDate: string;
  media: Array<{
    uri: string;
    type: 'photo' | 'video';
    durationS?: number | null;
    mimeType?: string | null;
    fileName?: string | null;
  }>;
}

export type OutboxPayload = PunchInPayload | DprPayload;

export interface OutboxItem {
  id: string;
  type: OutboxItemType;
  payload: OutboxPayload;
  status: OutboxItemStatus;
  attempts: number;
  last_error: string | null;
  next_retry_at: number | null;
  created_at: number;
  updated_at: number;
}

// ── Internal row type (SQLite returns plain strings/numbers) ─────────────────

interface OutboxRow {
  id: string;
  type: string;
  payload: string;
  status: string;
  attempts: number;
  last_error: string | null;
  next_retry_at: number | null;
  created_at: number;
  updated_at: number;
}

function rowToItem(row: OutboxRow): OutboxItem {
  return {
    id: row.id,
    type: row.type as OutboxItemType,
    payload: JSON.parse(row.payload) as OutboxPayload,
    status: row.status as OutboxItemStatus,
    attempts: row.attempts,
    last_error: row.last_error,
    next_retry_at: row.next_retry_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// ── Back-off helper ──────────────────────────────────────────────────────────

const BACKOFF_DELAYS_MS = [
  0,               // attempt 0 – immediate
  30_000,          // attempt 1 – 30 s
  120_000,         // attempt 2 – 2 min
  600_000,         // attempt 3 – 10 min
  1_800_000,       // attempt 4+ – 30 min
];

function nextRetryAt(attempts: number): number {
  const delay = BACKOFF_DELAYS_MS[Math.min(attempts, BACKOFF_DELAYS_MS.length - 1)];
  return Date.now() + delay;
}

// ── UUID helper (no external deps) ──────────────────────────────────────────

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Add an item to the outbox queue.
 * Returns the id of the newly created row.
 */
export async function enqueueOutboxItem(
  type: OutboxItemType,
  payload: OutboxPayload
): Promise<string> {
  const db = await getOutboxDb();
  const id = uuid();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO outbox_items
       (id, type, payload, status, attempts, last_error, next_retry_at, created_at, updated_at)
     VALUES (?, ?, ?, 'pending', 0, NULL, ?, ?, ?)`,
    [id, type, JSON.stringify(payload), nextRetryAt(0), now, now]
  );
  return id;
}

/**
 * Return all items that are ready to be synced:
 *   status IN ('pending','error')  AND  next_retry_at <= now
 */
export async function getPendingItems(): Promise<OutboxItem[]> {
  const db = await getOutboxDb();
  const now = Date.now();
  const rows = await db.getAllAsync<OutboxRow>(
    `SELECT * FROM outbox_items
     WHERE status IN ('pending','error')
       AND (next_retry_at IS NULL OR next_retry_at <= ?)
     ORDER BY created_at ASC`,
    [now]
  );
  return rows.map(rowToItem);
}

/**
 * Return all non-done items (for the sync-status UI).
 */
export async function getAllPendingItems(): Promise<OutboxItem[]> {
  const db = await getOutboxDb();
  const rows = await db.getAllAsync<OutboxRow>(
    `SELECT * FROM outbox_items
     WHERE status != 'done'
     ORDER BY created_at ASC`
  );
  return rows.map(rowToItem);
}

/** Mark an item as currently syncing. */
export async function markSyncing(id: string): Promise<void> {
  const db = await getOutboxDb();
  await db.runAsync(
    `UPDATE outbox_items SET status='syncing', updated_at=? WHERE id=?`,
    [Date.now(), id]
  );
}

/** Mark an item as successfully synced (done). */
export async function markDone(id: string): Promise<void> {
  const db = await getOutboxDb();
  await db.runAsync(
    `UPDATE outbox_items SET status='done', last_error=NULL, updated_at=? WHERE id=?`,
    [Date.now(), id]
  );
}

/** Mark an item as failed; bump attempts and schedule next retry. */
export async function markError(id: string, errorMessage: string): Promise<void> {
  const db = await getOutboxDb();
  // Read current attempts first
  const row = await db.getFirstAsync<{ attempts: number }>(
    `SELECT attempts FROM outbox_items WHERE id=?`,
    [id]
  );
  const attempts = (row?.attempts ?? 0) + 1;
  const retryAt = nextRetryAt(attempts);
  await db.runAsync(
    `UPDATE outbox_items
     SET status='error', attempts=?, last_error=?, next_retry_at=?, updated_at=?
     WHERE id=?`,
    [attempts, errorMessage, retryAt, Date.now(), id]
  );
}

/** Remove all done items (housekeeping). */
export async function purgeDoneItems(): Promise<void> {
  const db = await getOutboxDb();
  await db.runAsync(`DELETE FROM outbox_items WHERE status='done'`);
}
