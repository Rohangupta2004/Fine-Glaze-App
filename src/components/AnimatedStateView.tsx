import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { typography, fontFamily } from '../theme/typography';
import { spacing, radius } from '../theme/spacing';

export type StateViewType = 'empty' | 'loading' | 'error';

export interface AnimatedStateViewProps {
  type: StateViewType;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  iconName?: string;
}

export function AnimatedStateView({
  type,
  title,
  message,
  actionLabel,
  onAction,
  iconName,
}: AnimatedStateViewProps) {
  // Animation refs
  const translateY = useRef(new Animated.Value(20)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance animation (float up + fade in)
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous subtle pulse animation for loading state
    if (type === 'loading') {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, {
            toValue: 1.06,
            duration: 850,
            useNativeDriver: true,
          }),
          Animated.timing(pulseScale, {
            toValue: 1,
            duration: 850,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    }
  }, [type]);

  const renderBadge = () => {
    if (type === 'empty') {
      const name = iconName || 'folder-open-outline';
      return (
        <Animated.View style={[styles.badgeWrap, { transform: [{ scale: pulseScale }] }]}>
          <LinearGradient
            colors={['#FFFFFF', '#F5E6CE']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.iconCircle}
          >
            <Ionicons name={name as any} size={36} color="#695030" />
          </LinearGradient>
        </Animated.View>
      );
    }

    if (type === 'error') {
      return (
        <Animated.View style={[styles.badgeWrap, { transform: [{ scale: pulseScale }] }]}>
          <LinearGradient
            colors={['#FEF2F2', '#FEE2E2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.iconCircle, { borderColor: 'rgba(220, 38, 38, 0.25)' }]}
          >
            <Ionicons name="warning-outline" size={36} color="#DC2626" />
          </LinearGradient>
        </Animated.View>
      );
    }

    // Loading state badge
    return (
      <Animated.View style={[styles.badgeWrap, { transform: [{ scale: pulseScale }] }]}>
        <View style={styles.loadingCircle}>
          <ActivityIndicator size="large" color="#695030" />
        </View>
      </Animated.View>
    );
  };

  return (
    <Animated.View style={[styles.container, { opacity, transform: [{ translateY }] }]}>
      {renderBadge()}

      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}

      {actionLabel && onAction ? (
        <TouchableOpacity style={styles.actionBtn} onPress={onAction} activeOpacity={0.8}>
          <Ionicons
            name={type === 'error' ? 'refresh-outline' : 'arrow-forward-outline'}
            size={18}
            color="#FFFFFF"
          />
          <Text style={styles.actionBtnText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F5F2EC',
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: 'rgba(184, 144, 71, 0.22)',
    padding: spacing['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.md,
    boxShadow: '0px 6px 16px rgba(105, 80, 48, 0.07)',
  } as any,

  badgeWrap: {
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: 'rgba(184, 144, 71, 0.3)',
    boxShadow: '0px 6px 16px rgba(105, 80, 48, 0.1)',
  } as any,

  loadingCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(105, 80, 48, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: 'rgba(184, 144, 71, 0.25)',
  },

  title: {
    ...typography.h6,
    color: '#1E1815',
    fontFamily: fontFamily.semiBold,
    textAlign: 'center',
    marginBottom: 4,
  },
  message: {
    ...typography.bodySmall,
    color: '#695030',
    fontFamily: fontFamily.regular,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },

  actionBtn: {
    marginTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: '#695030',
    paddingHorizontal: spacing.xl,
    paddingVertical: 10,
    borderRadius: radius.full,
    boxShadow: '0px 4px 12px rgba(105, 80, 48, 0.2)',
  } as any,
  actionBtnText: {
    ...typography.button,
    color: '#FFFFFF',
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
  },
});
