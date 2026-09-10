require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { connectDB } = require('./config/db');
const { errorHandler } = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');

// Route imports
const authRoutes = require('./routes/authRoutes');
const propertyRoutes = require('./routes/propertyRoutes');
const favouriteRoutes = require('./routes/favouriteRoutes');
const enquiryRoutes = require('./routes/enquiryRoutes');
const agentRoutes = require('./routes/agentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

// Enable CORS for API requests
app.use(cors({ origin: true, credentials: true }));

// Helmet configured for developer-friendly academic frontend embedding
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

// Logging middleware in dev mode
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Request parsers with sensible size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static asset delivery
app.use(express.static(path.join(__dirname, 'public')));

// API Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Real Estate Property Listing & Enquiry Portal API is running',
    timestamp: new Date().toISOString()
  });
});

// Mount API routess
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/favourites', favouriteRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/reports', reportRoutes);

// Fallback for frontend SPA navigation
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 404 Handler for undefined API routes
app.use(notFound);

// Centralized Error Handling Middleware
app.use(errorHandler);

/**
 * Boots the server and initializes database connection
 */
const startServer = async (customPort) => {
  const PORT = customPort || process.env.PORT || 3000;

  try {
    await connectDB();

    // Check if database needs initial seeding
    const User = require('./models/User');
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('⚡ [App] Database is empty. Running automatic seed initialization...');
      const seedData = require('./seed');
      await seedData();
    }

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('\n======================================================');
      console.log(`🚀 Real Estate Portal Server running at http://0.0.0.0:${PORT}`);
      console.log(`📡 API Base URL: http://localhost:${PORT}/api`);
      console.log(`🌐 Frontend Portal: http://localhost:${PORT}`);
      console.log('======================================================\n');
    });

    return { app, server };
  } catch (error) {
    console.error('❌ Failed to start application server:', error);
    process.exit(1);
  }
};

module.exports = { app, startServer };
