import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Attendance } from '../types';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Today's attendance record for the current user (null if not punched in yet). */
export function useTodayAttendance(profileId: string | null | undefined) {
  return useQuery({
    queryKey: ['attendance', 'today', profileId],
    queryFn: async (): Promise<Attendance | null> => {
      if (!profileId) return null;
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('profile_id', profileId)
        .eq('date', todayISO())
        .maybeSingle();
      if (error) throw error;
      return data as Attendance | null;
    },
    enabled: !!profileId,
  });
}

/** Attendance history for the current user, most recent first. */
export function useAttendanceHistory(profileId: string | null | undefined, limit = 31) {
  return useQuery({
    queryKey: ['attendance', 'history', profileId, limit],
    queryFn: async (): Promise<Attendance[]> => {
      if (!profileId) return [];
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('profile_id', profileId)
        .order('date', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as Attendance[];
    },
    enabled: !!profileId,
  });
}

interface PunchInParams {
  profileId: string;
  projectId: string;
  lat: number;
  lng: number;
  selfieUrl: string | null;
  locationVerified: boolean;
}

/** Record a punch-in for today. */
export function usePunchIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: PunchInParams) => {
      const { error } = await supabase.from('attendance').insert({
        profile_id: params.profileId,
        project_id: params.projectId,
        date: todayISO(),
        check_in_at: new Date().toISOString(),
        check_in_lat: params.lat,
        check_in_lng: params.lng,
        check_in_selfie_url: params.selfieUrl,
        location_verified: params.locationVerified,
        status: 'present',
        synced: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}

/** Record a punch-out for today's attendance row. */
export function usePunchOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ attendanceId }: { attendanceId: string }) => {
      const { error } = await supabase
        .from('attendance')
        .update({ check_out_at: new Date().toISOString() })
        .eq('id', attendanceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}
