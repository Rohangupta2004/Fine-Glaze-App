import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { colors } from '../theme/colors';
import { typography, fontFamily } from '../theme/typography';

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

  const initials = getInitials(name);
  const fontSize = size * 0.38;

  return (
    <View style={[styles.initialsContainer, { width: size, height: size, borderRadius }]}>
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
    backgroundColor: 'rgba(105, 80, 48, 0.12)',
    borderWidth: 1.2,
    borderColor: 'rgba(184, 144, 71, 0.3)',
  },
  initials: {
    color: '#695030',
    fontFamily: fontFamily.semiBold,
  },
});
