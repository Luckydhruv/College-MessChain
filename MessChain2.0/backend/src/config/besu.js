const { ethers } = require('ethers');
const path = require('path');

// Validate required environment variables at startup
const REQUIRED_ENV = [
  'BESU_RPC_URL',
  'DEPLOYER_PRIVATE_KEY',
  'TOKEN_CONTRACT',
  'TIMELOCK_CONTRACT',
  'REBATE_CONTRACT',
  'MESS_CHANGE_CONTRACT',
  'GOVERNANCE_CONTRACT',
  'TENDER_RATE_CONTRACT',
];

const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  throw new Error(
    `[besu.js] Missing required environment variables:\n  ${missing.join('\n  ')}\nPlease check your .env file.`
  );
}

// ABIs
const TokenABI = require('./abis/Token.json');
const TimeLockABI = require('./abis/TimeLock.json');
const RebateABI = require('./abis/Rebate.json');
const MessChangeABI = require('./abis/MessChange.json');
const GovernanceABI = require('./abis/Governance.json');
const TenderRateABI = require('./abis/TenderRate.json');

// Provider
const provider = new ethers.JsonRpcProvider(process.env.BESU_RPC_URL);

// Deployer wallet (admin/system signer)
const deployerWallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);

// Contract instances (connected to deployer wallet for write operations)
const tokenContract = new ethers.Contract(
  process.env.TOKEN_CONTRACT,
  TokenABI,
  deployerWallet
);

const timelockContract = new ethers.Contract(
  process.env.TIMELOCK_CONTRACT,
  TimeLockABI,
  deployerWallet
);

const rebateContract = new ethers.Contract(
  process.env.REBATE_CONTRACT,
  RebateABI,
  deployerWallet
);

const messChangeContract = new ethers.Contract(
  process.env.MESS_CHANGE_CONTRACT,
  MessChangeABI,
  deployerWallet
);

const governanceContract = new ethers.Contract(
  process.env.GOVERNANCE_CONTRACT,
  GovernanceABI,
  deployerWallet
);

const tenderRateContract = new ethers.Contract(
  process.env.TENDER_RATE_CONTRACT,
  TenderRateABI,
  deployerWallet
);

/**
 * Create a contract instance connected to a specific user's wallet.
 * Ensures the user wallet has sufficient gas funds before executing.
 */
async function getContractWithSigner(contractAddress, abi, privateKey) {
  const wallet = new ethers.Wallet(privateKey, provider);
  try {
    const balance = await provider.getBalance(wallet.address);
    if (balance < ethers.parseEther('0.1')) {
      const fundTx = await deployerWallet.sendTransaction({
        to: wallet.address,
        value: ethers.parseEther('2.0'),
      });
      await fundTx.wait();
    }
  } catch (err) {
    console.warn('Auto-fund gas warning:', err.message);
  }
  return new ethers.Contract(contractAddress, abi, wallet);
}

module.exports = {
  provider,
  deployerWallet,
  tokenContract,
  timelockContract,
  rebateContract,
  messChangeContract,
  governanceContract,
  tenderRateContract,
  getContractWithSigner,
  // Export ABIs for getContractWithSigner usage
  TokenABI,
  TimeLockABI,
  RebateABI,
  MessChangeABI,
  GovernanceABI,
  TenderRateABI,
};
