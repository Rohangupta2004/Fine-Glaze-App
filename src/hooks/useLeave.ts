import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { LeaveRequest } from '../types';

/** Leave requests submitted by the current user. */
export function useMyLeaveRequests(profileId: string | null | undefined) {
  return useQuery({
    queryKey: ['leave', 'mine', profileId],
    queryFn: async (): Promise<LeaveRequest[]> => {
      if (!profileId) return [];
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('profile_id', profileId)
        .order('from_date', { ascending: false });
      if (error) throw error;
      return data as LeaveRequest[];
    },
    enabled: !!profileId,
  });
}

/** Submit a leave request. */
export function useSubmitLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      profileId: string;
      companyId: string;
      type: string;
      fromDate: string;
      toDate: string;
      reason?: string;
    }) => {
      const { error } = await supabase.from('leave_requests').insert({
        profile_id: params.profileId,
        company_id: params.companyId,
        type: params.type,
        from_date: params.fromDate,
        to_date: params.toDate,
        reason: params.reason || null,
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave'] }),
  });
}
