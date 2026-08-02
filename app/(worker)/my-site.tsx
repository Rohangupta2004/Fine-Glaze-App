import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card, StatusChip, Avatar } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useProjects } from '../../src/hooks/useProjects';
import { useMyAssignedProjects } from '../../src/hooks/useAssignedProjects';
import { useProjectBOQ } from '../../src/hooks/useBOQ';
import { useProjectTasks } from '../../src/hooks/useTasks';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

import { useTodayAttendance } from '../../src/hooks/useAttendance';

export default function MySiteScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);

  const { data: assignedProjects = [] } = useMyAssignedProjects(profile?.id);
  const { data: todayAttendance } = useTodayAttendance(profile?.id);
  const availableProjects = assignedProjects;

  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const punchedInSite = todayAttendance?.project_id ? availableProjects.find(p => p.id === todayAttendance.project_id) : null;
  const site = selectedProjectId
    ? (availableProjects.find(p => p.id === selectedProjectId) || null)
    : (punchedInSite || availableProjects[0] || null);

  const { data: boqItems = [] } = useProjectBOQ(site?.id);
  const { data: siteTasks = [] } = useProjectTasks(site?.id);

  const totalBOQItems = boqItems.length;
  const completedBOQItems = boqItems.filter(i => (i.completed_quantity || 0) >= (i.quantity || 1)).length;
  const boqPct = totalBOQItems > 0 ? Math.round((completedBOQItems / totalBOQItems) * 100) : (site?.progress_pct ?? 0);

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleMap = () => {
    if (site?.lat && site?.lng) {
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${site.lat},${site.lng}`
      );
    } else if (site?.address) {
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.address)}`
      );
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Project Workspace</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Site Selector Chips if multiple assigned */}
        {availableProjects.length > 1 && (
          <View style={{ marginBottom: spacing.md }}>
            <Text style={styles.sectionTitle}>Select Assigned Workspace</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingTop: 4 }}>
              {availableProjects.map((p) => {
                const isSel = p.id === site?.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setSelectedProjectId(p.id)}
                    style={{
                      paddingHorizontal: spacing.md,
                      paddingVertical: 8,
                      borderRadius: radius.full,
                      backgroundColor: isSel ? colors.primary : colors.neutral[100],
                      borderWidth: 1,
                      borderColor: isSel ? colors.primary : colors.neutral[300],
                    }}
                  >
                    <Text style={{ color: isSel ? '#fff' : colors.ink, fontFamily: fontFamily.semiBold, fontSize: 12 }}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {!site ? (
          <Card style={styles.emptyCard} variant="flat">
            <Ionicons name="business-outline" size={48} color={colors.neutral[300]} />
            <Text style={styles.emptyText}>No site assigned yet</Text>
          </Card>
        ) : (
          <>
            {/* Site card */}
            <Card style={styles.siteCard}>
              <View style={styles.siteTop}>
                <View style={styles.siteInfo}>
                  <Text style={styles.siteLabel}>ACTIVE SITE WORKSPACE</Text>
                  <Text style={styles.siteName}>{site.name}</Text>
                  <Text style={styles.siteStage}>{site.stage ? `Stage: ${site.stage}` : 'In Progress'}</Text>
                </View>
                <StatusChip status={site.status || 'on_track'} />
              </View>

              {/* Progress */}
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>Overall Scope Completion</Text>
                <Text style={styles.progressPct}>{boqPct}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${boqPct}%` as any }]}
                />
              </View>

              {/* Details */}
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Ionicons name="location-outline" size={16} color={colors.neutral[500]} />
                  <Text style={styles.detailText}>{site.address ?? site.city ?? 'Location N/A'}</Text>
                </View>
                {site.start_date && (
                  <View style={styles.detailItem}>
                    <Ionicons name="calendar-outline" size={16} color={colors.neutral[500]} />
                    <Text style={styles.detailText}>
                      Started {new Date(site.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                )}
                {site.expected_end_date && (
                  <View style={styles.detailItem}>
                    <Ionicons name="flag-outline" size={16} color={colors.neutral[500]} />
                    <Text style={styles.detailText}>
                      Target {new Date(site.expected_end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                )}
              </View>

              {/* Action buttons */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity style={[styles.mapBtn, { flex: 1 }]} onPress={handleMap}>
                  <Ionicons name="map-outline" size={18} color={colors.primary} />
                  <Text style={styles.mapBtnText}>Open Map</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.mapBtn, { flex: 1, backgroundColor: colors.primary, borderColor: colors.primary }]}
                  onPress={() => router.push('/(worker)/dpr' as any)}
                >
                  <Ionicons name="document-text-outline" size={18} color="#fff" />
                  <Text style={[styles.mapBtnText, { color: '#fff' }]}>Submit DPR</Text>
                </TouchableOpacity>
              </View>
            </Card>

            {/* BOQ Scope Items */}
            {boqItems.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Project BOQ Scope Items ({boqItems.length})</Text>
                </View>
                <Card style={[styles.infoCard, { gap: 10, marginBottom: spacing.xl }]}>
                  {boqItems.slice(0, 5).map((item) => {
                    const doneQty = item.completed_quantity || 0;
                    const totalQty = item.quantity || 1;
                    const itemPct = Math.min(100, Math.round((doneQty / totalQty) * 100));
                    return (
                      <View key={item.id} style={{ paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontSize: 13, fontFamily: fontFamily.semiBold, color: colors.ink }}>{item.item_name}</Text>
                          <Text style={{ fontSize: 12, fontFamily: fontFamily.bold, color: colors.primary }}>{itemPct}%</Text>
                        </View>
                        <Text style={{ fontSize: 11, color: colors.neutral[500] }}>
                          {doneQty} / {totalQty} {item.unit}
                        </Text>
                      </View>
                    );
                  })}
                </Card>
              </>
            )}

            {/* Site Tasks */}
            {siteTasks.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Site Tasks ({siteTasks.length})</Text>
                </View>
                <Card style={[styles.infoCard, { gap: 10, marginBottom: spacing.xl }]}>
                  {siteTasks.slice(0, 4).map((t: any) => (
                    <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.neutral[100] }}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <Text style={{ fontSize: 13, fontFamily: fontFamily.medium, color: colors.ink }}>{t.title}</Text>
                        <Text style={{ fontSize: 11, color: colors.neutral[500] }}>{t.level_zone || 'General Zone'}</Text>
                      </View>
                      <StatusChip status={t.status || 'pending'} />
                    </View>
                  ))}
                </Card>
              </>
            )}

            {/* Shift info */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Shift Info & Radius</Text>
            </View>
            <Card style={styles.infoCard}>
              <InfoRow
                icon="time-outline"
                label="Shift Hours"
                value="08:00 AM – 06:00 PM"
              />
              <InfoRow
                icon="locate-outline"
                label="Attendance Radius"
                value={`${site.geofence_radius_m ?? 100} m`}
              />
            </Card>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={colors.neutral[500]} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral[200],
    backgroundColor: colors.white,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h5,
    color: colors.ink,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['5xl'],
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing['3xl'],
    gap: spacing.md,
  },
  emptyText: {
    ...typography.bodyMedium,
    color: colors.neutral[400],
  },
  siteCard: {
    marginBottom: spacing.xl,
    padding: spacing.xl,
  },
  siteTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
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
  siteStage: {
    ...typography.bodySmall,
    color: colors.neutral[600],
    textTransform: 'capitalize',
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  progressLabel: {
    ...typography.caption,
    color: colors.neutral[500],
  },
  progressPct: {
    ...typography.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.primary,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.neutral[100],
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: spacing.xl,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  detailsGrid: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  detailText: {
    ...typography.bodySmall,
    color: colors.neutral[600],
    flex: 1,
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  mapBtnText: {
    ...typography.buttonSmall,
    color: colors.primary,
  },
  sectionHeader: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.neutral[400],
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  infoCard: {
    padding: spacing.lg,
    marginBottom: spacing.xl,
    gap: spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  infoLabel: {
    ...typography.bodySmall,
    color: colors.neutral[500],
    flex: 1,
  },
  infoValue: {
    ...typography.bodySmall,
    fontFamily: fontFamily.medium,
    color: colors.ink,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    ...typography.h6,
    color: colors.ink,
  },
  contactRole: {
    ...typography.caption,
    color: colors.neutral[500],
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
