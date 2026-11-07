const jwt = require('jsonwebtoken');
const config = require('../config');

function signToken(payload) {
  return jwt.sign(payload, config.jwtSecret, {
    algorithm: 'HS256',
    expiresIn: config.jwtExpiresIn
  });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, config.jwtSecret, {
      algorithms: ['HS256']
    });
  } catch (err) {
    return null;
  }
}

module.exports = {
  signToken,
  verifyToken
};
