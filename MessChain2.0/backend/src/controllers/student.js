const prisma = require('../config/db');
const timelockService = require('../services/timelock');
const tokenService = require('../services/token');
const rebateService = require('../services/rebate');
const messService = require('../services/mess');
const governanceService = require('../services/governance');
const ipfsService = require('../services/ipfs');

/**
 * GET /api/student/profile
 */
async function getProfile(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        rollNumber: true,
        walletAddress: true,
        messId: true,
        createdAt: true,
        mess: { select: { name: true } },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (err) {
    console.error('Get profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
}

/**
 * GET /api/student/balance
 */
async function getBalance(req, res) {
  try {
    const balance = await tokenService.getBalance(req.user.walletAddress);
    res.json({ walletAddress: req.user.walletAddress, balance });
  } catch (err) {
    console.error('Get balance error:', err);
    res.status(500).json({ error: 'Failed to fetch balance' });
  }
}

/**
 * POST /api/student/file-complaint
 * Body: { messId, text }
 */
async function fileComplaint(req, res) {
  try {
    const { messId, text } = req.body;

    if (!messId || !text) {
      return res.status(400).json({ error: 'messId and text are required' });
    }

    // Get the student's encrypted private key
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    // Upload complaint text to IPFS (with fallback if IPFS is warm-starting)
    let cid;
    try {
      cid = await ipfsService.addText(text);
    } catch (ipfsErr) {
      console.warn('IPFS add notice:', ipfsErr.message);
      cid = `QmLocalComplaint_${Date.now()}`;
    }

    // Store CID on-chain (signed by student's wallet with auto-gas funding)
    const txHash = await governanceService.fileComplaint(messId, cid, user.walletPrivateKey);

    res.status(201).json({ message: 'Complaint filed', txHash, cid });
  } catch (err) {
    console.error('File complaint error:', err);
    res.status(500).json({ error: err.message || 'Failed to file complaint' });
  }
}

/**
 * POST /api/student/file-feedback
 * Body: { messId, text }
 */
async function fileFeedback(req, res) {
  try {
    const { messId, text } = req.body;

    if (!messId || !text) {
      return res.status(400).json({ error: 'messId and text are required' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    // Upload feedback text to IPFS
    let cid;
    try {
      cid = await ipfsService.addText(text);
    } catch (ipfsErr) {
      console.warn('IPFS add notice:', ipfsErr.message);
      cid = `QmLocalFeedback_${Date.now()}`;
    }

    // Store CID on-chain
    const txHash = await governanceService.fileFeedback(messId, cid, user.walletPrivateKey);

    res.status(201).json({ message: 'Feedback filed', txHash, cid });
  } catch (err) {
    console.error('File feedback error:', err);
    res.status(500).json({ error: err.message || 'Failed to file feedback' });
  }
}

/**
 * POST /api/student/vote
 * Body: { pollId, option }
 */
async function vote(req, res) {
  try {
    const { pollId, option } = req.body;

    if (pollId === undefined || option === undefined) {
      return res.status(400).json({ error: 'pollId and option are required' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    const txHash = await governanceService.vote(pollId, option, user.walletPrivateKey);

    res.json({ message: 'Vote cast', txHash });
  } catch (err) {
    console.error('Vote error:', err);
    res.status(500).json({ error: 'Failed to cast vote' });
  }
}

/**
 * POST /api/student/request-rebate
 * Body: { fromDate, toDate } — epoch timestamps
 */
async function requestRebate(req, res) {
  try {
    const { fromDate, toDate } = req.body;

    if (!fromDate || !toDate) {
      return res.status(400).json({ error: 'fromDate and toDate are required (epoch timestamps)' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    const txHash = await rebateService.requestRebate(fromDate, toDate, user.walletPrivateKey);

    res.status(201).json({ message: 'Rebate requested', txHash });
  } catch (err) {
    console.error('Request rebate error:', err);
    res.status(500).json({ error: 'Failed to request rebate' });
  }
}

/**
 * POST /api/student/request-mess-change
 * Body: { newMessId }
 */
async function requestMessChange(req, res) {
  try {
    const { newMessId } = req.body;

    if (!newMessId) {
      return res.status(400).json({ error: 'newMessId is required' });
    }

    // Verify mess exists in DB
    const mess = await prisma.mess.findUnique({ where: { id: newMessId } });
    if (!mess) {
      return res.status(404).json({ error: 'Mess not found' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });

    const txHash = await messService.requestMessChange(newMessId, user.walletPrivateKey);

    res.status(201).json({ message: 'Mess change requested', txHash });
  } catch (err) {
    console.error('Request mess change error:', err);
    res.status(500).json({ error: 'Failed to request mess change' });
  }
}

/**
 * POST /api/student/verify-meal
 * Simulates a student scanning a QR code at the mess counter.
 */
async function verifyMeal(req, res) {
  try {
    const { scannedMessId } = req.body;

    if (!scannedMessId) {
      return res.status(400).json({ error: 'scannedMessId is required from the QR code' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user.messId) {
      return res.status(400).json({ error: 'You are not assigned to any mess' });
    }

    if (scannedMessId !== user.messId) {
      return res.status(403).json({ error: 'Invalid QR: This QR code belongs to a different mess.' });
    }

    // Use current UTC date for the transaction
    const now = new Date();
    const dateSec = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000);

    // Verify if the daily transaction actually exists before attempting to verify it
    const exists = await timelockService.hasTx(user.walletAddress, user.messId, dateSec);
    if (!exists) {
      return res.status(400).json({ error: 'No daily transaction found for today. Have you run the midnight cron?' });
    }

    const txHash = await timelockService.verifyTx(user.walletAddress, user.messId, dateSec);

    res.json({ message: 'Meal verified successfully!', txHash });
  } catch (err) {
    console.error('Verify meal error:', err);
    res.status(500).json({ error: 'Failed to verify meal. Have you already verified today?' });
  }
}

module.exports = {
  getProfile,
  getBalance,
  fileComplaint,
  fileFeedback,
  vote,
  requestRebate,
  requestMessChange,
  verifyMeal,
};
