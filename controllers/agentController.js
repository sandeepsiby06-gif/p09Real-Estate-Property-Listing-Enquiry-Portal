const mongoose = require('mongoose');
const User = require('../models/User');
const Property = require('../models/Property');
const Rating = require('../models/Rating');

/**
 * @desc    Get agent profile with calculated ratings and listings metrics
 * @route   GET /api/agents/:id
 * @access  Public
 */
const getAgentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const agent = await User.findOne({ _id: id, role: 'AGENT' }).select(
      'name email phone agencyName createdAt'
    );

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found with specified ID',
        errorCode: 'AGENT_NOT_FOUND'
      });
    }

    // 1. Calculate listings metrics
    const totalListings = await Property.countDocuments({ agentId: id });
    const verifiedListings = await Property.countDocuments({ agentId: id, isVerified: true });
    const activeListings = await Property.countDocuments({
      agentId: id,
      isVerified: true,
      status: 'AVAILABLE'
    });

    // 2. Calculate rating metrics via MongoDB aggregation (no redundant storage)
    const ratingStats = await Rating.aggregate([
      { $match: { agentId: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: '$agentId',
          averageRating: { $avg: '$rating' },
          ratingCount: { $sum: 1 }
        }
      }
    ]);

    const averageRating = ratingStats.length > 0 ? Math.round(ratingStats[0].averageRating * 10) / 10 : 0;
    const ratingCount = ratingStats.length > 0 ? ratingStats[0].ratingCount : 0;

    // Fetch latest 5 reviews
    const recentReviews = await Rating.find({ agentId: id })
      .populate('buyerId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      message: 'Agent profile retrieved successfully',
      data: {
        agent: {
          id: agent._id,
          name: agent.name,
          email: agent.email,
          phone: agent.phone,
          agencyName: agent.agencyName,
          joinedAt: agent.createdAt
        },
        metrics: {
          totalListings,
          verifiedListings,
          activeListings,
          averageRating,
          ratingCount
        },
        recentReviews
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get verified properties listed by a specific agent
 * @route   GET /api/agents/:id/properties
 * @access  Public
 */
const getAgentProperties = async (req, res, next) => {
  try {
    const { id } = req.params;

    const properties = await Property.find({
      agentId: id,
      isVerified: true
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Agent verified properties retrieved successfully',
      data: {
        totalListings: properties.length,
        properties
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Rate an agent (Buyer only)
 * @route   POST /api/agents/:id/ratings
 * @access  Private (BUYER)
 */
const rateAgent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, review = '' } = req.body;
    const buyerId = req.user._id;

    // 1. Verify agent exists and has role AGENT
    const agent = await User.findOne({ _id: id, role: 'AGENT' });
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: 'Agent not found',
        errorCode: 'AGENT_NOT_FOUND'
      });
    }

    // Business Rule: Agent cannot rate themselves
    if (id === req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You cannot rate yourself',
        errorCode: 'SELF_RATING_PROHIBITED'
      });
    }

    // Upsert rating (if buyer previously rated, update review/score)
    const updatedRating = await Rating.findOneAndUpdate(
      { agentId: id, buyerId },
      { rating, review, createdAt: new Date() },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: 'Agent rating submitted successfully',
      data: { rating: updatedRating }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAgentById,
  getAgentProperties,
  rateAgent
};
