const mongoose = require('mongoose');

const enquirySchema = new mongoose.Schema(
  {
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Enquiry must be associated with a Property']
    },
    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Enquiry must be associated with a Buyer']
    },
    message: {
      type: String,
      required: [true, 'Please provide an enquiry message'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters']
    },
    status: {
      type: String,
      enum: {
        values: ['NEW', 'CONTACTED', 'APPROVED', 'REJECTED', 'CLOSED'],
        message: '{VALUE} is not a valid enquiry status'
      },
      default: 'NEW'
    },
    remarks: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

// Indexes
enquirySchema.index({ propertyId: 1 });
enquirySchema.index({ buyerId: 1 });
enquirySchema.index({ status: 1 });
enquirySchema.index({ propertyId: 1, buyerId: 1 });

const Enquiry = mongoose.model('Enquiry', enquirySchema);
module.exports = Enquiry;
