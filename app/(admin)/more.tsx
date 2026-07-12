/**
 * Admin More Menu — matches reference screenshot_8 panel 13
 * All admin management, finance, settings links.
 */
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
import { Ionicons } from '@expo/vector-icons';

import { Card, Avatar } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { usePermissions } from '../../src/hooks/usePermissions';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

interface MenuItem {
  icon: string;
  label: string;
  route: string;
  color?: string;
  badge?: number;
  /** permission key required to see this item (owner sees all) */
  perm?: string;
}

const SECTIONS: { title: string; items: MenuItem[] }[] = [
  {
    title: 'Management',
    items: [
      { icon: 'document-text', label: 'DPR Management', route: '/(admin)/dpr-management', color: colors.info, perm: 'dpr_approvals' },
      { icon: 'folder', label: 'Documents Vault', route: '/(admin)/documents', color: colors.primary },
      { icon: 'cube', label: 'Materials', route: '/(admin)/materials', color: colors.warning, perm: 'materials' },
      { icon: 'business', label: 'Clients', route: '/(admin)/clients', color: colors.info, perm: 'clients' },
      { icon: 'calendar', label: 'Calendar', route: '/(admin)/calendar', color: colors.primary },
      { icon: 'people', label: 'Attendance Report', route: '/(admin)/attendance-report', color: colors.success, perm: 'attendance' },
      { icon: 'search', label: 'Global Search', route: '/(admin)/global-search', color: colors.warning },
      { icon: 'people-circle', label: 'Assign Site & Workers', route: '/(admin)/assign-site', color: colors.info },
      { icon: 'person-add', label: 'Employee Requests', route: '/(admin)/employee-requests', color: colors.warning },
      { icon: 'repeat', label: 'Recurring Tasks', route: '/(admin)/recurring-tasks', color: colors.success },
      { icon: 'qr-code', label: 'Project QR Codes', route: '/(admin)/project-qr', color: colors.primary },
    ],
  },
  {
    title: 'Reports & Analytics',
    items: [
      { icon: 'bar-chart', label: 'Analytics', route: '/(admin)/analytics', color: colors.info },
      { icon: 'list', label: 'Audit Log', route: '/(admin)/audit-log', color: colors.neutral[600] },
    ],
  },
  {
    title: 'Settings',
    items: [
      { icon: 'person-circle', label: 'My Profile', route: '/(admin)/my-profile', color: colors.primary },
      { icon: 'business', label: 'Company Settings', route: '/(admin)/company-settings', color: colors.neutral[700], perm: 'settings' },
      { icon: 'shield-checkmark', label: 'Roles & Permissions', route: '/(admin)/roles-permissions', color: colors.warning, perm: 'settings' },
      { icon: 'notifications', label: 'Notification Settings', route: '/(admin)/notification-settings', color: colors.info },
      { icon: 'language', label: 'Language', route: '/(admin)/language-settings', color: colors.success },
      { icon: 'cloud-download', label: 'Backup & Restore', route: '/(admin)/backup-restore', color: colors.pending },
      { icon: 'help-circle', label: 'Help & Support', route: '/(admin)/help-about', color: colors.neutral[500] },
      { icon: 'information-circle', label: 'About Fine Glaze COS', route: '/(admin)/help-about', color: colors.primary },
    ],
  },
];

export default function AdminMoreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const { can } = usePermissions();

  const visibleSections = SECTIONS.map((sec) => ({
    ...sec,
    items: sec.items.filter((item) => !item.perm || can(item.perm as any)),
  })).filter((sec) => sec.items.length > 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing['6xl'] }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile card */}
      <Card style={styles.profileCard}>
        <View style={styles.profileRow}>
          <Avatar name={profile?.full_name || 'Admin'} uri={profile?.avatar_url} size={56} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.full_name || 'Admin'}</Text>
            <Text style={styles.profileRole}>{profile?.role?.replace('_', ' ') || 'Admin'}</Text>
            <Text style={styles.profilePhone}>{profile?.phone || ''}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
        </View>
      </Card>

      {/* Menu sections */}
      {visibleSections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Card style={styles.menuCard}>
            {section.items.map((item, idx) => (
              <React.Fragment key={item.label}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => router.push(item.route as any)}
                >
                  <View style={[styles.menuIcon, { backgroundColor: (item.color || colors.primary) + '15' }]}>
                    <Ionicons name={item.icon as any} size={20} color={item.color || colors.primary} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {item.badge && item.badge > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={18} color={colors.neutral[300]} />
                </TouchableOpacity>
                {idx < section.items.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </Card>
        </View>
      ))}

      {/* Logout */}
      <TouchableOpacity
        style={styles.logoutBtn}
        onPress={() => {
          signOut();
          router.replace('/(auth)/welcome');
        }}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.error} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },
  profileCard: { padding: spacing.xl, marginBottom: spacing.xl },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  profileInfo: { flex: 1 },
  profileName: { ...typography.h5, color: colors.ink },
  profileRole: { ...typography.caption, color: colors.primary, textTransform: 'capitalize', marginTop: 2 },
  profilePhone: { ...typography.caption, color: colors.neutral[500], marginTop: 2 },
  section: { marginBottom: spacing.xl },
  sectionTitle: { ...typography.caption, color: colors.neutral[500], textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm, marginLeft: spacing.xs },
  menuCard: { padding: 0, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, paddingHorizontal: spacing.lg, gap: spacing.md },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, ...typography.bodyMedium, fontFamily: fontFamily.medium, color: colors.ink },
  badge: { backgroundColor: colors.error, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { ...typography.caption, color: colors.white, fontFamily: fontFamily.semiBold, fontSize: 10 },
  divider: { height: 1, backgroundColor: colors.neutral[100], marginLeft: spacing.lg + 36 + spacing.md },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    paddingVertical: spacing.lg, marginTop: spacing.md,
  },
  logoutText: { ...typography.bodyMedium, fontFamily: fontFamily.semiBold, color: colors.error },
});
