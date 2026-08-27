const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const requireAdmin = require('../middleware/requireAdmin');

// Superadmin-only routes for managing admin access requests
// requireAdmin verifies the JWT; requireSuperAdmin checks the role
router.get('/pending-requests', requireAdmin, requireAdmin.requireSuperAdmin, authController.getPendingRequests);
router.get('/requests/count', requireAdmin, requireAdmin.requireSuperAdmin, authController.getPendingRequestsCount);
router.patch('/requests/:id/approve', requireAdmin, requireAdmin.requireSuperAdmin, authController.approveRequest);
router.patch('/requests/:id/reject', requireAdmin, requireAdmin.requireSuperAdmin, authController.rejectRequest);

module.exports = router;
