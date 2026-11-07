import { state } from './state.js';
import { Toast } from './components/toast.js';

const BASE_URL = '/api';

class ApiClient {
  async request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (state.token) {
      headers['Authorization'] = `Bearer ${state.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 401 && state.isAuthenticated()) {
          state.logout();
          Toast.error('Session expired. Please log in again.');
        }
        const error = new Error(data.error || `HTTP error ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      console.error(`[API Error] ${options.method || 'GET'} ${endpoint}:`, err);
      throw err;
    }
  }

  // --- Auth ---
  login(identifier, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    });
  }

  register(username, email, password) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password })
    });
  }

  getMe() {
    return this.request('/auth/me');
  }

  updateProfile(profileData) {
    return this.request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });
  }

  // --- Anime ---
  getAnimeList(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request(`/anime${qs ? `?${qs}` : ''}`);
  }

  getTrending(limit = 18, page = 1) {
    return this.request(`/anime/trending?limit=${limit}&page=${page}`);
  }

  getPopular(limit = 18, page = 1) {
    return this.request(`/anime/popular?limit=${limit}&page=${page}`);
  }

  getLatest(limit = 18, page = 1) {
    return this.request(`/anime/latest?limit=${limit}&page=${page}`);
  }

  getSeasonal(season = 'FALL', year = 2024, page = 1, limit = 18) {
    return this.request(`/anime/seasons?season=${season}&year=${year}&page=${page}&limit=${limit}`);
  }

  getFeatured() {
    return this.request('/anime/featured');
  }

  getGenres() {
    return this.request('/anime/genres');
  }

  search(q = '', genre = '', page = 1, limit = 24) {
    const params = new URLSearchParams({ q: q || '', genre: genre || '', page, limit }).toString();
    return this.request(`/anime/search?${params}`);
  }

  getAnimeBySlug(slug) {
    return this.request(`/anime/${slug}`);
  }

  rateAnime(id, rating) {
    return this.request(`/anime/${id}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating })
    });
  }

  // --- Episodes ---
  getEpisode(id) {
    return this.request(`/episodes/${id}`);
  }

  // --- Watchlist ---
  getWatchlist(status = 'all') {
    return this.request(`/watchlist?status=${status}`);
  }

  setWatchlist(anime_id, status) {
    return this.request('/watchlist', {
      method: 'POST',
      body: JSON.stringify({ anime_id, status })
    });
  }

  removeFromWatchlist(animeId) {
    return this.request(`/watchlist/${animeId}`, {
      method: 'DELETE'
    });
  }

  // --- History & Progress ---
  getHistory() {
    return this.request('/history');
  }

  saveProgress(anime_id, episode_id, progress_seconds, total_seconds) {
    return this.request('/history/progress', {
      method: 'POST',
      body: JSON.stringify({ anime_id, episode_id, progress_seconds, total_seconds })
    });
  }

  clearHistory() {
    return this.request('/history', {
      method: 'DELETE'
    });
  }

  // --- Comments ---
  getComments(episodeId) {
    return this.request(`/comments/episode/${episodeId}`);
  }

  addComment(episode_id, anime_id, content, is_spoiler = false) {
    return this.request('/comments', {
      method: 'POST',
      body: JSON.stringify({ episode_id, anime_id, content, is_spoiler })
    });
  }

  deleteComment(commentId) {
    return this.request(`/comments/${commentId}`, {
      method: 'DELETE'
    });
  }

  // --- Admin ---
  getAdminStats() {
    return this.request('/admin/stats');
  }

  createAnime(animeData) {
    return this.request('/admin/anime', {
      method: 'POST',
      body: JSON.stringify(animeData)
    });
  }

  updateAnime(id, animeData) {
    return this.request(`/admin/anime/${id}`, {
      method: 'PUT',
      body: JSON.stringify(animeData)
    });
  }

  deleteAnime(id) {
    return this.request(`/admin/anime/${id}`, {
      method: 'DELETE'
    });
  }

  createEpisode(epData) {
    return this.request('/admin/episodes', {
      method: 'POST',
      body: JSON.stringify(epData)
    });
  }

  updateEpisode(id, epData) {
    return this.request(`/admin/episodes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(epData)
    });
  }

  deleteEpisode(id) {
    return this.request(`/admin/episodes/${id}`, {
      method: 'DELETE'
    });
  }

  getAnimeEpisodes(animeId) {
    return this.request(`/admin/anime/${animeId}/episodes`);
  }

  quickPublish(data) {
    return this.request('/admin/quick-publish', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  getAdminUsers() {
    return this.request('/admin/users');
  }

  updateAdminUser(id, updates) {
    return this.request(`/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  deleteAdminUser(id) {
    return this.request(`/admin/users/${id}`, {
      method: 'DELETE'
    });
  }

  // --- 3rd Party Websites Fetcher (MyAnimeList / Kitsu) ---
  searchThirdParty(query, provider = 'all') {
    return this.request(`/thirdparty/search?q=${encodeURIComponent(query)}&provider=${provider}`);
  }

  getThirdPartyDetails(id, source = 'mal') {
    return this.request(`/thirdparty/details/${id}?source=${source}`);
  }

  importThirdPartyAnime(data) {
    return this.request('/thirdparty/import', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // --- Telegram Bot & Direct Stream Link Generator ---
  getBotStatus() {
    return this.request('/admin/bot/status');
  }

  saveBotConfig(token) {
    return this.request('/admin/bot/config', {
      method: 'POST',
      body: JSON.stringify({ token })
    });
  }

  stopBot() {
    return this.request('/admin/bot/stop', {
      method: 'POST'
    });
  }

  // --- Admin Account & Credentials Settings ---
  getAdminCredentials() {
    return this.request('/admin/credentials');
  }

  updateAdminCredentials(data) {
    return this.request('/admin/credentials', {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  generateStreamLink(url) {
    return this.request('/stream/generate-link', {
      method: 'POST',
      body: JSON.stringify({ url })
    });
  }

  // --- Direct Video File Upload ---
  uploadVideo(file, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${BASE_URL}/admin/upload-video`, true);
      if (state.token) {
        xhr.setRequestHeader('Authorization', `Bearer ${state.token}`);
      }
      xhr.setRequestHeader('x-filename', encodeURIComponent(file.name));

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            onProgress(pct);
          }
        };
      }

      xhr.onload = () => {
        try {
          const res = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(res);
          } else {
            reject(new Error(res.error || `Upload failed with status ${xhr.status}`));
          }
        } catch (e) {
          reject(new Error('Invalid response from server'));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(file);
    });
  }
  aiEnrich(title, episodeNumber = 1, isMovie = false) {
    const params = new URLSearchParams({
      title,
      episode_number: episodeNumber,
      is_movie: isMovie ? 'true' : 'false'
    }).toString();
    return this.request(`/admin/ai-enrich?${params}`);
  }
}

export const api = new ApiClient();
