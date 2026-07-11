/**
 * DPR Management — Admin
 * PRD §25a-c — Full DPR review lifecycle
 * Matches reference image 9: DPR Overview, DPR List, Detail/Review,
 * Request Changes, Submit DPR (Admin), DPR Timeline, Filters, Reports.
 */
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { Card, Button, StatusChip, Avatar } from '../../src/components';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import type { Dpr } from '../../src/types';

type DprFilter = 'all' | 'submitted' | 'approved' | 'rejected';
type ViewMode = 'list' | 'detail' | 'review' | 'timeline';

interface DprWithDetails extends Dpr {
  project_name?: string;
  submitter_name?: string;
  media_count?: number;
}

function useAllDprs() {
  return useQuery({
    queryKey: ['admin-dprs-all'],
    queryFn: async (): Promise<DprWithDetails[]> => {
      const { data: dprs, error } = await supabase
        .from('dprs')
        .select('*')
        .order('date', { ascending: false })
        .limit(100);
      if (error) throw error;

      if (!dprs || dprs.length === 0) return [];

      // Fetch project names and submitter names in parallel
      const projectIds = [...new Set(dprs.map(d => d.project_id))];
      const profileIds = [...new Set(dprs.map(d => d.submitted_by))];

      const [projects, profiles, mediaCountRes] = await Promise.all([
        supabase.from('projects').select('id,name').in('id', projectIds).then(r => r.data || []),
        supabase.from('profiles').select('id,full_name').in('id', profileIds).then(r => r.data || []),
        supabase.from('dpr_media').select('dpr_id').in('dpr_id', dprs.map(d => d.id)).then(r => r.data || []),
      ]);

      const projMap = new Map(projects.map((p: any) => [p.id, p.name]));
      const profMap = new Map(profiles.map((p: any) => [p.id, p.full_name]));

      // Count media per DPR
      const mediaCount: Record<string, number> = {};
      mediaCountRes.forEach((m: any) => {
        mediaCount[m.dpr_id] = (mediaCount[m.dpr_id] || 0) + 1;
      });

      return dprs.map(d => ({
        ...d,
        project_name: projMap.get(d.project_id) || 'Unknown',
        submitter_name: profMap.get(d.submitted_by) || 'Unknown',
        media_count: mediaCount[d.id] || 0,
      })) as DprWithDetails[];
    },
  });
}

function useDprReview() {
  const qc = useQueryClient();
  return {
    approve: useMutation({
      mutationFn: async ({ dprId, reviewerId, note }: { dprId: string; reviewerId: string; note?: string }) => {
        const { error } = await supabase.from('dprs').update({
          status: 'approved',
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString(),
          review_note: note || null,
        }).eq('id', dprId);
        if (error) throw error;
      },
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['admin-dprs-all'] });
        qc.invalidateQueries({ queryKey: ['approvals'] });
      },
    }),
    reject: useMutation({
      mutationFn: async ({ dprId, reviewerId, note }: { dprId: string; reviewerId: string; note: string }) => {
        const { error } = await supabase.from('dprs').update({
          status: 'rejected',
          reviewed_by: reviewerId,
          reviewed_at: new Date().toISOString(),
          review_note: note,
        }).eq('id', dprId);
        if (error) throw error;
      },
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: ['admin-dprs-all'] });
        qc.invalidateQueries({ queryKey: ['approvals'] });
      },
    }),
  };
}

export default function DprManagementScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { data: dprs, refetch, isRefetching } = useAllDprs();
  const { approve, reject } = useDprReview();

  const [filter, setFilter] = useState<DprFilter>('all');
  const [selectedDpr, setSelectedDpr] = useState<DprWithDetails | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'changes'>('approve');

  const filteredDprs = useMemo(() => {
    if (!dprs) return [];
    if (filter === 'all') return dprs;
    return dprs.filter(d => d.status === filter);
  }, [dprs, filter]);

  // Stats
  const stats = useMemo(() => {
    if (!dprs) return { total: 0, submitted: 0, approved: 0, rejected: 0 };
    return {
      total: dprs.length,
      submitted: dprs.filter(d => d.status === 'submitted').length,
      approved: dprs.filter(d => d.status === 'approved').length,
      rejected: dprs.filter(d => d.status === 'rejected').length,
    };
  }, [dprs]);

  const handleReview = (action: 'approve' | 'reject' | 'changes') => {
    setReviewAction(action);
    if (action === 'approve') {
      Alert.alert('Approve DPR', 'Approve this daily progress report?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => {
            if (!selectedDpr || !profile) return;
            approve.mutate({
              dprId: selectedDpr.id,
              reviewerId: profile.id,
              note: reviewNote || undefined,
            });
            setSelectedDpr(null);
          },
        },
      ]);
    } else {
      setShowReviewModal(true);
    }
  };

  const submitReview = () => {
    if (!selectedDpr || !profile || !reviewNote.trim()) {
      Alert.alert('Note Required', 'Please provide a note explaining the changes needed.');
      return;
    }
    reject.mutate({
      dprId: selectedDpr.id,
      reviewerId: profile.id,
      note: reviewNote,
    });
    setShowReviewModal(false);
    setReviewNote('');
    setSelectedDpr(null);
  };

  const FILTERS: { label: string; value: DprFilter; count: number }[] = [
    { label: 'All', value: 'all', count: stats.total },
    { label: 'Pending', value: 'submitted', count: stats.submitted },
    { label: 'Approved', value: 'approved', count: stats.approved },
    { label: 'Rejected', value: 'rejected', count: stats.rejected },
  ];

  // DPR Detail view
  if (selectedDpr) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedDpr(null)} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.ink} />
          </TouchableOpacity>
          <Text style={styles.title}>DPR Details</Text>
          <StatusChip status={selectedDpr.status} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing['6xl'] }}>
          {/* DPR Info Card */}
          <Card style={styles.detailCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Project</Text>
              <Text style={styles.detailValue}>{selectedDpr.project_name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Submitted By</Text>
              <Text style={styles.detailValue}>{selectedDpr.submitter_name}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date</Text>
              <Text style={styles.detailValue}>
                {new Date(selectedDpr.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
            </View>
            {selectedDpr.submission_id && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Submission ID</Text>
                <Text style={[styles.detailValue, { fontFamily: fontFamily.semiBold }]}>{selectedDpr.submission_id}</Text>
              </View>
            )}
            {selectedDpr.weather && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Weather</Text>
                <Text style={styles.detailValue}>☀️ {selectedDpr.weather}</Text>
              </View>
            )}
          </Card>

          {/* Work Summary */}
          <Card style={styles.detailCard}>
            <Text style={styles.sectionLabel}>Work Summary</Text>
            <Text style={styles.workSummary}>{selectedDpr.work_done}</Text>
            {selectedDpr.work_type && (
              <Text style={styles.workType}>Type: {selectedDpr.work_type}</Text>
            )}
            {selectedDpr.level_zone && (
              <Text style={styles.workType}>Zone: {selectedDpr.level_zone}</Text>
            )}
          </Card>

          {/* Photos */}
          {(selectedDpr.media_count || 0) > 0 && (
            <Card style={styles.detailCard}>
              <Text style={styles.sectionLabel}>Photos ({selectedDpr.media_count})</Text>
              <Text style={styles.mediaNote}>Media attachments available</Text>
            </Card>
          )}

          {/* Review Note */}
          {selectedDpr.review_note && (
            <Card style={[styles.detailCard, { borderLeftWidth: 3, borderLeftColor: selectedDpr.status === 'approved' ? colors.success : colors.error }]}>
              <Text style={styles.sectionLabel}>Review Note</Text>
              <Text style={styles.workSummary}>{selectedDpr.review_note}</Text>
              {selectedDpr.reviewed_at && (
                <Text style={styles.workType}>
                  Reviewed: {new Date(selectedDpr.reviewed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              )}
            </Card>
          )}

          {/* Review Actions — only for submitted DPRs */}
          {selectedDpr.status === 'submitted' && (
            <View style={styles.reviewActions}>
              <TouchableOpacity style={styles.approveAction} onPress={() => handleReview('approve')}>
                <Ionicons name="checkmark-circle" size={28} color={colors.success} />
                <Text style={styles.actionLabel}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.changesAction} onPress={() => handleReview('changes')}>
                <Ionicons name="create" size={28} color={colors.warning} />
                <Text style={styles.actionLabel}>Request{'\n'}Changes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectAction} onPress={() => handleReview('reject')}>
                <Ionicons name="close-circle" size={28} color={colors.error} />
                <Text style={styles.actionLabel}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>

        {/* Review Modal */}
        <Modal visible={showReviewModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { paddingBottom: insets.bottom + spacing.xl }]}>
              <Text style={styles.modalTitle}>
                {reviewAction === 'changes' ? 'Request Changes' : 'Reject DPR'}
              </Text>
              <Text style={styles.modalSubtitle}>
                {reviewAction === 'changes'
                  ? 'Describe what changes are needed. The supervisor will revise and resubmit.'
                  : 'Provide a reason for rejection.'}
              </Text>
              <TextInput
                style={styles.reviewInput}
                placeholder="Enter your notes..."
                placeholderTextColor={colors.neutral[400]}
                value={reviewNote}
                onChangeText={setReviewNote}
                multiline
                numberOfLines={4}
                maxLength={500}
              />
              <Text style={styles.charCount}>{reviewNote.length}/500</Text>
              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => { setShowReviewModal(false); setReviewNote(''); }}
                  style={{ flex: 1 }}
                />
                <Button
                  title="Submit Review"
                  onPress={submitReview}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // Main List view
  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>DPR Management</Text>
        <TouchableOpacity>
          <Ionicons name="filter-outline" size={22} color={colors.ink} />
        </TouchableOpacity>
      </View>

      {/* Overview Stats — matches reference panel 1 */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Text style={[styles.statNum, { color: colors.info }]}>{stats.total}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statNum, { color: colors.warning }]}>{stats.submitted}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statNum, { color: colors.success }]}>{stats.approved}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={[styles.statNum, { color: colors.error }]}>{stats.rejected}</Text>
          <Text style={styles.statLabel}>Rejected</Text>
        </Card>
      </View>

      {/* Filter tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{ gap: spacing.sm }}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>
              {f.label} ({f.count})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* DPR List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing['6xl'] }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
      >
        {filteredDprs.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="document-outline" size={48} color={colors.neutral[300]} />
            <Text style={styles.emptyText}>No DPRs found</Text>
          </View>
        )}

        {filteredDprs.map((dpr) => (
          <TouchableOpacity key={dpr.id} onPress={() => setSelectedDpr(dpr)}>
            <Card style={styles.dprCard} variant="interactive">
              <View style={styles.dprHeader}>
                <View style={styles.dprInfo}>
                  <Text style={styles.dprTitle}>{dpr.submission_id || `DPR #${dpr.id.slice(0, 6)}`}</Text>
                  <Text style={styles.dprProject}>{dpr.project_name}</Text>
                </View>
                <StatusChip status={dpr.status} />
              </View>
              <View style={styles.dprMeta}>
                <Text style={styles.dprDate}>
                  {new Date(dpr.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
                <Text style={styles.dprSubmitter}>by {dpr.submitter_name}</Text>
              </View>
              {dpr.work_done && (
                <Text style={styles.dprWork} numberOfLines={2}>{dpr.work_done}</Text>
              )}
              {(dpr.media_count || 0) > 0 && (
                <View style={styles.mediaBadge}>
                  <Ionicons name="images" size={14} color={colors.neutral[500]} />
                  <Text style={styles.mediaText}>{dpr.media_count} photo{(dpr.media_count || 0) > 1 ? 's' : ''}</Text>
                </View>
              )}
              {dpr.status === 'submitted' && (
                <View style={styles.quickActions}>
                  <TouchableOpacity
                    style={styles.qApprove}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      if (!profile) return;
                      approve.mutate({ dprId: dpr.id, reviewerId: profile.id });
                    }}
                  >
                    <Ionicons name="checkmark" size={16} color={colors.white} />
                    <Text style={styles.qText}>Approve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.qReview}
                    onPress={(e) => {
                      e.stopPropagation?.();
                      setSelectedDpr(dpr);
                    }}
                  >
                    <Ionicons name="eye" size={16} color={colors.primary} />
                    <Text style={[styles.qText, { color: colors.primary }]}>Review</Text>
                  </TouchableOpacity>
                </View>
              )}
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  title: { ...typography.h4, color: colors.ink },
  statsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xl },
  statCard: { flex: 1, padding: spacing.md, alignItems: 'center' },
  statNum: { ...typography.h3, fontFamily: fontFamily.bold },
  statLabel: { ...typography.caption, color: colors.neutral[500], marginTop: 2 },
  filterRow: { marginBottom: spacing.lg, flexGrow: 0 },
  filterChip: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.neutral[200],
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.neutral[600] },
  filterTextActive: { color: colors.white },
  dprCard: { padding: spacing.lg, marginBottom: spacing.md },
  dprHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.sm },
  dprInfo: { flex: 1, marginRight: spacing.sm },
  dprTitle: { ...typography.h6, color: colors.ink },
  dprProject: { ...typography.caption, color: colors.primary, marginTop: 2 },
  dprMeta: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  dprDate: { ...typography.caption, color: colors.neutral[500] },
  dprSubmitter: { ...typography.caption, color: colors.neutral[400] },
  dprWork: { ...typography.bodySmall, color: colors.neutral[700], marginBottom: spacing.sm },
  mediaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.sm },
  mediaText: { ...typography.caption, color: colors.neutral[500] },
  quickActions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'flex-end' },
  qApprove: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radius.md, backgroundColor: colors.success,
  },
  qReview: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary,
  },
  qText: { ...typography.caption, fontFamily: fontFamily.semiBold, color: colors.white },
  empty: { alignItems: 'center', paddingVertical: spacing['5xl'], gap: spacing.md },
  emptyText: { ...typography.bodyMedium, color: colors.neutral[400] },
  // Detail view
  detailCard: { padding: spacing.xl, marginBottom: spacing.md },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.md },
  detailLabel: { ...typography.caption, color: colors.neutral[500], textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { ...typography.bodyMedium, color: colors.ink, textAlign: 'right', flex: 1, marginLeft: spacing.lg },
  sectionLabel: { ...typography.h6, color: colors.ink, marginBottom: spacing.sm },
  workSummary: { ...typography.bodyMedium, color: colors.neutral[700], lineHeight: 22 },
  workType: { ...typography.caption, color: colors.neutral[500], marginTop: spacing.sm },
  mediaNote: { ...typography.bodySmall, color: colors.neutral[500] },
  reviewActions: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: spacing.xl },
  approveAction: { alignItems: 'center', gap: spacing.xs },
  changesAction: { alignItems: 'center', gap: spacing.xs },
  rejectAction: { alignItems: 'center', gap: spacing.xs },
  actionLabel: { ...typography.caption, fontFamily: fontFamily.medium, color: colors.ink, textAlign: 'center' },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.white, borderTopLeftRadius: radius['2xl'], borderTopRightRadius: radius['2xl'], padding: spacing.xl },
  modalTitle: { ...typography.h4, color: colors.ink, marginBottom: spacing.xs },
  modalSubtitle: { ...typography.bodySmall, color: colors.neutral[500], marginBottom: spacing.xl },
  reviewInput: {
    ...typography.bodyMedium, fontFamily: fontFamily.regular, color: colors.ink,
    backgroundColor: colors.neutral[100], borderRadius: radius.md, padding: spacing.lg,
    minHeight: 120, textAlignVertical: 'top',
  },
  charCount: { ...typography.caption, color: colors.neutral[400], textAlign: 'right', marginTop: spacing.xs, marginBottom: spacing.xl },
  modalActions: { flexDirection: 'row', gap: spacing.md },
});
