import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Attendance, Profile } from '../types';

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface TeamAttendanceRow {
  profile: Profile;
  attendance: Attendance | null;
}

/** Team attendance for a project on a given date (supervisor view). */
export function useProjectAttendance(projectId: string | null | undefined, date?: string) {
  const dateStr = date || todayISO();
  return useQuery({
    queryKey: ['attendance', 'project', projectId, dateStr],
    queryFn: async (): Promise<TeamAttendanceRow[]> => {
      if (!projectId) return [];
      // Fetch all profiles assigned to this project
      const { data: assignments, error: aErr } = await supabase
        .from('assignments')
        .select('profile_id')
        .eq('project_id', projectId)
        .eq('active', true);
      if (aErr) throw aErr;

      if (!assignments || assignments.length === 0) {
        // Fallback: all worker profiles
        const { data: workers, error: wErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'worker')
          .order('full_name');
        if (wErr) throw wErr;

        const profileIds = (workers || []).map((p) => p.id);
        const { data: atts, error: attErr } = await supabase
          .from('attendance')
          .select('*')
          .eq('project_id', projectId)
          .eq('date', dateStr)
          .in('profile_id', profileIds.length ? profileIds : ['']);
        if (attErr) throw attErr;

        const attMap = new Map((atts || []).map((a) => [a.profile_id, a]));
        return (workers || []).map((p) => ({
          profile: p as Profile,
          attendance: (attMap.get(p.id) as Attendance) || null,
        }));
      }

      const profileIds = assignments.map((a: any) => a.profile_id);
      const { data: profiles, error: pErr } = await supabase
        .from('profiles')
        .select('*')
        .in('id', profileIds)
        .order('full_name');
      if (pErr) throw pErr;

      const { data: atts, error: attErr } = await supabase
        .from('attendance')
        .select('*')
        .eq('project_id', projectId)
        .eq('date', dateStr)
        .in('profile_id', profileIds);
      if (attErr) throw attErr;

      const attMap = new Map((atts || []).map((a: any) => [a.profile_id, a]));
      return (profiles || []).map((p: any) => ({
        profile: p as Profile,
        attendance: (attMap.get(p.id) as Attendance) || null,
      }));
    },
    enabled: !!projectId,
  });
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
    mutationFn: async ({ attendanceId, checkInAt }: { attendanceId: string; checkInAt?: string | null }) => {
      const checkOutAt = new Date();
      const workDurationMin = checkInAt
        ? Math.max(0, Math.round((checkOutAt.getTime() - new Date(checkInAt).getTime()) / 60000))
        : null;
      const { error } = await supabase
        .from('attendance')
        .update({ check_out_at: checkOutAt.toISOString(), work_duration_min: workDurationMin })
        .eq('id', attendanceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
    },
  });
}
