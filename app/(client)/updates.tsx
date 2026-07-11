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
import { useProjects } from '../../src/hooks/useProjects';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';

export default function ClientUpdatesScreen() {
  const insets = useSafeAreaInsets();
  const { data: projects, refetch, isRefetching } = useProjects();
  const project = (projects || [])[0];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing['6xl'] }}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <Text style={styles.title}>Project Updates</Text>
      {project && <Text style={styles.subtitle}>{project.name}</Text>}

      {/* Photo timeline from approved DPRs will auto-populate here */}
      <View style={styles.empty}>
        <Ionicons name="images-outline" size={56} color={colors.neutral[300]} />
        <Text style={styles.emptyTitle}>Photo Timeline</Text>
        <Text style={styles.emptyText}>
          Photos and videos from approved daily progress reports will appear here automatically
        </Text>
      </View>

      {/* Stage update card */}
      {project && (
        <Card style={styles.stageCard}>
          <View style={styles.stageRow}>
            <View style={styles.stageIcon}>
              <Ionicons name="construct" size={24} color={colors.primary} />
            </View>
            <View style={styles.stageInfo}>
              <Text style={styles.stageLabel}>Current Stage</Text>
              <Text style={styles.stageValue}>{project.stage || 'Not set'}</Text>
            </View>
            <Text style={styles.progressPct}>{project.progress_pct}%</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${project.progress_pct}%` }]} />
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  title: { ...typography.h3, color: colors.ink },
  subtitle: { ...typography.bodyMedium, color: colors.neutral[500], marginBottom: spacing.xl },
  empty: { alignItems: 'center', paddingVertical: spacing['5xl'], gap: spacing.sm },
  emptyTitle: { ...typography.h5, color: colors.neutral[400] },
  emptyText: { ...typography.bodySmall, color: colors.neutral[400], textAlign: 'center', paddingHorizontal: spacing['2xl'] },
  stageCard: { padding: spacing.xl, marginTop: spacing.xl },
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  stageIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.primary + '10', alignItems: 'center', justifyContent: 'center' },
  stageInfo: { flex: 1 },
  stageLabel: { ...typography.caption, color: colors.neutral[400] },
  stageValue: { ...typography.h6, color: colors.ink, textTransform: 'capitalize' },
  progressPct: { ...typography.h4, color: colors.primary },
  progressTrack: { height: 8, backgroundColor: colors.neutral[100], borderRadius: 4 },
  progressFill: { height: 8, backgroundColor: colors.primary, borderRadius: 4 },
});
