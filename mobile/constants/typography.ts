export const fonts = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semiBold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
} as const;

export const typography = {
  hero: {
    fontSize: 64,
    lineHeight: 72,
    letterSpacing: -1.5,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  xl: {
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  lg: {
    fontSize: 18,
    lineHeight: 26,
    letterSpacing: -0.2,
  },
  base: {
    fontSize: 16,
    lineHeight: 26,
    letterSpacing: 0,
  },
  sm: {
    fontSize: 14,
    lineHeight: 21,
    letterSpacing: 0,
  },
  xs: {
    fontSize: 13,
    lineHeight: 18,
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
    letterSpacing: 0.3,
  },
} as const;

export type TypographyScale = typeof typography;
export type TypographyKey = keyof TypographyScale;
