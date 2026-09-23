const jwt = require('jsonwebtoken');
const authRepository = require('./auth.repository');
const config = require('../../config/env');

/**
 * Authentication Middleware
 * Strictly extracts JWT from HTTP-only cookie, verifies token signature/expiry,
 * looks up the database user to confirm active status, and populates req.user.
 */
async function requireAuth(req, res, next) {
  try {
    // Read JWT strictly from HTTP-only cookie
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Session expired or invalid. Please log in again.',
      });
    }

    // Look up current user in database to ensure account is valid and active
    const user = await authRepository.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account not found or has been deactivated.',
      });
    }

    // Attach server-verified user identity to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Optional Authentication Middleware
 * Populates req.user if a valid token cookie is present, but allows anonymous access to continue.
 */
async function optionalAuth(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) return next();

    let decoded;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch {
      return next();
    }

    const user = await authRepository.findById(decoded.id);
    if (user && user.isActive) {
      req.user = user;
    }
    next();
  } catch {
    next();
  }
}

/**
 * Role-Based Authorization Middleware Factory
 * Enforces allowed UserRole values server-side.
 * Example: requireRole('ADMIN'), requireRole('COLLEGE', 'AUTHORITY')
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Access restricted to [${roles.join(', ')}].`,
      });
    }

    next();
  };
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireRole,
};
