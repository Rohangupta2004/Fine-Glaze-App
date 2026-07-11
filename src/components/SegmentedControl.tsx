import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import { typography, fontFamily } from '../theme/typography';
import { spacing, radius, TOUCH_TARGET } from '../theme/spacing';

interface Segment<T extends string> {
  label: string;
  value: T;
  count?: number;
}

interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({ segments, value, onChange }: SegmentedControlProps<T>) {
  return (
    <View style={styles.container}>
      {segments.map(segment => {
        const active = segment.value === value;
        return (
          <TouchableOpacity
            key={segment.value}
            style={{ ...styles.segment, ...(active ? styles.active : {}) }}
            onPress={() => onChange(segment.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text style={{ ...styles.label, ...(active ? styles.activeLabel : {}) }}>
              {segment.label}{segment.count !== undefined ? ` (${segment.count})` : ''}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: colors.neutral[100],
  },
  segment: {
    minHeight: TOUCH_TARGET,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  active: {
    backgroundColor: colors.white,
    shadowColor: colors.ink,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  label: {
    ...typography.caption,
    fontFamily: fontFamily.medium,
    color: colors.neutral[500],
    textAlign: 'center',
  },
  activeLabel: { color: colors.primary, fontFamily: fontFamily.semiBold },
});
