import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { SafetyCheck } from '../types';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Today's safety check for the current user (null if not yet submitted). */
export function useTodaySafetyCheck(profileId: string | null | undefined) {
  return useQuery({
    queryKey: ['safety_checks', 'today', profileId],
    queryFn: async (): Promise<SafetyCheck | null> => {
      if (!profileId) return null;
      const { data, error } = await supabase
        .from('safety_checks')
        .select('*')
        .eq('profile_id', profileId)
        .eq('date', todayISO())
        .maybeSingle();
      if (error) throw error;
      return data as SafetyCheck | null;
    },
    enabled: !!profileId,
  });
}

/** Submit a daily safety checklist. */
export function useSubmitSafetyCheck() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      profileId: string;
      projectId: string;
      items: Record<string, boolean>;
      concernReported: string | null;
    }) => {
      const { error } = await supabase.from('safety_checks').insert({
        profile_id: params.profileId,
        project_id: params.projectId,
        date: todayISO(),
        items: params.items,
        concern_reported: params.concernReported,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['safety_checks'] });
    },
  });
}
