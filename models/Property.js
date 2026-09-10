const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema(
  {
    agentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Property must be associated with an Agent']
    },
    title: {
      type: String,
      required: [true, 'Please provide property title'],
      trim: true,
      maxlength: [120, 'Title cannot exceed 120 characters']
    },
    description: {
      type: String,
      required: [true, 'Please provide property description'],
      trim: true
    },
    type: {
      type: String,
      enum: {
        values: ['Apartment', 'Villa', 'House', 'Plot', 'Commercial'],
        message: '{VALUE} is not a valid property type'
      },
      required: [true, 'Please specify property type']
    },
    listingType: {
      type: String,
      enum: {
        values: ['SALE', 'RENT'],
        message: '{VALUE} is not a valid listing type'
      },
      required: [true, 'Please specify listing type (SALE or RENT)']
    },
    price: {
      type: Number,
      required: [true, 'Please specify price'],
      min: [0, 'Price cannot be negative']
    },
    city: {
      type: String,
      required: [true, 'Please provide city name'],
      trim: true
    },
    locality: {
      type: String,
      required: [true, 'Please provide locality / neighbourhood'],
      trim: true
    },
    bedrooms: {
      type: Number,
      default: 0,
      min: [0, 'Bedrooms cannot be negative']
    },
    bathrooms: {
      type: Number,
      default: 0,
      min: [0, 'Bathrooms cannot be negative']
    },
    area: {
      type: Number,
      required: [true, 'Please specify carpet area in sq ft'],
      min: [1, 'Area must be at least 1 sq ft']
    },
    images: {
      type: [String],
      default: []
    },
    status: {
      type: String,
      enum: {
        values: ['AVAILABLE', 'UNDER_NEGOTIATION', 'SOLD', 'RENTED'],
        message: '{VALUE} is not a valid property status'
      },
      default: 'AVAILABLE'
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Indexes for query performance and academic requirements
propertySchema.index({ agentId: 1 });
propertySchema.index({ city: 1 });
propertySchema.index({ isVerified: 1, status: 1 });
propertySchema.index({ city: 1, price: 1, type: 1, bedrooms: 1 });

const Property = mongoose.model('Property', propertySchema);
module.exports = Property;
