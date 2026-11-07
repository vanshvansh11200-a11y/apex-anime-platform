const https = require('https');
const http = require('http');

/**
 * Parses and resolves Telegram channel post links
 * e.g. https://t.me/RAZXCHEATS/141
 * into embeddable URLs or direct streaming URLs
 */
function parseTelegramUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();

  // Pattern: https://t.me/<channel>/<postId> or telegram.me/<channel>/<postId>
  const postMatch = trimmed.match(/(?:https?:\/\/)?(?:www\.)?(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]+)\/(\d+)/i);
  if (postMatch) {
    const channel = postMatch[1];
    const postId = postMatch[2];
    return {
      isTelegram: true,
      isPost: true,
      channel,
      postId,
      originalUrl: trimmed,
      embedUrl: `https://t.me/${channel}/${postId}?embed=1`,
      webUrl: `https://t.me/${channel}/${postId}`
    };
  }

  // Check if it's already a telegram direct stream bot URL (e.g. tgstream, workers.dev, etc.)
  if (trimmed.includes('t.me') || trimmed.includes('telegram.me')) {
    return {
      isTelegram: true,
      isPost: false,
      originalUrl: trimmed,
      embedUrl: trimmed,
      webUrl: trimmed
    };
  }

  return null;
}

/**
 * Fetch HTML with redirect handling and timeout
 */
function fetchHtml(targetUrl, maxRedirects = 3) {
  return new Promise((resolve, reject) => {
    if (maxRedirects <= 0) return reject(new Error('Too many redirects'));

    try {
      const urlObj = new URL(targetUrl);
      const client = urlObj.protocol === 'https:' ? https : http;

      const req = client.get(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 5000
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          const nextUrl = new URL(res.headers.location, targetUrl).href;
          return fetchHtml(nextUrl, maxRedirects - 1).then(resolve).catch(reject);
        }

        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode, html: data });
        });
      });

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Telegram request timed out'));
      });
    } catch (e) {
      reject(e);
    }
  });
}

/**
 * Resolves Telegram URL: checks if exists, extracts direct video if possible
 */
async function resolveTelegram(rawUrl) {
  const parsed = parseTelegramUrl(rawUrl);
  if (!parsed) {
    return { isTelegram: false, url: rawUrl, type: 'direct' };
  }

  if (!parsed.isPost) {
    return {
      isTelegram: true,
      type: 'direct',
      url: parsed.originalUrl,
      embedUrl: parsed.originalUrl
    };
  }

  try {
    const res = await fetchHtml(parsed.embedUrl);

    // If Telegram returns 404 for the message/channel
    if (res.statusCode === 404 || res.html.includes('tgme_widget_message_error') || res.html.includes('Post not found')) {
      return {
        isTelegram: true,
        type: 'telegram',
        channel: parsed.channel,
        postId: parsed.postId,
        url: parsed.embedUrl,
        embedUrl: parsed.embedUrl,
        webUrl: parsed.webUrl,
        exists: false,
        warning: `Telegram channel "${parsed.channel}" or message #${parsed.postId} was not found on Telegram (404). Make sure the channel is public and the post exists.`
      };
    }

    // Try extracting ONLY actual direct video stream (never match thumbnail image)
    let videoMatch = res.html.match(/<video[^>]+src=["']([^"']+)["']/i);
    if (!videoMatch) videoMatch = res.html.match(/<source[^>]+src=["']([^"']+\.(?:mp4|webm|m3u8)[^"']*)["']/i);
    if (!videoMatch) videoMatch = res.html.match(/(https:\/\/[^\s"'>]+\.(?:mp4|m3u8|webm)(?:\?[^\s"'>]*)?)/i);

    if (videoMatch && videoMatch[1]) {
      const directVideo = videoMatch[1].replace(/&amp;/g, '&');
      // Ensure it is not an image file
      if (!/\.(jpg|jpeg|png|webp|gif)$/i.test(directVideo)) {
        return {
          isTelegram: true,
          type: 'mp4',
          channel: parsed.channel,
          postId: parsed.postId,
          url: directVideo,
          directVideoUrl: directVideo,
          embedUrl: parsed.embedUrl,
          webUrl: parsed.webUrl,
          exists: true
        };
      }
    }

    // Embed widget is valid, but uses Telegram's inline player
    return {
      isTelegram: true,
      type: 'telegram',
      channel: parsed.channel,
      postId: parsed.postId,
      url: parsed.embedUrl,
      embedUrl: parsed.embedUrl,
      webUrl: parsed.webUrl,
      exists: true
    };
  } catch (err) {
    // If network or timeout, fall back to the embed URL safely
    return {
      isTelegram: true,
      type: 'telegram',
      channel: parsed.channel,
      postId: parsed.postId,
      url: parsed.embedUrl,
      embedUrl: parsed.embedUrl,
      webUrl: parsed.webUrl,
      exists: true
    };
  }
}

module.exports = {
  parseTelegramUrl,
  resolveTelegram
};
