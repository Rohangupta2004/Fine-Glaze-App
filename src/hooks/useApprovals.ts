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
    mutationFn: async ({ dprId, reviewerId, note }: { dprId: string; reviewerId?: string; note?: string }) => {
      // Resolve reviewer ID if not provided
      let uid = reviewerId;
      if (!uid) {
        const { data: authData } = await supabase.auth.getUser();
        uid = authData.user?.id;
      }

      // 1. Update status to approved FIRST so approval always succeeds
      const { data: updatedDpr, error: updateErr } = await supabase
        .from('dprs')
        .update({
          status: 'approved',
          reviewed_by: uid || null,
          reviewed_at: new Date().toISOString(),
          review_note: note || null,
        })
        .eq('id', dprId)
        .select()
        .maybeSingle();

      if (updateErr) throw updateErr;

      const dpr = updatedDpr;

      // 2. Recalculate task & subtask progress roll-up if task_id exists
      if (dpr?.task_id) {
        try {
          await supabase.rpc('recalculate_task_and_project_progress', { p_task_id: dpr.task_id });
        } catch (tErr) {
          console.warn('[useApproveDpr] RPC task rollup warning:', tErr);
        }
      }

      // 3. Update linked BOQ items if dpr_boq_items exist
      try {
        const { data: reportedItems } = await supabase
          .from('dpr_boq_items')
          .select('project_boq_item_id, quantity_reported')
          .eq('dpr_id', dprId);

        if (reportedItems && reportedItems.length > 0) {
          for (const item of reportedItems) {
            const { data: boqItem } = await supabase
              .from('project_boq_items')
              .select('completed_quantity')
              .eq('id', item.project_boq_item_id)
              .maybeSingle();

            const currentQty = boqItem?.completed_quantity || 0;
            const newQty = currentQty + (item.quantity_reported || 0);

            await supabase
              .from('project_boq_items')
              .update({ completed_quantity: newQty })
              .eq('id', item.project_boq_item_id);
          }
        }
      } catch (boqErr) {
        console.warn('[useApproveDpr] BOQ update warning:', boqErr);
      }

      // 4. Send notification to submitter
      if (dpr?.submitted_by) {
        try {
          await supabase.from('notifications').insert({
            recipient_id: dpr.submitted_by,
            kind: 'dpr_approved',
            title: 'DPR Approved',
            body: `Your daily progress report for ${dpr.work_type || 'site work'} has been approved!`,
            ref_table: 'dprs',
            ref_id: dprId,
            important: false,
          });
        } catch (nErr) {
          console.warn('[useApproveDpr] Notification warning:', nErr);
        }
      }

      return dpr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approvals'] });
      qc.invalidateQueries({ queryKey: ['dprs'] });
      qc.invalidateQueries({ queryKey: ['admin-dprs-all'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['project'] });
      qc.invalidateQueries({ queryKey: ['boq'] });
    },
  });
}

/** Reject a DPR. */
export function useRejectDpr() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ dprId, reviewerId, note }: { dprId: string; reviewerId?: string; note: string }) => {
      let uid = reviewerId;
      if (!uid) {
        const { data: authData } = await supabase.auth.getUser();
        uid = authData.user?.id;
      }

      const { data: dpr, error } = await supabase
        .from('dprs')
        .update({
          status: 'rejected',
          reviewed_by: uid || null,
          reviewed_at: new Date().toISOString(),
          review_note: note,
        })
        .eq('id', dprId)
        .select()
        .maybeSingle();

      if (error) throw error;

      if (dpr?.submitted_by) {
        try {
          await supabase.from('notifications').insert({
            recipient_id: dpr.submitted_by,
            kind: 'dpr_rejected',
            title: 'DPR Needs Changes / Rejected',
            body: `Your DPR for ${dpr.work_type || 'site work'} was rejected: "${note}"`,
            ref_table: 'dprs',
            ref_id: dprId,
            important: true,
          });
        } catch (nErr) {
          console.warn('[useRejectDpr] Notification warning:', nErr);
        }
      }

      return dpr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approvals'] });
      qc.invalidateQueries({ queryKey: ['dprs'] });
      qc.invalidateQueries({ queryKey: ['admin-dprs-all'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
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
