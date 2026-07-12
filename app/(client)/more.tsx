import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Avatar, Card } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useProjects } from '../../src/hooks/useProjects';
import { useClientApprovals } from '../../src/hooks/useClientApprovals';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

export default function ClientMoreScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const { profile, signOut } = useAuthStore();

  // Load project for approval count badge
  const { data: projects } = useProjects();
  const project = (projects || [])[0];
  const { data: approvals } = useClientApprovals(project?.id);
  const pendingCount = (approvals || []).filter((a) => a.status === 'pending').length;

  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)/welcome');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing['6xl'] }}
    >
      {/* Profile card */}
      <Card style={styles.profileCard}>
        <View style={styles.profileRow}>
          <Avatar name={profile?.full_name || 'Client'} uri={profile?.avatar_url} size={56} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.full_name || 'Client'}</Text>
            <Text style={styles.profileRole}>Client</Text>
          </View>
        </View>
      </Card>

      {/* Quick actions */}
      <Text style={styles.sectionLabel}>Quick Access</Text>
      <Card style={styles.menuCard}>
        {/* Approvals */}
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/(client)/approvals')}
          accessibilityLabel="Open Approvals"
        >
          <View style={styles.menuIconWrap}>
            <Ionicons name="checkmark-done-circle-outline" size={22} color={colors.primary} />
          </View>
          <Text style={styles.menuLabel}>Approval Requests</Text>
          {pendingCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingCount}</Text>
            </View>
          )}
          <Ionicons name="chevron-forward" size={18} color={colors.neutral[300]} />
        </TouchableOpacity>

        {/* Materials */}
        <TouchableOpacity
          style={[styles.menuItem, styles.menuItemBorder]}
          onPress={() => router.push('/(client)/materials' as any)}
          accessibilityLabel="Open Materials"
        >
          <View style={styles.menuIconWrap}>
            <Ionicons name="cube-outline" size={22} color={colors.primary} />
          </View>
          <Text style={styles.menuLabel}>Materials</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.neutral[300]} />
        </TouchableOpacity>

        {/* Project Chat */}
        <TouchableOpacity
          style={[styles.menuItem, styles.menuItemBorder]}
          onPress={() => router.push('/(client)/chat')}
          accessibilityLabel="Open Project Chat"
        >
          <View style={styles.menuIconWrap}>
            <Ionicons name="chatbubbles-outline" size={22} color={colors.primary} />
          </View>
          <Text style={styles.menuLabel}>Project Chat</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.neutral[300]} />
        </TouchableOpacity>
      </Card>

      {/* Settings */}
      <Text style={styles.sectionLabel}>Settings</Text>
      <Card style={{ ...styles.menuCard, marginBottom: spacing.xl }}>
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuIconWrap}>
            <Ionicons name="person-outline" size={22} color={colors.neutral[600]} />
          </View>
          <Text style={styles.menuLabel}>Profile</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.neutral[300]} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, styles.menuItemBorder]}>
          <View style={styles.menuIconWrap}>
            <Ionicons name="language-outline" size={22} color={colors.neutral[600]} />
          </View>
          <Text style={styles.menuLabel}>{t('settings.language')}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.neutral[300]} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.menuItem, styles.menuItemBorder]}>
          <View style={styles.menuIconWrap}>
            <Ionicons name="help-circle-outline" size={22} color={colors.neutral[600]} />
          </View>
          <Text style={styles.menuLabel}>{t('settings.help')}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.neutral[300]} />
        </TouchableOpacity>
      </Card>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color={colors.error} />
        <Text style={styles.logoutText}>{t('settings.logout')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },

  profileCard: { padding: spacing.lg, marginBottom: spacing.xl },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  profileInfo: { flex: 1 },
  profileName: { ...typography.h5, color: colors.ink },
  profileRole: { ...typography.bodySmall, color: colors.neutral[500] },

  sectionLabel: {
    ...typography.caption,
    fontFamily: fontFamily.semiBold,
    color: colors.neutral[400],
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },

  menuCard: { padding: 0, overflow: 'hidden', marginBottom: spacing.xl },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  menuItemBorder: { borderTopWidth: 1, borderTopColor: colors.neutral[100] },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    flex: 1,
    ...typography.bodyMedium,
    fontFamily: fontFamily.medium,
    color: colors.ink,
  },

  badge: {
    backgroundColor: colors.error,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { ...typography.caption, color: colors.white, fontFamily: fontFamily.semiBold },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  logoutText: { ...typography.button, color: colors.error },
});
