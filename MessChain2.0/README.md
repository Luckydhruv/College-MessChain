# MessChain 2.0

MessChain 2.0 is a decentralized, blockchain-powered hostel mess subscription, rebate, and voting governance system. It runs on a private **Hyperledger Besu** network using QBFT consensus, offering a tamper-proof and automated meal accounting solution.

---

## Architecture Overview

The project is split into four primary components:

1. **`infra/`**: Docker-based local services containing the Hyperledger Besu blockchain node, IPFS (Kubo) storage, and a PostgreSQL database.
2. **`hardhat/`**: Solidity contracts (ERC20 tokens, Governance, Rebates, Mess Change, TimeLock, TenderRate) and Hardhat Ignition deployment scripts.
3. **`backend/`**: Node.js & Express API backend that handles user authentication, cryptographic wallet encryption, interaction with smart contracts via Ethers.js, and automated daily meal deductions via a cron job.
4. **`frontend/`**: A React + Vite web dashboard featuring responsive interfaces, role-based dashboards (Admin, Student, Staff), and context-driven authentication.

---

## 🛠️ Prerequisites

Make sure you have the following installed on your machine:
- **Node.js** (v18.x or later)
- **NPM** or **Yarn**
- **Docker** and **Docker Compose**
- **Git**

---

## 🚀 Local Setup Guide

Follow these steps sequentially to set up and run the entire stack locally.

### Step 1: Start the Infrastructure (`infra`)

This spins up the Hyperledger Besu node, PostgreSQL database, and IPFS node.

1. Navigate to the infrastructure folder:
   ```bash
   cd infra
   ```
2. Create/verify the `.env` file inside `infra/` to specify where Docker data should be stored:
   ```env
   DATA_DIR=./data
   ```
   *(By default, it uses `./data` inside the folder, or `/mnt/data` if preferred. Ensure the directory is writable.)*
3. Spin up the containers:
   ```bash
   docker compose up -d
   ```
4. Verify the containers are running:
   ```bash
   docker compose ps
   ```
   - **Besu RPC** is exposed on `http://localhost:8545`
   - **Postgres** is exposed on `http://localhost:5432`
   - **IPFS API** is exposed on `http://localhost:5001`

---

### Step 2: Deploy the Smart Contracts (`hardhat`)

1. Navigate to the hardhat folder:
   ```bash
   cd ../hardhat
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `hardhat/` directory. You will need a private key that is pre-funded on the local Hyperledger Besu network. Choose one of the options below:

   #### Option A: Use the default development key (Quickest)
   Use the default test key corresponding to the pre-funded validator address `0x70a8bef9019b999cbff35b861ca6a6adcd012bf7` defined in the genesis block:
   ```env
   PRIVATE_KEY=0x61cb6b7d518753ed87a121f40aa92b95b4e2f89f70f0984eca3ad2eda13b9df0
   RPC_URL=http://localhost:8545
   ```
   > [!WARNING]
   > This default key is for local development only. Do not use this key on any public network, and never deposit real funds into its corresponding address.

   #### Option B: Generate and use a custom deployer key
   If you want to use your own private key, follow these steps:
   1. Generate a new private key and address using Node.js:
      ```bash
      node -e "const { Wallet } = require('ethers'); const w = Wallet.createRandom(); console.log('Address:', w.address); console.log('Private Key:', w.privateKey);"
      ```
   2. Open [infra/besu/genesis.json](file://MessChain2.0/infra/besu/genesis.json) and add your new address to the `alloc` map to pre-fund it:
      ```json
      "alloc": {
        "YOUR_NEW_ADDRESS": {
          "balance": "0x200000000000000000000000000000000000000000000000000000000000000"
        }
      }
      ```
   3. Restart and clear the Besu volumes to apply the new genesis file:
      ```bash
      cd ../infra
      docker compose down -v
      docker compose up -d
      cd ../hardhat
      ```
   4. Set your custom private key in `hardhat/.env`:
      ```env
      PRIVATE_KEY=YOUR_NEW_PRIVATE_KEY
      RPC_URL=http://localhost:8545
      ```
4. Compile the smart contracts:
   ```bash
   npx hardhat compile
   ```
5. Deploy the contracts to the local Hyperledger Besu network using Hardhat Ignition:
   ```bash
   npx hardhat ignition deploy ignition/modules/Deploy.js --network besu
   ```
6. Upon successful deployment, copy the contract addresses displayed in the terminal. They will look similar to this:
   ```json
   {
     "MessChain#Governance": "0x959A4D98D4DE365648604e13cc5b0Cde3c8726D2",
     "MessChain#MessChange": "0x8d59805737d014a7ceca359bd8dDD56F1DC1Ba8E",
     "MessChain#Rebate": "0x346777535D0323333EdbC4acBF90830893f9A2b2",
     "MessChain#TenderRate": "0x7c52846bb4E6A36D2D8F2316E57C275e4402e175",
     "MessChain#TimeLock": "0xF868dBA50602079b936280567750C73c04112738",
     "MessChain#Token": "0xE9d34383057C267e5903781D48C21Dfa65faeA6F"
   }
   ```

---

### Step 3: Run the Backend API (`backend`)

1. Navigate to the backend folder:
   ```bash
   cd ../backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file inside `backend/` and update it with the deployed contract addresses:
   ```env
   PORT=3000
   DATABASE_URL=postgresql://mess:mess_secret@localhost:5432/mess_auth
   JWT_SECRET=messchain_jwt_secret_change_in_production_2024
   
   # Cryptographic key (64 hex characters / 32 bytes) for encrypting user private keys
   WALLET_ENCRYPTION_KEY=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2

   # Besu Configuration
   # WARNING: This is a local-only development key. Never use this in production!
   BESU_RPC_URL=http://localhost:8545
   DEPLOYER_PRIVATE_KEY=0x61cb6b7d518753ed87a121f40aa92b95b4e2f89f70f0984eca3ad2eda13b9df0 # Must match the deployer key from Step 2 (Option A or Option B)

   # IPFS Endpoint
   IPFS_API_URL=http://localhost:5001

   # Smart Contract Addresses (Update with your output from Hardhat deployment)
   TOKEN_CONTRACT=0xE9d34383057C267e5903781D48C21Dfa65faeA6F
   TIMELOCK_CONTRACT=0xF868dBA50602079b936280567750C73c04112738
   REBATE_CONTRACT=0x346777535D0323333EdbC4acBF90830893f9A2b2
   MESS_CHANGE_CONTRACT=0x8d59805737d014a7ceca359bd8dDD56F1DC1Ba8E
   GOVERNANCE_CONTRACT=0x959A4D98D4DE365648604e13cc5b0Cde3c8726D2
   TENDER_RATE_CONTRACT=0x7c52846bb4E6A36D2D8F2316E57C275e4402e175
   ```
4. Run Database Migrations to set up the Postgres schema:
   ```bash
   npx prisma migrate dev --name init
   ```
5. Seed the database with messes and the default admin user:
   ```bash
   npm run seed
   ```
6. Start the backend development server:
   ```bash
   npm run dev
   ```
   - The backend runs on `http://localhost:3000`
   - An automated midnight cron job is active to process daily meal charges and apply approved mess changes.

---

### Step 4: Run the Frontend App (`frontend`)

1. Navigate to the frontend folder:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser and go to: **`http://localhost:5173`**

---

## 🔑 Default Credentials

After running the database seed script, you can log in to the web interface as Admin From the Admin panel, you can:
- View current messes.
- Add students and staff members.
- Manage token balances and monitor daily logs.

---

## ⚙️ How the Midnight Cron Job Works
The backend schedules a job that executes at `00:00` daily (`0 0 * * *`). It performs the following sequence for each student:
1. **Mess Verification**: Skips if the student has no mess assigned.
2. **Rebate Check**: Queries the `Rebate` smart contract. If an approved rebate is active for today, the run is skipped for the student.
3. **Balance Check**: Verifies if the student has sufficient ERC20 tokens in their wallet relative to the current daily rate (set in `TenderRate`).
4. **Processing**: Deducts tokens and records a daily time-locked transaction in the `TimeLock` contract, preventing double-billing for the day.