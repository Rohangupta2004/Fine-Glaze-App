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

export default function SupervisorMoreScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const { profile, signOut } = useAuthStore();

  const menuItems = [
    { icon: 'document-text-outline' as const, label: 'Upload DPR' },
    { icon: 'people-outline' as const, label: 'Team Attendance' },
    { icon: 'person-outline' as const, label: 'Profile' },
    { icon: 'wallet-outline' as const, label: 'Salary' },
    { icon: 'language-outline' as const, label: t('settings.language') },
    { icon: 'finger-print' as const, label: t('settings.biometric') },
    { icon: 'help-circle-outline' as const, label: t('settings.help') },
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
      <Card style={styles.profileCard}>
        <View style={styles.profileRow}>
          <Avatar name={profile?.full_name || 'Supervisor'} uri={profile?.avatar_url} size={56} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile?.full_name || 'Supervisor'}</Text>
            <Text style={styles.profileRole}>Supervisor</Text>
          </View>
        </View>
      </Card>

      <Card style={styles.menuCard}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.menuItem, index < menuItems.length - 1 && styles.menuItemBorder]}
          >
            <Ionicons name={item.icon} size={22} color={colors.neutral[600]} />
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.neutral[300]} />
          </TouchableOpacity>
        ))}
      </Card>

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
  menuCard: { padding: 0, overflow: 'hidden', marginBottom: spacing.xl },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.lg, gap: spacing.md },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
  menuLabel: { flex: 1, ...typography.bodyMedium, fontFamily: fontFamily.medium, color: colors.ink },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  logoutText: { ...typography.button, color: colors.error },
});
