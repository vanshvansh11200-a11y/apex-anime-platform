const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');
const { authRateLimiter, sanitizeInputs } = require('../middleware/security');

router.post('/register', authRateLimiter, sanitizeInputs, authController.register);
router.post('/login', authRateLimiter, sanitizeInputs, authController.login);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.getMe);
router.put('/profile', requireAuth, sanitizeInputs, authController.updateProfile);

module.exports = router;
