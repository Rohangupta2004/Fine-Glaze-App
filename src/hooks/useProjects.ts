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
