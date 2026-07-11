import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography, fontFamily } from '../theme/typography';
import { spacing, radius, TOUCH_TARGET } from '../theme/spacing';

interface SearchBarProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  onFilterPress?: () => void;
}

export function SearchBar({ value, onChangeText, placeholder = 'Search', onFilterPress }: SearchBarProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="search-outline" size={20} color={colors.neutral[400]} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.neutral[400]}
        style={styles.input}
        returnKeyType="search"
      />
      {!!value && (
        <TouchableOpacity onPress={() => onChangeText('')} hitSlop={8} accessibilityLabel="Clear search">
          <Ionicons name="close-circle" size={20} color={colors.neutral[400]} />
        </TouchableOpacity>
      )}
      {onFilterPress && (
        <TouchableOpacity style={styles.filter} onPress={onFilterPress} accessibilityLabel="Open filters">
          <Ionicons name="options-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: TOUCH_TARGET + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.neutral[200],
    backgroundColor: colors.white,
  },
  input: {
    flex: 1,
    ...typography.bodyMedium,
    fontFamily: fontFamily.regular,
    color: colors.ink,
    paddingVertical: spacing.md,
  },
  filter: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: colors.neutral[100],
  },
});
