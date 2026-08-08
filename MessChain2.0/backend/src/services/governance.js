const { governanceContract, getContractWithSigner, GovernanceABI } = require('../config/besu');
const { decryptPrivateKey } = require('../config/crypto');

/**
 * File a complaint (signed by student's wallet).
 */
async function fileComplaint(messAddress, cid, encryptedPrivateKey) {
  const privateKey = decryptPrivateKey(encryptedPrivateKey);
  const contract = await getContractWithSigner(
    process.env.GOVERNANCE_CONTRACT,
    GovernanceABI,
    privateKey
  );
  const tx = await contract.fileComplaint(messAddress, cid);
  await tx.wait();
  return tx.hash;
}

/**
 * File feedback (signed by student's wallet).
 */
async function fileFeedback(messAddress, cid, encryptedPrivateKey) {
  const privateKey = decryptPrivateKey(encryptedPrivateKey);
  const contract = await getContractWithSigner(
    process.env.GOVERNANCE_CONTRACT,
    GovernanceABI,
    privateKey
  );
  const tx = await contract.fileFeedback(messAddress, cid);
  await tx.wait();
  return tx.hash;
}

/**
 * Create a poll (admin-only).
 */
async function createPoll(cid, optionCount) {
  const tx = await governanceContract.createPoll(cid, optionCount);
  await tx.wait();
  return tx.hash;
}

/**
 * Vote on a poll (signed by student's wallet).
 */
async function vote(pollId, option, encryptedPrivateKey) {
  const privateKey = decryptPrivateKey(encryptedPrivateKey);
  const contract = await getContractWithSigner(
    process.env.GOVERNANCE_CONTRACT,
    GovernanceABI,
    privateKey
  );
  const tx = await contract.vote(pollId, option);
  await tx.wait();
  return tx.hash;
}

/**
 * Get a complaint by ID.
 */
async function getComplaint(id) {
  const c = await governanceContract.complaints(id);
  return {
    student: c.student,
    mess: c.mess,
    cid: c.cid,
    timestamp: Number(c.timestamp),
  };
}

/**
 * Get total number of complaints.
 */
async function getComplaintCount() {
  return Number(await governanceContract.complaintCount());
}

/**
 * Get a feedback entry by ID.
 */
async function getFeedback(id) {
  const f = await governanceContract.feedbacks(id);
  return {
    student: f.student,
    mess: f.mess,
    cid: f.cid,
    timestamp: Number(f.timestamp),
  };
}

/**
 * Get total number of feedback entries.
 */
async function getFeedbackCount() {
  return Number(await governanceContract.feedbackCount());
}

/**
 * Get a poll by ID.
 */
async function getPoll(id) {
  const p = await governanceContract.polls(id);
  return {
    cid: p.cid,
    optionCount: Number(p.optionCount),
    createdAt: Number(p.createdAt),
    active: p.active,
  };
}

/**
 * Get total number of polls.
 */
async function getPollCount() {
  return Number(await governanceContract.pollCount());
}

/**
 * Get the vote count for a specific option in a poll.
 */
async function getPollVotes(pollId, option) {
  return Number(await governanceContract.getPollVotes(pollId, option));
}

module.exports = {
  fileComplaint,
  fileFeedback,
  createPoll,
  vote,
  getComplaint,
  getComplaintCount,
  getFeedback,
  getFeedbackCount,
  getPoll,
  getPollCount,
  getPollVotes,
};
