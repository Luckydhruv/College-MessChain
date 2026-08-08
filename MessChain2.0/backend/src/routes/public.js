const router = require('express').Router();
const prisma = require('../config/db');

// GET /api/public/messes — get all messes
router.get('/messes', async (req, res) => {
  try {
    const messes = await prisma.mess.findMany({
      select: {
        id: true,
        name: true,
      },
    });
    res.json({ messes });
  } catch (err) {
    console.error('Failed to fetch messes:', err);
    res.status(500).json({ error: 'Failed to fetch messes' });
  }
});

module.exports = router;
