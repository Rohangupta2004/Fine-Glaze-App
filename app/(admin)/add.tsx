/**
 * Add screen — placeholder tab target.
 * The actual + button opens a speed-dial popup overlay in _layout.tsx,
 * so this screen is never visible. If somehow reached, show quick actions.
 */
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { colors } from '../../src/theme/colors';

export default function AdminAddScreen() {
  const router = useRouter();
  // If this screen is ever mounted, just go home
  useEffect(() => { router.replace('/(admin)/home'); }, []);
  return <View style={styles.container} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
});
