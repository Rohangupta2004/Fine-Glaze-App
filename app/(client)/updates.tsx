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

import { GradientIcon, AnimatedStateView } from '../../src/components';
import { useProjects } from '../../src/hooks/useProjects';
import { useDprTimeline } from '../../src/hooks/useDprTimeline';
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
    <View style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing['6xl'] }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor="#695030" />
        }
      >
        <Text style={styles.title}>Project Updates</Text>
        {project && <Text style={styles.subtitle}>{project.name}</Text>}

        {/* Double-Bezel (Doppelrand) Stage Card */}
        {project && (
          <View style={styles.outerShell}>
            <View style={styles.innerCore}>
              <View style={styles.eyebrowTag}>
                <Text style={styles.eyebrowText}>● LIVE SITE STAGE</Text>
              </View>

              <View style={styles.stageRow}>
                <GradientIcon name="construct-outline" iconSize={20} colors={['#695030', '#8B6840']} />
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
            </View>
          </View>
        )}

        {/* DPR Media Timeline */}
        {timeline && timeline.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>Photo & Site Timeline</Text>
            {timeline.map(({ dpr, media }) => (
              <View key={dpr.id} style={styles.outerShellCard}>
                <View style={styles.innerCoreCard}>
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
                  {media && media.length > 0 && (
                    <View style={styles.mediaGrid}>
                      {media.map((m) => (
                        <TouchableOpacity key={m.id} activeOpacity={0.85}>
                          {m.type === 'photo' ? (
                            <Image
                              source={{ uri: m.signedUrl }}
                              style={[styles.mediaTile, { width: tileSize - spacing.xl, height: tileSize - spacing.xl }]}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={[styles.mediaTile, styles.videoTile, { width: tileSize - spacing.xl, height: tileSize - spacing.xl }]}>
                              <Ionicons name="videocam" size={28} color="#FFFFFF" />
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            ))}
          </>
        ) : (
          <AnimatedStateView
            type="empty"
            title="No Progress Photos Uploaded Yet"
            message="Site progress photos and daily DPR updates uploaded by site supervisors will appear here automatically."
            actionLabel="Refresh Timeline"
            onAction={handleRefresh}
          />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', paddingHorizontal: spacing.lg },
  title: { ...typography.h4, color: '#1E1815', fontFamily: fontFamily.semiBold },
  subtitle: { ...typography.bodySmall, color: '#695030', marginTop: 2, marginBottom: spacing.lg, fontFamily: fontFamily.regular },

  // Double-Bezel Outer Shell & Inner Core
  outerShell: {
    backgroundColor: 'rgba(184, 144, 71, 0.08)',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(184, 144, 71, 0.25)',
    padding: 6,
    marginBottom: spacing.xl,
    boxShadow: '0px 6px 18px rgba(105, 80, 48, 0.08)',
  } as any,
  innerCore: {
    backgroundColor: '#F5F2EC',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    padding: spacing.lg,
  },

  outerShellCard: {
    backgroundColor: 'rgba(184, 144, 71, 0.08)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(184, 144, 71, 0.22)',
    padding: 5,
    marginBottom: spacing.lg,
    boxShadow: '0px 4px 14px rgba(105, 80, 48, 0.07)',
  } as any,
  innerCoreCard: {
    backgroundColor: '#F5F2EC',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    padding: spacing.md,
  },

  eyebrowTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(105, 80, 48, 0.08)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    marginBottom: 8,
  },
  eyebrowText: { ...typography.caption, color: '#695030', fontFamily: fontFamily.semiBold, fontSize: 9, letterSpacing: 1.1 },

  stageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  stageInfo: { flex: 1 },
  stageLabel: { ...typography.caption, color: '#695030', fontFamily: fontFamily.regular },
  stageValue: { ...typography.h6, color: '#1E1815', fontFamily: fontFamily.semiBold },
  progressBadge: { backgroundColor: 'rgba(105, 80, 48, 0.15)', paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.full },
  progressPct: { ...typography.caption, fontFamily: fontFamily.semiBold, color: '#695030' },
  progressTrack: { height: 8, backgroundColor: 'rgba(105, 80, 48, 0.1)', borderRadius: radius.full, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#695030', borderRadius: radius.full },

  sectionLabel: { ...typography.label, color: '#695030', marginBottom: spacing.md, textTransform: 'uppercase', letterSpacing: 0.8, fontFamily: fontFamily.medium },

  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  dateDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: '#695030' },
  dateText: { ...typography.bodySmall, fontFamily: fontFamily.semiBold, color: '#1E1815' },
  workTypeBadge: { backgroundColor: 'rgba(105, 80, 48, 0.12)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, marginLeft: spacing.xs },
  workTypeText: { ...typography.caption, fontSize: 10, color: '#695030', fontFamily: fontFamily.medium },
  workDone: { ...typography.bodyMedium, color: '#1E1815', marginBottom: spacing.md, fontFamily: fontFamily.regular },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  mediaTile: { borderRadius: radius.md },
  videoTile: { backgroundColor: '#1E1815', alignItems: 'center', justifyContent: 'center' },
});
