import { colors } from './colors';
import { typography, fontFamily } from './typography';
import { spacing, radius, shadows, TOUCH_TARGET } from './spacing';

const theme = {
  colors,
  typography,
  fontFamily,
  spacing,
  radius,
  shadows,
  TOUCH_TARGET,
} as const;

export default theme;
export type Theme = typeof theme;
