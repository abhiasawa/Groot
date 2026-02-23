/**
 * Theme color tokens for the Groot mobile app.
 * Translated from the web portal's Notion-inspired CSS color system.
 */

export interface ThemeColors {
  // Core
  background: string;
  foreground: string;
  // Card
  card: string;
  cardForeground: string;
  // Primary
  primary: string;
  primaryForeground: string;
  // Secondary
  secondary: string;
  secondaryForeground: string;
  // Muted
  muted: string;
  mutedForeground: string;
  // Accent
  accent: string;
  accentForeground: string;
  // Destructive
  destructive: string;
  // Borders & inputs
  border: string;
  input: string;
  ring: string;
  // Mood colors
  moodGreat: string;
  moodGood: string;
  moodOkay: string;
  moodLow: string;
  moodBad: string;
  moodNone: string;
  // Chart colors
  chart1: string;
  chart2: string;
  chart3: string;
  chart4: string;
  chart5: string;
  // Glassmorphic
  glassSurface: string;
  glassBorder: string;
  glassHighlight: string;
  // Gradients
  gradientStart: string;
  gradientMid: string;
  gradientEnd: string;
  // Elevated shadows
  shadowColor: string;
  elevatedShadowColor: string;
}

export const lightTheme: ThemeColors = {
  // Core
  background: "#FFFFFF",
  foreground: "#37352F",
  // Card
  card: "#FFFFFF",
  cardForeground: "#37352F",
  // Primary
  primary: "#2383E2",
  primaryForeground: "#FFFFFF",
  // Secondary
  secondary: "#F7F6F3",
  secondaryForeground: "#37352F",
  // Muted
  muted: "#F7F6F3",
  mutedForeground: "#787774",
  // Accent
  accent: "#D9730D",
  accentForeground: "#FFFFFF",
  // Destructive
  destructive: "#E03E3E",
  // Borders & inputs
  border: "rgba(55, 53, 47, 0.09)",
  input: "rgba(55, 53, 47, 0.09)",
  ring: "#2383E2",
  // Mood colors
  moodGreat: "#0F7B6C",
  moodGood: "#448361",
  moodOkay: "#CB912F",
  moodLow: "#D9730D",
  moodBad: "#E03E3E",
  moodNone: "#E3E2E0",
  // Chart colors
  chart1: "#2383E2",
  chart2: "#0F7B6C",
  chart3: "#D9730D",
  chart4: "#6940A5",
  chart5: "#448361",
  // Glassmorphic
  glassSurface: 'rgba(255, 255, 255, 0.72)',
  glassBorder: 'rgba(255, 255, 255, 0.5)',
  glassHighlight: 'rgba(255, 255, 255, 0.9)',
  // Gradients
  gradientStart: '#EEF2FF',
  gradientMid: '#F0EBFF',
  gradientEnd: '#FFF1EB',
  // Elevated shadows
  shadowColor: 'rgba(0, 0, 0, 0.06)',
  elevatedShadowColor: 'rgba(0, 0, 0, 0.12)',
};

export const darkTheme: ThemeColors = {
  // Core
  background: "#191919",
  foreground: "rgba(255, 255, 255, 0.81)",
  // Card
  card: "#202020",
  cardForeground: "rgba(255, 255, 255, 0.81)",
  // Primary
  primary: "#529CCA",
  primaryForeground: "#FFFFFF",
  // Secondary
  secondary: "#2F2F2F",
  secondaryForeground: "rgba(255, 255, 255, 0.81)",
  // Muted
  muted: "#2F2F2F",
  mutedForeground: "rgba(255, 255, 255, 0.443)",
  // Accent
  accent: "#FFA344",
  accentForeground: "#191919",
  // Destructive
  destructive: "#E03E3E",
  // Borders & inputs
  border: "rgba(255, 255, 255, 0.094)",
  input: "rgba(255, 255, 255, 0.15)",
  ring: "#529CCA",
  // Mood colors
  moodGreat: "#0F7B6C",
  moodGood: "#448361",
  moodOkay: "#CB912F",
  moodLow: "#D9730D",
  moodBad: "#E03E3E",
  moodNone: "#E3E2E0",
  // Chart colors
  chart1: "#529CCA",
  chart2: "#4DB8A4",
  chart3: "#FFA344",
  chart4: "#9A6DD7",
  chart5: "#6BAF8D",
  // Glassmorphic
  glassSurface: 'rgba(35, 35, 35, 0.75)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  glassHighlight: 'rgba(255, 255, 255, 0.05)',
  // Gradients
  gradientStart: '#0F0F1A',
  gradientMid: '#12101E',
  gradientEnd: '#1A1015',
  // Elevated shadows
  shadowColor: 'rgba(0, 0, 0, 0.3)',
  elevatedShadowColor: 'rgba(0, 0, 0, 0.5)',
};
