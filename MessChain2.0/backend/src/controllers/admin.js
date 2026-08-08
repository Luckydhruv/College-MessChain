const bcrypt = require('bcrypt');
const { ethers } = require('ethers');
const prisma = require('../config/db');
const { encryptPrivateKey } = require('../config/crypto');
const tokenService = require('../services/token');
const rebateService = require('../services/rebate');
const messService = require('../services/mess');
const governanceService = require('../services/governance');
const ipfsService = require('../services/ipfs');
const { runMidnightJob } = require('../jobs/midnight');

/**
 * POST /api/admin/create-staff
 * Body: { email, password, name }
 */
async function createStaff(req, res) {
  try {
    const { email, password, name, messId } = req.body;

    if (!email || !password || !name || !messId) {
      return res.status(400).json({ error: 'email, password, name, and messId are required' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const wallet = ethers.Wallet.createRandom();
    const encryptedKey = encryptPrivateKey(wallet.privateKey);
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'STAFF',
        name,
        walletAddress: wallet.address,
        walletPrivateKey: encryptedKey,
        messId,
      },
    });

    res.status(201).json({
      message: 'Staff created',
      user: { id: user.id, email: user.email, name: user.name, role: user.role, walletAddress: user.walletAddress },
    });
  } catch (err) {
    console.error('Create staff error:', err);
    res.status(500).json({ error: 'Failed to create staff' });
  }
}

/**
 * POST /api/admin/mint-tokens
 * Body: { rollNumber, amount }
 */
async function mintTokens(req, res) {
  try {
    const { rollNumber, amount } = req.body;

    if (!rollNumber || !amount) {
      return res.status(400).json({ error: 'rollNumber and amount are required' });
    }

    const student = await prisma.user.findFirst({ where: { rollNumber } });
    if (!student || student.role !== 'STUDENT') {
      return res.status(404).json({ error: 'Student not found' });
    }

    const txHash = await tokenService.mintTokens(student.walletAddress, amount);
    res.json({ message: 'Tokens minted', txHash, amount });
  } catch (err) {
    console.error('Mint tokens error:', err);
    res.status(500).json({ error: 'Failed to mint tokens' });
  }
}

/**
 * POST /api/admin/semester-enrollment
 * Body: { studentId }
 */
async function semesterEnrollment(req, res) {
  try {
    const { studentId } = req.body;

    const student = await prisma.user.findUnique({ where: { id: studentId } });
    if (!student || student.role !== 'STUDENT') {
      return res.status(404).json({ error: 'Student not found' });
    }

    const balanceBefore = await tokenService.getBalance(student.walletAddress);
    const txHash = await tokenService.semesterEnrollment(student.walletAddress);
    const balanceAfter = await tokenService.getBalance(student.walletAddress);

    res.json({
      message: 'Semester enrollment complete',
      txHash,
      balanceBefore,
      balanceAfter,
      minted: balanceAfter - balanceBefore,
    });
  } catch (err) {
    console.error('Semester enrollment error:', err);
    res.status(500).json({ error: 'Semester enrollment failed' });
  }
}

/**
 * GET /api/admin/complaints
 */
async function getComplaints(req, res) {
  try {
    const count = await governanceService.getComplaintCount();
    const complaints = [];

    for (let i = 0; i < count; i++) {
      const complaint = await governanceService.getComplaint(i);
      // Try to fetch IPFS content
      try {
        complaint.content = await ipfsService.getText(complaint.cid);
      } catch {
        complaint.content = null;
      }
      complaint.id = i;
      complaints.push(complaint);
    }

    res.json({ complaints });
  } catch (err) {
    console.warn('Get complaints notice:', err.message || err);
    res.json({ complaints: [] });
  }
}

/**
 * GET /api/admin/feedback-report
 */
async function getFeedbackReport(req, res) {
  try {
    const count = await governanceService.getFeedbackCount();
    const feedbacks = [];

    for (let i = 0; i < count; i++) {
      const feedback = await governanceService.getFeedback(i);
      try {
        feedback.content = await ipfsService.getText(feedback.cid);
      } catch {
        feedback.content = null;
      }
      feedback.id = i;
      feedbacks.push(feedback);
    }

    res.json({ feedbacks });
  } catch (err) {
    console.warn('Get feedback notice:', err.message || err);
    res.json({ feedbacks: [] });
  }
}

/**
 * GET /api/admin/rebates
 */
async function getRebates(req, res) {
  try {
    const count = await rebateService.getRequestCount();
    const rebates = [];

    for (let i = 0; i < count; i++) {
      const rebate = await rebateService.getRequest(i);
      rebate.id = i;
      rebates.push(rebate);
    }

    res.json({ rebates });
  } catch (err) {
    console.warn('Get rebates notice:', err.message || err);
    res.json({ rebates: [] });
  }
}

/**
 * POST /api/admin/rebates/:id/approve
 */
async function approveRebate(req, res) {
  try {
    const id = parseInt(req.params.id);
    const txHash = await rebateService.approveRebate(id);
    res.json({ message: 'Rebate approved', txHash });
  } catch (err) {
    console.error('Approve rebate error:', err);
    res.status(500).json({ error: 'Failed to approve rebate' });
  }
}

/**
 * POST /api/admin/rebates/:id/reject
 */
async function rejectRebate(req, res) {
  try {
    const id = parseInt(req.params.id);
    const txHash = await rebateService.rejectRebate(id);
    res.json({ message: 'Rebate rejected', txHash });
  } catch (err) {
    console.error('Reject rebate error:', err);
    res.status(500).json({ error: 'Failed to reject rebate' });
  }
}

/**
 * POST /api/admin/create-poll
 * Body: { question, options } — options is an array of strings
 */
async function createPoll(req, res) {
  try {
    const { question, options } = req.body;

    if (!question || !options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'question and options (array, min 2) are required' });
    }

    // Upload poll content to IPFS
    const pollContent = JSON.stringify({ question, options });
    const cid = await ipfsService.addText(pollContent);

    // Store CID on-chain
    const txHash = await governanceService.createPoll(cid, options.length);

    res.status(201).json({ message: 'Poll created', txHash, cid });
  } catch (err) {
    console.error('Create poll error:', err);
    res.status(500).json({ error: 'Failed to create poll' });
  }
}

/**
 * GET /api/admin/mess-changes
 */
async function getMessChanges(req, res) {
  try {
    const count = await messService.getRequestCount();
    const changes = [];

    for (let i = 0; i < count; i++) {
      const change = await messService.getRequest(i);
      change.id = i;
      changes.push(change);
    }

    res.json({ messChanges: changes });
  } catch (err) {
    console.warn('Get mess changes notice:', err.message || err);
    res.json({ messChanges: [] });
  }
}

/**
 * POST /api/admin/mess-changes/:id/approve
 */
async function approveMessChange(req, res) {
  try {
    const id = parseInt(req.params.id);

    // Approve on-chain — the contract sets effectiveDate to next midnight.
    // The actual messId flip in Postgres is deferred to the midnight cron job
    // which calls applyMessChange once effectiveDate has passed.
    const txHash = await messService.approveMessChange(id);

    res.json({ message: 'Mess change approved (effective from tomorrow)', txHash });
  } catch (err) {
    console.error('Approve mess change error:', err);
    res.status(500).json({ error: 'Failed to approve mess change' });
  }
}

/**
 * POST /api/admin/mess-changes/:id/reject
 */
async function rejectMessChange(req, res) {
  try {
    const id = parseInt(req.params.id);
    const txHash = await messService.rejectMessChange(id);
    res.json({ message: 'Mess change rejected', txHash });
  } catch (err) {
    console.error('Reject mess change error:', err);
    res.status(500).json({ error: 'Failed to reject mess change' });
  }
}

/**
 * GET /api/admin/students
 */
async function getStudents(req, res) {
  try {
    const students = await prisma.user.findMany({
      where: { role: 'STUDENT' },
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

    // Fetch on-chain balances for each student
    const studentsWithBalances = await Promise.all(
      students.map(async (s) => {
        try {
          const balance = await tokenService.getBalance(s.walletAddress);
          return { ...s, balance };
        } catch {
          return { ...s, balance: null };
        }
      })
    );

    res.json({ students: studentsWithBalances });
  } catch (err) {
    console.error('Get students error:', err);
    res.status(500).json({ error: 'Failed to fetch students' });
  }
}

/**
 * POST /api/admin/trigger-cron
 */
async function triggerCron(req, res) {
  try {
    const stats = await runMidnightJob();
    res.json({ message: 'Midnight cron job executed manually', stats });
  } catch (err) {
    console.error('Trigger cron error:', err);
    res.status(500).json({ error: 'Failed to run cron job' });
  }
}

module.exports = {
  createStaff,
  mintTokens,
  semesterEnrollment,
  getComplaints,
  getFeedbackReport,
  getRebates,
  approveRebate,
  rejectRebate,
  createPoll,
  getMessChanges,
  approveMessChange,
  rejectMessChange,
  getStudents,
  triggerCron,
};
