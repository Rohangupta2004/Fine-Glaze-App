import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { Button, GradientButton } from '../../src/components';
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
    if (profile) {
      const group = getGroup(profile.role);
      router.replace(`/(${group})/home` as any);
    } else {
      router.replace('/(worker)/home');
    }
  };

  const allGranted = perms.every((p) => p.granted);

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.authBg, colors.neutral[100]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.content, { paddingTop: insets.top + 40 }]}>
        <Text style={styles.title}>{t('auth.permissionsTitle')}</Text>
        <Text style={styles.subtitle}>{t('auth.permissionsSubtitle')}</Text>

        <View style={styles.list}>
          {perms.map((perm) => (
            <View key={perm.key} style={styles.permRow}>
              <View style={[
                styles.iconCircle,
                styles.iconCircleDark,
                perm.granted && styles.iconCircleGranted
              ]}>
                <Ionicons
                  name={perm.granted ? 'checkmark' : perm.icon}
                  size={20}
                  color={perm.granted ? colors.white : colors.secondary}
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
            <GradientButton
              title={t('auth.grantAll')}
              onPress={handleGrantAll}
              fullWidth
              size="lg"
            />
          )}
          <Button
            title={t('auth.continueSetup')}
            onPress={handleContinue}
            variant={allGranted ? 'primary' : 'tertiary'}
            fullWidth
            textStyle={!allGranted ? styles.skipText : undefined}
          />
        </View>
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
    backgroundColor: colors.authBg,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing['2xl'],
  },
  title: {
    ...typography.h3,
    color: colors.authText,
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontFamily: fontFamily.semiBold,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.neutral[400],
    textAlign: 'center',
    marginBottom: spacing['3xl'],
    fontFamily: fontFamily.regular,
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
  iconCircleDark: {
    backgroundColor: 'rgba(145, 128, 80, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(145, 128, 80, 0.25)',
  },
  iconCircleGranted: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  permText: {
    flex: 1,
  },
  permTitle: {
    ...typography.h6,
    color: colors.authText,
    marginBottom: 2,
    fontFamily: fontFamily.semiBold,
  },
  permDesc: {
    ...typography.bodySmall,
    color: colors.neutral[400],
    fontFamily: fontFamily.regular,
  },
  buttons: {
    marginTop: 'auto',
    gap: spacing.md,
  },
  skipText: {
    color: colors.neutral[400],
    fontFamily: fontFamily.medium,
  },
});
