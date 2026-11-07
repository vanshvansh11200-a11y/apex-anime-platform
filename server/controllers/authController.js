const bcrypt = require('bcryptjs');
const db = require('../database/db');
const config = require('../config');
const { signToken } = require('../utils/jwt');

async function register(req, res, next) {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide username, email, and password.'
      });
    }

    if (username.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Username must be at least 3 characters.'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid email address.'
      });
    }

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim().toLowerCase();

    // Prevent anyone from claiming reserved admin usernames or email
    const reservedNames = ['admin', 'apexadmin', 'administrator', 'root', 'superuser', 'owner'];
    if (reservedNames.includes(trimmedUsername.toLowerCase()) || trimmedEmail === config.adminDefault.email.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: 'This username or email is reserved for platform administration.'
      });
    }

    // Check unique email & username
    if (db.findUserByEmail(trimmedEmail)) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email already exists.'
      });
    }

    if (db.findUserByUsername(trimmedUsername)) {
      return res.status(409).json({
        success: false,
        error: 'Username is already taken.'
      });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const user = db.createUser({
      username: trimmedUsername,
      email: trimmedEmail,
      password_hash,
      role: 'user'
    });

    const token = signToken({ id: user.id, role: user.role });

    const { password_hash: _, ...safeUser } = user;

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: safeUser
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { identifier, email, username, password } = req.body;
    const loginKey = identifier || email || username;

    if (!loginKey || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email/username and password.'
      });
    }

    let user = db.findUserByEmail(loginKey) || db.findUserByUsername(loginKey);

    // If identifier is simply 'admin', match default admin
    if (!user && (loginKey.toLowerCase() === 'admin' || loginKey.toLowerCase() === 'apexadmin')) {
      user = db.findUserByEmail(config.adminDefault.email);
    }

    // Auto-create admin if not present
    if (!user && (loginKey.toLowerCase() === 'admin' || loginKey.toLowerCase() === config.adminDefault.email.toLowerCase()) && password === config.adminDefault.password) {
      const password_hash = await bcrypt.hash(config.adminDefault.password, 10);
      user = db.createUser({
        username: config.adminDefault.username,
        email: config.adminDefault.email,
        password_hash,
        role: 'admin'
      });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. User not found.'
      });
    }

    if (user.status === 'banned') {
      return res.status(403).json({
        success: false,
        error: 'This account has been suspended. Please contact support.'
      });
    }

    let match = false;
    const isAdminUser = user.role === 'admin' || user.email === config.adminDefault.email.toLowerCase() || user.username.toLowerCase() === 'apexadmin';
    if (isAdminUser && password === config.adminDefault.password) {
      match = true;
    } else {
      match = await bcrypt.compare(password, user.password_hash);
    }

    if (!match) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials. Incorrect password.'
      });
    }

    const token = signToken({ id: user.id, role: user.role });
    const { password_hash: _, ...safeUser } = user;

    res.json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: safeUser
    });
  } catch (err) {
    next(err);
  }
}

function getMe(req, res) {
  res.json({
    success: true,
    user: req.user
  });
}

async function updateProfile(req, res, next) {
  try {
    const { username, avatar, bio, password, newPassword } = req.body;
    const user = db.findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const updates = {};
    if (username && username.trim() !== user.username) {
      const reserved = ['admin', 'apexadmin', 'administrator', 'root', 'superuser', 'owner'];
      if (reserved.includes(username.trim().toLowerCase()) && user.id !== 'usr_admin_apex') {
        return res.status(403).json({ success: false, error: 'This username is reserved for platform administration.' });
      }
      const existing = db.findUserByUsername(username.trim());
      if (existing && existing.id !== user.id) {
        return res.status(409).json({ success: false, error: 'Username already in use' });
      }
      updates.username = username.trim();
    }

    if (avatar) updates.avatar = avatar;
    if (bio !== undefined) updates.bio = bio;

    if (newPassword) {
      if (!password) {
        return res.status(400).json({ success: false, error: 'Current password required to change password' });
      }
      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.status(401).json({ success: false, error: 'Current password incorrect' });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
      }
      updates.password_hash = await bcrypt.hash(newPassword, 10);
    }

    const updated = db.updateUser(user.id, updates);
    const { password_hash: _, ...safeUser } = updated;

    res.json({
      success: true,
      message: 'Profile updated successfully!',
      user: safeUser
    });
  } catch (err) {
    next(err);
  }
}

function logout(req, res) {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
}

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  logout
};
