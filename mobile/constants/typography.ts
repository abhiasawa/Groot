/**
 * Typography scale matching the web portal's Inter font system.
 * Values are in device-independent pixels (dp).
 */

export const typography = {
  xs: {
    fontSize: 12,
    lineHeight: 16,
  },
  sm: {
    fontSize: 14,
    lineHeight: 20,
  },
  base: {
    fontSize: 16,
    lineHeight: 24,
  },
  lg: {
    fontSize: 18,
    lineHeight: 28,
  },
  xl: {
    fontSize: 20,
    lineHeight: 28,
  },
  "2xl": {
    fontSize: 24,
    lineHeight: 32,
  },
  "3xl": {
    fontSize: 30,
    lineHeight: 36,
  },
} as const;

export type TypographyScale = typeof typography;
export type TypographyKey = keyof TypographyScale;
