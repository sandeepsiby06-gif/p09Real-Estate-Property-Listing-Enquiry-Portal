const jwt = require('jsonwebtoken');

/**
 * Generates a JSON Web Token for authenticated users
 * @param {Object} user - User document or payload
 * @returns {string} Signed JWT token
 */
const generateToken = (user) => {
  const secret = process.env.JWT_SECRET || 'academic_portal_default_jwt_secret_key_2026';
  const expiresIn = process.env.JWT_EXPIRES_IN || '1d';

  return jwt.sign(
    {
      id: user._id || user.id,
      role: user.role,
      email: user.email,
      name: user.name
    },
    secret,
    { expiresIn }
  );
};

module.exports = generateToken;
