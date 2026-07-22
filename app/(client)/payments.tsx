import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useAllPayments } from '../../src/hooks/usePayments';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius, shadows } from '../../src/theme/spacing';

export default function ClientPaymentsScreen() {
  const insets = useSafeAreaInsets();
  const { data: payments, refetch, isRefetching } = useAllPayments();

  const totalBilled = (payments || []).reduce((s, p) => s + p.amount, 0);
  const totalPaid = (payments || []).filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const pending = totalBilled - totalPaid;
  const paidPct = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing['6xl'] }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#695030" />}
      >
        <Text style={styles.title}>Payments</Text>

        {/* ── Top Payment Hero Summary Card ─────────────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            {/* Sleek Minimalist Ring Meter */}
            <View style={styles.wheelWrapper}>
              <View style={styles.wheelOuterTrack} />
              <View style={[styles.wheelArc, { borderColor: '#16A34A' }]} />
              <View style={styles.wheelCenter}>
                <Text style={styles.ringPct}>{paidPct}%</Text>
                <Text style={styles.ringLabel}>Paid</Text>
              </View>
            </View>

            <View style={styles.heroStats}>
              <View style={styles.heroStatRow}>
                <View style={[styles.heroDot, { backgroundColor: '#16A34A' }]} />
                <Text style={styles.heroStatLabel}>Paid</Text>
                <Text style={[styles.heroStatValue, { color: '#16A34A' }]}>₹{totalPaid.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.heroStatRow}>
                <View style={[styles.heroDot, { backgroundColor: '#D97706' }]} />
                <Text style={styles.heroStatLabel}>Pending</Text>
                <Text style={[styles.heroStatValue, { color: '#D97706' }]}>₹{pending.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.heroStatRow}>
                <View style={[styles.heroDot, { backgroundColor: '#695030' }]} />
                <Text style={styles.heroStatLabel}>Total</Text>
                <Text style={[styles.heroStatValue, { color: '#1E1815' }]}>₹{totalBilled.toLocaleString('en-IN')}</Text>
              </View>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.barTrack}>
            <LinearGradient
              colors={['#695030', '#16A34A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.barFill, { width: `${paidPct}%` }]}
            />
          </View>
        </View>

        {/* ── Section title ──────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Payment Milestones</Text>

        {/* ── Milestone porcelain cards ────────────────────────────────────────────── */}
        {(payments || []).map((p) => {
          const isPaid = p.status === 'paid';
          return (
            <View key={p.id} style={styles.milestoneWrap}>
              <View style={styles.porcelainCard}>
                <View style={styles.milestoneRow}>
                  <View style={[styles.milestoneIcon, { backgroundColor: isPaid ? 'rgba(22, 163, 74, 0.12)' : 'rgba(217, 119, 6, 0.12)' }]}>
                    <Ionicons
                      name={isPaid ? 'checkmark-circle' : 'time-outline'}
                      size={20}
                      color={isPaid ? '#16A34A' : '#D97706'}
                    />
                  </View>

                  <View style={styles.milestoneInfo}>
                    <Text style={styles.milestoneTitle}>{p.milestone_name}</Text>
                    <Text style={styles.milestoneMeta}>
                      {isPaid && p.paid_at
                        ? `Paid on ${new Date(p.paid_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                        : p.due_date
                        ? `Due ${new Date(p.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                        : 'Pending'}
                    </Text>
                  </View>

                  <View style={styles.milestoneRight}>
                    <Text style={styles.milestoneAmount}>₹{p.amount.toLocaleString('en-IN')}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: isPaid ? 'rgba(22, 163, 74, 0.12)' : 'rgba(217, 119, 6, 0.12)' }]}>
                      <Text style={[styles.statusText, { color: isPaid ? '#16A34A' : '#D97706' }]}>{p.status}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          );
        })}

        {/* ── Empty state ────────────────────────────────────────────────── */}
        {(!payments || payments.length === 0) && (
          <View style={styles.emptyCard}>
            <Ionicons name="card-outline" size={48} color="#8B6840" />
            <Text style={styles.emptyTitle}>No Payment Milestones Recorded Yet</Text>
            <Text style={styles.emptyText}>Payment milestones and receipts will appear here as billing progresses</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...typography.h4,
    color: '#1E1815',
    marginBottom: spacing.lg,
    fontFamily: fontFamily.semiBold,
  },

  // Top Payment Hero Card
  heroCard: {
    backgroundColor: '#F5F2EC',
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: 'rgba(184, 144, 71, 0.22)',
    padding: spacing.lg,
    marginBottom: spacing.xl,
    boxShadow: '0px 6px 18px rgba(105, 80, 48, 0.08)',
  } as any,

  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    marginBottom: spacing.lg,
  },
  wheelWrapper: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  wheelOuterTrack: {
    position: 'absolute',
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 5,
    borderColor: 'rgba(105, 80, 48, 0.15)',
  },
  wheelArc: {
    position: 'absolute',
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 5,
    borderTopColor: 'transparent',
  },
  wheelCenter: { alignItems: 'center', justifyContent: 'center' },
  ringPct: {
    ...typography.h5,
    fontSize: 19,
    color: '#1E1815',
    fontFamily: fontFamily.semiBold,
  },
  ringLabel: {
    ...typography.caption,
    color: '#695030',
    fontSize: 9,
    fontFamily: fontFamily.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroStats: {
    flex: 1,
    gap: 6,
  },
  heroStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  heroDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  heroStatLabel: {
    ...typography.caption,
    color: '#695030',
    width: 55,
    fontFamily: fontFamily.regular,
  },
  heroStatValue: {
    ...typography.bodyMedium,
    fontFamily: fontFamily.semiBold,
    flex: 1,
  },
  barTrack: {
    height: 8,
    backgroundColor: 'rgba(105, 80, 48, 0.12)',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: radius.full,
  },

  sectionTitle: {
    ...typography.label,
    color: '#695030',
    marginBottom: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },

  // Milestone list
  milestoneWrap: {
    marginBottom: spacing.md,
  },
  porcelainCard: {
    backgroundColor: '#F5F2EC',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(184, 144, 71, 0.22)',
    padding: spacing.md,
    boxShadow: '0px 4px 14px rgba(105, 80, 48, 0.07)',
  } as any,

  milestoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  milestoneIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneTitle: {
    ...typography.bodyMedium,
    color: '#1E1815',
    fontFamily: fontFamily.semiBold,
  },
  milestoneMeta: {
    ...typography.caption,
    color: '#695030',
    fontFamily: fontFamily.regular,
    marginTop: 2,
  },
  milestoneRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  milestoneAmount: {
    ...typography.bodyMedium,
    color: '#1E1815',
    fontFamily: fontFamily.semiBold,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  statusText: {
    ...typography.caption,
    fontFamily: fontFamily.medium,
    fontSize: 10,
    textTransform: 'capitalize',
  },

  emptyCard: {
    backgroundColor: '#F5F2EC',
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: 'rgba(184, 144, 71, 0.22)',
    padding: spacing['4xl'],
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyTitle: { ...typography.h6, color: '#1E1815', fontFamily: fontFamily.semiBold },
  emptyText: { ...typography.bodySmall, color: '#695030', textAlign: 'center' },
});
