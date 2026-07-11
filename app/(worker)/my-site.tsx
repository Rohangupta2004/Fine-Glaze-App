import React from 'react';
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
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

export default function MySiteScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const { data: projects } = useProjects();
  const site = projects?.[0] ?? null;

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleMap = () => {
    if (site?.lat && site?.lng) {
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${site.lat},${site.lng}`
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
        <Text style={styles.title}>My Site</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
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
                  <Text style={styles.siteLabel}>Active Site</Text>
                  <Text style={styles.siteName}>{site.name}</Text>
                  <Text style={styles.siteStage}>{site.stage ?? '—'}</Text>
                </View>
                <StatusChip status={site.status} />
              </View>

              {/* Progress */}
              <View style={styles.progressRow}>
                <Text style={styles.progressLabel}>Progress</Text>
                <Text style={styles.progressPct}>{site.progress_pct ?? 0}%</Text>
              </View>
              <View style={styles.progressBar}>
                <View
                  style={[styles.progressFill, { width: `${site.progress_pct ?? 0}%` as any }]}
                />
              </View>

              {/* Details */}
              <View style={styles.detailsGrid}>
                <View style={styles.detailItem}>
                  <Ionicons name="location-outline" size={16} color={colors.neutral[500]} />
                  <Text style={styles.detailText}>{site.address ?? site.city ?? '—'}</Text>
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
                      Due {new Date(site.expected_end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                )}
              </View>

              {/* Map button */}
              {(site.lat && site.lng) && (
                <TouchableOpacity style={styles.mapBtn} onPress={handleMap}>
                  <Ionicons name="map-outline" size={18} color={colors.primary} />
                  <Text style={styles.mapBtnText}>Open in Maps</Text>
                </TouchableOpacity>
              )}
            </Card>

            {/* Shift info */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Shift Info</Text>
            </View>
            <Card style={styles.infoCard}>
              <InfoRow
                icon="time-outline"
                label="Shift Start"
                value="08:00 AM"
              />
              <InfoRow
                icon="time-outline"
                label="Shift End"
                value="06:00 PM"
              />
              <InfoRow
                icon="locate-outline"
                label="Geofence Radius"
                value={`${site.geofence_radius_m ?? 100} m`}
              />
            </Card>

            {/* Emergency contact */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Emergency Contact</Text>
            </View>
            <Card style={styles.infoCard}>
              <View style={styles.contactRow}>
                <Avatar name="Site Safety" size={40} />
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>Site Safety Officer</Text>
                  <Text style={styles.contactRole}>Emergency</Text>
                </View>
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => handleCall('100')}
                >
                  <Ionicons name="call" size={20} color={colors.white} />
                </TouchableOpacity>
              </View>
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
