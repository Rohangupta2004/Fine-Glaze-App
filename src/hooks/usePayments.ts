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

/** Create a new payment milestone for a project. */
export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      projectId: string;
      milestoneName: string;
      amount: number;
      status?: 'paid' | 'pending';
      dueDate?: string | null;
      paidAt?: string | null;
    }) => {
      const { error } = await supabase.from('payments').insert({
        project_id: params.projectId,
        milestone_name: params.milestoneName,
        amount: params.amount,
        status: params.status || 'pending',
        due_date: params.dueDate || null,
        paid_at: params.paidAt || null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  });
}

/** Delete a payment milestone. */
export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: string }) => {
      const { error } = await supabase.from('payments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments'] }),
  });
}
