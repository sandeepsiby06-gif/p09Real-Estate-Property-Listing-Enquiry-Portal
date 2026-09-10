const express = require('express');
const router = express.Router();
const {
  createEnquiry,
  getMyEnquiries,
  getAgentEnquiries,
  updateEnquiryStatus
} = require('../controllers/enquiryController');

const {
  validateCreateEnquiry,
  validateUpdateEnquiryStatus
} = require('../validators/enquiryValidator');

const validate = require('../middleware/validate');
const { authenticate, authorizeRoles } = require('../middleware/auth');

router.post(
  '/',
  authenticate,
  authorizeRoles('BUYER'),
  validateCreateEnquiry,
  validate,
  createEnquiry
);

router.get('/my', authenticate, authorizeRoles('BUYER'), getMyEnquiries);
router.get('/agent', authenticate, authorizeRoles('AGENT'), getAgentEnquiries);

router.put(
  '/:id/status',
  authenticate,
  authorizeRoles('AGENT', 'ADMIN'),
  validateUpdateEnquiryStatus,
  validate,
  updateEnquiryStatus
);

module.exports = router;
