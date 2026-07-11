import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Avatar, Card } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route?: string;
  color?: string;
  onPress?: () => void;
}

export default function AdminMoreScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const { profile, signOut } = useAuthStore();

  const menuSections: { title: string; items: MenuItem[] }[] = [
    {
      title: 'Management',
      items: [
        { icon: 'people-outline', label: 'Employees', route: '/(admin)/employees' },
        { icon: 'checkbox-outline', label: 'Approvals', route: '/(admin)/approvals' },
        { icon: 'notifications-outline', label: 'Notifications', route: '/(admin)/notifications' },
        { icon: 'analytics-outline', label: 'All Sites Overview', route: '/(admin)/projects' },
      ],
    },
    {
      title: 'Finance',
      items: [
        { icon: 'wallet-outline', label: 'Payments', route: '/(admin)/projects' },
        { icon: 'document-text-outline', label: 'Muster & Salary Export', route: '/(admin)/projects' },
      ],
    },
    {
      title: 'Settings',
      items: [
        { icon: 'language-outline', label: t('settings.language') },
        { icon: 'finger-print', label: t('settings.biometric') },
        { icon: 'key-outline', label: t('settings.changePin') },
        { icon: 'help-circle-outline', label: t('settings.help') },
      ],
    },
  ];

  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)/welcome');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + spacing.lg, paddingBottom: spacing['6xl'] }}
    >
      {/* Profile header */}
      <Card style={styles.profileCard}>
        <View style={styles.profileRow}>
          <Avatar name={profile?.full_name || 'Admin'} uri={profile?.avatar_url} size={56} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.full_name || 'Admin'}</Text>
            <Text style={styles.profileRole}>{profile?.role || 'Owner'}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.neutral[400]} />
        </View>
      </Card>

      {/* Menu sections */}
      {menuSections.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Card style={styles.menuCard}>
            {section.items.map((item, index) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.menuItem, index < section.items.length - 1 && styles.menuItemBorder]}
                onPress={item.onPress || (item.route ? () => router.push(item.route as any) : undefined)}
              >
                <Ionicons name={item.icon} size={22} color={item.color || colors.neutral[600]} />
                <Text style={[styles.menuLabel, item.color && { color: item.color }]}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.neutral[300]} />
              </TouchableOpacity>
            ))}
          </Card>
        </View>
      ))}

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
  profileRole: { ...typography.bodySmall, color: colors.neutral[500], textTransform: 'capitalize' },
  section: { marginBottom: spacing.xl },
  sectionTitle: {
    ...typography.caption, fontFamily: fontFamily.semiBold, color: colors.neutral[400],
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: spacing.sm, paddingLeft: spacing.xs,
  },
  menuCard: { padding: 0, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.lg, gap: spacing.md },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
  menuLabel: { flex: 1, ...typography.bodyMedium, fontFamily: fontFamily.medium, color: colors.ink },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.lg, marginTop: spacing.md },
  logoutText: { ...typography.button, color: colors.error },
});
