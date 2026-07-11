import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Button, Input } from '../../src/components';
import { useAuthStore } from '../../src/stores/authStore';
import { supabase } from '../../src/lib/supabase';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';

export default function ForgotPinScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { profile } = useAuthStore();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Re-authenticate with password to prove identity
      const phone = profile?.phone || '';
      const email = `${phone.replace(/\D/g, '')}@fineglaze.app`;

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError('Incorrect password');
        return;
      }

      // Password verified → go to create new PIN
      router.replace('/(auth)/create-pin');
    } catch (e: any) {
      setError(e.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.container, { paddingTop: insets.top + 60 }]}>
        <View style={styles.iconContainer}>
          <Ionicons name="key-outline" size={48} color={colors.primary} />
        </View>

        <Text style={styles.title}>{t('auth.resetPin')}</Text>
        <Text style={styles.subtitle}>{t('auth.enterPassword')}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.form}>
          <Input
            label={t('auth.password')}
            icon="lock-closed-outline"
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            rightIcon={showPassword ? 'eye-off-outline' : 'eye-outline'}
            onRightIconPress={() => setShowPassword(!showPassword)}
            autoComplete="password"
          />
        </View>

        <Button
          title={t('auth.resetPin')}
          onPress={handleVerify}
          loading={loading}
          fullWidth
        />

        <Button
          title={t('common.back')}
          onPress={() => router.back()}
          variant="tertiary"
          fullWidth
          style={{ marginTop: spacing.md }}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing['2xl'],
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing['2xl'],
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
  error: {
    ...typography.bodySmall,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  form: {
    width: '100%',
    marginBottom: spacing.lg,
  },
});
