const Favourite = require('../models/Favourite');
const Property = require('../models/Property');

/**
 * @desc    Save a property to buyer's favourites
 * @route   POST /api/favourites/:propertyId
 * @access  Private (BUYER)
 */
const addFavourite = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const userId = req.user._id;

    // 1. Verify that the property exists and is verified
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found',
        errorCode: 'PROPERTY_NOT_FOUND'
      });
    }

    if (!property.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Cannot favourite an unverified property listing',
        errorCode: 'PROPERTY_NOT_VERIFIED'
      });
    }

    // 2. Prevent duplicate favourites
    const existing = await Favourite.findOne({ userId, propertyId });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'This property is already saved in your favourites',
        errorCode: 'DUPLICATE_FAVOURITE'
      });
    }

    const favourite = await Favourite.create({
      userId,
      propertyId
    });

    res.status(201).json({
      success: true,
      message: 'Property added to favourites successfully',
      data: { favourite }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove a property from buyer's favourites
 * @route   DELETE /api/favourites/:propertyId
 * @access  Private (BUYER)
 */
const removeFavourite = async (req, res, next) => {
  try {
    const { propertyId } = req.params;
    const userId = req.user._id;

    const favourite = await Favourite.findOneAndDelete({ userId, propertyId });

    if (!favourite) {
      return res.status(404).json({
        success: false,
        message: 'Favourite record not found for this property',
        errorCode: 'FAVOURITE_NOT_FOUND'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Property removed from favourites successfully',
      data: { propertyId }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all favourite properties for the logged-in buyer
 * @route   GET /api/favourites
 * @access  Private (BUYER)
 */
const getFavourites = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const favourites = await Favourite.find({ userId })
      .populate({
        path: 'propertyId',
        populate: {
          path: 'agentId',
          select: 'name email phone agencyName'
        }
      })
      .sort({ createdAt: -1 });

    // Filter out null propertyIds in case a property was removed
    const validFavourites = favourites.filter((f) => f.propertyId !== null);

    res.status(200).json({
      success: true,
      message: 'Favourite properties retrieved successfully',
      data: {
        count: validFavourites.length,
        favourites: validFavourites
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addFavourite,
  removeFavourite,
  getFavourites
};
