# MessChain Android — Phase 1.5 · Student sign-up

**Last updated:** 2026-08-06
Companions: `phases.md` (roadmap), `prd.md` §4.1 S-7, `architecture.md` §5–6, `rules.md`, `design.md`, `memory.md`.

Defect numbers extend **`architecture.md` §6** (currently ends at 29). Requirement IDs refer to **`prd.md` §4–5**. Move a defect out of §6 in the same commit that fixes it (R10.5).

**Size:** S · **Blocks on:** Phase 1 (landed) · **Blocks:** Phase 2 verification

---

## The governing constraint, unchanged

> **The backend, contracts, and infra in `MessChain2.0/` are complete and receive zero changes. All work is frontend and integration.**

Nothing in this phase needs a route that doesn't exist. `POST /api/auth/register` and `GET /api/public/messes` are both live (`architecture.md` §5 Public).

---

## 1. What is actually wrong

Two new defects. Both are entry-point problems, not logic problems — the code underneath is already correct.

| # | Sev | Where | Defect |
|---|---|---|---|
| **30** | **S2** | `App.tsx:127–185`, `AuthContext.tsx:134,172`, `api/auth.ts:7,16` | **There is no way to create a student account.** The unauthenticated branch renders one card with a single `PrimaryButton label="Sign In"` and no create-account affordance. `handleRegister` is implemented, exposed on the context value, and **destructured by no screen**. `registerUser` / `registerStudent` are exported and **imported by nothing outside the context**. The whole path is built and has no door. |
| **31** | **S3** | `api/client.ts` — the 401 block in both `get` and `post` | Every 401 is treated as session expiry: the token cache is nulled, `onUnauthorizedCallback` fires (→ `handleLogout`), and the real body is discarded in favour of `"Session expired. Please log in again."` The backend returns `401 {error:'Invalid credentials'}` for a wrong password (`MessChain2.0/backend/src/controllers/auth.js`, `login`). **A student who mistypes their password is told their session expired.** On a screen they are not signed in to. |

### Why D30 is not cosmetic

Under the freeze there is **no create-student endpoint** — only `create-staff` (`architecture.md` §5, "Endpoints that do not exist"). Self-registration is the only path that exists, and it has no UI. So today the app cannot onboard a single student by any means; step 4 of the meal-claim recipe in `memory.md` §8 ("register a student with that messId") can only be done with curl or a direct DB write.

That makes this a **Phase 2 blocker, not a Phase 3 nicety**. Phase 2's exit criteria all begin with a student account existing.

### Why it was missed

`phases.md` 3.8 reads *"Registration screen — **only if** Gate B says self-register"*, and Gate B was never formally closed even though `prd.md` §9 Q2 records it as "effectively forced". A conditional item behind an open gate, scheduled two phases out, on a flow whose backend and context plumbing were both already written and therefore looked done. Worth a line in `memory.md` §9 — the failure mode is "gated item never un-gated", and 3.2 (Gate E) has the same shape.

**Gate B is now closed: students self-register.** Confirmed 2026-08-06.

---

## 2. Placement in the roadmap

```
Phase 1  Foundation      ─── landed
              │
Phase 1.5  Sign-up       ─── this document ─── S, no new dependencies
              │
Phase 2  Core flows      ─── 2.0 test enablement, claim, rebate
```

Slots between 1 and 2 rather than inside Phase 3. It depends only on Phase 1's client/session work, which has landed, and Phase 2 cannot be verified without it.

Consequences for `phases.md`:
- **3.8 is removed** from Phase 3 and superseded by this phase.
- **Gate B is closed** in the gates table.
- A `1.5 · Sign-up | S | ⬜ Not started | —` row is added to the Progress table.

**Not in this phase:** navigation. Registration is a pre-auth view, and the string router in `App.tsx:91–112` only runs once `authenticated` is true. Hardware-back between sign-in and sign-up is Phase 4 (4.1), not here. A visible back control is in scope (1.5.10); a working hardware back button is not.

---

## 3. Work

| # | Work | Ref |
|---|---|---|
| 1.5.1 | **Surface the HTTP status on thrown errors** in `api/client.ts`. Today `throw new Error(body.error ?? …)` discards the code, so no caller can distinguish a 409 from a 500 without string-matching a backend message — which R2.7 forbids relaying anyway. Attach `status` to the error before the copy mapping in 1.5.6 is written on top of it. | D31, R2.7 |
| 1.5.2 | **Fix D31.** A 401 is only a session end when a token was actually sent. Scope the interceptor to authenticated requests (or exempt `/api/auth/*`) so a failed login surfaces the backend's real reason instead of a logout. | D31, R4.6, R9.3 |
| 1.5.3 | **Move `getPublicMesses`** from `api/staff.ts:8` to a new `api/public.ts`. It is an unauthenticated public route and the sign-up screen is the second consumer. Update `CreateStaffScreen`'s import. *(Gate H)* | R8 |
| 1.5.4 | **Auth view state in the unauthenticated branch.** `authView: 'login' \| 'register'`, local `useState` in `App.tsx` — **not** in `AuthContext`. The context already holds `loginEmail` / `loginPassword`; do not extend that pattern. | R6.5 |
| 1.5.5 | **`RegisterScreen`** *(placement per Gate G)*. Fields: name, email, password, roll number, mess. Compose from `GlassCard` / `SectionTitle` / `TextField` / `PrimaryButton`. **Mess is a picker, never free text** — reuse the pill pattern at `CreateStaffScreen.tsx:90–94`, fed by 1.5.3. | S-7, R3.3, R3.4 |
| 1.5.6 | **Client-side validation, inline, before submit.** All five fields present; email contains `@`; a mess is selected. Show the reason next to the field — not a toast, and not after a round trip. Submit stays disabled until the mess list has loaded and a mess is chosen. *(Rules per Gate J)* | design.md §8, R9.3 |
| 1.5.7 | **Wire `handleRegister`.** It is already correct — call it, await it, and render the thrown error inline. The form clears only on success; a failure preserves every field including the mess selection. No optimistic transition into the signed-in shell. | R2.2, X-3 |
| 1.5.8 | **Map every register failure to human copy**, keyed on the status from 1.5.1: `400` → inline field errors · `409` → "An account already exists with that email or roll number." · `404` (mess not found — possible after a reseed, see Risks) → "That mess is no longer available. Choose another." and refetch the list · timeout → "Couldn't reach the server. Check the address and try again." with retry · `500` → "Couldn't create your account. Try again." Never relay a backend string verbatim. | R2.7, R9.3 |
| 1.5.9 | **Mess picker states.** Loading skeleton, error with retry, and an empty state that is an invitation, not a dead end: "No messes are set up yet. Contact the mess office." | X-3, R9.5 |
| 1.5.10 | **Both directions between the two views.** "Create account" from sign-in, "Sign in" back from register. `SegmentedControl` is fully built and used by **zero** screens (design.md §5) — adopt it here rather than hand-rolling a third toggle, or delete it. Either way, stop leaving it in the tree unused. | design.md §5, R6.7 |
| 1.5.11 | **Post-register behaviour** per Gate I. | — |
| 1.5.12 | **Delete `roles` in `theme.ts:21`.** Dead since role stopped being chosen at login and started coming from the server response. Nothing imports it. | R6.7, R4.4 |

### Copy

Sentence case throughout (R9.1). Name each control by what it does, and let the confirmation echo the verb (R9.2): "Create account" → "Account created". Plain verbs, none of the pseudo-technical register (R9.4).

**Say nothing about wallets, keys, or the chain on this screen.** Registration does generate a custodial wallet server-side (`controllers/auth.js`), but the student neither holds it nor needs to know (`prd.md` §7). Showing a freshly minted address here would be the same instinct that produced every S3 defect in §6.

### What this must not do

- No new `any` (R7.2), no non-null assertions (R7.3).
- `messId` is a `0x…` address from `GET /api/public/messes` — never a name, never typed by hand (R3.3, R3.4).
- No password, token, or response body in a `console.log` (R4.7).
- No success state before the 201 resolves (R2.2).
- No fabricated wallet address, hash, or "account secured on chain" copy (R2.1).

---

## 4. Exit criteria

- [ ] A student account can be created **on a physical device** and immediately used to sign in
- [ ] The new account appears in `GET /api/admin/students` with the mess that was picked
- [ ] Duplicate email → "An account already exists…", form fields preserved
- [ ] Duplicate roll number → same, and the message names roll number as a possible cause
- [ ] **Wrong password on sign-in shows "Invalid credentials", not "Session expired"** (D31)
- [ ] Backend stopped → error with a reason and a working retry on both views
- [ ] Mess list empty → honest empty state; submit stays disabled
- [ ] `messId` sent on the wire is a `0x…` address (verify against the request, not the UI)
- [ ] No credential or token appears in any log
- [ ] `npx tsc --noEmit` clean
- [ ] D30 and D31 struck from `architecture.md` §6 in the fixing commit; `memory.md` §9 entry appended (R10.4, R10.5)

Then re-run the full `memory.md` §8 recipe with a student created **through the app**, and confirm Phase 2 is verifiable end to end.

---

## 5. Decision gates

Open items. Each carries a recommendation; none is settled.

| Gate | Question | Recommendation |
|---|---|---|
| **G** | Where does the screen file live? `rules.md` §8 puts screens in a role directory, but registration is pre-auth and has no role. | `src/screens/auth/RegisterScreen.tsx`, and **amend the §8 table in the same PR** — the rules file says to change a rule rather than route around it. Inline in `App.tsx` is the alternative, but `App.tsx` is already 283 lines and Phase 4 will have to extract it anyway. |
| **H** | Move `getPublicMesses` to `api/public.ts`? | Yes. It is a public route in a role module with two consumers now. Cheap, and it stops the next person looking for it under `staff`. |
| **I** | Auto sign-in after a 201, or bounce to the sign-in form? | **Auto sign-in.** The backend already returns a valid token and `handleRegister` already stores it. Making them retype credentials adds a round trip that can fail and strand a user who *does* have an account. |
| **J** | Validation rules for password and roll number? The backend enforces **none** — any non-empty string is accepted, and `rollNumber` is `String? @unique` in Prisma. | Minimum 8 characters on password, trimmed non-empty on roll number, and nothing else. Do not invent an institutional roll-number format client-side; if one exists, it belongs upstream and upstream is frozen. |
| **K** | What do we tell a student when the on-chain half of registration fails? `controllers/auth.js` catches the funding / `setInitialMess` failure, logs it, and **still returns 201**. The account exists in Postgres with no on-chain mess; their first meal claim then fails with the backend's "student has no mess" 400. | **Say nothing at sign-up** — the register response is `{id,email,name,role,walletAddress}` with no `messId`, so the app genuinely cannot detect this and any reassurance would be a guess (R12.8). Handle it where it surfaces, in the claim error path, and record the weakness in `memory.md` §3 as a sixteenth easy-to-get-wrong fact. |
| **L** | Doc updates as one PR alongside the code, or separately? | One PR. R10.4 and R10.5 both require same-commit updates, and §6 of this document lists exactly what changes. |

**G, H, I, J want answers before the first commit. K and L can be settled during review.**

---

## 6. Documentation updates required

| File | Change |
|---|---|
| `architecture.md` §6 | Add D30 and D31 to the defect register. Update the parity table: **Register** goes from `wrapper only, no screen` to ✅ once shipped. |
| `prd.md` | **S-7 moves P2 → P0** and gains acceptance criteria. §9 Q2 (self-register vs admin-created) moves to **Closed**. Add a phase-exit checklist line: "Student: account creation from the app, with a mess picked from the live list". |
| `phases.md` | Remove 3.8. Close Gate B. Insert the Phase 1.5 row in the Progress table and in the dependency diagram. |
| `memory.md` | §5 Android table: Register `🔴 wrapper exists, no screen` → current state. §9: a session entry recording the gated-item failure mode. §3: the Gate K weakness, if K is accepted as recommended. |
| `rules.md` | §8 naming table, **only if Gate G goes to `screens/auth/`**. |

---

## 7. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| The screen ships against a stale mess list | `Mess.id` is a random address regenerated on **every fresh seed** (`memory.md` §7). A cached list produces a 404 at submit. | Never cache the mess list across app launches; fetch on screen open, and handle 404 by refetching (1.5.8). |
| D31 is deferred as "just copy" | It is the first thing a real user hits, and it silently logs them out on a typo. It is also three lines. | Ship it in the same PR. It shares the `client.ts` change in 1.5.1. |
| Register form state creeps into `AuthContext` | The context already holds two login fields; the path of least resistance is to add five more. | R6.5. 1.5.4 is explicit that the new state is local. |
| The gated-item pattern repeats | 3.2 (Gate E, staff-scans-student) is the same shape as 3.8 was: real, built, unblocked, and conditional on a gate nobody closed. | Close Gate E now or cut it explicitly. An open gate is not a plan. |
| Emulator-only testing | Sign-up is the one flow where a cleartext-HTTP failure (Gate A) looks identical to a wrong server address. | `rules.md` §11 — physical device is part of done. |
