/**
 * Fine Glaze COS Design System v1.0.0 — Color Tokens
 * Source: Owner's design system sheet, locked Jul 11 2026
 * Light theme app-wide.
 */

export const colors = {
  // ── Brand ──────────────────────────────────────────
  primary: '#695030',      // Bronze — primary accent
  secondary: '#918050',    // Warm gold
  tertiary: '#C8B79C',     // Light bronze

  // ── Backgrounds ────────────────────────────────────
  background: '#F9F9F8',   // Light warm cream (app bg)
  surface: '#FFFFFF',      // White cards
  ink: '#1E1815',          // Primary text

  // ── Neutral Scale ──────────────────────────────────
  neutral: {
    100: '#F5F5F4',
    200: '#E7E5E0',
    300: '#D6D3CC',
    400: '#B8B3A9',
    500: '#9A9488',
    600: '#7C7568',
    700: '#5E574C',
    800: '#403B33',
    900: '#22201B',
  },

  // ── Semantic ───────────────────────────────────────
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  pending: '#8B5CF6',

  // ── Semantic Backgrounds (12% opacity approx) ─────
  successBg: '#ECFDF5',
  warningBg: '#FFFBEB',
  errorBg: '#FEF2F2',
  infoBg: '#EFF6FF',
  pendingBg: '#F5F3FF',

  // ── Misc ───────────────────────────────────────────
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  overlay: 'rgba(30, 24, 21, 0.5)',  // Modal overlay
  divider: '#E7E5E0',                // N-200

  // ── Auth Theme Helpers (Light) ─────────────────────
  authBg: '#F9F9F8',                 // Same as background
  authSurface: '#FFFFFF',            // Same as surface
  authBorder: '#E7E5E0',             // Same as divider
  authText: '#1E1815',               // Same as ink
  authPlaceholder: '#9A9488',        // Neutral 500
} as const;

export type ColorKey = keyof typeof colors;
