const fs = require('fs');
const zlib = require('zlib');
const path = require('path');
const express = require('express');
const cors = require('cors');
const config = require('./config');
const db = require('./database/db');
const seedDatabase = require('./database/seed');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { securityHeaders, apiRateLimiter, sanitizeInputs } = require('./middleware/security');

// Route modules
const authRoutes = require('./routes/authRoutes');
const animeRoutes = require('./routes/animeRoutes');
const episodeRoutes = require('./routes/episodeRoutes');
const watchlistRoutes = require('./routes/watchlistRoutes');
const historyRoutes = require('./routes/historyRoutes');
const commentRoutes = require('./routes/commentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const thirdPartyRoutes = require('./routes/thirdPartyRoutes');
const streamRoutes = require('./routes/streamRoutes');
const seoRoutes = require('./routes/seoRoutes');
const telegramBotService = require('./services/telegramBotService');

const app = express();
app.disable('x-powered-by');

// Security and middleware
app.use(securityHeaders);
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api', sanitizeInputs);
app.use('/api', apiRateLimiter);

// Request logging in development
if (config.nodeEnv !== 'test') {
  app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      if (!req.originalUrl.startsWith('/css') && !req.originalUrl.startsWith('/js') && !req.originalUrl.startsWith('/assets')) {
        const statusLabel = res.statusCode === 304 
          ? '304 (✓ OK/Cached)' 
          : (res.statusCode >= 200 && res.statusCode < 400 ? `${res.statusCode} (✓ OK)` : `${res.statusCode} (⚠️ Alert)`);
        console.log(`[HTTP] ${req.method} ${req.originalUrl} - ${statusLabel} (${duration}ms)`);
      }
    });
    next();
  });
}

// SEO endpoints
app.use('/', seoRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    platform: 'APEX Anime Streaming Platform',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: {
      loaded: db.isLoaded,
      animeCount: db.data.anime.length,
      usersCount: db.data.users.length
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/anime', animeRoutes);
app.use('/api/episodes', episodeRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/thirdparty', thirdPartyRoutes);
app.use('/api/stream', streamRoutes);

// Static assets & SPA client routes (No-cache for instant live updates)
const publicDir = path.resolve(__dirname, '../public');

app.use((req, res, next) => {
  if (!req.originalUrl.startsWith('/api') && !req.originalUrl.startsWith('/videos')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

app.use(express.static(publicDir, {
  etag: false,
  lastModified: false
}));

// Fallback for Single-Page Application (SPA) client routes
app.get('*', (req, res, next) => {
  if (req.originalUrl.startsWith('/api')) {
    return notFound(req, res, next);
  }
  res.sendFile(path.join(publicDir, 'index.html'));
});

// Global error handler
app.use(errorHandler);

// Boot function
async function startServer() {
  try {
    if (db.data.users.length === 0) {
      console.log('[APEX] Initializing default admin and user credentials...');
      await seedDatabase(false);
    }

    const server = app.listen(config.port, '0.0.0.0', async () => {
      console.log(`
=====================================================
  ⚡ APEX - Anime Streaming Platform
=====================================================
  🚀 Server running at: http://localhost:${config.port}
  🔒 Environment:       ${config.nodeEnv}
  📦 Database:          ${config.dbFile}
  👤 Master Admin:     ${config.adminDefault.email}
  🔑 Admin Password:    ${config.adminDefault.password}
=====================================================
      `);

      // Note: Standalone Telegram AI Bot is managed separately in ~/telegram-ai-bot (alias 'bot')
      if (process.env.RUN_BOT_ON_SERVER === 'true') {
        const botToken = process.env.TELEGRAM_BOT_TOKEN || db.data.settings?.telegramBotToken;
        if (botToken && botToken.includes(':')) {
          await telegramBotService.start(botToken);
        }
      }
    });

    return server;
  } catch (err) {
    console.error('[APEX] Failed to start server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
