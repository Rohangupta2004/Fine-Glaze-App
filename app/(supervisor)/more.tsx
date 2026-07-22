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
import { spacing, TOUCH_TARGET } from '../../src/theme/spacing';

interface MenuItem {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  route?: string;
  onPress?: () => void;
}

export default function SupervisorMoreScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const router = useRouter();
  const { profile, signOut } = useAuthStore();

  const menuItems: MenuItem[] = [
    {
      icon: 'document-text-outline',
      label: 'Daily Progress Report',
      route: '/(supervisor)/dpr',
    },
    {
      icon: 'people-outline',
      label: 'Team Attendance',
      route: '/(supervisor)/team-attendance',
    },
    {
      icon: 'chatbubbles-outline',
      label: 'Messages',
      route: '/(supervisor)/messages',
    },
    {
      icon: 'person-add-outline',
      label: 'Request Employee',
      route: '/(supervisor)/request-employee',
    },
    { icon: 'person-outline', label: 'Profile' },
    { icon: 'wallet-outline', label: 'Salary' },
    { icon: 'language-outline', label: t('settings.language') },
    { icon: 'finger-print', label: t('settings.biometric') },
    { icon: 'help-circle-outline', label: t('settings.help') },
  ];

  const handleLogout = async () => {
    await signOut();
    router.replace('/(auth)/welcome');
  };

  const handleItemPress = (item: MenuItem) => {
    if (item.route) {
      router.push(item.route as any);
    } else if (item.onPress) {
      item.onPress();
    }
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
            onPress={() => handleItemPress(item)}
            activeOpacity={0.7}
          >
            <Ionicons name={item.icon} size={22} color={colors.neutral[600]} />
            <Text style={styles.menuLabel}>{item.label}</Text>
            {item.route ? (
              <Ionicons name="chevron-forward" size={18} color={colors.neutral[400]} />
            ) : (
              <Ionicons name="chevron-forward" size={18} color={colors.neutral[300]} />
            )}
          </TouchableOpacity>
        ))}
      </Card>

      <Card 
        onPress={handleLogout}
        variant="flat"
        padding={0}
        style={styles.logoutCard}
        gradientColors={['#FFFFFF', '#FFF8F8']}
      >
        <View style={styles.logoutRow}>
          <View style={styles.logoutIconBadge}>
            <Ionicons name="log-out-outline" size={20} color="#DC2626" />
          </View>
          <View style={styles.logoutTextWrap}>
            <Text style={styles.logoutTitle}>{t('settings.logout')}</Text>
            <Text style={styles.logoutSub}>Sign out of your account</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="rgba(220, 38, 38, 0.4)" />
        </View>
      </Card>
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
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TOUCH_TARGET,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.neutral[100] },
  menuLabel: { flex: 1, ...typography.bodyMedium, fontFamily: fontFamily.medium, color: colors.ink },
  logoutCard: {
    marginTop: spacing.md,
    marginBottom: spacing['2xl'],
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(220, 38, 38, 0.18)',
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
