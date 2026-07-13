/**
 * GlassSheet — Bottom-sheet modal with glassy backdrop + gradient top accent.
 *
 * Universal replacement for inline Modal patterns. Renders a darkened overlay
 * and a white sheet sliding up from the bottom, with a thin gradient accent bar
 * at the top of the sheet for brand polish.
 *
 * Props:
 *  - visible, onClose: standard modal controls
 *  - title: optional header title
 *  - subtitle: optional header subtitle (smaller, muted)
 *  - icon: optional Ionicons name shown in a gradient icon block
 *  - accentColors: gradient for the top accent bar (default brand bronze→gold)
 *  - children: sheet body content
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Platform,
  Pressable,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { colors } from '../theme/colors';
import { typography, fontFamily } from '../theme/typography';
import { spacing, radius, shadows } from '../theme/spacing';

interface GlassSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: string;
  accentColors?: [string, string, ...string[]];
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_ACCENT: [string, string] = ['#695030', '#918050'];

export function GlassSheet({
  visible,
  onClose,
  title,
  subtitle,
  icon,
  accentColors = DEFAULT_ACCENT,
  children,
  style,
}: GlassSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, style]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Gradient accent bar at top */}
          <LinearGradient
            colors={accentColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.accent}
          />

          <View style={styles.body}>
            {/* Header */}
            {(title || icon) && (
              <View style={styles.header}>
                {icon && (
                  <View style={styles.iconWrap}>
                    <LinearGradient
                      colors={accentColors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.iconGrad}
                    >
                      <Ionicons name={icon as any} size={22} color={colors.white} />
                    </LinearGradient>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  {title && <Text style={styles.title}>{title}</Text>}
                  {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                </View>
                <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={colors.neutral[400]} />
                </TouchableOpacity>
              </View>
            )}

            {children}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 24, 21, 0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius['3xl'],
    borderTopRightRadius: radius['3xl'],
    overflow: 'hidden',
    ...shadows.xl,
  },
  accent: {
    height: 5,
    width: '100%',
  },
  body: {
    padding: spacing['2xl'],
    paddingBottom: spacing['4xl'] + (Platform.OS === 'ios' ? 16 : 0),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    overflow: 'hidden',
    ...shadows.md,
  },
  iconGrad: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h5,
    color: colors.ink,
    marginBottom: 2,
  },
  subtitle: {
    ...typography.caption,
    color: colors.neutral[500],
  },
  closeBtn: {
    padding: spacing.xs,
  },
});
