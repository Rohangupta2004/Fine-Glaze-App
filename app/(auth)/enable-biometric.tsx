import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { safeSetItem, isBiometricAvailable, authenticateBiometric } from '../../src/lib/safeStorage';

import { GradientButton, Button } from '../../src/components';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing, radius } from '../../src/theme/spacing';

export default function EnableBiometricScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then(setAvailable);
  }, []);

  const handleEnable = async () => {
    const result = await authenticateBiometric('Verify fingerprint');
    if (result.success) {
      await safeSetItem('fg_biometric_enabled', 'true');
      router.replace('/(auth)/permissions');
    }
  };

  const handleSkip = () => {
    router.replace('/(auth)/permissions');
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.authBg, colors.neutral[100]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.content, { paddingTop: insets.top + 80 }]}>
        <View style={styles.iconContainer}>
          <Ionicons name="finger-print" size={60} color={colors.secondary} />
        </View>

        <Text style={styles.title}>{t('auth.enableBiometric')}</Text>
        <Text style={styles.subtitle}>{t('auth.enableBiometricSubtitle')}</Text>

        <View style={[styles.buttons, { paddingBottom: insets.bottom + 24 }]}>
          {available && (
            <GradientButton
              title={t('auth.enableBiometric')}
              onPress={handleEnable}
              fullWidth
              size="lg"
            />
          )}
          <Button
            title={t('auth.skip')}
            onPress={handleSkip}
            variant="tertiary"
            fullWidth
            textStyle={styles.skipText}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.authBg,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing['2xl'],
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(145, 128, 80, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(145, 128, 80, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['3xl'],
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
    marginBottom: spacing['4xl'],
    fontFamily: fontFamily.regular,
  },
  buttons: {
    width: '100%',
    marginTop: 'auto',
    gap: spacing.md,
  },
  skipText: {
    color: colors.neutral[400],
    fontFamily: fontFamily.medium,
  },
});
