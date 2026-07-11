import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Expense } from '../types';

/** Expenses for a project. */
export function useProjectExpenses(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['expenses', 'project', projectId],
    queryFn: async (): Promise<Expense[]> => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('project_id', projectId)
        .order('date', { ascending: false });
      if (error) throw error;
      return data as Expense[];
    },
    enabled: !!projectId,
  });
}

/** Add an expense entry. */
export function useAddExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      projectId: string;
      description: string;
      amount: number;
      category?: string | null;
      enteredBy: string;
      date?: string;
    }) => {
      const { error } = await supabase.from('expenses').insert({
        project_id: params.projectId,
        description: params.description,
        amount: params.amount,
        category: params.category || null,
        entered_by: params.enteredBy,
        date: params.date || new Date().toISOString().slice(0, 10),
        receipt_photo_path: null,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  });
}
