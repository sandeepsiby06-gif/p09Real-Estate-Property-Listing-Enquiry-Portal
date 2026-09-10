const express = require('express');
const router = express.Router();
const {
  getTopProperties,
  getAgentPerformance,
  getSummary
} = require('../controllers/reportController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// Protect all report routes with authentication and ADMIN role check
router.use(authenticate, authorizeRoles('ADMIN'));

router.get('/top-properties', getTopProperties);
router.get('/agent-performance', getAgentPerformance);
router.get('/summary', getSummary);

module.exports = router;
