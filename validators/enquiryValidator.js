const { body, param } = require('express-validator');

const ENQUIRY_STATUSES = ['NEW', 'CONTACTED', 'APPROVED', 'REJECTED', 'CLOSED'];

const validateCreateEnquiry = [
  body('propertyId')
    .notEmpty()
    .withMessage('Property ID is required')
    .isMongoId()
    .withMessage('Invalid Property ID format'),
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Enquiry message is required')
    .isLength({ min: 5, max: 1000 })
    .withMessage('Message must be between 5 and 1000 characters')
];

const validateUpdateEnquiryStatus = [
  param('id')
    .isMongoId()
    .withMessage('Invalid enquiry ID format'),
  body('status')
    .notEmpty()
    .withMessage('Enquiry status is required')
    .isIn(ENQUIRY_STATUSES)
    .withMessage(`Status must be one of: ${ENQUIRY_STATUSES.join(', ')}`),
  body('remarks')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Remarks cannot exceed 500 characters')
];

module.exports = {
  validateCreateEnquiry,
  validateUpdateEnquiryStatus
};
