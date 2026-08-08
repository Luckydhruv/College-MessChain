# MessChain — Architecture

**Last updated:** 2026-07-28 · **Audience:** engineers and AI agents working on the Android app
Companion docs: `prd.md` (what to build), `rules.md` (how to work), `design.md` (visual system), `memory.md` (project state).

---

## 1. Repository layout and provenance

This repository contains two independently developed codebases, nested. Both retain their own `.git` directory.

```
MessChain-Frontend/                 ← Expo / React Native Android app  (author: Nehant14)
├── App.tsx                         root component + string-switch router + shell chrome
├── index.ts                        registerRootComponent
├── app.json  eas.json  tsconfig.json
├── .env.example                    ⚠ mostly dead config, see §7
├── assets/                         icons, splash
├── src/
│   ├── api/                        fetch wrappers, one module per domain
│   ├── context/                    AuthContext, NetworkContext
│   ├── hooks/                      one hook per domain, fetch-on-mount
│   ├── screens/{admin,student,staff}/
│   ├── types/                      per-domain TS types
│   ├── utils/                      storage, countdown, roleResolver
│   ├── components.tsx              entire shared component library, single file
│   ├── theme.ts                    design tokens + tab definitions
│   └── data.ts                     ⚠ mock data, still imported by 8 modules
│
└── MessChain2.0/                   ← backend + chain + web dashboard  (authors: ByteKnight28, Shantanu Kharwar)
    ├── infra/                      docker-compose: Besu, Postgres, IPFS (Kubo)
    │   └── besu/                   genesis.json, config.toml, validators.json
    ├── hardhat/contracts/          Token, TimeLock, Rebate, MessChange, Governance, TenderRate
    ├── hardhat/ignition/modules/Deploy.js
    ├── backend/
    │   ├── prisma/                 schema + init migration + seed
    │   └── src/{routes,controllers,services,middleware,config,jobs}
    └── frontend/                   React + Vite web dashboard — the reference implementation
```

**Why this matters.** The two halves were built from the same product idea but never integrated. The web dashboard in `MessChain2.0/frontend/` was written against the live backend and is correct. The Android app was written largely against `src/data.ts` and then partially retrofitted onto the API in a single pass (commit `8a94c54`, "Connected Student, Admin and Staff screen with the Backend"). Where the two clients disagree, **the web app is the source of truth** — see §6 for every place they disagree.

**But the web app does not cover everything.** It implements auth (including registration with a mess dropdown), the full student surface, the staff QR display, and the admin *approval* queues — rebates and mess changes — plus create-staff, mint-tokens, and trigger-cron. It does **not** implement complaint reading, feedback reporting, poll creation, voting, or semester enrolment. Its student-roster fetch lands in state and is never rendered.

That leaves a clean split. Every flow involving money, meals, or approvals has a working reference to copy. **The entire governance cluster — complaints, feedback, polls, voting — has no working reference on either client**, and voting additionally has no backend read route (§5). So governance is not "the Android app lagging behind"; it is the part of the product that was never finished anywhere.

**Under the backend freeze (§5), voting and poll creation are cut.** What survives of governance is complaint capture, complaint reading, feedback capture, and a feedback report aggregated client-side. See `prd.md` §8 and `phases.md`.

Commit histories:

| Repo | Authors | Range | Last commit |
|---|---|---|---|
| root (Android) | Nehant14 / Nehant Fopse | 2026-06-14 → 2026-06-17 | `51fe316` merge of the API branch |
| `MessChain2.0/` | ByteKnight28, Shantanu Kharwar | 2026-06-15 → 2026-07-14 | `a463368` README |

The backend continued for a month after the Android app stopped. The Android app has never been updated against the backend's later bug-fix commit (`b26166f`, "fixed some bugs and security issues").

---

## 2. Runtime topology

```
┌──────────────────────────┐
│  Android app (Expo)      │
│  React Native 0.85.3     │
│  no chain access         │
└───────────┬──────────────┘
            │  HTTPS/HTTP + JWT Bearer
            │  fetch, JSON only
            ▼
┌──────────────────────────────────────────────────────┐
│  Backend — Express 5, Node, CommonJS   :3000         │
│  ┌────────────────────────────────────────────────┐  │
│  │ routes → auth(jwt) → checkRole → controller    │  │
│  │ controller → service → ethers / prisma / ipfs  │  │
│  └────────────────────────────────────────────────┘  │
│  node-cron 0 0 * * *  →  midnight job                │
│  Holds ALL wallet private keys (AES-256-GCM at rest) │
└──┬──────────────┬──────────────────────┬─────────────┘
   │              │                      │
   ▼              ▼                      ▼
Postgres 15   IPFS (Kubo)          Hyperledger Besu
identity,     :5001                :8545  QBFT
mess roster   complaint/feedback   chainId 1337
              /poll text           1 validator, 2s blocks
                                   min-gas-price 0
                                   6 contracts
```

The app talks to **exactly one** thing: the backend HTTP API. It never touches Besu, IPFS, or Postgres. It holds no keys and signs nothing.

### Split of responsibility

| Concern | Home | Why |
|---|---|---|
| Identity, credentials, mess roster | Postgres | Needs queries and uniqueness constraints |
| Wallet private keys | Postgres, AES-256-GCM encrypted | Custodial by design |
| Token balances | `Token.sol` | Must be tamper-evident |
| Daily charge records | `TimeLock.sol` | Append-only proof a meal was billed and claimed |
| Rebate approvals | `Rebate.sol` | Must be auditable by the student |
| Mess-change decisions | `MessChange.sol` | Same |
| Complaint/feedback/poll *text* | IPFS | Too large and too mutable-looking for chain storage |
| Complaint/feedback/poll *pointers* | `Governance.sol` | The CID on chain is what makes the text tamper-evident |
| Daily rate history | `TenderRate.sol` | Rate changes must be dated and attributable |

Anything the app needs from the chain arrives pre-decoded as JSON. Anything on IPFS arrives already fetched and inlined as `content`.

---

## 3. Smart contracts

Deployed by `hardhat/ignition/modules/Deploy.js` to Besu (`chainId 1337`). All six take the deployer as `admin`, and the four with a `system` role take the deployer for that too.

| Contract | Ctor arg | Key surface |
|---|---|---|
| **Token** | `_system` | `mintTokens(addr,uint)` onlyAdmin · `deductTokens` onlySystem · `semesterEnrollment(addr)` onlyAdmin · `getBalance(addr)` view |
| **TimeLock** | `_system` | `createDailyTx(student,mess,date)` onlySystem · `verifyTx(...)` onlySystem · `hasTx(...)` view · `computeTxId = keccak(student,mess,date)` |
| **Rebate** | — | `requestRebate(from,to)` any · `approveRebate(id)` / `rejectRebate(id)` onlyAdmin · `isRebateActive(student,date)` view |
| **MessChange** | `_system` | `setInitialMess` onlySystem · `requestMessChange(newMess)` any · `approve` / `reject` onlyAdmin · `applyMessChange(id)` onlySystem · `getCurrentMess` view |
| **Governance** | — | `fileComplaint(mess,cid)` / `fileFeedback(mess,cid)` any · `createPoll(cid,optionCount)` onlyAdmin · `vote(pollId,uint option)` any · `pollVotes`, `hasVoted`, counts |
| **TenderRate** | `initialTokensPerDay` = **27** | `setRate(uint)` onlyAdmin · `getCurrentRate()` view · `getRateForDate(date)` view |

### Contract invariants the client must respect

These become opaque HTTP 500s if violated, so validate client-side:

- **Rebate:** `fromDate > block.timestamp` (strictly future — today fails), `toDate > fromDate`, `(toDate - fromDate) / 1 days <= 15`.
- **Governance vote:** `option` is a `uint256` index and must be `< poll.optionCount`; one vote per wallet per poll; poll must be `active`.
- **Governance poll:** `optionCount` is stored on chain; the question and option *labels* live only in the IPFS document.
- **TimeLock:** `createDailyTx` reverts if a tx already exists for `(student, mess, date)`; `verifyTx` reverts if none exists ("No tx found for today") or if already verified ("Already verified"). **A meal cannot be claimed before the day's charge is posted.**
- **MessChange:** approval sets `effectiveDate` to the next UTC midnight and does *not* move the student. Only `applyMessChange`, called by the cron, moves them.
- **Token:** balances are plain `uint256` counters. **No decimals, no ERC-20 interface** despite the README calling it ERC-20. `deductTokens` reverts on insufficient balance.

### Key concentration

`Deploy.js` hardcodes `const deployer = "0x70a8bef9019b999cbff35b861ca6a6adcd012bf7"` as the `system` argument, independent of whatever `PRIVATE_KEY` is in the Hardhat env. Meanwhile `admin` is set from `msg.sender`. If you follow the README's "Option B: custom deployer key", `system` points at the default address while `admin` is yours. The `onlySystem` modifier is `system || admin`, so nothing breaks — but the two roles silently diverge. Also note `prisma/seed.js` hardcodes the same address as the admin user's `walletAddress` while encrypting whatever `DEPLOYER_PRIVATE_KEY` you supplied, so Option B produces an admin row whose address and key don't match.

In the shipped configuration one key is: sole validator, `admin` on all six contracts, `system` signer, and the wallet funding every new student's gas. Treat it as the single point of total compromise.

---

## 4. Backend

Express 5, CommonJS, Prisma 6, ethers 6, bcrypt, jsonwebtoken, node-cron.

**Request pipeline:** `express.json()` → `cors()` (wide open, no origin restriction) → route → `auth` middleware → `checkRole(...)` → controller → service → ethers/prisma/ipfs.

`auth` verifies the Bearer JWT and attaches `req.user = { id, role, walletAddress }`. Tokens are signed with `JWT_SECRET` and expire in **24h**. There is no refresh endpoint and no revocation. `checkRole('ADMIN')` compares against the uppercase enum.

No helmet, no rate limiting, no request logging, no input validation library. Errors are logged with `console.error` and returned as `{ error: "<generic string>" }`.

### Data model (Prisma, Postgres)

```prisma
model User {
  id               String  @id @default(uuid())
  email            String  @unique
  password         String            // bcrypt, 10 rounds
  role             Role              // ADMIN | STUDENT | STAFF
  name             String
  rollNumber       String? @unique   // students only
  walletAddress    String  @unique
  walletPrivateKey String            // "iv:authTag:ciphertext" AES-256-GCM
  messId           String?           // FK → Mess.id
  createdAt        DateTime @default(now())
  mess             Mess?   @relation(fields: [messId], references: [id])
}

model Mess { id String @id  name String @unique  users User[] }
enum Role { ADMIN STUDENT STAFF }
```

**`Mess.id` is an Ethereum address.** `seed.js` sets it with `ethers.Wallet.createRandom().address` because the contracts type a mess as an `address`. There is no `Complaint`, `Feedback`, `Poll`, `Rebate`, or `Claim` table — all of that lives on chain and on IPFS. Consequence: nothing about governance is queryable, filterable, sortable, or paginable, and the only way to list N records is N RPC round trips.

Seeded state: two messes ("Mess 1", "Mess 2") with random addresses, one admin `admin@mess.edu` / `admin_strong_password`.

### Crypto

`config/crypto.js` — AES-256-GCM, one 32-byte key from `WALLET_ENCRYPTION_KEY`, format `iv:authTag:ciphertext`, with a legacy 2-part CBC path retained for backwards compatibility. Rotating the key would require decrypting and re-encrypting every row; there is no mechanism for that.

### IPFS

`config/ipfs.js` — direct Kubo HTTP API. `addText` POSTs multipart to `/api/v0/add` and returns `data.Hash`; `getText` POSTs `/api/v0/cat?arg=<cid>`. No pinning, no gateway fallback, no timeout. Content added by one node is not replicated anywhere, so a lost IPFS volume orphans every complaint and poll — the CIDs on chain would point at nothing. Admin read paths wrap the fetch in `try/catch` and set `content: null` on failure, so the client must handle null.

### The midnight job

`jobs/midnight.js`, cron `0 0 * * *`, also callable via `POST /api/admin/trigger-cron`.

```
today = UTC midnight epoch seconds

Step 0 — apply deferred mess changes
  for each MessChange request:
    if status == APPROVED and 0 < effectiveDate <= today:
      if on-chain current mess != toMess: applyMessChange(i)
      sync User.messId in Postgres

Step 1 — daily charge
  rate = TenderRate.getCurrentRate()
  for each STUDENT:
    skip if !messId                                  → skippedNoMess
    skip if Rebate.isRebateActive(wallet, today)     → skippedRebate
    skip if Token.getBalance(wallet) < rate          → skippedBalance
    skip if TimeLock.hasTx(wallet, messId, today)    → idempotency guard
    TimeLock.createDailyTx(wallet, messId, today)
    Token.deductTokens(wallet, rate)
  returns { processed, skippedRebate, skippedBalance, skippedNoMess, errors }
```

Notes for client work:
- **The whole day depends on this having run.** `verify-meal` fails until it has.
- All dates are **UTC midnight**. A student in IST sees the day roll over at 05:30 local. Nothing in either client accounts for this.
- Sequential, one student at a time, several awaited transactions each at ~2s block time. Fine for tens of students, not for thousands.
- An out-of-balance student is silently skipped — no notification exists.

---

## 5. API contract

Base: `http://<host>:3000`. All paths below already include the `/api` prefix. Auth is `Authorization: Bearer <jwt>` except where noted.

### Public

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/auth/register` | `{email,password,name,rollNumber,messId}` | `201 {message, token, user{id,email,name,role,walletAddress}}` |
| POST | `/api/auth/login` | `{email,password}` | `200 {message, token, user{...}}` |
| GET | `/api/public/messes` | — | `{messes:[{id,name}]}` |

`register` also generates a wallet, funds it with 10 ETH from the deployer for gas, and calls `setInitialMess`. On-chain failure is non-fatal — the DB row is created and the chain is left out of sync, with no retry mechanism.

### Student · `auth` + role `STUDENT`

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/student/profile` | — | `{user:{id,email,name,rollNumber,walletAddress,messId,createdAt,mess:{name}}}` |
| GET | `/api/student/balance` | — | `{walletAddress, balance}` — `balance` is a **number**, or a string if it exceeds `MAX_SAFE_INTEGER` |
| POST | `/api/student/file-complaint` | `{messId, text}` | `201 {message, txHash, cid}` |
| POST | `/api/student/file-feedback` | `{messId, text}` | `201 {message, txHash, cid}` |
| POST | `/api/student/vote` | `{pollId, option}` | `{message, txHash}` — `option` is a **uint index** |
| POST | `/api/student/request-rebate` | `{fromDate, toDate}` epoch sec | `201 {message, txHash}` |
| POST | `/api/student/request-mess-change` | `{newMessId}` | `201 {message, txHash}` |
| POST | `/api/student/verify-meal` | `{scannedMessId}` | `{message, txHash}` |

`messId` / `newMessId` / `scannedMessId` are always the mess's **on-chain address**, obtainable from `profile.messId` or `/api/public/messes`.

`verify-meal` failure modes: `400` missing field · `400` student has no mess · `403` scanned mess ≠ own mess · `400` no charge posted today (message literally asks whether the cron ran) · `500` already verified.

### Staff · `auth` + role `STAFF`

| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/api/staff/profile` | — | `{user:{id,email,name,role,messId,mess:{name}}}` |
| POST | `/api/staff/verify-qr` | `{studentId}` | `{message, verified, txHash, student{id,name,rollNumber}}` |

`verify-qr` is the inverse direction — staff scans the student. It computes the date server-side to prevent replay, and returns `404 {verified:false}` when no charge exists, `409` when already verified. **Unused by both clients.**

### Admin · `auth` + role `ADMIN`

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/api/admin/create-staff` | `{email,password,name,messId}` | `201 {message, user{...}}` |
| POST | `/api/admin/mint-tokens` | `{rollNumber, amount}` | `{message, txHash, amount}` |
| POST | `/api/admin/semester-enrollment` | `{studentId}` | `{message, txHash, balanceBefore, balanceAfter, minted}` |
| GET | `/api/admin/complaints` | — | `{complaints:[{id,student,mess,cid,timestamp,content}]}` |
| GET | `/api/admin/feedback-report` | — | `{feedbacks:[{id,student,mess,cid,timestamp,content}]}` |
| POST | `/api/admin/create-poll` | `{question, options[]}` min 2 | `201 {message, txHash, cid}` |
| GET | `/api/admin/rebates` | — | `{rebates:[{id,student,fromDate,toDate,status,requestedAt,decidedAt,decidedBy}]}` |
| POST | `/api/admin/rebates/:id/approve` | — | `{message, txHash}` |
| POST | `/api/admin/rebates/:id/reject` | — | `{message, txHash}` |
| GET | `/api/admin/mess-changes` | — | `{messChanges:[{id,student,fromMess,toMess,status,requestedAt,effectiveDate,decidedBy}]}` |
| POST | `/api/admin/mess-changes/:id/approve` | — | `{message, txHash}` |
| POST | `/api/admin/mess-changes/:id/reject` | — | `{message, txHash}` |
| GET | `/api/admin/students` | — | `{students:[{id,email,name,rollNumber,walletAddress,messId,createdAt,mess{name},balance}]}` |
| POST | `/api/admin/trigger-cron` | — | `{message, stats{...}}` |

**Contract conventions to internalise:**
- Every response is an **envelope object**, never a bare array. `{complaints:[...]}`, `{rebates:[...]}`, `{students:[...]}`, `{user:{...}}`.
- `id` on any on-chain record is its **array index as an integer**, assigned server-side in the read loop. Not stable across deletions (there are none) and not a UUID.
- `student` on a chain-derived record is a **wallet address**, not a name or a user id.
- `status` is `0 PENDING | 1 APPROVED | 2 REJECTED`.
- All dates are **epoch seconds, UTC**.
- Errors are `{error: string}` with no code field.

### Endpoints that do not exist — and will not

The backend is frozen. These are **permanent constraints to design around**, not gaps awaiting work.

| Absent | Consequence |
|---|---|
| Any poll read route. `governance.js` has `getPoll`, `getPollCount`, `getPollVotes` — exported, called by no controller. | **Voting and poll creation are cut.** A student cannot discover a poll exists. |
| `POST /api/admin/complaints/:id/status` — the app calls it | Complaints are **read-only**, permanently. Also confirms `Complaint.urgency` and `.status` as invented fields. |
| Feedback aggregation | Solve **client-side** via an agreed JSON schema on the opaque `text` field. |
| A student's own rebate list | Rebate requests are **submit-only**. Copy must not imply a status view. |
| A student's own mess-change list | Submit-only, but `profile.mess.name` gives an honest delayed confirmation after the change applies at midnight. |
| Today's claims for a mess | Staff cannot see who has claimed. |
| `GET /api/auth/me` or any generic profile route | Validate the session by decoding the JWT `exp` locally. |
| Any way to create a student as an admin — only `create-staff` exists | **Self-registration is the only path that works.** |
| Any way to set the daily rate | Fixed at the deployed 27 tokens/day. |
| Pagination anywhere | Admin lists stay O(n) RPC. Treat them as slow. |

**Built but unused — free to activate:** `POST /api/staff/verify-qr` is fully implemented and called by neither client. It takes `{studentId}`, and `GET /api/student/profile` returns `id`, so a student QR screen plus a staff scanner adds a second, presence-proving verification direction at zero backend cost.

---

## 6. Android app internals, and where they're wrong

### Current structure

**Router.** `App.tsx` holds a `switch` over a `screen` string kept in `AuthContext`. `roleMenus` and `roleTabs` in `theme.ts` define which screens each role sees. There is no navigation library, no history stack, and therefore no hardware-back support.

**State.** Two React contexts.
- `AuthContext` — session, role, the login form's field state, the current screen, `handleLogin`, `handleLogout`. Hydrates from `expo-secure-store` on mount.
- `NetworkContext` — `network` (`polygon | hyperledger`), plus `processing` (a string id of the in-flight action), `launchProcessing(id, cb)`, and two overlay flags. Eleven screens depend on it.

`launchProcessing` is the app's only async-feedback primitive, and it is subtly wrong: it sets `processing = id`, fires a 1200 ms `setTimeout`, then clears `processing` **and** runs the callback. So the spinner runs for a fixed 1.2 s regardless of the real request, and the request begins only *after* the spinner has stopped. Its result is never awaited or surfaced.

**API layer.** `src/api/client.ts` exposes `baseClient.get/post`. `getAuthHeaders()` reads SecureStore on **every** request. `parseResponse` returns `undefined` on an empty body and falls back to the raw text if JSON parsing fails. Non-2xx throws `new Error(body.error || body.message || "<METHOD> request to <url> failed.")`. There is no timeout, no retry, no abort, and no 401 interception.

**Hooks.** `useComplaints`, `useFeedback`, `usePolls`, `useRebates`, `useStudent` — all fetch once in a mount `useEffect` guarded by an `active` flag, and all swallow errors into `setLoading(false)`. No error state is exposed to any screen.

### Defect register

Severity: **S1** crashes or silently corrupts trust · **S2** feature does not work · **S3** wrong/misleading · **S4** hygiene.

| # | Sev | Where | Defect |
|---|---|---|---|
| 1 | **S1** | `useRebates.triggerApprove` | Calls `handleApprove` — animation only. **No API call.** `approveRebate` is never imported. An admin sees "Settlement sealed" with a fake hash and a fake validator quorum for an approval that never happened. |
| 2 | **S1** | `api/complaints.getComplaints` | Typed `Promise<Complaint[]>` but the backend returns `{complaints:[...]}`. The envelope object lands in state and `complaints.map(...)` throws `TypeError` on screen open. |
| 3 | **S1** | `api/complaints`, `api/feedback` | `messId` hardcoded to `'cl0123456789012username'`. Not an address → ethers rejects → every complaint and feedback submission 500s. |
| 4 | **S1** | `QrScannerScreen.handleQrScan` | Posts the raw QR string as `scannedMessId`. The payload is JSON `{type,messId}` and must be parsed. Meal claiming has never worked. |
| 5 | **S2** | `api/rebates.denyRebate` | `parseInt("RB-2204", 10)` → `NaN` → `POST /api/admin/rebates/NaN/reject`. |
| 6 | **S2** | `api/polls.submitVote` | Sends `pollId: 1` hardcoded and `option` as a label string. Contract needs a uint index. Always reverts. |
| 7 | **S2** | `api/polls`, `api/feedback`, `api/rebates`, `api/student` | Read paths return `src/data.ts` mocks. Real endpoints are never called for rebates, feedback, or polls. |
| 8 | **S2** | `AuthContext` | Restores a persisted session without checking JWT `exp`. Past 24h the user sits in a logged-in shell where everything 401s. No 401 handling anywhere. |
| 9 | **S2** | `AuthContext` | `__DEV__` demo credentials mint tokens like `"demo-admin"`. Every request then 401s. Also diverges from the seeded `admin@mess.edu`. |
| 10 | **S2** | `.env.example` | `EXPO_PUBLIC_BACKEND_URL=http://10.0.2.2:3000/api` while all call paths start with `/api` → `/api/api/...`. |
| 11 | **S2** | `app.json` | No cleartext-traffic opt-in. Release APKs on Android 9+ will fail every HTTP request on device. |
| 12 | **S2** | `NetworkContext.launchProcessing` | Fires the callback after a fixed 1.2 s and never awaits it. Spinner duration is unrelated to the request; failures are invisible. |
| 13 | **S3** | `theme.ts`, `NetworkContext`, `BetaSettingsScreen`, `StatusBanner` | Polygon ↔ Hyperledger toggle, defaulting to **Polygon** with "Low-fee EVM settlement". There is no Polygon anywhere in the system. |
| 14 | **S3** | `App.tsx` overlays | "Quorum: 4 of 5 validators" (the chain has 1), fabricated receipt hash `0x8c9f...4a71`, fabricated block time `12:41:22 UTC`. |
| 15 | **S3** | `types/complaint.types.ts`, `ComplaintsScreen` | `urgency` and `status` exist nowhere in the system. Urgency pills and the "Change resolution" control are UI over a nonexistent model. |
| 16 | **S3** | `FeedbackReportScreen` | 92% ring and five category bars are all constants. No category dimension exists anywhere. |
| 17 | **S3** | `DashboardScreen` | All four KPIs are constants; three cannot be derived from any existing endpoint. |
| 18 | **S3** | `api/student.getStudentProfile` | `logsCount: '42'`, `sync: 'Green'`, and `timeline` are hardcoded and rendered as real. |
| 19 | **S3** | `data.ts` rebate mocks | Rebate amounts in `₹`. Balances are integer token counts. Unit confusion. |
| 20 | **S3** | `CreateStaffScreen` | "Limited Access" toggle controls nothing — the backend has no permission granularity. |
| 21 | **S3** | `CreatePollScreen` | Sends `window`, which the backend discards; options pre-seeded with mock menu items an admin could publish unknowingly. |
| 22 | **S3** | `theme.ts` / `AuthContext` / `App.tsx` | `staffTabs` includes `dashboard`; `roleMenus.staff` excludes it; `roleHome.staff` is `'dashboard'`. Result: the Dashboard tab renders as active while showing `TasksScreen`. |
| 23 | **S4** | `screens/staff/StaffDashboardScreen.tsx` | Dead code. Never imported, and a byte-for-byte copy of the admin dashboard rendering admin KPIs. |
| 24 | **S4** | `utils/roleResolver.ts` | Dead code. Infers role from email substrings ("admin", "faculty"). A privilege-escalation footgun if ever wired up. |
| 25 | **S4** | `api/blockchain.ts` | `anchorToBlockchain` returns a random hex string. `walletAddress` is a hardcoded 41-char string — not even a valid address. Also duplicated inline in `App.tsx`. |
| 26 | **S4** | `.env.example` | Seven of eight variables are read by nothing. See §7. |
| 27 | **S4** | `api/client.ts` | SecureStore read per request; no timeout; no abort. |
| 28 | **S4** | all hooks | Errors swallowed; no error state; no refetch. |
| 29 | **S4** | `App.tsx` | `paddingBottom: 208` hardcoded to clear the dock; dock renders every role tab into one horizontal scroller. |

### Feature parity: Android vs web reference

| Capability | Backend | Web | Android |
|---|---|---|---|
| Login | ✅ | ✅ | ✅ |
| Register | ✅ | ✅ | wrapper only, no screen |
| Student profile + balance | ✅ | ✅ | ✅ (with fabricated extras) |
| Claim meal (scan mess QR) | ✅ | ✅ correct JSON parse | ❌ defect 4 |
| Request rebate | ✅ | ✅ | ❌ no screen |
| Request mess change | ✅ | ✅ | ❌ absent entirely |
| File complaint / feedback | ✅ | ✅ | ❌ defect 3 |
| Vote | ✅ write only | ❌ | 🚫 **CUT** — no poll read route |
| **Staff: display mess QR** | ✅ | ✅ | ❌ **absent** |
| Admin: create staff | ✅ | ✅ with mess dropdown | ✅ but free-text messId |
| Admin: mint tokens | ✅ | ✅ | ❌ absent |
| Admin: semester enrolment | ✅ | ❌ | ❌ absent |
| Admin: student roster | ✅ | ⚠️ fetched, never rendered | ❌ absent |
| Admin: read complaints | ✅ | ❌ **not implemented** | ❌ defect 2 |
| Admin: feedback report | ✅ raw list only | ❌ **not implemented** | ❌ fabricated, defect 16 |
| Admin: rebate approve/reject | ✅ | ✅ filters `status===0` | ❌ defect 1 |
| Admin: mess-change approve/reject | ✅ | ✅ filters `status===0` | ❌ absent |
| Admin: create poll | ✅ | ❌ **not implemented** | 🚫 **CUT** — write-only without a reader |
| Admin: trigger cron | ✅ | ✅ | ❌ absent |

---

## 7. Configuration

**Read at runtime by the app: one variable.**

```
EXPO_PUBLIC_BACKEND_URL   # e.g. http://192.168.1.20:3000  — NO trailing /api
```

Everything else in `.env.example` is read by nothing:

```
EXPO_PUBLIC_PROVIDER_URL / RPC_URL / NETWORK_ID
EXPO_PUBLIC_{TOKEN,GOVERNANCE,TIMELOCK,REBATE}_CONTRACT_ADDRESS
EXPO_PUBLIC_IPFS_GATEWAY
BACKEND_URL / RPC_URL          # non-EXPO_PUBLIC, invisible to the client bundle anyway
```

These describe a direct-to-chain client that does not exist and **cannot** exist in the current deployment:
- The app bundles no web3 library.
- Besu's `host-allowlist` is `["localhost","127.0.0.1","backend"]`, so a device hitting the RPC by LAN IP is rejected.
- `rpc-http-cors-origins` permits only `localhost:3000` and `localhost:5173`.
- Signing from the client is impossible: keys are custodial, and `deductTokens` / `createDailyTx` / `verifyTx` are `onlySystem`.

Delete them. The contract addresses in particular are stale Hardhat-local defaults that match nothing in this deployment.

**Host addressing:** `10.0.2.2` is the Android emulator's alias for the host loopback. Physical devices need the machine's LAN IP, and both device and backend must be on the same network. Backend `cors()` is unrestricted, so no CORS work is needed.

**Backend env** (`MessChain2.0/backend/.env`): `PORT`, `DATABASE_URL`, `JWT_SECRET`, `WALLET_ENCRYPTION_KEY` (64 hex chars), `BESU_RPC_URL`, `DEPLOYER_PRIVATE_KEY`, `IPFS_API_URL`, and six `*_CONTRACT` addresses. `config/besu.js` validates all eight chain-related vars at import and throws on any missing — so the backend refuses to boot without a completed deployment.

---

## 8. Target architecture for the Android app

The direction of travel. Not a rewrite — the design system and component library are good and should be kept.

```
App.tsx                         providers + navigator only, no shell logic
navigation/                     expo-router or React Navigation
  ├── role-based route groups   (student) (staff) (admin)
  └── restores hardware back, enables deep links
context/
  ├── AuthContext               session + role ONLY (no form state, no screen state)
  └── UiStateContext            processing ids + toasts  (NetworkContext, de-fictionalised)
api/
  ├── client.ts                 + timeout, + abort, + 401 interceptor → session end
  │                             + in-memory token cache (stop hitting SecureStore per call)
  └── <domain>.ts               one fn per endpoint, unwraps the envelope, returns typed data
hooks/
  └── use<Domain>.ts            { data, loading, error, refetch } — error is not optional
types/                          types generated from or verified against real responses
components.tsx                  split into components/ once it passes ~500 lines
theme.ts                        tokens only; tab config moves to navigation/
```

Sequenced work, dependency-ordered:

1. **Truth pass.** Fix defects 1–4 and 10. Delete 13, 14, 23, 24, 25. Nothing else matters while an admin can be shown a fake approval.
2. **Contract pass.** Every `api/*` function unwraps the real envelope and matches real field names. Regenerate `types/` from actual responses. Delete `data.ts`.
3. **Feedback pass.** Rewrite `launchProcessing` to await the real promise and expose success/failure. Give every hook an `error` and a `refetch`.
4. **Missing screens.** Staff QR (T-1), student rebate request (S-3), admin roster + mint (A-6).
5. **Navigation pass.** Adopt a router; restore back; drop the horizontal dock.
6. **Session pass.** Validate `exp` at bootstrap; global 401 → clean logout.
7. **Transport pass.** Resolve cleartext HTTP; runtime-configurable host in dev; ship a `preview` APK.

**No backend asks remain.** The backend is frozen and all seven previous requests are withdrawn (`prd.md` §8). Everything above is achievable against the 27 existing routes. The two features that were not — voting and poll creation — are cut rather than deferred.

---

## 9. Environment setup

Run the stack bottom-up. Full detail in `MessChain2.0/README.md`.

```bash
# 1 · infra — Besu (:8545), Postgres (:5432), IPFS (:5001)
cd MessChain2.0/infra && echo "DATA_DIR=./data" > .env && docker compose up -d

# 2 · contracts
cd ../hardhat && npm install
#    .env: PRIVATE_KEY=0x61cb…9df0  RPC_URL=http://localhost:8545   (local dev key only)
npx hardhat compile
npx hardhat ignition deploy ignition/modules/Deploy.js --network besu
#    copy the six addresses out of the output

# 3 · backend
cd ../backend && npm install
#    .env: PORT, DATABASE_URL, JWT_SECRET, WALLET_ENCRYPTION_KEY,
#          BESU_RPC_URL, DEPLOYER_PRIVATE_KEY, IPFS_API_URL, six *_CONTRACT addresses
npx prisma migrate dev --name init
npm run seed          # 2 messes + admin@mess.edu / admin_strong_password
npm run dev           # :3000

# 4 · Android app
cd ../..              # repo root
npm install
#    .env: EXPO_PUBLIC_BACKEND_URL=http://<LAN-IP>:3000     ← no /api suffix
npm run android
```

To exercise a meal claim you must first post the day's charge: log in as admin and `POST /api/admin/trigger-cron`, or wait for 00:00 UTC. A student also needs a balance ≥ the daily rate (27), so mint or enrol them first.

Fastest end-to-end smoke test: seed → mint tokens to a student → trigger-cron → read the student's `messId` → build the QR JSON → scan.
