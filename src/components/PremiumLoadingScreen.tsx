import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { fontFamily } from '../theme/typography';
import { spacing } from '../theme/spacing';

interface PremiumLoadingScreenProps {
  message?: string;
  fullScreen?: boolean;
}

const DEFAULT_MESSAGES = [
  'Securing workspace credentials...',
  'Initializing executive dashboard...',
  'Connecting to site telemetry...',
  'Preparing Fine Glaze experience...',
];

export function PremiumLoadingScreen({
  message,
  fullScreen = true,
}: PremiumLoadingScreenProps) {
  // Animation values
  const spinValue = useRef(new Animated.Value(0)).current;
  const pulseValue = useRef(new Animated.Value(1)).current;
  const shimmerValue = useRef(new Animated.Value(-100)).current;
  const fadeValue = useRef(new Animated.Value(0)).current;

  // Status message cycling state
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    // 1. Continuous spinning ring animation
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    // 2. Pulsing inner core badge
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1.08,
          duration: 1200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 1200,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    // 3. Shimmering progress line
    const shimmerAnimation = Animated.loop(
      Animated.timing(shimmerValue, {
        toValue: 240,
        duration: 1800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      })
    );

    // 4. Fade in container
    const fadeAnimation = Animated.timing(fadeValue, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    });

    spinAnimation.start();
    pulseAnimation.start();
    shimmerAnimation.start();
    fadeAnimation.start();

    return () => {
      spinAnimation.stop();
      pulseAnimation.stop();
      shimmerAnimation.stop();
    };
  }, []);

  // Cycle status messages every 2.5 seconds if custom message is not passed
  useEffect(() => {
    if (message) return;
    const interval = setInterval(() => {
      setMsgIndex((prev) => (prev + 1) % DEFAULT_MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [message]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const reverseSpin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['360deg', '0deg'],
  });

  return (
    <Animated.View style={[styles.container, { opacity: fadeValue }, fullScreen && styles.fullScreen]}>
      <LinearGradient
        colors={['#181310', '#2C211A', '#120D0A']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative Gold Ambient Glow Circles */}
      <View style={styles.ambientGlowTop} />
      <View style={styles.ambientGlowBottom} />

      {/* Central Emblem Stack */}
      <View style={styles.centerStack}>
        {/* Outer Counter-Spinning Accent Ring */}
        <Animated.View style={[styles.outerSpinRing, { transform: [{ rotate: reverseSpin }] }]}>
          <View style={styles.dashSegmentTop} />
          <View style={styles.dashSegmentBottom} />
        </Animated.View>

        {/* Primary Spinning Ring */}
        <Animated.View style={[styles.spinRing, { transform: [{ rotate: spin }] }]}>
          <View style={styles.ringDot} />
        </Animated.View>

        {/* Pulsing Core Badge */}
        <Animated.View style={{ transform: [{ scale: pulseValue }] }}>
          <LinearGradient
            colors={['#5B4122', '#8B6840', '#A88454']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.coreBadge}
          >
            <Ionicons name="business-sharp" size={32} color="#FFFFFF" />
          </LinearGradient>
        </Animated.View>
      </View>

      {/* Branding Header */}
      <View style={styles.textContainer}>
        <Text style={styles.brandTitle}>FINE GLAZE</Text>
        <Text style={styles.brandSubtitle}>ARCHITECTURAL SYSTEMS</Text>

        {/* Animated Gold Progress Bar */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressShimmer,
              { transform: [{ translateX: shimmerValue }] },
            ]}
          >
            <LinearGradient
              colors={['rgba(168, 132, 84, 0)', '#A88454', 'rgba(168, 132, 84, 0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>

        {/* Status Caption */}
        <Text style={styles.statusMessage}>
          {message || DEFAULT_MESSAGES[msgIndex]}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#120D0A',
  },
  fullScreen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  ambientGlowTop: {
    position: 'absolute',
    top: '15%',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(168, 132, 84, 0.08)',
  },
  ambientGlowBottom: {
    position: 'absolute',
    bottom: '15%',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(139, 104, 64, 0.05)',
  },
  centerStack: {
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  spinRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: 'rgba(168, 132, 84, 0.35)',
    borderTopColor: '#A88454',
    borderRightColor: 'transparent',
    alignItems: 'center',
  },
  outerSpinRing: {
    position: 'absolute',
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 1.5,
    borderColor: 'rgba(139, 104, 64, 0.2)',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  dashSegmentTop: {
    width: 20,
    height: 3,
    backgroundColor: '#A88454',
    borderRadius: 2,
  },
  dashSegmentBottom: {
    width: 20,
    height: 3,
    backgroundColor: 'rgba(168, 132, 84, 0.5)',
    borderRadius: 2,
  },
  ringDot: {
    position: 'absolute',
    top: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FDFBF7',
    shadowColor: '#A88454',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  coreBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(253, 251, 247, 0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  brandTitle: {
    fontSize: 22,
    fontFamily: fontFamily.bold,
    color: '#FDFBF7',
    letterSpacing: 4,
    marginBottom: 4,
  },
  brandSubtitle: {
    fontSize: 10,
    fontFamily: fontFamily.semiBold,
    color: '#A88454',
    letterSpacing: 3,
    marginBottom: spacing.xl,
  },
  progressTrack: {
    width: 180,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressShimmer: {
    width: 100,
    height: '100%',
  },
  statusMessage: {
    fontSize: 12,
    fontFamily: fontFamily.medium,
    color: 'rgba(253, 251, 247, 0.7)',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
