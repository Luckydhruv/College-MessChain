const { messChangeContract, getContractWithSigner, MessChangeABI } = require('../config/besu');
const { decryptPrivateKey } = require('../config/crypto');

/**
 * Set the initial mess for a student (system/admin operation during registration).
 */
async function setInitialMess(studentAddress, messAddress) {
  const tx = await messChangeContract.setInitialMess(studentAddress, messAddress);
  await tx.wait();
  return tx.hash;
}

/**
 * Request a mess change on behalf of a student (signed by student's wallet).
 */
async function requestMessChange(newMessAddress, encryptedPrivateKey) {
  const privateKey = decryptPrivateKey(encryptedPrivateKey);
  const contract = await getContractWithSigner(
    process.env.MESS_CHANGE_CONTRACT,
    MessChangeABI,
    privateKey
  );
  const tx = await contract.requestMessChange(newMessAddress);
  await tx.wait();
  return tx.hash;
}

/**
 * Approve a mess change request (admin-only).
 */
async function approveMessChange(id) {
  const tx = await messChangeContract.approveMessChange(id);
  await tx.wait();
  return tx.hash;
}

/**
 * Reject a mess change request (admin-only).
 */
async function rejectMessChange(id) {
  const tx = await messChangeContract.rejectMessChange(id);
  await tx.wait();
  return tx.hash;
}

/**
 * Apply an approved mess change once effectiveDate has passed (system/cron operation).
 */
async function applyMessChange(id) {
  const tx = await messChangeContract.applyMessChange(id);
  await tx.wait();
  return tx.hash;
}

/**
 * Get the current mess address for a student from the chain.
 */
async function getCurrentMess(studentAddress) {
  return await messChangeContract.getCurrentMess(studentAddress);
}

/**
 * Get a mess change request by ID.
 */
async function getRequest(id) {
  const r = await messChangeContract.requests(id);
  return {
    student: r.student,
    fromMess: r.fromMess,
    toMess: r.toMess,
    status: Number(r.status), // 0=PENDING, 1=APPROVED, 2=REJECTED
    requestedAt: Number(r.requestedAt),
    effectiveDate: Number(r.effectiveDate),
    decidedBy: r.decidedBy,
  };
}

/**
 * Get total number of mess change requests.
 */
async function getRequestCount() {
  return Number(await messChangeContract.requestCount());
}

/**
 * Get all mess change request IDs for a student.
 */
async function getStudentRequests(studentAddress) {
  const ids = await messChangeContract.getStudentRequests(studentAddress);
  return ids.map((id) => Number(id));
}

module.exports = {
  setInitialMess,
  requestMessChange,
  approveMessChange,
  rejectMessChange,
  applyMessChange,
  getCurrentMess,
  getRequest,
  getRequestCount,
  getStudentRequests,
};
