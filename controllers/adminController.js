const User = require('../models/User');
const Property = require('../models/Property');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination');

/**
 * @desc    Get all pending property listings awaiting admin verification
 * @route   GET /api/admin/properties/pending
 * @access  Private (ADMIN)
 */
const getPendingProperties = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);

    const filter = {
      isVerified: false,
      rejectionReason: null
    };

    const totalCount = await Property.countDocuments(filter);
    const properties = await Property.find(filter)
      .populate('agentId', 'name email phone agencyName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      message: 'Pending properties awaiting verification retrieved',
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
 * @desc    Get all rejected property listings
 * @route   GET /api/admin/properties/rejected
 * @access  Private (ADMIN)
 */
const getRejectedProperties = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);

    const filter = {
      isVerified: false,
      rejectionReason: { $ne: null }
    };

    const totalCount = await Property.countDocuments(filter);
    const properties = await Property.find(filter)
      .populate('agentId', 'name email phone agencyName')
      .populate('verifiedBy', 'name email')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      message: 'Rejected properties retrieved',
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
 * @desc    Get all registered platform users with filters
 * @route   GET /api/admin/users
 * @access  Private (ADMIN)
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = getPaginationParams(req.query);
    const { role, search } = req.query;

    const filter = {};
    if (role && ['BUYER', 'AGENT', 'ADMIN'].includes(role)) {
      filter.role = role;
    }
    if (search && search.trim()) {
      filter.$or = [
        { name: { $regex: new RegExp(search.trim(), 'i') } },
        { email: { $regex: new RegExp(search.trim(), 'i') } }
      ];
    }

    const totalCount = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    res.status(200).json({
      success: true,
      message: 'Users list retrieved successfully',
      data: {
        users,
        pagination: buildPaginationMeta(totalCount, page, limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all agents with active listing metrics
 * @route   GET /api/admin/agents
 * @access  Private (ADMIN)
 */
const getAllAgents = async (req, res, next) => {
  try {
    const agents = await User.find({ role: 'AGENT' })
      .select('-passwordHash')
      .sort({ createdAt: -1 });

    // Aggregate listing metrics per agent
    const listingMetrics = await Property.aggregate([
      {
        $group: {
          _id: '$agentId',
          total: { $sum: 1 },
          verified: { $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] } },
          pending: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$isVerified', false] },
                    { $eq: ['$rejectionReason', null] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const metricsMap = {};
    listingMetrics.forEach((m) => {
      metricsMap[m._id.toString()] = m;
    });

    const agentList = agents.map((agent) => {
      const metrics = metricsMap[agent._id.toString()] || {
        total: 0,
        verified: 0,
        pending: 0
      };
      return {
        id: agent._id,
        name: agent.name,
        email: agent.email,
        phone: agent.phone,
        agencyName: agent.agencyName,
        createdAt: agent.createdAt,
        totalListings: metrics.total,
        verifiedListings: metrics.verified,
        pendingListings: metrics.pending
      };
    });

    res.status(200).json({
      success: true,
      message: 'Agents overview retrieved successfully',
      data: {
        totalAgents: agentList.length,
        agents: agentList
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPendingProperties,
  getRejectedProperties,
  getAllUsers,
  getAllAgents
};
