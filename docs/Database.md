/**
 * Corner rounding system for UI structural elements.
 */
export const radius = {
  none: 0,
  small: 4,
  medium: 8,
  large: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
} as const;

export type Radius = typeof radius;
