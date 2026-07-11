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

import { Card } from '../../src/components';
import { useAllPayments } from '../../src/hooks/usePayments';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

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

      {/* Summary */}
      <Card style={styles.summaryCard}>
        <View style={styles.ringSection}>
          <View style={styles.ring}>
            <Text style={styles.ringPct}>{paidPct}%</Text>
            <Text style={styles.ringLabel}>Paid</Text>
          </View>
          <View style={styles.summaryDetails}>
            <View style={styles.summaryRow}>
              <View style={[styles.dot, { backgroundColor: colors.success }]} />
              <Text style={styles.summaryLabel}>Paid</Text>
              <Text style={[styles.summaryValue, { color: colors.success }]}>₹{totalPaid.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.summaryRow}>
              <View style={[styles.dot, { backgroundColor: colors.warning }]} />
              <Text style={styles.summaryLabel}>Pending</Text>
              <Text style={[styles.summaryValue, { color: colors.warning }]}>₹{pending.toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.summaryRow}>
              <View style={[styles.dot, { backgroundColor: colors.neutral[400] }]} />
              <Text style={styles.summaryLabel}>Total</Text>
              <Text style={styles.summaryValue}>₹{totalBilled.toLocaleString('en-IN')}</Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Milestones */}
      <Text style={styles.sectionTitle}>Payment Milestones</Text>
      {(payments || []).map((p) => (
        <Card key={p.id} style={styles.milestoneCard}>
          <View style={styles.milestoneRow}>
            <View style={[styles.milestoneIcon, { backgroundColor: p.status === 'paid' ? colors.successBg : colors.warningBg }]}>
              <Ionicons name={p.status === 'paid' ? 'checkmark-circle' : 'time'} size={22} color={p.status === 'paid' ? colors.success : colors.warning} />
            </View>
            <View style={styles.milestoneInfo}>
              <Text style={styles.milestoneName}>{p.milestone_name}</Text>
              <Text style={styles.milestoneAmount}>₹{p.amount.toLocaleString('en-IN')}</Text>
              {p.due_date && (
                <Text style={styles.milestoneDue}>
                  {p.status === 'paid' ? 'Paid' : 'Due'}: {new Date(p.status === 'paid' && p.paid_at ? p.paid_at : p.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              )}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: p.status === 'paid' ? colors.successBg : colors.warningBg }]}>
              <Text style={[styles.statusText, { color: p.status === 'paid' ? colors.success : colors.warning }]}>{p.status}</Text>
            </View>
          </View>
        </Card>
      ))}

      {(!payments || payments.length === 0) && (
        <View style={styles.empty}>
          <Ionicons name="card-outline" size={48} color={colors.neutral[300]} />
          <Text style={styles.emptyText}>No payment milestones yet</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  title: { ...typography.h3, color: colors.ink, marginBottom: spacing.lg },
  summaryCard: { padding: spacing.xl, marginBottom: spacing.xl },
  ringSection: { flexDirection: 'row', gap: spacing.xl },
  ring: {
    width: 100, height: 100, borderRadius: 50, borderWidth: 6, borderColor: colors.success,
    alignItems: 'center', justifyContent: 'center',
  },
  ringPct: { ...typography.h3, color: colors.success },
  ringLabel: { ...typography.caption, color: colors.neutral[500] },
  summaryDetails: { flex: 1, justifyContent: 'center', gap: spacing.md },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  summaryLabel: { flex: 1, ...typography.bodySmall, color: colors.neutral[600] },
  summaryValue: { ...typography.bodySmall, fontFamily: fontFamily.semiBold, color: colors.ink },
  sectionTitle: { ...typography.h6, color: colors.ink, marginBottom: spacing.md },
  milestoneCard: { padding: spacing.lg, marginBottom: spacing.sm },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  milestoneIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  milestoneInfo: { flex: 1 },
  milestoneName: { ...typography.bodyMedium, fontFamily: fontFamily.medium, color: colors.ink },
  milestoneAmount: { ...typography.h6, color: colors.ink, marginTop: 2 },
  milestoneDue: { ...typography.caption, color: colors.neutral[500], marginTop: 2 },
  statusBadge: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.full },
  statusText: { ...typography.caption, fontFamily: fontFamily.semiBold, textTransform: 'capitalize' },
  empty: { alignItems: 'center', paddingVertical: spacing['4xl'], gap: spacing.md },
  emptyText: { ...typography.bodyMedium, color: colors.neutral[400] },
});
