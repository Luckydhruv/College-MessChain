const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const prisma = require('../config/db');
const { encryptPrivateKey } = require('../config/crypto');
const messService = require('../services/mess');

/**
 * POST /api/auth/register
 * Student self-registration.
 * Body: { email, password, name, rollNumber, messId }
 */
async function register(req, res) {
  try {
    const { email, password, name, rollNumber, messId } = req.body;

    if (!email || !password || !name || !rollNumber || !messId) {
      return res.status(400).json({ error: 'All fields are required: email, password, name, rollNumber, messId' });
    }

    // Check if user already exists
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { rollNumber }] },
    });
    if (existing) {
      return res.status(409).json({ error: 'User with this email or roll number already exists' });
    }

    // Verify mess exists
    const mess = await prisma.mess.findUnique({ where: { id: messId } });
    if (!mess) {
      return res.status(404).json({ error: 'Mess not found' });
    }

    // Generate wallet
    const wallet = ethers.Wallet.createRandom();
    const encryptedKey = encryptPrivateKey(wallet.privateKey);

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in Postgres
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'STUDENT',
        name,
        rollNumber,
        walletAddress: wallet.address,
        walletPrivateKey: encryptedKey,
        messId,
      },
    });

    // Set initial mess on-chain
    try {
      const { deployerWallet } = require('../config/besu');
      // Fund student wallet with 10.0 ETH to pay for transaction gas fees
      const fundTx = await deployerWallet.sendTransaction({
        to: wallet.address,
        value: ethers.parseEther('10.0'),
      });
      await fundTx.wait();
      console.log(`Funded new student wallet ${wallet.address} with 10.0 ETH for gas`);

      await messService.setInitialMess(wallet.address, mess.id);
    } catch (chainErr) {
      console.error('Failed to initialize student on-chain:', chainErr.message);
      // Non-fatal: user is created, chain sync can be retried
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, role: user.role, walletAddress: user.walletAddress },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        walletAddress: user.walletAddress,
      },
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  }
}

/**
 * POST /api/auth/login
 * All roles. Returns JWT with role info.
 * Body: { email, password }
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, walletAddress: user.walletAddress },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        walletAddress: user.walletAddress,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
}

module.exports = { register, login };
