import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { GradientIcon, AnimatedStateView } from '../../src/components';
import { useProjects } from '../../src/hooks/useProjects';
import {
  useClientApprovals,
  useDecideClientApproval,
} from '../../src/hooks/useClientApprovals';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import type { ClientApproval } from '../../src/types';
import { SignedImage } from '../../src/components/SignedImage';
import { showAlert } from '../../src/utils/alert';

// —— Status badge ———————————————————————————————————————————————

function StatusBadge({ status }: { status: string }) {
  const config = {
    pending: { bg: 'rgba(217, 119, 6, 0.15)', text: '#D97706', label: 'Pending' },
    approved: { bg: 'rgba(22, 163, 74, 0.15)', text: '#16A34A', label: 'Approved' },
    rejected: { bg: 'rgba(220, 38, 38, 0.15)', text: '#DC2626', label: 'Rejected' },
  }[status] ?? { bg: 'rgba(105, 80, 48, 0.1)', text: '#695030', label: status };

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.badgeText, { color: config.text }]}>{config.label}</Text>
    </View>
  );
}

// —— Approval detail panel (inline) —————————————————————————————————

function ApprovalDetail({
  item,
  onClose,
}: {
  item: ClientApproval;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { mutateAsync: decide, isPending } = useDecideClientApproval();
  const isDone = item.status !== 'pending';

  const tileSize = (width - spacing.lg * 2 - spacing.sm) / 2;

  const handleDecide = async (status: 'approved' | 'rejected') => {
    const label = status === 'approved' ? 'Approve' : 'Reject';
    showAlert(
      `${label} Request`,
      `Are you sure you want to ${label.toLowerCase()} "${item.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: label,
          style: status === 'rejected' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await decide({ id: item.id, status });
            } catch (e: any) {
              showAlert('Error', e.message ?? 'Failed to update. Please try again.');
            }
          },
        },
      ]
    );
  };

  const detailsText = typeof item.details === 'string' 
    ? item.details 
    : item.details 
    ? JSON.stringify(item.details, null, 2) 
    : null;

  return (
    <ScrollView
      style={styles.detailContainer}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing['6xl'] }}
      showsVerticalScrollIndicator={false}
    >
      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={onClose}>
        <Ionicons name="arrow-back" size={22} color="#1E1815" />
        <Text style={styles.backText}>Approval Requests</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.detailHeader}>
        <View style={styles.detailTitleRow}>
          <Text style={styles.detailTitle}>{item.title}</Text>
          <StatusBadge status={item.status} />
        </View>
        {item.request_code && (
          <Text style={styles.detailCode}>Ref: {item.request_code}</Text>
        )}
      </View>

      {/* Description — Double-Bezel Architecture */}
      {detailsText ? (
        <View style={styles.outerShell}>
          <View style={styles.innerCore}>
            <Text style={styles.sectionHeading}>Details</Text>
            <Text style={styles.detailDesc}>{detailsText}</Text>
          </View>
        </View>
      ) : null}

      {/* Samples / attachments */}
      {item.photos && item.photos.length > 0 && (
        <View style={styles.outerShell}>
          <View style={styles.innerCore}>
            <Text style={styles.sectionHeading}>Attached Samples / Photos</Text>
            <View style={styles.mediaGrid}>
              {item.photos.map((path: string, idx: number) => (
                <View key={idx} style={[styles.mediaTileWrap, { width: tileSize - spacing.xl, height: tileSize - spacing.xl }]}>
                  <SignedImage
                    bucket="dpr-media"
                    storagePath={path}
                    style={styles.mediaTile}
                    resizeMode="cover"
                  />
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Decision metadata if resolved */}
      {isDone && (
        <View style={styles.outerShell}>
          <View style={styles.innerCore}>
            <Text style={styles.sectionHeading}>Decision Record</Text>
            <Text style={styles.decisionMeta}>
              Status: <Text style={{ fontFamily: fontFamily.semiBold, color: item.status === 'approved' ? '#16A34A' : '#DC2626' }}>{item.status.toUpperCase()}</Text>
            </Text>
            {item.decided_at && (
              <Text style={styles.decisionMeta}>
                Date: {new Date(item.decided_at).toLocaleString('en-IN')}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Actions — only visible when pending */}
      {!isDone && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => handleDecide('rejected')}
            disabled={isPending}
          >
            {isPending ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <Ionicons name="close-circle-outline" size={20} color="#DC2626" />
            )}
            <Text style={[styles.actionBtnText, { color: '#DC2626' }]}>Reject</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.approveBtn]}
            onPress={() => handleDecide('approved')}
            disabled={isPending}
          >
            {isPending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
            )}
            <Text style={[styles.actionBtnText, { color: '#FFFFFF' }]}>Approve</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

// —— Main screen —————————————————————————————————————————————

export default function ClientApprovalsScreen() {
  const insets = useSafeAreaInsets();
  const { data: projects } = useProjects();
  const project = (projects || [])[0];
  const { data: approvals, refetch, isRefetching } = useClientApprovals(project?.id);

  const [selected, setSelected] = useState<ClientApproval | null>(null);

  if (selected) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
        <ApprovalDetail
          item={selected}
          onClose={() => setSelected(null)}
        />
      </View>
    );
  }

  const pending = (approvals || []).filter((a) => a.status === 'pending');
  const decided = (approvals || []).filter((a) => a.status !== 'pending');

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing['6xl'] }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#695030" />
        }
      >
        <Text style={styles.title}>Approvals</Text>
        {project && <Text style={styles.subtitle}>{project.name}</Text>}

        {pending.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Awaiting Your Decision</Text>
            {pending.map((item) => (
              <ApprovalCard key={item.id} item={item} onPress={() => setSelected(item)} />
            ))}
          </>
        )}

        {decided.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Decided</Text>
            {decided.map((item) => (
              <ApprovalCard key={item.id} item={item} onPress={() => setSelected(item)} />
            ))}
          </>
        )}

        {(!approvals || approvals.length === 0) && (
          <AnimatedStateView
            type="empty"
            title="No Pending Approval Requests"
            message="When site managers request your sign-off on facade materials, glass samples, or design variations, they will appear here."
            actionLabel="Refresh Requests"
            onAction={refetch}
          />
        )}
      </ScrollView>
    </View>
  );
}

function ApprovalCard({ item, onPress }: { item: ClientApproval; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.88} style={styles.outerShellCard}>
      <View style={styles.innerCoreCard}>
        <View style={styles.cardRow}>
          <GradientIcon
            name={
              item.status === 'approved'
                ? 'checkmark-circle-outline'
                : item.status === 'rejected'
                ? 'close-circle-outline'
                : 'hourglass-outline'
            }
            iconSize={20}
            colors={
              item.status === 'approved'
                ? ['#16A34A', '#22C55E']
                : item.status === 'rejected'
                ? ['#DC2626', '#EF4444']
                : ['#B89047', '#D4AF37']
            }
          />
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            {item.request_code && (
              <Text style={styles.cardCode}>Ref: {item.request_code}</Text>
            )}
          </View>
          <StatusBadge status={item.status} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', paddingHorizontal: spacing.lg },
  title: { ...typography.h4, color: '#1E1815', fontFamily: fontFamily.semiBold },
  subtitle: { ...typography.bodySmall, color: '#695030', marginTop: 2, marginBottom: spacing.lg, fontFamily: fontFamily.regular },
  sectionLabel: { ...typography.label, color: '#695030', marginTop: spacing.md, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: fontFamily.medium },
  
  // Double-Bezel Shells & Core
  outerShellCard: {
    backgroundColor: 'rgba(184, 144, 71, 0.08)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(184, 144, 71, 0.22)',
    padding: 5,
    marginBottom: spacing.sm,
    boxShadow: '0px 4px 14px rgba(105, 80, 48, 0.07)',
  } as any,
  innerCoreCard: {
    backgroundColor: '#F5F2EC',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    padding: spacing.md,
  },

  outerShell: {
    backgroundColor: 'rgba(184, 144, 71, 0.08)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(184, 144, 71, 0.25)',
    padding: 6,
    marginBottom: spacing.md,
    boxShadow: '0px 6px 16px rgba(105, 80, 48, 0.08)',
  } as any,
  innerCore: {
    backgroundColor: '#F5F2EC',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    padding: spacing.lg,
  },

  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardInfo: { flex: 1 },
  cardTitle: { ...typography.bodyMedium, fontFamily: fontFamily.semiBold, color: '#1E1815' },
  cardCode: { ...typography.caption, color: '#695030', marginTop: 2, fontFamily: fontFamily.regular },
  badge: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.full },
  badgeText: { ...typography.caption, fontFamily: fontFamily.medium, fontSize: 11 },

  // Detail panel
  detailContainer: { flex: 1, backgroundColor: '#FAF8F5', paddingHorizontal: spacing.lg },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.lg },
  backText: { ...typography.bodyMedium, fontFamily: fontFamily.semiBold, color: '#1E1815' },
  detailHeader: { marginBottom: spacing.lg },
  detailTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md },
  detailTitle: { flex: 1, ...typography.h5, color: '#1E1815', fontFamily: fontFamily.semiBold },
  detailCode: { ...typography.caption, color: '#695030', marginTop: 4, fontFamily: fontFamily.regular },
  sectionHeading: { ...typography.label, color: '#695030', marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: fontFamily.medium },
  detailDesc: { ...typography.bodyMedium, color: '#1E1815', lineHeight: 22, fontFamily: fontFamily.regular },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  mediaTileWrap: { borderRadius: radius.md, overflow: 'hidden' },
  mediaTile: { width: '100%', height: '100%' },
  decisionMeta: { ...typography.bodySmall, color: '#695030', marginBottom: 4, fontFamily: fontFamily.regular },
  actionRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  actionBtn: { flex: 1, height: 48, borderRadius: radius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  rejectBtn: { backgroundColor: 'rgba(220, 38, 38, 0.1)', borderWidth: 1, borderColor: 'rgba(220, 38, 38, 0.3)' },
  approveBtn: { backgroundColor: '#695030' },
  actionBtnText: { ...typography.bodyMedium, fontFamily: fontFamily.semiBold },
});
