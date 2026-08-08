const prisma = require('../config/db');
const timelockService = require('../services/timelock');

/**
 * GET /api/staff/profile
 */
async function getProfile(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        messId: true,
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
 * POST /api/staff/verify-qr
 * Body: { studentId }
 *
 * Staff scans a student's QR code. The frontend decodes the QR payload
 * and sends studentId to this endpoint. Date is computed server-side
 * to prevent replay attacks.
 */
async function verifyQR(req, res) {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({ error: 'studentId is required' });
    }

    // Get staff's mess
    const staff = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!staff || !staff.messId) {
      return res.status(403).json({ error: 'Staff not assigned to a mess' });
    }
    const messId = staff.messId;

    // Look up the student's wallet address
    const student = await prisma.user.findUnique({ where: { id: studentId } });
    if (!student || student.role !== 'STUDENT') {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Compute today's date server-side (same logic as midnight cron)
    const now = new Date();
    const date = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000);

    // Check if a daily tx exists for this student
    const exists = await timelockService.hasTx(student.walletAddress, messId, date);
    if (!exists) {
      return res.status(404).json({
        error: 'No transaction found for this student today',
        verified: false,
      });
    }

    // Verify the transaction on-chain
    const txHash = await timelockService.verifyTx(student.walletAddress, messId, date);

    res.json({
      message: 'QR verified successfully',
      verified: true,
      txHash,
      student: {
        id: student.id,
        name: student.name,
        rollNumber: student.rollNumber,
      },
    });
  } catch (err) {
    console.error('Verify QR error:', err);

    if (err.message && err.message.includes('Already verified')) {
      return res.status(409).json({ error: 'Meal already verified for today', verified: false });
    }
    if (err.message && err.message.includes('No tx found')) {
      return res.status(404).json({ error: 'No transaction found for today', verified: false });
    }

    res.status(500).json({ error: 'QR verification failed' });
  }
}

module.exports = { verifyQR, getProfile };
