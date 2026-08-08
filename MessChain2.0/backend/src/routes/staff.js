const router = require('express').Router();
const auth = require('../middleware/auth');
const checkRole = require('../middleware/role');
const staffController = require('../controllers/staff');

// All staff routes require JWT + STAFF role
router.use(auth, checkRole('STAFF'));

// Staff profile
router.get('/profile', staffController.getProfile);

// QR verification
router.post('/verify-qr', staffController.verifyQR);

module.exports = router;
