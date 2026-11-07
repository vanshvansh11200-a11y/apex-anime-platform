const { verifyToken } = require('../utils/jwt');
const db = require('../database/db');

function extractToken(req) {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  if (req.query && req.query.token) {
    return req.query.token;
  }
  return null;
}

function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    req.user = null;
    return next();
  }

  const decoded = verifyToken(token);
  if (decoded && decoded.id) {
    const user = db.findUserById(decoded.id);
    if (user && user.status !== 'banned') {
      req.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        bio: user.bio
      };
    } else {
      req.user = null;
    }
  } else {
    req.user = null;
  }
  next();
}

function requireAuth(req, res, next) {
  optionalAuth(req, res, () => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in.'
      });
    }
    next();
  });
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    const isOwner = req.user.role === 'admin' && (
      req.user.id === 'usr_admin_apex' || 
      req.user.email?.toLowerCase() === 'admin@apex.stream' || 
      req.user.username?.toLowerCase() === 'apexadmin'
    );
    if (!isOwner) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden. Owner administrator privileges required.'
      });
    }
    next();
  });
}

module.exports = {
  optionalAuth,
  requireAuth,
  requireAdmin
};
