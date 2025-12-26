// src/middlewares/validate.js
import { ZodError } from 'zod';
import AppError from '../utils/AppError.js';
import { logError } from '../utils/logger.js';

const getValueAtPath = (root, path) => {
  try {
    return path.reduce((acc, key) => acc?.[key], root);
  } catch (_) {
    return undefined;
  }
};

const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    if (error instanceof ZodError) {
      const issues =
        Array.isArray(error.errors)
          ? error.errors
          : Array.isArray(error.issues)
            ? error.issues
            : Array.isArray(error)
              ? error
              : [];


      const customErrors = issues.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
        value: getValueAtPath({ body: req.body, query: req.query, params: req.params }, err.path)
      }));

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        raw: issues,        // <-- raw Zod errors
        formatted: customErrors,
      });
    }
    logError('UNEXPECTED_VALIDATION_ERROR', { error: error.message });
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

export default validate;
