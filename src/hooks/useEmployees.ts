import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Assignment, Profile } from '../types';

/** All employee profiles for the company. */
export function useEmployees() {
  return useQuery({
    queryKey: ['employees'],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          profile_financials:profile_financials!id(*)
        `)
        .order('full_name', { ascending: true });
      if (error) throw error;

      return (data || []).map((row: any) => {
        const fin = row.profile_financials;
        return {
          ...row,
          daily_rate: fin?.daily_rate ?? null,
          bank_details: fin?.bank_details ?? null,
          bank_account: fin?.bank_account ?? null,
          bank_ifsc: fin?.bank_ifsc ?? null,
          pan: fin?.pan ?? null,
          uan: fin?.uan ?? null,
          esi_number: fin?.esi_number ?? null,
        };
      }) as Profile[];
    },
  });
}

/** Active site assignments so admin can view people by their actual project. */
export function useEmployeeAssignments() {
  return useQuery({
    queryKey: ['assignments', 'active'],
    queryFn: async (): Promise<Assignment[]> => {
      const { data, error } = await supabase.from('assignments').select('*').eq('active', true);
      if (error) throw error;
      return data as Assignment[];
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
        .select(`
          *,
          profile_financials:profile_financials!id(*)
        `)
        .eq('id', profileId)
        .single();
      if (error) throw error;

      const fin = (data as any).profile_financials;
      return {
        ...data,
        daily_rate: fin?.daily_rate ?? null,
        bank_details: fin?.bank_details ?? null,
        bank_account: fin?.bank_account ?? null,
        bank_ifsc: fin?.bank_ifsc ?? null,
        pan: fin?.pan ?? null,
        uan: fin?.uan ?? null,
        esi_number: fin?.esi_number ?? null,
      } as Profile;
    },
    enabled: !!profileId,
  });
}

/** Update employee profile. */
export function useUpdateEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Profile> }) => {
      const {
        daily_rate,
        bank_details,
        bank_account,
        bank_ifsc,
        pan,
        uan,
        esi_number,
        ...profileUpdates
      } = updates as any;

      if (Object.keys(profileUpdates).length > 0) {
        const { error } = await supabase.from('profiles').update(profileUpdates).eq('id', id);
        if (error) throw error;
      }

      const financialUpdates: any = {};
      if (daily_rate !== undefined) financialUpdates.daily_rate = daily_rate;
      if (bank_details !== undefined) financialUpdates.bank_details = bank_details;
      if (bank_account !== undefined) financialUpdates.bank_account = bank_account;
      if (bank_ifsc !== undefined) financialUpdates.bank_ifsc = bank_ifsc;
      if (pan !== undefined) financialUpdates.pan = pan;
      if (uan !== undefined) financialUpdates.uan = uan;
      if (esi_number !== undefined) financialUpdates.esi_number = esi_number;

      if (Object.keys(financialUpdates).length > 0) {
        const { error } = await supabase.from('profile_financials').update(financialUpdates).eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  });
}

/** Admin deletion of an employee profile (cleans foreign key dependencies). */
export function useDeleteEmployee() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profileId: string) => {
      // 1. Delete dependent child records linked to this profile ID to prevent 409 Foreign Key conflicts
      await Promise.allSettled([
        supabase.from('assignments').delete().eq('profile_id', profileId),
        supabase.from('profile_financials').delete().eq('id', profileId),
        supabase.from('notifications').delete().eq('recipient_id', profileId),
        supabase.from('dprs').delete().eq('submitted_by', profileId),
        supabase.from('tasks').delete().eq('assigned_to', profileId),
        supabase.from('material_requests').delete().eq('requested_by', profileId),
      ]);

      // 2. Delete parent profile record
      const { error } = await supabase.from('profiles').delete().eq('id', profileId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      queryClient.invalidateQueries({ queryKey: ['assignable-people'] });
    },
  });
}
