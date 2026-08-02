import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { typography, fontFamily } from '../theme/typography';

interface AvatarProps {
  uri?: string | null;
  name: string;
  size?: number;
}

/** Extract up to 2 initials from a full name */
function getInitials(name: string): string {
  if (!name) return 'W';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export function Avatar({ uri, name, size = 44 }: AvatarProps) {
  const borderRadius = size / 2;
  const [hasError, setHasError] = useState(false);

  if (uri && !hasError) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, { width: size, height: size, borderRadius }]}
        contentFit="cover"
        transition={200}
        onError={() => setHasError(true)}
      />
    );
  }

  const initials = getInitials(name);
  const fontSize = size * 0.38;

  return (
    <LinearGradient
      colors={['#5B4122', '#8B6840']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.initialsContainer, { width: size, height: size, borderRadius }]}
    >
      <Text style={[styles.initials, { fontSize, lineHeight: fontSize * 1.2 }]}>
        {initials}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.neutral[200],
  },
  initialsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  initials: {
    color: '#FFFFFF',
    fontFamily: fontFamily.bold,
  },
});
