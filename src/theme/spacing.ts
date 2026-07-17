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
    shadowColor: '#1E1815',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#695030',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
    elevation: 4,
  },
  lg: {
    shadowColor: '#695030',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 32,
    elevation: 6,
  },
  xl: {
    shadowColor: '#695030',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.1,
    shadowRadius: 48,
    elevation: 8,
  },
} as const;

/** Brand-coloured glow shadows — use for cards, CTAs, elevated surfaces */
export const glowShadows = {
  /** Subtle bronze lift — default card glow */
  sm: {
    shadowColor: '#695030',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
  },
  /** Medium bronze glow — interactive / hover cards */
  md: {
    shadowColor: '#695030',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 16,
    elevation: 6,
  },
  /** Strong bronze glow — hero cards, CTAs */
  lg: {
    shadowColor: '#695030',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  /** Gold accent glow — premium badges, gradient buttons */
  gold: {
    shadowColor: '#918050',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 8,
  },
} as const;

/** Minimum touch target (workers with gloves) */
export const TOUCH_TARGET = 48;

export type SpacingKey = keyof typeof spacing;
