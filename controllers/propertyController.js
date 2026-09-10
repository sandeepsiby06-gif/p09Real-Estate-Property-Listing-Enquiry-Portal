const Property = require('../models/Property');
const Enquiry = require('../models/Enquiry');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination');
const { AppError } = require('../middleware/errorHandler');

/**
 * @desc    Create a new property listing (Agent only)
 * @route   POST /api/properties
 * @access  Private (AGENT)
 */
const createProperty = async (req, res, next) => {
  try {
    const {
      title,
      description,
      type,
      listingType,
      price,
      city,
      locality,
      bedrooms = 0,
      bathrooms = 0,
      area,
      images = []
    } = req.body;

    // Business Rule: agentId must ALWAYS be derived from JWT (req.user.id), never trusted from body
    const agentId = req.user._id;

    // Default sample images if none provided
    const propertyImages = images.length > 0 ? images : [
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80'
    ];

    // Business Rule: New properties are strictly unverified by default (PENDING admin review)
    const property = await Property.create({
      agentId,
      title,
      description,
      type,
      listingType,
      price,
      city,
      locality,
      bedrooms,
      bathrooms,
      area,
      images: propertyImages,
      status: 'AVAILABLE',
      isVerified: false,
      verifiedBy: null,
      verifiedAt: null,
      rejectionReason: null
    });

    res.status(201).json({
      success: true,
      message: 'Property created successfully. Listing is currently PENDING admin verification.',
      data: { property }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all public verified properties with pagination
 * @route   GET /api/properties
 * @access  Public
 */
const getProperties = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);

    // Business Rule: Public endpoint returns ONLY verified properties
    const filter = { isVerified: true };

    const totalCount = await Property.countDocuments(filter);
    const properties = await Property.find(filter)
      .populate('agentId', 'name email phone agencyName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      message: 'Verified properties retrieved successfully',
      data: {
        properties,
        pagination: buildPaginationMeta(totalCount, page, limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get properties listed by the logged-in agent (all statuses & verification states)
 * @route   GET /api/properties/my
 * @access  Private (AGENT)
 */
const getMyProperties = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = { agentId: req.user._id };

    const totalCount = await Property.countDocuments(filter);
    const properties = await Property.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      message: 'Agent properties retrieved successfully',
      data: {
        properties,
        pagination: buildPaginationMeta(totalCount, page, limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single property by ID
 * @route   GET /api/properties/:id
 * @access  Public (Conditional for unverified properties)
 */
const getPropertyById = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id).populate(
      'agentId',
      'name email phone agencyName'
    );

    if (!property) {
      return res.status(404).json({
        success: false,
        message: `Property not found with id: ${req.params.id}`,
        errorCode: 'PROPERTY_NOT_FOUND'
      });
    }

    // Business Rule: If property is unverified, only its owner agent or an ADMIN can view it
    if (!property.isVerified) {
      const isOwner = req.user && property.agentId && property.agentId._id.toString() === req.user.id;
      const isAdmin = req.user && req.user.role === 'ADMIN';

      if (!isOwner && !isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'This property listing is currently pending admin verification and is not publicly visible.',
          errorCode: 'PROPERTY_NOT_VERIFIED'
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Property details retrieved successfully',
      data: { property }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update property listing (Owner Agent only)
 * @route   PUT /api/properties/:id
 * @access  Private (AGENT)
 */
const updateProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: `Property not found with id: ${req.params.id}`,
        errorCode: 'PROPERTY_NOT_FOUND'
      });
    }

    // Business Rule: Ownership check
    if (req.user.role !== 'ADMIN' && property.agentId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only update properties that you have created.',
        errorCode: 'OWNERSHIP_VIOLATION'
      });
    }

    // Prohibited fields from direct modification: isVerified, verifiedBy, verifiedAt, rejectionReason
    const allowedUpdates = [
      'title',
      'description',
      'type',
      'listingType',
      'price',
      'city',
      'locality',
      'bedrooms',
      'bathrooms',
      'area',
      'images'
    ];

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        property[field] = req.body[field];
      }
    });

    // If substantial changes made by agent, listing resets to unverified
    if (req.user.role === 'AGENT' && (req.body.price || req.body.title || req.body.type)) {
      property.isVerified = false;
      property.verifiedBy = null;
      property.verifiedAt = null;
    }

    const updated = await property.save();

    res.status(200).json({
      success: true,
      message: 'Property updated successfully. Listing re-queued for verification if major fields changed.',
      data: { property: updated }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete property listing (Owner Agent or Admin)
 * @route   DELETE /api/properties/:id
 * @access  Private (AGENT/ADMIN)
 */
const deleteProperty = async (req, res, next) => {
  try {
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: `Property not found with id: ${req.params.id}`,
        errorCode: 'PROPERTY_NOT_FOUND'
      });
    }

    // Business Rule: Ownership check
    if (req.user.role !== 'ADMIN' && property.agentId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only delete your own property listings.',
        errorCode: 'OWNERSHIP_VIOLATION'
      });
    }

    // Business Rule: Cannot delete property if it has status SOLD or RENTED
    if (property.status === 'SOLD' || property.status === 'RENTED') {
      return res.status(409).json({
        success: false,
        message: `Cannot delete property with status '${property.status}'. Historical real estate records must be retained for audit purposes.`,
        errorCode: 'BUSINESS_RULE_ERROR'
      });
    }

    await Property.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Property deleted successfully',
      data: { id: req.params.id }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Advanced Search & Filtering
 * @route   GET /api/properties/search
 * @access  Public
 */
const searchProperties = async (req, res, next) => {
  try {
    const {
      city,
      locality,
      minPrice,
      maxPrice,
      type,
      listingType,
      bedrooms,
      status,
      sortBy = 'newest'
    } = req.query;

    const { page, limit, skip } = getPaginationParams(req.query);

    // Business Rule: Public search returns strictly verified properties
    const filter = { isVerified: true };

    if (city && city.trim()) {
      filter.city = { $regex: new RegExp(city.trim(), 'i') };
    }

    if (locality && locality.trim()) {
      filter.locality = { $regex: new RegExp(locality.trim(), 'i') };
    }

    if (type) {
      filter.type = type;
    }

    if (listingType) {
      filter.listingType = listingType;
    }

    if (status) {
      filter.status = status;
    }

    if (bedrooms !== undefined && bedrooms !== '') {
      filter.bedrooms = { $gte: Number(bedrooms) };
    }

    // Price range filters
    if (minPrice !== undefined || maxPrice !== undefined) {
      filter.price = {};
      if (minPrice !== undefined && minPrice !== '') {
        filter.price.$gte = Number(minPrice);
      }
      if (maxPrice !== undefined && maxPrice !== '') {
        filter.price.$lte = Number(maxPrice);
      }
    }

    // Sorting logic
    let sortObj = { createdAt: -1 };
    if (sortBy === 'price_asc') {
      sortObj = { price: 1 };
    } else if (sortBy === 'price_desc') {
      sortObj = { price: -1 };
    } else if (sortBy === 'oldest') {
      sortObj = { createdAt: 1 };
    }

    const totalCount = await Property.countDocuments(filter);
    const properties = await Property.find(filter)
      .populate('agentId', 'name email phone agencyName')
      .sort(sortObj)
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      message: 'Properties matching search criteria retrieved',
      data: {
        properties,
        appliedFilters: {
          city: city || null,
          locality: locality || null,
          type: type || null,
          listingType: listingType || null,
          minPrice: minPrice || null,
          maxPrice: maxPrice || null,
          bedrooms: bedrooms || null,
          status: status || null,
          sortBy
        },
        pagination: buildPaginationMeta(totalCount, page, limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify or reject property listing (Admin only)
 * @route   PUT /api/properties/:id/verify
 * @access  Private (ADMIN)
 */
const verifyProperty = async (req, res, next) => {
  try {
    const { status, rejectionReason } = req.body;
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: `Property not found with id: ${req.params.id}`,
        errorCode: 'PROPERTY_NOT_FOUND'
      });
    }

    // Business Rule: State transition check
    // PENDING -> VERIFIED or PENDING -> REJECTED
    if (status === 'VERIFIED') {
      if (property.isVerified) {
        return res.status(409).json({
          success: false,
          message: 'Invalid transition: Property is already in VERIFIED state.',
          errorCode: 'INVALID_TRANSITION'
        });
      }
      property.isVerified = true;
      property.verifiedBy = req.user._id;
      property.verifiedAt = new Date();
      property.rejectionReason = null;
    } else if (status === 'REJECTED') {
      if (!rejectionReason || !rejectionReason.trim()) {
        return res.status(400).json({
          success: false,
          message: 'A valid rejectionReason is required when rejecting a property listing.',
          errorCode: 'VALIDATION_ERROR'
        });
      }
      property.isVerified = false;
      property.verifiedBy = req.user._id;
      property.verifiedAt = new Date();
      property.rejectionReason = rejectionReason.trim();
    } else {
      return res.status(400).json({
        success: false,
        message: "Status must be either 'VERIFIED' or 'REJECTED'",
        errorCode: 'VALIDATION_ERROR'
      });
    }

    const updated = await property.save();

    res.status(200).json({
      success: true,
      message: `Property listing successfully marked as ${status}`,
      data: { property: updated }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update Property Status (AVAILABLE -> UNDER_NEGOTIATION -> SOLD/RENTED)
 * @route   PUT /api/properties/:id/status
 * @access  Private (Owner AGENT or ADMIN)
 */
const updatePropertyStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const property = await Property.findById(req.params.id);

    if (!property) {
      return res.status(404).json({
        success: false,
        message: `Property not found with id: ${req.params.id}`,
        errorCode: 'PROPERTY_NOT_FOUND'
      });
    }

    // Ownership check
    const isOwner = property.agentId.toString() === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Only the listing agent or an admin can change the property status.',
        errorCode: 'OWNERSHIP_VIOLATION'
      });
    }

    const currentStatus = property.status;
    const listingType = property.listingType; // SALE or RENT

    // Business Rules for State Machine Transitions:
    // For SALE: AVAILABLE -> UNDER_NEGOTIATION -> SOLD
    // For RENT: AVAILABLE -> UNDER_NEGOTIATION -> RENTED
    // Prohibited: SOLD -> AVAILABLE (unless explicitly overridden by ADMIN)
    // Prohibited: RENTED -> AVAILABLE (unless explicitly overridden by ADMIN)
    if ((currentStatus === 'SOLD' || currentStatus === 'RENTED') && status === 'AVAILABLE') {
      if (!isAdmin) {
        return res.status(409).json({
          success: false,
          message: `Business rule violation: Transitioning from '${currentStatus}' to 'AVAILABLE' is prohibited for agents. Only an Admin can re-list closed deals.`,
          errorCode: 'INVALID_STATUS_TRANSITION'
        });
      }
    }

    // Check incompatible statuses
    if (listingType === 'SALE' && status === 'RENTED') {
      return res.status(409).json({
        success: false,
        message: "Business rule violation: A property with listingType 'SALE' cannot have status 'RENTED'.",
        errorCode: 'INVALID_STATUS_TRANSITION'
      });
    }

    if (listingType === 'RENT' && status === 'SOLD') {
      return res.status(409).json({
        success: false,
        message: "Business rule violation: A property with listingType 'RENT' cannot have status 'SOLD'.",
        errorCode: 'INVALID_STATUS_TRANSITION'
      });
    }

    property.status = status;
    const updated = await property.save();

    res.status(200).json({
      success: true,
      message: `Property status updated from '${currentStatus}' to '${status}'`,
      data: { property: updated }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Group listings by city with counts
 * @route   GET /api/properties/cities
 * @access  Public
 */
const getCities = async (req, res, next) => {
  try {
    const cityCounts = await Property.aggregate([
      { $match: { isVerified: true } },
      {
        $group: {
          _id: '$city',
          count: { $sum: 1 },
          availableCount: {
            $sum: { $cond: [{ $eq: ['$status', 'AVAILABLE'] }, 1, 0] }
          },
          averagePrice: { $avg: '$price' }
        }
      },
      { $sort: { count: -1 } },
      {
        $project: {
          _id: 0,
          city: '$_id',
          totalListings: '$count',
          availableListings: '$availableCount',
          averagePrice: { $round: ['$averagePrice', 2] }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'City groupings retrieved successfully',
      data: { cities: cityCounts }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get verified listings in a specific city grouped by locality
 * @route   GET /api/properties/city/:city
 * @access  Public
 */
const getCityProperties = async (req, res, next) => {
  try {
    const { city } = req.params;

    const properties = await Property.find({
      city: { $regex: new RegExp(`^${city}$`, 'i') },
      isVerified: true
    })
      .populate('agentId', 'name email phone agencyName')
      .sort({ createdAt: -1 });

    const localitySummary = await Property.aggregate([
      {
        $match: {
          city: { $regex: new RegExp(`^${city}$`, 'i') },
          isVerified: true
        }
      },
      {
        $group: {
          _id: '$locality',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          locality: '$_id',
          count: 1
        }
      }
    ]);

    res.status(200).json({
      success: true,
      message: `Verified properties in ${city} retrieved successfully`,
      data: {
        city,
        totalListings: properties.length,
        localities: localitySummary,
        properties
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
