import React from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { GradientButton } from '../../src/components';
import { typography, fontFamily } from '../../src/theme/typography';
import { spacing } from '../../src/theme/spacing';

export default function WelcomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../../assets/images/login_brand_artwork.png')}
        style={styles.bgImage}
        imageStyle={{ opacity: 1 }}
        resizeMode="cover"
      >
        <View style={[styles.content, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 28 }]}>
          <View style={styles.topSpacer} />

          {/* Welcome Text Box */}
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
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF8F5',
  },
  bgImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing['2xl'],
    justifyContent: 'space-between',
  },
  topSpacer: {
    flex: 1,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    backgroundColor: 'rgba(250, 248, 245, 0.92)',
    padding: spacing.lg,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: 'rgba(184, 144, 71, 0.3)',
    boxShadow: '0px 6px 18px rgba(105, 80, 48, 0.1)',
  } as any,
  title: {
    ...typography.h3,
    color: '#1E1815',
    textAlign: 'center',
    marginBottom: spacing.xs,
    fontFamily: fontFamily.semiBold,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: '#695030',
    textAlign: 'center',
    fontFamily: fontFamily.regular,
  },
  bottomContainer: {
    paddingTop: spacing.xs,
  },
});
