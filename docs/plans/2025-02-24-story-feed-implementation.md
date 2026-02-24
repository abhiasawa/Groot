# Story Feed Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign the Groot mobile app from a 12-screen dashboard into a 3-tab story feed (Today | Timeline | You).

**Architecture:** Replace glassmorphic GlassCard system with opaque Sheet components. Merge Journal/Stories/Mood into a single Timeline tab with swipeable sub-views via react-native-pager-view. Consolidate Profile/People/Habits/Tasks into a unified You tab. Kill the More menu and 7 standalone stack screens.

**Tech Stack:** React Native + Expo Router, react-native-pager-view (new), @gorhom/bottom-sheet (new), react-native-reanimated, @tanstack/react-query (existing).

**Design Doc:** `docs/plans/2025-02-24-story-feed-redesign.md`

---

## Task 1: Install New Dependencies

**Files:**
- Modify: `mobile/package.json`

**Step 1: Install react-native-pager-view and @gorhom/bottom-sheet**

```bash
cd mobile && npx expo install react-native-pager-view @gorhom/bottom-sheet react-native-gesture-handler
```

Note: react-native-gesture-handler is a peer dep of @gorhom/bottom-sheet. Expo install picks compatible versions.

**Step 2: Verify install succeeded**

```bash
cd mobile && npx expo export --platform android 2>&1 | tail -5
```

Expected: export succeeds without errors.

**Step 3: Commit**

```bash
git add mobile/package.json mobile/package-lock.json
git commit -m "deps: add pager-view, bottom-sheet, gesture-handler"
```

---

## Task 2: Create Foundation Components (Sheet, SectionLabel, Tag, Avatar)

**Files:**
- Create: `mobile/components/ui/sheet.tsx`
- Create: `mobile/components/ui/section-label.tsx`
- Create: `mobile/components/ui/tag.tsx`
- Create: `mobile/components/ui/avatar.tsx`
- Create: `mobile/components/ui/bottom-sheet-modal.tsx`

### Step 1: Create Sheet (replaces GlassCard)

Create `mobile/components/ui/sheet.tsx`:

```tsx
import React from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";
import { useTheme } from "../../lib/theme/provider";

interface SheetProps {
  children: React.ReactNode;
  style?: ViewStyle;
  padding?: number;
  /** Optional mood-colored top stripe (2px) */
  accentColor?: string;
}

export function Sheet({
  children,
  style,
  padding = 16,
  accentColor,
}: SheetProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {accentColor && (
        <View style={[styles.accent, { backgroundColor: accentColor }]} />
      )}
      <View style={{ padding }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  accent: {
    height: 2,
    width: "100%",
  },
});
```

### Step 2: Create SectionLabel (replaces SectionHeader)

Create `mobile/components/ui/section-label.tsx`:

```tsx
import React from "react";
import { Text, StyleSheet } from "react-native";
import { useTheme } from "../../lib/theme/provider";

interface SectionLabelProps {
  children: string;
}

export function SectionLabel({ children }: SectionLabelProps) {
  const { colors } = useTheme();

  return (
    <Text style={[styles.label, { color: colors.mutedForeground }]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    letterSpacing: 0,
    marginBottom: 12,
    paddingHorizontal: 2,
  },
});
```

### Step 3: Create Tag (replaces PillBadge)

Create `mobile/components/ui/tag.tsx`:

```tsx
import React from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { useTheme } from "../../lib/theme/provider";

interface TagProps {
  label: string;
  color?: string;
  textColor?: string;
  style?: ViewStyle;
}

export function Tag({ label, color, textColor, style }: TagProps) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.tag,
        { backgroundColor: color ?? colors.muted },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
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
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  text: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
});
```

### Step 4: Create Avatar

Create `mobile/components/ui/avatar.tsx`:

```tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../lib/theme/provider";

interface AvatarProps {
  name: string;
  size?: number;
  color?: string;
}

export function Avatar({ name, size = 44, color }: AvatarProps) {
  const { colors } = useTheme();
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const bg = color ?? colors.primary;

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg + "18",
        },
      ]}
    >
      <Text
        style={[
          styles.initials,
          {
            color: bg,
            fontSize: size * 0.36,
          },
        ]}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontFamily: "Inter_600SemiBold",
  },
});
```

### Step 5: Create BottomSheetModal wrapper

Create `mobile/components/ui/bottom-sheet-modal.tsx`:

```tsx
import React, { useCallback, useMemo, forwardRef } from "react";
import { View, StyleSheet } from "react-native";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useTheme } from "../../lib/theme/provider";

interface BSModalProps {
  children: React.ReactNode;
  onClose: () => void;
}

export const BSModal = forwardRef<BottomSheet, BSModalProps>(
  ({ children, onClose }, ref) => {
    const { colors } = useTheme();
    const snapPoints = useMemo(() => ["60%", "90%"], []);

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
          opacity={0.4}
        />
      ),
      [],
    );

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        onClose={onClose}
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: colors.card,
          borderRadius: 20,
        }}
        handleIndicatorStyle={{
          backgroundColor: colors.mutedForeground,
          width: 32,
          height: 4,
        }}
      >
        <BottomSheetScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </BottomSheetScrollView>
      </BottomSheet>
    );
  },
);

BSModal.displayName = "BSModal";

const styles = StyleSheet.create({
  content: {
    padding: 20,
    paddingBottom: 40,
  },
});
```

### Step 6: Commit foundation components

```bash
git add mobile/components/ui/sheet.tsx mobile/components/ui/section-label.tsx mobile/components/ui/tag.tsx mobile/components/ui/avatar.tsx mobile/components/ui/bottom-sheet-modal.tsx
git commit -m "feat: add Sheet, SectionLabel, Tag, Avatar, BSModal components"
```

---

## Task 3: Update Theme Tokens

**Files:**
- Modify: `mobile/lib/theme/tokens.ts`

### Step 1: Add surface/tint tokens, keep glass/gradient for now (gradual migration)

In `tokens.ts`, add to ThemeColors interface after `elevatedShadowColor`:
```typescript
  // Surface (replaces glass)
  surface: string;
  surfaceElevated: string;
  subtle: string;
  tint: string;
```

Add to `lightTheme`:
```typescript
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",
  subtle: "rgba(55, 53, 47, 0.09)",
  tint: "rgba(35, 131, 226, 0.05)",
```

Add to `darkTheme`:
```typescript
  surface: "#202020",
  surfaceElevated: "#202020",
  subtle: "rgba(255, 255, 255, 0.094)",
  tint: "rgba(82, 156, 202, 0.05)",
```

### Step 2: Commit

```bash
git add mobile/lib/theme/tokens.ts
git commit -m "tokens: add surface, surfaceElevated, subtle, tint semantic colors"
```

---

## Task 4: Reconfigure Tab Layout (3 Tabs)

**Files:**
- Rewrite: `mobile/app/(tabs)/_layout.tsx`
- Create: `mobile/app/(tabs)/timeline.tsx` (placeholder)
- Create: `mobile/app/(tabs)/you.tsx` (placeholder)
- Modify: `mobile/app/_layout.tsx` (remove old stack screens)

### Step 1: Rewrite _layout.tsx for 3 tabs

Replace `mobile/app/(tabs)/_layout.tsx` with:

```tsx
import { Tabs } from "expo-router";
import { Sun, BookOpen, User } from "lucide-react-native";
import { useTheme } from "../../lib/theme/provider";

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          elevation: 0,
          height: 56,
          paddingBottom: 6,
        },
        tabBarLabelStyle: {
          fontFamily: "Inter_500Medium",
          fontSize: 10,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarIcon: ({ color, size }) => (
            <Sun size={size} color={color} strokeWidth={1.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="timeline"
        options={{
          title: "Timeline",
          tabBarIcon: ({ color, size }) => (
            <BookOpen size={size} color={color} strokeWidth={1.5} />
          ),
        }}
      />
      <Tabs.Screen
        name="you"
        options={{
          title: "You",
          tabBarIcon: ({ color, size }) => (
            <User size={size} color={color} strokeWidth={1.5} />
          ),
        }}
      />
      {/* Hidden — old screens kept temporarily for file compatibility */}
      <Tabs.Screen name="journal" options={{ href: null }} />
      <Tabs.Screen name="stories" options={{ href: null }} />
      <Tabs.Screen name="mood" options={{ href: null }} />
      <Tabs.Screen name="more" options={{ href: null }} />
    </Tabs>
  );
}
```

### Step 2: Create placeholder timeline.tsx

Create `mobile/app/(tabs)/timeline.tsx`:

```tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../lib/theme/provider";

export default function TimelineScreen() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.center}>
        <Text style={[styles.text, { color: colors.foreground }]}>Timeline — coming soon</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontFamily: "Inter_500Medium", fontSize: 16 },
});
```

### Step 3: Create placeholder you.tsx

Create `mobile/app/(tabs)/you.tsx`:

```tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "../../lib/theme/provider";

export default function YouScreen() {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.center}>
        <Text style={[styles.text, { color: colors.foreground }]}>You — coming soon</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  text: { fontFamily: "Inter_500Medium", fontSize: 16 },
});
```

### Step 4: Simplify root _layout.tsx — remove old stack screens

In `mobile/app/_layout.tsx`, replace the Stack children with:

```tsx
<Stack screenOptions={{ headerShown: false }}>
  <Stack.Screen name="(auth)" />
  <Stack.Screen name="(tabs)" />
  <Stack.Screen name="settings" />
</Stack>
```

Remove the lines for habits, tasks, insights, topics, people, profile.

### Step 5: Verify build

```bash
cd mobile && npx expo export --platform android 2>&1 | tail -5
```

### Step 6: Commit

```bash
git add "mobile/app/(tabs)/_layout.tsx" "mobile/app/(tabs)/timeline.tsx" "mobile/app/(tabs)/you.tsx" mobile/app/_layout.tsx
git commit -m "nav: reconfigure to 3-tab layout (Today, Timeline, You)"
```

---

## Task 5: Rewrite Today Tab (index.tsx)

**Files:**
- Rewrite: `mobile/app/(tabs)/index.tsx`

Build the Today screen per design spec: greeting → mood inline → compact stat row → flashback → tasks → habits.

Uses: Sheet, SectionLabel, PressScale, useHome, useTasks, useHabits queries.

Key changes from current:
- Remove GradientBackground (use flat background)
- Remove GlassCard (use Sheet)
- Remove AnimatedStat (show static numbers)
- Remove stagger animations (instant render)
- Mood woven into greeting text
- Stats as one compact row (not 2×2 grid)
- Tasks and habits are live actionable cards

### Step 1: Rewrite the full file

See design spec section 4.1 for wireframe. The file should be ~350 lines. Use Sheet for cards, SectionLabel for labels, flat `background` color, no FadeInDown animations.

### Step 2: Verify build

```bash
cd mobile && npx expo export --platform android 2>&1 | tail -5
```

### Step 3: Commit

```bash
git add "mobile/app/(tabs)/index.tsx"
git commit -m "feat: rewrite Today tab — greeting, stats row, flashback, tasks, habits"
```

---

## Task 6: Build Timeline Tab with Swipeable Sub-Views

**Files:**
- Rewrite: `mobile/app/(tabs)/timeline.tsx`

This is the most complex screen. Three swipeable sub-views:
1. **All** — unified chronological feed (existing journal logic)
2. **Stories** — storyworthy moments only (existing stories logic)
3. **Mood** — mood visualization (existing mood logic)

Uses: react-native-pager-view for swipe, existing useMemories/useStories/useMood hooks.

Key architecture:
```
timeline.tsx
├── Header (title + search icon)
├── Tab indicator (All · Stories · Mood)
└── PagerView
    ├── Page 0: AllFeed (FlatList of memories)
    ├── Page 1: StoriesFeed (FlatList of stories)
    └── Page 2: MoodView (ScrollView with year grid + distribution)
```

### Step 1: Write timeline.tsx

~500 lines. Contains:
- Header with search icon → expands to search bar
- Animated tab indicator that follows swipe position
- PagerView with 3 pages
- AllFeed: reuses journal pagination logic, Sheet cards, MediaPlayer
- StoriesFeed: bigger cards for stories, mood accent stripe
- MoodView: mood hero, year-in-pixels grid, distribution bars
- Bottom sheet for entry detail on tap

### Step 2: Verify build and test swipe

```bash
cd mobile && npx expo export --platform android 2>&1 | tail -5
```

### Step 3: Commit

```bash
git add "mobile/app/(tabs)/timeline.tsx"
git commit -m "feat: build Timeline tab with swipeable All/Stories/Mood views"
```

---

## Task 7: Build You Tab (Unified Profile)

**Files:**
- Rewrite: `mobile/app/(tabs)/you.tsx`

Single scrollable page with: avatar + name → profile facts → people horizontal scroll → habits summary → tasks list → gear icon.

Uses: useProfile, usePeople, useHabits, useTasks, useCurrentUser hooks. Avatar, Sheet, SectionLabel components.

### Step 1: Write you.tsx

~400 lines. Contains:
- Header with gear icon → pushes settings
- Avatar + display name + join date
- Profile facts in a Sheet (emoji prefixed, max 5 shown, "See all" expander)
- People as horizontal ScrollView of Avatar circles
- Habits as compact list (name + streak)
- Tasks as checklist (tap to toggle, uses useMutation)
- Empty states for each section

### Step 2: Verify build

```bash
cd mobile && npx expo export --platform android 2>&1 | tail -5
```

### Step 3: Commit

```bash
git add "mobile/app/(tabs)/you.tsx"
git commit -m "feat: build You tab — profile, people, habits, tasks unified"
```

---

## Task 8: Refresh Settings and Login Screens

**Files:**
- Modify: `mobile/app/settings.tsx` — replace GlassCard with Sheet, remove GradientBackground
- Modify: `mobile/app/(auth)/login.tsx` — replace GlassCard with Sheet, remove GradientBackground

### Step 1: Update settings.tsx

Replace GlassCard imports with Sheet. Remove GradientBackground. Use flat `background` color.

### Step 2: Update login.tsx

Replace GlassCard with Sheet. Remove gradient. Keep animations (acceptable on login).

### Step 3: Commit

```bash
git add mobile/app/settings.tsx "mobile/app/(auth)/login.tsx"
git commit -m "ui: refresh Settings and Login with Sheet component"
```

---

## Task 9: Delete Old Files & Clean Up

**Files to delete:**
- `mobile/app/(tabs)/more.tsx`
- `mobile/app/habits.tsx`
- `mobile/app/tasks.tsx`
- `mobile/app/insights.tsx`
- `mobile/app/topics.tsx`
- `mobile/app/people.tsx`
- `mobile/app/profile.tsx`
- `mobile/components/ui/glass-card.tsx`
- `mobile/components/ui/gradient-background.tsx`
- `mobile/components/ui/animated-stat.tsx`
- `mobile/components/ui/pill-badge.tsx`
- `mobile/components/ui/section-header.tsx`

**Files to clean up:**
- Remove hidden tab entries from `_layout.tsx` (journal, stories, mood, more) once they're fully replaced

### Step 1: Delete deprecated files

```bash
git rm "mobile/app/(tabs)/more.tsx" mobile/app/habits.tsx mobile/app/tasks.tsx mobile/app/insights.tsx mobile/app/topics.tsx mobile/app/people.tsx mobile/app/profile.tsx
git rm mobile/components/ui/glass-card.tsx mobile/components/ui/gradient-background.tsx mobile/components/ui/animated-stat.tsx mobile/components/ui/pill-badge.tsx mobile/components/ui/section-header.tsx
```

### Step 2: Remove hidden tab entries from _layout.tsx

Remove the `<Tabs.Screen name="journal" options={{ href: null }} />` etc. lines.

### Step 3: Delete old tab files (journal.tsx, stories.tsx, mood.tsx)

```bash
git rm "mobile/app/(tabs)/journal.tsx" "mobile/app/(tabs)/stories.tsx" "mobile/app/(tabs)/mood.tsx"
```

### Step 4: Verify build

```bash
cd mobile && npx expo export --platform android 2>&1 | tail -5
```

### Step 5: Commit

```bash
git add -A && git commit -m "cleanup: delete 15 deprecated screens and components"
```

---

## Task 10: Build APK & Deploy

### Step 1: Export and build APK

```bash
cd mobile && npx expo export --platform android
cd android && ANDROID_HOME="/Users/abhishekasawa/Library/Android/sdk" JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" ./gradlew assembleRelease
```

### Step 2: Install on device

```bash
/Users/abhishekasawa/Library/Android/sdk/platform-tools/adb install -r mobile/android/app/build/outputs/apk/release/app-release.apk
```

### Step 3: Push to remote

```bash
git push origin main
```

### Step 4: Deploy backend (if any server changes)

```bash
npx vercel --prod --yes
```

---

## Execution Order Summary

| Task | Description | Est. Time |
|------|-------------|-----------|
| 1 | Install dependencies | 2 min |
| 2 | Foundation components (Sheet, Tag, etc.) | 10 min |
| 3 | Update theme tokens | 3 min |
| 4 | Reconfigure tab layout | 5 min |
| 5 | Rewrite Today tab | 15 min |
| 6 | Build Timeline tab (largest) | 25 min |
| 7 | Build You tab | 15 min |
| 8 | Refresh Settings + Login | 5 min |
| 9 | Delete old files & cleanup | 5 min |
| 10 | Build APK & deploy | 5 min |
| **Total** | | **~90 min** |
