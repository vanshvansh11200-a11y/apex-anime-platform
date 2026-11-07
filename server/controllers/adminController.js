const fs = require('fs');
const path = require('path');
const db = require('../database/db');
const telegramResolver = require('../services/telegramResolver');
const telegramBotService = require('../services/telegramBotService');
const aiEnricherService = require('../services/aiEnricherService');

function getStats(req, res, next) {
  try {
    const stats = db.getSystemStats();
    res.json({
      success: true,
      stats
    });
  } catch (err) {
    next(err);
  }
}

function createAnime(req, res, next) {
  try {
    const { title, japanese_title, synopsis, poster_url, banner_url, rating, status, type, season, year, studio, genres, featured } = req.body;
    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required' });
    }

    const anime = db.createAnime({
      title,
      japanese_title,
      synopsis,
      poster_url,
      banner_url,
      rating,
      status,
      type,
      season,
      year,
      studio,
      genres,
      featured
    });

    res.status(201).json({
      success: true,
      message: 'Anime created successfully',
      anime
    });
  } catch (err) {
    next(err);
  }
}

function updateAnime(req, res, next) {
  try {
    const { id } = req.params;
    const updated = db.updateAnime(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Anime not found' });
    }
    res.json({
      success: true,
      message: 'Anime updated successfully',
      anime: updated
    });
  } catch (err) {
    next(err);
  }
}

function deleteAnime(req, res, next) {
  try {
    const { id } = req.params;
    const deleted = db.deleteAnime(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Anime not found' });
    }
    res.json({
      success: true,
      message: 'Anime and all related episodes deleted successfully'
    });
  } catch (err) {
    next(err);
  }
}

function createEpisode(req, res, next) {
  try {
    const { anime_id, episode_number, title, duration, video_url, sources, thumbnail_url, intro_start, intro_end, outro_start, outro_end } = req.body;
    if (!anime_id || episode_number === undefined) {
      return res.status(400).json({ success: false, error: 'anime_id and episode_number are required' });
    }

    const episode = db.createEpisode({
      anime_id,
      episode_number,
      title,
      duration,
      video_url,
      sources,
      thumbnail_url,
      intro_start,
      intro_end,
      outro_start,
      outro_end
    });

    res.status(201).json({
      success: true,
      message: 'Episode created successfully',
      episode
    });
  } catch (err) {
    next(err);
  }
}

function updateEpisode(req, res, next) {
  try {
    const { id } = req.params;
    const updated = db.updateEpisode(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Episode not found' });
    }
    res.json({
      success: true,
      message: 'Episode updated successfully',
      episode: updated
    });
  } catch (err) {
    next(err);
  }
}

function deleteEpisode(req, res, next) {
  try {
    const { id } = req.params;
    const deleted = db.deleteEpisode(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Episode not found' });
    }
    res.json({
      success: true,
      message: 'Episode deleted successfully'
    });
  } catch (err) {
    next(err);
  }
}

function getAnimeEpisodes(req, res, next) {
  try {
    const { animeId } = req.params;
    const anime = db.getAnimeById(animeId);
    if (!anime) {
      return res.status(404).json({ success: false, error: 'Anime not found' });
    }
    const episodes = db.getEpisodesByAnimeId(anime.id);
    res.json({
      success: true,
      anime,
      episodes
    });
  } catch (err) {
    next(err);
  }
}

// 1-Click Quick Publish for Telegram & 3rd Party Links (Series & Movies)
async function quickPublish(req, res, next) {
  try {
    const { title, content_type = 'series', type, episode_number, episode_title, stream_url, audio = 'ja', quality = '1080p', server_name, poster_url, banner_url, genres } = req.body;
    if (!title || !stream_url) {
      return res.status(400).json({ success: false, error: 'Anime title and stream_url are required' });
    }

    const isMovie = content_type === 'movie' || type === 'Movie';
    const animeType = isMovie ? 'Movie' : 'TV';
    const epNum = isMovie ? 1 : (parseFloat(episode_number) || 1);

    // Call AI enrichment to auto-fill accurate poster, banner, synopsis & episode title
    let aiData = null;
    try {
      aiData = await aiEnricherService.enrich({
        title: title.trim(),
        episodeNumber: epNum,
        isMovie
      });
    } catch (_) {}

    const epTitle = episode_title || (aiData && aiData.episode_title) || (isMovie ? `${title.trim()} (Full Movie)` : `Episode ${epNum}`);

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    let anime = db.getAnimeBySlug(slug) || db.data.anime.find(a => a.title.toLowerCase() === title.toLowerCase().trim());

    if (!anime) {
      const finalPoster = poster_url || (aiData && aiData.poster_url) || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600';
      const finalBanner = banner_url || (aiData && aiData.banner_url) || finalPoster;
      const finalSynopsis = (aiData && aiData.synopsis) || (isMovie
        ? `Watch ${title.trim()} full movie online in HD with English and Hindi dubs on APEX.`
        : `Watch ${title.trim()} online in HD with English and Hindi dubs on APEX.`);
      const finalGenres = Array.isArray(genres) ? genres : (genres ? genres.split(',').map(s => s.trim()) : (aiData && aiData.genres ? aiData.genres : ['Action', 'Fantasy']));
      const finalYear = (aiData && aiData.year) || new Date().getFullYear();
      const finalStudio = (aiData && aiData.studio) || 'Unknown';
      const finalRating = (aiData && aiData.rating) || 8.8;

      anime = db.createAnime({
        title: (aiData && aiData.title) || title.trim(),
        japanese_title: (aiData && aiData.japanese_title) || '',
        synopsis: finalSynopsis,
        poster_url: finalPoster,
        banner_url: finalBanner,
        rating: finalRating,
        status: isMovie ? 'Completed' : (aiData?.status || 'Airing'),
        type: animeType,
        year: finalYear,
        studio: finalStudio,
        genres: finalGenres,
        has_sub: true,
        has_dub: true,
        has_hindi_dub: audio === 'hi',
        published: true
      });
    } else if (isMovie && anime.type !== 'Movie') {
      anime = db.updateAnime(anime.id, { type: 'Movie' });
    }

    const audioLabel = audio === 'hi' ? 'Hindi Dub' : (audio === 'en' ? 'English Dub' : 'Japanese (Original)');

    // Resolve URL (Telegram or 3rd Party Embed or Direct Stream)
    let finalUrl = stream_url.trim();
    let sourceType = 'mp4';
    let embedUrl = null;
    let serverLabel = server_name;
    let warning = null;

    const tgInfo = await telegramResolver.resolveTelegram(finalUrl);
    if (tgInfo.isTelegram) {
      serverLabel = server_name || (isMovie ? 'Telegram Movie Server' : (audio === 'hi' ? 'Telegram (Hindi Audio)' : 'Telegram HD Server'));
      if (tgInfo.directVideoUrl) {
        finalUrl = tgInfo.directVideoUrl;
        sourceType = 'mp4';
      } else {
        finalUrl = tgInfo.embedUrl;
        sourceType = 'telegram';
      }
      embedUrl = tgInfo.embedUrl;
      if (tgInfo.warning) {
        warning = tgInfo.warning;
      }
    } else if (finalUrl.includes('.m3u8') || finalUrl.includes('/hls/')) {
      sourceType = 'hls';
      serverLabel = server_name || (isMovie ? 'HLS Movie Stream' : (audio === 'hi' ? 'HLS Hindi Stream' : 'Fast HLS Server'));
    } else if (finalUrl.includes('embed') || finalUrl.includes('iframe') || finalUrl.includes('player.')) {
      sourceType = 'iframe';
      embedUrl = finalUrl;
      serverLabel = server_name || (isMovie ? 'Movie Embed Player' : 'Embed Player');
    } else {
      sourceType = 'mp4';
      serverLabel = server_name || (isMovie ? 'Movie Fast Server' : (audio === 'hi' ? 'Hindi Audio Server' : 'Fast Server'));
    }

    const newSource = {
      server: serverLabel,
      type: sourceType,
      url: finalUrl,
      embedUrl: embedUrl || (sourceType === 'iframe' || sourceType === 'telegram' ? finalUrl : null),
      quality: quality || '1080p',
      audio: audio || 'ja',
      audioLabel
    };

    let existingEpisodes = db.getEpisodesByAnimeId(anime.id);
    let episode = existingEpisodes.find(e => e.episode_number === epNum);

    if (episode) {
      const sources = [newSource, ...(episode.sources || []).filter(s => s.server !== newSource.server)];
      episode = db.updateEpisode(episode.id, {
        title: epTitle,
        video_url: finalUrl,
        sources,
        published: true
      });
    } else {
      episode = db.createEpisode({
        anime_id: anime.id,
        episode_number: epNum,
        title: epTitle,
        thumbnail_url: (aiData && aiData.episode_thumbnail) || anime.banner_url || anime.poster_url,
        video_url: finalUrl,
        sources: [newSource],
        published: true
      });
    }

    if (audio === 'hi') {
      db.updateAnime(anime.id, { has_hindi_dub: true });
    }

    res.status(201).json({
      success: true,
      message: isMovie
        ? `"${anime.title}" (Movie) is now LIVE on the main website!`
        : `"${anime.title}" Episode ${epNum} is now LIVE on the main website!`,
      warning,
      anime,
      episode
    });
  } catch (err) {
    next(err);
  }
}

function getUsers(req, res, next) {
  try {
    const users = db.getAllUsers();
    res.json({
      success: true,
      users
    });
  } catch (err) {
    next(err);
  }
}

function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { role, status } = req.body;

    const updates = {};
    if (role) {
      if (role === 'admin' && id !== 'usr_admin_apex') {
        return res.status(403).json({ success: false, error: 'Cannot grant admin role. Only the primary owner has admin privileges.' });
      }
      if (['user'].includes(role)) {
        updates.role = 'user';
      }
    }
    if (status && ['active', 'banned'].includes(status)) {
      if (id === req.user.id && status === 'banned') {
        return res.status(400).json({ success: false, error: 'Cannot ban your own admin account.' });
      }
      updates.status = status;
    }

    const updated = db.updateUser(id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const { password_hash: _, ...safeUser } = updated;
    res.json({
      success: true,
      message: 'User updated successfully',
      user: safeUser
    });
  } catch (err) {
    next(err);
  }
}

function deleteUser(req, res, next) {
  try {
    const { id } = req.params;
    if (id === req.user.id) {
      return res.status(400).json({ success: false, error: 'Cannot delete your own admin account' });
    }
    const deleted = db.deleteUser(id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (err) {
    next(err);
  }
}

// Telegram Bot Management
function getBotStatus(req, res, next) {
  try {
    const token = telegramBotService.getToken();
    const maskedToken = token && token.includes(':')
      ? `${token.slice(0, 6)}...${token.slice(-4)}`
      : '';

    res.json({
      success: true,
      isRunning: telegramBotService.isRunning,
      botInfo: telegramBotService.botInfo,
      hasToken: Boolean(token),
      maskedToken
    });
  } catch (err) {
    next(err);
  }
}

async function saveBotConfig(req, res, next) {
  try {
    const { token } = req.body;
    if (!token || !token.includes(':')) {
      return res.status(400).json({ success: false, error: 'Invalid Bot Token format. Token should be like: 123456789:ABCdefGhIjkLmNoPqRsTuVwXyZ' });
    }

    if (!db.data.settings) db.data.settings = {};
    db.data.settings.telegramBotToken = token.trim();
    db.save();

    const started = await telegramBotService.start(token.trim());
    if (!started) {
      return res.status(400).json({ success: false, error: 'Failed to connect to Telegram with this token. Please check the token from @BotFather.' });
    }

    res.json({
      success: true,
      message: `Telegram Bot connected as @${telegramBotService.botInfo?.username}!`,
      botInfo: telegramBotService.botInfo
    });
  } catch (err) {
    next(err);
  }
}

async function stopBot(req, res, next) {
  try {
    await telegramBotService.stop();
    res.json({ success: true, message: 'Bot stopped successfully' });
  } catch (err) {
    next(err);
  }
}

// Direct Video Upload from Phone / Device
function uploadVideo(req, res, next) {
  try {
    const rawFilename = req.headers['x-filename'] || `video_${Date.now()}.mp4`;
    const safeName = decodeURIComponent(rawFilename).replace(/[^a-zA-Z0-9._-]/g, '_');
    const videosDir = path.resolve(__dirname, '../../public/videos');

    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir, { recursive: true });
    }

    const targetPath = path.join(videosDir, safeName);
    const writeStream = fs.createWriteStream(targetPath);

    req.pipe(writeStream);

    writeStream.on('finish', () => {
      res.json({
        success: true,
        message: 'Video uploaded successfully!',
        filename: safeName,
        url: `/videos/${safeName}`
      });
    });

    writeStream.on('error', (err) => {
      res.status(500).json({ success: false, error: 'Upload failed: ' + err.message });
    });
  } catch (err) {
    next(err);
  }
}

// AI Auto-Fill / Metadata Enrichment Endpoint
async function aiEnrich(req, res, next) {
  try {
    const { title, episode_number = 1, is_movie = 'false' } = req.query;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Title parameter is required' });
    }

    const data = await aiEnricherService.enrich({
      title: title.trim(),
      episodeNumber: parseInt(episode_number, 10) || 1,
      isMovie: is_movie === 'true' || is_movie === '1'
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getStats,
  createAnime,
  updateAnime,
  deleteAnime,
  createEpisode,
  updateEpisode,
  deleteEpisode,
  getAnimeEpisodes,
  quickPublish,
  getUsers,
  updateUser,
  deleteUser,
  getBotStatus,
  saveBotConfig,
  stopBot,
  uploadVideo,
  aiEnrich
};
