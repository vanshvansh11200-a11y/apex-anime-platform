const express = require('express');
const https = require('https');
const http = require('http');
const db = require('../database/db');
const telegramResolver = require('../services/telegramResolver');

const router = express.Router();

function getBotToken() {
  return process.env.TELEGRAM_BOT_TOKEN || db.data.settings?.telegramBotToken || '';
}

/**
 * POST /api/stream/generate-link
 * Generate direct stream links, embed links, and web player links from any URL
 */
router.post('/generate-link', async (req, res, next) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid URL is required' });
    }

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const baseUrl = `${protocol}://${host}`;

    const resolved = await telegramResolver.resolveTelegram(url.trim());

    const result = {
      success: true,
      originalUrl: url.trim(),
      isTelegram: resolved.isTelegram,
      channel: resolved.channel || null,
      postId: resolved.postId || null,
      directVideoUrl: resolved.directVideoUrl || null,
      embedUrl: resolved.embedUrl || url.trim(),
      proxyStreamUrl: resolved.directVideoUrl
        ? `${baseUrl}/api/stream/proxy?url=${encodeURIComponent(resolved.directVideoUrl)}`
        : null,
      apexPlayerUrl: `${baseUrl}/#/stream?url=${encodeURIComponent(resolved.directVideoUrl || resolved.embedUrl || url.trim())}`,
      warning: resolved.warning || null
    };

    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/stream/proxy?url=...
 * Streams media with HTTP 206 Partial Content (Range requests) and CORS headers.
 * Enables smooth playback and scrubbing across browsers and video players.
 */
router.get('/proxy', (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send('url parameter is required');
  }

  try {
    const urlObj = new URL(targetUrl);
    const client = urlObj.protocol === 'https:' ? https : http;

    const requestHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*'
    };

    if (req.headers.range) {
      requestHeaders['Range'] = req.headers.range;
    }

    const proxyReq = client.get(targetUrl, { headers: requestHeaders }, (remoteRes) => {
      // Handle redirects if any
      if (remoteRes.statusCode >= 300 && remoteRes.statusCode < 400 && remoteRes.headers.location) {
        const nextUrl = new URL(remoteRes.headers.location, targetUrl).href;
        return res.redirect(302, `/api/stream/proxy?url=${encodeURIComponent(nextUrl)}`);
      }

      res.status(remoteRes.statusCode);

      const forwardHeaders = [
        'content-type',
        'content-length',
        'content-range',
        'accept-ranges',
        'last-modified',
        'etag'
      ];

      forwardHeaders.forEach(h => {
        if (remoteRes.headers[h]) {
          res.setHeader(h, remoteRes.headers[h]);
        }
      });

      // Inject CORS and Range headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Range, Accept, Content-Type');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
      if (!res.getHeader('accept-ranges')) {
        res.setHeader('Accept-Ranges', 'bytes');
      }

      remoteRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('[StreamProxy Error]:', err.message);
      if (!res.headersSent) {
        res.status(502).send('Error streaming media: ' + err.message);
      }
    });

    req.on('close', () => {
      proxyReq.destroy();
    });
  } catch (err) {
    res.status(400).send('Invalid target URL: ' + err.message);
  }
});

/**
 * GET /api/stream/tg-file?path=...
 * Streams a Telegram Bot file via Telegram Bot API with Range & CORS support
 */
router.get('/tg-file', (req, res) => {
  const filePath = req.query.path;
  const token = getBotToken();

  if (!token) {
    return res.status(400).send('TELEGRAM_BOT_TOKEN is not configured');
  }
  if (!filePath) {
    return res.status(400).send('path parameter is required');
  }

  const tgUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;
  req.query.url = tgUrl;

  try {
    const urlObj = new URL(tgUrl);
    const client = https;

    const requestHeaders = {
      'User-Agent': 'APEX-Anime-Platform/1.0',
      'Accept': '*/*'
    };

    if (req.headers.range) {
      requestHeaders['Range'] = req.headers.range;
    }

    const proxyReq = client.get(tgUrl, { headers: requestHeaders }, (remoteRes) => {
      res.status(remoteRes.statusCode);

      const forwardHeaders = [
        'content-type',
        'content-length',
        'content-range',
        'accept-ranges',
        'last-modified'
      ];

      forwardHeaders.forEach(h => {
        if (remoteRes.headers[h]) {
          res.setHeader(h, remoteRes.headers[h]);
        }
      });

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Headers', 'Range, Accept, Content-Type');
      res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
      if (!res.getHeader('accept-ranges')) {
        res.setHeader('Accept-Ranges', 'bytes');
      }

      remoteRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      if (!res.headersSent) res.status(502).send('Telegram stream error: ' + err.message);
    });

    req.on('close', () => {
      proxyReq.destroy();
    });
  } catch (err) {
    res.status(400).send('Error streaming Telegram file: ' + err.message);
  }
});

module.exports = router;
