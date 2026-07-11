import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Image,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card, StatusChip } from '../../src/components';
import { useProjects } from '../../src/hooks/useProjects';
import { useDprTimeline, getDprMediaUrl } from '../../src/hooks/useDprTimeline';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

export default function ClientUpdatesScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { data: projects, refetch, isRefetching } = useProjects();
  const project = (projects || [])[0];

  const {
    data: timeline,
    refetch: refetchTimeline,
    isRefetching: isRefetchingTimeline,
  } = useDprTimeline(project?.id);

  const handleRefresh = () => {
    refetch();
    refetchTimeline();
  };

  const isLoading = isRefetching || isRefetchingTimeline;

  // Image tile width: 2-column grid with gap
  const tileSize = (width - spacing.lg * 2 - spacing.sm) / 2;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing['6xl'] }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={colors.primary} />
      }
    >
      <Text style={styles.title}>Project Updates</Text>
      {project && <Text style={styles.subtitle}>{project.name}</Text>}

      {/* Stage update card */}
      {project && (
        <Card style={styles.stageCard}>
          <View style={styles.stageRow}>
            <View style={styles.stageIcon}>
              <Ionicons name="construct" size={22} color={colors.primary} />
            </View>
            <View style={styles.stageInfo}>
              <Text style={styles.stageLabel}>Current Stage</Text>
              <Text style={styles.stageValue}>{project.stage || 'Not set'}</Text>
            </View>
            <View style={styles.progressBadge}>
              <Text style={styles.progressPct}>{project.progress_pct}%</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.min(100, project.progress_pct)}%` as any },
              ]}
            />
          </View>
        </Card>
      )}

      {/* DPR Media Timeline */}
      {timeline && timeline.length > 0 ? (
        <>
          <Text style={styles.sectionLabel}>Photo Timeline</Text>
          {timeline.map(({ dpr, media }) => (
            <View key={dpr.id} style={styles.timelineEntry}>
              {/* Date header */}
              <View style={styles.dateRow}>
                <View style={styles.dateDot} />
                <Text style={styles.dateText}>
                  {new Date(dpr.date).toLocaleDateString('en-IN', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
                {dpr.work_type && (
                  <View style={styles.workTypeBadge}>
                    <Text style={styles.workTypeText}>{dpr.work_type}</Text>
                  </View>
                )}
              </View>

              {/* Work description */}
              {dpr.work_done ? (
                <Text style={styles.workDone} numberOfLines={2}>
                  {dpr.work_done}
                </Text>
              ) : null}

              {/* Media grid */}
              <View style={styles.mediaGrid}>
                {media.map((m) => (
                  <TouchableOpacity key={m.id} activeOpacity={0.85}>
                    {m.type === 'photo' ? (
                      <Image
                        source={{ uri: getDprMediaUrl(m.storage_path) }}
                        style={[styles.mediaTile, { width: tileSize, height: tileSize }]}
                        resizeMode="cover"
                      />
                    ) : (
                      <View
                        style={[
                          styles.mediaTile,
                          styles.videoTile,
                          { width: tileSize, height: tileSize },
                        ]}
                      >
                        <Ionicons name="play-circle" size={40} color={colors.white} />
                        {m.duration_s != null && (
                          <Text style={styles.videoDuration}>
                            {Math.floor(m.duration_s / 60)}:{String(m.duration_s % 60).padStart(2, '0')}
                          </Text>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.divider} />
            </View>
          ))}
        </>
      ) : (
        <View style={styles.empty}>
          <Ionicons name="images-outline" size={56} color={colors.neutral[300]} />
          <Text style={styles.emptyTitle}>Photo Timeline</Text>
          <Text style={styles.emptyText}>
            Photos and videos from approved daily progress reports will appear here automatically
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  title: { ...typography.h3, color: colors.ink },
  subtitle: { ...typography.bodyMedium, color: colors.neutral[500], marginBottom: spacing.xl },

  stageCard: { padding: spacing.xl, marginBottom: spacing.xl },
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  stageIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageInfo: { flex: 1 },
  stageLabel: { ...typography.caption, color: colors.neutral[400] },
  stageValue: { ...typography.h6, color: colors.ink, textTransform: 'capitalize' },
  progressBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  progressPct: { ...typography.h6, color: colors.primary },
  progressTrack: { height: 6, backgroundColor: colors.neutral[100], borderRadius: radius.full },
  progressFill: { height: 6, backgroundColor: colors.primary, borderRadius: radius.full },

  sectionLabel: {
    ...typography.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.neutral[400],
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },

  timelineEntry: { marginBottom: spacing.md },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  dateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  dateText: { ...typography.caption, fontFamily: fontFamily.semiBold, color: colors.ink },
  workTypeBadge: {
    backgroundColor: colors.secondary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.full,
    marginLeft: spacing.xs,
  },
  workTypeText: {
    ...typography.caption,
    fontFamily: fontFamily.medium,
    color: colors.secondary,
    textTransform: 'capitalize',
  },
  workDone: {
    ...typography.bodySmall,
    color: colors.neutral[600],
    marginBottom: spacing.sm,
    paddingLeft: spacing.lg,
  },

  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingLeft: spacing.lg,
  },
  mediaTile: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.neutral[200],
  },
  videoTile: {
    backgroundColor: colors.neutral[800],
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  videoDuration: {
    ...typography.caption,
    color: colors.white,
    fontFamily: fontFamily.semiBold,
  },

  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginTop: spacing.lg,
    marginLeft: spacing.lg,
  },

  empty: { alignItems: 'center', paddingVertical: spacing['5xl'], gap: spacing.sm },
  emptyTitle: { ...typography.h5, color: colors.neutral[400] },
  emptyText: {
    ...typography.bodySmall,
    color: colors.neutral[400],
    textAlign: 'center',
    paddingHorizontal: spacing['2xl'],
  },
});
