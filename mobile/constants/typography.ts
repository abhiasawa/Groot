export const typography = {
  hero: {
    fontSize: 32,
    lineHeight: 38,
    letterSpacing: -0.5,
  },
  title: {
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  xl: {
    fontSize: 20,
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  lg: {
    fontSize: 18,
    lineHeight: 26,
    letterSpacing: -0.1,
  },
  base: {
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0,
  },
  sm: {
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0,
  },
  xs: {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.1,
  },
  "2xl": {
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  "3xl": {
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.5,
  },
  caption: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.5,
  },
} as const;

export type TypographyScale = typeof typography;
export type TypographyKey = keyof TypographyScale;
