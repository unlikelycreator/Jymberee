// src/middlewares/errorHandler.js
import AppError from '../utils/AppError.js';
import { logError } from '../utils/logger.js';

export const globalErrorHandler = (err, req, res, next) => {
  // === 1. Log ALL errors to file ===
  const errorPayload = {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?._id || 'guest',
    timestamp: new Date().toISOString(),
  };

  if (err instanceof AppError) {
    // Operational error
    logError('OPERATIONAL_ERROR', errorPayload);
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }

  // === 2. Unexpected error ===
  logError('UNHANDLED_ERROR', errorPayload);

  // Hide details in production
  const message =
    process.env.NODE_ENV === 'production'
      ? 'Something went wrong'
      : err.message;

  res.status(500).json({
    status: 'error',
    message,
  });
};