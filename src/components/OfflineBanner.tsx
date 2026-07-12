/**
 * OfflineBanner — Shows a subtle banner at the top when the device is offline.
 * Auto-hides when connectivity is restored.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography, fontFamily } from '../theme/typography';
import { spacing } from '../theme/spacing';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const opacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const offline = !(state.isConnected && state.isInternetReachable !== false);
      setIsOffline(offline);
      Animated.timing(opacity, {
        toValue: offline ? 1 : 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
    return () => unsubscribe();
  }, []);

  if (!isOffline) return null;

  return (
    <Animated.View style={[styles.container, { opacity }]}>
      <Ionicons name="cloud-offline" size={14} color={colors.white} />
      <Text style={styles.text}>You&apos;re offline — changes will sync when back online</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.neutral[700],
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
  },
  text: {
    ...typography.caption,
    fontFamily: fontFamily.medium,
    color: colors.white,
  },
});
