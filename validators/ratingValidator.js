const { body, param } = require('express-validator');

const validateRateAgent = [
  param('id')
    .isMongoId()
    .withMessage('Invalid agent ID format'),
  body('rating')
    .notEmpty()
    .withMessage('Rating is required')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be an integer between 1 and 5'),
  body('review')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Review cannot exceed 500 characters')
];

module.exports = {
  validateRateAgent
};
