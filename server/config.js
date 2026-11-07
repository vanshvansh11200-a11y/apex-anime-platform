require('dotenv').config();
const path = require('path');

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'apex_secret_key_change_in_production_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  dataDir: path.resolve(process.cwd(), process.env.DATA_DIR || './data'),
  dbFile: path.resolve(process.cwd(), process.env.DATABASE_FILE || './data/apex.db.json'),
  adminDefault: {
    email: process.env.ADMIN_DEFAULT_EMAIL || 'admin@apex.stream',
    password: process.env.ADMIN_DEFAULT_PASSWORD || 'Admin123!',
    username: 'ApexAdmin'
  }
};
