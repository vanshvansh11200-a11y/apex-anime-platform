const fs = require('fs');
const path = require('path');
const https = require('https');
const db = require('../database/db');
const telegramResolver = require('./telegramResolver');
const aiEnricherService = require('./aiEnricherService');
const aiClassifierService = require('./aiClassifierService');
const telegramMediaDownloader = require('./telegramMediaDownloader');

class TelegramBotService {
  constructor() {
    this.token = null;
    this.botInfo = null;
    this.isRunning = false;
    this.pollingTimeout = null;
    this.lastUpdateId = 0;
    this.userLastMedia = new Map(); // Store last sent media per chatId
    this.activeDownloads = new Set();
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
   * Send text message with Markdown/HTML formatting
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
   * Edit existing message text
   */
  async editMessageText(chatId, messageId, text, extra = {}) {
    try {
      return await this.apiRequest('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'HTML',
        ...extra
      });
    } catch (err) {
      // Ignore identical text edit errors
      if (!err.message.includes('message is not modified')) {
        console.warn('[Bot Edit Error]:', err.message);
      }
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

    // Ensure target storage directories exist on device
    aiClassifierService.classify({ filename: 'test' }).then(res => {
      telegramMediaDownloader.ensureDirectory(aiClassifierService.ANIME_BASE_DIR);
      telegramMediaDownloader.ensureDirectory(aiClassifierService.MOVIE_BASE_DIR);
    }).catch(() => {});

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

    // 1. Core Commands
    if (text.startsWith('/start') || text.startsWith('/help')) {
      return this.handleStartCommand(chatId);
    }

    if (text.startsWith('/status')) {
      return this.handleStatusCommand(chatId);
    }

    if (text.startsWith('/folders')) {
      return this.handleFoldersCommand(chatId);
    }

    if (text.startsWith('/files') || text.startsWith('/downloads')) {
      return this.handleFilesCommand(chatId);
    }

    if (text.startsWith('/publish')) {
      return this.handlePublishCommand(chatId, text, msg);
    }

    if (text.startsWith('/movie')) {
      return this.handleMovieCommand(chatId, text, msg);
    }

    if (text.startsWith('/download') || text.startsWith('/save')) {
      return this.handleDownloadUrlCommand(chatId, text, msg);
    }

    // 2. Video or Document uploaded/forwarded -> AI Auto-Detect, Rename & Save to Phone
    if (msg.video || (msg.document && this.isVideoDocument(msg.document))) {
      return this.handleMediaUpload(chatId, msg);
    }

    // 3. Plain text containing a Telegram or video URL
    const urlMatch = text.match(/(https?:\/\/[^\s]+)/i);
    if (urlMatch) {
      return this.handleUrlMessage(chatId, urlMatch[1]);
    }

    // Default reply for random text
    await this.sendMessage(chatId, `
👋 <b>APEX AI Media & Anime Bot</b>

Mujhe koi bhi <b>Video send ya forward karein</b>!
Mera AI apne aap check karega ki:
• Ye <b>Anime Series</b> hai ya <b>Movie</b>
• Clean Title & Episode Number nikalega (e.g. <code>Naruto Ep 1.mp4</code>)
• <b>Anime</b> ko direct: <code>/storage/emulated/0/ALL ANIMA VIDIOS/</code> me save karega!
• <b>Movies</b> ko direct: <code>/storage/emulated/0/ALL MOVIES FOLDERS/</code> me save karega!

📌 <b>Commands:</b>
• <code>/files</code> - Apne phone ke Anime aur Movie folders ke sare files dekhein
• <code>/status</code> - Phone storage & bot status
• <code>/publish &lt;Anime&gt; &lt;Ep&gt;</code> - APEX Website pe live karein
• <code>/movie &lt;Title&gt;</code> - Standalone movie website pe add karein
    `);
  }

  /**
   * Helper to check if a document is a video
   */
  isVideoDocument(doc) {
    if (!doc) return false;
    if (doc.mime_type && doc.mime_type.startsWith('video/')) return true;
    if (doc.file_name && /\.(mp4|mkv|webm|avi|mov|flv|wmv|m4v|ts)$/i.test(doc.file_name)) return true;
    return false;
  }

  /**
   * Handle /start and /help
   */
  async handleStartCommand(chatId) {
    const welcome = `
⚡ <b>APEX AI Anime & Movie Organizer Bot</b> 🎬

Mujhe koi bhi Anime ya Movie ki video forward karein. Mera AI apne aap:
1️⃣ <b>Detect karega</b> ki ye Anime hai ya Movie
2️⃣ <b>Auto-Rename</b> karega: (e.g. <code>Naruto Ep 1.mp4</code> ya <code>Jawan (2023).mp4</code>)
3️⃣ <b>Direct Phone Folders me save karega:</b>
   • 🎌 Anime Videos ➔ <code>/storage/emulated/0/ALL ANIMA VIDIOS/</code>
   • 🎬 Movies ➔ <code>/storage/emulated/0/ALL MOVIES FOLDERS/</code>

✨ <b>Features:</b>
• <b>Zero manual work:</b> Bas video forward karein, AI baki sab sambhal lega!
• <b>Caption optional:</b> Caption me <code>Naruto ep 1</code> likh sakte hain ya blank bhi chhod sakte hain (file name se AI khud samjh jayega).
• <b>Commands:</b>
   • <code>/files</code> - Phone ke downloaded videos ki list
   • <code>/status</code> - Server & Storage status
   • <code>/publish &lt;Anime&gt; &lt;Ep&gt; [Link]</code> - Website pe direct publish
    `;
    await this.sendMessage(chatId, welcome);
  }

  /**
   * Main Handler: AI Media Upload & Auto-Save to Phone Storage
   */
  async handleMediaUpload(chatId, msg) {
    const media = msg.video || msg.document;
    if (!media) return;

    const fileId = media.file_id;
    const rawFileName = media.file_name || (msg.video ? 'video.mp4' : 'file.mp4');
    const caption = msg.caption || '';
    const fileSize = media.file_size || 0;

    // Send Initial AI Analyzing Status
    const statusMsg = await this.sendMessage(chatId, `
🤖 <b>APEX AI Media Inspector</b>
🔍 <i>Analyzing video, title and episode details...</i>
    `);
    const statusMsgId = statusMsg?.message_id;

    try {
      // Step 1: AI Classification & Smart Renaming
      const analysis = await aiClassifierService.classify({
        filename: rawFileName,
        caption,
        fileSize
      });

      const readableSize = telegramMediaDownloader.formatBytes(fileSize);

      // Inform user about AI detection result
      const aiSummary = `
🤖 <b>APEX AI Auto-Detection Result:</b>

📂 <b>Classification:</b> ${analysis.categoryLabel}
🏷️ <b>Detected Title:</b> <b>${analysis.title}</b>
${analysis.isAnime ? `📺 <b>Episode Number:</b> <b>Ep ${analysis.episodeNumber}</b>\n` : ''}${analysis.year ? `📅 <b>Year:</b> ${analysis.year}\n` : ''}🔊 <b>Audio:</b> ${analysis.audio.label}
📝 <b>New Name:</b> <code>${analysis.targetFileName}</code>
📁 <b>Target Folder:</b> <code>${analysis.targetDir}/</code>
📦 <b>File Size:</b> ${readableSize}

⏳ <i>Saving video directly to your phone storage...</i>
      `;

      if (statusMsgId) {
        await this.editMessageText(chatId, statusMsgId, aiSummary);
      } else {
        await this.sendMessage(chatId, aiSummary);
      }

      // Step 2: Ensure destination directory exists
      const dirCheck = telegramMediaDownloader.ensureDirectory(analysis.targetDir);
      if (!dirCheck.success) {
        return this.sendMessage(chatId, `
⚠️ <b>Storage Access Alert:</b>
Folder create nahi ho saka: <code>${analysis.targetDir}</code>

💡 <b>Fix:</b> Apne Termux me ye command run karein aur 'Allow' karein:
<code>termux-setup-storage</code>
        `);
      }

      const finalPath = analysis.targetPath;

      // Step 3: Check Download Method (Bot API vs GramJS MTProto)
      const LIMIT_20MB = 20 * 1024 * 1024;

      if (fileSize <= LIMIT_20MB) {
        // Standard Bot API Download
        const fileInfo = await this.apiRequest('getFile', { file_id: fileId });
        const filePath = fileInfo.file_path;
        const token = this.token || this.getToken();
        const cdnUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

        // Progress throttled updates
        const onProgress = async (prog) => {
          if (statusMsgId && prog.percent % 25 === 0) {
            await this.editMessageText(chatId, statusMsgId, `
⏳ <b>Downloading & Renaming:</b>
📝 <code>${analysis.targetFileName}</code>
📊 <b>Progress:</b> ${prog.percent}% (${prog.downloadedStr} / ${prog.totalStr})
📁 <b>Saving to:</b> <code>${analysis.targetDir}/</code>
            `);
          }
        };

        await telegramMediaDownloader.downloadHttpStream(cdnUrl, finalPath, onProgress);

      } else {
        // File > 20MB
        if (telegramMediaDownloader.hasGramJs()) {
          // Download via GramJS MTProto
          const token = this.token || this.getToken();
          await telegramMediaDownloader.downloadViaGramJs(token, media, finalPath, async (prog) => {
            if (statusMsgId && prog.percent % 25 === 0) {
              await this.editMessageText(chatId, statusMsgId, `
⏳ <b>Downloading Large Video (2GB Stream):</b>
📝 <code>${analysis.targetFileName}</code>
📊 <b>Progress:</b> ${prog.percent}% (${prog.downloadedStr} / ${prog.totalStr})
📁 <b>Saving to:</b> <code>${analysis.targetDir}/</code>
              `);
            }
          });
        } else {
          // GramJS not yet installed: inform user clearly
          return this.sendMessage(chatId, `
⚠️ <b>File Size: ${readableSize}</b>

Ye video 20MB se badi hai. Telegram Bot API 20MB se badi file direct download nahi hone deta bina MTProto client ke.

🚀 <b>2GB Badi Videos Direct Phone me Save Karne Ke Liye:</b>
Termux me bas ye 1 command chalayein:
<code>npm install telegram</code>

<i>Iske baad 2GB tak ki koi bhi Episode ya Movie direct <code>${analysis.targetDir}</code> me save ho jayegi!</i>
          `);
        }
      }

      // Step 4: Download Complete Confirmation
      const successText = `
🎉 <b>Video Successfully Saved to Phone!</b>

📁 <b>File Location:</b>
<code>${finalPath}</code>

📝 <b>Saved Name:</b> <code>${analysis.targetFileName}</code>
📦 <b>File Size:</b> ${readableSize}
🍿 <b>Status:</b> Aapke phone gallery / MX Player / VLC me ready hai!

💡 <i>Folder check karne ke liye:</i> <code>/files</code>
      `;

      if (statusMsgId) {
        await this.editMessageText(chatId, statusMsgId, successText);
      } else {
        await this.sendMessage(chatId, successText);
      }

      // Step 5: Automatically sync with APEX Website database
      await this.syncToApexDatabase(analysis, finalPath).catch(err => {
        console.warn('[TelegramBot] Auto-sync to APEX db skipped:', err.message);
      });

    } catch (err) {
      console.error('[TelegramBot Media Error]:', err);
      const errMsg = `❌ <b>Download Error:</b> ${err.message}`;
      if (statusMsgId) {
        await this.editMessageText(chatId, statusMsgId, errMsg);
      } else {
        await this.sendMessage(chatId, errMsg);
      }
    }
  }

  /**
   * Auto-sync local saved video to APEX website database
   */
  async syncToApexDatabase(analysis, filePath) {
    const isMovie = analysis.isMovie;
    const title = analysis.title;
    const epNum = analysis.episodeNumber || 1;

    let anime = db.data.anime.find(a => a.title.toLowerCase() === title.toLowerCase());
    if (!anime) {
      anime = db.createAnime({
        title,
        japanese_title: '',
        synopsis: isMovie ? `Watch ${title} full movie on APEX.` : `Watch ${title} on APEX.`,
        poster_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600',
        banner_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1920',
        rating: 8.8,
        status: isMovie ? 'Completed' : 'Airing',
        type: isMovie ? 'Movie' : 'TV',
        season: 'Fall',
        year: analysis.year || new Date().getFullYear(),
        studio: 'APEX Local Library',
        genres: isMovie ? ['Movie', 'Cinema'] : ['Action', 'Anime'],
        featured: false
      });
    }

    const localSource = {
      server: 'Device Local Storage',
      type: 'mp4',
      url: filePath,
      quality: '1080p',
      audio: analysis.audio.code,
      audioLabel: analysis.audio.label
    };

    let existingEpisodes = db.getEpisodesByAnimeId(anime.id);
    let episode = existingEpisodes.find(e => e.episode_number === epNum);

    if (episode) {
      const sources = [localSource, ...(episode.sources || []).filter(s => s.server !== localSource.server)];
      db.updateEpisode(episode.id, { sources });
    } else {
      db.createEpisode({
        anime_id: anime.id,
        episode_number: epNum,
        title: isMovie ? `${title} (Full Movie)` : `Episode ${epNum}`,
        thumbnail_url: anime.banner_url || anime.poster_url,
        video_url: filePath,
        sources: [localSource],
        published: true
      });
    }
  }

  /**
   * Handle /files command to list saved Anime and Movies on device
   */
  async handleFilesCommand(chatId) {
    const animeDir = aiClassifierService.ANIME_BASE_DIR;
    const movieDir = aiClassifierService.MOVIE_BASE_DIR;

    let animeFiles = [];
    let movieFiles = [];

    try {
      if (fs.existsSync(animeDir)) {
        animeFiles = fs.readdirSync(animeDir).filter(f => !f.startsWith('.'));
      }
      if (fs.existsSync(movieDir)) {
        movieFiles = fs.readdirSync(movieDir).filter(f => !f.startsWith('.'));
      }
    } catch (e) {
      return this.sendMessage(chatId, `⚠️ Directory read error: ${e.message}`);
    }

    const animeListStr = animeFiles.length > 0
      ? animeFiles.slice(0, 15).map((f, i) => `${i + 1}. <code>${f}</code>`).join('\n')
      : '<i>Abhi koi anime video save nahi hai.</i>';

    const movieListStr = movieFiles.length > 0
      ? movieFiles.slice(0, 10).map((f, i) => `${i + 1}. <code>${f}</code>`).join('\n')
      : '<i>Abhi koi movie save nahi hai.</i>';

    const text = `
📂 <b>Phone Storage Video Files:</b>

🎌 <b>Anime Videos (${animeFiles.length} Total):</b>
📁 <code>${animeDir}/</code>
${animeListStr}
${animeFiles.length > 15 ? `<i>...aur ${animeFiles.length - 15} aur files</i>` : ''}

───────────────
🎬 <b>Movies (${movieFiles.length} Total):</b>
📁 <code>${movieDir}/</code>
${movieListStr}
${movieFiles.length > 10 ? `<i>...aur ${movieFiles.length - 10} aur files</i>` : ''}
    `;

    await this.sendMessage(chatId, text);
  }

  /**
   * Handle /download or /save <URL> [Title] [Ep]
   */
  async handleDownloadUrlCommand(chatId, text, msg) {
    const parts = text.split(/\s+/).slice(1);
    let targetUrl = null;
    let customTitle = '';
    let customEp = null;

    // Check if replying to a message with URL
    if (msg.reply_to_message) {
      const match = (msg.reply_to_message.text || msg.reply_to_message.caption || '').match(/(https?:\/\/[^\s]+)/i);
      if (match) targetUrl = match[1];
    }

    for (const part of parts) {
      if (part.startsWith('http://') || part.startsWith('https://')) {
        targetUrl = part;
      } else if (/^\d+$/.test(part)) {
        customEp = parseInt(part, 10);
      } else {
        customTitle += (customTitle ? ' ' : '') + part;
      }
    }

    if (!targetUrl) {
      return this.sendMessage(chatId, `
❌ <b>Usage:</b> <code>/download &lt;Video URL&gt; [Title] [Ep]</code>
<i>Example:</i> <code>/download https://example.com/video.mp4 Naruto 1</code>
<i>Or reply to a message containing a link with:</i> <code>/download Naruto 1</code>
      `);
    }

    await this.sendMessage(chatId, `⏳ <i>Resolving stream link and downloading to phone...</i>`);

    try {
      const tgInfo = await telegramResolver.resolveTelegram(targetUrl);
      const downloadUrl = tgInfo.directVideoUrl || targetUrl;

      const analysis = await aiClassifierService.classify({
        filename: customTitle || path.basename(new URL(downloadUrl).pathname) || 'video.mp4',
        caption: customEp ? `Ep ${customEp}` : '',
        fileSize: 0
      });

      if (customTitle) {
        analysis.title = customTitle;
        if (analysis.isAnime) {
          analysis.targetFileName = `${customTitle} Ep ${customEp || 1}.mp4`;
        } else {
          analysis.targetFileName = `${customTitle}.mp4`;
        }
        analysis.targetPath = `${analysis.targetDir}/${analysis.targetFileName}`;
      }

      await telegramMediaDownloader.downloadHttpStream(downloadUrl, analysis.targetPath);

      await this.sendMessage(chatId, `
🎉 <b>URL Downloaded Successfully to Phone!</b>
📁 <b>Path:</b> <code>${analysis.targetPath}</code>
      `);
    } catch (err) {
      await this.sendMessage(chatId, `❌ Download failed: ${err.message}`);
    }
  }

  /**
   * Handle URL message
   */
  async handleUrlMessage(chatId, rawUrl) {
    try {
      const resolved = await telegramResolver.resolveTelegram(rawUrl);

      if (resolved.directVideoUrl && !/\.(jpg|jpeg|png|webp|gif)$/i.test(resolved.directVideoUrl)) {
        this.userLastMedia.set(chatId, {
          url: resolved.directVideoUrl,
          type: 'mp4',
          originalUrl: rawUrl
        });
        return await this.sendMessage(chatId, resolved.directVideoUrl);
      }

      await this.sendMessage(chatId, `⚠️ Is Telegram channel post me direct web video stream nahi hai.
💡 Phone se direct video bot me forward karein ya send karein, AI use turant rename karke aapke phone folder me save kar dega!`);
    } catch (err) {
      await this.sendMessage(chatId, `❌ Error: ${err.message}`);
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
      `);
    }

    let streamUrl = null;
    let audio = 'ja';
    let epNum = 1;
    const remainingParts = [];

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
      } else if (['hi', 'hindi', 'en', 'dub', 'ja', 'sub'].includes(part.toLowerCase())) {
        audio = (part.toLowerCase() === 'hi' || part.toLowerCase() === 'hindi') ? 'hi' : (part.toLowerCase() === 'en' || part.toLowerCase() === 'dub' ? 'en' : 'ja');
      } else if (/^\d+$/.test(part)) {
        epNum = parseInt(part, 10);
      } else {
        remainingParts.push(part);
      }
    }

    const animeTitle = remainingParts.join(' ').trim();
    if (!animeTitle) {
      return this.sendMessage(chatId, `❌ Please specify the Anime title! Example: <code>/publish Naruto 1</code>`);
    }

    if (!streamUrl) {
      return this.sendMessage(chatId, `❌ No stream URL found! Please send a Telegram video link first or include it in command.`);
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

🌐 <b>Live Website Link:</b>
<a href="${liveUrl}">${liveUrl}</a>
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
🌐 <b>Live Movie Page:</b> <a href="${liveUrl}">${liveUrl}</a>
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

    const aiData = await aiEnricherService.enrich({ title, episodeNumber: epNum, isMovie }).catch(() => null);

    let anime = db.data.anime.find(a => a.title.toLowerCase() === title.toLowerCase());
    if (!anime) {
      anime = db.createAnime({
        title: (aiData && aiData.title) || title,
        japanese_title: (aiData && aiData.japanese_title) || '',
        synopsis: (aiData && aiData.synopsis) || (isMovie ? `Watch ${title} full movie online on APEX.` : `Watch ${title} online on APEX.`),
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
      return this.sendMessage(chatId, `📁 <b>No Anime Folders Yet</b>\nAapka catalog abhi empty hai.`);
    }

    const lines = list.map((a, i) => {
      const epCount = db.getEpisodesByAnimeId(a.id).length;
      const typeBadge = a.type === 'Movie' ? '🎬 [Movie]' : `📁 (${epCount} Episodes)`;
      return `${i + 1}. <b>${a.title}</b> — ${typeBadge}`;
    });

    const text = `
📁 <b>APEX Anime Folders (${list.length} Total):</b>

${lines.join('\n')}
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

    const animeDir = aiClassifierService.ANIME_BASE_DIR;
    const movieDir = aiClassifierService.MOVIE_BASE_DIR;
    const animeExists = fs.existsSync(animeDir);
    const movieExists = fs.existsSync(movieDir);

    const text = `
🤖 <b>APEX Bot & Storage Status</b>

• <b>Bot Username:</b> @${this.botInfo?.username || 'Unknown'}
• <b>Bot Status:</b> 🟢 Active & Polling
• <b>Server Uptime:</b> ${uptimeMinutes} minutes
• <b>Total Anime Folders:</b> ${animeCount}
• <b>Total Episodes Live:</b> ${epCount}

📂 <b>Phone Target Folders:</b>
• 🎌 <b>Anime:</b> <code>${animeDir}</code> (${animeExists ? '🟢 Ready' : '🟡 Creating'})
• 🎬 <b>Movies:</b> <code>${movieDir}</code> (${movieExists ? '🟢 Ready' : '🟡 Creating'})
    `;
    await this.sendMessage(chatId, text);
  }
}

const telegramBotService = new TelegramBotService();

module.exports = telegramBotService;
