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

/** Create a task for a project (with optional MIS fields). */
export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      projectId?: string | null;
      title: string;
      assignedTo?: string | null;
      priority?: TaskPriority;
      levelZone?: string | null;
      windowStart?: string | null;
      windowEnd?: string | null;
      createdBy: string;
      checklist?: any[];
      parentId?: string | null;
      category?: string | null;
      unit?: string | null;
      plannedQuantity?: number;
      completedQuantity?: number;
      startDate?: string | null;
      endDate?: string | null;
      clientVisible?: boolean;
    }) => {
      let createdBy = params.createdBy;
      if (!createdBy) {
        const { data: authData } = await supabase.auth.getUser();
        if (authData?.user?.id) createdBy = authData.user.id;
      }

      const fullPayload: Record<string, any> = {
        project_id: params.projectId || null,
        title: params.title,
        assigned_to: params.assignedTo || null,
        priority: params.priority || 'medium',
        status: 'pending',
        created_by: createdBy,
        parent_id: params.parentId || null,
        category: params.category || 'Facade',
        unit: params.unit || 'Sqm',
        planned_quantity: params.plannedQuantity || 0,
        completed_quantity: params.completedQuantity || 0,
        start_date: params.startDate || null,
        end_date: params.endDate || null,
        checklist: params.checklist || [],
        client_visible: params.clientVisible ?? false,
      };

      let { data, error } = await supabase.from('tasks').insert(fullPayload).select();

      if (error) {
        console.error('[useCreateTask] Error creating task:', error);
        const msg = (error.message || '').toLowerCase();
        // If client_visible or checklist column is missing in schema cache, sanitize and retry
        if (msg.includes('client_visible') || msg.includes('checklist') || error.code === 'PGRST204') {
          const safePayload = { ...fullPayload };
          delete safePayload.client_visible;
          delete safePayload.checklist;
          const { data: retryData, error: retryErr } = await supabase.from('tasks').insert(safePayload).select();
          if (retryErr) throw retryErr;
          data = retryData;
        } else {
          throw error;
        }
      }

      if (params.assignedTo && params.assignedTo !== params.createdBy && data?.[0]) {
        await supabase.from('notifications').insert({
          recipient_id: params.assignedTo,
          kind: 'task_assigned',
          title: 'New Task Assigned',
          body: `You have been assigned: ${params.title}`,
          ref_table: 'tasks',
          ref_id: data[0].id,
          important: params.priority === 'high',
        });
      }

      return data?.[0] as Task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['personal-todos'] });
    },
  });
}

/** Update task MIS details (quantities, category, dates, status, checklist, client_visible). */
export function useUpdateTaskMIS() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      taskId: string;
      title?: string;
      category?: string;
      unit?: string;
      plannedQuantity?: number;
      completedQuantity?: number;
      startDate?: string | null;
      endDate?: string | null;
      status?: TaskStatus;
      parentId?: string | null;
      checklist?: any[];
      clientVisible?: boolean;
    }) => {
      const payload: Record<string, any> = {};
      if (params.title !== undefined) payload.title = params.title;
      if (params.category !== undefined) payload.category = params.category;
      if (params.unit !== undefined) payload.unit = params.unit;
      if (params.plannedQuantity !== undefined) payload.planned_quantity = params.plannedQuantity;
      if (params.completedQuantity !== undefined) payload.completed_quantity = params.completedQuantity;
      if (params.startDate !== undefined) payload.start_date = params.startDate;
      if (params.endDate !== undefined) payload.end_date = params.endDate;
      if (params.status !== undefined) payload.status = params.status;
      if (params.parentId !== undefined) payload.parent_id = params.parentId;
      if (params.checklist !== undefined) payload.checklist = params.checklist;
      if (params.clientVisible !== undefined) payload.client_visible = params.clientVisible;

      let { error } = await supabase
        .from('tasks')
        .update(payload)
        .eq('id', params.taskId);

      if (error) {
        console.error('[useUpdateTaskMIS] Error updating task:', error);
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('client_visible') || msg.includes('checklist') || error.code === 'PGRST204') {
          const safePayload = { ...payload };
          delete safePayload.client_visible;
          delete safePayload.checklist;
          const { error: retryErr } = await supabase
            .from('tasks')
            .update(safePayload)
            .eq('id', params.taskId);
          if (retryErr) throw retryErr;
        } else {
          throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
    },
  });
}

/** Tasks assigned to or created by the current user. */
export function useMyTasks(profileId: string | null | undefined) {
  return useQuery({
    queryKey: ['tasks', 'mine', profileId],
    queryFn: async (): Promise<Task[]> => {
      if (!profileId) return [];
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .or(`assigned_to.eq.${profileId},created_by.eq.${profileId}`)
        .order('created_at', { ascending: false });
      if (error) {
        // Fallback query if .or fails
        const { data: fallback, error: fErr } = await supabase
          .from('tasks')
          .select('*')
          .eq('assigned_to', profileId);
        if (fErr) throw fErr;
        return fallback as Task[];
      }
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
      const completedAt = status === 'done' ? new Date().toISOString() : null;
      const { error } = await supabase
        .from('tasks')
        .update({ status, completed_at: completedAt })
        .eq('id', taskId);
      if (error) throw error;
    },
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData(['tasks']);
      const completedAt = status === 'done' ? new Date().toISOString() : null;
      queryClient.setQueriesData({ queryKey: ['tasks'] }, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((t: Task) => (t.id === taskId ? { ...t, status, completed_at: completedAt } : t));
      });
      return { previousTasks };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['project'] });
    },
  });
}

/** Update a task's checklist. */
export function useUpdateTaskChecklist() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ taskId, checklist }: { taskId: string; checklist: any[] }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ checklist })
        .eq('id', taskId);
      if (error) throw error;
    },
    onMutate: async ({ taskId, checklist }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData(['tasks']);
      queryClient.setQueriesData({ queryKey: ['tasks'] }, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map((t: Task) => (t.id === taskId ? { ...t, checklist } : t));
      });
      return { previousTasks };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTasks) {
        queryClient.setQueryData(['tasks'], context.previousTasks);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

/** Admin deletion of a task. */
export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
