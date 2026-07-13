import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { getSignedUrl } from '../lib/signedUrl';
import type { Dpr, DprMedia } from '../types';

export interface DprMediaWithUrl extends DprMedia {
  signedUrl: string;
}

export interface DprTimelineEntry {
  dpr: Dpr;
  media: DprMediaWithUrl[];
}

/**
 * Approved DPRs with their media for a given project — client media timeline.
 * Only returns DPRs with status='approved' that have at least one media item.
 * Media items include pre-resolved signed URLs for private storage.
 */
export function useDprTimeline(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['dpr-timeline', projectId],
    queryFn: async (): Promise<DprTimelineEntry[]> => {
      if (!projectId) return [];

      // Fetch approved DPRs for the project
      const { data: dprs, error: dprErr } = await supabase
        .from('dprs')
        .select('*')
        .eq('project_id', projectId)
        .eq('status', 'approved')
        .order('date', { ascending: false });

      if (dprErr) throw dprErr;
      if (!dprs?.length) return [];

      const dprIds = dprs.map((d: any) => d.id);

      // Fetch all media for those DPRs
      const { data: mediaRows, error: mediaErr } = await supabase
        .from('dpr_media')
        .select('*')
        .in('dpr_id', dprIds)
        .order('created_at', { ascending: true });

      if (mediaErr) throw mediaErr;

      // Resolve signed URLs for all media items in parallel
      const mediaWithUrls: DprMediaWithUrl[] = await Promise.all(
        ((mediaRows || []) as DprMedia[]).map(async (m) => ({
          ...m,
          signedUrl: await getSignedUrl('dpr-media', m.storage_path),
        }))
      );

      const mediaByDpr = new Map<string, DprMediaWithUrl[]>();
      for (const m of mediaWithUrls) {
        const arr = mediaByDpr.get(m.dpr_id) ?? [];
        arr.push(m);
        mediaByDpr.set(m.dpr_id, arr);
      }

      // Only include DPRs that have media
      return (dprs as Dpr[])
        .map((dpr) => ({ dpr, media: mediaByDpr.get(dpr.id) ?? [] }))
        .filter((entry) => entry.media.length > 0);
    },
    enabled: !!projectId,
  });
}

/**
 * Get a signed URL for a DPR media storage path.
 * Use this for one-off resolution outside the timeline hook.
 */
export async function getDprMediaSignedUrl(storagePath: string): Promise<string> {
  return getSignedUrl('dpr-media', storagePath);
}

/**
 * @deprecated Use getDprMediaSignedUrl (async) or SignedImage component instead.
 * Kept temporarily for backwards compatibility — returns broken public URL
 * since the bucket is now private.
 */
export function getDprMediaUrl(storagePath: string): string {
  console.warn(
    '[getDprMediaUrl] dpr-media is private. Use getDprMediaSignedUrl() or <SignedImage /> instead.'
  );
  const { data } = supabase.storage.from('dpr-media').getPublicUrl(storagePath);
  return data.publicUrl;
}
