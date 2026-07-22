import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Avatar } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { useProjects } from '../../src/hooks/useProjects';
import { useClientApprovals } from '../../src/hooks/useClientApprovals';
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
    <View style={{ flex: 1, backgroundColor: '#FAF8F5' }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing['6xl'] }}
        showsVerticalScrollIndicator={false}
      >
        {/* Double-Bezel Profile Card */}
        <View style={styles.outerShell}>
          <View style={styles.innerCore}>
            <View style={styles.profileRow}>
              <Avatar name={profile?.full_name || 'Client'} uri={profile?.avatar_url} size={54} />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{profile?.full_name || 'Client'}</Text>
                <Text style={styles.profileRole}>Client Executive Portal</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Access Section Card — Double Bezel */}
        <Text style={styles.sectionLabel}>Quick Access</Text>
        <View style={styles.outerShell}>
          <View style={[styles.innerCore, { padding: 0 }]}>
            {/* Approvals */}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => router.push('/(client)/approvals')}
              activeOpacity={0.7}
            >
              <View style={styles.iconChip}>
                <Ionicons name="checkmark-done-circle-outline" size={20} color="#695030" />
              </View>
              <Text style={styles.menuLabel}>Approval Requests</Text>
              {pendingCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{pendingCount}</Text>
                </View>
              )}
              <Ionicons name="chevron-forward" size={18} color="#8B6840" />
            </TouchableOpacity>

            {/* Materials */}
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemBorder]}
              onPress={() => router.push('/(client)/materials' as any)}
              activeOpacity={0.7}
            >
              <View style={styles.iconChip}>
                <Ionicons name="cube-outline" size={20} color="#695030" />
              </View>
              <Text style={styles.menuLabel}>Materials & Stock</Text>
              <Ionicons name="chevron-forward" size={18} color="#8B6840" />
            </TouchableOpacity>

            {/* Project Chat */}
            <TouchableOpacity
              style={[styles.menuItem, styles.menuItemBorder]}
              onPress={() => router.push('/(client)/chat')}
              activeOpacity={0.7}
            >
              <View style={styles.iconChip}>
                <Ionicons name="chatbubbles-outline" size={20} color="#695030" />
              </View>
              <Text style={styles.menuLabel}>Project Communication Chat</Text>
              <Ionicons name="chevron-forward" size={18} color="#8B6840" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Preferences Section Card — Double Bezel */}
        <Text style={styles.sectionLabel}>Preferences & Support</Text>
        <View style={styles.outerShell}>
          <View style={[styles.innerCore, { padding: 0 }]}>
            <TouchableOpacity style={styles.menuItem} activeOpacity={0.7}>
              <View style={styles.iconChip}>
                <Ionicons name="person-outline" size={20} color="#695030" />
              </View>
              <Text style={styles.menuLabel}>My Profile</Text>
              <Ionicons name="chevron-forward" size={18} color="#8B6840" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, styles.menuItemBorder]} activeOpacity={0.7}>
              <View style={styles.iconChip}>
                <Ionicons name="language-outline" size={20} color="#695030" />
              </View>
              <Text style={styles.menuLabel}>{t('settings.language')}</Text>
              <Ionicons name="chevron-forward" size={18} color="#8B6840" />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.menuItem, styles.menuItemBorder]} activeOpacity={0.7}>
              <View style={styles.iconChip}>
                <Ionicons name="help-circle-outline" size={20} color="#695030" />
              </View>
              <Text style={styles.menuLabel}>{t('settings.help')}</Text>
              <Ionicons name="chevron-forward" size={18} color="#8B6840" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Executive Logout Button */}
        <TouchableOpacity onPress={handleLogout} activeOpacity={0.8} style={styles.logoutWrap}>
          <LinearGradient
            colors={['#FEF2F2', '#FEE2E2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoutBtn}
          >
            <Ionicons name="log-out-outline" size={20} color="#DC2626" />
            <Text style={styles.logoutText}>{t('settings.logout')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', paddingHorizontal: spacing.lg },

  // Double-Bezel Shells & Core
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

  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  profileInfo: { flex: 1 },
  profileName: { ...typography.h5, color: '#1E1815', fontFamily: fontFamily.semiBold },
  profileRole: { ...typography.bodySmall, color: '#695030', marginTop: 2, fontFamily: fontFamily.regular },

  sectionLabel: {
    ...typography.caption,
    fontFamily: fontFamily.semiBold,
    color: '#695030',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
    marginLeft: 4,
  },

  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  menuItemBorder: { borderTopWidth: 1, borderTopColor: 'rgba(105, 80, 48, 0.08)' },

  // Light Champagne Glass Icon Badges
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(105, 80, 48, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(184, 144, 71, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  menuLabel: {
    flex: 1,
    ...typography.bodyMedium,
    fontFamily: fontFamily.semiBold,
    color: '#1E1815',
  },

  badge: {
    backgroundColor: '#DC2626',
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  badgeText: { ...typography.caption, color: '#FFFFFF', fontFamily: fontFamily.semiBold },

  logoutWrap: { marginTop: spacing.md, marginBottom: spacing.xl },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.2)',
  },
  logoutText: { ...typography.button, color: '#DC2626', fontFamily: fontFamily.semiBold },
});
