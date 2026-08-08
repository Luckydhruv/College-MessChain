# MessChain — Design System

Documents the design language that already exists in `src/theme.ts` and `src/components.tsx`, so it can be extended consistently rather than re-invented per screen. It also records where the current system is wrong for Android and needs correcting.

**Source of truth:** `src/theme.ts` for tokens, `src/components.tsx` for components. This file describes them; it does not override them. If the two disagree, fix one of them.

---

## 1. Direction

The app is a dark, glass-surfaced console. Near-black ground, translucent floating cards, one saturated accent per screen, generous corner radii, heavy type for numbers and headings. Content sits on stacked cards inside a single scroll; a floating dock of square tabs anchors the bottom.

It reads as a control room, and that is the right instinct for the subject: a mess register that can't be edited afterwards, presented as an instrument panel rather than a form. The instinct is undermined in a few specific places — see §8.

**The one thing worth keeping deliberately:** the frosted card. `GlassCard` composes a diagonal white gradient (8% → 2%), a dark blur at intensity 38, and a soft border over a translucent zinc fill. It is the app's signature, it is used on 18 of 18 screens, and every layout decision should assume it.

**What to hold back on:** decorative blur orbs, animated pulses, and lock iconography currently appear on screens where nothing is actually locking or syncing. Spend the atmosphere where something real is happening.

---

## 2. Colour

The palette is Tailwind's zinc ramp for neutrals plus five Tailwind accents. Worth knowing, because it means any Tailwind zinc/emerald/violet value will slot in coherently.

### Neutrals

| Token | Value | Tailwind | Use |
|---|---|---|---|
| `background` | `#09090b` | zinc-950 | App ground. Set in `app.json` too. |
| `surface` | `#18181b` | zinc-900 | Opaque card fill where blur isn't available |
| `elevated` | `#1f1f23` | — | Raised surface *(declared, unused)* |
| `border` | `#27272a` | zinc-800 | Hard dividers *(declared, unused)* |
| `borderSoft` | `rgba(39,39,42,0.62)` | zinc-800 @62% | Card borders. The one actually used. |
| `text` | `#fafafa` | zinc-50 | Primary text |
| `muted` | `#a1a1aa` | zinc-400 | Secondary text, labels |
| `softMuted` | `#71717a` | zinc-500 | Placeholders only |

### Accents

| Token | Value | Meaning in this app |
|---|---|---|
| `emerald` | `#10b981` | Success, confirm, healthy, **primary action** |
| `violet` | `#7c3aed` | Secondary action, on-chain / ledger operations |
| `indigo` | `#4f46e5` | Neutral-informational status |
| `amber` | `#f59e0b` | Caution, pending, needs attention |
| `red` | `#ef4444` | Destructive, reject, error |
| `warning` | `#facc15` | yellow-400 — sandbox/beta framing and star ratings |
| `sky` | `#38bdf8` | Chart series only |

**Rule:** one accent leads per screen. Emerald for the primary action, violet for the secondary, red only for genuinely destructive. Amber means a human needs to do something.

### Alpha overlays

Depth comes from white and accent alpha over the near-black ground, not from lighter greys. The ladder in use:

```
white  0.03  tab rest fill
       0.04  brand mark, segment rest
       0.05  input fill, receipt badge, option card, star button
       0.06  chip, toggle track, network button
       0.07  input border, card sub-border
       0.08  card gradient top, copy button, glow orb
       0.09  tab active, segment active
       0.12  toggle track (off)

accent 0.08  ambient tint panel (lock strip, scan result)
       0.16  pill background, tone tint, active chip
       0.18  active chip border, glow orb
       0.32–0.38  strong border (beta card, switch on)
       0.98  button gradient stops
```

Stay on this ladder. A new value between rungs will read as a mistake next to the existing surfaces.

### Tone map

`Pill` and `PrimaryButton` share a `tone` vocabulary. Pills use a 16%-alpha ground with a lightened foreground:

| Tone | Ground | Foreground |
|---|---|---|
| neutral | `rgba(255,255,255,0.07)` | `#fafafa` |
| emerald | `rgba(16,185,129,0.16)` | `#6ee7b7` |
| violet | `rgba(124,58,237,0.16)` | `#d8b4fe` |
| amber | `rgba(245,158,11,0.16)` | `#fcd34d` |
| red | `rgba(239,68,68,0.16)` | `#fca5a5` |
| indigo | `rgba(79,70,229,0.16)` | `#a5b4fc` |

Buttons use a diagonal gradient from the accent to a darker relative, both at 98% alpha:

```
emerald   rgba(16,185,129,.98) → rgba(6,95,70,.98)
violet    rgba(124,58,237,.98) → rgba(67,56,202,.98)
amber     rgba(245,158,11,.98) → rgba(217,119,6,.98)
red       rgba(239,68,68,.98)  → rgba(190,18,60,.98)
```

---

## 3. Type

**No custom fonts are loaded.** `expo-font` is listed in `app.json` `plugins`, but nothing calls `useFonts` or `loadAsync`. Everything renders in the platform default — Roboto on Android. All the personality currently comes from weight and negative tracking, not from typeface.

If a display face is ever added, add it deliberately for headings and numerals only, and keep body text on the system face for legibility and load time. Until then, don't reference a font family that isn't loaded.

### Scale in use

| Size | Weight | Tracking | Role |
|---|---|---|---|
| 34 | 900 | −1 | Brand wordmark (login only) |
| 28 | 900 | −0.8 | Metric value |
| 26 | 900 | −0.5 | Screen title |
| 21 | 800–900 | −0.4 | Section heading, overlay title |
| 20 | 900 | — | Profile name, ring value, avatar initials |
| 18 | 800–900 | — | Card heading, chart title |
| 16 | 800 | — | List item title |
| 15 | 800 | — | Inline card title, camera label |
| 14 | 400–800 | — | Input value, toggle label, body emphasis |
| 13.5 | 800 | — | Button label |
| 13 | 400 | 1.5× line | Body copy |
| 12.5 | 700 | — | Dense secondary, chip label |
| 12 | 400–700 | — | Field label, metric label, pill |
| 11 | 400–700 | 1.6 upper | Eyebrow, tab label, badge label |

Line height is set explicitly on body copy — 18–22 at 12–13px, roughly 1.5×. Keep doing that; RN's default leading is tight on Android.

**Two rules that hold across the codebase:** headings and numbers get weight 800–900 with negative tracking; labels and metadata get weight 700 at 11–12px, and eyebrows get uppercase with `letterSpacing: 1.6`. Nothing uses italics or weight 500/600.

### Monospace is currently broken on Android

`walletMono` and `scanResultValue` set `fontFamily: 'Courier'`. Courier does not exist on Android; the platform silently falls back to the default sans-serif. So wallet addresses and scanned QR payloads — the two places where character alignment actually matters — render proportional.

Fix: `Platform.select({ ios: 'Courier', android: 'monospace', default: 'monospace' })`, or add a bundled mono face. Add a `mono` token to `theme.ts` so this is decided in one place.

---

## 4. Space, radius, elevation

**Spacing** is a loose 2px-step scale rather than a strict ramp. Values in use: `3 4 5 6 8 10 12 14 16 18 24`. Practical defaults:

```
card padding          18
gap between cards     12
section spacing       14–16
inline element gap    10
label → control       8
input padding         14 horizontal / 12 vertical
screen h-padding      12 (shell) / 20 (login)
```

**Radius** is generous and carries hierarchy:

```
999  pills, progress tracks, dots, switch
 28  GlassCard  ← the signature
 26  camera frame
 22  avatar
 20  tab, segment, inline panel, ambient strip
 18  button, input, option row
 16  chip, badge
 14  small square button
 12  skeleton block
```

Cards are the roundest thing on screen and everything nests inward from 28. A new container should land on 20 if it sits inside a card, 28 if it *is* the card.

**Elevation** exists on `GlassCard` alone:

```
shadowColor  #000   shadowOpacity 0.38
shadowRadius 24     shadowOffset  {0, 14}
elevation    10                        ← Android
```

Note that on Android `elevation` ignores `shadowRadius`, `shadowOffset`, and `shadowColor` entirely; only the elevation number applies. The soft, offset, dramatic shadow visible on iOS is not what Android renders. If depth matters on Android, it has to come from the border and the alpha ramp, not the shadow — worth verifying on device before tuning anything.

**Touch targets:** buttons `minHeight: 48`, pills `minHeight: 30`, tabs `72×72`, star buttons `42×42`. 48 clears Android's 48dp guidance; the 30 and 42 do not, and any pill that becomes tappable needs padding to reach 48.

---

## 5. Component inventory

All in `src/components.tsx` — 13 exports plus `copyToClipboard`. Usage counts are actual.

| Component | Used in | Notes |
|---|---|---|
| `GlassCard` | **18** | Gradient + BlurView + padded inner. Accepts `style`. The base of everything. |
| `SectionTitle` | **18** | `eyebrow` / `title` / optional `subtitle`. Several screens pass `eyebrow=""` — the element still renders, leaving a 6px gap. Make it optional. |
| `Pill` | 9 | Status chip. `tone` + optional Feather `icon`. |
| `PrimaryButton` | 8 | Gradient CTA. `tone`, `icon`, `loading`, `danger`. Loading swaps the icon for a **static** `loader` glyph and the label for "Processing" — it doesn't spin. |
| `TextField` | 4 | Label + input. Supports `multiline`, `rows`, `secureTextEntry`, `keyboardType`. |
| `ReceiptBadge` | 4 | Small label/value pair for hashes and metadata. |
| `LockClockIcon` | 3 | 86×86 SVG padlock-clock. |
| `ToggleRow` | 2 | Label + description + switch. Custom, not RN `Switch`. |
| `SkeletonBlock` | 2 | Shimmering placeholder, 1150ms opacity loop. |
| `StatusBanner` | 1 | Pulse dot + network pill + wallet + copy. **Contains the network fiction — see §8.** |
| `MetricRing` | 1 | 108px SVG progress ring with centred value. |
| `BottomTab` | 1 | 72×72 dock item, lifts 3px when active. |
| `SegmentedControl` | **0** | Fully built, never used. Either adopt it (the meal-window chips and the network chooser are both hand-rolled versions of it) or delete it. |

**Gaps.** Building any of these needs a new shared component rather than another local copy:

- **Toast / snackbar.** Only one screen surfaces an async result at all, via `Alert.alert`.
- **Error state.** No component exists. Every failure renders as an empty screen.
- **Empty state.** Same.
- **Modal / bottom sheet.** The two overlays in `App.tsx` are `pointerEvents="none"` decorations, not dismissible surfaces.
- **Date picker.** Needed for rebate requests; nothing exists.
- **QR display.** Needed for the staff screen; nothing exists.
- **List row.** `listTitle` / `listBody` styles are copy-pasted verbatim across six screens.

That last one is the clearest signal: identical style blocks duplicated six times means the abstraction is missing.

---

## 6. Layout

### Shell

```
SafeAreaView  (background #09090b)
├── absolute glow orbs                  240×240, radius 999, opacity 0.7
├── ScrollView
│   └── centred column, width = min(860, screenWidth − 32)
│       ├── top bar   title + subtitle · network toggle · logout
│       ├── (profile only) StatusBanner
│       └── route content — a stack of GlassCards
└── absolute bottom dock                horizontal ScrollView of BottomTabs
```

Content is capped at 860px and centred, which is how the same code serves phone and tablet. The dock is absolutely positioned with the scroll container padded by a hardcoded `208` to clear it — brittle; derive it from measured dock height.

Grid columns are computed from `useWindowDimensions`: `≥980 → 3`, `≥720 → 2`, else 1, with widths `'31.5%' | '48%' | '100%'`. Consistent across the two dashboards and the feedback report.

### Screen anatomy

Every screen follows the same shape, and new ones should:

```
<View>
  <SectionTitle eyebrow="…" title="…" subtitle="…" />
  <GlassCard>            ← primary content
    …
    <View style={inlineActions}>   ← flexDirection row, gap 10, flexWrap
      <PrimaryButton … />
      <Pill … />
    </View>
  </GlassCard>
</View>
```

Lists repeat `<GlassCard style={{marginBottom:12}}>` per item. `inlineActions` is redeclared identically in seven files.

**Wrapping.** Almost every row sets `flexWrap: 'wrap'` with a `gap`. Keep this — it's what stops the dense card headers breaking at 360dp.

### Motion

Three animations exist, all `useNativeDriver: true`:
- `StatusBanner` pulse dot: 1 → 1.32 → 1, 900ms each leg, infinite.
- `SkeletonBlock` shimmer: opacity 0.48 → 0.92 → 0.48 over 1150ms, infinite.
- Press feedback: `translateY: -1|-2` and `scale: 0.98|0.99` on `Pressable`.

The press-lift is the app's most characteristic micro-interaction and is applied consistently. Keep it.

**Not respected:** `prefers-reduced-motion`. Both infinite loops should check `AccessibilityInfo.isReduceMotionEnabled()`.

---

## 7. Voice

Current copy is uneven. The instrument-panel register works when it describes something real ("Time lock active", "API Node: Synchronized") and collapses when it doesn't.

**Keep:** short, technical, specific. "Rebates ledger". "Complaint feed". "Time lock active".

**Drop:** the pseudo-technical filler. Real examples in the codebase — "Multi-sig consensus is sealing the rebate execution against the selected ledger", "A safety-hazard border treatment for pending architecture routes and ecosystem switching", "Operational Rating Score", "Failed to parse on-chain block record" (shown when a network request failed). These describe processes that don't happen, in language nobody uses.

Rules:
- Sentence case everywhere, including buttons.
- Name the action: "Approve rebate", not "Submit". Confirm with the same verb: "Rebate approved".
- Errors state what happened and what to do next. No apology, no vagueness, no raw backend string. The backend's "Have you run the midnight cron?" becomes "Today's meal hasn't been posted yet."
- Empty states invite an action.
- One job per element. `SectionTitle`'s `subtitle` currently sometimes explains the feature and sometimes describes the visual treatment; it should always be the former.
- Never describe cryptography that isn't happening.

---

## 8. Corrections needed

The design system carries three product falsehoods and several Android-specific defects.

### Falsehoods to remove

**The network switch.** `networkModes` in `theme.ts` defines a Polygon mode (emerald, badge "POL", "Low-fee EVM settlement") and a Hyperledger mode (violet, "HLC", "Permissioned enterprise ledger"). The default is **Polygon**. The system runs on a single-validator Hyperledger Besu QBFT chain and has no Polygon integration at all. The switch changes accent colours and copy.

This is not a harmless stub — an administrator reading the status banner is being told something false about where their institution's records live, and told the false thing by default. Remove `networkModes`, the `NetworkKind` type, the toggle in the top bar, `BetaSettingsScreen` (which exists to host it), the network row in staff Settings, and the network props on `StatusBanner`.

Consequence for the palette: emerald and violet stop meaning "which chain" and revert to meaning "primary" and "secondary". That is a simplification, not a loss.

**The overlays.** `App.tsx` renders two full-screen overlays: one claiming "Multi-sig consensus is sealing the rebate execution" with "Quorum: 4 of 5 validators", and one claiming "Settlement sealed" with receipt hash `0x8c9f...4a71` at block time `12:41:22 UTC`. The chain has one validator. The hash and time are string literals. They appear after an admin taps Approve — an action that currently makes no API call at all.

Delete both. Replace with a single confirmation showing the real `txHash` the backend returned.

**The fabricated metrics.** The admin dashboard's four KPIs, the feedback report's 92% ring and five category bars, and the profile's "identity score / on-chain logs: 42 / sync: Green" are all constants in `src/data.ts`. `MetricRing` and the bar chart are good components rendering invented data. **Keep the components, delete the constants.** Both get real data in `phases.md` Phase 5 — the dashboard from derived counts, the feedback report from client-side aggregation over an agreed JSON schema. See `prd.md` A-3 and A-7.

### Android defects

| Issue | Fix |
|---|---|
| `fontFamily: 'Courier'` doesn't exist on Android; silently falls back to sans-serif in the two places alignment matters | `Platform.select` or a bundled mono; add a `mono` token to `theme.ts` |
| `elevation: 10` ignores `shadowRadius` / `shadowOffset` / `shadowColor`; Android renders a different depth than iOS | Verify on device; lean on borders and the alpha ramp for depth |
| Adaptive icon background `#E6F4FE` (pale blue) against an app ground of `#09090b` | Align the icon background with the palette |
| `paddingBottom: 208` hardcoded to clear the dock | Measure dock height, derive the pad |
| Pills (30px) and star buttons (42px) below Android's 48dp target when tappable | Pad to 48 |
| `BlurView` at intensity 38 on 18 stacked cards is a real cost on mid-range Android GPUs | Profile on a low-end device; consider an opaque `surface` fallback below an API level or when the list is long |
| Two infinite animation loops ignore reduce-motion | Gate on `AccessibilityInfo` |
| No accessibility labels, roles, or hints anywhere; icon-only controls (copy, tab, star) are unlabelled to TalkBack | Add `accessibilityLabel` / `accessibilityRole` to every `Pressable` |
| `PrimaryButton` loading state shows a static `loader` glyph | Use `ActivityIndicator` |
| Contrast: `softMuted #71717a` on `rgba(255,255,255,0.05)` over `#09090b` sits near 3.9:1 — below 4.5:1 for body text | Placeholders only, as now; never body copy. Verify `muted #a1a1aa` (~8:1, fine). |
| `SectionTitle` renders an empty eyebrow when passed `""` | Make `eyebrow` optional |
| `inlineActions`, `listTitle`, `listBody` duplicated across 6–7 files | Extract shared styles or a `ListRow` component |

### Missing to build

Four screens need new design work, and each pushes on the system in a different direction.

- **Staff mess QR display** — full-screen, high-contrast, brightness-boosted, wake-locked. The only light-on-dark inversion in the app, since a QR needs a white ground. Design it as a deliberate exception rather than trying to force the dark palette onto it.
- **Student "my QR"** *(if Gate E adopts the staff-scans-student direction)* — same inversion problem at smaller scale, and it has to stay readable while a staff member points a camera at it from across a counter.
- **Student rebate date range picker** — the three contract constraints (future start, end after start, ≤15 days) expressed as **inline validation**, not error toasts. The constraint should be visible before the user trips it: disable earlier dates rather than rejecting them afterwards.
- **Admin student roster** — the app's first genuinely long list. The card-per-item pattern at 18px padding becomes unusable past roughly 20 rows, so this needs a denser row treatment and `FlatList` rather than a mapped `ScrollView`. It is also the place to establish what a compact row looks like in this system, since nothing else has needed one.

---

## 9. Adding a screen

1. `src/screens/<role>/<Name>Screen.tsx`, default export, `StyleSheet.create` at the bottom.
2. Open with `SectionTitle`; put content in one or more `GlassCard`s.
3. Data via a hook returning `{ data, loading, error, refetch }`. Render all four states — `SkeletonBlock` for loading, and error and empty are not optional (see §5 gaps).
4. Tokens from `theme.ts`. New value → new token, not inline.
5. One leading accent. Primary action emerald, secondary violet, destructive red.
6. Radius: 20 inside a card, 28 for the card. Card padding 18, card gap 12, inline gap 10.
7. Rows get `flexWrap: 'wrap'` and a `gap`.
8. Every `Pressable` gets press feedback (`translateY: -1`, `scale: 0.98`) and an `accessibilityLabel`.
9. Register the route id in `theme.ts` tabs **and** in the router — both, or you get the staff-dashboard bug where a tab renders active while showing a different screen.
10. Check it at 360dp width and at 860px. Then check it on a physical Android device.
