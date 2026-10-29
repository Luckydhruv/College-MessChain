# MessChain 2.0 — Project Report

**A Blockchain-Backed Hostel Mess Management System**

---

## 1. Introduction

MessChain 2.0 is a full-stack platform that digitizes and automates hostel mess subscription management for a college or university. It replaces the traditional paper-register and manual-reconciliation approach with a system where every meal charge, meal claim, rebate decision, and complaint is recorded on a blockchain-backed ledger, and where daily billing runs automatically without staff intervention. The project spans a smart-contract layer, a backend API, a web dashboard, and a native Android application, built to serve three distinct user roles: **Student**, **Staff**, and **Admin**.

This report documents the problem the project addresses, the approach taken, the system architecture, the current state of implementation, and the engineering work completed to bring the system to a working, demonstrable state.

---

## 2. Problem Statement

Hostel mess management in most institutions today relies on manual processes that create real, recurring friction for every stakeholder:

- **Opaque billing.** Students have no way to verify that what they're charged corresponds to what they actually consumed. Reconciliation happens once a month, if at all, based on registers that anyone with access can edit.
- **Slow, error-prone rebates.** A student who is away from the hostel — travelling home, on an internship, sick — has to file a paper rebate request and wait for manual approval, often after the billing cycle has already charged them.
- **No verifiable complaint trail.** Feedback and complaints about food quality are usually verbal or logged informally, with no timestamp, no persistence, and no way to prove later that a complaint was actually filed.
- **Double-billing and attendance errors.** Manual meal-tracking (registers, physical tokens, sign-in sheets) is vulnerable to human error and to disputes that are hard to resolve after the fact, since there's no single source of truth.
- **Rigid mess reassignment.** Moving a student from one mess to another is a bureaucratic, multi-step manual process with no clear system of record.
- **No audit trail.** Because financial records live in editable spreadsheets or registers, there is no structural guarantee that a record reflects what actually happened — trust between students and the administration has to be taken on faith.

The core problem, stated simply: **there is no single, trustworthy, automatically-enforced record of who was charged what, who claimed what, and who approved what.**

---

## 3. Our Approach

MessChain 2.0 addresses this by moving the system of record for every financially or procedurally significant event — a daily charge, a meal claim, a rebate decision, a mess transfer, a complaint — onto a blockchain ledger, with business rules enforced by smart contracts rather than manual process. Three design principles guided the build:

1. **Automate what can be automated.** Daily billing runs as a scheduled job with no human step in the loop, and is built to be safely re-run without ever double-charging a student.
2. **Make approvals real, not theatrical.** Every administrative decision — approving a rebate, minting tokens, approving a mess change — is a genuine transaction against the ledger, verifiable by its transaction hash, not a UI animation standing in for one.
3. **Make the system accessible to non-technical users.** Students, staff, and admins interact with a clean web dashboard or a mobile app; nobody needs a crypto wallet, a seed phrase, or any blockchain literacy to use the system. The backend manages all of that abstraction on their behalf.

---

## 4. System Architecture

MessChain 2.0 is built in four layers:

```
┌───────────────────────────────┐   ┌───────────────────────────────┐
│   Web Dashboard (React+Vite)  │   │   Android App (React Native)  │
│   Role-based: Admin/Staff/Stu │   │   Student-focused mobile UX   │
└───────────────┬───────────────┘   └───────────────┬───────────────┘
                │                                    │
                └─────────────────┬──────────────────┘
                                   │  HTTPS + JWT
                                   ▼
                 ┌─────────────────────────────────────┐
                 │  Backend API (Node.js + Express)     │
                 │  Auth · Role checks · Business logic │
                 │  Prisma ORM · Ethers.js · node-cron  │
                 └───┬──────────────┬──────────────┬────┘
                     ▼              ▼              ▼
              PostgreSQL     Hyperledger Besu     IPFS (Kubo)
              (identity,     (smart contracts,    (complaint &
              mess roster)   token ledger)        feedback text)
```

Neither client — web nor Android — ever talks to the blockchain, the database, or IPFS directly. Every request flows through the backend API, which is the single point of integration between the user-facing applications and the underlying infrastructure. This keeps both clients simple, consistent with each other, and free of any need to manage blockchain connectivity or cryptographic keys on the client side.

### 4.1 The Blockchain Layer

The ledger runs on **Hyperledger Besu**, an enterprise-grade Ethereum-client implementation maintained under the Linux Foundation's Hyperledger umbrella and purpose-built for permissioned, institutional blockchain deployments — a deliberate choice over a public chain like Ethereum mainnet, which would expose student financial data publicly and impose real transaction costs for what is a high-frequency, institution-internal workload (one automated transaction per student, every single day).

**Why Hyperledger Besu specifically:**
- It's a production-grade, widely adopted client in enterprise and consortium blockchain deployments, not a toy or academic-only tool.
- It natively supports **QBFT (Quorum Byzantine Fault Tolerant)** consensus, which gives deterministic, near-instant block finality — no waiting on probabilistic confirmations the way a Proof-of-Work chain requires, and no energy-intensive mining hardware.
- It supports a **zero-gas-fee configuration** (`min-gas-price = 0`), which is a natural fit for this use case: the system executes a transaction for essentially every meaningful student action, and a public-chain gas model would make that either prohibitively expensive or require a separate token-economy just to fund gas. Running the network with zero gas removes that friction entirely while keeping every transaction's structure and guarantees identical to a standard EVM chain.
- It's designed from the ground up for permissioned networks — exactly the operating model an institution managing its own hostel infrastructure needs.

### 4.2 Smart Contracts

Six Solidity contracts, deployed via Hardhat Ignition, encode the system's core business rules:

| Contract | Responsibility |
|---|---|
| **Token** | The internal meal-credit ledger. Balances are minted by the admin and deducted automatically by the daily billing job. |
| **TimeLock** | Records each day's charge per student per mess, and enforces — at the contract level — that a student cannot be billed twice for the same day. |
| **Rebate** | Handles leave requests: a student submits a date range, the contract enforces that the range starts in the future, ends after it starts, and doesn't exceed 15 days, and an admin explicitly approves or rejects it. |
| **MessChange** | Handles mess-transfer requests, with admin approval and a deferred effective date applied automatically at the next billing cycle. |
| **Governance** | Anchors complaint and feedback records (as content hashes) and includes the underlying primitives for structured polling. |
| **TenderRate** | Tracks the daily meal rate over time, so historical charges are always attributable to the rate that was actually in effect on that date. |

Enforcing these rules in the contract layer — rather than only in application code — means the constraints hold regardless of which client or code path is used to interact with the system: an invalid rebate request, for example, cannot be accepted no matter what path it comes through.

### 4.3 Off-Chain Storage — IPFS

Complaint and feedback text is stored on IPFS (via a Kubo node) rather than directly on-chain. Only the resulting content hash (CID) is anchored on the `Governance` contract, together with the student, mess, and timestamp. This keeps the chain itself lightweight while still giving every complaint and feedback entry a permanent, verifiable fingerprint — if the underlying text were ever altered, its hash would no longer match the one recorded on-chain.

### 4.4 The Backend

A Node.js/Express API sits between the clients and the infrastructure layer, using Prisma (PostgreSQL ORM) for identity and roster data and Ethers.js for all contract interaction. Two design choices are central to how it works:

- **Custodial wallet management.** Each user is issued a blockchain wallet automatically at registration. The private key is encrypted at rest (AES-256-GCM) and held by the backend — the user never sees a seed phrase or installs a wallet extension. This is what makes the system usable by an ordinary student or mess staff member with zero blockchain background: the blockchain is doing real work underneath, but it's completely invisible in the day-to-day experience.
- **The midnight billing job.** A scheduled job runs once a day and, for every enrolled student, walks through: is a mess assigned → is an approved rebate active for today → is the balance sufficient → has today already been charged (idempotency check) → if all pass, record the charge and deduct the balance. Because every step is a check against the chain's own state, the job can be safely re-triggered on demand (used for testing and demos) without ever double-charging anyone.

### 4.5 Client Applications

- **Web Dashboard (React + Vite).** Built for administrative efficiency — approving rebates, reviewing complaints and feedback, minting tokens, managing staff and mess assignments — all from a fast, role-aware interface suited to a desk workflow.
- **Android Application (React Native / Expo).** Built for student accessibility — claiming a meal by scanning a QR code at the mess counter, checking balance, filing a rebate request, filing complaints/feedback — all from a phone, which is where students actually are day to day.

Having both a web and a native mobile client, sharing one backend and one source of truth, means administrators get a workflow suited to their role while students get the on-the-go accessibility suited to theirs, without any risk of the two views disagreeing with each other.

---

## 5. Roles and Workflow

The system is built around three roles that interact through a coherent, end-to-end loop:

1. **Admin** onboards a student, assigns them to a mess, and mints their opening token balance (semester enrollment automatically issues a tiered opening balance based on prior standing).
2. **Staff** displays a QR code at the mess counter, encoding their mess's identity.
3. **Student** scans that QR at meal time; the backend validates it against the student's assigned mess and today's posted charge, then records the claim — this is enforced so that a claim can never be duplicated for the same student on the same day.
4. Every night, the **automated billing job** charges every eligible student for the day, skipping anyone with an active approved rebate or an insufficient balance, and recording the result.
5. If a **student** knows they'll be away, they submit a **rebate request** with a date range; the request is validated against the contract's constraints before it's even submitted, then queued for admin review.
6. The **admin** reviews pending rebates and explicitly approves or rejects each one — a real transaction, not a placeholder — and an approved rebate is automatically honored by the billing job for the covered dates.
7. If a **student** has a complaint or feedback, they submit it through either client; it's stored on IPFS and anchored on-chain, and the **admin** can review the full, timestamped, tamper-evident history of everything filed.
8. A **student** who needs to switch messes submits a request; once an **admin** approves it, the change takes effect automatically at the next billing cycle.

This loop — onboarding, automated billing, meal verification, rebate handling, complaint capture, and mess transfer — covers the full lifecycle of a student's interaction with the mess system, with the blockchain layer providing the record that ties every step together.

---

## 6. Advantages of This Architecture

- **Zero transaction cost.** Running Besu with a zero-gas configuration means the system can execute a transaction for essentially every meaningful action — a daily charge, a meal claim, a rebate decision — without the cost model of a public chain ever becoming a constraint. This is what makes automating *every single day's billing for every student* practical rather than something to be batched or minimized to save cost.
- **Deterministic, fast finality.** QBFT consensus confirms transactions immediately and deterministically, rather than requiring the student or admin to wait through multiple probabilistic confirmations the way Proof-of-Work systems do — meal claims and approvals feel instant.
- **No mining overhead.** QBFT requires no energy-intensive mining hardware, which keeps the infrastructure footprint modest enough to run entirely on institution-owned hardware.
- **Tamper-evident record-keeping.** Because charges, claims, and decisions are written to an append-only ledger rather than an editable database table, the system provides a structural guarantee — not just a policy — that historical records reflect what actually happened.
- **Structural prevention of double-billing.** The `TimeLock` contract's per-day uniqueness check means a student physically cannot be charged twice for the same day; this isn't application logic that could be bypassed by a bug, it's enforced at the ledger level.
- **Efficient, verifiable document storage.** Pairing IPFS (for bulk content) with on-chain content hashing gives complaints and feedback the same tamper-evidence guarantee as financial records, without bloating the chain itself.
- **Invisible blockchain, real guarantees.** The custodial wallet model means every one of these guarantees is delivered without asking a student, staff member, or admin to understand — or even be aware of — the blockchain underneath. The system reads and feels like an ordinary web/mobile app.
- **Dual accessibility.** A web dashboard for administrative workflows and a native Android app for student-facing, on-the-go interactions — sharing one backend — means every role gets an interface suited to how they actually use the system.

---

## 7. Implementation Status — What We've Resolved

The project began as two independently-built halves: a complete backend/contracts/infrastructure layer, and a visually complete but partially-integrated client layer. The bulk of the recent engineering effort has gone into bringing the client layer up to full, honest integration with the real backend, and into shoring up the underlying infrastructure. Concretely:

- **Full API integration across all three roles.** Every student, staff, and admin screen now reads and writes real backend data — meal claiming, balance and profile display, rebate requests, mess-change requests, complaint and feedback filing, the admin rebate/mess-change approval queues, the student roster, token minting, and semester enrollment are all wired to their real endpoints.
- **Corrected the meal-claim flow.** The QR scanner now correctly parses the structured QR payload and validates it before submission, and the system debounces and locks against duplicate scans.
- **Made administrative approvals real.** Rebate and mess-change approvals now execute genuine on-chain transactions and surface the real transaction hash returned by the backend, replacing what had been placeholder UI behavior.
- **Fixed complaint and feedback submission** to use the student's real, on-chain mess address, and moved feedback to a structured format so ratings and categories can be meaningfully aggregated on the admin side instead of being opaque free text.
- **Session handling.** The app now validates session expiry on launch and cleanly logs a user out with an explanation when their session has expired, rather than leaving them in a broken logged-in state.
- **Resolved a blockchain infrastructure fault.** During integration testing, the validator node was found to be signing with a key that didn't match its own registered validator identity, which had silently prevented the chain from producing any new blocks. This was diagnosed and corrected, and the smart contracts were redeployed and verified.
- **End-to-end verification.** Token minting, meal-claim QR verification, complaint filing, feedback filing, and rebate request/approval were all tested against the live, running system — confirming real transaction hashes, real balance changes, and real IPFS content hashes at every step, not just successful-looking UI states.
- **Codebase cleanup.** Legacy mock data, dead screens, and unused code left over from earlier development were identified and removed, and the project's version control was consolidated into a single, properly tracked repository.

The system, as it stands, is a working, demonstrable, end-to-end platform: a student can be onboarded and funded, claim meals via QR, request and receive rebate decisions, and file complaints and feedback — all recorded on the ledger and reflected consistently across both the web dashboard and the Android app.

---

## 8. Conclusion

MessChain 2.0 demonstrates that a blockchain-backed ledger can be applied to a genuinely practical, everyday institutional problem — hostel mess accounting — without requiring end users to interact with the blockchain directly at all. By combining a zero-gas Hyperledger Besu network, contract-enforced business rules, IPFS-backed document anchoring, and a custodial wallet model behind a conventional web and mobile UI, the system delivers automated billing, structurally-enforced correctness, and a tamper-evident record of every meaningful event — while remaining as easy to use as any ordinary application for the students, staff, and administrators who rely on it day to day.
