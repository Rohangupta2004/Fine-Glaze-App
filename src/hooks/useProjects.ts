import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Project } from '../types';

/** All projects for the company (admin/supervisor use). */
export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Project[];
    },
  });
}

/** Single project by id. */
export function useProject(projectId: string | null | undefined) {
  return useQuery({
    queryKey: ['projects', projectId],
    queryFn: async (): Promise<Project | null> => {
      if (!projectId) return null;
      const { data, error } = await supabase.from('projects').select('*').eq('id', projectId).single();
      if (error) throw error;
      return data as Project;
    },
    enabled: !!projectId,
  });
}

/** Admin-controlled project progress and status. */
export function useUpdateProject() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Pick<Project, 'progress_pct' | 'status' | 'stage' | 'expected_end_date'>> }) => {
      const { error } = await supabase.from('projects').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['projects'] }),
  });
}

/** Admin deletion of a project with multi-level cascade cleanup (prevents foreign key violation errors). */
export function useDeleteProject() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (projectId: string) => {
      // 1. Try server RPC function first
      const { error: rpcErr } = await supabase.rpc('delete_project_cascade', {
        p_project_id: projectId,
      });

      if (!rpcErr) return;

      console.warn('[useDeleteProject] RPC missing or failed, executing client-side cascade cleanup:', rpcErr.message);

      // 2. Client-side sequential cascade cleanup in order of dependency
      try {
        // Fetch DPR IDs for this project
        const { data: dprList } = await supabase.from('dprs').select('id').eq('project_id', projectId);
        const dprIds = (dprList || []).map((d) => d.id);

        if (dprIds.length > 0) {
          await supabase.from('dpr_boq_items').delete().in('dpr_id', dprIds);
        }

        // Delete DPRs
        await supabase.from('dprs').delete().eq('project_id', projectId);

        // Delete BOQ items, tasks, assignments, documents
        await supabase.from('project_boq_items').delete().eq('project_id', projectId);
        await supabase.from('tasks').delete().eq('project_id', projectId);
        await supabase.from('assignments').delete().eq('project_id', projectId);
        await supabase.from('documents').delete().eq('project_id', projectId);

        // Fetch & delete Conversations + Chat Messages
        const { data: convList } = await supabase.from('conversations').select('id').eq('project_id', projectId);
        const convIds = (convList || []).map((c) => c.id);
        if (convIds.length > 0) {
          await supabase.from('messages').delete().in('conversation_id', convIds);
        }
        await supabase.from('conversations').delete().eq('project_id', projectId);

        // Delete client access, safety checks & update attendance references
        await supabase.from('client_project_access').delete().eq('project_id', projectId);
        await supabase.from('safety_checks').delete().eq('project_id', projectId);
        await supabase.from('attendance').update({ project_id: null }).eq('project_id', projectId);

        // Finally delete the project record
        const { error: finalErr } = await supabase.from('projects').delete().eq('id', projectId);
        if (finalErr) throw finalErr;
      } catch (err: any) {
        throw new Error(`Failed to delete project: ${err?.message || 'Foreign key constraint issue'}`);
      }
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['projects'] });
      client.invalidateQueries({ queryKey: ['assigned_projects'] });
    },
  });
}

