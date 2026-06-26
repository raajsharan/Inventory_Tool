const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const db = require('../config/db');

async function authenticate(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new ApiError(401, 'Missing token'));
  let claims;
  try {
    claims = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch (e) {
    return next(new ApiError(401, 'Invalid or expired token'));
  }
  try {
    // Re-check the user against the DB so disabling/demoting takes effect
    // immediately instead of waiting for the token to expire (the token is
    // otherwise stateless and trusts its embedded role).
    const { rows } = await db.query(
      `SELECT id, email, full_name, role, is_active, must_change_password
         FROM users WHERE id = $1`,
      [claims.id]
    );
    const u = rows[0];
    if (!u || !u.is_active) return next(new ApiError(401, 'Account is inactive'));
    req.user = {
      id: u.id,
      email: u.email,
      name: u.full_name,
      role: u.role,
      mustChangePassword: u.must_change_password,
    };
    return next();
  } catch (e) {
    return next(e);
  }
}

// Blocks every route except the password-change flow while the user is flagged
// to change their password (e.g. freshly-seeded default accounts).
function blockUntilPasswordChanged(req, _res, next) {
  if (req.user && req.user.mustChangePassword) {
    return next(new ApiError(403, 'Password change required before continuing'));
  }
  return next();
}

function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(new ApiError(401, 'Unauthenticated'));
    if (req.user.role === 'superadmin') return next(); // god mode
    if (roles.length && !roles.includes(req.user.role)) {
      return next(new ApiError(403, 'Forbidden: insufficient role'));
    }
    return next();
  };
}

// Per-page RBAC check, layered on top of authenticate + authorize.
function requirePageAccess(pageKey) {
  return async (req, _res, next) => {
    try {
      if (!req.user) return next(new ApiError(401, 'Unauthenticated'));
      if (req.user.role === 'superadmin') return next();
      const svc = require('../services/pageAccessService');
      const ok = await svc.can(req.user.role, pageKey);
      if (!ok) return next(new ApiError(403, 'Page access denied for your role'));
      return next();
    } catch (e) { return next(e); }
  };
}

module.exports = { authenticate, authorize, requirePageAccess, blockUntilPasswordChanged };
