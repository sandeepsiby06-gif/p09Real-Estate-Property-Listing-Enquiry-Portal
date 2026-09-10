const express = require('express');
const router = express.Router();
const {
  addFavourite,
  removeFavourite,
  getFavourites
} = require('../controllers/favouriteController');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const { param } = require('express-validator');
const validate = require('../middleware/validate');

const validatePropertyId = [
  param('propertyId')
    .isMongoId()
    .withMessage('Invalid property ID format')
];

router.get('/', authenticate, authorizeRoles('BUYER'), getFavourites);

router
  .route('/:propertyId')
  .post(authenticate, authorizeRoles('BUYER'), validatePropertyId, validate, addFavourite)
  .delete(authenticate, authorizeRoles('BUYER'), validatePropertyId, validate, removeFavourite);

module.exports = router;
