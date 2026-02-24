export const typography = {
  hero: {
    fontSize: 36,
    lineHeight: 42,
    letterSpacing: -0.8,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  xl: {
    fontSize: 22,
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  lg: {
    fontSize: 19,
    lineHeight: 27,
    letterSpacing: -0.2,
  },
  base: {
    fontSize: 16,
    lineHeight: 23,
    letterSpacing: 0,
  },
  sm: {
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: 0,
  },
  xs: {
    fontSize: 12,
    lineHeight: 17,
    letterSpacing: 0.1,
  },
  "2xl": {
    fontSize: 26,
    lineHeight: 34,
    letterSpacing: -0.45,
  },
  "3xl": {
    fontSize: 32,
    lineHeight: 39,
    letterSpacing: -0.65,
  },
  caption: {
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.45,
  },
} as const;

export type TypographyScale = typeof typography;
export type TypographyKey = keyof TypographyScale;
