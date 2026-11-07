/**
 * Security Middleware Suite for APEX Platform
 * - HTTP Security Headers (Anti-Sniff, Anti-Clickjacking, Anti-XSS)
 * - Anti-Brute-Force Rate Limiting (Protects login & register from cracking)
 * - Input Sanitization & Injection Prevention
 */

// In-memory sliding window rate limiter
const rateLimitMap = new Map();

// Clean up stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitMap.entries()) {
    if (now - data.resetTime > 0) {
      rateLimitMap.delete(key);
    }
  }
}, 300000);

/**
 * Creates a rate limiter middleware for a specific bucket
 */
function createRateLimiter({ windowMs = 60000, max = 30, message = 'Too many requests. Please slow down.' }) {
  return (req, res, next) => {
    // Determine client identifier (IP address)
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
               req.socket?.remoteAddress ||
               '127.0.0.1';

    const routeKey = `${ip}:${req.baseUrl || req.path}`;
    const now = Date.now();

    let record = rateLimitMap.get(routeKey);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs
      };
      rateLimitMap.set(routeKey, record);
    } else {
      record.count++;
    }

    // Set standard rate limit headers
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > max) {
      return res.status(429).json({
        success: false,
        error: message,
        retryAfterSeconds: Math.ceil((record.resetTime - now) / 1000)
      });
    }

    next();
  };
}

// Strict rate limiter for Authentication (anti-brute-force password cracking)
const authRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 12,              // max 12 login/register attempts per minute
  message: 'Security Alert: Too many login attempts. Please wait 1 minute before trying again.'
});

// General API rate limiter (prevents scraping / DDoS)
const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 180,             // max 180 requests per minute
  message: 'Too many API requests. Please slow down.'
});

/**
 * HTTP Security Headers Middleware
 */
function securityHeaders(req, res, next) {
  try {
    res.removeHeader('X-Powered-By');
  } catch (_) {}

  // Anti-MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Anti-Clickjacking (prevents embedding website in malicious iframes)
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // Anti-XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Strict Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restrict sensitive browser features
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  next();
}

/**
 * Recursive input sanitizer to strip XSS / malicious injection payloads
 */
function sanitizeValue(val) {
  if (typeof val === 'string') {
    return val
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
  if (Array.isArray(val)) {
    return val.map(sanitizeValue);
  }
  if (val !== null && typeof val === 'object') {
    const cleaned = {};
    for (const key of Object.keys(val)) {
      if (!key.startsWith('__') && key !== 'constructor' && key !== 'prototype') {
        cleaned[key] = sanitizeValue(val[key]);
      }
    }
    return cleaned;
  }
  return val;
}

function sanitizeInputs(req, res, next) {
  try {
    if (req.body && typeof req.body === 'object') {
      for (const key of Object.keys(req.body)) {
        req.body[key] = sanitizeValue(req.body[key]);
      }
    }
    if (req.query && typeof req.query === 'object') {
      for (const key of Object.keys(req.query)) {
        try {
          req.query[key] = sanitizeValue(req.query[key]);
        } catch (_) {}
      }
    }
  } catch (_) {}
  next();
}

module.exports = {
  securityHeaders,
  authRateLimiter,
  apiRateLimiter,
  sanitizeInputs
};
