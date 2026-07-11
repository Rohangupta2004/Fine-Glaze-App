import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface AvatarProps {
  uri?: string | null;
  name: string;
  size?: number;
}

/** Extract up to 2 initials from a full name */
function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

/** Generate a consistent hue from a name string */
function nameToColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Map to our bronze palette range
  const hues = [colors.primary, colors.secondary, colors.tertiary, '#7A6040', '#A09070'];
  return hues[Math.abs(hash) % hues.length];
}

export function Avatar({ uri, name, size = 44 }: AvatarProps) {
  const borderRadius = size / 2;

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, { width: size, height: size, borderRadius }]}
        contentFit="cover"
        transition={200}
      />
    );
  }

  const bg = nameToColor(name);
  const initials = getInitials(name);
  const fontSize = size * 0.38;

  return (
    <View style={[styles.initialsContainer, { width: size, height: size, borderRadius, backgroundColor: bg }]}>
      <Text style={[styles.initials, { fontSize, lineHeight: fontSize * 1.2 }]}>
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.neutral[200],
  },
  initialsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.white,
    fontFamily: typography.h5.fontFamily,
    fontWeight: '600',
  },
});
