/**
 * Mathematical spacing scale mapping margins, paddings, and flex layouts.
 */
export const spacing = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  full: 9999,
} as const;

export type Spacing = typeof spacing;
