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

import { Avatar, Card } from '../../../src/components';
import { useAuthStore } from '../../../src/stores/authStore';
import { usePermissions } from '../../../src/hooks/usePermissions';
import { colors } from '../../../src/theme/colors';
import { fontFamily } from '../../../src/theme/typography';
import { spacing } from '../../../src/theme/spacing';
import { showAlert } from '../../../src/utils/alert';

interface MenuItem {
  icon: string;
  textIcon?: string;
  label: string;
  route: string;
  gradient?: [string, string];
  badge?: number;
  perm?: string;
}

const SECTIONS: { title: string; items: MenuItem[]; gradient: string[] }[] = [
  {
    title: 'Management',
    gradient: ['#5B4122', '#8B6840'],
    items: [
      { icon: 'document-text-sharp', label: 'DPR Management', route: '/(admin)/dpr-management', gradient: ['#2563EB', '#3B82F6'], perm: 'dpr_approvals' },
      { icon: 'folder-open-sharp', label: 'Documents Vault', route: '/(admin)/documents', gradient: ['#1E293B', '#334155'] },
      { icon: 'cube-sharp', label: 'Materials', route: '/(admin)/materials', gradient: ['#E11D48', '#F43F5E'], perm: 'materials' },
      { icon: 'briefcase-sharp', label: 'Clients', route: '/(admin)/clients', gradient: ['#0D9488', '#14B8A6'], perm: 'clients' },
      { icon: 'calendar-sharp', label: 'Calendar', route: '/(admin)/calendar', gradient: ['#8B6840', '#B89047'] },
      { icon: 'people-sharp', label: 'Attendance Report', route: '/(admin)/attendance-report', gradient: ['#059669', '#10B981'], perm: 'attendance' },
      { icon: 'search-sharp', label: 'Global Search', route: '/(admin)/global-search', gradient: ['#D97706', '#F59E0B'] },
      { icon: 'map-sharp', label: 'Assign Site & Workers', route: '/(admin)/assign-site', gradient: ['#6D28D9', '#8B5CF6'] },
      { icon: 'person-add-sharp', label: 'Employee Requests', route: '/(admin)/employee-requests', gradient: ['#EA580C', '#F97316'] },
      { icon: 'repeat-sharp', label: 'Recurring Tasks', route: '/(admin)/recurring-tasks', gradient: ['#0D9488', '#2DD4BF'] },
      { icon: 'document-attach-sharp', label: 'Upload BOQ', route: '/(admin)/import-boq', gradient: ['#4A3728', '#695030'] },
      { icon: 'qr-code-sharp', label: 'Project QR Codes', route: '/(admin)/project-qr', gradient: ['#374151', '#4B5563'] },
    ],
  },
  {
    title: 'Reports & Analytics',
    gradient: ['#2563EB', '#3B82F6'],
    items: [
      { icon: 'stats-chart-sharp', label: 'Analytics', route: '/(admin)/analytics', gradient: ['#2563EB', '#3B82F6'] },
      { icon: 'list-sharp', label: 'Audit Log', route: '/(admin)/audit-log', gradient: ['#475569', '#64748B'] },
    ],
  },
  {
    title: 'Settings',
    gradient: ['#7C3AED', '#8B5CF6'],
    items: [
      { icon: 'person-circle-sharp', textIcon: 'ME', label: 'My Profile', route: '/(admin)/my-profile', gradient: ['#5B4122', '#8B6840'] },
      { icon: 'business-sharp', label: 'Company Settings', route: '/(admin)/company-settings', gradient: ['#374151', '#4B5563'], perm: 'settings' },
      { icon: 'shield-checkmark-sharp', label: 'Roles & Permissions', route: '/(admin)/roles-permissions', gradient: ['#D97706', '#F59E0B'], perm: 'settings' },
      { icon: 'notifications-sharp', label: 'Notification Settings', route: '/(admin)/notification-settings', gradient: ['#2563EB', '#3B82F6'] },
      { icon: 'language-sharp', label: 'Language', route: '/(admin)/language-settings', gradient: ['#059669', '#10B981'] },
      { icon: 'cloud-download-sharp', label: 'Backup & Restore', route: '/(admin)/backup-restore', gradient: ['#7C3AED', '#8B5CF6'] },
      { icon: 'help-circle-sharp', label: 'Help & Support', route: '/(admin)/help-about', gradient: ['#6B7280', '#9CA3AF'] },
      { icon: 'information-circle-sharp', label: 'About Fine Glaze', route: '/(admin)/help-about', gradient: ['#8B6840', '#B89047'] },
    ],
  },
];

export default function AdminMoreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const { can } = usePermissions();

  const handleLogout = () => {
    showAlert(
      'Log Out',
      'Are you sure you want to sign out of your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)/welcome');
          },
        },
      ]
    );
  };

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
              <Ionicons name="chevron-forward-sharp" size={16} color={colors.neutral[500]} />
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

            <Card variant="elevated" padding={0} style={styles.sectionGroupCard}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.menuRow,
                    idx < section.items.length - 1 && styles.menuRowDivider,
                  ]}
                  onPress={() => router.push(item.route as any)}
                  activeOpacity={0.7}
                >
                  <LinearGradient 
                    colors={item.gradient || ['#5B4122', '#8B6840']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.menuIconWrap}
                  >
                    {item.textIcon ? (
                      <Text style={{ color: '#FFFFFF', fontFamily: fontFamily.bold, fontSize: 11 }}>{item.textIcon}</Text>
                    ) : (
                      <Ionicons name={item.icon as any} size={18} color="#FFFFFF" />
                    )}
                  </LinearGradient>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {item.badge && item.badge > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.badge}</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward-sharp" size={16} color={colors.neutral[300]} />
                </TouchableOpacity>
              ))}
            </Card>
          </View>
        ))}

        {/* Executive Logout Card */}
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.84}
          style={styles.logoutCard}
        >
          <View style={styles.logoutRow}>
            <LinearGradient colors={['#EF4444', '#B91C1C']} style={styles.logoutIconBadge}>
              <Ionicons name="log-out-sharp" size={20} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.logoutTextWrap}>
              <Text style={styles.logoutTitle}>Log Out</Text>
              <Text style={styles.logoutSub}>Sign out of your account</Text>
            </View>
            <Ionicons name="chevron-forward-sharp" size={16} color="rgba(220, 38, 38, 0.4)" />
          </View>
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

  // Grouped Section Card
  sectionGroupCard: { overflow: 'hidden', borderRadius: 20 },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  menuRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(105, 80, 48, 0.08)',
  },
  menuIconWrap: { 
    width: 36, 
    height: 36, 
    borderRadius: 10, 
    backgroundColor: '#FAF4E8', 
    borderWidth: 1, 
    borderColor: 'rgba(139, 104, 64, 0.18)', 
    alignItems: 'center', 
    justifyContent: 'center', 
  } as any,
  menuLabel: { flex: 1, fontSize: 14, fontFamily: fontFamily.medium, color: '#1E1815' },
  badge: { backgroundColor: colors.error, borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { fontSize: 10, color: '#fff', fontFamily: fontFamily.bold },

  // Executive Logout Card
  logoutCard: {
    marginTop: spacing.md,
    marginBottom: spacing['2xl'],
    borderRadius: 20,
    backgroundColor: '#FFF8F8',
    borderWidth: 1.2,
    borderColor: 'rgba(220, 38, 38, 0.22)',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    boxShadow: '0px 4px 16px rgba(220, 38, 38, 0.06)',
  } as any,
  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  logoutIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutTextWrap: { flex: 1 },
  logoutTitle: { fontSize: 15, fontFamily: fontFamily.bold, color: '#DC2626' },
  logoutSub: { fontSize: 11, fontFamily: fontFamily.regular, color: colors.neutral[400], marginTop: 1 },
});
