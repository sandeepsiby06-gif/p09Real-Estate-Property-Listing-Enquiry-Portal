/**
 * Custom application error class
 */
class AppError extends Error {
  constructor(message, statusCode = 400, errorCode = 'BAD_REQUEST') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Centralized Express error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.name = err.name;

  // Log error for debugging in server console
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error Handler] ${err.name || 'Error'}: ${err.message}`);
  }

  // 1. Mongoose Bad ObjectId (CastError)
  if (err.name === 'CastError') {
    const message = `Resource not found. Invalid identifier format: ${err.value}`;
    return res.status(404).json({
      success: false,
      message,
      errorCode: 'INVALID_ID'
    });
  }

  // 2. Mongoose Duplicate Key Error (E11000)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const message = `Duplicate entry detected for ${field}: '${err.keyValue ? err.keyValue[field] : ''}'.`;
    return res.status(409).json({
      success: false,
      message,
      errorCode: 'DUPLICATE_RESOURCE'
    });
  }

  // 3. Mongoose Validation Error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors || {}).map((val) => ({
      field: val.path,
      message: val.message
    }));
    return res.status(400).json({
      success: false,
      message: 'Database schema validation failed',
      errorCode: 'VALIDATION_ERROR',
      errors
    });
  }

  // 4. JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed. Invalid token signature.',
      errorCode: 'INVALID_TOKEN'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication token has expired. Please log in again.',
      errorCode: 'TOKEN_EXPIRED'
    });
  }

  // 5. Custom AppError (Business rule errors, not found, forbidden, etc.)
  if (err.isOperational) {
    return res.status(err.statusCode || 400).json({
      success: false,
      message: err.message,
      errorCode: err.errorCode || 'BUSINESS_RULE_ERROR'
    });
  }

  // 6. Generic / Unhandled 500 errors
  return res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message || 'Internal server error',
    errorCode: 'INTERNAL_SERVER_ERROR'
  });
};

module.exports = {
  AppError,
  errorHandler
};
