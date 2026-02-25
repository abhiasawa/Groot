# The Garden — Visual Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the Groot mobile app from a cool teal/glassmorphic design to a warm sage-green + cream nature-inspired aesthetic with a Today dashboard, Groot sprout mascot, illustrated mood faces, and 5-tab navigation with center FAB.

**Architecture:** Update the theme tokens first (foundation), then restyle shared UI components (cards, backgrounds, tab bar), then create new illustrations and the Today screen, then refresh each existing screen. Each task is independent after the foundation layers.

**Tech Stack:** React Native / Expo Router, react-native-svg (already installed), react-native-reanimated, expo-linear-gradient, lucide-react-native.

**Design doc:** `docs/plans/2026-02-24-garden-visual-redesign.md`

---

### Task 1: Update Theme Color Tokens (Foundation)

**Files:**
- Modify: `mobile/lib/theme/tokens.ts`

**Step 1: Replace light theme colors**

Replace the entire `lightTheme` object with the new warm sage-green + cream palette:

```typescript
export const lightTheme: ThemeColors = {
  // Core
  background: "#F5F2EB",
  foreground: "#2D3A2E",
  // Card
  card: "#FFFFFF",
  cardForeground: "#2D3A2E",
  // Primary
  primary: "#4A7C59",
  primaryForeground: "#FFFFFF",
  // Secondary
  secondary: "#E8EDDF",
  secondaryForeground: "#3D6B4A",
  // Muted
  muted: "#ECE9E1",
  mutedForeground: "#7D8B7E",
  // Accent
  accent: "#E8845A",
  accentForeground: "#FFFFFF",
  // Destructive
  destructive: "#C76A6A",
  // Borders & inputs
  border: "rgba(74, 124, 89, 0.12)",
  input: "rgba(74, 124, 89, 0.12)",
  ring: "#4A7C59",
  // Mood colors
  moodGreat: "#5BAE7C",
  moodGood: "#7EC8A0",
  moodOkay: "#F0C76E",
  moodLow: "#E8945C",
  moodBad: "#D47B7B",
  moodNone: "#D5D3CB",
  // Chart colors
  chart1: "#4A7C59",
  chart2: "#E8845A",
  chart3: "#5B8FD4",
  chart4: "#B09068",
  chart5: "#9A7DC8",
  // Glassmorphic (now warm card style)
  glassSurface: "#FFFFFF",
  glassBorder: "rgba(74, 124, 89, 0.08)",
  glassHighlight: "rgba(255, 255, 255, 0.95)",
  // Gradients
  gradientStart: "#FAF8F3",
  gradientMid: "#F5F2EB",
  gradientEnd: "#EEF0E5",
  // Elevated shadows
  shadowColor: "rgba(45, 58, 46, 0.06)",
  elevatedShadowColor: "rgba(45, 58, 46, 0.12)",
  // Ambient accent overlays
  auraPrimary: "rgba(74, 124, 89, 0.10)",
  auraSecondary: "rgba(232, 132, 90, 0.08)",
  auraTertiary: "rgba(91, 143, 212, 0.08)",
};
```

**Step 2: Replace dark theme colors**

```typescript
export const darkTheme: ThemeColors = {
  // Core
  background: "#141912",
  foreground: "#E5E8E0",
  // Card
  card: "#1C2419",
  cardForeground: "#E5E8E0",
  // Primary
  primary: "#8BC4A0",
  primaryForeground: "#FFFFFF",
  // Secondary
  secondary: "#242E22",
  secondaryForeground: "#B8D9C4",
  // Muted
  muted: "#1E2620",
  mutedForeground: "#A0AEA2",
  // Accent
  accent: "#F0A07A",
  accentForeground: "#2A1E18",
  // Destructive
  destructive: "#D98A8A",
  // Borders & inputs
  border: "rgba(139, 196, 160, 0.20)",
  input: "rgba(139, 196, 160, 0.20)",
  ring: "#8BC4A0",
  // Mood colors
  moodGreat: "#6DC98F",
  moodGood: "#96D8B6",
  moodOkay: "#F5D88A",
  moodLow: "#F0AC78",
  moodBad: "#E09A9A",
  moodNone: "#3D4A3C",
  // Chart colors
  chart1: "#8BC4A0",
  chart2: "#F0A07A",
  chart3: "#7DAAE8",
  chart4: "#C6AA82",
  chart5: "#B49ADE",
  // Glassmorphic (warm card style dark)
  glassSurface: "rgba(28, 36, 25, 0.95)",
  glassBorder: "rgba(139, 196, 160, 0.15)",
  glassHighlight: "rgba(255, 255, 255, 0.05)",
  // Gradients
  gradientStart: "#111710",
  gradientMid: "#171E15",
  gradientEnd: "#1C251A",
  // Elevated shadows
  shadowColor: "rgba(0, 0, 0, 0.30)",
  elevatedShadowColor: "rgba(0, 0, 0, 0.45)",
  // Ambient accent overlays
  auraPrimary: "rgba(139, 196, 160, 0.12)",
  auraSecondary: "rgba(240, 160, 122, 0.08)",
  auraTertiary: "rgba(125, 170, 232, 0.08)",
};
```

**Step 3: Verify app compiles**

Run: `cd /Users/abhishekasawa/Downloads/Claude/Groot/mobile && npx tsc --noEmit`
Expected: No type errors (interface unchanged, only values changed)

**Step 4: Commit**

```bash
git add mobile/lib/theme/tokens.ts
git commit -m "feat(mobile): update theme to warm sage-green + cream palette"
```

---

### Task 2: Restyle GlassCard → Warm Solid Card

**Files:**
- Modify: `mobile/components/ui/glass-card.tsx`

**Step 1: Replace GlassCard implementation with warm solid card style**

Remove the glassmorphic double-view structure. Replace with a single warm card:

```typescript
import React from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";
import { useTheme } from "../../lib/theme/provider";

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  /** Left border accent color */
  accentColor?: string;
  /** Animation delay in ms (for stagger effects) */
  delay?: number;
  /** Padding inside the card. Default 20 */
  padding?: number;
  /** Blur intensity. Default 40 (legacy, ignored) */
  intensity?: number;
}

export function GlassCard({
  children,
  style,
  accentColor,
  delay = 0,
  padding = 20,
  intensity = 40,
}: GlassCardProps) {
  const { colors } = useTheme();
  void delay;
  void intensity;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.glassSurface,
          shadowColor: colors.elevatedShadowColor,
          borderLeftWidth: accentColor ? 3 : 0,
          borderLeftColor: accentColor ?? "transparent",
        },
        style,
      ]}
    >
      <View style={{ padding }}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: "hidden",
    // Soft warm shadow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
});
```

Key changes:
- Single View instead of outer+inner
- `borderRadius: 16` (was 18)
- Removed `borderWidth: 1` glass border
- Removed top highlight border
- Softer shadow: offset 4, radius 12, opacity via `elevatedShadowColor` (already has alpha)
- Accent strip is 3px (was 2px) for more visual punch
- No border on non-accent cards (cleaner)

**Step 2: Verify app compiles**

Run: `cd /Users/abhishekasawa/Downloads/Claude/Groot/mobile && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add mobile/components/ui/glass-card.tsx
git commit -m "feat(mobile): restyle cards to warm solid style with soft shadows"
```

---

### Task 3: Update Gradient Background

**Files:**
- Modify: `mobile/components/ui/gradient-background.tsx`

**Step 1: Soften aura overlays for warmer feel**

Update the aura sizes and opacities to be more subtle with the warm palette:

```typescript
import React from "react";
import { StyleSheet, View, type ColorValue } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../lib/theme/provider";

interface GradientBackgroundProps {
  children: React.ReactNode;
  /** Override gradient colors (min 2) */
  colors?: readonly [ColorValue, ColorValue, ...ColorValue[]];
}

export function GradientBackground({ children, colors: overrideColors }: GradientBackgroundProps) {
  const { colors } = useTheme();

  const gradientColors: readonly [ColorValue, ColorValue, ...ColorValue[]] =
    overrideColors ?? [
      colors.gradientStart,
      colors.gradientMid,
      colors.gradientEnd,
    ];

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <View
        pointerEvents="none"
        style={[styles.aura, styles.auraPrimary, { backgroundColor: colors.auraPrimary }]}
      />
      <View
        pointerEvents="none"
        style={[styles.aura, styles.auraSecondary, { backgroundColor: colors.auraSecondary }]}
      />
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  aura: {
    position: "absolute",
    borderRadius: 999,
  },
  auraPrimary: {
    width: 280,
    height: 280,
    top: -180,
    right: -120,
    opacity: 0.5,
  },
  auraSecondary: {
    width: 240,
    height: 240,
    bottom: -160,
    left: -100,
    opacity: 0.4,
  },
});
```

Changes:
- Removed tertiary aura (simpler, less busy)
- Removed `paperWash` overlay (not needed with warm base)
- Larger, softer auras with controlled opacity
- Simpler, cleaner feel

**Step 2: Commit**

```bash
git add mobile/components/ui/gradient-background.tsx
git commit -m "feat(mobile): simplify gradient background with warm auras"
```

---

### Task 4: Update PillBadge for Warm Style

**Files:**
- Modify: `mobile/components/ui/pill-badge.tsx`

**Step 1: Update pill badge to warmer, rounder style**

```typescript
import React from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { useTheme } from "../../lib/theme/provider";

interface PillBadgeProps {
  label: string;
  color?: string;
  textColor?: string;
  small?: boolean;
  style?: ViewStyle;
}

export function PillBadge({ label, color, textColor, small, style }: PillBadgeProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.pill,
        small && styles.pillSmall,
        {
          backgroundColor: color ?? colors.secondary,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          small && styles.textSmall,
          { color: textColor ?? colors.mutedForeground },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pillSmall: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 16,
  },
  text: {
    fontFamily: "Manrope_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.1,
  },
  textSmall: {
    fontSize: 11,
  },
});
```

Changes:
- Removed `borderWidth: 1` and `borderColor` — cleaner without borders
- More rounded: `borderRadius: 20` (pill shape) instead of 8
- Slightly larger padding for breathing room
- Bumped font to 12px

**Step 2: Commit**

```bash
git add mobile/components/ui/pill-badge.tsx
git commit -m "feat(mobile): restyle pill badges to warm borderless pills"
```

---

### Task 5: Create Mood Face Illustrations

**Files:**
- Create: `mobile/components/illustrations/mood-faces.tsx`
- Modify: `mobile/constants/mood.ts`

**Step 1: Create SVG mood face components**

Create `mobile/components/illustrations/mood-faces.tsx`:

```typescript
import React from "react";
import Svg, { Circle, Path, G } from "react-native-svg";

interface MoodFaceProps {
  size?: number;
  color?: string;
}

/** Score 5: Big happy grin */
export function FaceExcellent({ size = 40, color = "#5BAE7C" }: MoodFaceProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx="20" cy="20" r="19" fill={color} opacity={0.15} />
      <Circle cx="20" cy="20" r="16" fill={color} opacity={0.25} />
      {/* Eyes — happy arcs */}
      <Path d="M12 16 Q14 13 16 16" stroke={color} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      <Path d="M24 16 Q26 13 28 16" stroke={color} strokeWidth="2.2" strokeLinecap="round" fill="none" />
      {/* Big smile */}
      <Path d="M12 23 Q20 31 28 23" stroke={color} strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Score 4: Gentle smile */
export function FaceGood({ size = 40, color = "#7EC8A0" }: MoodFaceProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx="20" cy="20" r="19" fill={color} opacity={0.15} />
      <Circle cx="20" cy="20" r="16" fill={color} opacity={0.25} />
      {/* Eyes — dots */}
      <Circle cx="14" cy="16" r="2" fill={color} />
      <Circle cx="26" cy="16" r="2" fill={color} />
      {/* Gentle smile */}
      <Path d="M13 23 Q20 28 27 23" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Score 3: Neutral flat mouth */
export function FaceOkay({ size = 40, color = "#F0C76E" }: MoodFaceProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx="20" cy="20" r="19" fill={color} opacity={0.15} />
      <Circle cx="20" cy="20" r="16" fill={color} opacity={0.25} />
      {/* Eyes — dots */}
      <Circle cx="14" cy="16" r="2" fill={color} />
      <Circle cx="26" cy="16" r="2" fill={color} />
      {/* Flat mouth */}
      <Path d="M14 24 L26 24" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

/** Score 2: Slightly sad */
export function FaceBad({ size = 40, color = "#E8945C" }: MoodFaceProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx="20" cy="20" r="19" fill={color} opacity={0.15} />
      <Circle cx="20" cy="20" r="16" fill={color} opacity={0.25} />
      {/* Eyes — dots */}
      <Circle cx="14" cy="16" r="2" fill={color} />
      <Circle cx="26" cy="16" r="2" fill={color} />
      {/* Slight frown */}
      <Path d="M14 26 Q20 22 26 26" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Score 1: Frowning with downturned eyes */
export function FaceTerrible({ size = 40, color = "#D47B7B" }: MoodFaceProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Circle cx="20" cy="20" r="19" fill={color} opacity={0.15} />
      <Circle cx="20" cy="20" r="16" fill={color} opacity={0.25} />
      {/* Eyes — sad downward arcs */}
      <Path d="M12 17 Q14 19 16 17" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
      <Path d="M24 17 Q26 19 28 17" stroke={color} strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Deep frown */}
      <Path d="M13 27 Q20 21 27 27" stroke={color} strokeWidth="2.2" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Render the correct face for a mood score (1-5) */
export function MoodFace({ score, size, color }: { score: number; size?: number; color?: string }) {
  switch (score) {
    case 5: return <FaceExcellent size={size} color={color} />;
    case 4: return <FaceGood size={size} color={color} />;
    case 3: return <FaceOkay size={size} color={color} />;
    case 2: return <FaceBad size={size} color={color} />;
    case 1: return <FaceTerrible size={size} color={color} />;
    default: return <FaceOkay size={size} color={color} />;
  }
}

/** Labels for mood check-in */
export const MOOD_FACE_LABELS: Record<number, string> = {
  1: "Terrible",
  2: "Bad",
  3: "Okay",
  4: "Good",
  5: "Excellent",
};
```

**Step 2: Update mood.ts to export face-score mapping helper**

Add to `mobile/constants/mood.ts`:

```typescript
/** Score-to-face-label mapping used by the mood check-in UI */
export const MOOD_FACE_LABELS: Record<number, string> = {
  1: "Terrible",
  2: "Bad",
  3: "Okay",
  4: "Good",
  5: "Excellent",
};
```

**Step 3: Verify types**

Run: `cd /Users/abhishekasawa/Downloads/Claude/Groot/mobile && npx tsc --noEmit`

**Step 4: Commit**

```bash
git add mobile/components/illustrations/mood-faces.tsx mobile/constants/mood.ts
git commit -m "feat(mobile): add SVG mood face illustrations"
```

---

### Task 6: Create Groot Sprout Mascot

**Files:**
- Create: `mobile/components/illustrations/groot-sprout.tsx`

**Step 1: Create SVG sprout with speech bubble**

```typescript
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Path, Ellipse, G, Rect } from "react-native-svg";
import { useTheme } from "../../lib/theme/provider";

interface GrootSproutProps {
  size?: number;
  message?: string;
}

export function GrootSprout({ size = 120, message }: GrootSproutProps) {
  const { colors } = useTheme();
  const scale = size / 120;

  return (
    <View style={styles.container}>
      {message ? (
        <View style={[styles.bubble, { backgroundColor: colors.card, shadowColor: colors.elevatedShadowColor }]}>
          <Text style={[styles.bubbleText, { color: colors.foreground }]}>{message}</Text>
          <View style={[styles.bubbleTail, { borderTopColor: colors.card }]} />
        </View>
      ) : null}
      <Svg width={size} height={size * 1.1} viewBox="0 0 120 132">
        {/* Ground shadow */}
        <Ellipse cx="60" cy="126" rx="30" ry="6" fill={colors.primary} opacity={0.08} />

        {/* Pot / base */}
        <Path
          d="M40 105 L42 120 Q60 128 78 120 L80 105 Z"
          fill={colors.secondary}
        />
        <Path
          d="M38 100 Q38 108 42 108 L78 108 Q82 108 82 100 Z"
          fill={colors.primary}
          opacity={0.2}
        />

        {/* Stem */}
        <Path
          d="M60 100 Q58 80 60 60"
          stroke={colors.primary}
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />

        {/* Left leaf */}
        <Path
          d="M60 78 Q42 68 38 58 Q48 60 60 72"
          fill={colors.primary}
          opacity={0.7}
        />
        {/* Left leaf vein */}
        <Path
          d="M58 76 Q48 68 42 62"
          stroke={colors.primaryForeground}
          strokeWidth="0.8"
          strokeLinecap="round"
          fill="none"
          opacity={0.3}
        />

        {/* Right leaf */}
        <Path
          d="M60 70 Q78 58 84 48 Q74 52 60 65"
          fill={colors.primary}
          opacity={0.85}
        />
        {/* Right leaf vein */}
        <Path
          d="M62 68 Q74 58 80 52"
          stroke={colors.primaryForeground}
          strokeWidth="0.8"
          strokeLinecap="round"
          fill="none"
          opacity={0.3}
        />

        {/* Top leaf / sprout */}
        <Path
          d="M60 60 Q52 40 48 28 Q56 38 60 52 Q64 38 72 28 Q68 40 60 60"
          fill={colors.primary}
        />

        {/* Face — eyes */}
        <Circle cx="52" cy="88" r="2.5" fill={colors.foreground} opacity={0.6} />
        <Circle cx="68" cy="88" r="2.5" fill={colors.foreground} opacity={0.6} />
        {/* Eye highlights */}
        <Circle cx="53" cy="87" r="0.8" fill={colors.card} opacity={0.8} />
        <Circle cx="69" cy="87" r="0.8" fill={colors.card} opacity={0.8} />

        {/* Smile */}
        <Path
          d="M54 94 Q60 98 66 94"
          stroke={colors.foreground}
          strokeWidth="1.5"
          strokeLinecap="round"
          fill="none"
          opacity={0.5}
        />

        {/* Cheek blush */}
        <Circle cx="47" cy="93" r="3" fill={colors.accent} opacity={0.2} />
        <Circle cx="73" cy="93" r="3" fill={colors.accent} opacity={0.2} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 8,
    maxWidth: 240,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  bubbleText: {
    fontFamily: "Manrope_500Medium",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  bubbleTail: {
    position: "absolute",
    bottom: -6,
    left: "50%",
    marginLeft: -6,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
});

/** Returns a time-of-day greeting */
export function getGreeting(displayName?: string): string {
  const hour = new Date().getHours();
  const name = displayName ? `, ${displayName}` : "";

  if (hour < 6) return `Still up${name}? Rest is part of growing.`;
  if (hour < 12) return `Good morning${name}! Let's grow today.`;
  if (hour < 17) return `Good afternoon${name}! How's your day?`;
  if (hour < 21) return `Good evening${name}! Time to reflect.`;
  return `Winding down${name}? You did great today.`;
}
```

**Step 2: Commit**

```bash
git add mobile/components/illustrations/groot-sprout.tsx
git commit -m "feat(mobile): add Groot sprout mascot SVG illustration"
```

---

### Task 7: Redesign Bottom Tab Bar with Center FAB

**Files:**
- Modify: `mobile/components/ui/bottom-tab-bar.tsx`

**Step 1: Rewrite with center FAB and dot indicators**

```typescript
import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Plus } from "lucide-react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

import { useTheme } from "../../lib/theme/provider";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const TAB_ORDER = ["today", "journal", "__fab__", "mood", "insights"];

function getTabLabel(name: string, title?: string) {
  if (title) return title;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function BottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === "ios" ? 8 : 6);

  return (
    <View
      style={[
        styles.shell,
        {
          paddingBottom: bottomInset,
          backgroundColor: colors.card,
          shadowColor: colors.elevatedShadowColor,
        },
      ]}
    >
      <View style={styles.row}>
        {TAB_ORDER.map((tabName) => {
          if (tabName === "__fab__") {
            return (
              <FABButton
                key="fab"
                color={colors.primary}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  // Navigate to journal for now (quick capture can be added later)
                  navigation.navigate("journal");
                }}
              />
            );
          }

          const routeIndex = state.routes.findIndex((r) => r.name === tabName);
          if (routeIndex === -1) return null;

          const route = state.routes[routeIndex]!;
          const descriptor = descriptors[route.key];
          const focused = state.index === routeIndex;
          const label = getTabLabel(route.name, typeof descriptor.options.title === "string" ? descriptor.options.title : undefined);
          const tint = focused ? colors.primary : colors.mutedForeground;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate(route.name);
            }
          };

          const icon = descriptor.options.tabBarIcon?.({
            focused,
            color: tint,
            size: 22,
          }) ?? null;

          return (
            <Pressable key={route.key} onPress={onPress} style={styles.tab}>
              {/* Active dot indicator */}
              <View style={[styles.dot, { backgroundColor: focused ? colors.primary : "transparent" }]} />
              {icon}
              <Text
                style={[
                  styles.label,
                  {
                    color: tint,
                    fontFamily: focused ? "Manrope_600SemiBold" : "Manrope_500Medium",
                  },
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function FABButton({ color, onPress }: { color: string; onPress: () => void }) {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: withSpring(scale.value, { damping: 20, stiffness: 300 }) }],
  }));

  return (
    <View style={styles.fabContainer}>
      <AnimatedPressable
        onPressIn={() => { scale.value = 0.9; }}
        onPressOut={() => { scale.value = 1; }}
        onPress={onPress}
        style={[styles.fab, { backgroundColor: color }, animStyle]}
      >
        <Plus size={26} color="#FFFFFF" strokeWidth={2.5} />
      </AnimatedPressable>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    paddingTop: 8,
    paddingHorizontal: 8,
    // Top shadow instead of border
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-around",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    minHeight: 52,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginBottom: 4,
  },
  label: {
    marginTop: 3,
    fontSize: 11,
    lineHeight: 14,
    includeFontPadding: false,
  },
  fabContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 4,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
    // FAB shadow
    shadowColor: "rgba(74, 124, 89, 0.35)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 6,
  },
});
```

**Step 2: Commit**

```bash
git add mobile/components/ui/bottom-tab-bar.tsx
git commit -m "feat(mobile): redesign tab bar with center FAB and dot indicators"
```

---

### Task 8: Update Tab Layout for 5-Tab Structure

**Files:**
- Modify: `mobile/app/(tabs)/_layout.tsx`
- Modify: `mobile/app/(tabs)/index.tsx`

**Step 1: Rewrite tab layout**

```typescript
import { Tabs } from "expo-router";
import { BookOpen, BarChart3, Heart, Sprout } from "lucide-react-native";

import { BottomTabBar } from "../../components/ui/bottom-tab-bar";

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="today"
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="today"
        options={{
          title: "Today",
          tabBarIcon: ({ color, size, focused }) => (
            <Sprout size={size} color={color} strokeWidth={focused ? 2 : 1.7} />
          ),
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: "Journal",
          tabBarIcon: ({ color, size, focused }) => (
            <BookOpen size={size} color={color} strokeWidth={focused ? 2 : 1.7} />
          ),
        }}
      />
      <Tabs.Screen
        name="mood"
        options={{
          title: "Mood",
          tabBarIcon: ({ color, size, focused }) => (
            <Heart size={size} color={color} strokeWidth={focused ? 2 : 1.7} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: "Insights",
          tabBarIcon: ({ color, size, focused }) => (
            <BarChart3 size={size} color={color} strokeWidth={focused ? 2 : 1.7} />
          ),
        }}
      />
      {/* Hidden routes — accessible via deep links */}
      <Tabs.Screen name="tasks" options={{ href: null }} />
      <Tabs.Screen name="stories" options={{ href: null }} />
      <Tabs.Screen name="topics" options={{ href: null }} />
      <Tabs.Screen name="profile" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="more" options={{ href: null }} />
    </Tabs>
  );
}
```

**Step 2: Update index redirect to Today**

Update `mobile/app/(tabs)/index.tsx`:

```typescript
import { Redirect } from "expo-router";

export default function TabsIndexRedirect() {
  return <Redirect href="/(tabs)/today" />;
}
```

**Step 3: Commit**

```bash
git add mobile/app/(tabs)/_layout.tsx mobile/app/(tabs)/index.tsx
git commit -m "feat(mobile): switch to 5-tab layout with Today as home"
```

---

### Task 9: Create Today Dashboard Screen

**Files:**
- Create: `mobile/app/(tabs)/today.tsx`

**Step 1: Build the Today dashboard**

This is the largest new file. It combines: header with settings/profile links, Groot mascot with greeting, mood check-in row, today's tasks, quick stats, recent journal entries.

```typescript
import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Settings,
  User,
  BookOpen,
  CheckSquare,
  TrendingUp,
  ChevronRight,
  Square,
} from "lucide-react-native";

import { useTheme } from "../../lib/theme/provider";
import { useHome, useMemories, useTasks } from "../../lib/api/queries";
import { useToggleTask } from "../../lib/api/mutations";
import { getMoodColor, getMoodColorFromName } from "../../constants/mood";
import { typography } from "../../constants/typography";
import { GlassCard } from "../../components/ui/glass-card";
import { GradientBackground } from "../../components/ui/gradient-background";
import { PressScale } from "../../components/ui/press-scale";
import { SectionHeader } from "../../components/ui/section-header";
import { PillBadge } from "../../components/ui/pill-badge";
import { GrootSprout, getGreeting } from "../../components/illustrations/groot-sprout";
import { MoodFace, MOOD_FACE_LABELS } from "../../components/illustrations/mood-faces";
import type { Task } from "../../../shared/types/api";

export default function TodayScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const { data: homeData, refetch: refetchHome } = useHome();
  const { data: memoriesData, refetch: refetchMemories } = useMemories({ limit: 3 });
  const { data: tasksData, refetch: refetchTasks } = useTasks();
  const toggleTask = useToggleTask();
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setIsPullRefreshing(true);
    Promise.all([refetchHome(), refetchMemories(), refetchTasks()])
      .catch(() => {})
      .finally(() => setIsPullRefreshing(false));
  }, [refetchHome, refetchMemories, refetchTasks]);

  const greeting = getGreeting(homeData?.displayName);

  const pendingTasks = useMemo(() => {
    return (tasksData?.tasks ?? []).filter((t) => !t.is_completed).slice(0, 3);
  }, [tasksData?.tasks]);

  const recentMemories = useMemo(() => {
    return (memoriesData?.memories ?? []).slice(0, 2);
  }, [memoriesData?.memories]);

  const moodColor = homeData?.recentMood
    ? getMoodColorFromName(homeData.recentMood, colors)
    : undefined;

  const stats = useMemo(() => {
    const allTasks = tasksData?.tasks ?? [];
    const openTasks = allTasks.filter((t) => !t.is_completed).length;
    return {
      entries: homeData?.memoriesCount ?? 0,
      openTasks,
      mood: homeData?.recentMood ?? "—",
    };
  }, [homeData, tasksData]);

  const handleToggle = useCallback(
    (task: Task) => {
      toggleTask.mutate({ taskId: task.id, is_completed: !task.is_completed });
    },
    [toggleTask],
  );

  return (
    <SafeAreaView style={styles.safe}>
      <GradientBackground>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isPullRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.brandTitle, { color: colors.foreground }]}>The Garden</Text>
              <Text style={[styles.brandSubtitle, { color: colors.mutedForeground }]}>
                Your daily companion
              </Text>
            </View>
            <View style={styles.headerIcons}>
              <PressScale onPress={() => router.push("/profile" as never)} haptic={false}>
                <View style={[styles.headerIcon, { backgroundColor: colors.secondary }]}>
                  <User size={18} color={colors.primary} strokeWidth={1.7} />
                </View>
              </PressScale>
              <PressScale onPress={() => router.push("/settings" as never)} haptic={false}>
                <View style={[styles.headerIcon, { backgroundColor: colors.secondary }]}>
                  <Settings size={18} color={colors.mutedForeground} strokeWidth={1.7} />
                </View>
              </PressScale>
            </View>
          </View>

          {/* Groot Mascot */}
          <View style={styles.mascotWrap}>
            <GrootSprout size={110} message={greeting} />
          </View>

          {/* Mood Check-in */}
          <GlassCard padding={20} style={styles.section}>
            <Text style={[styles.moodTitle, { color: colors.foreground }]}>How are you today?</Text>
            <View style={styles.moodRow}>
              {[1, 2, 3, 4, 5].map((score) => (
                <PressScale key={score} scale={0.9}>
                  <View style={styles.moodItem}>
                    <MoodFace score={score} size={44} color={getMoodColor(score, colors)} />
                    <Text style={[styles.moodLabel, { color: colors.mutedForeground }]}>
                      {MOOD_FACE_LABELS[score]}
                    </Text>
                  </View>
                </PressScale>
              ))}
            </View>
          </GlassCard>

          {/* Today's Tasks */}
          <View style={styles.section}>
            <SectionHeader
              title="Today's Tasks"
              action="View all"
              onAction={() => router.push("/tasks" as never)}
            />
            {pendingTasks.length === 0 ? (
              <GlassCard padding={16}>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  No pending tasks. Ask Groot to create some!
                </Text>
              </GlassCard>
            ) : (
              pendingTasks.map((task) => (
                <PressScale key={task.id} onPress={() => handleToggle(task)} style={styles.taskGap}>
                  <GlassCard padding={14}>
                    <View style={styles.taskRow}>
                      <Square size={20} color={colors.mutedForeground} strokeWidth={1.6} />
                      <View style={styles.taskCopy}>
                        <Text style={[styles.taskTitle, { color: colors.foreground }]} numberOfLines={2}>
                          {task.content}
                        </Text>
                        {task.category ? (
                          <PillBadge label={task.category} small />
                        ) : null}
                      </View>
                    </View>
                  </GlassCard>
                </PressScale>
              ))
            )}
          </View>

          {/* Quick Stats */}
          <View style={styles.section}>
            <SectionHeader title="Quick Stats" />
            <View style={styles.statsRow}>
              <GlassCard padding={16} style={styles.statCard}>
                <BookOpen size={18} color={colors.primary} strokeWidth={1.6} />
                <Text style={[styles.statValue, { color: colors.foreground }]}>{stats.entries}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Entries</Text>
              </GlassCard>
              <GlassCard padding={16} style={styles.statCard}>
                <CheckSquare size={18} color={colors.accent} strokeWidth={1.6} />
                <Text style={[styles.statValue, { color: colors.foreground }]}>{stats.openTasks}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Open Tasks</Text>
              </GlassCard>
              <GlassCard padding={16} style={styles.statCard} accentColor={moodColor}>
                <TrendingUp size={18} color={moodColor ?? colors.mutedForeground} strokeWidth={1.6} />
                <Text style={[styles.statValue, { color: colors.foreground }]}>{stats.mood}</Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>Mood</Text>
              </GlassCard>
            </View>
          </View>

          {/* Recent Journal */}
          {recentMemories.length > 0 ? (
            <View style={styles.section}>
              <SectionHeader
                title="Recent Journal"
                action="See all"
                onAction={() => router.push("/(tabs)/journal" as never)}
              />
              {recentMemories.map((memory) => (
                <GlassCard key={memory.id} padding={14} style={styles.journalGap}>
                  <Text style={[styles.journalTime, { color: colors.mutedForeground }]}>
                    {new Date(memory.created_at).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </Text>
                  <Text style={[styles.journalText, { color: colors.foreground }]} numberOfLines={2}>
                    {memory.content || memory.media_description || "Voice/Photo entry"}
                  </Text>
                </GlassCard>
              ))}
            </View>
          ) : null}

          <View style={styles.bottomGap} />
        </ScrollView>
      </GradientBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  // Header
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  brandTitle: {
    fontFamily: "Sora_700Bold",
    ...typography.xl,
  },
  brandSubtitle: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    marginTop: 2,
  },
  headerIcons: {
    flexDirection: "row",
    gap: 8,
  },
  headerIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  // Mascot
  mascotWrap: {
    alignItems: "center",
    marginVertical: 12,
  },
  // Mood
  moodTitle: {
    fontFamily: "Sora_600SemiBold",
    ...typography.lg,
    marginBottom: 16,
    textAlign: "center",
  },
  moodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  moodItem: {
    alignItems: "center",
    gap: 6,
  },
  moodLabel: {
    fontFamily: "Manrope_500Medium",
    fontSize: 10,
    lineHeight: 13,
  },
  // Section spacing
  section: {
    marginTop: 20,
  },
  // Tasks
  taskGap: {
    marginBottom: 8,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  taskCopy: {
    flex: 1,
    gap: 6,
  },
  taskTitle: {
    fontFamily: "Manrope_500Medium",
    ...typography.sm,
    lineHeight: 22,
  },
  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontFamily: "Sora_700Bold",
    ...typography.lg,
    marginTop: 4,
  },
  statLabel: {
    fontFamily: "Manrope_400Regular",
    ...typography.xs,
  },
  // Journal
  journalGap: {
    marginBottom: 8,
  },
  journalTime: {
    fontFamily: "Manrope_500Medium",
    ...typography.xs,
    marginBottom: 6,
  },
  journalText: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    lineHeight: 22,
  },
  // Empty
  emptyText: {
    fontFamily: "Manrope_400Regular",
    ...typography.sm,
    textAlign: "center",
    lineHeight: 22,
  },
  bottomGap: {
    height: 90,
  },
});
```

**Step 2: Verify types**

Run: `cd /Users/abhishekasawa/Downloads/Claude/Groot/mobile && npx tsc --noEmit`

**Step 3: Commit**

```bash
git add mobile/app/(tabs)/today.tsx
git commit -m "feat(mobile): add Today dashboard with mascot, mood faces, tasks, stats"
```

---

### Task 10: Refresh Journal Screen

**Files:**
- Modify: `mobile/app/(tabs)/journal.tsx`

**Step 1: Visual refresh**

Key changes (not a full rewrite, targeted edits):
- Remove `TabSwipeView` wrapper (no longer swiping between 4 tabs)
- Update header to match warm style (remove `headerMetaRow` with PillBadges — simpler)
- Calendar cells: use mood face colors for dots
- Adjust filter/view toggle styling for new pill style

In the `styles` object:
- Remove `headerMetaRow` section
- Update `filtersRow` gap to 10

In the component JSX:
- Remove the `headerMetaRow` view (the pill badges showing "Timeline View" etc — unnecessary clutter)
- Remove `TabSwipeView` import and wrapper

**Step 2: Commit**

```bash
git add mobile/app/(tabs)/journal.tsx
git commit -m "feat(mobile): refresh journal screen with warm visual style"
```

---

### Task 11: Refresh Mood Screen with Faces

**Files:**
- Modify: `mobile/app/(tabs)/mood.tsx`

**Step 1: Add mood face imports and update hero section**

Add import:
```typescript
import { MoodFace } from "../../components/illustrations/mood-faces";
```

In the hero section, replace the colored dot with a `MoodFace`:
- Replace `heroDot` View with `<MoodFace score={...} size={32} color={moodAccentColor} />`
- In the distribution section, replace `distDot` Views with `<MoodFace score={item.score} size={20} color={getMoodColor(item.score, colors)} />`
- In the legend, replace `legendDot` Views with `<MoodFace score={score} size={16} color={getMoodColor(score, colors)} />`

**Step 2: Commit**

```bash
git add mobile/app/(tabs)/mood.tsx
git commit -m "feat(mobile): add mood faces to mood screen hero, distribution, legend"
```

---

### Task 12: Refresh Tasks Screen

**Files:**
- Modify: `mobile/app/tasks.tsx`

**Step 1: Visual refresh**

Key changes:
- Remove `TabSwipeView` import and wrapper
- Colors will auto-update from token changes
- Update the overdue accent to use new `destructive` (softer dusty rose)
- No structural changes needed — the warm cards + new colors handle the visual update

**Step 2: Commit**

```bash
git add mobile/app/tasks.tsx
git commit -m "feat(mobile): refresh tasks screen for warm visual style"
```

---

### Task 13: Refresh Insights Screen

**Files:**
- Modify: `mobile/app/insights.tsx`

**Step 1: Visual refresh**

Key changes:
- Remove `TabSwipeView` import and wrapper
- Colors auto-update from tokens
- No structural changes needed

**Step 2: Commit**

```bash
git add mobile/app/insights.tsx
git commit -m "feat(mobile): refresh insights screen for warm visual style"
```

---

### Task 14: Clean Up More Screen & Remove TabSwipeView References

**Files:**
- Modify: `mobile/app/(tabs)/more.tsx` — keep file but simplify (it's still a hidden route)
- Modify: `mobile/app/(tabs)/journal.tsx` — remove TabSwipeView if not done in Task 10
- Modify: `mobile/app/tasks.tsx` — remove TabSwipeView if not done in Task 12
- Modify: `mobile/app/insights.tsx` — remove TabSwipeView if not done in Task 13

**Step 1: Remove all `TabSwipeView` wrapper usage from screens**

In each screen that uses `TabSwipeView`:
- Remove the import
- Remove the `<TabSwipeView currentTab="...">` wrapper and its closing tag
- Keep the `GradientBackground` wrapper

**Step 2: Simplify more.tsx**

The More screen is no longer a primary tab. Simplify it to a basic menu (it's accessible via deep link but won't be visible in the tab bar):

Remove `TabSwipeView` wrapper. Keep the rest as-is since it's a fallback/hidden route.

**Step 3: Commit**

```bash
git add mobile/app/(tabs)/more.tsx mobile/app/(tabs)/journal.tsx mobile/app/tasks.tsx mobile/app/insights.tsx
git commit -m "feat(mobile): remove TabSwipeView wrappers, clean up More screen"
```

---

### Task 15: Final Verification & Polish

**Step 1: Type check**

Run: `cd /Users/abhishekasawa/Downloads/Claude/Groot/mobile && npx tsc --noEmit`
Expected: No errors

**Step 2: Lint**

Run: `cd /Users/abhishekasawa/Downloads/Claude/Groot && npm run lint`
Expected: No errors (or only pre-existing ones)

**Step 3: Visual check list**

Verify in the running app:
- Today screen loads as the home tab
- Groot mascot appears with time-appropriate greeting
- 5 mood faces render correctly in the mood check-in card
- Center FAB appears raised between Mood and Insights tabs
- All cards use warm white style with soft shadows (no glass borders)
- Color palette is warm sage-green/cream throughout
- Journal, Tasks, Insights screens render with updated colors
- Dark mode still works with forest-toned palette
- Navigation between all tabs works
- Deep screens (Settings, Profile, Topics) still accessible

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(mobile): complete visual redesign to warm garden theme"
```
