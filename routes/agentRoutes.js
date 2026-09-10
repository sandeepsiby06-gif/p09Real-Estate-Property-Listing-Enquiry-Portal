const express = require('express');
const router = express.Router();
const {
  getAgentById,
  getAgentProperties,
  rateAgent
} = require('../controllers/agentController');
const { validateRateAgent } = require('../validators/ratingValidator');
const validate = require('../middleware/validate');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { param } = require('express-validator');

const validateId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid agent ID format')
];

router.get('/:id', validateId, validate, getAgentById);
router.get('/:id/properties', validateId, validate, getAgentProperties);
router.post(
  '/:id/ratings',
  authenticate,
  authorizeRoles('BUYER'),
  validateRateAgent,
  validate,
  rateAgent
);

module.exports = router;
