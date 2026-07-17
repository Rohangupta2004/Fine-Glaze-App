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
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';

import { StatusChip, Card, Button, GradientButton } from '../../src/components';
import { supabase } from '../../src/lib/supabase';
import { useAuthStore } from '../../src/stores/authStore';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius, shadows, TOUCH_TARGET } from '../../src/theme/spacing';
import type { Dpr } from '../../src/types';
import { showAlert } from '../../src/utils/alert';

type DprFilter = 'all' | 'submitted' | 'approved' | 'rejected';

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

      const projectIds = [...new Set(dprs.map(d => d.project_id))];
      const profileIds = [...new Set(dprs.map(d => d.submitted_by))];

      const [projects, profiles, mediaCountRes] = await Promise.all([
        supabase.from('projects').select('id,name').in('id', projectIds).then(r => r.data || []),
        supabase.from('profiles').select('id,full_name').in('id', profileIds).then(r => r.data || []),
        supabase.from('dpr_media').select('dpr_id').in('dpr_id', dprs.map(d => d.id)).then(r => r.data || []),
      ]);

      const projMap = new Map(projects.map((p: any) => [p.id, p.name]));
      const profMap = new Map(profiles.map((p: any) => [p.id, p.full_name]));

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
  const [exporting, setExporting] = useState(false);

  const handleExportRegister = async () => {
    const projectId = filteredDprs[0]?.project_id;
    if (!projectId) {
      showAlert('Nothing to export', 'No DPRs found for the current filter.');
      return;
    }
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('export-dpr-register', { body: { projectId } });
      if (error) throw error;
      showAlert('Register ready', `${data.count} records exported.`, [
        { text: 'Download', onPress: () => Linking.openURL(data.downloadUrl) },
        { text: 'Done' },
      ]);
    } catch (e: any) {
      showAlert('Export failed', e.message || 'Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const filteredDprs = useMemo(() => {
    if (!dprs) return [];
    if (filter === 'all') return dprs;
    return dprs.filter(d => d.status === filter);
  }, [dprs, filter]);

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
      showAlert('Approve DPR', 'Approve this daily progress report?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: () => {
            if (!selectedDpr || !profile) return;
            approve.mutate({ dprId: selectedDpr.id, reviewerId: profile.id, note: reviewNote || undefined });
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
      showAlert('Note Required', 'Please provide a note explaining the changes needed.');
      return;
    }
    reject.mutate({ dprId: selectedDpr.id, reviewerId: profile.id, note: reviewNote });
    setShowReviewModal(false);
    setReviewNote('');
    setSelectedDpr(null);
  };

  const FILTERS = [
    { label: 'All', value: 'all', count: stats.total },
    { label: 'Pending', value: 'submitted', count: stats.submitted },
    { label: 'Approved', value: 'approved', count: stats.approved },
    { label: 'Rejected', value: 'rejected', count: stats.rejected },
  ] as const;

  if (selectedDpr) {
    return (
      <View style={styles.container}>
        <LinearGradient 
          colors={['#FFFFFF', '#F9F8F6', '#EAE6DF']} 
          start={{ x: 0, y: 0 }} 
          end={{ x: 1, y: 1 }} 
          style={StyleSheet.absoluteFill} 
        />
        <View style={[styles.innerContent, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setSelectedDpr(null)} style={styles.backBtn} hitSlop={12}>
              <Ionicons name="arrow-back" size={24} color={colors.ink} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: spacing.sm }}>
              <Text style={styles.headerLabel}>DPR #{selectedDpr.id.slice(0, 6)}</Text>
              <Text style={styles.headerTitleText} numberOfLines={1}>{selectedDpr.project_name}</Text>
            </View>
            <StatusChip status={selectedDpr.status} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
            <Card style={styles.detailCard} padding={spacing.lg}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Submitted By</Text>
                <Text style={styles.detailValue}>{selectedDpr.submitter_name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date</Text>
                <Text style={styles.detailValue}>{new Date(selectedDpr.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
              </View>
              {selectedDpr.submission_id && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Submission ID</Text>
                  <Text style={[styles.detailValue, { fontFamily: fontFamily.bold }]}>{selectedDpr.submission_id}</Text>
                </View>
              )}
              {selectedDpr.weather && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Weather</Text>
                  <Text style={styles.detailValue}>☀️ {selectedDpr.weather}</Text>
                </View>
              )}
            </Card>

            <Card style={styles.detailCard} padding={spacing.lg}>
              <Text style={styles.sectionLabel}>Work Summary</Text>
              <Text style={styles.workSummary}>{selectedDpr.work_done}</Text>
              {selectedDpr.work_type && <Text style={styles.workType}>Type: {selectedDpr.work_type}</Text>}
              {selectedDpr.level_zone && <Text style={styles.workType}>Zone: {selectedDpr.level_zone}</Text>}
            </Card>

            {(selectedDpr.media_count || 0) > 0 && (
              <Card style={styles.detailCard} padding={spacing.lg}>
                <Text style={styles.sectionLabel}>Photos ({selectedDpr.media_count})</Text>
                <Text style={styles.mediaNote}>Media attachments available in DPR web dashboard.</Text>
              </Card>
            )}

            {selectedDpr.review_note && (
              <Card style={[styles.detailCard, { borderLeftWidth: 4, borderLeftColor: selectedDpr.status === 'approved' ? '#10B981' : '#EF4444' }]} padding={spacing.lg}>
                <Text style={styles.sectionLabel}>Review Note</Text>
                <Text style={styles.workSummary}>{selectedDpr.review_note}</Text>
                {selectedDpr.reviewed_at && (
                  <Text style={styles.workType}>
                    Reviewed: {new Date(selectedDpr.reviewed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                )}
              </Card>
            )}

            {selectedDpr.status === 'submitted' && (
              <View style={styles.reviewActions}>
                <TouchableOpacity style={styles.approveAction} onPress={() => handleReview('approve')} activeOpacity={0.7}>
                  <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                    <Ionicons name="checkmark-circle" size={32} color="#10B981" />
                  </View>
                  <Text style={styles.actionLabel}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.changesAction} onPress={() => handleReview('changes')} activeOpacity={0.7}>
                  <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(217, 119, 6, 0.1)' }]}>
                    <Ionicons name="create" size={32} color="#D97706" />
                  </View>
                  <Text style={styles.actionLabel}>Changes</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectAction} onPress={() => handleReview('reject')} activeOpacity={0.7}>
                  <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                    <Ionicons name="close-circle" size={32} color="#EF4444" />
                  </View>
                  <Text style={styles.actionLabel}>Reject</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          <Modal visible={showReviewModal} transparent animationType="fade">
            <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowReviewModal(false)}>
              <View style={[styles.modalSheet, { paddingBottom: insets.bottom + spacing.xl }]} onStartShouldSetResponder={() => true}>
                <View style={styles.sheetHandle} />
                <Text style={styles.sheetTitle}>{reviewAction === 'changes' ? 'Request Changes' : 'Reject DPR'}</Text>
                <Text style={styles.helpText}>{reviewAction === 'changes' ? 'Describe what changes are needed.' : 'Provide a reason for rejection.'}</Text>
                
                <TextInput
                  style={styles.reviewInput}
                  placeholder="Enter your notes..."
                  placeholderTextColor={colors.neutral[400]}
                  value={reviewNote}
                  onChangeText={setReviewNote}
                  multiline
                />
                <Text style={styles.charCount}>{reviewNote.length}/500</Text>

                <GradientButton
                  title="Submit Review"
                  onPress={submitReview}
                  disabled={!reviewNote.trim()}
                  fullWidth
                  style={{ marginTop: spacing.md }}
                />
              </View>
            </TouchableOpacity>
          </Modal>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient 
        colors={['#FFFFFF', '#F9F8F6', '#EAE6DF']} 
        start={{ x: 0, y: 0 }} 
        end={{ x: 1, y: 1 }} 
        style={StyleSheet.absoluteFill} 
      />
      <View style={[styles.innerContent, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={colors.ink} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={styles.headerLabel}>Reports</Text>
            <Text style={styles.headerTitleText}>DPRs</Text>
          </View>
          <TouchableOpacity style={styles.downloadBtn} onPress={handleExportRegister} disabled={exporting} hitSlop={12}>
            <Ionicons name={exporting ? 'hourglass' : 'download'} size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsContainer}>
          <Card style={styles.statsCard} padding={spacing.md}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNum}>{stats.total}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: '#D97706' }]}>{stats.submitted}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: '#10B981' }]}>{stats.approved}</Text>
                <Text style={styles.statLabel}>Approved</Text>
              </View>
              <View style={[styles.statItem, { borderRightWidth: 0 }]}>
                <Text style={[styles.statNum, { color: '#EF4444' }]}>{stats.rejected}</Text>
                <Text style={styles.statLabel}>Rejected</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Tab Filters */}
        <View style={styles.tabContainer}>
          <View style={styles.tabBar}>
            {FILTERS.map(f => (
              <TouchableOpacity 
                key={f.value} 
                style={[styles.tabBtn, filter === f.value && styles.tabBtnActive]} 
                onPress={() => setFilter(f.value)}
              >
                <Text style={[styles.tabBtnText, filter === f.value && styles.tabBtnTextActive]}>
                  {f.label} ({f.count})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* List of DPRs */}
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.list} 
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
        >
          {filteredDprs.length === 0 && (
            <View style={styles.empty}>
              <View style={styles.emptyIconBg}>
                <Ionicons name="document-text" size={40} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No DPRs Found</Text>
              <Text style={styles.emptyText}>There are no reports matching this filter.</Text>
            </View>
          )}

          {filteredDprs.map(dpr => (
            <TouchableOpacity key={dpr.id} activeOpacity={0.85} onPress={() => setSelectedDpr(dpr)}>
              <Card style={styles.card} padding={spacing.md}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{dpr.submission_id || `DPR #${dpr.id.slice(0, 6)}`}</Text>
                    <Text style={styles.cardProject}>{dpr.project_name}</Text>
                  </View>
                  <StatusChip status={dpr.status} />
                </View>
                
                <View style={styles.cardMeta}>
                  <View style={styles.metaBadge}>
                    <Ionicons name="calendar-outline" size={12} color={colors.neutral[500]} />
                    <Text style={styles.metaText}>{new Date(dpr.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
                  </View>
                  <View style={styles.metaBadge}>
                    <Ionicons name="person-outline" size={12} color={colors.neutral[500]} />
                    <Text style={styles.metaText}>{dpr.submitter_name}</Text>
                  </View>
                  {(dpr.media_count || 0) > 0 && (
                    <View style={styles.metaBadge}>
                      <Ionicons name="images-outline" size={12} color={colors.neutral[500]} />
                      <Text style={styles.metaText}>{dpr.media_count}</Text>
                    </View>
                  )}
                </View>
                
                {dpr.work_done && (
                  <Text style={styles.cardWork} numberOfLines={2}>{dpr.work_done}</Text>
                )}
                
                {dpr.status === 'submitted' && (
                  <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.qApprove} onPress={(e) => { e.stopPropagation(); if(profile) approve.mutate({ dprId: dpr.id, reviewerId: profile.id }); }}>
                      <Ionicons name="checkmark" size={12} color="#fff" />
                      <Text style={styles.qTextApprove}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.qReview} onPress={(e) => { e.stopPropagation(); setSelectedDpr(dpr); }}>
                      <Ionicons name="eye" size={12} color={colors.primary} />
                      <Text style={styles.qTextReview}>Review</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </Card>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
  },
  innerContent: {
    flex: 1,
  },
  // Header
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: spacing.lg, 
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  backBtn: { 
    width: TOUCH_TARGET, 
    height: TOUCH_TARGET, 
    alignItems: 'flex-start', 
    justifyContent: 'center', 
  },
  headerLabel: { 
    fontSize: 11, 
    color: colors.neutral[500], 
    fontFamily: fontFamily.medium, 
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  headerTitleText: { 
    fontSize: 22, 
    color: colors.ink, 
    fontFamily: fontFamily.bold, 
    letterSpacing: -0.5, 
    marginTop: 2 
  },
  downloadBtn: { 
    width: TOUCH_TARGET, 
    height: TOUCH_TARGET, 
    alignItems: 'flex-end', 
    justifyContent: 'center',
  },
  
  statsContainer: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: radius.xl,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1.5,
    ...shadows.md,
  },
  statsRow: { 
    flexDirection: 'row', 
  },
  statItem: { 
    flex: 1, 
    alignItems: 'center', 
    borderRightWidth: 1, 
    borderRightColor: 'rgba(105,80,48,0.08)' 
  },
  statNum: { 
    fontSize: 18, 
    color: colors.ink, 
    fontFamily: fontFamily.bold 
  },
  statLabel: { 
    fontSize: 10, 
    color: colors.neutral[500], 
    fontFamily: fontFamily.medium, 
    marginTop: 4, 
    textTransform: 'uppercase' 
  },

  // Tabs
  tabContainer: { 
    paddingHorizontal: spacing.lg, 
    marginTop: spacing.md 
  },
  tabBar: { 
    flexDirection: 'row', 
    backgroundColor: '#E7E5E0', 
    borderRadius: radius.lg, 
    padding: 3, 
    gap: 2 
  },
  tabBtn: { 
    flex: 1, 
    paddingVertical: 8, 
    alignItems: 'center', 
    borderRadius: radius.md, 
  },
  tabBtnActive: { 
    backgroundColor: '#fff', 
    ...shadows.sm,
  },
  tabBtnText: { 
    fontSize: 11, 
    fontFamily: fontFamily.medium, 
    color: colors.neutral[500] 
  },
  tabBtnTextActive: { 
    color: colors.primary, 
    fontFamily: fontFamily.bold 
  },

  // List
  list: { 
    paddingHorizontal: spacing.lg, 
    paddingBottom: 100, 
    gap: spacing.md, 
    paddingTop: spacing.md 
  },
  
  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1.5,
    ...shadows.md,
  },
  cardHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    marginBottom: spacing.xs 
  },
  cardTitle: { 
    fontSize: 15, 
    fontFamily: fontFamily.bold, 
    color: colors.ink 
  },
  cardProject: { 
    fontSize: 12, 
    color: colors.neutral[500], 
    fontFamily: fontFamily.medium, 
    marginTop: 2 
  },
  cardMeta: { 
    flexDirection: 'row', 
    gap: spacing.xs, 
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  metaBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    backgroundColor: '#F9F8F6', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: radius.sm 
  },
  metaText: { 
    fontSize: 10, 
    fontFamily: fontFamily.medium, 
    color: colors.neutral[600] 
  },
  cardWork: { 
    fontSize: 12, 
    color: colors.neutral[600], 
    fontStyle: 'italic', 
    backgroundColor: '#FFFDF9', 
    padding: spacing.md, 
    borderRadius: radius.md, 
    marginBottom: spacing.sm,
    fontFamily: fontFamily.regular,
  },
  
  cardActions: { 
    flexDirection: 'row', 
    justifyContent: 'flex-end', 
    gap: spacing.sm 
  },
  qApprove: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    backgroundColor: '#10B981', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: radius.md 
  },
  qTextApprove: { 
    fontSize: 11, 
    fontFamily: fontFamily.bold, 
    color: '#fff' 
  },
  qReview: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 4, 
    backgroundColor: '#F9F8F6', 
    borderWidth: 1.5, 
    borderColor: '#C8B79C', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: radius.md 
  },
  qTextReview: { 
    fontSize: 11, 
    fontFamily: fontFamily.bold, 
    color: colors.primary 
  },

  // Detail View
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1.5,
    ...shadows.md,
    marginBottom: spacing.md,
  },
  detailRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingVertical: spacing.sm, 
    borderBottomWidth: 1, 
    borderBottomColor: colors.neutral[100] 
  },
  detailLabel: { 
    fontSize: 11, 
    fontFamily: fontFamily.bold, 
    color: colors.neutral[400], 
    textTransform: 'uppercase', 
    letterSpacing: 0.5 
  },
  detailValue: { 
    fontSize: 13, 
    color: colors.ink, 
    textAlign: 'right', 
    flex: 1, 
    marginLeft: spacing.lg,
    fontFamily: fontFamily.medium,
  },
  sectionLabel: { 
    fontSize: 15, 
    fontFamily: fontFamily.bold, 
    color: colors.ink, 
    marginBottom: spacing.xs 
  },
  workSummary: { 
    fontSize: 13, 
    color: colors.neutral[700], 
    lineHeight: 20,
    fontFamily: fontFamily.regular,
  },
  workType: { 
    fontSize: 11, 
    color: colors.neutral[500], 
    marginTop: spacing.sm, 
    fontFamily: fontFamily.medium 
  },
  mediaNote: { 
    fontSize: 12, 
    color: colors.neutral[400], 
    fontStyle: 'italic',
    fontFamily: fontFamily.medium,
  },
  
  reviewActions: { 
    flexDirection: 'row', 
    justifyContent: 'space-around', 
    paddingVertical: spacing.lg, 
    backgroundColor: '#fff', 
    borderRadius: radius.xl, 
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 1.5,
    ...shadows.md,
    marginTop: spacing.md 
  },
  approveAction: { 
    alignItems: 'center', 
    gap: 4 
  },
  changesAction: { 
    alignItems: 'center', 
    gap: 4 
  },
  rejectAction: { 
    alignItems: 'center', 
    gap: 4 
  },
  actionIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { 
    fontSize: 11, 
    fontFamily: fontFamily.bold, 
    color: colors.ink, 
    textAlign: 'center' 
  },

  // Empty
  empty: { 
    alignItems: 'center', 
    paddingVertical: 80, 
    gap: spacing.md 
  },
  emptyIconBg: { 
    width: 80, 
    height: 80, 
    borderRadius: 24, 
    backgroundColor: 'rgba(105,80,48,0.05)', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  emptyTitle: { 
    fontSize: 18, 
    fontFamily: fontFamily.bold, 
    color: colors.ink 
  },
  emptyText: { 
    fontSize: 13, 
    color: colors.neutral[400], 
    textAlign: 'center', 
    paddingHorizontal: 40,
    fontFamily: fontFamily.medium,
  },

  // Modal
  modalBackdrop: { 
    flex: 1, 
    backgroundColor: 'rgba(20,16,12,0.5)', 
    justifyContent: 'flex-end' 
  },
  modalSheet: { 
    backgroundColor: '#fff', 
    borderTopLeftRadius: 32, 
    borderTopRightRadius: 32, 
    padding: spacing.xl 
  },
  sheetHandle: { 
    width: 40, 
    height: 4, 
    borderRadius: 2, 
    backgroundColor: '#E5E7EB', 
    alignSelf: 'center', 
    marginBottom: spacing.lg 
  },
  sheetTitle: { 
    fontSize: 20, 
    fontFamily: fontFamily.bold, 
    color: colors.ink, 
    marginBottom: 4 
  },
  helpText: { 
    fontSize: 13, 
    color: colors.neutral[500], 
    marginBottom: spacing.lg,
    fontFamily: fontFamily.medium,
  },
  reviewInput: { 
    backgroundColor: '#FFFDF9', 
    borderWidth: 1.5, 
    borderColor: colors.neutral[200], 
    borderRadius: 16, 
    padding: spacing.md, 
    minHeight: 120, 
    textAlignVertical: 'top', 
    fontSize: 15,
    fontFamily: fontFamily.regular,
    color: colors.ink,
  },
  charCount: { 
    fontSize: 11, 
    color: colors.neutral[400], 
    textAlign: 'right', 
    marginTop: 8,
    fontFamily: fontFamily.medium,
  },
});
