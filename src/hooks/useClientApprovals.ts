import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { ClientApproval } from '../types';

/** All client approvals for a given project. */
export function useClientApprovals(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['client-approvals', projectId],
    queryFn: async (): Promise<ClientApproval[]> => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('client_approvals')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ClientApproval[];
    },
    enabled: !!projectId,
  });
}

/** Single client approval by id. */
export function useClientApproval(id: string | null | undefined) {
  return useQuery({
    queryKey: ['client-approval', id],
    queryFn: async (): Promise<ClientApproval | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('client_approvals')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as ClientApproval;
    },
    enabled: !!id,
  });
}

/** Decide a client approval — approve or reject. Once decided, immutable. */
export function useDecideClientApproval() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: 'approved' | 'rejected';
    }) => {
      const { error } = await supabase
        .from('client_approvals')
        .update({
          status,
          decided_at: new Date().toISOString(),
        })
        .eq('id', id)
        // Guard: only update if still pending (immutability on server side)
        .eq('status', 'pending');
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['client-approvals'] });
      qc.invalidateQueries({ queryKey: ['client-approval', v.id] });
    },
  });
}
