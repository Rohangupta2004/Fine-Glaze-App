import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

interface PermItem {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  titleKey: string;
  descKey: string;
  granted: boolean;
}

export default function PermissionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const profile = useAuthStore((s) => s.profile);

  const [perms, setPerms] = useState<PermItem[]>([
    { key: 'location', icon: 'location-outline', titleKey: 'auth.permLocation', descKey: 'auth.permLocationDesc', granted: false },
    { key: 'camera', icon: 'camera-outline', titleKey: 'auth.permCamera', descKey: 'auth.permCameraDesc', granted: false },
    { key: 'media', icon: 'images-outline', titleKey: 'auth.permMedia', descKey: 'auth.permMediaDesc', granted: false },
    { key: 'notifications', icon: 'notifications-outline', titleKey: 'auth.permNotifications', descKey: 'auth.permNotificationsDesc', granted: false },
  ]);

  const handleGrantAll = async () => {
    const updated = [...perms];

    // Location
    const locResult = await Location.requestForegroundPermissionsAsync();
    updated[0].granted = locResult.status === 'granted';

    // Camera
    const camResult = await Camera.requestCameraPermissionsAsync();
    updated[1].granted = camResult.status === 'granted';

    // Media / Photos
    const mediaResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    updated[2].granted = mediaResult.status === 'granted';

    // Notifications
    const notifResult = await Notifications.requestPermissionsAsync();
    updated[3].granted = notifResult.status === 'granted';

    setPerms(updated);
  };

  const handleContinue = () => {
    // Route to role-based home — root layout handles this
    if (profile) {
      const group = getGroup(profile.role);
      router.replace(`/(${group})/home` as any);
    } else {
      router.replace('/(worker)/home');
    }
  };

  const allGranted = perms.every((p) => p.granted);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
      <Text style={styles.title}>{t('auth.permissionsTitle')}</Text>
      <Text style={styles.subtitle}>{t('auth.permissionsSubtitle')}</Text>

      <View style={styles.list}>
        {perms.map((perm) => (
          <View key={perm.key} style={styles.permRow}>
            <View style={[styles.iconCircle, perm.granted && styles.iconCircleGranted]}>
              <Ionicons
                name={perm.granted ? 'checkmark' : perm.icon}
                size={22}
                color={perm.granted ? colors.white : colors.primary}
              />
            </View>
            <View style={styles.permText}>
              <Text style={styles.permTitle}>{t(perm.titleKey)}</Text>
              <Text style={styles.permDesc}>{t(perm.descKey)}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.buttons, { paddingBottom: insets.bottom + 24 }]}>
        {!allGranted && (
          <Button
            title={t('auth.grantAll')}
            onPress={handleGrantAll}
            fullWidth
          />
        )}
        <Button
          title={t('auth.continueSetup')}
          onPress={handleContinue}
          variant={allGranted ? 'primary' : 'tertiary'}
          fullWidth
        />
      </View>
    </View>
  );
}

function getGroup(role: string): string {
  switch (role) {
    case 'owner':
    case 'project_manager':
    case 'hr':
    case 'accounts':
      return 'admin';
    case 'supervisor':
      return 'supervisor';
    case 'client':
      return 'client';
    default:
      return 'worker';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing['2xl'],
  },
  title: {
    ...typography.h3,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: spacing['3xl'],
  },
  list: {
    gap: spacing.xl,
    marginBottom: spacing['3xl'],
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleGranted: {
    backgroundColor: colors.success,
  },
  permText: {
    flex: 1,
  },
  permTitle: {
    ...typography.h6,
    color: colors.ink,
    marginBottom: 2,
  },
  permDesc: {
    ...typography.bodySmall,
    color: colors.neutral[500],
  },
  buttons: {
    marginTop: 'auto',
    gap: spacing.md,
  },
});
