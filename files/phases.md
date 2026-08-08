# MessChain Android — Delivery Phases

**Last updated:** 2026-07-28
Companions: `prd.md` (requirements), `architecture.md` (§6 defect register), `rules.md` (§11 definition of done), `design.md`, `memory.md`.

Defect numbers (`D1`–`D29`) refer to **`architecture.md` §6**. Requirement IDs (`S-1`, `A-6`, `T-1`, `X-5`…) refer to **`prd.md` §4–5**. Move a defect out of §6 in the same commit that fixes it (R10.5).

**Sizing** is relative — S / M / L — not calendar time.

---

## The governing constraint

> **The backend, contracts, and infra in `MessChain2.0/` are complete and receive zero changes. All work is frontend and integration.**

Every previously-open backend ask (8-A … 8-G) is **withdrawn**. The Android app is built against the **27 routes that exist today** and nothing else. `architecture.md` §5 lists them.

This is a real constraint, not a formality, and it has two consequences worth stating plainly.

**Cut from scope:**

| Cut | Why |
|---|---|
| **Student voting** (S-5) | No route lists polls. `services/governance.js` has `getPoll`, `getPollCount`, `getPollVotes` — written, exported, and called by no controller. `POST /api/student/vote` accepts a vote, but a student cannot discover a poll's existence, question, options, or tallies. Not shippable honestly. |
| **Admin poll creation** (A-5) | Follows directly. A poll nobody can read or tally is a write-only feature — an admin would publish something invisible. Cutting the reader forces cutting the writer. |

Note this narrows what the product is: `MessChain2.0/README.md` describes a *"subscription, rebate, and voting governance system."* Under this constraint it becomes a subscription and rebate system with complaint and feedback capture. Worth being explicit about with whoever owns the product framing — it is a scope decision, not a technical detail.

**Recovered without touching the backend** — two things I initially had as blocked that are pure frontend work:

| Recovered | How |
|---|---|
| **Second meal-verification direction** (staff scans student) | `POST /api/staff/verify-qr` is fully implemented and **used by neither client**. It needs `{ studentId }`; `GET /api/student/profile` already returns `id`. So a student screen renders a QR of their own `id`, staff scans it. The endpoint computes the date server-side (replay-resistant), returns the student's name and roll number so staff sees who they verified, and handles no-charge (404) and already-verified (409). Free, and it is the direction that actually proves physical presence. See Gate E. |
| **Real feedback report** (A-3) | The backend stores feedback `text` as opaque IPFS content and returns it as `content`. If the student and admin screens **agree on a JSON schema** for that field, the admin can aggregate client-side. The five-category bar chart can carry real data — the categories become a client-side convention encoded in the payload. Requires 3.4 to land first, and only parses entries submitted after the schema ships. |

---

## Why this order

1. **The app currently lies to administrators.** Rebate approval is an animation with no API call, dressed with a fabricated hash and a fabricated validator quorum. Removing falsehoods is almost entirely *deletion* — no backend, no decisions, no design — so it goes first and ships fast.
2. **Plumbing before screens.** The API client has no timeout and no 401 handling, and `launchProcessing` fires callbacks after a fixed 1.2s without awaiting them. Every screen that reports an outcome goes through that primitive. Wire screens onto it as-is and you rework all of them later.
3. **Analytics last, because it depends on a data convention.** The feedback report can only be real once students are submitting structured JSON, so it trails the submission work by a phase.

```
Phase 0  Truth           deletion only ─── no dependencies ─── ship immediately
              │
Phase 1  Foundation      transport · session · error contract · shared components
              │               ▲
              │               └── needs Gate A (cleartext HTTP)
              ▼
Phase 2  Core flows      claim meal · rebate request · rebate approval
              │               ▲
              │               └── 2.0 test enablement is the first item, not optional
              ▼
Phase 3  Surface         staff QR · complaints read · submissions · mess change
              │               ▲
              │               └── needs Gate B (registration) + Gate E (QR direction)
              ▼
Phase 4  Android         navigation · back button · a11y · perf ─── APK
              │
              ▼
Phase 5  Insight         real dashboard · real feedback report  (unblocked, needs 3.4)
              │
              ▼
Phase 6  Future scope    web dashboard, parked
```

Phases 0 and 1 can overlap — one is deletion, the other construction, and they barely touch the same files. 2 → 3 → 4 are genuinely sequential. Phase 5 needs only 3.4 and can slip without blocking a release.

---

## Phase 0 — Truth

**Goal:** nothing in the app displays a value that isn't real. Screens may be empty. None may lie.

**Size:** S · **Blocks on:** nothing · **Can start:** now

~90% deletion. No backend, no decisions, no new design, no new components. Highest value-to-risk ratio in the plan.

| # | Work | Defect |
|---|---|---|
| 0.1 | Delete both full-screen overlays in `App.tsx` — "Multi-sig consensus…", "Quorum: 4 of 5 validators", receipt hash `0x8c9f...4a71`, block time `12:41:22 UTC` | D14 |
| 0.2 | **Disable the rebate Approve button** until Phase 2 wires it. Do not leave it tappable. | D1 |
| 0.3 | Delete the network toggle: `networkModes`, `NetworkKind`, the top-bar switch, `BetaSettingsScreen`, the staff Settings network row, `StatusBanner`'s network props | D13 |
| 0.4 | Rename `NetworkContext` → `UiStateContext`, keeping `processing` / `launchProcessing` / overlay plumbing (11 screens depend on it) | D13 |
| 0.5 | Remove fabricated metrics: admin dashboard KPIs, feedback ring + 5 category bars, profile "identity score / on-chain logs: 42 / sync: Green". Honest empty states. **Keep `MetricRing` and the bar chart components** — Phase 5 gives them real data. | D16 D17 D18 |
| 0.6 | **Delete the Vote screen and tab, and `submitVote`.** Cut, per the governing constraint. | — |
| 0.7 | **Delete the Create Poll screen and tab, and `schedulePoll`.** Cut, per the governing constraint. | D21 |
| 0.8 | Delete dead code: `screens/staff/StaffDashboardScreen.tsx`, `utils/roleResolver.ts`, `api/blockchain.ts`, the duplicated `walletAddress` literal in `App.tsx` | D23 D24 D25 |
| 0.9 | Delete the `__DEV__` demo-credentials block in `AuthContext` | D9 |
| 0.10 | Fix `.env.example`: drop the `/api` suffix; delete the seven unread variables | D10 D26 |
| 0.11 | Reconcile `staffTabs` / `roleMenus.staff` / `roleHome.staff` so no tab renders active while showing a different screen | D22 |
| 0.12 | Remove the "Limited Access" toggle (controls nothing) | D20 |
| 0.13 | Strip `₹` from anything showing a token balance | D19 |

**Exit criteria**
- [ ] `grep -rn "0x8c9f\|4 of 5\|Polygon\|POL\b" src/ App.tsx` → nothing
- [ ] No `poll` or `vote` references remain in `src/`
- [ ] No success confirmation appears without a resolved API call (R2.2)
- [ ] No metric on screen is a constant (R2.4)
- [ ] `npx tsc --noEmit` clean
- [ ] Walked every screen in all three roles on a device; nothing displayed is fabricated

**Not in this phase:** making anything work. Honest and empty beats populated and false.

---

## Phase 1 — Foundation

**Goal:** the plumbing is correct, proven by one vertical slice.

**Size:** M · **Blocks on:** Gate A · **Blocks:** everything after it

| # | Work | Ref |
|---|---|---|
| 1.1 | `client.ts`: request timeout, `AbortController`, in-memory token cache (stop reading SecureStore per call) | D27 |
| 1.2 | Global 401 interceptor → clear session, return to login, "Your session expired. Sign in again." | D8 X-1 |
| 1.3 | Validate JWT `exp` at bootstrap before restoring a stored session (no `/auth/me` exists — decode locally) | D8 X-1 |
| 1.4 | Rewrite `launchProcessing` to **await** the real promise and expose success/failure. Highest-leverage fix in the phase — twelve modules consume this context: ten screens, `App.tsx`, and `useRebates`. | D12 |
| 1.5 | Standardise every hook to `{ data, loading, error, refetch }`. `error` is not optional. | D28 X-3 |
| 1.6 | Build the missing shared components: `ErrorState`, `EmptyState`, `Toast`. None exist; every failure currently renders blank. | design.md §5 |
| 1.7 | Envelope-unwrapping convention in `api/*` — every response is an object, never a bare array | D2 R3.1 |
| 1.8 | Runtime-configurable backend URL in dev builds (no rebuild to change host) | X-5 |
| 1.9 | Resolve cleartext HTTP for device testing | D11 X-6 |
| 1.10 | Pull-to-refresh on every list | X-4 |

**Exit criteria — the vertical slice**

Take **student profile + balance** (closest to real already) and demonstrate all six states on a physical device:

- [ ] Loads real data
- [ ] Backend stopped → error state with a reason and a working retry
- [ ] Empty response → empty state with a next action
- [ ] Pull-to-refresh works
- [ ] Expired token → clean logout with an explanation
- [ ] A mutation elsewhere shows a spinner tied to the *actual* request duration, and surfaces failure

If the slice doesn't hold, don't start Phase 2. Every screen after it inherits whatever this phase leaves broken.

---

## Phase 2 — Core flows

**Goal:** the three things the product exists to do, working on a physical device.

**Size:** L · **Blocks on:** Phase 1 exit

**2.0 — Test enablement, first** *(A-6)*
A meal claim cannot be tested until the day's charge exists on chain and the student holds ≥ 27 tokens. Build these first or the phase is unverifiable. All four endpoints exist and have no UI:
- Student roster — `GET /api/admin/students` (live balances). The app's first genuinely long list: use `FlatList` and a denser row, not card-per-item (design.md §8).
- Mint tokens — `POST /api/admin/mint-tokens`
- Semester enrolment — `POST /api/admin/semester-enrollment`
- Trigger cron — `POST /api/admin/trigger-cron`

**2.1 — Claim a meal** *(S-1, D4)*
The flow that has never worked. Reference: `MessChain2.0/frontend/src/components/StudentTab.jsx`.
- `JSON.parse` the QR, check `type === 'MESS_VERIFICATION'`, send `data.messId` — not the raw string
- Debounce on payload; lock the scanner while a request is in flight (R5.10)
- Map all five failure modes to human copy; never surface the backend's "Have you run the midnight cron?" (R2.7)
- Refetch balance after success

**2.2 — Request a rebate** *(S-3)*
New screen. Reference: `StudentTab.jsx` for the `Math.floor(date / 1000)` conversion.
- Date range picker defaulting to **tomorrow** — `fromDate` must be strictly future
- Validate all three contract constraints inline before submit: future start, `toDate > fromDate`, range ≤ 15 days (R3.7)
- Inline validation, not error toasts (design.md §8)
- **Submit-only.** No route lets a student list their own rebates. Confirmation copy must be honest: "Submitted for approval. If approved, you won't be charged for those days." Do not imply a status screen exists.

**2.3 — Approve / reject a rebate** *(A-1, D1, D5)*
The defect that motivated Phase 0. Reference: `AdminTab.jsx`.
- `GET /api/admin/rebates`, unwrap `{rebates:[…]}`, filter `status === 0`
- Integer array-index `id` — never `parseInt` a display label
- Await the response; no optimistic UI on a financial decision (R2.2)
- Resolve `student` wallet addresses to names via the 2.0 roster, or show a truncated address. Never invent a name.
- No `amount` field exists on a rebate — compute days × rate and label it an estimate, or omit it
- Re-enable the button disabled in 0.2

**Exit criteria**
- [ ] The recipe in `memory.md` §8 passes on a physical device: seed → mint → trigger-cron → scan → balance drops
- [ ] Second scan same day → "already claimed", not a crash
- [ ] Skip trigger-cron → "meal hasn't been posted yet", not the cron string
- [ ] Rebate approved on device → next `trigger-cron` reports the student in `skippedRebate`, balance unchanged
- [ ] Rebate rejected → student is still charged
- [ ] Invalid rebate range blocked client-side with the reason shown

---

## Phase 3 — Surface

**Goal:** every screen backed by a real endpoint, or removed. `data.ts` deleted.

**Size:** L · **Blocks on:** Phase 2, Gate B, Gate E

| # | Work | Ref |
|---|---|---|
| 3.1 | **Staff: display the mess QR.** The staff role's entire purpose, absent from the app. Full-screen, high error correction, brightness boost, wake lock. The only light-on-dark inversion in the app — a QR needs a white ground. Reference: `StaffTab.jsx`. | T-1 |
| 3.2 | **Optional, per Gate E: the second verification direction.** Student screen rendering a QR of their own `profile.id`; staff scanner posting `{studentId}` to `POST /api/staff/verify-qr`. Zero backend work; endpoint already built and unused. Show the returned name and roll number so staff sees who they verified. | prd §7 |
| 3.3 | Retire the mock staff screens — Tasks, Logs, Inventory. They describe an inventory product that was never built. | T-3 |
| 3.4 | **Complaint + feedback submission with the real mess address** from the profile, and **feedback sends structured JSON** as `text`. Removes the hardcoded `'cl0123456789012username'`. The JSON schema is the dependency for Phase 5 — agree it here and write it down. | S-4, D3, D7 |
| 3.5 | Admin complaints, **read-only**: unwrap the envelope, drop the invented `urgency` / `status`, show timestamp + student + IPFS text + copyable CID, handle `content: null`. | A-2, D2, D15 |
| 3.6 | Mess change: student request screen + admin approve/reject queue. Absent entirely today. UI must state approval takes effect at the **next midnight**. Student side is submit-only, but `profile.mess.name` gives an honest delayed confirmation — surface that. | S-6 |
| 3.7 | Mess pickers everywhere fed by `GET /api/public/messes` — fixes the free-text `messId` in create-staff. Reference: `AuthTab.jsx`, `AdminTab.jsx`. | A-4 |
| 3.8 | Registration screen — **only if Gate B says self-register** | S-7 |
| 3.9 | Delete `src/data.ts` | D6, R3.6 |

**Exit criteria**
- [ ] `grep -rn "from '.*data'" src/` → nothing
- [ ] A staff member's QR scans first try at arm's length under fluorescent light
- [ ] Complaint and feedback submissions succeed against a live backend and return a CID
- [ ] Feedback `text` is valid JSON matching the agreed schema, verified by reading it back through `GET /api/admin/feedback-report`
- [ ] Complaints screen opens without a `TypeError` and renders real IPFS content
- [ ] Every remaining screen traces to one of the 27 routes in `architecture.md` §5

---

## Phase 4 — Android

**Goal:** it behaves like an Android app, not a web app in a wrapper.

**Size:** M · **Blocks on:** Phase 3 (routing churn on half-finished screens is waste)

| # | Work | Ref |
|---|---|---|
| 4.1 | Adopt `expo-router` or React Navigation. **Hardware back currently exits the app from any screen** — there is no history stack. | X-7 |
| 4.2 | Replace the horizontal tab dock and the hardcoded `paddingBottom: 208` with a measured layout. Tab counts are smaller now — Vote and Create Poll are gone. | D29 |
| 4.3 | `fontFamily: 'Courier'` → `Platform.select` or a bundled mono. Courier doesn't exist on Android, so wallet addresses and QR payloads render proportional — the two places alignment matters. Add a `mono` token. | design.md §3 |
| 4.4 | Accessibility: `accessibilityLabel` / `accessibilityRole` on every `Pressable`. Icon-only controls (copy, tabs, stars) are invisible to TalkBack today. | design.md §8 |
| 4.5 | Gate both infinite animation loops on `AccessibilityInfo.isReduceMotionEnabled()` | design.md §6 |
| 4.6 | Pad sub-48dp touch targets (pills at 30, stars at 42) | design.md §4 |
| 4.7 | Profile `BlurView` at intensity 38 across stacked cards on a low-end device; opaque `surface` fallback if needed | design.md §8 |
| 4.8 | Verify `elevation: 10` on device — Android ignores `shadowRadius` / `shadowOffset` / `shadowColor` | design.md §4 |
| 4.9 | Align the adaptive icon background (`#E6F4FE` pale blue) with the `#09090b` palette | design.md §8 |
| 4.10 | `PrimaryButton` loading → `ActivityIndicator` instead of a static `loader` glyph | design.md §5 |
| 4.11 | Ship a signed `preview` APK a tester can install | prd §3 |

**Exit criteria**
- [ ] Back button correct on every screen in all three roles
- [ ] Navigable end to end with TalkBack
- [ ] Reduce-motion respected
- [ ] Usable at 360dp
- [ ] Profiled on a low-end device; scroll holds up
- [ ] APK installs and works against a LAN backend

---

## Phase 5 — Insight

**Goal:** the admin dashboard and feedback report carry real numbers.

**Size:** M · **Blocks on:** 3.4 (the JSON schema) · **No longer blocked on the backend**

This was "Governance, blocked". With voting cut and the feedback schema moved client-side, what remains is achievable with existing routes and is pure frontend work.

**5.1 — Real admin dashboard** *(A-7)*
Every KPI derived from a real response, replacing the four constants deleted in 0.5:
- Total students — `GET /api/admin/students`
- Pending rebates — `GET /api/admin/rebates`, `status === 0`
- Pending mess changes — `GET /api/admin/mess-changes`, `status === 0`
- Complaint count — `GET /api/admin/complaints`
- Feedback count — `GET /api/admin/feedback-report`

Five honest tiles. Note these are five separate O(n)-RPC calls; load them progressively rather than blocking the screen (R3.10).

**5.2 — Real feedback report** *(A-3)*
`GET /api/admin/feedback-report` returns individual entries with IPFS `content`. Parse each against the 3.4 schema and aggregate client-side. This gives the existing `MetricRing` and bar chart real data instead of the constants they render today.

Honesty requirements:
- Entries predating the schema are prose and won't parse. Skip them and state the coverage: "Aggregated from 34 of 51 responses." Never silently drop them.
- Only report dimensions the schema actually captures. If 3.4 collects rating and meal window, report those — do not resurrect Taste / Freshness / Timing / Cleanliness / Temperature unless the schema carries them.

**Exit criteria**
- [ ] Every dashboard tile traces to a real response
- [ ] Feedback aggregate recomputes correctly after a new submission
- [ ] Unparseable entries counted and disclosed, not hidden
- [ ] Dashboard degrades per-tile — one failed call doesn't blank the screen

---

## Phase 6 — Future scope · PARKED

The web dashboard in `MessChain2.0/frontend/`. Intended future scope, not abandoned. Stays in the tree as the only working reference for several flows.

Revisit after Phase 4. If promoted to a deliverable it needs its own audit — hardcoded `localhost:3000`, no session-expiry handling, and a student roster it fetches but never renders.

---

## Final scope

Every screen below maps to one of the 27 existing routes. Nothing here needs a backend change.

**Student — 6 screens** (7 with Gate E)
Scanner (claim meal) · Profile + balance · Request rebate · Request mess change · File complaint · File feedback · *(My QR, per Gate E)*

**Staff — 2 screens** (3 with Gate E)
Mess QR display · *(Scan student QR, per Gate E)* · Settings *(only if a real setting survives)*

**Admin — 9 screens**
Dashboard (real, Phase 5) · Student roster + balances · Mint / semester enrolment · Create staff · Rebate queue · Mess change queue · Complaints (read-only) · Feedback report (Phase 5) · Trigger cron (ops tool)

**Cut — 2 screens:** Vote, Create Poll.

Net: the app goes from 16 screens with roughly half on mock data to **17 screens all backed by real endpoints**. Cutting voting costs two screens and buys a fully honest application.

---

## Decision gates

| Gate | Question | Blocks | Why it matters |
|---|---|---|---|
| **A** | Cleartext HTTP, or TLS in front of the backend? | Phase 1 exit, any APK | Android blocks cleartext in release builds on API 28+, and `app.json` has no opt-in. A `preview` APK will fail **every** request on a device with no useful error. Decide before promising a build. |
| **B** | Do students self-register, or does an admin create them? | 3.8 | No create-student endpoint exists — only create-staff. Under the freeze, **self-registration is the only option that works**, and it requires the student to pick a mess from `GET /api/public/messes`. Effectively forced; confirm and move on. |
| **E** | One verification direction or two — student-scans-mess, staff-scans-student, or both? | 3.1, 3.2 | `verify-qr` is built and free. Staff-scans-student actually proves presence; student-scans-mess needs only a printed poster. Both are available at zero backend cost. |
| **D** | Rupees or tokens in admin views? | 2.3 copy | Balances are integer token counts. A rupee figure needs a real conversion rate from somewhere. |
| **F** | What happens when a student's balance runs out? | Not scheduled | The midnight job silently skips them and nobody is told. Under the freeze the app cannot detect this server-side — the only client-side signal is a balance below the daily rate, which the profile screen *could* warn on. Needs a product answer. |
| ~~C~~ | ~~Is complaint triage a real requirement?~~ | — | **Closed by the freeze.** `POST /api/admin/complaints/:id/status` doesn't exist and won't. Complaints are read-only (D6). |

**A, B, and E should be answered before Phase 1 ends.**

---

## Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Phase 0 deferred as "cosmetic" | An admin grants a rebate that doesn't exist; trust is hard to rebuild | Sized S, no dependencies, mostly deletion. No reason to defer. |
| Phase 1 skipped to reach visible features faster | Every screen reworked later | The vertical-slice exit criterion. Don't start Phase 2 until it holds. |
| The voting cut isn't socialised | Someone reads the README's "voting governance system" and expects it at demo | Confirm the narrowed framing with the product owner now, not at demo. |
| 3.4's JSON schema decided ad hoc | Phase 5 can't aggregate; feedback data is permanently unstructured | The schema is a written artefact of 3.4, agreed across both screens, in the same PR. |
| Backend changes anyway | The frozen fixed point stops being fixed | R1.1 / R1.2. The app has already missed one backend commit (`b26166f`). |
| Only tested on the emulator | Cleartext failures, Courier fallback, blur perf, and `elevation` differences are all invisible there | `rules.md` §11: a physical device is part of the definition of done. |
| A reseed silently invalidates mess addresses | Confusing 403s on meal claims | `Mess.id` is a random address regenerated on every fresh seed. Re-read after any reseed (`memory.md` §7). |
| Submit-only flows read as broken | Students submit rebates and think nothing happened | Copy carries the honesty (2.2, 3.6). No route lets them check; don't imply one does. |
| Docs go stale | Back to rediscovery-by-reading | R10.4 / R10.5 — update `memory.md` §9 and strike defects in the same commit. |

---

## Progress

A phase is done when **every** exit box is ticked and `rules.md` §11 is satisfied.

| Phase | Size | State | Blocked by |
|---|---|---|---|
| 0 · Truth | S | ⬜ Not started | — |
| 1 · Foundation | M | ⬜ Not started | Gate A |
| 2 · Core flows | L | ⬜ Not started | Phase 1 |
| 3 · Surface | L | ⬜ Not started | Phase 2, Gates B + E |
| 4 · Android | M | ⬜ Not started | Phase 3 |
| 5 · Insight | M | ⬜ Not started | 3.4 |
| 6 · Web dashboard | — | 🅿️ Parked | Post-Phase 4 |
