import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Dpr, LeaveRequest, MaterialRequest, AdvanceRequest } from '../types';

export type ApprovalType = 'dpr' | 'leave' | 'material' | 'advance';

export interface ApprovalItem {
  type: ApprovalType;
  id: string;
  title: string;
  subtitle: string;
  status: string;
  date: string;
  profileId: string;
  raw: Dpr | LeaveRequest | MaterialRequest | AdvanceRequest;
}

/** Pending DPRs for review (admin). */
export function usePendingDprs() {
  return useQuery({
    queryKey: ['approvals', 'dprs'],
    queryFn: async (): Promise<Dpr[]> => {
      const { data, error } = await supabase
        .from('dprs')
        .select('*')
        .in('status', ['submitted'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Dpr[];
    },
  });
}

/** Leave requests for review (admin). */
export function usePendingLeave() {
  return useQuery({
    queryKey: ['approvals', 'leave'],
    queryFn: async (): Promise<LeaveRequest[]> => {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('status', 'pending')
        .order('from_date', { ascending: false });
      if (error) throw error;
      return data as LeaveRequest[];
    },
  });
}

/** Material requests for review (admin). */
export function usePendingMaterialRequests() {
  return useQuery({
    queryKey: ['approvals', 'material'],
    queryFn: async (): Promise<MaterialRequest[]> => {
      const { data, error } = await supabase
        .from('material_requests')
        .select('*')
        .eq('status', 'pending')
        .order('needed_by', { ascending: true });
      if (error) throw error;
      return data as MaterialRequest[];
    },
  });
}

/** Advance requests for review (admin). */
export function usePendingAdvances() {
  return useQuery({
    queryKey: ['approvals', 'advance'],
    queryFn: async (): Promise<AdvanceRequest[]> => {
      const { data, error } = await supabase
        .from('advance_requests')
        .select('*')
        .eq('status', 'pending')
        .order('id', { ascending: false });
      if (error) throw error;
      return data as AdvanceRequest[];
    },
  });
}

/** Approve a DPR. */
export function useApproveDpr() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ dprId, reviewerId, note }: { dprId: string; reviewerId: string; note?: string }) => {
      const { error } = await supabase.from('dprs').update({
        status: 'approved',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        review_note: note || null,
      }).eq('id', dprId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals'] }),
  });
}

/** Reject a DPR. */
export function useRejectDpr() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ dprId, reviewerId, note }: { dprId: string; reviewerId: string; note: string }) => {
      const { error } = await supabase.from('dprs').update({
        status: 'rejected',
        reviewed_by: reviewerId,
        reviewed_at: new Date().toISOString(),
        review_note: note,
      }).eq('id', dprId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals'] }),
  });
}

/** Decide a leave request. */
export function useDecideLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, decidedBy }: { id: string; status: 'approved' | 'rejected'; decidedBy: string }) => {
      const { error } = await supabase.from('leave_requests').update({
        status,
        decided_by: decidedBy,
        decided_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals'] }),
  });
}

/** Decide a material request. */
export function useDecideMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase.from('material_requests').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals'] }),
  });
}

/** Decide an advance request. */
export function useDecideAdvance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, decidedBy }: { id: string; status: 'approved' | 'rejected'; decidedBy: string }) => {
      const { error } = await supabase.from('advance_requests').update({
        status,
        decided_by: decidedBy,
        decided_at: new Date().toISOString(),
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals'] }),
  });
}
