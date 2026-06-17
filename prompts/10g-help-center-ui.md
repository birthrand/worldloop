Read `AGENTS.md` first and follow it strictly.

Reference: `prompts/10e-profile-ui.md`, `AGENTS.md`, `constants/profile-theme.ts`

Implement the **Help center** flow reachable from Profile → Settings → Help center.

## Goal

Replace the Settings **Help center** stub with a small nested stack:

1. **Help center hub** — three navigation rows
2. **FAQs screen** — expandable accordion list
3. **Guides screen** — expandable step-by-step walkthroughs
4. **Contact support screen** — support email with copy-to-clipboard

No external help URL is required.

## Prerequisites

- `prompts/10e-profile-ui.md` — Profile settings screen and `ProfileSettingsRow` / `ProfileSettingsSection` patterns
- `prompts/09-bottom-tab-nav.md` — Profile stack under `(tabs)/profile`

## Dependencies

```bash
npx expo install expo-clipboard
```

Also use existing packages: `expo-router`, `expo-haptics`, `@expo/vector-icons`, `react-native-safe-area-context`.

## Route & files

| Path                                              | Purpose                                         |
| ------------------------------------------------- | ----------------------------------------------- |
| `app/(tabs)/profile/help-center/_layout.tsx`      | Nested stack for help center screens            |
| `app/(tabs)/profile/help-center/index.tsx`        | Hub — links to FAQs, Guides, Contact            |
| `app/(tabs)/profile/help-center/faqs.tsx`         | FAQ accordion screen                            |
| `app/(tabs)/profile/help-center/guides.tsx`       | Guides accordion screen                         |
| `app/(tabs)/profile/help-center/contact.tsx`      | Contact support screen                          |
| `app/(tabs)/profile/_layout.tsx`                  | Register `help-center` nested stack             |
| `app/(tabs)/profile/settings.tsx`                 | Navigate to `/(tabs)/profile/help-center`       |
| `constants/support.ts`                            | `SUPPORT_EMAIL` constant                        |
| `data/help-center-faqs.ts`                        | Typed FAQ catalog                               |
| `data/help-center-guides.ts`                      | Typed guide catalog with numbered steps         |
| `components/profile/help-center-screen-shell.tsx` | Shared header + scroll chrome                   |
| `components/profile/help-center-faq-item.tsx`     | Single expandable FAQ row                       |
| `components/profile/help-center-guide-item.tsx`   | Single expandable guide row with numbered steps |
| `components/profile/help-center-contact-row.tsx`  | Email display + copy button                     |

## Navigation flow

```text
Settings
  └── Help center (hub)
        ├── FAQs
        ├── Guides
        └── Contact support
```

Routes:

- Hub: `/(tabs)/profile/help-center/index`
- FAQs: `/(tabs)/profile/help-center/faqs`
- Guides: `/(tabs)/profile/help-center/guides`
- Contact: `/(tabs)/profile/help-center/contact`

## Screen layout

All screens share `HelpCenterScreenShell` — same `SafeAreaView` + `WorldLoopHeader` back pattern as `settings.tsx`, with profile theme tokens.

| Screen  | Title           | Back label          |
| ------- | --------------- | ------------------- |
| Hub     | Help center     | Back to settings    |
| FAQs    | FAQs            | Back to help center |
| Guides  | Guides          | Back to help center |
| Contact | Contact support | Back to help center |

### Hub — `help-center/index.tsx`

Single `ProfileSettingsSection` titled **Support** with three rows:

| Row             | Icon                          | Route                  |
| --------------- | ----------------------------- | ---------------------- |
| FAQs            | `chatbubble-ellipses-outline` | `/help-center/faqs`    |
| Guides          | `book-outline`                | `/help-center/guides`  |
| Contact support | `mail-outline`                | `/help-center/contact` |

### FAQs screen

- Section title: **Common questions**
- Render all items from `HELP_CENTER_FAQS`
- Accordion: one FAQ open at a time

```ts
export type HelpCenterFaq = {
  id: string;
  question: string;
  answer: string;
};
```

### Guides screen

- Section title: **Walkthroughs**
- Render all items from `HELP_CENTER_GUIDES`
- Accordion: one guide open at a time
- Collapsed: title + summary; expanded: numbered steps

```ts
export type HelpCenterGuide = {
  id: string;
  title: string;
  summary: string;
  steps: string[];
};
```

Required guides:

| id                   | title                    |
| -------------------- | ------------------------ |
| `explore-swipe-feed` | Explore the swipe feed   |
| `world-map`          | Navigate the world map   |
| `save-places`        | Save places for later    |
| `visited-countries`  | Track visited countries  |
| `landmarks`          | Browse country landmarks |

### Contact screen

- Section title: **Get in touch**
- `HelpCenterContactRow` with `birthrand@gmail.com` and copy button
- Copy uses `expo-clipboard` + success haptic + alert

## Data wiring

```ts
// constants/support.ts
export const SUPPORT_EMAIL = "birthrand@gmail.com";
```

```tsx
// settings.tsx
onPress={() => router.push("/(tabs)/profile/help-center/index")}
```

## Styling rules

- Reuse profile theme tokens from `constants/profile-theme.ts`
- Guide step badges: numbered circles using `PROFILE_COMPLETION_ACCENT`
- NativeWind for text; `StyleSheet` for row layout and borders

## Out of scope

- External help site / WebBrowser link
- Deep links from guide steps into tabs
- In-app email composer (`mailto:`)
- Backend support ticket API

## Manual test plan

1. Settings → **Help center** opens the hub
2. Hub → **FAQs** / **Guides** / **Contact support** each open their own screen
3. Back from child screens returns to hub; back from hub returns to Settings
4. FAQ and Guide accordions expand/collapse correctly
5. Copy on Contact confirms and pastes `birthrand@gmail.com`
6. Tab bar remains visible throughout

## Follow-up (later lesson)

- Deep links from guide steps (e.g. “Open Explore” button)
- Privacy & terms screen
- Optional `mailto:` beside copy
- Search within FAQs / Guides
