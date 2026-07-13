import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '../../src/components';
import { useProjects } from '../../src/hooks/useProjects';
import {
  useClientApprovals,
  useDecideClientApproval,
} from '../../src/hooks/useClientApprovals';
import { useAuthStore } from '../../src/stores/authStore';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';
import type { ClientApproval } from '../../src/types';
import { SignedImage } from '../../src/components/SignedImage';

// —— Status badge ———————————————————————————————————————————————

function StatusBadge({ status }: { status: string }) {
  const config = {
    pending: { bg: colors.warningBg, text: colors.warning, label: 'Pending' },
    approved: { bg: colors.successBg, text: colors.success, label: 'Approved' },
    rejected: { bg: colors.errorBg, text: colors.error, label: 'Rejected' },
  }[status] ?? { bg: colors.neutral[100], text: colors.neutral[600], label: status };

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
    Alert.alert(
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
              Alert.alert('Error', e.message ?? 'Failed to update. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.detailContainer}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing['6xl'] }}
      showsVerticalScrollIndicator={false}
    >
      {/* Back */}
      <TouchableOpacity style={styles.backBtn} onPress={onClose}>
        <Ionicons name="arrow-back" size={22} color={colors.ink} />
        <Text style={styles.backText}>Approval Requests</Text>
      </TouchableOpacity>

      {/* Header */}
      <View style={styles.detailHeader}>
        <View style={styles.detailTitleRow}>
          <Text style={styles.detailTitle}>{item.title}</Text>
          <StatusBadge status={item.status} />
        </View>
        {item.request_code && (
          <Text style={styles.requestCode}>Ref: {item.request_code}</Text>
        )}
        <Text style={styles.detailDate}>
          Requested {new Date(item.decided_at ?? (item as any).created_at ?? Date.now()).toLocaleDateString('en-IN', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </Text>
      </View>

      {/* Details */}
      {item.details && Object.keys(item.details).length > 0 && (
        <Card style={styles.detailsCard}>
          <Text style={styles.detailsCardTitle}>Details</Text>
          {Object.entries(item.details).map(([k, v]) => (
            <View key={k} style={styles.detailsRow}>
              <Text style={styles.detailsKey}>{k.replace(/_/g, ' ')}</Text>
              <Text style={styles.detailsVal}>{String(v)}</Text>
            </View>
          ))}
        </Card>
      )}

      {/* Photos */}
      {(item.photos || []).length > 0 && (
        <>
          <Text style={styles.sectionLabel}>Photos</Text>
          <View style={styles.photoGrid}>
            {(item.photos || []).map((p: string, i: number) =>
              p.startsWith('http') ? (
                <Image
                  key={i}
                  source={{ uri: p }}
                  style={[styles.photoTile, { width: tileSize, height: tileSize }]}
                  resizeMode="cover"
                />
              ) : (
                <SignedImage
                  key={i}
                  bucket="dpr-media"
                  storagePath={p}
                  style={[styles.photoTile, { width: tileSize, height: tileSize }]}
                  resizeMode="cover"
                />
              )
            )}
          </View>
        </>
      )}

      {/* Decided info */}
      {isDone && item.decided_at && (
        <Card style={{ ...styles.decidedCard, borderColor: item.status === 'approved' ? colors.success : colors.error }}>
          <Ionicons
            name={item.status === 'approved' ? 'checkmark-circle' : 'close-circle'}
            size={22}
            color={item.status === 'approved' ? colors.success : colors.error}
          />
          <Text
            style={[
              styles.decidedText,
              { color: item.status === 'approved' ? colors.success : colors.error },
            ]}
          >
            {item.status === 'approved' ? 'You approved' : 'You rejected'} this on{' '}
            {new Date(item.decided_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </Card>
      )}

      {/* Actions — only visible when pending */}
      {!isDone && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => handleDecide('rejected')}
            disabled={isPending}
            accessibilityLabel="Reject approval request"
          >
            {isPending ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <Ionicons name="close-circle-outline" size={20} color={colors.error} />
            )}
            <Text style={[styles.actionBtnText, { color: colors.error }]}>Reject</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.approveBtn]}
            onPress={() => handleDecide('approved')}
            disabled={isPending}
            accessibilityLabel="Approve approval request"
          >
            {isPending ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="checkmark-circle-outline" size={20} color={colors.white} />
            )}
            <Text style={[styles.actionBtnText, { color: colors.white }]}>Approve</Text>
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
      <View style={{ flex: 1, backgroundColor: colors.background }}>
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing['6xl'] }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />
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
        <View style={styles.empty}>
          <Ionicons name="checkmark-done-circle-outline" size={56} color={colors.neutral[300]} />
          <Text style={styles.emptyTitle}>No Approval Requests</Text>
          <Text style={styles.emptyText}>
            When the team needs your sign-off on materials, finishes, or changes, they will appear here
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function ApprovalCard({ item, onPress }: { item: ClientApproval; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} accessibilityLabel={`Open ${item.title}`}>
      <Card style={styles.card} variant="interactive">
        <View style={styles.cardRow}>
          <View style={[
            styles.cardIcon,
            {
              backgroundColor:
                item.status === 'approved'
                  ? colors.successBg
                  : item.status === 'rejected'
                  ? colors.errorBg
                  : colors.warningBg,
            },
          ]}>
            <Ionicons
              name={
                item.status === 'approved'
                  ? 'checkmark-circle'
                  : item.status === 'rejected'
                  ? 'close-circle'
                  : 'hourglass-outline'
              }
              size={22}
              color={
                item.status === 'approved'
                  ? colors.success
                  : item.status === 'rejected'
                  ? colors.error
                  : colors.warning
              }
            />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
            {item.request_code && (
              <Text style={styles.cardCode}>Ref: {item.request_code}</Text>
            )}
            {item.decided_at ? (
              <Text style={styles.cardDate}>
                Decided{' '}
                {new Date(item.decided_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                })}
              </Text>
            ) : null}
          </View>
          <View style={styles.cardRight}>
            <StatusBadge status={item.status} />
            <Ionicons name="chevron-forward" size={16} color={colors.neutral[300]} style={{ marginTop: spacing.xs }} />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  title: { ...typography.h3, color: colors.ink },
  subtitle: { ...typography.bodyMedium, color: colors.neutral[500], marginBottom: spacing.xl },

  sectionLabel: {
    ...typography.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.neutral[400],
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },

  card: { padding: spacing.md, marginBottom: spacing.sm },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardTitle: { ...typography.bodyMedium, fontFamily: fontFamily.medium, color: colors.ink },
  cardCode: { ...typography.caption, color: colors.neutral[500], marginTop: 2 },
  cardDate: { ...typography.caption, color: colors.neutral[400], marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: spacing.xs },

  badge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  badgeText: { ...typography.caption, fontFamily: fontFamily.semiBold, textTransform: 'capitalize' },

  empty: { alignItems: 'center', paddingVertical: spacing['5xl'], gap: spacing.sm },
  emptyTitle: { ...typography.h5, color: colors.neutral[400] },
  emptyText: {
    ...typography.bodySmall,
    color: colors.neutral[400],
    textAlign: 'center',
    paddingHorizontal: spacing['2xl'],
  },

  // Detail styles
  detailContainer: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl },
  backText: { ...typography.bodyMedium, fontFamily: fontFamily.medium, color: colors.ink },
  detailHeader: { marginBottom: spacing.xl },
  detailTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.xs },
  detailTitle: { ...typography.h4, color: colors.ink, flex: 1 },
  requestCode: { ...typography.caption, color: colors.neutral[500], marginBottom: spacing.xs },
  detailDate: { ...typography.caption, color: colors.neutral[400] },
  detailsCard: { padding: spacing.lg, marginBottom: spacing.xl },
  detailsCardTitle: { ...typography.h6, color: colors.ink, marginBottom: spacing.md },
  detailsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  detailsKey: {
    ...typography.bodySmall,
    color: colors.neutral[500],
    textTransform: 'capitalize',
    width: 120,
  },
  detailsVal: { ...typography.bodySmall, fontFamily: fontFamily.medium, color: colors.ink, flex: 1 },

  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  photoTile: { borderRadius: radius.md, backgroundColor: colors.neutral[200] },

  decidedCard: {
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    marginBottom: spacing.xl,
  },
  decidedText: { ...typography.bodySmall, fontFamily: fontFamily.medium, flex: 1 },

  actionRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  rejectBtn: { borderColor: colors.error, backgroundColor: colors.errorBg },
  approveBtn: { borderColor: colors.primary, backgroundColor: colors.primary },
  actionBtnText: { ...typography.button, fontSize: 15 },
});
