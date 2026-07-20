import { TextStyle } from 'react-native';

/**
 * Standardized typography scale configuring size, weight, leading, and tracking.
 */
export const typography: Record<string, TextStyle> = {
  display: {
    fontSize: 48,
    fontWeight: '800',
    lineHeight: 56,
    letterSpacing: -1,
  },
  heading: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    letterSpacing: 0,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
    letterSpacing: 0,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  button: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: 0.1,
  },
} as const;

export type Typography = typeof typography;
