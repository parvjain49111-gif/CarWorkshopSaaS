import { colors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { radius } from './radius';
import { shadows } from './shadows';
import { animations } from './animations';

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  animations,
} as const;

export type Theme = typeof theme;

export { colors, typography, spacing, radius, shadows, animations };
