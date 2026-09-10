const { validationResult } = require('express-validator');

/**
 * Middleware that checks express-validator results.
 * If validation errors exist, responds with standard HTTP 400 response.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errorCode: 'VALIDATION_ERROR',
      errors: formattedErrors
    });
  }
  next();
};

module.exports = validate;
