const { tokenContract } = require('../config/besu');

/**
 * Get token balance for a wallet address.
 * Returns a number for normal values, or a string if balance exceeds safe integer range.
 */
async function getBalance(walletAddress) {
  try {
    const balance = await tokenContract.getBalance(walletAddress);
    const bigBalance = BigInt(balance);
    if (bigBalance > BigInt(Number.MAX_SAFE_INTEGER)) {
      return bigBalance.toString();
    }
    return Number(bigBalance);
  } catch (err) {
    console.warn('Get balance notice:', err.message || err);
    return 0;
  }
}

/**
 * Mint tokens to a student's wallet (admin-only operation).
 */
async function mintTokens(studentAddress, amount) {
  const tx = await tokenContract.mintTokens(studentAddress, amount);
  await tx.wait();
  return tx.hash;
}

/**
 * Deduct tokens from a student's wallet (system operation for daily deductions).
 */
async function deductTokens(studentAddress, amount) {
  const tx = await tokenContract.deductTokens(studentAddress, amount);
  await tx.wait();
  return tx.hash;
}

/**
 * Semester enrollment — mints 2000 or 3000 tokens based on current balance.
 */
async function semesterEnrollment(studentAddress) {
  const tx = await tokenContract.semesterEnrollment(studentAddress);
  await tx.wait();
  return tx.hash;
}

module.exports = { getBalance, mintTokens, deductTokens, semesterEnrollment };
