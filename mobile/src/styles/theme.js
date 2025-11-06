/**
 * MangaTech - Cyber Neon Theme
 * Dark theme with purple-cyan gradients and holographic effects
 */

export const colors = {
  // Base colors
  black: '#0A0A0F',
  darkGray: '#1A1A24',
  gray: '#2A2A38',
  lightGray: '#3A3A4C',
  
  // Neon Purple
  purple: {
    light: '#B794F6',
    main: '#9333EA',
    dark: '#7E22CE',
    neon: '#C084FC',
    glow: 'rgba(147, 51, 234, 0.5)',
  },
  
  // Neon Cyan
  cyan: {
    light: '#67E8F9',
    main: '#06B6D4',
    dark: '#0891B2',
    neon: '#22D3EE',
    glow: 'rgba(6, 182, 212, 0.5)',
  },
  
  // Accent colors
  pink: {
    main: '#EC4899',
    glow: 'rgba(236, 72, 153, 0.5)',
  },
  
  // Status colors
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  
  // Text colors
  text: {
    primary: '#F9FAFB',
    secondary: '#D1D5DB',
    tertiary: '#9CA3AF',
    disabled: '#6B7280',
  },
};

export const gradients = {
  primary: ['#9333EA', '#06B6D4'],
  secondary: ['#7E22CE', '#0891B2'],
  neon: ['#C084FC', '#22D3EE'],
  dark: ['#0A0A0F', '#1A1A24'],
  card: ['rgba(26, 26, 36, 0.8)', 'rgba(42, 42, 56, 0.6)'],
  holographic: ['#B794F6', '#22D3EE', '#EC4899', '#9333EA'],
};

export const shadows = {
  // Glow effects
  purpleGlow: {
    shadowColor: colors.purple.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  
  cyanGlow: {
    shadowColor: colors.cyan.neon,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 10,
  },
  
  pinkGlow: {
    shadowColor: colors.pink.main,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 15,
    elevation: 8,
  },
  
  // Subtle shadows
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

export const typography = {
  // Font families
  fonts: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    black: 'System',
  },
  
  // Font sizes
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    huge: 48,
  },
  
  // Line heights
  lineHeights: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  
  // Font weights
  weights: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    black: '900',
  },
};

export const animations = {
  timing: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  
  easing: {
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

export const layout = {
  // Screen dimensions
  screenPadding: spacing.md,
  containerMaxWidth: 1200,
  
  // Grid
  gridGap: spacing.md,
  cardAspectRatio: 3 / 4,
  
  // Bottom tab bar
  tabBarHeight: 70,
  tabIconSize: 28,
  
  // Header
  headerHeight: 60,
};

export default {
  colors,
  gradients,
  shadows,
  spacing,
  borderRadius,
  typography,
  animations,
  layout,
};
