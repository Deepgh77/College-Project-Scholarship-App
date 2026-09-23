const config = require('../config/env');

/**
 * Centralized API Error Handling Middleware
 */
function errorHandler(err, req, res, next) {
  // Log error for debugging
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err);

  // Handle JSON body parse errors (e.g. malformed JSON in request)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON payload received',
    });
  }

  // Handle Multer upload errors (e.g. file size limit exceeded)
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message:
        err.code === 'LIMIT_FILE_SIZE'
          ? 'File size exceeds the 5 MB limit. Please select a smaller file or compress it before uploading.'
          : err.message,
    });
  }

  // Handle Prisma Known Request Errors
  if (err.code && typeof err.code === 'string' && err.code.startsWith('P')) {
    switch (err.code) {
      case 'P2002': {
        const fields = err.meta?.target ? ` (${err.meta.target.join(', ')})` : '';
        return res.status(409).json({
          success: false,
          message: `A unique constraint violation occurred${fields}.`,
        });
      }
      case 'P2025': {
        return res.status(404).json({
          success: false,
          message: err.meta?.cause || 'Requested record was not found.',
        });
      }
      case 'P2003': {
        return res.status(400).json({
          success: false,
          message: 'Foreign key constraint failed.',
        });
      }
      default: {
        return res.status(500).json({
          success: false,
          message: 'A database error occurred.',
        });
      }
    }
  }

  // Handle operational errors with defined status codes
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  return res.status(statusCode).json({
    success: false,
    message,
    ...(config.isProduction ? {} : { stack: err.stack }),
  });
}

module.exports = errorHandler;
