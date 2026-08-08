const router = require('express').Router();
const auth = require('../middleware/auth');
const checkRole = require('../middleware/role');
const studentController = require('../controllers/student');

// All student routes require JWT + STUDENT role
router.use(auth, checkRole('STUDENT'));

// Profile & balance
router.get('/profile', studentController.getProfile);
router.get('/balance', studentController.getBalance);

// Governance actions
router.post('/file-complaint', studentController.fileComplaint);
router.post('/file-feedback', studentController.fileFeedback);
router.post('/vote', studentController.vote);

// Rebate & mess change requests
router.post('/request-rebate', studentController.requestRebate);
router.post('/request-mess-change', studentController.requestMessChange);

// Verify Meal
router.post('/verify-meal', studentController.verifyMeal);

module.exports = router;
