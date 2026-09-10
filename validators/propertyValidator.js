const { body, param, query } = require('express-validator');

const PROPERTY_TYPES = ['Apartment', 'Villa', 'House', 'Plot', 'Commercial'];
const LISTING_TYPES = ['SALE', 'RENT'];
const PROPERTY_STATUSES = ['AVAILABLE', 'UNDER_NEGOTIATION', 'SOLD', 'RENTED'];

const validateCreateProperty = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Property title is required')
    .isLength({ min: 5, max: 120 })
    .withMessage('Title must be between 5 and 120 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Property description is required'),
  body('type')
    .notEmpty()
    .withMessage('Property type is required')
    .isIn(PROPERTY_TYPES)
    .withMessage(`Property type must be one of: ${PROPERTY_TYPES.join(', ')}`),
  body('listingType')
    .notEmpty()
    .withMessage('Listing type is required')
    .isIn(LISTING_TYPES)
    .withMessage(`Listing type must be either 'SALE' or 'RENT'`),
  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 1 })
    .withMessage('Price must be a positive number'),
  body('city')
    .trim()
    .notEmpty()
    .withMessage('City is required'),
  body('locality')
    .trim()
    .notEmpty()
    .withMessage('Locality is required'),
  body('area')
    .notEmpty()
    .withMessage('Area is required')
    .isFloat({ min: 1 })
    .withMessage('Area must be at least 1 sq ft'),
  body('bedrooms')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Bedrooms must be 0 or more'),
  body('bathrooms')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Bathrooms must be 0 or more'),
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be provided as an array of URLs')
];

const validateUpdateProperty = [
  param('id')
    .isMongoId()
    .withMessage('Invalid property ID format'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 120 })
    .withMessage('Title must be between 5 and 120 characters'),
  body('type')
    .optional()
    .isIn(PROPERTY_TYPES)
    .withMessage(`Type must be one of: ${PROPERTY_TYPES.join(', ')}`),
  body('listingType')
    .optional()
    .isIn(LISTING_TYPES)
    .withMessage(`Listing type must be SALE or RENT`),
  body('price')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Price must be a positive number'),
  body('area')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('Area must be at least 1 sq ft'),
  body('bedrooms')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Bedrooms must be 0 or more'),
  body('bathrooms')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Bathrooms must be 0 or more')
];

const validatePropertyId = [
  param('id')
    .isMongoId()
    .withMessage('Invalid property ID format')
];

const validateVerifyProperty = [
  param('id')
    .isMongoId()
    .withMessage('Invalid property ID format'),
  body('status')
    .notEmpty()
    .withMessage('Verification status is required')
    .isIn(['VERIFIED', 'REJECTED'])
    .withMessage("Status must be either 'VERIFIED' or 'REJECTED'"),
  body('rejectionReason')
    .optional()
    .trim()
];

const validatePropertyStatus = [
  param('id')
    .isMongoId()
    .withMessage('Invalid property ID format'),
  body('status')
    .notEmpty()
    .withMessage('Property status is required')
    .isIn(PROPERTY_STATUSES)
    .withMessage(`Status must be one of: ${PROPERTY_STATUSES.join(', ')}`)
];

const validateSearch = [
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('minPrice must be 0 or greater'),
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('maxPrice must be 0 or greater'),
  query('bedrooms')
    .optional()
    .isInt({ min: 0 })
    .withMessage('bedrooms must be 0 or greater'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

module.exports = {
  validateCreateProperty,
  validateUpdateProperty,
  validatePropertyId,
  validateVerifyProperty,
  validatePropertyStatus,
  validateSearch
};
