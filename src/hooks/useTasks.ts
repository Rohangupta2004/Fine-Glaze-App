import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Task, TaskStatus, TaskPriority } from '../types';

/** Tasks for a project (admin view). */
export function useProjectTasks(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['tasks', 'project', projectId],
    queryFn: async (): Promise<Task[]> => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('window_start', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as Task[];
    },
    enabled: !!projectId,
  });
}

/** Create a task for a project. */
export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      projectId: string;
      title: string;
      assignedTo?: string | null;
      priority?: TaskPriority;
      levelZone?: string | null;
      windowStart?: string | null;
      windowEnd?: string | null;
      createdBy: string;
    }) => {
      const { error } = await supabase.from('tasks').insert({
        project_id: params.projectId,
        title: params.title,
        assigned_to: params.assignedTo || null,
        priority: params.priority || 'medium',
        level_zone: params.levelZone || null,
        window_start: params.windowStart || null,
        window_end: params.windowEnd || null,
        status: 'pending',
        created_by: params.createdBy,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

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
