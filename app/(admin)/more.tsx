/**
 * Admin More Menu — Clean grouped layout
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
  color: string;
  perm?: string;
}

const SECTIONS: { title: string; icon: string; items: MenuItem[] }[] = [
  {
    title: 'People',
    icon: 'people',
    items: [
      { icon: 'people', label: 'Employees', route: '/(admin)/employees', color: '#6366F1' },
      { icon: 'business', label: 'Clients', route: '/(admin)/clients', color: '#0EA5E9', perm: 'clients' },
      { icon: 'people-circle', label: 'Assign Site & Workers', route: '/(admin)/assign-site', color: '#8B5CF6' },
    ],
  },
  {
    title: 'Operations',
    icon: 'briefcase',
    items: [
      { icon: 'folder', label: 'Documents', route: '/(admin)/documents', color: colors.primary },
      { icon: 'cube', label: 'Materials & Stock', route: '/(admin)/materials', color: '#D97706', perm: 'materials' },
      { icon: 'chatbubbles', label: 'Messages', route: '/(admin)/chat', color: '#10B981' },
      { icon: 'people', label: 'Attendance', route: '/(admin)/attendance-report', color: '#059669', perm: 'attendance' },
      { icon: 'calendar', label: 'Calendar', route: '/(admin)/calendar', color: '#0EA5E9' },
      { icon: 'repeat', label: 'Recurring Tasks', route: '/(admin)/recurring-tasks', color: '#6366F1' },
      { icon: 'qr-code', label: 'QR Codes', route: '/(admin)/project-qr', color: colors.primary },
    ],
  },
  {
    title: 'Reports',
    icon: 'bar-chart',
    items: [
      { icon: 'bar-chart', label: 'Analytics', route: '/(admin)/analytics', color: '#0EA5E9' },
      { icon: 'list', label: 'Audit Log', route: '/(admin)/audit-log', color: '#64748B' },
      { icon: 'search', label: 'Global Search', route: '/(admin)/global-search', color: '#D97706' },
    ],
  },
  {
    title: 'Settings',
    icon: 'settings',
    items: [
      { icon: 'person-circle', label: 'My Profile', route: '/(admin)/my-profile', color: colors.primary },
      { icon: 'business', label: 'Company Settings', route: '/(admin)/company-settings', color: '#64748B', perm: 'settings' },
      { icon: 'shield-checkmark', label: 'Roles & Permissions', route: '/(admin)/roles-permissions', color: '#D97706', perm: 'settings' },
      { icon: 'notifications', label: 'Notifications', route: '/(admin)/notification-settings', color: '#0EA5E9' },
      { icon: 'language', label: 'Language', route: '/(admin)/language-settings', color: '#059669' },
      { icon: 'cloud-download', label: 'Backup & Restore', route: '/(admin)/backup-restore', color: '#8B5CF6' },
    ],
  },
  {
    title: 'Support',
    icon: 'help-circle',
    items: [
      { icon: 'help-circle', label: 'Help & Support', route: '/(admin)/help-about', color: '#64748B' },
      { icon: 'document', label: 'Legal & Privacy', route: '/(admin)/legal', color: '#94A3B8' },
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
      <TouchableOpacity
        onPress={() => router.push('/(admin)/my-profile' as any)}
        activeOpacity={0.7}
      >
        <Card style={styles.profileCard}>
          <View style={styles.profileRow}>
            <Avatar name={profile?.full_name || 'Admin'} uri={profile?.avatar_url} size={52} />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile?.full_name || 'Admin'}</Text>
              <Text style={styles.profileRole}>{profile?.role?.replace('_', ' ') || 'Admin'}</Text>
            </View>
            <View style={styles.profileArrow}>
              <Ionicons name="chevron-forward" size={18} color={colors.neutral[400]} />
            </View>
          </View>
        </Card>
      </TouchableOpacity>

      {/* Menu sections */}
      {visibleSections.map((section) => (
        <View key={section.title} style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Ionicons name={section.icon as any} size={14} color={colors.neutral[400]} />
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
          <Card style={styles.menuCard}>
            {section.items.map((item, idx) => (
              <React.Fragment key={item.label}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.6}
                >
                  <View style={[styles.menuIcon, { backgroundColor: item.color + '12' }]}>
                    <Ionicons name={item.icon as any} size={18} color={item.color} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.neutral[300]} />
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
        <View style={[styles.menuIcon, { backgroundColor: colors.error + '12' }]}>
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
        </View>
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.lg },

  /* Profile */
  profileCard: { padding: spacing.lg, marginBottom: spacing.xl },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  profileInfo: { flex: 1 },
  profileName: { ...typography.h5, color: colors.ink },
  profileRole: { ...typography.caption, color: colors.primary, textTransform: 'capitalize', marginTop: 2 },
  profileArrow: {
    width: 32, height: 32, borderRadius: 16, backgroundColor: colors.neutral[100],
    alignItems: 'center', justifyContent: 'center',
  },

  /* Sections */
  section: { marginBottom: spacing.lg },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.sm, marginLeft: spacing.xs },
  sectionTitle: {
    ...typography.caption, fontFamily: fontFamily.semiBold, color: colors.neutral[400],
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  menuCard: { padding: 0, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: spacing.lg, gap: spacing.md,
  },
  menuIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, ...typography.bodyMedium, fontFamily: fontFamily.medium, color: colors.ink },
  divider: { height: 1, backgroundColor: colors.neutral[100], marginLeft: spacing.lg + 34 + spacing.md },

  /* Logout */
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md,
    paddingVertical: spacing.lg, marginTop: spacing.sm, marginBottom: spacing.xl,
  },
  logoutText: { ...typography.bodyMedium, fontFamily: fontFamily.semiBold, color: colors.error },
});
