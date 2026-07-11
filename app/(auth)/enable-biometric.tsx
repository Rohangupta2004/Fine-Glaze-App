import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as LocalAuthentication from 'expo-local-authentication';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

import { Button } from '../../src/components';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';

export default function EnableBiometricScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    LocalAuthentication.hasHardwareAsync().then(setAvailable);
  }, []);

  const handleEnable = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Verify fingerprint',
      fallbackLabel: 'Use PIN',
    });

    if (result.success) {
      await SecureStore.setItemAsync('fg_biometric_enabled', 'true');
      router.replace('/(auth)/permissions');
    }
  };

  const handleSkip = () => {
    router.replace('/(auth)/permissions');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 80 }]}>
      <View style={styles.iconContainer}>
        <Ionicons name="finger-print" size={80} color={colors.primary} />
      </View>

      <Text style={styles.title}>{t('auth.enableBiometric')}</Text>
      <Text style={styles.subtitle}>{t('auth.enableBiometricSubtitle')}</Text>

      <View style={[styles.buttons, { paddingBottom: insets.bottom + 24 }]}>
        {available && (
          <Button
            title={t('auth.enableBiometric')}
            onPress={handleEnable}
            fullWidth
          />
        )}
        <Button
          title={t('auth.skip')}
          onPress={handleSkip}
          variant="tertiary"
          fullWidth
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing['2xl'],
    alignItems: 'center',
  },
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['3xl'],
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
    marginBottom: spacing['4xl'],
  },
  buttons: {
    width: '100%',
    marginTop: 'auto',
    gap: spacing.md,
  },
});
