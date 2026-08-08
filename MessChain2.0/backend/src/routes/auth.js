const router = require('express').Router();
const authController = require('../controllers/auth');

// POST /api/auth/register — student self registration
router.post('/register', authController.register);

// POST /api/auth/login — all roles
router.post('/login', authController.login);

module.exports = router;
