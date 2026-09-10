const mongoose = require('mongoose');

let mongodInstance = null;

/**
 * Connects to MongoDB.
 * 1. Checks if MONGODB_URI is specified in environment variables and attempts connection.
 * 2. If no URI is provided or local connection fails, gracefully boots an in-memory MongoDB
 *    instance using MongoMemoryServer so the academic project runs out-of-the-box everywhere!
 */
const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    const mongoUri = process.env.MONGODB_URI;

    if (mongoUri && mongoUri.trim() !== '') {
      try {
        console.log(`[DB] Attempting connection to external MongoDB at ${mongoUri}...`);
        const conn = await mongoose.connect(mongoUri, {
          serverSelectionTimeoutMS: 3000
        });
        console.log(`✅ [DB] Connected to MongoDB: ${conn.connection.host}/${conn.connection.name}`);
        return conn;
      } catch (externalErr) {
        console.warn(`⚠️ [DB] External MongoDB connection failed (${externalErr.message}).`);
        console.log(`[DB] Fallback: Starting embedded MongoMemoryServer for instant demonstration...`);
      }
    }

    // Fallback: embedded MongoMemoryServer
    const { MongoMemoryServer } = require('mongodb-memory-server');
    mongodInstance = await MongoMemoryServer.create();
    const memoryUri = mongodInstance.getUri();
    const conn = await mongoose.connect(memoryUri);
    console.log(`✅ [DB] Connected to Embedded MongoDB (In-Memory): ${memoryUri}`);
    return conn;
  } catch (err) {
    console.error(`❌ [DB] Connection failed: ${err.message}`);
    throw err;
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (mongodInstance) {
      await mongodInstance.stop();
    }
  } catch (err) {
    console.error(`❌ [DB] Error during disconnect: ${err.message}`);
  }
};

module.exports = { connectDB, disconnectDB };
