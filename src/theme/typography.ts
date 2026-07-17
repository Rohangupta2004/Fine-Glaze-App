/**
 * Fine Glaze COS Design System v1.0.0 — Typography
 * Font: Poppins (Google Fonts)
 * All sizes/lineHeights from owner's design system sheet.
 */

import { TextStyle } from 'react-native';

export const fontFamily = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semiBold: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
} as const;

export const typography = {
  h1: {
    fontFamily: fontFamily.semiBold,
    fontSize: 32,
    lineHeight: 40,
  } as TextStyle,

  h2: {
    fontFamily: fontFamily.semiBold,
    fontSize: 24,
    lineHeight: 32,
  } as TextStyle,

  h3: {
    fontFamily: fontFamily.medium,
    fontSize: 20,
    lineHeight: 28,
  } as TextStyle,

  h4: {
    fontFamily: fontFamily.medium,
    fontSize: 18,
    lineHeight: 26,
  } as TextStyle,

  h5: {
    fontFamily: fontFamily.medium,
    fontSize: 16,
    lineHeight: 24,
  } as TextStyle,

  h6: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    lineHeight: 20,
  } as TextStyle,

  bodyLarge: {
    fontFamily: fontFamily.regular,
    fontSize: 16,
    lineHeight: 24,
  } as TextStyle,

  bodyMedium: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
  } as TextStyle,

  bodySmall: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
  } as TextStyle,

  caption: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 14,
  } as TextStyle,

  button: {
    fontFamily: fontFamily.semiBold,
    fontSize: 16,
    lineHeight: 24,
  } as TextStyle,

  buttonSmall: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
  } as TextStyle,

  label: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    lineHeight: 20,
  } as TextStyle,
} as const;

export type TypographyKey = keyof typeof typography;
