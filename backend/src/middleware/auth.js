const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');

function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new ApiError(401, 'Missing token'));
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (e) {
    return next(new ApiError(401, 'Invalid or expired token'));
  }
}

function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new ApiError(401, 'Unauthenticated'));
    if (roles.length && !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Forbidden: insufficient role'));
    }
    return next();
  };
}

module.exports = { authenticate, authorize };
