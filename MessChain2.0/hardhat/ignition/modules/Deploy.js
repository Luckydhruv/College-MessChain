const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("MessChain", (m) => {
  // system address = deployer for now
  // after backend is set up, we update this to backend wallet
  const deployer = "0x70a8bef9019b999cbff35b861ca6a6adcd012bf7";

  const token = m.contract("Token", [deployer]);
  const timeLock = m.contract("TimeLock", [deployer]);
  const rebate = m.contract("Rebate", []);
  const messChange = m.contract("MessChange", [deployer]);
  const governance = m.contract("Governance", []);
  const tenderRate = m.contract("TenderRate", [27]); // 27 tokens/day default

  return { token, timeLock, rebate, messChange, governance, tenderRate };
});
