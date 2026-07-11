import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Card, Button } from '../../src/components';
import { useOutboxPending } from '../../src/hooks/useOutboxPending';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

const TYPE_LABEL: Record<string, string> = {
  punch_in: 'Punch In',
  punch_out: 'Punch Out',
  dpr: 'DPR Upload',
  safety_check: 'Safety Checklist',
};

const TYPE_ICON: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  punch_in: 'finger-print',
  punch_out: 'exit-outline',
  dpr: 'camera-outline',
  safety_check: 'shield-checkmark-outline',
};

export default function OfflineSyncScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { pendingItems: queue, isSyncing, unsyncedCount: pendingCount, flushNow: retryAll } = useOutboxPending();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </TouchableOpacity>
        <Text style={styles.title}>Offline Sync</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Status banner */}
        <Card
          style={{
            ...styles.statusBanner,
            backgroundColor: pendingCount > 0 ? colors.warningBg : colors.successBg,
          }}
          variant="flat"
        >
          <View style={styles.bannerRow}>
            <Ionicons
              name={pendingCount > 0 ? 'cloud-offline-outline' : 'cloud-done-outline'}
              size={28}
              color={pendingCount > 0 ? colors.warning : colors.success}
            />
            <View style={styles.bannerText}>
              <Text style={styles.bannerTitle}>
                {pendingCount > 0 ? `${pendingCount} item${pendingCount > 1 ? 's' : ''} pending sync` : 'All synced'}
              </Text>
              <Text style={styles.bannerBody}>
                {pendingCount > 0
                  ? 'These records are saved locally and will sync when you\'re online.'
                  : 'All your data is up to date with the server.'}
              </Text>
            </View>
          </View>
        </Card>

        {/* Retry button */}
        {pendingCount > 0 && (
          <Button
            title={isSyncing ? 'Syncing…' : 'Retry Sync Now'}
            onPress={retryAll}
            disabled={isSyncing}
            style={styles.retryBtn}
          />
        )}

        {/* Queue list */}
        {queue.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Pending Items</Text>
            {queue.map((item) => (
              <Card key={item.id} style={styles.queueCard} variant="interactive">
                <View style={styles.queueRow}>
                  <View style={styles.queueIconWrap}>
                    <Ionicons
                      name={TYPE_ICON[item.type] ?? 'cloud-upload-outline'}
                      size={22}
                      color={colors.warning}
                    />
                  </View>
                  <View style={styles.queueInfo}>
                    <Text style={styles.queueType}>{TYPE_LABEL[item.type] ?? item.type}</Text>
                    <Text style={styles.queueTime}>
                      Saved at{' '}
                      {new Date(item.created_at).toLocaleTimeString('en-IN', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true,
                      })}
                      {item.attempts > 0 ? ` • ${item.attempts} attempt${item.attempts > 1 ? 's' : ''}` : ''}
                    </Text>
                  </View>
                  {isSyncing ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <View style={styles.pendingDot} />
                  )}
                </View>
              </Card>
            ))}
          </>
        )}

        {/* Empty state */}
        {queue.length === 0 && (
          <View style={styles.empty}>
            <Ionicons name="checkmark-circle-outline" size={72} color={colors.success} />
            <Text style={styles.emptyTitle}>Nothing pending</Text>
            <Text style={styles.emptyBody}>
              All your punch-ins and DPRs have been synced successfully.
            </Text>
          </View>
        )}

        {/* Info note */}
        <Card style={styles.infoCard} variant="flat">
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={16} color={colors.info} />
            <Text style={styles.infoText}>
              Punch-ins and DPRs are saved offline first. They sync automatically when you come online.
              Data is never lost even without network.
            </Text>
          </View>
        </Card>
      </ScrollView>
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
    gap: spacing.lg,
  },
  statusBanner: {
    padding: spacing.xl,
  },
  bannerRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    ...typography.h6,
    color: colors.ink,
    marginBottom: 4,
  },
  bannerBody: {
    ...typography.bodySmall,
    color: colors.neutral[600],
  },
  retryBtn: {
    marginTop: -spacing.sm,
  },
  sectionLabel: {
    ...typography.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.neutral[400],
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  queueCard: {
    padding: spacing.lg,
    marginTop: spacing.xs,
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  queueIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.warningBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueInfo: {
    flex: 1,
  },
  queueType: {
    ...typography.h6,
    color: colors.ink,
    marginBottom: 2,
  },
  queueTime: {
    ...typography.caption,
    color: colors.neutral[500],
  },
  pendingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.warning,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing['3xl'],
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    ...typography.h5,
    color: colors.neutral[400],
  },
  emptyBody: {
    ...typography.bodySmall,
    color: colors.neutral[400],
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: colors.infoBg,
    padding: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  infoText: {
    ...typography.caption,
    color: colors.neutral[600],
    flex: 1,
  },
});
