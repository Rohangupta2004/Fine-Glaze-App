import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Card, Avatar, StatusChip, Button } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius, shadows } from '../../src/theme/spacing';

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'worker.goodMorning';
  if (h < 17) return 'worker.goodAfternoon';
  return 'worker.goodEvening';
}

export default function WorkerHomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);

  const firstName = profile?.full_name?.split(' ')[0] || 'Worker';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{
        paddingTop: insets.top + spacing.lg,
        paddingBottom: spacing['5xl'],
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>
            {t(getGreeting())}, {firstName} 👋
          </Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </Text>
        </View>
        <TouchableOpacity>
          <Avatar
            name={profile?.full_name || 'W'}
            uri={profile?.avatar_url}
            size={44}
          />
        </TouchableOpacity>
      </View>

      {/* Today's Site Card */}
      <Card style={styles.siteCard}>
        <View style={styles.siteHeader}>
          <View style={styles.siteInfo}>
            <Text style={styles.siteLabel}>{t('worker.todaysSite')}</Text>
            <Text style={styles.siteName}>Embassy Tower</Text>
            <Text style={styles.siteDetail}>Level 4 – Zone B</Text>
          </View>
          <StatusChip status="on_track" />
        </View>

        <View style={styles.siteStats}>
          <View style={styles.statItem}>
            <Ionicons name="time-outline" size={16} color={colors.neutral[500]} />
            <Text style={styles.statText}>08:00 – 17:00</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="location-outline" size={16} color={colors.neutral[500]} />
            <Text style={styles.statText}>Mumbai</Text>
          </View>
        </View>

        {/* Punch In Button */}
        <TouchableOpacity
          style={styles.punchButton}
          activeOpacity={0.8}
          onPress={() => router.push('/(worker)/punch-in' as any)}
        >
          <View style={styles.punchInner}>
            <Ionicons name="finger-print" size={28} color={colors.white} />
            <Text style={styles.punchText}>{t('worker.punchIn')}</Text>
          </View>
        </TouchableOpacity>
      </Card>

      {/* Today's Tasks */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('worker.todaysTasks')}</Text>
        <TouchableOpacity onPress={() => router.push('/(worker)/tasks')}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>

      {/* Task cards (demo data) */}
      <Card style={styles.taskCard} variant="interactive">
        <View style={styles.taskRow}>
          <View style={[styles.priorityDot, { backgroundColor: colors.error }]} />
          <View style={styles.taskInfo}>
            <Text style={styles.taskTitle}>Glass Panel Installation</Text>
            <Text style={styles.taskMeta}>Level 4 – Zone B • High Priority</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
        </View>
      </Card>

      <Card style={styles.taskCard} variant="interactive">
        <View style={styles.taskRow}>
          <View style={[styles.priorityDot, { backgroundColor: colors.warning }]} />
          <View style={styles.taskInfo}>
            <Text style={styles.taskTitle}>Frame Alignment Check</Text>
            <Text style={styles.taskMeta}>Level 4 – Zone A • Medium Priority</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
        </View>
      </Card>

      <Card style={styles.taskCard} variant="interactive">
        <View style={styles.taskRow}>
          <View style={[styles.priorityDot, { backgroundColor: colors.success }]} />
          <View style={styles.taskInfo}>
            <Text style={styles.taskTitle}>Site Cleanup</Text>
            <Text style={styles.taskMeta}>Level 3 • Low Priority</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
        </View>
      </Card>

      {/* Safety Banner */}
      <Card style={styles.safetyBanner} variant="flat">
        <View style={styles.safetyRow}>
          <Ionicons name="shield-checkmark" size={24} color={colors.warning} />
          <View style={styles.safetyText}>
            <Text style={styles.safetyTitle}>Daily Safety Checklist</Text>
            <Text style={styles.safetyDesc}>Complete before starting work</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
        </View>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing['2xl'],
  },
  headerLeft: {
    flex: 1,
  },
  greeting: {
    ...typography.h4,
    color: colors.ink,
    marginBottom: 2,
  },
  date: {
    ...typography.bodySmall,
    color: colors.neutral[500],
  },
  siteCard: {
    marginBottom: spacing['2xl'],
    padding: spacing.xl,
  },
  siteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  siteInfo: {
    flex: 1,
  },
  siteLabel: {
    ...typography.caption,
    color: colors.neutral[500],
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  siteName: {
    ...typography.h4,
    color: colors.ink,
    marginBottom: 2,
  },
  siteDetail: {
    ...typography.bodySmall,
    color: colors.neutral[600],
  },
  siteStats: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginBottom: spacing.xl,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statText: {
    ...typography.bodySmall,
    color: colors.neutral[500],
  },
  punchButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  punchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  punchText: {
    ...typography.button,
    color: colors.white,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h5,
    color: colors.ink,
  },
  seeAll: {
    ...typography.bodySmall,
    fontFamily: fontFamily.medium,
    color: colors.primary,
  },
  taskCard: {
    marginBottom: spacing.sm,
    padding: spacing.lg,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    ...typography.h6,
    color: colors.ink,
    marginBottom: 2,
  },
  taskMeta: {
    ...typography.caption,
    color: colors.neutral[500],
  },
  safetyBanner: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.warningBg,
  },
  safetyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  safetyText: {
    flex: 1,
  },
  safetyTitle: {
    ...typography.h6,
    color: colors.ink,
  },
  safetyDesc: {
    ...typography.caption,
    color: colors.neutral[600],
  },
});
