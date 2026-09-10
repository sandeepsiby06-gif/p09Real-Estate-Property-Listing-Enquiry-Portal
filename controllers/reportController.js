const mongoose = require('mongoose');
const User = require('../models/User');
const Property = require('../models/Property');
const Enquiry = require('../models/Enquiry');
const Rating = require('../models/Rating');

/**
 * @desc    Get top most-enquired properties via MongoDB Aggregation
 * @route   GET /api/admin/reports/top-properties
 * @access  Private (ADMIN)
 */
const getTopProperties = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 5;

    const topProperties = await Enquiry.aggregate([
      {
        $group: {
          _id: '$propertyId',
          enquiryCount: { $sum: 1 },
          newEnquiries: {
            $sum: { $cond: [{ $eq: ['$status', 'NEW'] }, 1, 0] }
          },
          approvedEnquiries: {
            $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, 1, 0] }
          }
        }
      },
      { $sort: { enquiryCount: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'properties',
          localField: '_id',
          foreignField: '_id',
          as: 'property'
        }
      },
      { $unwind: '$property' },
      {
        $lookup: {
          from: 'users',
          localField: 'property.agentId',
          foreignField: '_id',
          as: 'agent'
        }
      },
      { $unwind: { path: '$agent', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          propertyId: '$_id',
          enquiryCount: 1,
          newEnquiries: 1,
          approvedEnquiries: 1,
          title: '$property.title',
          price: '$property.price',
          city: '$property.city',
          locality: '$property.locality',
          type: '$property.type',
          listingType: '$property.listingType',
          status: '$property.status',
          agentName: '$agent.name',
          agentEmail: '$agent.email'
        }
      }
    ]);

    res.status(200).json({
      success: true,
      message: 'Top most-enquired properties retrieved',
      data: {
        count: topProperties.length,
        properties: topProperties
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get agent performance metrics via MongoDB Aggregations
 * @route   GET /api/admin/reports/agent-performance
 * @access  Private (ADMIN)
 */
const getAgentPerformance = async (req, res, next) => {
  try {
    // 1. Fetch all agents
    const agents = await User.find({ role: 'AGENT' }).select('name email phone agencyName createdAt');

    // 2. Aggregate property metrics by agent
    const propertyMetrics = await Property.aggregate([
      {
        $group: {
          _id: '$agentId',
          totalListings: { $sum: 1 },
          verifiedListings: { $sum: { $cond: [{ $eq: ['$isVerified', true] }, 1, 0] } },
          soldOrRented: {
            $sum: {
              $cond: [{ $in: ['$status', ['SOLD', 'RENTED']] }, 1, 0]
            }
          }
        }
      }
    ]);

    const propertyMap = {};
    propertyMetrics.forEach((m) => {
      propertyMap[m._id.toString()] = m;
    });

    // 3. Aggregate enquiry metrics for properties owned by each agent
    const enquiryMetrics = await Enquiry.aggregate([
      {
        $lookup: {
          from: 'properties',
          localField: 'propertyId',
          foreignField: '_id',
          as: 'prop'
        }
      },
      { $unwind: '$prop' },
      {
        $group: {
          _id: '$prop.agentId',
          totalEnquiries: { $sum: 1 },
          approvedLeads: {
            $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, 1, 0] }
          }
        }
      }
    ]);

    const enquiryMap = {};
    enquiryMetrics.forEach((e) => {
      enquiryMap[e._id.toString()] = e;
    });

    // 4. Aggregate rating metrics by agent
    const ratingMetrics = await Rating.aggregate([
      {
        $group: {
          _id: '$agentId',
          avgRating: { $avg: '$rating' },
          reviewsCount: { $sum: 1 }
        }
      }
    ]);

    const ratingMap = {};
    ratingMetrics.forEach((r) => {
      ratingMap[r._id.toString()] = r;
    });

    const performanceReport = agents.map((agent) => {
      const aId = agent._id.toString();
      const pStats = propertyMap[aId] || { totalListings: 0, verifiedListings: 0, soldOrRented: 0 };
      const eStats = enquiryMap[aId] || { totalEnquiries: 0, approvedLeads: 0 };
      const rStats = ratingMap[aId] || { avgRating: 0, reviewsCount: 0 };

      return {
        agentId: agent._id,
        name: agent.name,
        email: agent.email,
        agencyName: agent.agencyName,
        totalListings: pStats.totalListings,
        verifiedListings: pStats.verifiedListings,
        closedDeals: pStats.soldOrRented,
        enquiryCount: eStats.totalEnquiries,
        approvedLeads: eStats.approvedLeads,
        averageRating: Math.round((rStats.avgRating || 0) * 10) / 10,
        reviewsCount: rStats.reviewsCount
      };
    });

    res.status(200).json({
      success: true,
      message: 'Agent performance report generated successfully',
      data: {
        count: performanceReport.length,
        agents: performanceReport
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get overall platform analytics & system summary
 * @route   GET /api/admin/reports/summary
 * @access  Private (ADMIN)
 */
const getSummary = async (req, res, next) => {
  try {
    // Aggregated counts concurrently
    const [
      totalUsers,
      totalBuyers,
      totalAgents,
      totalProperties,
      verifiedProperties,
      pendingProperties,
      rejectedProperties,
      totalEnquiries,
      enquiriesByStatus,
      propertiesByType
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'BUYER' }),
      User.countDocuments({ role: 'AGENT' }),
      Property.countDocuments(),
      Property.countDocuments({ isVerified: true }),
      Property.countDocuments({ isVerified: false, rejectionReason: null }),
      Property.countDocuments({ isVerified: false, rejectionReason: { $ne: null } }),
      Enquiry.countDocuments(),
      Enquiry.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Property.aggregate([
        { $match: { isVerified: true } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ])
    ]);

    const statusCounts = {};
    enquiriesByStatus.forEach((s) => {
      statusCounts[s._id] = s.count;
    });

    const typeCounts = {};
    propertiesByType.forEach((t) => {
      typeCounts[t._id] = t.count;
    });

    res.status(200).json({
      success: true,
      message: 'Platform summary analytics retrieved',
      data: {
        users: {
          total: totalUsers,
          buyers: totalBuyers,
          agents: totalAgents,
          admins: totalUsers - (totalBuyers + totalAgents)
        },
        properties: {
          total: totalProperties,
          verified: verifiedProperties,
          pendingVerification: pendingProperties,
          rejected: rejectedProperties,
          distributionByType: typeCounts
        },
        enquiries: {
          total: totalEnquiries,
          byStatus: statusCounts
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTopProperties,
  getAgentPerformance,
  getSummary
};
