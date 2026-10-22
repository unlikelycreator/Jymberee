import AppError from '../utils/AppError.js';

export const requireFlag = flag => (req, res, next) => {
  const flags = (process.env.FEATURE_FLAGS || '').split(',').map(f => f.trim());
  if (!flags.includes(flag)) {
    return next(new AppError('Endpoint not available', 404));
  }
  next();
};