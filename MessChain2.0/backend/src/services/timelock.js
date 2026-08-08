const { timelockContract } = require('../config/besu');

/**
 * Create a daily time-locked transaction for a student.
 * Called by the midnight cron job.
 */
async function createDailyTx(studentAddress, messAddress, date) {
  const tx = await timelockContract.createDailyTx(studentAddress, messAddress, date);
  await tx.wait();
  return tx.hash;
}

/**
 * Verify a student's daily transaction (called when staff scans QR).
 */
async function verifyTx(studentAddress, messAddress, date) {
  const tx = await timelockContract.verifyTx(studentAddress, messAddress, date);
  await tx.wait();
  return tx.hash;
}

/**
 * Check if a transaction exists for a student on a given date.
 */
async function hasTx(studentAddress, messAddress, date) {
  return await timelockContract.hasTx(studentAddress, messAddress, date);
}

module.exports = { createDailyTx, verifyTx, hasTx };
