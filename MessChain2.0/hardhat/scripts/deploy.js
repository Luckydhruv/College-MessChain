const { ethers } = require("hardhat");

async function deployContract(name, factory, args = [], signer) {
  console.log(`Deploying ${name}...`);
  const nonce = await signer.getNonce("pending");
  // 10 Gwei comfortably satisfies node min-price and replaces any pending stuck transaction
  const gasPrice = 10000000000n; 

  const contract = await factory.deploy(...args, {
    gasPrice: gasPrice,
    gasLimit: 5000000,
    nonce: nonce,
  });

  const txHash = contract.deploymentTransaction()?.hash;
  console.log(`Waiting for ${name} tx ${txHash}...`);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log(`✓ ${name} deployed to: ${address}\n`);
  return address;
}

async function main() {
  const [signer] = await ethers.getSigners();
  const deployerAddress = signer.address;
  console.log("==========================================");
  console.log("Deploying MessChain to Besu QBFT Network");
  console.log("Deployer:", deployerAddress);
  console.log("==========================================\n");

  const Token = await ethers.getContractFactory("Token", signer);
  const tokenAddr = await deployContract("Token", Token, [deployerAddress], signer);

  const TimeLock = await ethers.getContractFactory("TimeLock", signer);
  const timeLockAddr = await deployContract("TimeLock", TimeLock, [deployerAddress], signer);

  const Rebate = await ethers.getContractFactory("Rebate", signer);
  const rebateAddr = await deployContract("Rebate", Rebate, [], signer);

  const MessChange = await ethers.getContractFactory("MessChange", signer);
  const messChangeAddr = await deployContract("MessChange", MessChange, [deployerAddress], signer);

  const Governance = await ethers.getContractFactory("Governance", signer);
  const governanceAddr = await deployContract("Governance", Governance, [], signer);

  const TenderRate = await ethers.getContractFactory("TenderRate", signer);
  const tenderRateAddr = await deployContract("TenderRate", TenderRate, [27], signer);

  console.log("==========================================");
  console.log("✅ ALL CONTRACTS DEPLOYED SUCCESSFULLY");
  console.log("==========================================");
  console.log(`TOKEN_CONTRACT=${tokenAddr}`);
  console.log(`TIMELOCK_CONTRACT=${timeLockAddr}`);
  console.log(`REBATE_CONTRACT=${rebateAddr}`);
  console.log(`MESS_CHANGE_CONTRACT=${messChangeAddr}`);
  console.log(`GOVERNANCE_CONTRACT=${governanceAddr}`);
  console.log(`TENDER_RATE_CONTRACT=${tenderRateAddr}`);
  console.log("==========================================");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
