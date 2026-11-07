const fs = require('fs');
const path = require('path');
const config = require('../config');

class Database {
  constructor(dbPath) {
    this.dbPath = dbPath || config.dbFile;
    this.dataDir = path.dirname(this.dbPath);
    this.data = {
      users: [],
      anime: [],
      episodes: [],
      watchlist: [],
      watch_history: [],
      comments: [],
      ratings: [],
      settings: {
        siteName: 'APEX',
        enableAniListSync: true,
        defaultAudio: 'ja',
        allowPublicRegistrations: true
      },
      stats: {
        total_views: 0,
        bandwidth_served_gb: 42.8
      }
    };
    this.isLoaded = false;
    this._saveTimeout = null;
    this.init();
  }

  init() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      if (fs.existsSync(this.dbPath)) {
        const raw = fs.readFileSync(this.dbPath, 'utf8');
        if (raw && raw.trim().length > 0) {
          const parsed = JSON.parse(raw);
          this.data = {
            users: parsed.users || [],
            anime: parsed.anime || [],
            episodes: parsed.episodes || [],
            watchlist: parsed.watchlist || [],
            watch_history: parsed.watch_history || [],
            comments: parsed.comments || [],
            ratings: parsed.ratings || [],
            settings: parsed.settings || { siteName: 'APEX', enableAniListSync: true, defaultAudio: 'ja', allowPublicRegistrations: true },
            stats: parsed.stats || { total_views: 0, bandwidth_served_gb: 42.8 }
          };
          this.isLoaded = true;
          return;
        }
      }

      this.saveSync();
      this.isLoaded = true;
    } catch (err) {
      console.error('[DB] Error initializing database:', err);
      this.saveSync();
      this.isLoaded = true;
    }
  }

  saveSync() {
    const tempPath = `${this.dbPath}.tmp`;
    const jsonStr = JSON.stringify(this.data, null, 2);
    fs.writeFileSync(tempPath, jsonStr, 'utf8');
    fs.renameSync(tempPath, this.dbPath);
  }

  save() {
    if (this._saveTimeout) {
      clearTimeout(this._saveTimeout);
    }
    this._saveTimeout = setTimeout(() => {
      try {
        this.saveSync();
      } catch (err) {
        console.error('[DB] Error persisting database async:', err);
      }
    }, 50);
  }

  generateId(prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
  }

  // --- Users ---
  findUserByEmail(email) {
    if (!email) return null;
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  findUserById(id) {
    return this.data.users.find(u => u.id === id) || null;
  }

  findUserByUsername(username) {
    if (!username) return null;
    return this.data.users.find(u => u.username.toLowerCase() === username.toLowerCase()) || null;
  }

  createUser(userData) {
    const user = {
      id: this.generateId('usr'),
      username: userData.username,
      email: userData.email.toLowerCase(),
      password_hash: userData.password_hash,
      role: userData.role || 'user',
      avatar: userData.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&h=256&q=80',
      bio: userData.bio || 'Anime enthusiast on APEX',
      status: 'active',
      created_at: new Date().toISOString()
    };
    this.data.users.push(user);
    this.save();
    return user;
  }

  updateUser(id, updates) {
    const index = this.data.users.findIndex(u => u.id === id);
    if (index === -1) return null;
    const allowed = ['username', 'email', 'avatar', 'bio', 'role', 'status', 'password_hash'];
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        this.data.users[index][key] = updates[key];
      }
    }
    this.save();
    return this.data.users[index];
  }

  getAllUsers() {
    return this.data.users.map(({ password_hash, ...safeUser }) => safeUser);
  }

  deleteUser(id) {
    const idx = this.data.users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    this.data.users.splice(idx, 1);
    this.data.watchlist = this.data.watchlist.filter(w => w.user_id !== id);
    this.data.watch_history = this.data.watch_history.filter(h => h.user_id !== id);
    this.data.comments = this.data.comments.filter(c => c.user_id !== id);
    this.save();
    return true;
  }

  // --- Anime ---
  getAllAnime(query = {}) {
    let list = [...this.data.anime];

    // Filter published only for public queries unless explicitly requesting all
    if (!query.includeUnpublished) {
      list = list.filter(a => a.published !== false);
    }

    if (query.genre && query.genre !== 'All') {
      const g = query.genre.toLowerCase();
      list = list.filter(a => a.genres && a.genres.some(genre => genre.toLowerCase() === g));
    }

    if (query.status && query.status !== 'All') {
      const s = query.status.toLowerCase();
      list = list.filter(a => a.status && a.status.toLowerCase() === s);
    }

    if (query.season && query.season !== 'All') {
      const s = query.season.toLowerCase();
      list = list.filter(a => a.season && a.season.toLowerCase() === s);
    }

    if (query.year && query.year !== 'All') {
      list = list.filter(a => a.year === parseInt(query.year, 10));
    }

    if (query.type && query.type !== 'All') {
      list = list.filter(a => a.type && a.type.toLowerCase() === query.type.toLowerCase());
    }

    if (query.search) {
      const q = query.search.toLowerCase().trim();
      list = list.filter(a => 
        (a.title && a.title.toLowerCase().includes(q)) ||
        (a.japanese_title && a.japanese_title.toLowerCase().includes(q)) ||
        (a.synopsis && a.synopsis.toLowerCase().includes(q)) ||
        (a.studio && a.studio.toLowerCase().includes(q)) ||
        (a.genres && a.genres.some(g => g.toLowerCase().includes(q)))
      );
    }

    // Sort options
    const sortBy = query.sort || 'popularity';
    if (sortBy === 'rating') {
      list.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (sortBy === 'latest') {
      list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } else if (sortBy === 'title') {
      list.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'year') {
      list.sort((a, b) => (b.year || 0) - (a.year || 0));
    } else {
      list.sort((a, b) => (b.views_count || 0) - (a.views_count || 0));
    }

    const total = list.length;
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 24));
    const offset = (page - 1) * limit;
    const items = list.slice(offset, offset + limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    };
  }

  getAnimeById(id) {
    return this.data.anime.find(a => a.id === id || a.slug === id) || null;
  }

  getAnimeBySlug(slug) {
    return this.data.anime.find(a => a.slug === slug || a.id === slug) || null;
  }

  createAnime(animeData) {
    const slug = animeData.slug || animeData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const anime = {
      id: this.generateId('anm'),
      slug,
      anilist_id: animeData.anilist_id || null,
      title: animeData.title,
      japanese_title: animeData.japanese_title || '',
      synopsis: animeData.synopsis || '',
      poster_url: animeData.poster_url || '',
      banner_url: animeData.banner_url || '',
      trailer_url: animeData.trailer_url || '',
      rating: parseFloat(animeData.rating) || 8.0,
      status: animeData.status || 'Completed',
      type: animeData.type || 'TV',
      season: animeData.season || 'Fall',
      year: parseInt(animeData.year, 10) || new Date().getFullYear(),
      studio: animeData.studio || 'Unknown',
      genres: Array.isArray(animeData.genres) ? animeData.genres : (animeData.genres ? animeData.genres.split(',').map(s => s.trim()) : []),
      episodes_count: parseInt(animeData.episodes_count, 10) || 0,
      has_sub: animeData.has_sub !== undefined ? Boolean(animeData.has_sub) : true,
      has_dub: animeData.has_dub !== undefined ? Boolean(animeData.has_dub) : true,
      has_hindi_dub: Boolean(animeData.has_hindi_dub),
      views_count: parseInt(animeData.views_count, 10) || 0,
      featured: Boolean(animeData.featured),
      published: animeData.published !== undefined ? Boolean(animeData.published) : true,
      created_at: new Date().toISOString()
    };
    this.data.anime.push(anime);
    this.save();
    return anime;
  }

  updateAnime(id, updates) {
    const idx = this.data.anime.findIndex(a => a.id === id || a.slug === id);
    if (idx === -1) return null;

    if (updates.genres && typeof updates.genres === 'string') {
      updates.genres = updates.genres.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (updates.rating !== undefined) {
      const parsedRating = parseFloat(updates.rating);
      updates.rating = !isNaN(parsedRating) ? parsedRating : (this.data.anime[idx].rating || 8.0);
    }
    if (updates.year !== undefined) {
      const parsedYear = parseInt(updates.year, 10);
      updates.year = !isNaN(parsedYear) ? parsedYear : (this.data.anime[idx].year || new Date().getFullYear());
    }
    if (updates.episodes_count !== undefined) {
      updates.episodes_count = parseInt(updates.episodes_count, 10) || 0;
    }
    if (updates.has_hindi_dub !== undefined) updates.has_hindi_dub = Boolean(updates.has_hindi_dub);
    if (updates.has_sub !== undefined) updates.has_sub = Boolean(updates.has_sub);
    if (updates.has_dub !== undefined) updates.has_dub = Boolean(updates.has_dub);
    if (updates.featured !== undefined) updates.featured = Boolean(updates.featured);
    if (updates.published !== undefined) updates.published = Boolean(updates.published);

    this.data.anime[idx] = { ...this.data.anime[idx], ...updates };
    this.save();
    return this.data.anime[idx];
  }

  deleteAnime(id) {
    const idx = this.data.anime.findIndex(a => a.id === id || a.slug === id);
    if (idx === -1) return false;
    const animeId = this.data.anime[idx].id;
    this.data.anime.splice(idx, 1);
    this.data.episodes = this.data.episodes.filter(e => e.anime_id !== animeId);
    this.data.watchlist = this.data.watchlist.filter(w => w.anime_id !== animeId);
    this.data.watch_history = this.data.watch_history.filter(h => h.anime_id !== animeId);
    this.data.comments = this.data.comments.filter(c => c.anime_id !== animeId);
    this.save();
    return true;
  }

  incrementAnimeViews(id) {
    const anime = this.data.anime.find(a => a.id === id || a.slug === id);
    if (anime) {
      anime.views_count = (anime.views_count || 0) + 1;
      this.data.stats.total_views = (this.data.stats.total_views || 0) + 1;
      this.save();
    }
  }

  // --- Episodes & Audio Tracks ---
  getEpisodesByAnimeId(animeId) {
    const anime = this.getAnimeById(animeId);
    const targetId = anime ? anime.id : animeId;
    return this.data.episodes
      .filter(e => e.anime_id === targetId && e.published !== false)
      .sort((a, b) => a.episode_number - b.episode_number);
  }

  getEpisodeById(id) {
    return this.data.episodes.find(e => e.id === id) || null;
  }

  createEpisode(epData) {
    const anime = this.getAnimeById(epData.anime_id);
    const animeId = anime ? anime.id : epData.anime_id;

    const defaultSources = [
      {
        server: 'Kaizen (HLS Multi-Quality)',
        type: 'hls',
        url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        quality: '1080p Auto',
        audio: 'ja',
        audioLabel: 'Japanese (Original)'
      },
      {
        server: 'Titan (Direct HD)',
        type: 'mp4',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        quality: '1080p',
        audio: 'en',
        audioLabel: 'English Dub'
      },
      {
        server: 'Apex CDN (Hindi Audio)',
        type: 'mp4',
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        quality: '720p',
        audio: 'hi',
        audioLabel: 'Hindi Dub'
      }
    ];

    const defaultSubtitles = [
      { label: 'English', lang: 'en', src: '' },
      { label: 'Español', lang: 'es', src: '' },
      { label: 'Hindi', lang: 'hi', src: '' },
      { label: 'Français', lang: 'fr', src: '' }
    ];

    const episode = {
      id: this.generateId('ep'),
      anime_id: animeId,
      episode_number: parseFloat(epData.episode_number) || 1,
      season_number: parseInt(epData.season_number, 10) || 1,
      title: epData.title || `Episode ${epData.episode_number}`,
      thumbnail_url: epData.thumbnail_url || (anime ? anime.banner_url : ''),
      duration: epData.duration || '24:00',
      duration_seconds: parseInt(epData.duration_seconds, 10) || 1440,
      video_url: epData.video_url || defaultSources[0].url,
      sources: epData.sources && epData.sources.length > 0 ? epData.sources : defaultSources,
      subtitles: epData.subtitles && epData.subtitles.length > 0 ? epData.subtitles : defaultSubtitles,
      intro_start: parseInt(epData.intro_start, 10) || 85,
      intro_end: parseInt(epData.intro_end, 10) || 175,
      outro_start: parseInt(epData.outro_start, 10) || 1350,
      outro_end: parseInt(epData.outro_end, 10) || 1440,
      published: epData.published !== undefined ? Boolean(epData.published) : true,
      created_at: new Date().toISOString()
    };
    this.data.episodes.push(episode);

    if (anime) {
      const epCount = this.data.episodes.filter(e => e.anime_id === animeId).length;
      anime.episodes_count = epCount;
    }

    this.save();
    return episode;
  }

  updateEpisode(id, updates) {
    const idx = this.data.episodes.findIndex(e => e.id === id);
    if (idx === -1) return null;
    this.data.episodes[idx] = { ...this.data.episodes[idx], ...updates };
    this.save();
    return this.data.episodes[idx];
  }

  deleteEpisode(id) {
    const idx = this.data.episodes.findIndex(e => e.id === id);
    if (idx === -1) return false;
    const animeId = this.data.episodes[idx].anime_id;
    this.data.episodes.splice(idx, 1);
    
    const anime = this.getAnimeById(animeId);
    if (anime) {
      anime.episodes_count = this.data.episodes.filter(e => e.anime_id === animeId).length;
    }
    
    this.save();
    return true;
  }

  // --- Watchlist ---
  getUserWatchlist(userId) {
    return this.data.watchlist
      .filter(w => w.user_id === userId)
      .map(w => {
        const anime = this.getAnimeById(w.anime_id);
        return {
          ...w,
          anime: anime || null
        };
      })
      .filter(w => w.anime !== null);
  }

  getWatchlistItem(userId, animeId) {
    return this.data.watchlist.find(w => w.user_id === userId && w.anime_id === animeId) || null;
  }

  setWatchlistStatus(userId, animeId, status) {
    const existing = this.data.watchlist.find(w => w.user_id === userId && w.anime_id === animeId);
    if (existing) {
      existing.status = status;
      existing.updated_at = new Date().toISOString();
      this.save();
      return existing;
    }
    const newItem = {
      id: this.generateId('wl'),
      user_id: userId,
      anime_id: animeId,
      status: status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.data.watchlist.push(newItem);
    this.save();
    return newItem;
  }

  removeFromWatchlist(userId, animeId) {
    const idx = this.data.watchlist.findIndex(w => w.user_id === userId && w.anime_id === animeId);
    if (idx === -1) return false;
    this.data.watchlist.splice(idx, 1);
    this.save();
    return true;
  }

  // --- Watch History ---
  getUserHistory(userId) {
    return this.data.watch_history
      .filter(h => h.user_id === userId)
      .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      .map(h => {
        const anime = this.getAnimeById(h.anime_id);
        const episode = this.getEpisodeById(h.episode_id);
        return {
          ...h,
          anime: anime || null,
          episode: episode || null
        };
      })
      .filter(h => h.anime !== null);
  }

  getPlaybackPosition(userId, episodeId) {
    const record = this.data.watch_history.find(h => h.user_id === userId && h.episode_id === episodeId);
    return record ? record.progress_seconds : 0;
  }

  savePlaybackProgress(userId, animeId, episodeId, progressSeconds, totalSeconds) {
    const existing = this.data.watch_history.find(h => h.user_id === userId && h.episode_id === episodeId);
    const completed = totalSeconds > 0 && progressSeconds / totalSeconds >= 0.9;

    if (existing) {
      existing.progress_seconds = Math.floor(progressSeconds);
      existing.total_seconds = Math.floor(totalSeconds);
      existing.completed = completed;
      existing.updated_at = new Date().toISOString();
      this.save();
      return existing;
    }

    const newItem = {
      id: this.generateId('his'),
      user_id: userId,
      anime_id: animeId,
      episode_id: episodeId,
      progress_seconds: Math.floor(progressSeconds),
      total_seconds: Math.floor(totalSeconds),
      completed: completed,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    this.data.watch_history.push(newItem);
    this.save();
    return newItem;
  }

  clearUserHistory(userId) {
    this.data.watch_history = this.data.watch_history.filter(h => h.user_id !== userId);
    this.save();
    return true;
  }

  // --- Ratings ---
  setUserRating(userId, animeId, rating) {
    const r = Math.max(1, Math.min(10, parseInt(rating, 10)));
    const existing = this.data.ratings.find(item => item.user_id === userId && item.anime_id === animeId);
    if (existing) {
      existing.rating = r;
      existing.updated_at = new Date().toISOString();
    } else {
      this.data.ratings.push({
        id: this.generateId('rt'),
        user_id: userId,
        anime_id: animeId,
        rating: r,
        created_at: new Date().toISOString()
      });
    }
    this.save();
    return r;
  }

  getUserRating(userId, animeId) {
    const item = this.data.ratings.find(r => r.user_id === userId && r.anime_id === animeId);
    return item ? item.rating : null;
  }

  // --- Comments ---
  getEpisodeComments(episodeId) {
    return this.data.comments
      .filter(c => c.episode_id === episodeId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(c => {
        const user = this.findUserById(c.user_id);
        return {
          ...c,
          user: user ? { id: user.id, username: user.username, avatar: user.avatar, role: user.role } : { username: 'Deleted User', avatar: '' }
        };
      });
  }

  addComment(userId, episodeId, animeId, content, isSpoiler = false) {
    const comment = {
      id: this.generateId('cmt'),
      user_id: userId,
      episode_id: episodeId,
      anime_id: animeId,
      content: content.trim(),
      is_spoiler: Boolean(isSpoiler),
      likes_count: 0,
      created_at: new Date().toISOString()
    };
    this.data.comments.push(comment);
    this.save();
    const user = this.findUserById(userId);
    return {
      ...comment,
      user: { id: user.id, username: user.username, avatar: user.avatar, role: user.role }
    };
  }

  deleteComment(id, requestingUserId, isAdmin = false) {
    const idx = this.data.comments.findIndex(c => c.id === id);
    if (idx === -1) return false;
    const comment = this.data.comments[idx];
    if (comment.user_id !== requestingUserId && !isAdmin) {
      return false;
    }
    this.data.comments.splice(idx, 1);
    this.save();
    return true;
  }

  // --- Stats ---
  getSystemStats() {
    const totalUsers = this.data.users.length;
    const totalAnime = this.data.anime.length;
    const totalEpisodes = this.data.episodes.length;
    const totalComments = this.data.comments.length;
    const totalViews = this.data.anime.reduce((sum, a) => sum + (a.views_count || 0), 0);
    
    const topAnime = [...this.data.anime]
      .sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
      .slice(0, 5)
      .map(a => ({ id: a.id, title: a.title, views: a.views_count, rating: a.rating }));

    const recentUsers = [...this.data.users]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5)
      .map(u => ({ id: u.id, username: u.username, email: u.email, role: u.role, created_at: u.created_at }));

    return {
      totalUsers,
      totalAnime,
      totalEpisodes,
      totalComments,
      totalViews,
      topAnime,
      recentUsers,
      serverUptimeSeconds: Math.floor(process.uptime()),
      nodeVersion: process.version,
      memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      settings: this.data.settings
    };
  }
}

const db = new Database();
module.exports = db;
