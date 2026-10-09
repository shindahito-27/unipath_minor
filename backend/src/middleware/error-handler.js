import { logger } from '../utils/logger.js';

export function errorHandler(error, _request, response, next) {
  logger.error(error.stack || error.message);
  if (response.headersSent) return next(error);

  if (error.code === 11000) {
    return response.status(409).json({ success: false, message: 'A resource with this unique value already exists' });
  }
  if (error.name === 'ValidationError') {
    return response.status(400).json({
      success: false,
      message: 'Resource validation failed',
      errors: Object.values(error.errors).map(({ path, message }) => ({ path, message })),
    });
  }
  if (error.name === 'CastError') {
    return response.status(400).json({ success: false, message: 'Invalid resource identifier' });
  }

  const status = error.status || 500;
  response.status(status).json({
    success: false,
    message: status < 500 ? error.message : 'Internal server error',
    ...(error.details || {}),
  });
}
