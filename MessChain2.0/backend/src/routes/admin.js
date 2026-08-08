const router = require('express').Router();
const auth = require('../middleware/auth');
const checkRole = require('../middleware/role');
const adminController = require('../controllers/admin');

// All admin routes require JWT + ADMIN role
router.use(auth, checkRole('ADMIN'));

// Staff management
router.post('/create-staff', adminController.createStaff);

// Token operations
router.post('/mint-tokens', adminController.mintTokens);
router.post('/semester-enrollment', adminController.semesterEnrollment);

// Governance (read-only for admin)
router.get('/complaints', adminController.getComplaints);
router.get('/feedback-report', adminController.getFeedbackReport);
router.post('/create-poll', adminController.createPoll);

// Rebate management
router.get('/rebates', adminController.getRebates);
router.post('/rebates/:id/approve', adminController.approveRebate);
router.post('/rebates/:id/reject', adminController.rejectRebate);

// Mess change management
router.get('/mess-changes', adminController.getMessChanges);
router.post('/mess-changes/:id/approve', adminController.approveMessChange);
router.post('/mess-changes/:id/reject', adminController.rejectMessChange);

// Student listing
router.get('/students', adminController.getStudents);

// Manual triggers
router.post('/trigger-cron', adminController.triggerCron);

module.exports = router;
