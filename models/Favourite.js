const mongoose = require('mongoose');

const favouriteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Favourite must be linked to a user']
    },
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property',
      required: [true, 'Favourite must be linked to a property']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: false
  }
);

// Indexes
favouriteSchema.index({ userId: 1 });
// Compound unique index prevents duplicate favourites at the database level
favouriteSchema.index({ userId: 1, propertyId: 1 }, { unique: true });

const Favourite = mongoose.model('Favourite', favouriteSchema);
module.exports = Favourite;
