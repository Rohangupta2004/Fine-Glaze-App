import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Profile } from '../types';

/** All employee profiles for the company. */
export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name', { ascending: true });
      if (error) throw error;
      return data as Profile[];
    },
  });
}

/** Single employee profile by ID. */
export function useEmployee(profileId: string | null | undefined) {
  return useQuery({
    queryKey: ['employees', profileId],
    queryFn: async (): Promise<Profile | null> => {
      if (!profileId) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();
      if (error) throw error;
      return data as Profile;
    },
    enabled: !!profileId,
  });
}

/** Update employee profile. */
export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Profile> }) => {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });
}
