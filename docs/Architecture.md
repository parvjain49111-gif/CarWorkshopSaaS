/**
 * Execution presets for timing durations and physics-based interpolation configurations.
 */
export const animations = {
  // Pure Time Intervals (ms)
  fast: 150,
  normal: 300,
  slow: 500,

  // Interpolation/Physics Profiles
  screenTransition: {
    damping: 500,
    stiffness: 1000,
    mass: 3,
    overshootClamping: true,
  },
  buttonPress: {
    duration: 100,
  },
  cardAnimation: {
    duration: 250,
  },
} as const;

export type Animations = typeof animations;
