import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, TOUCH_TARGET } from '../theme/spacing';

interface PinPadProps {
  onComplete: (pin: string) => void;
  length?: number;
}

export function PinPad({ onComplete, length = 6 }: PinPadProps) {
  const [pin, setPin] = useState('');

  const handlePress = useCallback(
    (digit: string) => {
      if (pin.length >= length) return;
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === length) {
        setTimeout(() => {
          onComplete(newPin);
          setPin('');
        }, 200);
      }
    },
    [pin, length, onComplete]
  );

  const handleBackspace = useCallback(() => {
    setPin((prev) => prev.slice(0, -1));
  }, []);

  return (
    <View style={styles.container}>
      {/* Dots */}
      <View style={styles.dotsRow}>
        {Array.from({ length }, (_, i) => (
          <View
            key={i}
            style={[styles.dot, i < pin.length && styles.dotFilled]}
          />
        ))}
      </View>

      {/* Numpad */}
      <View style={styles.pad}>
        {[
          ['1', '2', '3'],
          ['4', '5', '6'],
          ['7', '8', '9'],
          ['', '0', 'back'],
        ].map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((key, ki) => {
              if (key === '') {
                return <View key={ki} style={styles.key} />;
              }
              if (key === 'back') {
                return (
                  <TouchableOpacity
                    key={ki}
                    style={styles.key}
                    onPress={handleBackspace}
                    activeOpacity={0.6}
                  >
                    <Ionicons
                      name="backspace-outline"
                      size={28}
                      color={colors.ink}
                    />
                  </TouchableOpacity>
                );
              }
              return (
                <TouchableOpacity
                  key={ki}
                  style={styles.key}
                  onPress={() => handlePress(key)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.keyText}>{key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: spacing['4xl'],
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.neutral[300],
    backgroundColor: colors.transparent,
  },
  dotFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pad: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing['2xl'],
  },
  key: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyText: {
    ...typography.h2,
    color: colors.ink,
  },
});
