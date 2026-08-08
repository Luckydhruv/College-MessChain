const { rebateContract, getContractWithSigner, RebateABI } = require('../config/besu');
const { decryptPrivateKey } = require('../config/crypto');

/**
 * Request a rebate on behalf of a student (signed by student's wallet).
 */
async function requestRebate(fromDate, toDate, encryptedPrivateKey) {
  const privateKey = decryptPrivateKey(encryptedPrivateKey);
  const contract = await getContractWithSigner(
    process.env.REBATE_CONTRACT,
    RebateABI,
    privateKey
  );
  const tx = await contract.requestRebate(fromDate, toDate);
  await tx.wait();
  return tx.hash;
}

/**
 * Approve a rebate request (admin-only).
 */
async function approveRebate(id) {
  const tx = await rebateContract.approveRebate(id);
  await tx.wait();
  return tx.hash;
}

/**
 * Reject a rebate request (admin-only).
 */
async function rejectRebate(id) {
  const tx = await rebateContract.rejectRebate(id);
  await tx.wait();
  return tx.hash;
}

/**
 * Check if a student has an active rebate for a given date.
 */
async function isRebateActive(studentAddress, date) {
  return await rebateContract.isRebateActive(studentAddress, date);
}

/**
 * Get a rebate request by ID.
 */
async function getRequest(id) {
  const r = await rebateContract.requests(id);
  return {
    student: r.student,
    fromDate: Number(r.fromDate),
    toDate: Number(r.toDate),
    status: Number(r.status), // 0=PENDING, 1=APPROVED, 2=REJECTED
    requestedAt: Number(r.requestedAt),
    decidedAt: Number(r.decidedAt),
    decidedBy: r.decidedBy,
  };
}

/**
 * Get total number of rebate requests.
 */
async function getRequestCount() {
  return Number(await rebateContract.requestCount());
}

/**
 * Get all rebate request IDs for a student.
 */
async function getStudentRequests(studentAddress) {
  const ids = await rebateContract.getStudentRequests(studentAddress);
  return ids.map((id) => Number(id));
}

module.exports = {
  requestRebate,
  approveRebate,
  rejectRebate,
  isRebateActive,
  getRequest,
  getRequestCount,
  getStudentRequests,
};
