Read `AGENTS.md` first and follow it strictly.

Reference: `prompts/10e-profile-ui.md`, `prompts/10g-help-center-ui.md`, `constants/profile-theme.ts`

Implement the **Privacy & terms** flow reachable from Profile → Settings → Privacy & terms.

## Goal

Replace the Settings **Privacy & terms** stub with a small nested stack:

1. **Privacy hub** — three navigation rows
2. **Privacy policy screen** — in-app legal copy (sectioned)
3. **Terms of service screen** — in-app legal copy (sectioned)
4. **Data & cookies screen** — in-app legal copy (sectioned)

No external website or WebBrowser link is required for v1.

## Prerequisites

- `prompts/10e-profile-ui.md` — Profile settings screen and row/section patterns
- `prompts/10g-help-center-ui.md` — nested stack + shared screen shell pattern
- `prompts/09-bottom-tab-nav.md` — Profile stack under `(tabs)/profile`

## Dependencies

Use existing packages only: `expo-router`, `expo-haptics`, `@expo/vector-icons`, `react-native-safe-area-context`.

## Route & files

| Path                                              | Purpose                                      |
| ------------------------------------------------- | -------------------------------------------- |
| `app/(tabs)/profile/privacy.tsx`                  | Hub — links to policy, terms, data & cookies |
| `app/(tabs)/profile/privacy-policy.tsx`           | Privacy policy document screen               |
| `app/(tabs)/profile/privacy-terms-of-service.tsx` | Terms of service document screen             |
| `app/(tabs)/profile/privacy-data-and-cookies.tsx` | Data & cookies document screen               |
| `app/(tabs)/profile/_layout.tsx`                  | Register all privacy screens (flat stack)    |
| `app/(tabs)/profile/settings.tsx`                 | Navigate to `/(tabs)/profile/privacy`        |
| `constants/legal.ts`                              | `LEGAL_LAST_UPDATED` + document metadata     |
| `data/legal-documents.ts`                         | Typed sectioned copy for all three documents |
| `components/profile/privacy-document-content.tsx` | Renders last-updated + section blocks        |

Reuse `HelpCenterScreenShell` for shared header + scroll chrome (same as Help center).

## Navigation flow

```text
Settings
  └── Privacy & terms (hub)
        ├── Privacy policy
        ├── Terms of service
        └── Data & cookies
```

Routes:

- Hub: `/(tabs)/profile/privacy`
- Privacy policy: `/(tabs)/profile/privacy-policy`
- Terms: `/(tabs)/profile/privacy-terms-of-service`
- Data & cookies: `/(tabs)/profile/privacy-data-and-cookies`

## Screen layout

All screens share `HelpCenterScreenShell` — same `SafeAreaView` + `WorldLoopHeader` back pattern as Help center, with profile theme tokens.

| Screen         | Title            | Back label              |
| -------------- | ---------------- | ----------------------- |
| Hub            | Privacy & terms  | Back to settings        |
| Privacy policy | Privacy policy   | Back to privacy & terms |
| Terms          | Terms of service | Back to privacy & terms |
| Data & cookies | Data & cookies   | Back to privacy & terms |

### Hub — `privacy/index.tsx`

Single `ProfileSettingsSection` titled **Legal** with three rows:

| Row              | Icon                       | Route                               |
| ---------------- | -------------------------- | ----------------------------------- |
| Privacy policy   | `shield-checkmark-outline` | `/profile/privacy-policy`           |
| Terms of service | `document-text-outline`    | `/profile/privacy-terms-of-service` |
| Data & cookies   | `finger-print-outline`     | `/profile/privacy-data-and-cookies` |

### Document screens

Each document screen:

- Section title: **Overview** (or document-specific label)
- `PrivacyDocumentContent` renders:
  - muted **Last updated** line from `LEGAL_LAST_UPDATED`
  - stacked sections with title + paragraph blocks from `data/legal-documents.ts`

```ts
export type LegalDocumentSection = {
  id: string;
  title: string;
  paragraphs: string[];
};

export type LegalDocument = {
  id: string;
  title: string;
  sections: LegalDocumentSection[];
};
```

Required document ids:

| id                 | title            |
| ------------------ | ---------------- |
| `privacy-policy`   | Privacy policy   |
| `terms-of-service` | Terms of service |
| `data-and-cookies` | Data & cookies   |

Copy should mention WorldLoop, Clerk auth, local storage (AsyncStorage/Zustand), third-party APIs (REST Countries, Unsplash/Pexels/Wikipedia, OpenAI via backend), and that content is for educational/portfolio use.

## Data wiring

```ts
// constants/legal.ts
export const LEGAL_LAST_UPDATED = "June 16, 2026";
```

```tsx
// settings.tsx
onPress={() => router.push("/(tabs)/profile/privacy")}
```

## Styling rules

- Reuse profile theme tokens from `constants/profile-theme.ts`
- NativeWind for text; `StyleSheet` for section spacing and borders
- Section titles: `15px` medium white; body: `14px` subtitle color with `21px` line height

## Out of scope

- Hosted privacy policy URL / in-app browser
- Cookie consent banner
- GDPR export/delete request flows
- Backend legal CMS

## Manual test plan

1. Settings → **Privacy & terms** opens the hub
2. Hub → each row opens its document screen
3. Back from child screens returns to hub; back from hub returns to Settings
4. Document sections render with readable spacing
5. Tab bar remains visible throughout

## Follow-up (later lesson)

- Link to hosted legal pages on worldloop.app
- Locale-specific legal copy
- Accept terms checkbox during sign-up (Clerk `legalAccepted`)
