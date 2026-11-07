const https = require('https');
const db = require('../database/db');
const telegramResolver = require('./telegramResolver');
const aiEnricherService = require('./aiEnricherService');

class TelegramBotService {
  constructor() {
    this.token = null;
    this.botInfo = null;
    this.isRunning = false;
    this.pollingTimeout = null;
    this.lastUpdateId = 0;
    this.userLastMedia = new Map(); // Store last sent media per chatId
  }

  /**
   * Get active token from env or database settings
   */
  getToken() {
    return process.env.TELEGRAM_BOT_TOKEN || db.data.settings?.telegramBotToken || '';
  }

  /**
   * Make request to Telegram Bot API
   */
  async apiRequest(method, payload = {}) {
    const token = this.token || this.getToken();
    if (!token) throw new Error('Telegram Bot Token not configured');

    return new Promise((resolve, reject) => {
      const data = JSON.stringify(payload);
      const req = https.request(`https://api.telegram.org/bot${token}/${method}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        },
        timeout: 45000
      }, (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (parsed.ok) {
              resolve(parsed.result);
            } else {
              reject(new Error(parsed.description || 'Telegram API error'));
            }
          } catch (e) {
            reject(new Error('Invalid JSON from Telegram: ' + body.slice(0, 100)));
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Telegram request timed out'));
      });

      req.write(data);
      req.end();
    });
  }

  /**
   * Send text message with Markdown formatting
   */
  async sendMessage(chatId, text, extra = {}) {
    try {
      return await this.apiRequest('sendMessage', {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
        ...extra
      });
    } catch (err) {
      // Fallback without parse_mode if HTML parsing fails
      return await this.apiRequest('sendMessage', {
        chat_id: chatId,
        text: text.replace(/<[^>]*>/g, ''),
        disable_web_page_preview: false,
        ...extra
      }).catch(e => console.error('[Bot Send Error]:', e.message));
    }
  }

  /**
   * Start Bot with long-polling
   */
  async start(customToken = null) {
    if (this.isRunning) {
      await this.stop();
    }

    this.token = customToken || this.getToken();
    if (!this.token || !this.token.includes(':')) {
      console.log('[TelegramBot] No valid bot token configured. Bot is inactive.');
      return false;
    }

    try {
      this.botInfo = await this.apiRequest('getMe');
      this.isRunning = true;
      console.log(`[TelegramBot] 🤖 Bot connected successfully as @${this.botInfo.username} (${this.botInfo.first_name})`);
      this.pollUpdates();
      return true;
    } catch (err) {
      console.error('[TelegramBot] Failed to connect:', err.message);
      this.isRunning = false;
      return false;
    }
  }

  /**
   * Stop bot polling
   */
  async stop() {
    this.isRunning = false;
    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout);
      this.pollingTimeout = null;
    }
    console.log('[TelegramBot] Bot stopped.');
  }

  /**
   * Long-polling loop
   */
  async pollUpdates() {
    if (!this.isRunning) return;

    try {
      const updates = await this.apiRequest('getUpdates', {
        offset: this.lastUpdateId + 1,
        timeout: 25,
        allowed_updates: ['message', 'callback_query']
      });

      if (Array.isArray(updates)) {
        for (const update of updates) {
          this.lastUpdateId = Math.max(this.lastUpdateId, update.update_id);
          await this.handleUpdate(update).catch(err => {
            console.error('[TelegramBot] Error handling update:', err.message);
          });
        }
      }
    } catch (err) {
      if (this.isRunning) {
        // Sleep 3s on error before retrying
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    if (this.isRunning) {
      this.pollingTimeout = setTimeout(() => this.pollUpdates(), 100);
    }
  }

  /**
   * Handle incoming message/callback
   */
  async handleUpdate(update) {
    const msg = update.message;
    if (!msg) return;

    const chatId = msg.chat.id;
    const text = (msg.text || msg.caption || '').trim();

    // 1. Commands
    if (text.startsWith('/start') || text.startsWith('/help')) {
      return this.handleStartCommand(chatId);
    }

    if (text.startsWith('/status')) {
      return this.handleStatusCommand(chatId);
    }

    if (text.startsWith('/folders') || text.startsWith('/list')) {
      return this.handleFoldersCommand(chatId);
    }

    if (text.startsWith('/publish') || text.startsWith('/add')) {
      return this.handlePublishCommand(chatId, text, msg);
    }

    if (text.startsWith('/movie')) {
      return this.handleMovieCommand(chatId, text, msg);
    }

    // 2. Video or Document uploaded/forwarded
    if (msg.video || msg.document) {
      return this.handleMediaUpload(chatId, msg);
    }

    // 3. Plain text containing a Telegram or video URL
    const urlMatch = text.match(/(https?:\/\/[^\s]+)/i);
    if (urlMatch) {
      return this.handleUrlMessage(chatId, urlMatch[1]);
    }

    // Default reply for random text
    await this.sendMessage(chatId, `
👋 <b>APEX Anime Stream Bot</b>

Kisi bhi video ya episode ka link bhejo (jaise: <code>https://t.me/channel/123</code>), main aapko direct streaming link bana kar dunga!

📌 <b>Commands:</b>
• <code>/publish &lt;Anime&gt; &lt;Ep&gt;</code> - Seedha website pe live karein
• <code>/movie &lt;Title&gt;</code> - Standalone movie add karein
• <code>/folders</code> - Sare anime folders dekhein
• <code>/status</code> - Bot aur server status
    `);
  }

  /**
   * Handle /start and /help
   */
  async handleStartCommand(chatId) {
    const welcome = `
⚡ <b>Welcome to APEX Anime Stream Bot!</b> 🎬

Main aapke Telegram videos aur links se <b>Direct High-Speed Streaming Links</b> generate karta hu aur 1-click me aapki APEX Anime Website pe publish kar sakta hu!

✨ <b>Features:</b>
1️⃣ <b>Direct Link Generator:</b>
Koi bhi Telegram channel link bhejo (e.g. <code>https://t.me/RAZXCHEATS/141</code>) ya direct video URL -> Direct Stream Link, Embed Link & APEX Web Player Link turant milega!

2️⃣ <b>1-Click Publish to Website:</b>
Link ke sath ya video forward karke likhein:
<code>/publish Naruto 1</code>
Wo turant website par live ho jayega aur "Naruto" folder me save ho jayega!

3️⃣ <b>Movies Support:</b>
Full length movie ke liye:
<code>/movie Your Name</code>

4️⃣ <b>Hindi Dub Support:</b>
Hindi dub anime ke liye sath me <code>hi</code> likhein:
<code>/publish Naruto 1 hi</code>

5️⃣ <b>Folder System:</b>
Check karein ki kis anime me kitne episodes hain:
<code>/folders</code>
    `;
    await this.sendMessage(chatId, welcome);
  }

  /**
   * Handle URL message (e.g. https://t.me/channel/141)
   */
  async handleUrlMessage(chatId, rawUrl) {
    try {
      const resolved = await telegramResolver.resolveTelegram(rawUrl);

      if (resolved.directVideoUrl && !/\.(jpg|jpeg|png|webp|gif)$/i.test(resolved.directVideoUrl)) {
        // Save for quick publish
        this.userLastMedia.set(chatId, {
          url: resolved.directVideoUrl,
          type: 'mp4',
          originalUrl: rawUrl
        });
        // Send pure direct video stream URL
        return await this.sendMessage(chatId, resolved.directVideoUrl);
      }

      // If no direct video stream in post (Telegram document or app-only stream)
      await this.sendMessage(chatId, `⚠️ Is Telegram channel post me direct web video stream nahi hai (ye file Telegram app me locked hai).

💡 Video website pe direct play karne ke 2 sabse aasan tareeqe:
1️⃣ Admin Panel me <b>"Upload from Phone"</b> button dabayein aur apne phone se direct video select karein! (Kisi bot ki zaroorat nahi, 100% direct play hoga!).
2️⃣ Ya video ko <b>Catbox.moe</b> par upload karein aur uska direct .mp4 link yahan daal dein!`);

    } catch (err) {
      await this.sendMessage(chatId, `❌ Error: ${err.message}`);
    }
  }

  /**
   * Handle Video or Document upload/forward
   */
  async handleMediaUpload(chatId, msg) {
    const media = msg.video || msg.document;
    if (!media) return;

    const fileId = media.file_id;
    try {
      const fileInfo = await this.apiRequest('getFile', { file_id: fileId });
      const filePath = fileInfo.file_path;
      const token = this.token || this.getToken();
      const directCdnUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

      this.userLastMedia.set(chatId, {
        url: directCdnUrl,
        type: 'mp4'
      });

      // Send ONLY 1 direct link and nothing else
      await this.sendMessage(chatId, directCdnUrl);
    } catch (err) {
      await this.sendMessage(chatId, `⚠️ Ye video 20MB se badi hai. Is video ko apne channel me post karke uska link bhejein, direct stream link mil jayega!`);
    }
  }

  /**
   * Handle /publish <Anime> <Ep> [audio] [url]
   */
  async handlePublishCommand(chatId, text, msg) {
    const parts = text.split(/\s+/).slice(1);
    if (parts.length === 0) {
      return this.sendMessage(chatId, `
❌ <b>Usage:</b> <code>/publish &lt;Anime Name&gt; &lt;Episode Number&gt; [Audio: hi/ja/en] [URL]</code>
<i>Example:</i> <code>/publish Naruto 1 hi https://t.me/RAZXCHEATS/141</code>
<i>Or send a video/link first, then reply:</i> <code>/publish Naruto 1</code>
      `);
    }

    // Check if URL is given in command or in reply
    let streamUrl = null;
    let audio = 'ja';
    let epNum = 1;
    let animeTitle = '';

    // Check if replying to a message with a link or if we have last sent media
    const replyMsg = msg.reply_to_message;
    if (replyMsg) {
      const match = (replyMsg.text || replyMsg.caption || '').match(/(https?:\/\/[^\s]+)/i);
      if (match) streamUrl = match[1];
    }

    if (!streamUrl && this.userLastMedia.has(chatId)) {
      streamUrl = this.userLastMedia.get(chatId).url;
    }

    // Parse arguments: e.g. /publish Naruto Shippuden 2 hi https://t.me/...
    const remainingParts = [];
    for (const part of parts) {
      if (part.startsWith('http://') || part.startsWith('https://')) {
        streamUrl = part;
      } else if (['hi', 'hindi', 'en', 'dub', 'ja', 'sub'].includes(part.toLowerCase())) {
        audio = (part.toLowerCase() === 'hi' || part.toLowerCase() === 'hindi') ? 'hi' : (part.toLowerCase() === 'en' || part.toLowerCase() === 'dub' ? 'en' : 'ja');
      } else if (/^\d+$/.test(part)) {
        epNum = parseInt(part, 10);
      } else {
        remainingParts.push(part);
      }
    }

    animeTitle = remainingParts.join(' ').trim();

    if (!animeTitle) {
      return this.sendMessage(chatId, `❌ Please specify the Anime title! Example: <code>/publish Naruto 1</code>`);
    }

    if (!streamUrl) {
      return this.sendMessage(chatId, `❌ No stream URL found! Please send a Telegram video link first or include it: <code>/publish ${animeTitle} ${epNum} https://t.me/...</code>`);
    }

    await this.sendMessage(chatId, `⏳ <i>Publishing "${animeTitle}" Episode ${epNum} to APEX Platform...</i>`);

    try {
      const result = await this.publishToApex({
        title: animeTitle,
        episode_number: epNum,
        stream_url: streamUrl,
        audio,
        content_type: 'series'
      });

      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      const liveUrl = `${baseUrl}/#/anime/${result.anime.slug}`;

      await this.sendMessage(chatId, `
🎉 <b>Published Successfully to Main Website!</b>

📁 <b>Folder:</b> ${result.anime.title}
📺 <b>Episode:</b> Episode ${result.episode.episode_number}
🔊 <b>Audio:</b> ${audio === 'hi' ? '🇮🇳 Hindi Dub' : (audio === 'en' ? '🇬🇧 English Dub' : '🇯🇵 Japanese')}
📊 <b>Total Episodes in Folder:</b> ${result.anime.episodes_count || 1}

🌐 <b>Live Website Link:</b>
<a href="${liveUrl}">${liveUrl}</a>

<i>Ab ye episode direct aapki website ke homepage aur anime detail page par live hai!</i>
      `);
    } catch (err) {
      await this.sendMessage(chatId, `❌ Failed to publish: ${err.message}`);
    }
  }

  /**
   * Handle /movie <Title> [Audio] [URL]
   */
  async handleMovieCommand(chatId, text, msg) {
    const parts = text.split(/\s+/).slice(1);
    if (parts.length === 0) {
      return this.sendMessage(chatId, `
❌ <b>Usage:</b> <code>/movie &lt;Movie Title&gt; [Audio: hi/ja/en] [URL]</code>
<i>Example:</i> <code>/movie Your Name hi https://t.me/RAZXCHEATS/141</code>
      `);
    }

    let streamUrl = null;
    let audio = 'ja';
    const titleParts = [];

    const replyMsg = msg.reply_to_message;
    if (replyMsg) {
      const match = (replyMsg.text || replyMsg.caption || '').match(/(https?:\/\/[^\s]+)/i);
      if (match) streamUrl = match[1];
    }

    if (!streamUrl && this.userLastMedia.has(chatId)) {
      streamUrl = this.userLastMedia.get(chatId).url;
    }

    for (const part of parts) {
      if (part.startsWith('http://') || part.startsWith('https://')) {
        streamUrl = part;
      } else if (['hi', 'hindi', 'en', 'dub', 'ja'].includes(part.toLowerCase())) {
        audio = (part.toLowerCase() === 'hi' || part.toLowerCase() === 'hindi') ? 'hi' : (part.toLowerCase() === 'en' ? 'en' : 'ja');
      } else {
        titleParts.push(part);
      }
    }

    const movieTitle = titleParts.join(' ').trim();
    if (!movieTitle) {
      return this.sendMessage(chatId, `❌ Please specify movie title! Example: <code>/movie Suzume</code>`);
    }

    if (!streamUrl) {
      return this.sendMessage(chatId, `❌ No stream URL found! Please send a video link or include it in command.`);
    }

    await this.sendMessage(chatId, `⏳ <i>Publishing Movie "${movieTitle}" to APEX Platform...</i>`);

    try {
      const result = await this.publishToApex({
        title: movieTitle,
        episode_number: 1,
        episode_title: `${movieTitle} (Full Movie)`,
        stream_url: streamUrl,
        audio,
        content_type: 'movie',
        type: 'Movie'
      });

      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
      const liveUrl = `${baseUrl}/#/anime/${result.anime.slug}`;

      await this.sendMessage(chatId, `
🎬 <b>Movie Published Successfully to Main Website!</b>

🎥 <b>Movie:</b> ${result.anime.title}
🔊 <b>Audio:</b> ${audio === 'hi' ? '🇮🇳 Hindi Dub' : (audio === 'en' ? '🇬🇧 English Dub' : '🇯🇵 Japanese')}
🏷️ <b>Badge:</b> 🎬 MOVIE

🌐 <b>Live Movie Page:</b>
<a href="${liveUrl}">${liveUrl}</a>

<i>Ye movie direct aapki website ke Movies tab aur Homepage par live ho gayi hai!</i>
      `);
    } catch (err) {
      await this.sendMessage(chatId, `❌ Failed to publish movie: ${err.message}`);
    }
  }

  /**
   * Internal helper to publish anime/episode directly to db
   */
  async publishToApex(data) {
    const isMovie = data.content_type === 'movie' || data.type === 'Movie';
    const title = data.title.trim();
    const epNum = isMovie ? 1 : (parseInt(data.episode_number, 10) || 1);
    const audio = data.audio || 'ja';
    const audioLabel = audio === 'hi' ? 'Hindi Dub' : (audio === 'en' ? 'English Dub' : 'Japanese (Original)');

    // Call AI enrichment in background to get official banner, poster, synopsis & episode title
    const aiData = await aiEnricherService.enrich({ title, episodeNumber: epNum, isMovie }).catch(() => null);

    // Find or create anime
    let anime = db.data.anime.find(a => a.title.toLowerCase() === title.toLowerCase());
    if (!anime) {
      anime = db.createAnime({
        title: (aiData && aiData.title) || title,
        japanese_title: (aiData && aiData.japanese_title) || '',
        synopsis: (aiData && aiData.synopsis) || (isMovie ? `Watch ${title} full movie online in HD on APEX.` : `Watch ${title} online in HD on APEX.`),
        poster_url: (aiData && aiData.poster_url) || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600',
        banner_url: (aiData && aiData.banner_url) || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1920',
        rating: (aiData && aiData.rating) || 8.8,
        status: isMovie ? 'Completed' : (aiData?.status || 'Airing'),
        type: isMovie ? 'Movie' : 'TV',
        season: (aiData && aiData.season) || 'Fall',
        year: (aiData && aiData.year) || new Date().getFullYear(),
        studio: (aiData && aiData.studio) || 'Unknown',
        genres: (aiData && aiData.genres) || ['Action', 'Fantasy'],
        featured: false
      });
    }

    // Resolve URL
    let finalUrl = data.stream_url.trim();
    let sourceType = 'mp4';
    let embedUrl = null;
    let serverLabel = isMovie ? 'Movie Fast Server' : 'Telegram Fast Server';

    const tgInfo = await telegramResolver.resolveTelegram(finalUrl);
    if (tgInfo.isTelegram) {
      serverLabel = isMovie ? 'Telegram Movie Server' : (audio === 'hi' ? 'Telegram (Hindi Audio)' : 'Telegram Fast Server');
      if (tgInfo.directVideoUrl) {
        finalUrl = tgInfo.directVideoUrl;
        sourceType = 'mp4';
      } else {
        finalUrl = tgInfo.embedUrl;
        sourceType = 'telegram';
      }
      embedUrl = tgInfo.embedUrl;
    } else if (finalUrl.includes('.m3u8')) {
      sourceType = 'hls';
    }

    const newSource = {
      server: serverLabel,
      type: sourceType,
      url: finalUrl,
      embedUrl: embedUrl || (sourceType === 'telegram' ? finalUrl : null),
      quality: '1080p',
      audio,
      audioLabel
    };

    let existingEpisodes = db.getEpisodesByAnimeId(anime.id);
    let episode = existingEpisodes.find(e => e.episode_number === epNum);

    if (episode) {
      const sources = [newSource, ...(episode.sources || []).filter(s => s.server !== newSource.server)];
      episode = db.updateEpisode(episode.id, {
        title: data.episode_title || `Episode ${epNum}`,
        video_url: finalUrl,
        sources,
        published: true
      });
    } else {
      episode = db.createEpisode({
        anime_id: anime.id,
        episode_number: epNum,
        title: data.episode_title || (aiData && aiData.episode_title) || (isMovie ? `${title} (Full Movie)` : `Episode ${epNum}`),
        thumbnail_url: (aiData && aiData.episode_thumbnail) || anime.banner_url || anime.poster_url,
        video_url: finalUrl,
        sources: [newSource],
        published: true
      });
    }

    if (audio === 'hi') {
      db.updateAnime(anime.id, { has_hindi_dub: true });
    }

    return { anime: db.getAnimeById(anime.id), episode };
  }

  /**
   * Handle /folders command
   */
  async handleFoldersCommand(chatId) {
    const list = db.data.anime;
    if (!list || list.length === 0) {
      return this.sendMessage(chatId, `📁 <b>No Anime Folders Yet</b>\nAapka catalog abhi empty hai. <code>/publish Naruto 1 &lt;link&gt;</code> se pehla folder banayein!`);
    }

    const lines = list.map((a, i) => {
      const epCount = db.getEpisodesByAnimeId(a.id).length;
      const typeBadge = a.type === 'Movie' ? '🎬 [Movie]' : `📁 (${epCount} Episodes)`;
      return `${i + 1}. <b>${a.title}</b> — ${typeBadge}`;
    });

    const text = `
📁 <b>APEX Anime Folders (${list.length} Total):</b>

${lines.join('\n')}

───────────────
<i>Kisi bhi folder me episode add karne ke liye:</i>
<code>/publish &lt;Folder Name&gt; &lt;Ep Number&gt;</code>
    `;
    await this.sendMessage(chatId, text);
  }

  /**
   * Handle /status command
   */
  async handleStatusCommand(chatId) {
    const animeCount = db.data.anime.length;
    const epCount = db.data.episodes.length;
    const uptimeMinutes = Math.floor(process.uptime() / 60);

    const text = `
🤖 <b>APEX Bot & Server Status</b>

• <b>Bot Username:</b> @${this.botInfo?.username || 'Unknown'}
• <b>Bot Status:</b> 🟢 Active & Polling
• <b>Server Uptime:</b> ${uptimeMinutes} minutes
• <b>Total Anime Folders:</b> ${animeCount}
• <b>Total Episodes Live:</b> ${epCount}
• <b>Platform Version:</b> APEX v1.0.0
    `;
    await this.sendMessage(chatId, text);
  }
}

// Singleton instance
const telegramBotService = new TelegramBotService();

module.exports = telegramBotService;
