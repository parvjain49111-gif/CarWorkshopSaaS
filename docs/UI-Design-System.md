/**
 * Semantic dark theme palette tailored for a premium enterprise SaaS experience.
 */
export const colors = {
  // Brand / Interactive
  primary: '#5E6AD2',
  primaryPressed: '#4F59B2',
  secondary: '#2A2C37',
  secondaryPressed: '#22242D',

  // Feedback & Actionable Statuses
  success: '#10B981',
  successBackground: 'rgba(16, 185, 129, 0.1)',
  warning: '#F59E0B',
  warningBackground: 'rgba(245, 158, 11, 0.1)',
  danger: '#EF4444',
  dangerBackground: 'rgba(239, 68, 68, 0.1)',
  info: '#3B82F6',
  infoBackground: 'rgba(59, 130, 246, 0.1)',

  // Structural Surfaces
  background: '#0F1115',
  surface: '#16181D',
  card: '#1E2028',

  // Layout Boundaries
  border: '#2A2D3A',
  divider: '#222430',

  // Typography Tokens
  textPrimary: '#F1F3F5',
  textSecondary: '#A1A4B0',
  placeholder: '#6B6F80',
  disabled: '#424554',

  // Layer Utilities
  overlay: 'rgba(0, 0, 0, 0.65)',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export type Colors = typeof colors;

