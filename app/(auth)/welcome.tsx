import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { Button } from '../../src/components';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 60 }]}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require('../../assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Text */}
      <View style={styles.textContainer}>
        <Text style={styles.title}>{t('auth.welcome')}</Text>
        <Text style={styles.subtitle}>{t('auth.welcomeSubtitle')}</Text>
      </View>

      {/* CTA */}
      <View style={[styles.bottomContainer, { paddingBottom: insets.bottom + 24 }]}>
        <Button
          title={t('auth.login')}
          onPress={() => router.push('/(auth)/login')}
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
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 180,
    height: 180,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: spacing['4xl'],
  },
  title: {
    ...typography.h2,
    color: colors.ink,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.bodyLarge,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  bottomContainer: {
    paddingTop: spacing.lg,
  },
});
