# Noto Design System

This document codifies the existing design system as implemented across the mobile codebase. It is descriptive, not prescriptive — every decision here is already in production code.

Source files:
- `mobile/lib/theme/tokens.ts` — color tokens, spacing, radii, shadows, icon button size
- `mobile/constants/typography.ts` — type scale
- `mobile/constants/card-colors.ts` — card and emotion colors
- `mobile/app/journal.tsx`, `mobile/app/chat.tsx`, `mobile/app/settings.tsx` — screen patterns
- `mobile/components/ui/noto-mascot.tsx` — mascot component
- `mobile/components/chat/message-bubble.tsx` — chat bubble component
- `mobile/app/_layout.tsx` — font loading, navigation structure

---

## Brand Identity

Noto is an AI second brain and empathetic life companion. The personality is warm and supportive with a disciplined edge — J.A.R.V.I.S. in feeling, not in coldness. It listens, thinks, and remembers.

Primary interaction surface: WhatsApp (Meta Cloud API). Mobile app ("The Garden") is a secondary portal for review and management, not the primary capture mechanism.

The visual language reflects this: warm cream canvases, soft shadows, generous radii. Nothing sharp or clinical. The mascot (a cloud character) is the emotional core of the brand.

---

## Color Palette

### Core theme tokens (`notoTheme`)

Source: `mobile/lib/theme/tokens.ts:26`

| Token | Hex | Usage |
|---|---|---|
| `background` | `#F0EFEB` | Screen background (settings, secondary screens) |
| `foreground` | `#1E1E1E` | Primary text, icons |
| `card` | `#FFFFFF` | Card surfaces, chat input background |
| `cardForeground` | `#1E1E1E` | Text on cards |
| `primary` | `#1E1E1E` | Primary interactive elements |
| `primaryForeground` | `#FFFFFF` | Text on primary elements |
| `secondary` | `#F0EFEB` | Secondary surfaces |
| `secondaryForeground` | `#555555` | Text on secondary surfaces |
| `muted` | `#F0EFEB` | Muted backgrounds |
| `mutedForeground` | `rgba(30,30,30,0.6)` | Muted text |
| `accent` | `#FFBB2C` | Amber accent — pull-to-refresh indicator, ring highlight |
| `accentForeground` | `#1E1E1E` | Text on accent |
| `destructive` | `#EE2336` | Destructive actions, danger zone |
| `border` | `#EAEAEA` | Dividers, card borders |
| `input` | `rgba(0,0,0,0.04)` | Input field backgrounds |
| `ring` | `#FFBB2C` | Focus ring |
| `shadowColor` | `rgba(0,0,0,0.06)` | Default shadow base |

### Semantic color aliases (`colors`)

Source: `mobile/lib/theme/tokens.ts:47`

| Name | Hex | Usage |
|---|---|---|
| `pageBg` | `#FEFEFE` | Page-level background (journal, chat screens) |
| `iconButtonBg` | `#F5F4F2` | Icon button resting state background |
| `textSubdued` | `#8F887E` | Captions, timestamps, metadata, header subtitles |
| `textFaded` | `#A6A29B` | Secondary labels, counts |
| `placeholder` | `#B6B0A6` | Input placeholder text |
| `searchBg` | `#F0EFED` | Search bar default background |
| `heroTint` | `#6D72E6` | Capture hero eyebrow text, accent |
| `heroSubtitle` | `#6E6A86` | Capture hero subtitle text |
| `chatAssistant` | `#F0EFEB` | Assistant chat bubble background (cream) |
| `chatUser` | `#1E1E1E` | User chat bubble background (dark) |
| `typingDot` | `#C0BDB8` | Typing indicator dots |

### Card colors (`CARD_COLORS`)

Source: `mobile/constants/card-colors.ts:21`

Five semantic categories, each with a background and a meta (icon/label) color:

| Category | Background | Meta color | Semantic meaning |
|---|---|---|---|
| `task` | `#E8F0FE` | `#5B8BD4` | Periwinkle blue — todos, reminders, deadlines |
| `idea` | `#FFF5E1` | `#D09840` | Warm honey — concepts, brainstorms |
| `reflection` | `#E6F7ED` | `#49A76C` | Sage green — gratitude, learning, growth |
| `emotion` | `#FDE8EE` | `#D4607A` | Dusty rose — feelings, moods |
| `media` | `#F0ECF9` | `#8B78B8` | Soft lavender — audio, image |

Six additional palette slots are used for hash-based fallback coloring when no category is matched.

### Emotion colors (`EMOTION_COLORS`)

Source: `mobile/constants/card-colors.ts:32`

Used in analytics bar charts:

| Emotion | Hex |
|---|---|
| `happy` | `#FFBB2C` (same as accent) |
| `sad` | `#764539` |
| `calm` | `#8AA230` |
| `anxious` | `#787163` |

### Prompt colors (`PROMPT_COLORS`)

Source: `mobile/constants/card-colors.ts:42`

Quick journal prompt card backgrounds:

| Name | Hex |
|---|---|
| `rose` | `#F3D3CC` |
| `lavender` | `#E1D8FF` |
| `stone` | `#DDDBCE` |

### Tag colors (`TAG_COLORS`)

Source: `mobile/constants/card-colors.ts:49`

| Tag | Hex |
|---|---|
| `personal` | `#EE2336` |
| `family` | `#803EF2` |

---

## Typography

### Font family

Plus Jakarta Sans, loaded via `@expo-google-fonts/plus-jakarta-sans`. Four weights:

Source: `mobile/constants/typography.ts:1`, `mobile/app/_layout.tsx:108`

| Key | Font name |
|---|---|
| `regular` | `PlusJakartaSans_400Regular` |
| `medium` | `PlusJakartaSans_500Medium` |
| `semiBold` | `PlusJakartaSans_600SemiBold` |
| `bold` | `PlusJakartaSans_700Bold` |

### Type scale

Source: `mobile/constants/typography.ts:8`

| Key | Size | Line height | Letter spacing | Typical use |
|---|---|---|---|---|
| `hero` | 64 | 72 | -1.5 | Hero displays, splash |
| `3xl` | 32 | 39 | -0.65 | Large display numbers |
| `title` | 28 | 34 | -0.5 | Screen titles |
| `2xl` | 26 | 34 | -0.45 | Top bar titles (journal, settings) |
| `xl` | 24 | 32 | -0.3 | Section headings, chat empty state title |
| `lg` | 18 | 26 | -0.2 | Account name, card headings, empty state title |
| `base` | 16 | 26 | 0 | Body text, danger zone title |
| `sm` | 14 | 21 | 0 | Chat bubbles, row titles, body copy, buttons |
| `xs` | 13 | 18 | 0.1 | Captions, export labels, timestamps |
| `caption` | 11 | 14 | 0.3 | Section headers (uppercase), build version |

Negative letter spacing on display sizes tightens headlines. Positive letter spacing on `caption` improves readability of uppercase labels.

---

## Spacing & Layout

### Spacing scale

Source: `mobile/lib/theme/tokens.ts:73`

| Key | Value (pt) | Typical use |
|---|---|---|
| `xs` | 4 | Typing dot gaps, small gaps |
| `sm` | 8 | Message row margin, hitSlop |
| `md` | 12 | Header padding, component gaps |
| `lg` | 16 | Horizontal screen padding, bubble padding |
| `xl` | 20 | Horizontal scroll padding |
| `2xl` | 24 | Large component gaps |
| `3xl` | 32 | Large section gaps |

Screen horizontal padding is consistently `20` (matching `spacing.xl`).

### Border radius scale

Source: `mobile/lib/theme/tokens.ts:84`

| Key | Value (pt) | Typical use |
|---|---|---|
| `sm` | 12 | — |
| `md` | 16 | Sign out button |
| `lg` | 20 | Chat bubbles, top bar in journal/settings, cards |
| `xl` | 24 | Danger zone border |
| `full` | 999 | Circular elements, pill buttons, delete button |

### Shadows

Source: `mobile/lib/theme/tokens.ts:96`

Three presets using a black shadow base:

| Key | Y offset | Opacity | Blur radius | Elevation | Typical use |
|---|---|---|---|---|---|
| `sm` | 1 | 0.06 | 4 | 2 | Cards in the feed |
| `md` | 2 | 0.08 | 8 | 4 | Modals, elevated panels |
| `lg` | 4 | 0.12 | 12 | 6 | High-elevation overlays |

The FAB and capture hero use an indigo-tinted shadow (`#4338CA`) at higher opacity (0.08–0.14) to add color depth. This is intentional and distinct from the neutral `shadows` presets.

---

## Component Patterns

### Top bar

Source: `mobile/app/journal.tsx:86`, `mobile/app/chat.tsx:201`, `mobile/app/settings.tsx:140`

Two variants exist:

**Journal / full top bar** — icon button left + copy center + icon button right
```
[ back button (44x44) ]  [ title + subtitle (flex:1) ]  [ settings button (44x44) ]
```
- Row: `flexDirection: row`, `alignItems: center`, `gap: 14`, `marginBottom: 20`
- Title: `fonts.bold`, 26px, `#1A1A1A`, `letterSpacing: -0.9`
- Subtitle: `fonts.regular`, 13px, `#8F887E`, `marginTop: 2`
- When on home (no back button), a 44x44 spacer replaces the back button to keep the copy centered

**Chat header** — icon button left + copy center, bottom border
```
[ back button (44x44) ]  [ title + subtitle (flex:1) ]
```
- Border: `borderBottomWidth: 1`, `borderBottomColor: notoTheme.border`
- Title: `fonts.bold`, 18px, `notoTheme.foreground`, `letterSpacing: -0.3`
- Subtitle: `fonts.regular`, 12px, `colors.textSubdued`

**Settings top bar** — icon button left + title inline, bottom border
- `minHeight: 58`, bottom border separates from scroll content

### Icon buttons

Source: `mobile/app/journal.tsx:263`, `mobile/app/chat.tsx:271`

- Size: `44x44` (`ICON_BUTTON_SIZE`)
- Border radius: `22` (full circle)
- Background: `colors.iconButtonBg` (`#F5F4F2`)
- Icon: lucide-react-native, `size={18}`, `strokeWidth={2.2}`, color `#1A1A1A` or `notoTheme.foreground`

### Cards

Source: `mobile/app/settings.tsx:289`

Standard card container:
- `backgroundColor: #FFFFFF`
- `borderRadius: 20` (`radii.lg`)
- `borderWidth: 1`, `borderColor: notoTheme.border` (`#EAEAEA`)
- `padding: 8`
- Shadow: `shadows.sm` equivalent

Account card uses `padding: 16` instead of `padding: 8`.

### Section headers

Source: `mobile/app/settings.tsx:213`

Used above groups of cards to label content areas:
- `fonts.bold`
- `typography.caption` — 11px, 14 line height, 0.3 letter spacing
- Color: `#C0BDB8`
- `textTransform: uppercase`, `letterSpacing: 1.2`
- `marginBottom: 12`, `marginTop: 6`

### Search bar

Source: `mobile/app/journal.tsx:157`

Two states:

**Default:**
- Background: `#F0EFED`
- Icon: `#A9A39A`
- Input text: `#333`
- Placeholder: `#B6B0A6`
- Border radius: 18

**Active (focused):**
- Background: `#1A1A1A` (near-black)
- Icon: `#FFFFFF`
- Input text: `#FFFFFF`
- Placeholder: `rgba(255,255,255,0.5)`
- X clear button appears (`rgba(255,255,255,0.7)`)

Transition is controlled by `searchFocused` state — no animation, instant swap.

### Meta row (label + count)

Source: `mobile/app/journal.tsx:190`

Row above content grids:
- Label: `fonts.bold`, 10px, `#A6A29B`, uppercase, `letterSpacing: 1.1`
- Count: `fonts.medium`, 12px, `#8F887E`
- Layout: `justifyContent: space-between`

### Empty states

Source: `mobile/app/journal.tsx:203`, `mobile/app/chat.tsx:219`

Two patterns:

**Journal empty state** (centered, top-padded):
- `NotoMascot size={210} compact`
- Title: `fonts.bold`, `typography.lg`, `#333`, `marginTop: 20`
- Subtitle: `fonts.regular`, `typography.sm`, `#999`, `marginTop: 6`, `textAlign: center`
- `paddingTop: 52`

**Chat empty state** (centered, full-height):
- No mascot — text only
- Title: `fonts.bold`, `typography.xl`, `notoTheme.foreground`
- Subtitle: `fonts.regular`, `typography.sm`, `colors.textSubdued`
- `justifyContent: center`, `paddingHorizontal: 40`

### Chat hero card (home screen)

Source: `mobile/app/journal.tsx:117`

Prominent action card for entering the chat:
- Background: `#1E1E1E` (inverted/dark)
- Border radius: 20
- Row layout: icon circle + copy
- Icon circle: 44x44, `rgba(255,255,255,0.15)` background, `MessageCircle` icon in white
- Title: `fonts.bold`, 17px, `#FFFFFF`, `letterSpacing: -0.3`
- Subtitle: `fonts.regular`, 13px, `rgba(255,255,255,0.6)`

### Capture hero card (home screen)

Source: `mobile/app/journal.tsx:134`

Softer card for capture CTA, featuring the mascot:
- Background: `#F7F8FF` (near-white with blue tint)
- Border radius: 28
- Border: `1px solid #E3E8FF`
- Shadow: indigo-tinted (`#4338CA`, opacity 0.08, blur 24, y-offset 12)
- Eyebrow: `fonts.bold`, 11px, `#6D72E6`, uppercase, `letterSpacing: 1.2`
- Title: `fonts.bold`, 24px, `#1A1A1A`, `letterSpacing: -0.8`
- Subtitle: `fonts.regular`, 13px, `#6E6A86`
- Mascot: `NotoMascot size={108} compact` on right side

### FAB (Floating Action Button)

Source: `mobile/app/journal.tsx:225`

Positioned `absolute`, `right: 18`, `bottom: 22`:
- Mascot wrapped in white circle: 74x74, `borderRadius: 37`, `backgroundColor: #FFFFFF`
- Shadow: indigo-tinted (`#4338CA`, opacity 0.14, blur 24, y-offset 10)
- Label below: `fonts.semiBold`, 11px, uppercase, `letterSpacing: 0.4`, `#6F6A63`
- Label text: "Capture"

### Settings row

Source: `mobile/app/settings.tsx:221`

Row inside a card for a single setting:
- Icon circle: 40x40, `borderRadius: 20`, `backgroundColor: notoTheme.background`
- Title: `fonts.bold`, `typography.sm`, `notoTheme.foreground`, `flex: 1`
- Trailing: right-aligned slot (text, chevron, toggle)
- Separator: optional `borderBottomWidth: 1`, `borderBottomColor: notoTheme.border`

### Danger zone

Source: `mobile/app/settings.tsx:370`

Visually isolated destructive section:
- Border: `2px dashed rgba(226,85,85,0.25)`
- Background: `rgba(226,85,85,0.03)`
- Border radius: 24
- Icon circle: 42x42, `rgba(226,85,85,0.1)` background
- Icon: `ShieldCheck`, `notoTheme.destructive`
- Delete button: `borderRadius: 999` pill, `borderColor: rgba(226,85,85,0.25)`, white background
- Delete text: `fonts.bold`, `typography.xs`, `notoTheme.destructive` (`#EE2336`)

### Chat bubbles

Source: `mobile/components/chat/message-bubble.tsx`

Two roles, mirrored alignment:

**User bubble** (right-aligned):
- Background: `colors.chatUser` (`#1E1E1E`)
- `borderRadius: radii.lg` (20), `borderTopRightRadius: 4` — tail effect top-right
- Text: `fonts.regular`, `typography.sm`, `#FFFFFF`

**Assistant bubble** (left-aligned):
- Background: `colors.chatAssistant` (`#F0EFEB`) — warm cream
- `borderRadius: radii.lg` (20), `borderTopLeftRadius: 4` — tail effect top-left
- Text: `fonts.regular`, `typography.sm`, `#1E1E1E`, `lineHeight: 22`

Both: `maxWidth: 80%`, `paddingHorizontal: spacing.lg`, `paddingVertical: 10`.

**Typing indicator** (empty content):
- Three 6x6 dots, `borderRadius: 3`, `backgroundColor: colors.typingDot` (`#C0BDB8`)
- Row with `gap: spacing.xs`

WhatsApp-style markdown (`*bold*`, `_italic_`, `` `code` ``, `~strike~`, `> quote`) is stripped before rendering in the mobile UI. The raw format is used only for WhatsApp delivery.

---

## Icons

Library: `lucide-react-native`.

Style: outline (not filled). All icons use `strokeWidth` between 1.8 and 2.2 — heavier strokes for interactive icons, lighter for decorative.

Standard interactive icon: `size={18}`, `strokeWidth={2.2}`.
Standard content icon: `size={16}`, `strokeWidth={1.8}` to `1.9`.

Icons are never rendered naked — they sit inside a circular button container of at least 44x44 pt.

---

## Brand Elements — NotoMascot

Source: `mobile/components/ui/noto-mascot.tsx`

The mascot is an animated cloud character with an indigo-to-violet gradient body, arc eyes, cheek blush, and a smile. It has 15 distinct body animations (float, bounce, wiggle, spin, etc.) plus a blink cycle.

**Props:**
- `size` — controls scale uniformly. Default: `260`. Common values: `74` (FAB), `108` (capture hero), `118` (loading splash), `210` (empty state)
- `compact` — when `true`, crops the SVG height to `160 * scale` and hides the rain dots below the body. Use for any context where vertical space is limited

**Usage rules (drawn from existing screens):**

| Context | Size | compact |
|---|---|---|
| FAB | 74 | true |
| Capture hero card | 108 | true |
| Font loading splash | 118 | true |
| Journal empty state | 210 | true |

In the FAB and loading splash, the mascot is wrapped in a white circle with an indigo-tinted shadow. This white circle is the visual "container" — the mascot floats inside it.

The mascot is used for: empty states, the primary capture FAB, the capture hero card, and the loading/onboarding splash. It is not used in headers, settings, or chat.

---

## WhatsApp Formatting

Source: `CLAUDE.md`, `mobile/components/chat/message-bubble.tsx:15`

Messages sent via WhatsApp use formatting that Meta's client renders natively:

| Syntax | Renders as |
|---|---|
| `*text*` | Bold |
| `_text_` | Italic |
| `~text~` | Strikethrough |
| `` `text` `` | Monospace |
| `> text` | Block quote |

Rules:
- Use `*bold*` for labels and field names
- Use `_italic_` for status indicators and context
- Maximum 1–2 emoji per message
- Never exceed 15 lines per message
- Never use emoji as bullets — use `-` or plain text

The mobile app strips all WhatsApp markdown before display because React Native `Text` does not render HTML. The `cleanWhatsAppMarkdown` function in `message-bubble.tsx:15` handles this.

---

## Accessibility

Source: `mobile/lib/theme/tokens.ts:93`, all screen files

**Touch targets:** All interactive elements meet the 44pt minimum. `ICON_BUTTON_SIZE = 44` is the canonical constant. Additional `hitSlop` is applied where the visual element is smaller than 44pt (e.g., the FAB label area uses `hitSlop={8}`).

**Accessibility labels:** All `Pressable` elements carry `accessibilityLabel` and `accessibilityRole="button"`. Text content uses `accessibilityRole="text"`. The chat typing indicator uses `accessibilityLabel="Groot is typing"`.

**Contrast:** Primary text (`#1E1E1E`) on cream background (`#FEFEFE`, `#F0EFEB`) and white cards (`#FFFFFF`) provides high contrast. Subdued text (`#8F887E`, `#A6A29B`) is used only for non-critical metadata (captions, timestamps) where reduced contrast is acceptable.

**Pull-to-refresh:** Uses `tintColor="#C0BDB8"` on iOS and `colors={["#FFBB2C"]}` on Android.
