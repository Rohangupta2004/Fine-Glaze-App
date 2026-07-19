/**
 * Fine Glaze COS Design System v1.0.0 — Spacing & Layout
 * 8pt grid system.
 */

/** 8pt grid spacing scale */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 40,
  '3xl': 48,
  '4xl': 64,
  '5xl': 96,
  '6xl': 128,
} as const;

/** Border radius tokens */
export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999, // Pill shape
} as const;

/** Shadow tokens — neutral */
export const shadows = {
  sm: {
    boxShadow: '0px 1px 2px rgba(30, 24, 21, 0.05)',
    elevation: 1,
  },
  md: {
    boxShadow: '0px 8px 20px rgba(105, 80, 48, 0.06)',
    elevation: 4,
  },
  lg: {
    boxShadow: '0px 12px 32px rgba(105, 80, 48, 0.08)',
    elevation: 6,
  },
  xl: {
    boxShadow: '0px 16px 48px rgba(105, 80, 48, 0.1)',
    elevation: 8,
  },
} as const;

/** Brand-coloured glow shadows — use for cards, CTAs, elevated surfaces */
export const glowShadows = {
  /** Subtle bronze lift — default card glow */
  sm: {
    boxShadow: '0px 2px 8px rgba(105, 80, 48, 0.10)',
    elevation: 3,
  },
  /** Medium bronze glow — interactive / hover cards */
  md: {
    boxShadow: '0px 4px 16px rgba(105, 80, 48, 0.14)',
    elevation: 6,
  },
  /** Strong bronze glow — hero cards, CTAs */
  lg: {
    boxShadow: '0px 8px 24px rgba(105, 80, 48, 0.18)',
    elevation: 10,
  },
  /** Gold accent glow — premium badges, gradient buttons */
  gold: {
    boxShadow: '0px 4px 20px rgba(145, 128, 80, 0.22)',
    elevation: 8,
  },
} as const;

/** Minimum touch target (workers with gloves) */
export const TOUCH_TARGET = 48;

export type SpacingKey = keyof typeof spacing;
