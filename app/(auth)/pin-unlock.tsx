import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';

import { useAuthStore } from '../../src/stores/authStore';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { PinPad } from '../../src/components/PinPad';

export default function PinUnlockScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { verifyPin, setAuthenticated, profile } = useAuthStore();

  const [error, setError] = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Try biometric on mount
  useEffect(() => {
    tryBiometric();
  }, []);

  const tryBiometric = async () => {
    const enabled = await SecureStore.getItemAsync('fg_biometric_enabled');
    if (enabled !== 'true') return;

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Fine Glaze COS',
      fallbackLabel: 'Use PIN',
      disableDeviceFallback: true,
    });

    if (result.success) {
      setAuthenticated(true);
      // Root layout will redirect
    }
  };

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handlePinComplete = async (pin: string) => {
    const valid = await verifyPin(pin);
    if (valid) {
      setAuthenticated(true);
    } else {
      setError('Wrong PIN. Try again.');
      shake();
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 60 }]}>
      <Text style={styles.title}>{t('auth.enterPin')}</Text>
      {profile?.full_name && (
        <Text style={styles.name}>{profile.full_name}</Text>
      )}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Animated.View style={{ transform: [{ translateX: shakeAnim }], flex: 1 }}>
        <PinPad onComplete={handlePinComplete} />
      </Animated.View>

      {/* Bottom options */}
      <View style={[styles.bottomRow, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity onPress={() => router.push('/(auth)/forgot-pin')}>
          <Text style={styles.forgotText}>{t('auth.forgotPin')}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={tryBiometric}>
          <Ionicons name="finger-print" size={32} color={colors.primary} />
        </TouchableOpacity>
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
  title: {
    ...typography.h3,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  name: {
    ...typography.bodyMedium,
    color: colors.neutral[500],
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  error: {
    ...typography.bodySmall,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  forgotText: {
    ...typography.bodyMedium,
    color: colors.primary,
  },
});
