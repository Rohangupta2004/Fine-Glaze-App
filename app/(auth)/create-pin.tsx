import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '../../src/stores/authStore';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { PinPad } from '../../src/components/PinPad';

export default function CreatePinScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const setPin = useAuthStore((s) => s.setPin);
  const setAuthenticated = useAuthStore((s) => s.setAuthenticated);

  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState('');
  const shakeAnim = useRef(new Animated.Value(0)).current;

  const shake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const handlePinComplete = async (pin: string) => {
    if (step === 'create') {
      setFirstPin(pin);
      setStep('confirm');
      setError('');
    } else {
      if (pin === firstPin) {
        await setPin(pin);
        setAuthenticated(true);
        router.replace('/(auth)/enable-biometric');
      } else {
        setError('PINs do not match. Try again.');
        shake();
        setStep('create');
        setFirstPin('');
      }
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 60 }]}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {step === 'create' ? t('auth.createPin') : t('auth.confirmPin')}
        </Text>
        <Text style={styles.subtitle}>{t('auth.createPinSubtitle')}</Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Animated.View style={{ transform: [{ translateX: shakeAnim }], flex: 1 }}>
        <PinPad onComplete={handlePinComplete} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing['2xl'],
  },
  header: {
    alignItems: 'center',
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
  },
  error: {
    ...typography.bodySmall,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
});
