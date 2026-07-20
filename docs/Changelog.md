import { Platform, ViewStyle } from 'react-native';

const shadowColor = '#000000';

/**
 * Universal platform-compliant depth and drop shadow maps.
 */
export const shadows: Record<string, ViewStyle> = {
  small: Platform.select({
    ios: {
      shadowColor,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    android: {
      elevation: 2,
    },
    default: {},
  }),
  medium: Platform.select({
    ios: {
      shadowColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.25,
      shadowRadius: 8,
    },
    android: {
      elevation: 4,
    },
    default: {},
  }),
  large: Platform.select({
    ios: {
      shadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
    },
    android: {
      elevation: 8,
    },
    default: {},
  }),
  extraLarge: Platform.select({
    ios: {
      shadowColor,
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.35,
      shadowRadius: 24,
    },
    android: {
      elevation: 12,
    },
    default: {},
  }),
} as const;

export type Shadows = typeof shadows;
