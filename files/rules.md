# MessChain — Engineering Rules

Binding conventions for this repository. Applies to humans and to AI agents.

Rules are marked **MUST** (non-negotiable), **SHOULD** (default; deviation needs a note in the PR), or **MAY**. If a rule blocks something genuinely necessary, change the rule in the same PR and say why — don't quietly route around it.

Read `memory.md` §3 before writing any code that touches the API. Every item in that list has already caused a bug here.

---

## 1. Scope boundaries

**R1.1 — MUST NOT** modify anything under `MessChain2.0/` while working the Android phase. The backend, contracts, and infra are the fixed point this phase; the Android app moves to meet them.

**R1.2 — MUST** treat the 27 existing routes as the complete API surface. The backend is frozen and every previous ask is withdrawn (`prd.md` §8). If a requirement needs a route that doesn't exist, the requirement is **cut or reshaped** — it is not queued. Two features were cut this way (voting, poll creation) and two were recovered by solving them client-side instead (feedback aggregation, the second QR direction). Reach for reshaping before escalating.

**R1.3 — MUST NOT** modify Solidity or trigger a redeploy. A redeploy invalidates every contract address in every `.env`, resets all balances, and orphans every CID already anchored on chain.

**R1.4 — MUST** check `MessChain2.0/frontend/` before debugging an integration problem. It is the reference implementation and it works. The QR flow, complaint payloads, rebate date conversion, and mess-change semantics are all demonstrated correctly there.

**R1.5 — MAY** read anything under `MessChain2.0/`. Reading is encouraged; the contracts are the real specification.

---

## 2. Truthfulness in the UI

These exist because the app currently violates all of them.

**R2.1 — MUST NOT** display a transaction hash, block time, CID, validator count, or any other cryptographic artefact that the backend did not return. Show the real value or show nothing. Never generate a plausible-looking one.

**R2.2 — MUST NOT** show a success confirmation for an operation whose API call has not resolved successfully. Await the response, check it, then confirm. Optimistic UI is forbidden on any state change with financial or governance consequences — rebate approvals, meal claims, token mints, mess-change decisions.

**R2.3 — MUST NOT** name a network, protocol, or consensus mechanism the system doesn't use. It is Hyperledger Besu, QBFT, one validator, chainId 1337. Not Polygon. Not multi-sig. Not "4 of 5 validators".

**R2.4 — MUST NOT** render a metric, chart, count, or score that cannot be derived from a real response. If the data doesn't exist, remove the element. A chart of invented numbers is worse than no chart, because it will be acted on.

**R2.5 — MUST NOT** invent a field on a domain type. `Complaint.urgency` and `Complaint.status` exist nowhere in the system and produced a whole screen of controls over a model that was never built. If you find yourself adding a field to make the UI nicer, the UI is wrong.

**R2.6 — MUST** label units. Balances are integer **token** counts, not rupees, not decimals. If a rupee figure is ever shown, it comes from a real conversion rate, not from mock data.

**R2.7 — MUST NOT** surface backend implementation detail to a user. The backend's own 400 for an unposted meal charge asks "Have you run the midnight cron?" — a student must never see that. Map every known error to user-facing copy.

---

## 3. Data and the API layer

**R3.1 — MUST** unwrap the response envelope inside `src/api/*`, not in a hook or a screen. Every response is an object: `{complaints:[…]}`, `{rebates:[…]}`, `{user:{…}}`. An `api/` function returns the domain value; callers never see the envelope.

**R3.2 — MUST** verify a type against a real response before trusting it. Types in `src/types/` were written against mocks and several are wrong. Curl the endpoint or read the controller.

**R3.3 — MUST NOT** hardcode a domain identifier — mess address, roll number, student id, record index. Read it from the profile, the mess list, or the record you're acting on. Two API modules currently hardcode `'cl0123456789012username'` as a mess id.

**R3.4 — MUST** treat any value named `messId`, `newMessId`, or `scannedMessId` as an Ethereum address (`0x…`, 42 chars). If you're passing a CUID, a UUID, or a name, it's wrong.

**R3.5 — MUST** treat any `id` on a chain-derived record as an integer array index. Never `parseInt` a display label. Never assume stability across a redeploy.

**R3.6 — MUST NOT** import from `src/data.ts` in any code path that ships. It is mock data awaiting deletion. Eight modules still import it; the phase is not done until zero do.

**R3.7 — MUST** validate contract constraints client-side before submitting, because a revert arrives as an opaque 500:
- Rebate: `fromDate` strictly in the future, `toDate > fromDate`, range ≤ 15 days.
- Mess change: the target mess must differ from the current one.
- Token deduction: balance ≥ amount.

**R3.8 — MUST** send epoch **seconds** for any date, computed at UTC midnight. Not milliseconds, not ISO strings, not local midnight.

**R3.9 — MUST** handle `content: null` on complaints and feedback. IPFS fetches fail and the backend swallows that into `null`.

**R3.10 — SHOULD** assume admin list endpoints are slow. They loop `0..count` doing one RPC round trip per record plus an IPFS fetch per complaint, unpaginated. Generous timeouts, visible progress, no polling.

---

## 4. Security

**R4.1 — MUST NOT** add `ethers`, `web3`, or any signing library to the app. Wallets are custodial and server-held; the writes the app would need are `onlySystem`. There is no client-side signing story and adding one is a change to the whole system's threat model.

**R4.2 — MUST NOT** put a private key, mnemonic, contract address, or RPC URL in app code or app config. If you find one, delete it. `.env.example` currently carries four stale contract addresses and two RPC URLs that nothing reads.

**R4.3 — MUST** store the session only in `expo-secure-store` (or `localStorage` on the web target, as `utils/storage.ts` already handles). No `AsyncStorage`, no module-level variables, no logging tokens.

**R4.4 — MUST NOT** infer a role from anything other than the server's response. `utils/roleResolver.ts` derives a role from email substrings like "admin" and "faculty" — it is dead code and a privilege-escalation footgun. Delete it; never wire it up.

**R4.5 — MUST NOT** ship a credential bypass. The `__DEV__` demo-credentials block in `AuthContext` is slated for deletion; do not add another. Seed real users instead.

**R4.6 — MUST** treat any 401 as the end of the session: clear storage, return to login, explain why. JWTs last 24h and there is no refresh endpoint.

**R4.7 — MUST NOT** log a request or response body containing a token, password, or private key. `console.log` of a whole response object is enough to leak one.

**R4.8 — MUST** resolve the cleartext-HTTP question before promising anyone an APK. Android blocks cleartext in release builds on API 28+ and `app.json` has no opt-in. Either terminate TLS in front of the backend or explicitly permit cleartext for the test host — a decision, not an accident.

---

## 5. React Native and Expo

**R5.1 — MUST NOT** use browser storage APIs — `localStorage`, `sessionStorage`, `indexedDB` — in native code paths. Go through `utils/storage.ts`, which branches on `Platform.OS`.

**R5.2 — MUST NOT** use `window`, `document`, or DOM APIs outside a `Platform.OS === 'web'` guard.

**R5.3 — MUST** respect the pinned versions in `package.json` (Expo ~56.0.12, RN 0.85.3, React 19.2.3, TS ~6.0.3). Expo SDK versions are coupled to native module versions; bumping one package's major breaks the build in a way that is slow to diagnose.

**R5.4 — MUST** register a new native capability in `app.json` `plugins` alongside its permission string, following the existing `expo-camera` entry.

**R5.5 — MUST** use `StyleSheet.create`. No inline style objects except for genuinely computed values (a bar width, a conditional accent). This is the existing convention throughout and it holds.

**R5.6 — MUST** import icons as `Feather` from `@expo/vector-icons` and type icon props as `keyof typeof Feather.glyphMap`. No other icon set.

**R5.7 — SHOULD** use `react-native-svg` for anything vector, following `MetricRing` and `LockClockIcon` in `components.tsx`.

**R5.8 — MUST NOT** call `useState`, `useEffect`, or any hook after an early `return`. `QrScannerScreen` returns early for permission states — any hook added below those returns will break the hook order.

**R5.9 — SHOULD** set `useNativeDriver: true` on `Animated` timings, as the existing animations do.

**R5.10 — MUST** debounce `onBarcodeScanned`. It fires continuously while a code is in frame. Guard on the payload and lock while a request is in flight.

---

## 6. State and structure

**R6.1 — MUST** keep the layering: `screens → hooks → api → client`. A screen never calls `fetch` or `baseClient` directly. A hook never builds a URL.

**R6.2 — MUST** give every data hook the shape `{ data, loading, error, refetch }`. `error` is not optional. Every current hook swallows errors into a bare `setLoading(false)`, which is why failures are invisible.

**R6.3 — MUST NOT** swallow an error. No empty `catch {}`, no `catch { setLoading(false) }` without recording the error.

**R6.4 — MUST** await the real promise before reporting an outcome. `launchProcessing(id, cb)` currently fires `cb` after a fixed 1.2s `setTimeout` and never awaits it, so the spinner is unrelated to the request and failures vanish. Fix it rather than building on it.

**R6.5 — SHOULD NOT** put form field state in a context. `AuthContext` holds `loginEmail`, `loginPassword`, and the current screen. New form state stays local to its screen.

**R6.6 — MUST** guard against setState-after-unmount in async effects, using the `active` flag pattern the existing hooks already use.

**R6.7 — MUST** delete dead code rather than leaving it. Current dead weight: `screens/staff/StaffDashboardScreen.tsx` (never imported), `utils/roleResolver.ts`, `api/blockchain.ts`, most of `data.ts`.

**R6.8 — SHOULD** split `components.tsx` into a `components/` directory once it exceeds ~500 lines. It is at 364 and holds thirteen exports.

**R6.9 — MUST** define new tokens in `theme.ts`, not inline. See `design.md` for the token system and the known gaps in it.

---

## 7. TypeScript

**R7.1 — MUST** keep `strict: true`. It is on. Don't relax it.

**R7.2 — MUST NOT** introduce a new `any`. Existing offenders: `useStudent.profile`, `api/student.ts`, `api/staff.ts`, `api/auth.ts` return types, `getVoteChoices`. Fixing one while nearby is welcome; adding one is not.

**R7.3 — MUST NOT** use a non-null assertion (`!`) or a type assertion to silence a real nullability problem. Handle the null.

**R7.4 — SHOULD** use `as const` for literal unions, following `adminTabs` / `studentTabs` / `staffTabs`.

**R7.5 — MUST** define domain types in `src/types/<domain>.types.ts` and match backend field names exactly. No renaming in the type layer.

---

## 8. Naming and file conventions

| Thing | Convention | Example |
|---|---|---|
| Screen file | `PascalCase` + `Screen.tsx`, default export | `RebatesScreen.tsx` |
| Screen directory | by role | `screens/admin/`, `screens/student/`, `screens/staff/` |
| Hook | `use<Domain>.ts`, named export | `hooks/useRebates.ts` |
| API module | `<domain>.ts`, named exports, verb-first fns | `api/rebates.ts` → `getRebates`, `approveRebate` |
| Types | `<domain>.types.ts` | `types/rebate.types.ts` |
| Context | `<Name>Context.tsx`, exports `<Name>Context` + `<Name>Provider` | `context/AuthContext.tsx` |
| Utility | `camelCase.ts`, named exports | `utils/countdown.ts` |
| Screen id (route key) | `kebab-case` | `'create-staff'`, `'file-complaint'` |
| Processing id | `<action>` or `<action>-<id>` | `'verify-meal'`, `` `rebate-${id}` `` |

**R8.1 — MUST NOT** leave a screen id in `theme.ts` tabs that the router doesn't handle. `staffTabs` includes `'dashboard'` while `roleMenus.staff` excludes it and `roleHome.staff` points at it — the tab renders active while showing a different screen.

---

## 9. UI copy

Fuller guidance in `design.md` §7. The binding rules:

**R9.1 — MUST** use sentence case for all UI text, including buttons.

**R9.2 — MUST** name a control by what happens when it's used. "Approve rebate", not "Submit". The confirmation uses the same verb: "Rebate approved".

**R9.3 — MUST** write errors that say what happened and what to do. Not "Action failed". Not an apology. Not a raw backend string.

**R9.4 — MUST NOT** use the current codebase's pseudo-technical register as a model. "Multi-sig consensus is sealing the rebate execution against the selected ledger", "A safety-hazard border treatment for pending architecture routes", "Operational Rating Score" — this reads as filler and in several places describes things that don't happen. Plain verbs.

**R9.5 — MUST** make an empty state an invitation to act, not a dead end.

---

## 10. Git

**R10.1 — SHOULD** write commit subjects as imperative mood, ≤72 chars, prefixed by area: `student: parse mess QR payload before verify-meal`.

**R10.2 — MUST NOT** commit `.env`, `node_modules`, `android/`, `ios/`, or build output. Already gitignored — don't force-add.

**R10.3 — MUST** update `.env.example` in the same commit that changes a config variable, and delete variables that stop being read.

**R10.4 — MUST** append a `memory.md` §9 entry when a session changes project state or reveals something non-obvious. That file is the hand-off; the last integration pass left almost no notes and cost days of rediscovery.

**R10.5 — MUST** move a defect from `architecture.md` §6 in the same commit that fixes it. A stale defect register is worse than none.

---

## 11. Definition of done

A change is not done until:

- [ ] It runs on a **physical Android device** against a real backend, not just the emulator, not just a hot reload.
- [ ] Loading, error-with-retry, and empty states all exist and have been seen.
- [ ] The failure path was tested by actually breaking it — backend stopped, wrong role, expired token, denied permission.
- [ ] No new `data.ts` import, no new `any`, no new hardcoded identifier.
- [ ] Nothing displayed is fabricated (R2.1–R2.6).
- [ ] Hardware back button behaves.
- [ ] `npx tsc --noEmit` is clean.
- [ ] Any defect fixed is struck from `architecture.md` §6; any state change is logged in `memory.md` §9.

---

## 12. Rules for AI agents

**R12.1 — MUST** read `memory.md` §3 and §6 before proposing changes to any API call. Those fifteen facts are where the existing bugs came from.

**R12.2 — MUST NOT** assume a screen works because it renders. Half of them render mock data. Trace the call to `api/` and confirm the endpoint exists in `architecture.md` §5.

**R12.3 — MUST NOT** infer an endpoint's existence from a function name in `src/api/`. `updateComplaintStatus` looks real and calls a route that 404s.

**R12.4 — MUST** verify a field exists before using it. `Complaint.urgency`, `Complaint.status`, rebate `amount`, feedback categories, and poll `window` are all invented client-side.

**R12.5 — MUST NOT** paper over a mismatch by loosening a type or adding a fallback. `ComplaintsScreen` is full of `item.title || 'System Complaint Log'` and `claim.reason || 'Leave of absence…'` — fallbacks that hide the fact that the field never arrives. Fix the contract, don't pad the gap.

**R12.6 — MUST** state which file and which line range a claim about the codebase comes from. This repo has two clients that disagree; unsourced claims get confused between them.

**R12.7 — SHOULD** prefer deleting to stubbing. Most of what's wrong here is code that exists to look finished.

**R12.8 — MUST NOT** invent a plausible value to fill a gap. If a number, hash, name, or date isn't available, say so and leave it out. Most of the app's worst defects are exactly this instinct, already acted on.
