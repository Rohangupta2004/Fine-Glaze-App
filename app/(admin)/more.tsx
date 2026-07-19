/**
 * Admin More Menu
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Avatar, Card } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { usePermissions } from '../../src/hooks/usePermissions';
import { colors } from '../../src/theme/colors';
import { fontFamily } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';

interface MenuItem {
  icon: string;
  label: string;
  route: string;
  color?: string;
  badge?: number;
  perm?: string;
}

const SECTIONS: { title: string; items: MenuItem[]; gradient: string[] }[] = [
  {
    title: 'Management',
    gradient: ['#695030', '#7D5F3A'],
    items: [
      { icon: 'document-text', label: 'DPR Management', route: '/(admin)/dpr-management', color: '#2563EB', perm: 'dpr_approvals' },
      { icon: 'folder', label: 'Documents Vault', route: '/(admin)/documents', color: '#695030' },
      { icon: 'cube', label: 'Materials', route: '/(admin)/materials', color: '#D97706', perm: 'materials' },
      { icon: 'business', label: 'Clients', route: '/(admin)/clients', color: '#2563EB', perm: 'clients' },
      { icon: 'calendar', label: 'Calendar', route: '/(admin)/calendar', color: '#695030' },
      { icon: 'people', label: 'Attendance Report', route: '/(admin)/attendance-report', color: '#059669', perm: 'attendance' },
      { icon: 'search', label: 'Global Search', route: '/(admin)/global-search', color: '#D97706' },
      { icon: 'people-circle', label: 'Assign Site & Workers', route: '/(admin)/assign-site', color: '#2563EB' },
      { icon: 'person-add', label: 'Employee Requests', route: '/(admin)/employee-requests', color: '#D97706' },
      { icon: 'repeat', label: 'Recurring Tasks', route: '/(admin)/recurring-tasks', color: '#059669' },
      { icon: 'document-attach', label: 'Upload BOQ', route: '/(admin)/import-boq', color: '#695030' },
      { icon: 'qr-code', label: 'Project QR Codes', route: '/(admin)/project-qr', color: '#695030' },
    ],
  },
  {
    title: 'Reports & Analytics',
    gradient: ['#2563EB', '#3B82F6'],
    items: [
      { icon: 'bar-chart', label: 'Analytics', route: '/(admin)/analytics', color: '#2563EB' },
      { icon: 'list', label: 'Audit Log', route: '/(admin)/audit-log', color: '#6B7280' },
    ],
  },
  {
    title: 'Settings',
    gradient: ['#7C3AED', '#8B5CF6'],
    items: [
      { icon: 'person-circle', label: 'My Profile', route: '/(admin)/my-profile', color: '#695030' },
      { icon: 'business', label: 'Company Settings', route: '/(admin)/company-settings', color: '#374151', perm: 'settings' },
      { icon: 'shield-checkmark', label: 'Roles & Permissions', route: '/(admin)/roles-permissions', color: '#D97706', perm: 'settings' },
      { icon: 'notifications', label: 'Notification Settings', route: '/(admin)/notification-settings', color: '#2563EB' },
      { icon: 'language', label: 'Language', route: '/(admin)/language-settings', color: '#059669' },
      { icon: 'cloud-download', label: 'Backup & Restore', route: '/(admin)/backup-restore', color: '#7C3AED' },
      { icon: 'help-circle', label: 'Help & Support', route: '/(admin)/help-about', color: '#6B7280' },
      { icon: 'information-circle', label: 'About Fine Glaze COS', route: '/(admin)/help-about', color: '#695030' },
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
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Profile Card Header */}
      <View style={[styles.profileHero, { paddingTop: insets.top + spacing.lg }]}>
        <Card onPress={() => router.push('/(admin)/my-profile' as any)}>
          <View style={styles.profileRow}>
            <Avatar name={profile?.full_name || 'Admin'} uri={profile?.avatar_url} size={60} />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{profile?.full_name || 'Admin'}</Text>
              <Text style={styles.profileRole}>{profile?.role?.replace('_', ' ') || 'Admin'}</Text>
              <Text style={styles.profilePhone}>{profile?.phone || ''}</Text>
            </View>
            <View style={styles.profileArrow}>
              <Ionicons name="chevron-forward" size={16} color={colors.neutral[500]} />
            </View>
          </View>
        </Card>
      </View>

      {/* Menu Sections */}
      <View style={styles.body}>
        {visibleSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <View style={styles.sectionHeader}>
              <LinearGradient colors={section.gradient as any} style={styles.sectionDot} />
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            <View style={styles.menuList}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.label}
                  style={styles.menuItemCard}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.menuIconWrap, { backgroundColor: (item.color || colors.primary) + '18' }]}>
                    <Ionicons name={item.icon as any} size={18} color={item.color || colors.primary} />
                  </View>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {item.badge && item.badge > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={15} color={colors.neutral[300]} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Logout */}
        <TouchableOpacity
          style={styles.logoutBtn}
          activeOpacity={0.8}
          onPress={() => {
            signOut();
            router.replace('/(auth)/welcome');
          }}
        >
          <LinearGradient colors={['#FEE2E2', '#FECACA']} style={styles.logoutGrad}>
            <Ionicons name="log-out-outline" size={18} color={colors.error} />
            <Text style={styles.logoutText}>Log Out</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EDE8E1' },

  // Profile Hero
  profileHero: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontFamily: fontFamily.bold, color: colors.ink },
  profileRole: { fontSize: 12, color: colors.neutral[500], textTransform: 'capitalize', marginTop: 2, fontFamily: fontFamily.medium },
  profilePhone: { fontSize: 12, color: colors.neutral[400], marginTop: 2, fontFamily: fontFamily.regular },
  profileArrow: { width: 32, height: 32, borderRadius: 10, backgroundColor: colors.neutral[100], alignItems: 'center', justifyContent: 'center' },

  // Body
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },

  // Section
  section: { marginBottom: spacing.lg },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  sectionDot: { width: 14, height: 14, borderRadius: 4 },
  sectionTitle: { fontSize: 11, fontFamily: fontFamily.bold, color: colors.neutral[500], textTransform: 'uppercase', letterSpacing: 1 },

  // Menu List
  menuList: { gap: spacing.sm },
  menuItemCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(105,80,48,0.08)',
    boxShadow: '0px 2px 10px rgba(105,80,48,0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  } as any,
  menuIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  menuLabel: { flex: 1, fontSize: 14, fontFamily: fontFamily.medium, color: '#1E1815' },
  badge: { backgroundColor: colors.error, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { fontSize: 10, color: '#fff', fontFamily: fontFamily.bold },

  // Logout
  logoutBtn: { marginTop: spacing.md, marginBottom: spacing.lg, borderRadius: 16, overflow: 'hidden' },
  logoutGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.lg, borderRadius: 16 },
  logoutText: { fontSize: 15, fontFamily: fontFamily.semiBold, color: colors.error },
});
