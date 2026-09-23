const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
};

if (!config.databaseUrl) {
  console.warn('[WARN] DATABASE_URL is not set in environment variables!');
}

if (!config.jwtSecret) {
  if (config.isProduction) {
    throw new Error('FATAL: JWT_SECRET must be set in production!');
  } else {
    console.warn('[WARN] JWT_SECRET is not set! Using an insecure development fallback.');
    config.jwtSecret = 'dev_insecure_jwt_secret_fallback_key';
  }
}

module.exports = config;
