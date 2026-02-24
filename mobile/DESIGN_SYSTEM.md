# The Garden -- Design System v2

**A complete visual redesign for Groot's mobile companion.**
**Author: Design Lead** | **Date: February 2025** | **Status: Production Spec**

---

## 1. Design Philosophy

The current app is a competent glassmorphic dashboard. It is clean, but it is also generic -- it could be any data app with blur cards and gradient backgrounds. The redesign must answer: *what does it feel like to hold your own mind in your hands?*

### Five Principles

**1. Ink on Paper, Not Glass on Void**
Replace glassmorphism with a paper-inspired material language. Cards should feel like pages torn from a personal notebook -- warm, tactile, with subtle texture. The current blur-and-border aesthetic is cold and institutional. Paper is human.

**2. Typography Is the Interface**
Stop hiding behind icons and cards. Let words do the work. Oversized, expressive type for emotional moments (greetings, stories, moods). Tight, monospaced numerals for data. The typographic contrast between "how you feel" and "what the numbers say" creates the visual rhythm of the entire app.

**3. Earned Density**
The current 2x2 stats grid treats everything as equally important. It is not. The home screen should be 90% greeting and mood, with stats tucked away. Journal entries should breathe. Density is earned through use -- power users can dig into data screens, but the surface layer is calm and spacious.

**4. Color as Emotion, Not Decoration**
The current mood colors are functional dots. In v2, mood *is* the palette. When you are feeling great, the entire screen subtly warms. When you are low, it cools. Color is not applied to elements -- it radiates from your emotional state outward.

**5. Stillness, Then Motion**
The current app enters with staggered FadeInDown on every card. That is performative. The new language: screens arrive still and composed. Motion happens only on interaction (press, swipe, expand) and is fast, physical, spring-driven. The app should feel confident, not anxious to impress.

---

## 2. Color System

### Dark Mode (Primary -- Most Users)

```
Background
  canvas:              #0C0C0E          Pure dark, warm-black (not blue-black)
  surface:             #161618          Card/sheet background
  surfaceRaised:       #1C1C1F          Elevated elements (modals, popovers)
  surfaceOverlay:      rgba(0,0,0,0.6)  Modal backdrop

Text
  primary:             #EDEDEF          High-contrast body text
  secondary:           #8E8E93          Captions, metadata, timestamps
  tertiary:            #48484A          Disabled, placeholder
  inverse:             #0C0C0E          Text on bright surfaces

Accent
  brand:               #7C6AEF          Main accent -- a warm violet (not cold blue)
  brandMuted:          rgba(124,106,239,0.12)  Tinted backgrounds
  brandForeground:     #FFFFFF

Borders
  subtle:              rgba(255,255,255,0.06)   Card borders, dividers
  medium:              rgba(255,255,255,0.10)   Active borders, inputs
  strong:              rgba(255,255,255,0.18)   Focus rings

Interactive
  destructive:         #E5484D
  success:             #30A46C
  warning:             #F5A623
```

### Mood-Reactive Palette

These colors replace the current `moodGreat/moodGood/moodOkay/moodLow/moodBad` system. Each mood level also defines a *tint* -- a very low-opacity version used to wash the screen background.

```
Mood                   Dot Color     Tint (applied to canvas)
great (5):             #30A46C       rgba(48,164,108,0.04)
good (4):              #3E63DD       rgba(62,99,221,0.04)
okay (3):              #F5A623       rgba(245,166,35,0.03)
low (2):               #E54D2E       rgba(229,77,46,0.03)
bad (1):               #E5484D       rgba(229,72,77,0.03)
none:                  #2C2C2E       none
```

### Chart/Data Colors

```
chart1:                #7C6AEF       Violet (memories)
chart2:                #30A46C       Green (habits/streaks)
chart3:                #3E63DD       Blue (tasks)
chart4:                #E54D2E       Orange-red (reminders)
chart5:                #F5A623       Amber (stories)
```

### Light Mode

```
Background
  canvas:              #FAFAF9          Warm off-white (not pure white)
  surface:             #FFFFFF          Card background
  surfaceRaised:       #FFFFFF          Elevated elements
  surfaceOverlay:      rgba(0,0,0,0.3)  Modal backdrop

Text
  primary:             #1C1C1E
  secondary:           #6E6E73
  tertiary:            #AEAEB2
  inverse:             #FFFFFF

Accent
  brand:               #6E56CF          Deeper violet for light backgrounds
  brandMuted:          rgba(110,86,207,0.08)
  brandForeground:     #FFFFFF

Borders
  subtle:              rgba(0,0,0,0.06)
  medium:              rgba(0,0,0,0.10)
  strong:              rgba(0,0,0,0.18)
```

### What Changes from Current

- Kill the orange accent (`#D9730D` / `#FFA344`). The new brand color is warm violet, which feels more introspective and creative than a productivity-orange.
- Kill the three-stop diagonal gradient background (`gradientStart/gradientMid/gradientEnd`). Replace with a single flat canvas color that shifts subtly based on mood. One color, not three.
- Kill `glassSurface`/`glassBorder`/`glassHighlight`. Replace with opaque `surface` + `subtle` border. Glassmorphism is retired.

---

## 3. Typography

### Font Stack

Keep **Inter** as the base. It is excellent and already loaded. Add **JetBrains Mono** (available via `@expo-google-fonts/jetbrains-mono`) for numerical data -- streaks, counts, scores. The contrast between Inter (humanist) and JetBrains Mono (technical) reinforces the "journal meets dashboard" identity.

### Type Scale

```
displayLarge:     Inter 700    36px / 40px    -0.8 tracking    Page hero ("Good evening,")
displayMedium:    Inter 700    28px / 34px    -0.5 tracking    Screen titles
headline:         Inter 600    22px / 28px    -0.3 tracking    Section headers, story titles
title:            Inter 600    18px / 24px    -0.2 tracking    Card titles, names
body:             Inter 400    16px / 24px     0.0 tracking    Primary content
bodyMedium:       Inter 500    16px / 24px     0.0 tracking    Emphasized body
caption:          Inter 500    13px / 18px     0.0 tracking    Metadata, timestamps
small:            Inter 400    12px / 16px     0.1 tracking    Badges, footnotes
micro:            Inter 600    10px / 14px     0.8 tracking    Uppercase labels

mono:             JBMono 700   28px / 34px    -1.0 tracking    Large stat numbers
monoSmall:        JBMono 500   16px / 22px    -0.3 tracking    Inline data values
```

### Key Decisions

- **Section headers** are NOT uppercased screaming labels. The current `OVERVIEW`, `FLASHBACK` style is aggressive. New style: sentence-case, `headline` weight, left-aligned, no letter-spacing gymnastics. Section headers should feel like a friend labeling a page of their notebook, not a corporate dashboard.
- **Large numbers** use JetBrains Mono. The stat values (memory count, streak count, task count) gain a technical, precise quality that contrasts with the warm Inter body text. This creates visual interest without adding colors or icons.
- **Story content** uses `body` at 16px/24px with generous paragraph spacing. Stories are meant to be *read*, not scanned.

---

## 4. Spacing & Layout

### Base Unit: 4px

All spacing derives from a 4px grid: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.

### Screen Padding

```
screenHorizontal:     20px          Both sides, all screens
screenTop:            12px          Below safe area
screenBottom:         40px          Above tab bar
```

### Card System

The `GlassCard` component is replaced by `Sheet` -- an opaque, paper-like surface.

```
Sheet
  background:          surface (#161618 dark / #FFFFFF light)
  border:              1px subtle
  borderRadius:        14px
  padding:             16px (compact) / 20px (standard) / 24px (spacious)
  shadow (dark):       0 1px 2px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.2)
  shadow (light):      0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.06)
  accentBorder:        2px left border (replaces current 3px -- thinner is more refined)
```

No blur. No transparency. Solid surfaces. This solves the Android rendering inconsistency (the current `GlassCard` falls back to `glassSurface` on Android, making it look different from iOS). Solid surfaces look identical on both platforms.

### Vertical Rhythm

```
Between sections:      32px
Between cards:         12px
Between header/content: 8px
Between label/value:   4px
Page title to content: 24px
```

### Negative Space

The current app has `marginTop: 24` between sections and `paddingHorizontal: 20`. This is adequate but does not breathe. The new rule: every screen has a minimum of 32px between major sections, and the home screen greeting gets 48px below it before any content appears. White space is not wasted space -- it is emotional space.

---

## 5. Animation Language

### Philosophy

The current app uses `FadeInDown` with stagger delays on nearly every element. This creates a "waterfall" effect on every screen load that:
1. Slows perceived performance (content appears piece by piece)
2. Feels the same on every screen (no personality)
3. Adds visual noise to routine interactions

The new approach: **screens load instantly. Content is already there.** Animation is reserved for:
- User-initiated interactions (press, expand, collapse)
- State changes (data refresh, mood change)
- Signature moments (defined in Section 9)

### Spring Configs

```javascript
// Default interaction spring (buttons, cards)
const SPRING_PRESS = {
  damping: 20,
  stiffness: 400,
  mass: 0.3,
  overshootClamping: false,    // Allow slight bounce
};

// Expand/collapse spring (accordions, modals)
const SPRING_EXPAND = {
  damping: 24,
  stiffness: 300,
  mass: 0.5,
  overshootClamping: false,
};

// Snappy response (toggles, checkboxes)
const SPRING_SNAP = {
  damping: 28,
  stiffness: 600,
  mass: 0.2,
  overshootClamping: true,
};
```

### Micro-Interactions

| Interaction | Animation | Duration |
|---|---|---|
| Card press | Scale to 0.97, 1px downward translate | SPRING_PRESS |
| Card release | Scale to 1.0 with slight overshoot | SPRING_PRESS |
| Checkbox toggle | Scale bounce 0.8 -> 1.1 -> 1.0, color change | SPRING_SNAP |
| Pull to refresh | Custom: content pushes down, reveals a single dot that pulses | 200ms ease |
| Modal appear | Slide from bottom with SPRING_EXPAND, backdrop fades 200ms | SPRING_EXPAND |
| Modal dismiss | Slide down 250ms ease-in, backdrop fade 150ms | 250ms |
| Tab switch | Cross-fade 150ms, no slide | 150ms linear |
| Mood tint shift | Canvas background color transition | 800ms ease-in-out |

### What to Remove

- All `FadeInDown` entry animations on card lists. Cards render immediately.
- All stagger `delay` props. If content exists, show it.
- The `AnimatedStat` counting animation. Show the final number. The counting-up effect is a cliche that adds no information.

---

## 6. Component Library

### Sheet (replaces GlassCard)

```
Props:
  variant:     'standard' | 'compact' | 'spacious'
  accent:      string | undefined          Left border color
  interactive: boolean                     If true, adds press animation
  children:    ReactNode

Visual:
  Opaque surface color, 1px subtle border, 14px radius.
  No blur. No transparency.
  Drop shadow provides depth on both platforms.
```

### PressableSheet (interactive Sheet)

```
Wraps Sheet with:
  - Scale animation on press (0.97)
  - Haptic feedback (Light impact)
  - Optional onPress handler
```

### SectionLabel (replaces SectionHeader)

```
Props:
  label:       string
  action:      { text: string, onPress: () => void } | undefined

Visual:
  caption weight (Inter 500, 13px), secondary text color.
  Sentence case (NOT uppercase).
  No letter-spacing. No divider line.
  Right-aligned action text in brand color.
  marginBottom: 12px
```

### Tag (replaces PillBadge)

```
Props:
  label:       string
  color:       string | undefined          Background tint
  size:        'default' | 'small'

Visual:
  default: 6px vertical padding, 10px horizontal, 8px radius
  small:   4px vertical, 8px horizontal, 6px radius
  Background: surfaceRaised (no border, color differentiation via tint)
  Text: caption weight, secondary color
  NO pill shape (borderRadius: 100). Tags use 8px radius -- squared-off but soft.
```

### DataNumber (new)

```
Props:
  value:       number
  size:        'large' | 'medium' | 'small'

Visual:
  JetBrains Mono, monospace.
  large: 28px   (home stats)
  medium: 20px  (card stats)
  small: 16px   (inline data)
  Color: primary text
```

### MoodDot (revised)

```
Props:
  mood:        1-5 | string
  size:        'small' | 'medium' | 'large'
  glow:        boolean

Visual:
  small: 8px    medium: 12px    large: 16px
  Filled circle with mood color.
  glow: adds a 4px spread shadow in the mood color at 30% opacity.
  NO border.
```

### EmptyState (revised)

```
Props:
  icon:        LucideIcon
  title:       string
  body:        string

Visual:
  Centered layout.
  Icon: 40px, tertiary color, 1.2 stroke, NO circle background.
  Title: headline weight, 12px below icon.
  Body: body size, secondary color, 8px below title.
  Maximum width: 280px for body text.
  The current circular background behind the icon is removed -- it adds visual weight to emptiness.
```

### SearchField (revised)

```
Visual:
  Height: 44px
  Background: surface
  Border: 1px medium, 12px radius
  Left icon: Search, 16px, tertiary color
  Placeholder: tertiary color
  Text: primary color, body size
  Clear button: X icon, appears when text is present
  NO glassSurface background.
```

### Charts & Data Viz

**Year-in-Pixels Grid (Mood):**
Keep the grid concept but change dots to 10x10px rounded squares (4px radius) with 3px gap. The current DOT_SIZE calculation produces dots that are too small and too close together.

**Distribution Bars (Mood):**
Keep horizontal bars. Change bar height from 10px to 6px. Use 4px radius. Remove the label dots -- the bar color is sufficient. Add the percentage value inline to the right of the bar.

**Weekly Trend (Mood):**
Replace the dot-and-label layout with a minimal sparkline SVG: a single polyline connecting weekly averages, no axes, no labels except first and last week. Color: brand accent. Height: 48px.

**Habit Heatmap:**
Keep the 7-day grid. Change dot size from 28px to 24px rounded squares with 6px radius. Add a subtle pulse animation on today's square if the habit is not yet checked in.

### Loading States

Replace `ActivityIndicator` with a custom pulsing dot. Three dots, 6px each, brand color, staggered opacity pulse. Centered. No spinner.

### Modals

Replace the current `Modal` + `GlassCard` pattern with a bottom sheet. The current centered modal with a backdrop feels like a web popup. A bottom sheet that slides up feels native and mobile.

```
Bottom Sheet
  Background: surfaceRaised
  Border: 1px subtle (top only, via borderTopLeftRadius/borderTopRightRadius: 20px)
  Handle: 36px wide, 4px tall, tertiary color, centered, 8px from top
  Max height: 80% of screen
  Dismiss: swipe down or tap backdrop
  Entry: SPRING_EXPAND from bottom
  Exit: 250ms ease-in slide down
```

---

## 7. Screen-by-Screen Redesign

### 7.1 Home

**Current problems:**
- The greeting, mood pill, stats grid, flashback card, and journal link all compete for attention.
- The 2x2 stats grid is the dominant visual but carries the least emotional value.
- The flashback card is buried below the fold.

**Redesign:**

```
Layout (top to bottom):
1. Hero Greeting          (takes 35% of screen)
2. Mood State             (integrated into greeting, not a separate pill)
3. Flashback              (the most emotionally valuable content, promoted)
4. Quick Stats            (single horizontal row, minimal)
5. Activity Ring          (replaces journal link -- shows today's activity)
```

**Hero Greeting:**
- `displayLarge` for the greeting ("Good evening,")
- `displayMedium` for the name
- Below the name: the mood state as a sentence, not a pill. Example: "You're feeling calm today" in `body` with the mood color applied to the mood word only. No dot, no pill, no badge -- just colored text inline.
- 48px space below before any content.

**Flashback:**
- Promoted to directly below the greeting (the first card on screen).
- Sheet with left accent border in brand color.
- Content in `body` italic, secondary color for the date below.
- No "From your memory" header label. The position and accent tell you it is a flashback.

**Quick Stats:**
- Single horizontal scroll row of 3-4 small stat chips.
- Each chip: icon (16px) + DataNumber (medium) + label (micro).
- No cards wrapping them. Just inline elements in a row.
- Tappable -- navigates to the relevant screen.

**Activity Ring:**
- Replace the "Open Journal" link card.
- A single concentric ring (SVG) showing today's conversation activity (messages sent today vs. average).
- Tap opens Journal.
- If no activity today, ring is empty with "Start a conversation" prompt.

**What to remove:**
- The 2x2 stats grid (replaced by horizontal stat chips)
- The "Open Journal" card (replaced by Activity Ring)
- The mood pill component (mood is now inline text)
- The `SectionHeader` for "Overview" (just show the stats, no label needed)

### 7.2 Journal

**Current problems:**
- Dense card list with too much visual chrome per entry (mood dot + time + type badge + content + media description).
- The search bar and filter chips take permanent screen real estate.
- Every card has the same visual weight regardless of content type.

**Redesign:**

```
Layout:
1. Screen Title           ("Journal" in displayMedium)
2. Search (collapsed)     (just a search icon; expands on tap)
3. Filter Chips           (hidden by default; revealed by a filter icon)
4. Timeline               (date headers + entry rows)
```

**Search:**
- By default, only a Search icon is visible in the top-right corner of the header.
- Tapping it expands a search field that pushes content down (animated with SPRING_EXPAND).
- This reclaims ~60px of vertical space on every visit.

**Filter Chips:**
- Hidden by default. A small filter icon next to the search icon reveals them.
- When active, a single chip appears next to the title showing the active filter. Tap to change or clear.

**Timeline Entries:**
- Remove the GlassCard wrapper from individual entries. Instead, use a minimal left-border timeline layout:
  - A thin vertical line (1px, subtle color) runs down the left side.
  - Each entry is a horizontal row: mood dot (on the line) + content block to the right.
  - Date headers are inline with the timeline, slightly bolder.
  - The type badge (Text/Voice/Photo) is removed from the list view. The content itself makes it obvious (photo entries show a thumbnail, voice entries show a waveform indicator).
- This reduces visual noise dramatically and makes the Journal feel like a continuous narrative rather than a stack of cards.

**Detail Modal:**
- Replaced with a bottom sheet.
- Full content, media player, and metadata inside.
- Swipe down to dismiss.

### 7.3 Stories

**Current problems:**
- The 4-tile stats grid at the top is overwhelming for a screen about narratives.
- The "Today's Story" hero card and the weekly timeline below it have inconsistent visual styles.
- Stories are meant to be read, but the truncated card format discourages reading.

**Redesign:**

```
Layout:
1. Screen Title           ("Stories" + subtitle)
2. Today's Story          (full-width, generous padding, readable)
3. Story Calendar         (replaces stats grid -- 30-day dot calendar)
4. Past Stories           (simple list, one per day)
```

**Today's Story:**
- Full-width Sheet, 24px padding.
- Content in `body` (16px) with 28px line-height. Stories should be *read*.
- No truncation. If the story is long, the card expands. This is the primary content of the screen.
- Mood color as a subtle left accent border.
- Date in `caption` below content.
- If no story today: a warm, encouraging prompt (no icon, just text). "Share your day with Groot to create today's story."

**Story Calendar:**
- Replace the 4-stat grid with a 30-day dot calendar (similar to GitHub contribution graph but single-row).
- Each day is a small dot: filled (story exists, mood-colored) or empty (no story).
- Today is highlighted with a ring.
- This gives the user an at-a-glance sense of their storytelling habit without numbers.
- Tapping a dot scrolls to that story.

**Past Stories:**
- Remove the week-grouping headers. Stories are listed chronologically, newest first.
- Each story: date (caption), first two lines of content (body), mood dot. No card wrapper -- just rows separated by subtle dividers.
- Tapping opens the bottom sheet with full content.

**What to remove:**
- The 4-stat grid (streak, total, this month, top theme). Move these to a "Stats" section accessible via a small info icon in the header.
- PillBadge tags on story cards in the list view. Tags are visible in the detail sheet only.
- The GlassCard wrapper on each story in the timeline.

### 7.4 Mood

**Current problems:**
- Three separate sections (hero mood, year-in-pixels, weekly trend, distribution) make the screen feel like a dashboard, not a mood tracker.
- The year-in-pixels grid is the most interesting element but is given the same weight as the bar chart.

**Redesign:**

```
Layout:
1. Current Mood           (large, centered, dominant)
2. Year Grid              (full-width, the hero visual)
3. Trend Sparkline        (compact, below grid)
4. Distribution           (compact bars below sparkline)
```

**Current Mood:**
- Centered on screen, above the grid.
- The mood word in `displayLarge`, colored with mood color. Example: **Calm** in blue, centered.
- Below it: "since this morning" or a relative time indicator in `caption`, secondary color.
- No dot. No pill. The word itself, in color, is the mood indicator.

**Year Grid:**
- Full width. 10x10px squares, 3px gap, 4px radius.
- Today's square has a subtle ring animation (1px brand color ring that pulses once on load).
- The legend moves to below the grid, horizontal: gradient bar from red to green, "Low" and "Great" labels at ends.

**Trend Sparkline:**
- Replace the dot-and-label weekly trend with an SVG sparkline.
- Single line, brand color, 48px tall, full-width.
- No axes. Only two labels: the first week date (left) and the most recent week date (right).
- Below the sparkline: the trend description text in `caption`.

**Distribution:**
- Horizontal bars, 6px tall. Same as current but thinner and without the label dots.
- The mood word + percentage are on the same line as the bar.

### 7.5 More

**Current problems:**
- A 2-column grid of nav cards is functional but boring. It is a menu, and it looks like a menu.
- Every card has the same visual treatment regardless of its importance.

**Redesign:**

```
Layout:
1. Screen Title           ("More")
2. Navigation List        (replace grid with a vertical list)
```

**Navigation List:**
- Replace the 2-column grid with a single-column list of rows.
- Each row: icon (in a small colored tint circle) + label + chevron.
- No description text. Labels are self-explanatory (Habits, Tasks, Insights, etc.).
- Group into two sections: "Your Data" (Habits, Tasks, Insights, Topics, People, Profile) and "App" (Settings).
- Divider between groups.
- This is faster to scan than a grid and takes less vertical space.

**What to remove:**
- The `description` text on each menu item. Unnecessary cognitive load.
- The full-width Settings card at the bottom. Settings is just another row in the list.
- GlassCard wrappers on each menu item. Use simple pressable rows.

### 7.6 Habits

**Minimal changes from current. It works well.**

- Replace `GlassCard` with `Sheet`.
- Change heatmap dots from 28px to 24px, increase border radius from 8px to 6px.
- Use JetBrains Mono for the streak number.
- Add a subtle pulse animation on today's heatmap square if the habit has not been checked in yet (a gentle "reminder" micro-interaction).
- Remove the `PillBadge` for frequency/category. Show frequency as caption text below the habit name.

### 7.7 Tasks

**Minimal changes from current. It works well.**

- Replace `GlassCard` with `Sheet`.
- Replace the `Square`/`CheckSquare` icons with a custom animated checkbox: an empty circle that, when tapped, fills with brand color and shows a white checkmark with a scale bounce (SPRING_SNAP).
- Completed tasks: strikethrough + secondary text color. No separate "Completed" section header -- completed tasks just appear below pending tasks with a visual separator line.
- Use a sliding gesture to complete tasks (swipe right to check off). Haptic on completion.

### 7.8 Profile

**Current problems:**
- Category sections with icon + label + description + section header is over-labeled. Three labels for one section.
- Delete button (trash icon) on every fact is aggressive. Users rarely delete.

**Redesign:**

- Keep the categorized fact structure.
- Simplify category headers: just the label (headline weight) with the icon inline. No description, no `SectionHeader` duplicate.
- Facts rendered as simple rows: key in `caption` (uppercase, secondary), value in `body` (primary), date in `small` (tertiary). No card wrapper per fact.
- Delete: long-press to reveal delete option, or swipe-left. Remove the persistent trash icon.
- Group facts visually with tighter spacing within categories, more space between categories.

### 7.9 People

**Minimal changes needed. Clean design.**

- Replace `GlassCard` with `Sheet`.
- Keep the avatar with initials. Good pattern.
- Remove the `PillBadge` for source (WhatsApp/Telegram). Move source to a caption-sized label inside the detail view.
- Add a horizontal scroll of "Frequently mentioned" at the top (the top 5 people as avatar circles). Tapping one scrolls to their entry.

### 7.10 Settings

- Replace the theme selection cards (Light/Dark/System) with a simple segmented control -- three horizontally aligned text buttons with an animated highlight behind the active one.
- Notification toggles: keep the current list design. Replace `GlassCard` wrapper with `Sheet`.
- Sign Out: red text, no icon. At the very bottom.

### 7.11 Login

**Current is solid. Minor refinements:**

- Replace the `Sprout` icon with a text-only logo: "The Garden" in `displayMedium`, centered.
- Below: "by Groot" in `caption`, brand color.
- Phone input and OTP input: keep the current layout. Replace `GlassCard` with `Sheet`.
- Button: full-width, 50px tall, 14px radius, brand color background, white text. No change.
- Remove the footer text ("Message Groot on WhatsApp first..."). Move this info to an expandable "How does this work?" link.

---

## 8. Tab Bar / Navigation

### Keep 5 tabs. Change the icons and style.

```
Tab 1:  Home       icon: House (lucide) solid variant when active
Tab 2:  Journal    icon: NotebookPen (lucide)
Tab 3:  Stories    icon: BookHeart (lucide)
Tab 4:  Mood       icon: Smile (lucide)
Tab 5:  More       icon: Grid2x2 (lucide)
```

### Tab Bar Style

```
height:              56px (reduced from 65px)
paddingBottom:       platform-aware (safe area)
backgroundColor:     canvas (same as screen background, not glassSurface)
borderTop:           1px subtle
labelFontSize:       11px Inter 500
activeColor:         brand (#7C6AEF dark / #6E56CF light)
inactiveColor:       tertiary (#48484A dark / #AEAEB2 light)
iconSize:            22px (reduced from 24px)
strokeWidth:         1.5 (inactive) / 2.0 (active)
```

### Key Change

The tab bar background matches the screen canvas, not a separate glass surface. This makes the tab bar feel integrated into the screen rather than floating above it. The 1px top border provides sufficient separation.

Active tab: icon + label, both in brand color. Inactive: icon + label in tertiary.

No blur. No elevation. No gradient. Just a thin line and color change.

---

## 9. Signature Moments

### 1. The Mood Wash

When the user lands on Home and has a recent mood, the entire screen canvas subtly shifts to the mood's tint color over 800ms. This is not a gradient or overlay -- it is a change to the background color itself. The effect is barely perceptible but deeply felt. It is the first thing that tells you "this app knows how I feel."

**Implementation:** Animated background color on the root `View` of the Home screen, driven by `withTiming(moodTintColor, { duration: 800 })`.

### 2. The Story Unfold

When you tap on a story in the Stories screen, instead of a modal or bottom sheet, the story card *expands in place*. The truncated text smoothly reveals the full content, tags fade in below, and the surrounding cards gently push apart. It feels like opening a page in a book.

**Implementation:** `useAnimatedStyle` with `height` interpolation from measured truncated height to full height. Use `LayoutAnimation` or `react-native-reanimated` layout transitions.

### 3. The Completed Pulse

When you check off a task, the checkbox does not just fill in -- a subtle ripple of the brand color expands from the checkbox outward across the task row, then fades. The task text simultaneously transitions to strikethrough and secondary color. It feels like a small celebration.

**Implementation:** Circular `Animated.View` expanding from the checkbox position with opacity fade. Triggered on toggle mutation success.

### 4. The Journal Heartbeat

On the Journal screen, when there are entries for today, a single small dot at the top of the timeline pulses gently (opacity 0.4 to 1.0, repeating). It is the "heartbeat" of your journal -- a sign that your second brain is alive and listening today. If there are no entries today, the dot is static and dimmed.

**Implementation:** `withRepeat(withTiming(...), -1, true)` on opacity of a 6px brand-colored dot.

### 5. The First Entry

The first time a user opens the app after sending their first message to Groot, the empty state transitions into content with a special animation: the empty-state icon transforms into the first card. The "Your garden awaits" text morphs into the greeting. This only happens once, on the transition from empty to populated.

**Implementation:** Shared element transition or matched geometry via `react-native-reanimated` layout animations. Store a flag in AsyncStorage to trigger this once.

---

## 10. What to Remove

### Components to Kill

| Current | Replacement | Why |
|---|---|---|
| `GlassCard` | `Sheet` | Glassmorphism is inconsistent across platforms, visually cold, and overused in 2023-era apps |
| `GradientBackground` | Flat canvas with mood tint | Three-stop gradients add visual noise without meaning |
| `AnimatedStat` (counting) | Static `DataNumber` | Counting animations are a cliche; show the number |
| `PillBadge` (pill shape) | `Tag` (rounded rect) | Pills are the default for every app; squared tags feel more intentional |
| `SectionHeader` (uppercase) | `SectionLabel` (sentence case) | ALL CAPS HEADERS feel aggressive for a personal journal |
| `BlurView` usage | Remove entirely | Blur is iOS-only in practice; opaque surfaces work everywhere |
| Stagger animations | Remove entirely | Screens should load complete, not piece by piece |

### Patterns to Kill

1. **Staggered FadeInDown on every list.** Content appears instantly. No waterfall.
2. **Uppercase letter-spaced section headers.** Sentence case, regular tracking.
3. **Icon + label + description on every menu item.** Label only. Let icons do the work.
4. **Mood dot + pill badge duplication.** Mood is expressed through color on text or background, not a dedicated dot component.
5. **Three-stop gradient backgrounds.** Flat surface with optional mood tint.
6. **Category/frequency/source badges on list items.** Move metadata to detail views.
7. **The "Overview" section on Home.** Stats are a horizontal scroll row, not a labeled section.

### Screens to Simplify

- **Home**: from 5 sections to 3 (greeting, flashback, stats row)
- **Stories**: from 4 sections to 3 (today's story, calendar, past stories)
- **More**: from grid to list (half the vertical space)
- **Profile**: from icon+label+description+section-header to just label+facts

---

## Appendix A: Migration Path

This spec does not require a big-bang rewrite. Suggested order:

1. **Theme tokens** -- Update `tokens.ts` with new color system. This affects everything.
2. **Sheet component** -- Build the `Sheet` replacement for `GlassCard`. Swap one screen at a time.
3. **Typography** -- Add JetBrains Mono, update `typography.ts` with new scale. Apply to `DataNumber` first.
4. **Remove GradientBackground** -- Replace with flat canvas + mood tint on Home.
5. **Home screen** -- Redesign as the flagship. New greeting, inline mood, horizontal stats.
6. **Tab bar** -- Update style and icons.
7. **Journal timeline** -- Replace card list with timeline layout.
8. **Stories** -- Implement Story Unfold and calendar.
9. **Mood** -- Sparkline and large mood word.
10. **More** -- Grid to list.
11. **Secondary screens** -- Habits, Tasks, Profile, People, Settings, Login.

## Appendix B: New Dependencies

```
@expo-google-fonts/jetbrains-mono     (JetBrains Mono for data numerals)
```

No other new dependencies required. Everything else (reanimated, SVG, haptics, expo-blur removal) is already available or involves removing unused packages.
