const jwt = require('jsonwebtoken');
const User = require('../models/userModel');

const protect = async (req, res, next) => {
  // Skip auth check for OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    return next();
  }

  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'qazaqcode_secret_key');

      req.user = await User.findById(decoded.id).select('-password');

      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      return next(new Error('Not authorized, token failed'));
    }
  }

  if (!token) {
    res.status(401);
    return next(new Error('Not authorized, no token'));
  }
};

const admin = (req, res, next) => {
  // Skip check for OPTIONS requests (CORS preflight)
  if (req.method === 'OPTIONS') {
    return next();
  }
  
  if (req.user && req.user.role === 'teacher') {
    next();
  } else {
    res.status(401);
    return next(new Error('Not authorized as a teacher'));
  }
};

// Middleware для проверки роли пользователя
const authorize = (roles) => {
  return (req, res, next) => {
    // Skip check for OPTIONS requests (CORS preflight)
    if (req.method === 'OPTIONS') {
      return next();
    }
    
    if (!req.user) {
      res.status(401);
      return next(new Error('User not authenticated'));
    }
    
    if (!roles.includes(req.user.role)) {
      res.status(403);
      return next(new Error(`User role ${req.user.role} not authorized to access this route`));
    }
    
    next();
  };
};

module.exports = { protect, admin, authorize };