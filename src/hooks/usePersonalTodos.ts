import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function usePersonalTodos(profileId: string | null | undefined) {
  return useQuery({
    queryKey: ['personal-todos', profileId],
    queryFn: async () => {
      if (!profileId) return [];
      const { data, error } = await supabase.from('personal_todos').select('*').eq('profile_id', profileId).order('completed_at').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profileId,
  });
}

export function useCreatePersonalTodo() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ profileId, title, dueDate }: { profileId: string; title: string; dueDate?: string | null }) => {
      const { error } = await supabase.from('personal_todos').insert({ profile_id: profileId, title: title.trim(), due_date: dueDate || null });
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['personal-todos'] }),
  });
}

export function useTogglePersonalTodo() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase.from('personal_todos').update({ completed_at: completed ? new Date().toISOString() : null }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['personal-todos'] }),
  });
}
