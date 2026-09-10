const Enquiry = require('../models/Enquiry');
const Property = require('../models/Property');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination');

/**
 * @desc    Submit an enquiry for a property (Buyer/Tenant only)
 * @route   POST /api/enquiries
 * @access  Private (BUYER)
 */
const createEnquiry = async (req, res, next) => {
  try {
    const { propertyId, message } = req.body;

    // Business Rule: buyerId MUST be derived from JWT (req.user.id), never trusted from body
    const buyerId = req.user._id;

    // 1. Verify property exists
    const property = await Property.findById(propertyId);
    if (!property) {
      return res.status(404).json({
        success: false,
        message: 'Property not found',
        errorCode: 'PROPERTY_NOT_FOUND'
      });
    }

    // 2. Business Rule: Only allow enquiries against valid verified properties
    if (!property.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Cannot submit an enquiry for an unverified property listing.',
        errorCode: 'PROPERTY_NOT_VERIFIED'
      });
    }

    const enquiry = await Enquiry.create({
      propertyId,
      buyerId,
      message,
      status: 'NEW'
    });

    const populatedEnquiry = await Enquiry.findById(enquiry._id)
      .populate('propertyId', 'title price city locality type listingType')
      .populate('buyerId', 'name email phone');

    res.status(201).json({
      success: true,
      message: 'Enquiry submitted successfully. The listing agent will contact you soon.',
      data: { enquiry: populatedEnquiry }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get enquiries submitted by the current buyer
 * @route   GET /api/enquiries/my
 * @access  Private (BUYER)
 */
const getMyEnquiries = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const filter = { buyerId: req.user._id };

    const totalCount = await Enquiry.countDocuments(filter);
    const enquiries = await Enquiry.find(filter)
      .populate({
        path: 'propertyId',
        select: 'title price city locality type listingType images agentId',
        populate: {
          path: 'agentId',
          select: 'name email phone agencyName'
        }
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      message: 'My submitted enquiries retrieved successfully',
      data: {
        enquiries,
        pagination: buildPaginationMeta(totalCount, page, limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all enquiries received for properties owned by the agent
 * @route   GET /api/enquiries/agent
 * @access  Private (AGENT)
 */
const getAgentEnquiries = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);

    // 1. Find all property IDs owned by this agent
    const agentProperties = await Property.find({ agentId: req.user._id }).select('_id');
    const propertyIds = agentProperties.map((p) => p._id);

    const filter = { propertyId: { $in: propertyIds } };

    const totalCount = await Enquiry.countDocuments(filter);
    const enquiries = await Enquiry.find(filter)
      .populate('propertyId', 'title price city locality type listingType status')
      .populate('buyerId', 'name email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      message: 'Agent received enquiries (leads) retrieved successfully',
      data: {
        enquiries,
        pagination: buildPaginationMeta(totalCount, page, limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update enquiry status with state transition rules
 * @route   PUT /api/enquiries/:id/status
 * @access  Private (AGENT or ADMIN)
 */
const updateEnquiryStatus = async (req, res, next) => {
  try {
    const { status, remarks } = req.body;
    const enquiry = await Enquiry.findById(req.params.id).populate('propertyId');

    if (!enquiry) {
      return res.status(404).json({
        success: false,
        message: `Enquiry not found with id: ${req.params.id}`,
        errorCode: 'ENQUIRY_NOT_FOUND'
      });
    }

    // Business Rule: Ownership check
    // Only the agent who owns the related property can update the enquiry (or ADMIN)
    const propertyOwnerId = enquiry.propertyId ? enquiry.propertyId.agentId.toString() : null;
    const isOwnerAgent = propertyOwnerId === req.user.id;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isOwnerAgent && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only manage enquiries for properties you own.',
        errorCode: 'OWNERSHIP_VIOLATION'
      });
    }

    const currentStatus = enquiry.status;

    // Business Rule: Enquiry state machine validation
    // Allowed transitions:
    // NEW -> CONTACTED
    // CONTACTED -> APPROVED
    // CONTACTED -> REJECTED
    // APPROVED -> CLOSED
    // REJECTED -> CLOSED
    const validTransitions = {
      NEW: ['CONTACTED'],
      CONTACTED: ['APPROVED', 'REJECTED'],
      APPROVED: ['CLOSED'],
      REJECTED: ['CLOSED'],
      CLOSED: [] // Terminal state
    };

    const allowedNextStatuses = validTransitions[currentStatus] || [];

    if (!allowedNextStatuses.includes(status)) {
      return res.status(409).json({
        success: false,
        message: `Invalid status transition: Cannot transition enquiry from '${currentStatus}' to '${status}'. Allowed transitions from '${currentStatus}': [${allowedNextStatuses.join(', ') || 'None - Terminal state'}].`,
        errorCode: 'INVALID_STATUS_TRANSITION'
      });
    }

    enquiry.status = status;
    if (remarks !== undefined) {
      enquiry.remarks = remarks;
    }

    const updated = await enquiry.save();

    res.status(200).json({
      success: true,
      message: `Enquiry status successfully updated to '${status}'`,
      data: { enquiry: updated }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createEnquiry,
  getMyEnquiries,
  getAgentEnquiries,
  updateEnquiryStatus
};
