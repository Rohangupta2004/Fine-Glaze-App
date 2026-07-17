import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';

import { GradientButton } from '../../src/components';
import { colors } from '../../src/theme/colors';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.authBg, colors.neutral[100]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.content, { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 24 }]}>
        {/* Logo Container */}
        <View style={styles.logoContainer}>
          <View style={styles.logoGlow} />
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* Welcome Text */}
        <View style={styles.textContainer}>
          <Text style={styles.title}>{t('auth.welcome')}</Text>
          <Text style={styles.subtitle}>{t('auth.welcomeSubtitle')}</Text>
        </View>

        {/* CTA */}
        <View style={styles.bottomContainer}>
          <GradientButton
            title={t('auth.login')}
            onPress={() => router.push('/(auth)/login')}
            fullWidth
            size="lg"
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
    justifyContent: 'space-between',
  },
  logoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  logoGlow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.primary,
    opacity: 0.15,
    // Note: React Native style doesn't support blurRadius directly on View, 
    // but the overlay opacity + design is sufficient.
  },
  logo: {
    width: 180,
    height: 180,
    zIndex: 1,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: spacing['4xl'],
  },
  title: {
    ...typography.h2,
    color: colors.authText,
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontFamily: fontFamily.semiBold,
  },
  subtitle: {
    ...typography.bodyLarge,
    color: colors.neutral[400],
    textAlign: 'center',
    fontFamily: fontFamily.regular,
  },
  bottomContainer: {
    paddingTop: spacing.lg,
  },
});
