import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { EmployeeRequest, EmployeeRequestRole } from '../types';

/** Requests raised by the current supervisor. */
export function useMyEmployeeRequests(profileId: string | null | undefined) {
  return useQuery({
    queryKey: ['employee_requests', 'mine', profileId],
    queryFn: async (): Promise<EmployeeRequest[]> => {
      if (!profileId) return [];
      const { data, error } = await supabase
        .from('employee_requests')
        .select('*')
        .eq('requested_by', profileId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as EmployeeRequest[];
    },
    enabled: !!profileId,
  });
}

/** All employee requests (admin view). */
export function useAllEmployeeRequests() {
  return useQuery({
    queryKey: ['employee_requests', 'all'],
    queryFn: async (): Promise<EmployeeRequest[]> => {
      const { data, error } = await supabase
        .from('employee_requests')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as EmployeeRequest[];
    },
  });
}

/** Pending employee requests (used for the admin approvals badge/list). */
export function usePendingEmployeeRequests() {
  return useQuery({
    queryKey: ['employee_requests', 'pending'],
    queryFn: async (): Promise<EmployeeRequest[]> => {
      const { data, error } = await supabase
        .from('employee_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as EmployeeRequest[];
    },
  });
}

/** Supervisor: request one or more employees for a project. */
export function useSubmitEmployeeRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      companyId: string;
      projectId: string;
      requestedBy: string;
      roleNeeded: EmployeeRequestRole;
      headcount: number;
      neededBy?: string | null;
      notes?: string | null;
    }) => {
      const { error } = await supabase.from('employee_requests').insert({
        company_id: params.companyId,
        project_id: params.projectId,
        requested_by: params.requestedBy,
        role_needed: params.roleNeeded,
        headcount: params.headcount,
        needed_by: params.neededBy || null,
        notes: params.notes || null,
        status: 'pending',
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employee_requests'] }),
  });
}

/** Admin: approve or reject an employee request. */
export function useDecideEmployeeRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      decidedBy,
    }: {
      id: string;
      status: 'approved' | 'rejected';
      decidedBy: string;
    }) => {
      const { error } = await supabase
        .from('employee_requests')
        .update({ status, decided_by: decidedBy, decided_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employee_requests'] }),
  });
}
