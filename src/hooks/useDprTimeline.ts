import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Dpr, DprMedia } from '../types';

export interface DprTimelineEntry {
  dpr: Dpr;
  media: DprMedia[];
}

/**
 * Approved DPRs with their media for a given project — client media timeline.
 * Only returns DPRs with status='approved' that have at least one media item.
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

      const mediaByDpr = new Map<string, DprMedia[]>();
      for (const m of (mediaRows || []) as DprMedia[]) {
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
 * Public URL for a Supabase storage path.
 * Falls back to a placeholder if not configured.
 */
export function getDprMediaUrl(storagePath: string): string {
  const { data } = supabase.storage.from('dpr-media').getPublicUrl(storagePath);
  return data.publicUrl;
}
