import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Payment } from '../types';

/** Payment milestones for a project. */
export function useProjectPayments(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['payments', projectId],
    queryFn: async (): Promise<Payment[]> => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('project_id', projectId)
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data as Payment[];
    },
    enabled: !!projectId,
  });
}

/** All payments across projects (admin view). */
export function useAllPayments() {
  return useQuery({
    queryKey: ['payments', 'all'],
    queryFn: async (): Promise<Payment[]> => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('due_date', { ascending: true });
      if (error) throw error;
      return data as Payment[];
    },
  });
}

/** Toggle payment status. */
export function useUpdatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'paid' | 'pending' }) => {
      const { error } = await supabase.from('payments').update({
        status,
        paid_at: status === 'paid' ? new Date().toISOString() : null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  });
}
