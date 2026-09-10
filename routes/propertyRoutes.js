const express = require('express');
const router = express.Router();
const {
  createProperty,
  getProperties,
  getMyProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
  searchProperties,
  verifyProperty,
  updatePropertyStatus,
  getCities,
  getCityProperties
} = require('../controllers/propertyController');

const {
  validateCreateProperty,
  validateUpdateProperty,
  validatePropertyId,
  validateVerifyProperty,
  validatePropertyStatus,
  validateSearch
} = require('../validators/propertyValidator');

const validate = require('../middleware/validate');
const { authenticate, optionalAuthenticate, authorizeRoles } = require('../middleware/auth');

// Public search & groupings (MUST come before /:id)
router.get('/search', validateSearch, validate, searchProperties);
router.get('/cities', getCities);
router.get('/city/:city', getCityProperties);

// Agent properties
router.get('/my', authenticate, authorizeRoles('AGENT'), getMyProperties);

// Base CRUD routes
router
  .route('/')
  .get(getProperties)
  .post(authenticate, authorizeRoles('AGENT'), validateCreateProperty, validate, createProperty);

router
  .route('/:id')
  .get(optionalAuthenticate, validatePropertyId, validate, getPropertyById)
  .put(authenticate, authorizeRoles('AGENT', 'ADMIN'), validateUpdateProperty, validate, updateProperty)
  .delete(authenticate, authorizeRoles('AGENT', 'ADMIN'), validatePropertyId, validate, deleteProperty);

// Admin property verification workflow
router.put(
  '/:id/verify',
  authenticate,
  authorizeRoles('ADMIN'),
  validateVerifyProperty,
  validate,
  verifyProperty
);

// Property status tracking workflow
router.put(
  '/:id/status',
  authenticate,
  authorizeRoles('AGENT', 'ADMIN'),
  validatePropertyStatus,
  validate,
  updatePropertyStatus
);

module.exports = router;
