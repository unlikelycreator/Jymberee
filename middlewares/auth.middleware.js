// src/middlewares/auth.middleware.js
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model.js';

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // 1. Check if token exists
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: '3', // This is what your app expects for "No token"
      });
    }

    const token = authHeader.split(' ')[1];

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    // 3. Find user
    const user = await User.findById(decoded._id).select('-password -otp');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '3', // User deleted or token invalid
      });
    }

    // 4. Check if user changed password after token issued (optional, advanced)
    // if (user.passwordChangedAt && decoded.iat < user.passwordChangedAt.getTime() / 1000) {
    //   return res.status(401).json({ success: false, message: '3' });
    // }

    req.user = user;
    next();
  } catch (err) {
    console.log('Token error:', err.name);

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: '3', // Expired token
      });
    }

    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: '3', // Invalid token
      });
    }

    // Any other error
    return res.status(401).json({
      success: false,
      message: '3',
    });
  }
};

export default authenticate;