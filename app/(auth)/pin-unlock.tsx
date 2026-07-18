import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { safeGetItem, isBiometricAvailable, authenticateBiometric } from '../../src/lib/safeStorage';

import { useAuthStore } from '../../src/stores/authStore';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';
import { PinPad } from '../../src/components/PinPad';

export default function PinUnlockScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { verifyPin, setAuthenticated, profile, checkLockout, pinLockedUntil } = useAuthStore();

  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // Try biometric on mount
  useEffect(() => {
    tryBiometric();
  }, []);

  // Lockout countdown timer
  useEffect(() => {
    let interval: any;
    const runCheck = async () => {
      const remaining = await checkLockout();
      setCooldown(remaining);
      if (remaining > 0) {
        interval = setInterval(async () => {
          const rem = await checkLockout();
          setCooldown(rem);
          if (rem <= 0) {
            clearInterval(interval);
            setError('');
          }
        }, 1000);
      }
    };
    runCheck();
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [pinLockedUntil]);

  const tryBiometric = async () => {
    const enabled = await safeGetItem('fg_biometric_enabled');
    if (enabled !== 'true') return;

    const hasHardware = await isBiometricAvailable();
    if (!hasHardware) return;

    const result = await authenticateBiometric('Unlock Fine Glaze COS');
    if (result.success) {
      setAuthenticated(true);
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
      const rem = await checkLockout();
      if (rem > 0) {
        setError('Too many failed attempts. Screen locked.');
      } else {
        setError('Wrong PIN. Try again.');
        shake();
      }
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.authBg, colors.neutral[100]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
        <Text style={styles.title}>{t('auth.enterPin')}</Text>
        {profile?.full_name && (
          <Text style={styles.name}>{profile.full_name}</Text>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {cooldown > 0 ? (
          <View style={styles.lockoutContainer}>
            <Ionicons name="lock-closed-outline" size={64} color={colors.error} />
            <Text style={styles.lockoutText}>Too many failed attempts.</Text>
            <Text style={styles.lockoutCountdown}>
              Try again in {cooldown} seconds
            </Text>
          </View>
        ) : (
          <Animated.View style={{ transform: [{ translateX: shakeAnim }], flex: 1 }}>
            <PinPad onComplete={handlePinComplete} theme="dark" />
          </Animated.View>
        )}

        {/* Bottom options */}
        <View style={[styles.bottomRow, { paddingBottom: insets.bottom + 24 }]}>
          <TouchableOpacity onPress={() => router.push('/(auth)/forgot-pin')}>
            <Text style={styles.forgotText}>{t('auth.forgotPin')}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={tryBiometric} style={styles.biometricBtn}>
            <Ionicons name="finger-print" size={28} color={colors.white} />
          </TouchableOpacity>
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
  lockoutContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  lockoutText: {
    ...typography.h5,
    color: colors.white,
    textAlign: 'center',
    fontFamily: fontFamily.semiBold,
  },
  lockoutCountdown: {
    ...typography.bodyMedium,
    color: colors.neutral[400],
    textAlign: 'center',
    fontFamily: fontFamily.medium,
  },
  title: {
    ...typography.h3,
    color: colors.authText,
    textAlign: 'center',
    marginBottom: spacing.xs,
    fontFamily: fontFamily.semiBold,
  },
  name: {
    ...typography.bodyMedium,
    color: colors.neutral[400],
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontFamily: fontFamily.medium,
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
    color: colors.secondary,
    fontFamily: fontFamily.medium,
  },
  biometricBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
