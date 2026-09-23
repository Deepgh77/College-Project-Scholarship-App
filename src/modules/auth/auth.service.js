const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRepository = require('./auth.repository');
const config = require('../../config/env');

/**
 * Authentication Service
 * Implements business logic for registration, credential verification, and JWT generation.
 */
class AuthService {
  /**
   * Register a new Student account
   */
  async registerStudent({ email, password }) {
    const normalizedEmail = email.trim().toLowerCase();

    // Prevent duplicate email registrations
    const existingUser = await authRepository.findByEmail(normalizedEmail);
    if (existingUser) {
      const error = new Error('An account with this email already exists.');
      error.statusCode = 409;
      throw error;
    }

    // Hash password with 10 rounds
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Persist as STUDENT role strictly
    const user = await authRepository.createUser({
      email: normalizedEmail,
      passwordHash,
      role: 'STUDENT',
    });

    return user;
  }

  /**
   * Verify login credentials and generate JWT
   */
  async login({ email, password }) {
    const normalizedEmail = email.trim().toLowerCase();

    // Look up user
    const user = await authRepository.findByEmail(normalizedEmail);
    if (!user || !user.isActive) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      throw error;
    }

    // Verify password hash
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      const error = new Error('Invalid email or password.');
      error.statusCode = 401;
      throw error;
    }

    // Generate JWT with minimal payload
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
      },
      config.jwtSecret,
      { expiresIn: '1d' }
    );

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      token,
    };
  }

  /**
   * Fetch current authenticated user by ID
   */
  async getCurrentUser(userId) {
    const user = await authRepository.findById(userId);
    if (!user || !user.isActive) {
      const error = new Error('User account not found or deactivated.');
      error.statusCode = 401;
      throw error;
    }

    return user;
  }
}

module.exports = new AuthService();
