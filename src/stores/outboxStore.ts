/**
 * outboxStore.ts
 *
 * Zustand store that:
 *  1. Mirrors the pending/error outbox items in memory for fast UI reads.
 *  2. Exposes `flushOutbox()` which sends each ready item to Supabase and
 *     marks it done/error accordingly.
 *  3. Tracks an `isSyncing` flag and the count of unsynced items.
 *
 * The store itself does NOT start timers — that is delegated to
 * `useOutboxSync` hook which drives flushes on connectivity and app-foreground
 * events.
 */

import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { uploadLocalMedia } from '../lib/mediaStorage';
import {
  enqueueOutboxItem,
  getPendingItems,
  getAllPendingItems,
  markSyncing,
  markDone,
  markError,
  purgeDoneItems,
  type OutboxItem,
  type OutboxItemType,
  type OutboxPayload,
  type PunchInPayload,
  type DprPayload,
} from '../lib/outbox';

// ── State shape ──────────────────────────────────────────────────────────────

interface OutboxState {
  /** Non-done outbox items (for UI rendering). */
  pendingItems: OutboxItem[];
  /** True while a flush pass is in-flight. */
  isSyncing: boolean;
  /** Count of items that have not yet been marked 'done'. */
  unsyncedCount: number;

  // ── Actions ──
  /** Load (or reload) pendingItems from SQLite. */
  loadPending: () => Promise<void>;
  /** Enqueue a punch-in event into the outbox. */
  enqueuePunchIn: (payload: PunchInPayload) => Promise<string>;
  /** Enqueue a DPR event into the outbox. */
  enqueueDpr: (payload: DprPayload) => Promise<string>;
  /**
   * Try to sync all ready items with Supabase.
   * Safe to call at any time; a no-op if already syncing.
   */
  flushOutbox: () => Promise<void>;
}

// ── Supabase sync handlers ───────────────────────────────────────────────────

async function syncPunchIn(payload: PunchInPayload, outboxId: string): Promise<void> {
  const selfiePath = await uploadLocalMedia(
    'attendance-selfies',
    `${payload.profileId}/${payload.capturedAt.slice(0, 10)}/${outboxId}`,
    { uri: payload.selfieUri, type: 'photo', mimeType: 'image/jpeg' },
  );
  const { error } = await supabase.from('attendance').upsert({
    profile_id: payload.profileId,
    project_id: payload.projectId,
    date: payload.capturedAt.slice(0, 10),
    check_in_at: payload.capturedAt,
    check_in_lat: payload.lat,
    check_in_lng: payload.lng,
    check_in_selfie_url: selfiePath,
    location_verified: payload.locationVerified,
    status: 'present',
    synced: true,
  }, { onConflict: 'profile_id,date' });
  if (error) throw new Error(error.message);
}

async function syncDpr(payload: DprPayload, outboxId: string): Promise<void> {
  const { data: existing } = await supabase
    .from('dprs')
    .select('id')
    .eq('offline_id', outboxId)
    .maybeSingle();

  let dprId = existing?.id as string | undefined;
  if (!dprId) {
    const { data, error } = await supabase.from('dprs').insert({
      project_id: payload.projectId,
      submitted_by: payload.submittedBy,
      date: payload.reportDate,
      work_type: payload.workType,
      level_zone: payload.levelZone,
      work_done: payload.workDone,
      status: 'submitted',
      synced: true,
      offline_id: outboxId,
    }).select('id').single();
    if (error) throw new Error(error.message);
    dprId = data.id;
  }

  for (let index = 0; index < payload.media.length; index += 1) {
    const file = payload.media[index];
    const path = await uploadLocalMedia(
      'dpr-media',
      `${payload.projectId}/${dprId}/${index}`,
      file,
    );
    const { error } = await supabase.from('dpr_media').upsert({
      dpr_id: dprId,
      type: file.type,
      storage_path: path,
      duration_s: file.durationS ?? null,
    }, { onConflict: 'dpr_id,storage_path' });
    if (error) throw new Error(error.message);
  }
}

async function syncItem(item: OutboxItem): Promise<void> {
  switch (item.type) {
    case 'punch_in':
      await syncPunchIn(item.payload as PunchInPayload, item.id);
      break;
    case 'dpr':
      await syncDpr(item.payload as DprPayload, item.id);
      break;
    default: {
      const _exhaustive: never = item.type;
      throw new Error(`Unknown outbox item type: ${_exhaustive}`);
    }
  }
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useOutboxStore = create<OutboxState>((set, get) => ({
  pendingItems: [],
  isSyncing: false,
  unsyncedCount: 0,

  loadPending: async () => {
    const items = await getAllPendingItems();
    set({ pendingItems: items, unsyncedCount: items.length });
  },

  enqueuePunchIn: async (payload: PunchInPayload) => {
    const id = await enqueueOutboxItem('punch_in', payload);
    await get().loadPending();
    return id;
  },

  enqueueDpr: async (payload: DprPayload) => {
    const id = await enqueueOutboxItem('dpr', payload);
    await get().loadPending();
    return id;
  },

  flushOutbox: async () => {
    if (get().isSyncing) return;
    set({ isSyncing: true });

    try {
      const readyItems = await getPendingItems();

      for (const item of readyItems) {
        await markSyncing(item.id);
        try {
          await syncItem(item);
          await markDone(item.id);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          await markError(item.id, msg);
        }
      }

      // Housekeeping: remove done rows older than 24 h (opportunistic)
      await purgeDoneItems();
    } finally {
      set({ isSyncing: false });
      // Reload UI state after flush
      await get().loadPending();
    }
  },
}));
