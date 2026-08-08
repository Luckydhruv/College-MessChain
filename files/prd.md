# MessChain — Product Requirements (Android App)

**Status:** Draft v1 · **Owner:** TBD · **Last updated:** 2026-07-28
**Scope of this document:** the native Android client. The backend, smart contracts, and Besu network are treated as a **fixed upstream dependency** — see `architecture.md` for the contract surface and `rules.md` for what may and may not be changed.

---

## 1. What MessChain is

MessChain is a prepaid, ledger-backed meal subscription system for hostel messes. A student is enrolled in exactly one mess, holds a balance of non-transferable meal tokens, and is charged a fixed daily rate automatically at midnight. Every charge, every meal claimed, every rebate, and every complaint is written to a permissioned blockchain so that neither the mess contractor nor the administration can retroactively edit the record.

The problem it replaces: paper mess registers and month-end manual reconciliation, where a student who was away for ten days has no way to prove it, and a contractor billing for meals nobody ate has no way to be caught.

**What the ledger buys us, stated honestly:** an append-only, independently verifiable audit trail of charges and meal claims. It does *not* give students custody of their own funds — wallets are custodial and held server-side (see §7).

### The three roles

| Role | Who they are | What the app is for |
|---|---|---|
| **Student** | Hostel resident enrolled in one mess | Claim today's meal, check balance, apply for rebate when away, request a mess change, file complaints and feedback |
| **Staff** | Mess counter operator | Display the mess QR code that students scan to claim a meal; see the day's activity |
| **Admin** | Hostel/mess administration | Onboard staff, mint and enroll token balances, approve or reject rebates and mess-change requests, read complaints and feedback |

---

## 2. Current state

Two people built two halves independently:

- **`MessChain2.0/`** — backend (Express + Prisma + Postgres), six Solidity contracts, Hyperledger Besu QBFT network, IPFS, and a React web dashboard. Functionally complete and internally consistent.
- **repo root** — an Expo / React Native app. Visually complete: every screen exists, the design system is codified, and the auth flow works end to end. **Roughly half the screens are still wired to local mock data**, and several of the wired ones call endpoints that don't exist or send payloads the backend rejects.

The web dashboard in `MessChain2.0/frontend/` is the **reference implementation of correct behaviour**. Where the Android app and the web app disagree about how a flow works, the web app is right. This is most important for QR verification (§4.1).

`architecture.md` §6 contains the authoritative defect list. This document describes what the app should do; that one describes what it currently does.

---

## 3. Goals for this phase

**In scope**
1. Every screen reads and writes real backend data. Zero imports from `src/data.ts` in shipped code paths.
2. The three flows that define the product work reliably on a physical Android device: claim a meal, request a rebate, approve a rebate.
3. Real navigation (hardware back button, deep-linkable routes) replacing the string-switch router in `App.tsx`.
4. Honest failure: every network call has a visible loading, error, and empty state, and a way to retry.
5. Ship a signed APK via EAS `preview` that a tester can install and use against a LAN backend.

**Explicitly out of scope for this phase**
- iOS. `app.json` retains iOS config; nobody is testing it.
- Client-side wallets or client-side transaction signing. The backend signs. Do not add `ethers` to the app.
- Push notifications, offline queueing, biometrics, multi-language.
- **Any change to the backend, contracts, or infra in `MessChain2.0/`.** Frozen. All work is frontend and integration (§8).
- **Student voting (S-5) and admin poll creation (A-5).** Cut, not deferred — no route lists polls, so neither can ship honestly. See §4.1 and §4.3.
- The "Polygon / Hyperledger" network toggle. It is cosmetic and should be removed, not built out (§6).
- **The web dashboard in `MessChain2.0/frontend/`.** Not a deliverable, not maintained, not tested, and no feature parity is owed to it. It stays in the tree for one reason: it is the only working reference for how several flows are meant to behave. Read it; don't ship it and don't fix it. Note its coverage limits — it has no complaint reading and no feedback report, so it cannot guide that work.

**Success criteria for the phase**
- A student on a real device scans a real mess QR and sees their token balance drop the next morning.
- An admin approves a rebate on the device, and the midnight job skips that student for the rebate window.
- No screen renders fabricated numbers.

---

## 4. Requirements by role

Priority: **P0** blocks the phase. **P1** ships this phase if P0 lands. **P2** is next phase.

### 4.1 Student

**S-1 · Claim today's meal (P0)**
The student opens the scanner, points it at the QR displayed at the mess counter, and gets an unambiguous result.

The QR payload is JSON: `{"type":"MESS_VERIFICATION","messId":"0x…"}`. The app must parse it, check `type`, extract `messId`, and post `{ scannedMessId }` to `POST /api/student/verify-meal`. The current implementation posts the entire raw QR string as `scannedMessId`, which the backend always rejects.

Acceptance:
- Valid QR for the student's own mess, charge already created for today → success confirmation naming the mess.
- QR for a different mess → "This QR is for a different mess" (backend 403).
- Already claimed today → "You've already claimed today's meal" (backend 500 with an "already verified" hint; treat as a normal outcome, not a crash).
- No charge exists for today → "Today's meal hasn't been posted yet. Check with the mess counter." The backend's literal reply mentions a cron job; never show that string to a student.
- Non-JSON or wrong-`type` QR → "That's not a mess QR code," scanner stays open.
- Camera permission denied → explanation plus a button that opens system settings.
- The same code must not fire two requests. Debounce on payload, and lock the scanner while a request is in flight.

**S-2 · See balance, mess, and charge history (P0)**
Balance and mess assignment come from `GET /api/student/profile` and `GET /api/student/balance`. Both are real today. What is *not* real: the profile screen's "identity score", "on-chain logs: 42", "sync health: Green", and the three-item activity timeline are all hardcoded. Remove them or back them with real data.

Balance is a plain integer count of tokens — not rupees, and not a decimal. The daily rate is currently 27 tokens/day. Show the balance with a derived "≈ N days remaining" so the number means something. Never render a `₹` prefix on a token balance.

Acceptance: balance matches the chain; days-remaining is computed from the live rate, not a constant; a stale or failed fetch shows a retry affordance, not a zero.

**S-3 · Request a rebate (P0 — screen does not exist)**
A student going away picks a date range and submits. `POST /api/student/request-rebate` with `{ fromDate, toDate }` as epoch seconds. The API wrapper already exists in `src/api/rebates.ts`; nothing calls it.

Contract constraints, which the UI must enforce *before* submitting, because on-chain reverts surface as an opaque 500:
- `fromDate` must be strictly in the future. Today is not allowed. Default the picker to tomorrow and disable earlier dates.
- `toDate` must be after `fromDate`.
- The range must not exceed 15 days.

Acceptance: an invalid range is blocked client-side with the reason shown inline; a valid submission confirms and tells the student the request is pending admin approval.

**This flow is submit-only.** No route lets a student list their own rebates, and none will (§8). The confirmation must carry that honestly — "Submitted for approval. If approved, you won't be charged for those days" — and must not imply a status screen exists. The only signal a student gets is their balance holding steady during the window.

**S-4 · File a complaint or feedback (P0 — currently broken)**
Free text goes to IPFS, and the resulting CID is written on chain against the student's mess address.

`POST /api/student/file-complaint` / `file-feedback`, body `{ messId, text }`. **`messId` must be the mess's on-chain address, read from the student's profile.** Both API wrappers currently hardcode `messId: 'cl0123456789012username'`, which is not an address; the contract call reverts every time.

Feedback also has a structural mismatch: the app collects a star rating and a meal window, then flattens both into an English sentence. The backend stores that sentence as opaque IPFS text, so nothing downstream can aggregate ratings. Either send structured JSON as the `text` payload — `{"rating":4,"window":"Lunch"}` — or accept that the admin feedback report can never be computed. Prefer structured JSON; it costs nothing and unblocks S-11.

Acceptance: submission succeeds against a live backend; the returned CID is shown or logged; the composer clears only on success; failure preserves the draft.

**S-5 · Vote on a poll — CUT**
Removed from scope under the backend freeze. No route lists polls, so a student cannot discover that a poll exists, read its question or options, or see a tally. `POST /api/student/vote` accepts a vote, but casting one blind is not a feature.

The screen, its tab, and `submitVote` are deleted in `phases.md` 0.6. Two defects die with it: the hardcoded `pollId: 1`, and sending the option *label* where the contract expects a `uint` index.

Reopening this requires a backend route. The groundwork is done — `services/governance.js` has `getPoll`, `getPollCount`, and `getPollVotes`, all exported and called by nothing — so it is a small change if the freeze ever lifts.

**S-6 · Request a mess change (P2)**
`POST /api/student/request-mess-change` with `{ newMessId }`. Mess list from `GET /api/public/messes`. Approved changes take effect at the next midnight, not immediately — the UI must say so. No screen exists today.

**S-7 · Self-registration (P2)**
`POST /api/auth/register` needs `{ email, password, name, rollNumber, messId }`. The wrapper exists; no screen calls it. Whether students self-register or an admin creates them is an open product question (§9).

### 4.2 Staff

**T-1 · Display the mess QR (P0 — screen does not exist)**
This is the staff member's entire job in this system, and the Android app cannot do it. The web dashboard renders `{"type":"MESS_VERIFICATION","messId":<from GET /api/staff/profile>}` as a QR code. The Android app has four staff screens — Tasks, Logs, Inventory, Settings — and all four are mock content describing features that do not exist.

Requirements: full-screen QR, large, high error correction, screen-brightness boost, kept awake while displayed. The mess ID shown in text below it as a fallback. Works with the device face-up on a counter.

Acceptance: a student's scanner reads it first try at arm's length under fluorescent light.

**T-2 · Today's claims for this mess — CUT**
A staff member should be able to see who has claimed and roughly how many. No route provides it and the backend is frozen (§8), so this is out of scope. Note the partial substitute: if Gate E adopts the staff-scans-student direction, staff at least see each student's name and roll number as they verify them, one at a time.

**T-3 · Retire the mock staff screens (P0)**
Tasks, Logs, and Inventory describe an inventory-management product that was never built. Delete them. Keep Settings only if it holds a real setting; today it holds only the cosmetic network toggle.

`StaffDashboardScreen.tsx` is dead code — never imported, and a byte-for-byte copy of the admin dashboard rendering admin KPIs. Delete it.

### 4.3 Admin

**A-1 · Rebate queue (P0 — approval is currently theatre)**
The queue renders mock claims. Worse: tapping **Approve** calls no API at all. It runs a 1.2-second animation, then shows a "Settlement sealed" overlay with a fabricated receipt hash and the caption "Quorum: 4 of 5 validators." The network has one validator. Nothing was approved. Nothing was sealed.

This is the single most dangerous defect in the app: an administrator will believe they have granted a rebate that was never granted, and the student will be charged.

Requirements:
- List from `GET /api/admin/rebates`, which returns `{ rebates: [...] }` with numeric `id`, `student` (wallet address), `fromDate`, `toDate`, `status` (0 pending / 1 approved / 2 rejected), `requestedAt`, `decidedAt`, `decidedBy`.
- Approve → `POST /api/admin/rebates/:id/approve`; reject → `.../reject`. `id` is the array index as a plain integer. The current code runs `parseInt` over mock IDs like `"RB-2204"`, producing `/rebates/NaN/approve`.
- Show only what the chain knows. There is no `amount` and no rupee figure on a rebate request — the saving is implicit (days skipped × daily rate). Compute and label it as an estimate, or omit it.
- `student` is a wallet address, not a name. Resolve it via `GET /api/admin/students` (which returns wallet addresses alongside names and roll numbers) or show a truncated address. Do not invent names.
- Remove the fake receipt overlay and the validator-quorum caption entirely. A confirmation should show the real transaction hash the backend returns.
- Optimistic UI is not acceptable here. Await the response, then update.

Acceptance: approving a rebate on the device causes the next midnight run to skip that student for the window; rejecting it does not; a failed call leaves the row in its prior state with an error.

**A-2 · Read complaints (P0 — currently crashes)**
`GET /api/admin/complaints` returns `{ complaints: [...] }`; each entry has `id` (index), `student`, `mess`, `cid`, `timestamp`, and `content` (the IPFS text, or `null` if the fetch failed). The app's wrapper is typed to expect a bare array, assigns the envelope object to state, and then calls `.map` on it — a hard `TypeError` on screen open.

The `Complaint` type in `src/types/complaint.types.ts` also invents `urgency` (High/Medium/Low) and `status`. **Neither exists anywhere in the system** — not in the contract, not in the database, not on IPFS. The screen's urgency pills and its "Change resolution" button are UI for a data model that was never built. `POST /api/admin/complaints/:id/status` returns 404.

Decision required (§9): either add complaint triage upstream, or ship read-only complaints. For this phase, **read-only**. Remove urgency and status; show timestamp, student, the IPFS text, and a copyable CID. Handle `content: null` with "Content unavailable from IPFS."

**A-3 · Feedback report (P0 — fabricated)**
The screen shows a 92% ring and five category bars (Taste, Freshness, Timing, Cleanliness, Temperature). All five values are constants in `src/data.ts`. No category dimension exists anywhere in the system.

`GET /api/admin/feedback-report` returns individual feedback entries with IPFS text — not an aggregate. If S-4 sends structured JSON, aggregation becomes possible client-side over that list. Until then, replace the chart with a plain list of feedback entries. **A chart of invented numbers is worse than no chart.**

**Resolution under the freeze:** recoverable, and entirely in the frontend. The backend stores feedback `text` verbatim on IPFS and hands it back as `content`, so if the student and admin screens agree on a JSON schema, the admin can parse and aggregate client-side. That means `MetricRing` and the bar chart survive with real data — keep the components, delete only the constants. Two honesty conditions: report only dimensions the schema actually captures, and disclose coverage, since entries submitted before the schema landed are prose and won't parse ("Aggregated from 34 of 51 responses"). Sequenced as `phases.md` 3.4 → 5.2.

**A-4 · Create staff (P0 — nearly working)**
`POST /api/admin/create-staff` with `{ email, password, name, messId }`. Wired correctly. Two problems:
- `messId` is a free-text field. It must be a mess address; use a picker fed by `GET /api/public/messes`.
- The "Limited Access" toggle controls nothing. The backend has three roles and no permission granularity. Remove it or implement it upstream.

Acceptance: a created staff member can log in and reach T-1.

**A-5 · Create a poll — CUT**
Follows directly from S-5. A poll nobody can read, vote on knowingly, or tally is a write-only feature: an admin would be publishing something invisible. Cutting the reader forces cutting the writer.

The screen, its tab, and `schedulePoll` are deleted in `phases.md` 0.7. Two defects die with it: the `window` field the backend silently discards, and the mock menu options an admin could have published without editing.

Note the scope implication — `MessChain2.0/README.md` describes this as a *"subscription, rebate, and voting governance system."* Under the freeze it becomes a subscription and rebate system with complaint and feedback capture. Confirm that narrowing with whoever owns the product framing.

**A-6 · Token operations (P1 — not in the app at all)**
Real, working, unexposed endpoints:
- `POST /api/admin/mint-tokens` `{ rollNumber, amount }`
- `POST /api/admin/semester-enrollment` `{ studentId }` — mints 2000 if the balance is already ≥1000, else 3000
- `GET /api/admin/students` — roster with live on-chain balances
- `POST /api/admin/trigger-cron` — runs the midnight job on demand

Without these the app cannot onboard a student end to end. The roster screen and the trigger are also the only practical way to test S-1 during development, since a meal cannot be claimed until the day's charge exists.

Acceptance: an admin can add a student's opening balance and see it reflected in the roster.

**A-7 · Dashboard (P1)**
The four KPI tiles — meals served 12.4k, open complaints 24, rebate queue ₹148k, feedback score 4.7/5 — are all constants. None of the four is derivable as written.

**Resolution under the freeze:** the dashboard is fully recoverable with five tiles that are each derivable from an existing route — total students, pending rebates (`status === 0`), pending mess changes (`status === 0`), complaint count, feedback count. Delete the constants in `phases.md` 0.5, rebuild honestly in 5.1. Load the tiles progressively: that's five separate O(n)-RPC calls, and one failure must degrade a single tile rather than blanking the screen.

---

## 5. Cross-cutting requirements

**X-1 · Session handling (P0)** — JWTs expire after 24 hours. The app stores the session in `expo-secure-store` and restores it on launch **without checking expiry**, so a returning user lands in a logged-in shell where every request 401s. Required: decode and check `exp` at bootstrap; treat any 401 as a session end, clear storage, and return to login with "Your session expired. Sign in again." There is no refresh-token endpoint and adding one is out of scope.

**X-2 · Remove the demo-credentials bypass (P0)** — `AuthContext` accepts `student@messchain.com/student`, `staff@messchain.com/staff`, `admin@messchain.com/admin` when `__DEV__` is true, and mints a fake token string like `demo-admin`. Every subsequent API call fails 401 with no explanation, which is a reliable way to waste an afternoon. It also diverges from the seeded admin (`admin@mess.edu`). Delete it. Seed real dev users instead.

**X-3 · Error, loading, and empty states (P0)** — Every hook currently swallows errors into a bare `setLoading(false)` and renders an empty screen indistinguishable from "no data." Every fetch needs: loading skeleton, error state with the reason and a retry, empty state with a next action. Every mutation needs: disabled control while in flight, success confirmation, failure that preserves user input.

**X-4 · Refresh (P1)** — Every hook fetches once on mount and never again. Add pull-to-refresh on every list, and refetch balance after a successful meal claim.

**X-5 · Configuration (P0)** — Exactly one variable is read at runtime: `EXPO_PUBLIC_BACKEND_URL`. The committed `.env.example` sets it to `http://10.0.2.2:3000/api` while every call path already begins with `/api`, producing `/api/api/...`. Fix the example. The other seven variables in that file — RPC URL, chain ID, four contract addresses, IPFS gateway — are read by nothing and describe an architecture the app does not have (§7). Delete them.

`10.0.2.2` is the emulator's alias for the host loopback and does not work on a physical device; testers need a LAN IP. Make the URL settable at runtime in dev builds rather than requiring a rebuild.

**X-6 · Cleartext HTTP on Android (P0 for device testing)** — The backend is plain HTTP. Android blocks cleartext traffic in release builds by default and `app.json` carries no opt-in. A `preview` APK will fail every request on a real device with no useful error. Either terminate TLS in front of the backend or explicitly permit cleartext for the LAN host during testing. Decide before promising anyone an APK.

**X-7 · Navigation (P1)** — `App.tsx` switches on a `screen` string in a context. There is no route history, so the Android hardware back button exits the app from any screen. Adopt `expo-router` or React Navigation, restore back behaviour, and stop rendering all role tabs into one horizontally scrolling dock.

**X-8 · Performance of admin lists (P1)** — `GET /api/admin/complaints` and `/rebates` loop `0..count`, making one RPC round trip per record, plus one IPFS fetch per complaint, with no pagination. This is a server-side problem **that will not be fixed** — the backend is frozen and pagination was withdrawn (§8). So the client must absorb it: generous timeouts, visible progress, load list screens progressively, and no polling. On the admin dashboard, which fans out to five such calls, one slow or failed call must degrade a single tile rather than blanking the screen.

---

## 6. Product decisions to lock in

**The network toggle must go.** The app ships a Polygon ↔ Hyperledger switch, defaults to **Polygon**, labels the status banner "Low-fee EVM settlement", and shows a "POL" badge. The system runs on a single-validator Hyperledger Besu QBFT chain and has no Polygon integration whatsoever. The toggle changes accent colours and copy. An admin reading that banner is being told something false about where their institution's records live. Remove the toggle, the two network modes, `NetworkContext`'s network fields, and the Beta/Sandbox screen that exists to host it.

`NetworkContext` also owns `processing`, `launchProcessing`, and the overlays — genuinely useful plumbing that half the screens depend on. Keep that, renamed (`UiStateContext` or similar), and strip the network fiction out of it.

**No fabricated cryptographic detail.** No invented transaction hashes, no invented block times, no validator counts, no "multi-sig consensus" copy. Show the hash the backend returned or show nothing. The current overlays do all four.

**Tokens are not rupees.** Mock data prices rebates in `₹`. Balances are integer token counts. Pick one unit, label it, and if a rupee conversion is wanted, get the rate from somewhere real.

---

## 7. Custody, security, and honest positioning

Understand this before writing any copy about the ledger:

- Every user's wallet private key is generated server-side, encrypted with **one** AES-256-GCM key from the backend's environment, and stored in Postgres. To sign anything "as the student," the backend decrypts that key.
- The deployer key is simultaneously the chain's only validator, the `admin` on all six contracts, and the `system` signer. One compromised key compromises everything.
- Meal verification is `onlySystem` — the backend signs it, not the student.

So: this is a **custodial, permissioned, institutionally-operated ledger**. Its honest value is a tamper-evident audit trail against later editing by any single party, plus automated daily accounting. It is not self-custody, not trustless, and not decentralised. UI copy must not imply otherwise.

One product-level weakness worth naming: in the student-scans-mess-QR direction, the scanned value is a mess address printed on a poster. Any student who knows it can claim a meal from anywhere. The backend also has `POST /api/staff/verify-qr`, where staff scan the *student* — the direction that actually proves presence. The Android app implements neither correctly. Recommend keeping student-scans-mess for its throughput (one poster, no staff device interaction) and accepting the weakness for now, but document it rather than letting it pass unnoticed.

---

## 8. Upstream work — CLOSED

**The backend is complete and receives no changes.** Every ask below is withdrawn. The app is built against the 27 routes in `architecture.md` §5 and nothing else.

Recorded so the reasoning survives:

| ID | Ask | Resolution |
|---|---|---|
| 8-A | `GET /api/polls` | **Withdrawn → forces cutting S-5 and A-5.** No route lists polls, so voting cannot ship honestly and poll creation becomes write-only. |
| 8-B | `GET /api/staff/today` | Withdrawn. T-2 was P1; cut. |
| 8-C | `GET /api/student/rebates` | Withdrawn. S-3 and S-6 ship **submit-only** — copy must not imply a status view exists. |
| 8-D | Complaint status / triage | Withdrawn. Confirms A-2 as read-only permanently. |
| 8-E | Feedback aggregation | **Not needed** — solvable client-side once S-4 sends structured JSON. See `phases.md` 5.2. |
| 8-F | `GET /api/auth/me` | Not needed — decode the JWT `exp` locally at bootstrap. |
| 8-G | Pagination on admin lists | Withdrawn. Treat admin lists as slow (R3.10). |

**Recovered at zero backend cost**, both pure frontend work:
- `POST /api/staff/verify-qr` is fully implemented and used by neither client. It needs `{studentId}`, and `GET /api/student/profile` already returns `id` — so a student QR screen plus a staff scanner gives a second, presence-proving verification direction for free. See §7 and Gate E.
- The feedback report becomes real by having the student and admin screens **agree on a JSON schema** for the opaque `text` field. The backend stores it verbatim on IPFS and returns it as `content`.

---

## 9. Open questions

**Blocking — answer before Phase 1 closes**

1. **Which QR direction, and does staff need a device at all?** Three options, all free: student scans a mess poster (no staff device, but a poster address can be claimed from anywhere); staff scans the student (proves presence, needs a staff device, uses the already-built and entirely unused `POST /api/staff/verify-qr`); or both. If the answer is "printed poster only", T-1 becomes a one-off admin export and the staff role largely leaves the app. See §7 and `phases.md` Gate E.
2. **Do students self-register, or does an admin create them?** *Effectively forced:* no create-student endpoint exists, only create-staff, and the backend is frozen. Self-registration is the only path that works, with the student picking a mess from `GET /api/public/messes`. Confirm and move on.
3. **Is the narrowed product framing accepted?** `MessChain2.0/README.md` calls this a *"subscription, rebate, and voting governance system."* With voting cut it is subscription and rebate with complaint and feedback capture. Someone will expect voting at a demo unless this is settled now.

**Non-blocking, but don't lose them**

4. **How is a mess's on-chain address surfaced to a human?** Mess IDs are random Ethereum addresses generated at seed time. Nobody can read one off a page. Do we want short human codes?
5. **Rupee display.** Does the administration need money figures, or are tokens sufficient?
6. **What happens when a student's balance runs out?** The midnight job silently skips them and nobody is told. The backend can't tell us, but the client *could* warn when the balance falls below the daily rate. Needs a product answer, not code.
7. **What is the actual daily rate**, and who sets it? `TenderRate` is deployed at 27 tokens/day and no endpoint exposes `setRate`, so it is effectively fixed.
8. **Who operates the validator in production, and does a single validator satisfy the tamper-evidence claim** we are making to students?

**Closed**

- ~~Is complaint triage a product requirement?~~ Closed by the freeze. `POST /api/admin/complaints/:id/status` does not exist and won't. Complaints are read-only (A-2).

---

## 10. Phase exit checklist

- [ ] `grep -r "from '.*data'" src/` returns nothing outside tests
- [ ] Student: scan → claim → balance updates, on a physical device
- [ ] Student: rebate request with client-side validation of all three contract constraints
- [ ] Student: complaint and feedback submit with the real mess address
- [ ] Staff: mess QR displays and scans reliably
- [ ] Admin: rebate approve/reject hits the API and the midnight job honours it
- [ ] Admin: complaints render real IPFS content without crashing
- [ ] Admin: student roster with live balances; mint and enrol work
- [ ] Student: rebate and mess-change confirmations are honest about being submit-only
- [ ] Network toggle, Beta screen, fake overlays, demo credentials, `StaffDashboardScreen` all deleted
- [ ] Vote screen, Create Poll screen, their tabs, `submitVote` and `schedulePoll` all deleted
- [ ] Admin dashboard and feedback report carry derived values or are absent — no constants
- [ ] Expired session returns the user to login with an explanation
- [ ] Hardware back button behaves on every screen
- [ ] Every list: loading, error + retry, empty, pull-to-refresh
- [ ] `preview` APK installs and works against a LAN backend over the agreed transport
