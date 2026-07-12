import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Project } from '../types';

export function useMyAssignedProjects(profileId: string | null | undefined) {
  return useQuery({
    queryKey: ['assigned-projects', profileId],
    queryFn: async (): Promise<Project[]> => {
      if (!profileId) return [];
      const { data, error } = await supabase.from('assignments').select('projects(*)').eq('profile_id', profileId).eq('active', true);
      if (error) throw error;
      return (data || []).map((row: any) => row.projects).filter(Boolean) as Project[];
    },
    enabled: !!profileId,
  });
}
