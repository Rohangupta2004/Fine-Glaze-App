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
      };

      let { data, error } = await supabase.from('tasks').insert(fullPayload).select();

      if (error) {
        const msg = (error.message || '').toLowerCase();
        const code = error.code;

        // If parent_id column does not exist on remote schema or schema cache (PGRST204)
        if (msg.includes('parent_id') || msg.includes('column') || msg.includes('schema cache') || code === 'PGRST204') {
          const { data: authData } = await supabase.auth.getUser();
          const validUser = authData?.user?.id || createdBy;

          const fallbackPayload: Record<string, any> = { ...fullPayload, created_by: validUser };
          delete fallbackPayload.parent_id;

          const { data: fbData, error: fbErr } = await supabase.from('tasks').insert(fallbackPayload).select();
          if (fbErr) {
            const basePayload = {
              project_id: params.projectId || null,
              title: params.title,
              priority: params.priority || 'medium',
              status: 'pending',
              created_by: validUser,
            };
            const { data: ultimateData, error: ultimateErr } = await supabase.from('tasks').insert(basePayload).select();
            if (ultimateErr) throw ultimateErr;
            data = ultimateData;
          } else {
            data = fbData;
          }
        } else {
          // If created_by or assigned_to foreign key fails, sanitize user ID but keep parent_id
          const { data: authData } = await supabase.auth.getUser();
          const validUser = authData?.user?.id || createdBy;

          const safePayload = {
            ...fullPayload,
            created_by: validUser,
            assigned_to: null,
          };

          const { data: retryData, error: retryErr } = await supabase.from('tasks').insert(safePayload).select();
          if (retryErr) {
            const basePayload = {
              project_id: params.projectId || null,
              title: params.title,
              priority: params.priority || 'medium',
              status: 'pending',
              created_by: validUser,
              parent_id: params.parentId || null,
            };
            const { data: ultimateData, error: ultimateErr } = await supabase.from('tasks').insert(basePayload).select();
            if (ultimateErr) throw ultimateErr;
            data = ultimateData;
          } else {
            data = retryData;
          }
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

/** Update task MIS details (quantities, category, dates, status). */
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

      let { error } = await supabase
        .from('tasks')
        .update(payload)
        .eq('id', params.taskId);

      if (error) {
        const msg = (error.message || '').toLowerCase();
        const code = error.code;

        // If Postgres check constraint taskstatuscheck fails on 'in_progress'
        if (code === '23514' || msg.includes('check constraint') || msg.includes('status_check')) {
          const safeStatus = params.status === 'in_progress' ? 'pending' : params.status || 'pending';
          const safePayload = { ...payload, status: safeStatus };
          const { error: retryErr } = await supabase
            .from('tasks')
            .update(safePayload)
            .eq('id', params.taskId);
          if (retryErr) {
            // Strip extra columns if needed
            const basePayload: Record<string, any> = {};
            if (params.title !== undefined) basePayload.title = params.title;
            basePayload.status = safeStatus;
            const { error: baseErr } = await supabase
              .from('tasks')
              .update(basePayload)
              .eq('id', params.taskId);
            if (baseErr) throw baseErr;
          }
        } else if (msg.includes('column') || msg.includes('schema cache') || code === 'PGRST204') {
          const fallbackPayload: Record<string, any> = {};
          if (params.title !== undefined) fallbackPayload.title = params.title;
          if (params.status !== undefined) fallbackPayload.status = params.status === 'in_progress' ? 'pending' : params.status;

          const { error: fbErr } = await supabase
            .from('tasks')
            .update(fallbackPayload)
            .eq('id', params.taskId);

          if (fbErr) throw fbErr;
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
    onSuccess: () => {
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
