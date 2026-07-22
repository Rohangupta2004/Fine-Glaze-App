import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Dpr } from '../types';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** DPRs for a project (admin view), most recent first. */
export function useProjectDprs(projectId: string | null | undefined, limit = 30) {
  return useQuery({
    queryKey: ['dprs', 'project', projectId, limit],
    queryFn: async (): Promise<Dpr[]> => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('dprs')
        .select('*')
        .eq('project_id', projectId)
        .order('date', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as Dpr[];
    },
    enabled: !!projectId,
  });
}

/** DPRs submitted by the current user, most recent first. */
export function useMyDprs(profileId: string | null | undefined, limit = 30) {
  return useQuery({
    queryKey: ['dprs', 'mine', profileId, limit],
    queryFn: async (): Promise<Dpr[]> => {
      if (!profileId) return [];
      const { data, error } = await supabase
        .from('dprs')
        .select('*')
        .eq('submitted_by', profileId)
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as Dpr[];
    },
    enabled: !!profileId,
  });
}

interface SubmitDprParams {
  projectId: string;
  submittedBy: string;
  workType: string;
  levelZone: string;
  workDone: string;
}

/** Submit a Daily Progress Report (status: submitted, ready for supervisor/admin review). */
export function useSubmitDpr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: SubmitDprParams) => {
      const { data, error } = await supabase
        .from('dprs')
        .insert({
          project_id: params.projectId,
          submitted_by: params.submittedBy,
          date: todayISO(),
          work_type: params.workType,
          level_zone: params.levelZone,
          work_done: params.workDone,
          status: 'submitted',
          synced: true,
        })
        .select()
        .single();
      if (error) throw error;
      return data as Dpr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dprs'] });
    },
  });
}

/** Admin deletion of a DPR report. */
export function useDeleteDpr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dprId: string) => {
      const { error } = await supabase.from('dprs').delete().eq('id', dprId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dprs'] });
      queryClient.invalidateQueries({ queryKey: ['dpr-timeline'] });
    },
  });
}
