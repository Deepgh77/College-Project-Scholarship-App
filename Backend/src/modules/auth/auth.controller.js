const authService = require('./auth.service');
const { registerSchema, loginSchema } = require('./auth.validation');
const config = require('../../config/env');

const COOKIE_NAME = 'token';
const COOKIE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Cookie options helper
 */
function getCookieOptions() {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.isProduction ? 'none' : 'lax',
    maxAge: COOKIE_MAX_AGE_MS,
  };
}

/**
 * Authentication Controller
 */
class AuthController {
  /**
   * Handle student registration
   * POST /api/auth/register
   */
  async register(req, res, next) {
    try {
      const parseResult = registerSchema.safeParse(req.body);
      if (!parseResult.success) {
        const issues = parseResult.error.issues || parseResult.error.errors || [];
        const errorMessages = issues.map((err) => err.message).filter(Boolean).join('; ') || 'Invalid registration input.';
        return res.status(400).json({
          success: false,
          message: errorMessages,
        });
      }

      const { email, password } = parseResult.data;
      const user = await authService.registerStudent({ email, password });

      return res.status(201).json({
        success: true,
        message: 'Student account registered successfully.',
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle user login
   * POST /api/auth/login
   */
  async login(req, res, next) {
    try {
      const parseResult = loginSchema.safeParse(req.body);
      if (!parseResult.success) {
        const issues = parseResult.error.issues || parseResult.error.errors || [];
        const errorMessages = issues.map((err) => err.message).filter(Boolean).join('; ') || 'Invalid login input.';
        return res.status(400).json({
          success: false,
          message: errorMessages,
        });
      }

      const { email, password } = parseResult.data;
      const { user, token } = await authService.login({ email, password });

      // Set JWT strictly in HTTP-only cookie
      res.cookie(COOKIE_NAME, token, getCookieOptions());

      return res.status(200).json({
        success: true,
        message: 'Login successful.',
        user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle user logout
   * POST /api/auth/logout
   */
  async logout(req, res, next) {
    try {
      // Clear authentication cookie
      res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: config.isProduction,
        sameSite: config.isProduction ? 'none' : 'lax',
      });

      return res.status(200).json({
        success: true,
        message: 'Logged out successfully.',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current authenticated user details
   * GET /api/auth/me
   */
  async getCurrentUser(req, res, next) {
    try {
      return res.status(200).json({
        success: true,
        user: req.user,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AuthController();
