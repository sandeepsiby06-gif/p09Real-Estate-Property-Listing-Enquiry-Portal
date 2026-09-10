const express = require('express');
const router = express.Router();
const {
  getPendingProperties,
  getRejectedProperties,
  getAllUsers,
  getAllAgents
} = require('../controllers/adminController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// Protect all admin routes with authentication and ADMIN role check
router.use(authenticate, authorizeRoles('ADMIN'));

router.get('/properties/pending', getPendingProperties);
router.get('/properties/rejected', getRejectedProperties);
router.get('/users', getAllUsers);
router.get('/agents', getAllAgents);

module.exports = router;
