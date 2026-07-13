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

import { Card } from '../../src/components';
import { useAllPayments } from '../../src/hooks/usePayments';
import { colors } from '../../src/theme/colors';
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing['6xl'] }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <Text style={styles.title}>Payments</Text>

      {/* ── Gradient Hero Summary Card ─────────────────────────────────── */}
      <View style={styles.heroWrap}>
        <LinearGradient
          colors={['#695030', '#918050', '#C8B79C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          {/* Glow halo */}
          <View style={styles.heroGlow} pointerEvents="none" />
          <View style={styles.heroGlow2} pointerEvents="none" />

          <View style={styles.heroTop}>
            <View style={styles.ringOuter}>
              <Text style={styles.ringPct}>{paidPct}%</Text>
              <Text style={styles.ringLabel}>Paid</Text>
            </View>
            <View style={styles.heroStats}>
              <View style={styles.heroStatRow}>
                <View style={[styles.heroDot, { backgroundColor: '#BBF7D0' }]} />
                <Text style={styles.heroStatLabel}>Paid</Text>
                <Text style={styles.heroStatValue}>₹{totalPaid.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.heroStatRow}>
                <View style={[styles.heroDot, { backgroundColor: '#FDE68A' }]} />
                <Text style={styles.heroStatLabel}>Pending</Text>
                <Text style={styles.heroStatValue}>₹{pending.toLocaleString('en-IN')}</Text>
              </View>
              <View style={styles.heroStatRow}>
                <View style={[styles.heroDot, { backgroundColor: 'rgba(255,255,255,0.85)' }]} />
                <Text style={styles.heroStatLabel}>Total</Text>
                <Text style={styles.heroStatValue}>₹{totalBilled.toLocaleString('en-IN')}</Text>
              </View>
            </View>
          </View>

          {/* Gradient progress bar */}
          <View style={styles.barTrack}>
            <LinearGradient
              colors={['#86EFAC', '#22C55E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.barFill, { width: `${paidPct}%` }]}
            />
          </View>
        </LinearGradient>
      </View>

      {/* ── Section title ──────────────────────────────────────────────── */}
      <Text style={styles.sectionTitle}>Payment Milestones</Text>

      {/* ── Milestone cards ────────────────────────────────────────────── */}
      {(payments || []).map((p) => {
        const isPaid = p.status === 'paid';
        return (
          <View key={p.id} style={styles.milestoneWrap}>
            <Card style={styles.milestoneCard}>
              <View style={styles.milestoneRow}>
                <LinearGradient
                  colors={isPaid ? ['#86EFAC', '#22C55E'] : ['#FDE68A', '#F59E0B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.milestoneIcon}
                >
                  <Ionicons
                    name={isPaid ? 'checkmark-circle' : 'time'}
                    size={22}
                    color={colors.white}
                  />
                </LinearGradient>

                <View style={styles.milestoneInfo}>
                  <Text style={styles.milestoneName}>{p.milestone_name}</Text>
                  <Text style={styles.milestoneAmount}>₹{p.amount.toLocaleString('en-IN')}</Text>
                  {p.due_date && (
                    <Text style={styles.milestoneDue}>
                      {isPaid ? 'Paid' : 'Due'}: {new Date(isPaid && p.paid_at ? p.paid_at : p.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  )}
                </View>

                <View style={[styles.statusBadge, { backgroundColor: isPaid ? colors.successBg : colors.warningBg }]}>
                  <View style={[styles.statusDot, { backgroundColor: isPaid ? colors.success : colors.warning }]} />
                  <Text style={[styles.statusText, { color: isPaid ? colors.success : colors.warning }]}>{p.status}</Text>
                </View>
              </View>
            </Card>
          </View>
        );
      })}

      {/* ── Empty state ────────────────────────────────────────────────── */}
      {(!payments || payments.length === 0) && (
        <View style={styles.emptyWrap}>
          <LinearGradient
            colors={['#FFFBEB', '#F9F9F8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.emptyCard}
          >
            <View style={styles.emptyIconWrap}>
              <LinearGradient
                colors={['#918050', '#C8B79C']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.emptyIconGrad}
              >
                <Ionicons name="card-outline" size={32} color={colors.white} />
              </LinearGradient>
            </View>
            <Text style={styles.emptyTitle}>No payment milestones yet</Text>
            <Text style={styles.emptySubtitle}>Your billing milestones will appear here once your project manager adds them.</Text>
          </LinearGradient>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  title: { ...typography.h3, color: colors.ink, marginBottom: spacing.lg },

  // ── Hero gradient card ────────────────────────────────────────────────
  heroWrap: {
    marginBottom: spacing.xl,
    borderRadius: radius.xl,
    ...shadows.xl,
  },
  heroCard: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  heroGlow: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  heroGlow2: {
    position: 'absolute',
    bottom: -40,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    marginBottom: spacing.lg,
  },
  ringOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 5,
    borderColor: 'rgba(255, 255, 255, 0.92)',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPct: {
    ...typography.h4,
    color: colors.white,
    fontFamily: fontFamily.bold,
    fontSize: 24,
  },
  ringLabel: {
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroStats: {
    flex: 1,
    gap: spacing.sm,
  },
  heroStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  heroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  heroStatLabel: {
    flex: 1,
    ...typography.caption,
    color: 'rgba(255, 255, 255, 0.78)',
    fontSize: 11,
  },
  heroStatValue: {
    ...typography.bodyMedium,
    color: colors.white,
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
  },
  barTrack: {
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: 10,
    borderRadius: radius.full,
  },

  // ── Section & milestone list ──────────────────────────────────────────
  sectionTitle: { ...typography.h6, color: colors.ink, marginBottom: spacing.md },
  milestoneWrap: {
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
  },
  milestoneCard: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    ...shadows.sm,
  },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  milestoneIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  milestoneInfo: { flex: 1 },
  milestoneName: {
    ...typography.bodyMedium,
    fontFamily: fontFamily.medium,
    color: colors.ink,
  },
  milestoneAmount: {
    ...typography.h6,
    color: colors.ink,
    marginTop: 2,
  },
  milestoneDue: {
    ...typography.caption,
    color: colors.neutral[500],
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    ...typography.caption,
    fontFamily: fontFamily.semiBold,
    fontSize: 10,
    textTransform: 'capitalize',
  },

  // ── Empty state ──────────────────────────────────────────────────────
  emptyWrap: {
    marginTop: spacing.xl,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadows.sm,
  },
  emptyCard: {
    borderRadius: radius.xl,
    padding: spacing['4xl'],
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: 'hidden',
    ...shadows.lg,
  },
  emptyIconGrad: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...typography.h6,
    color: colors.ink,
    fontFamily: fontFamily.semiBold,
  },
  emptySubtitle: {
    ...typography.bodySmall,
    color: colors.neutral[500],
    textAlign: 'center',
    lineHeight: 18,
  },
});
