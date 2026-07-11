import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Task, TaskStatus } from '../types';

/** Tasks assigned to the current user, optionally filtered by status. */
export function useMyTasks(profileId: string | null | undefined) {
  return useQuery({
    queryKey: ['tasks', 'mine', profileId],
    queryFn: async (): Promise<Task[]> => {
      if (!profileId) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('assigned_to', profileId)
        .order('window_start', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!profileId,
  });
}

/** Update a task's status (e.g. mark done). */
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: TaskStatus }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ status })
        .eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
