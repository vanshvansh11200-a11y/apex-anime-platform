const db = require('../database/db');
const anilistService = require('../services/anilistService');

// General list with search & filters (Local DB)
function getAnimeList(req, res, next) {
  try {
    const result = db.getAllAnime(req.query);
    res.json({
      success: true,
      attribution: 'APEX Curated Catalog',
      ...result
    });
  } catch (err) {
    next(err);
  }
}

// 1. Trending Anime (From User Database)
function getTrending(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 18;

    const local = [...db.data.anime]
      .filter(a => a.published !== false)
      .sort((a, b) => (b.views_count || 0) - (a.views_count || 0))
      .slice((page - 1) * limit, page * limit);

    res.json({
      success: true,
      source: 'APEX Database',
      items: local,
      pageInfo: {
        total: db.data.anime.length,
        currentPage: page,
        hasNextPage: page * limit < db.data.anime.length
      }
    });
  } catch (err) {
    next(err);
  }
}

// 2. Popular Anime (From User Database)
function getPopular(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 18;

    const local = [...db.data.anime]
      .filter(a => a.published !== false)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice((page - 1) * limit, page * limit);

    res.json({
      success: true,
      source: 'APEX Database',
      items: local,
      pageInfo: {
        total: db.data.anime.length,
        currentPage: page,
        hasNextPage: page * limit < db.data.anime.length
      }
    });
  } catch (err) {
    next(err);
  }
}

// 3. Latest Airing Anime (From User Database)
function getLatest(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 18;

    const local = [...db.data.anime]
      .filter(a => a.published !== false)
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice((page - 1) * limit, page * limit);

    res.json({
      success: true,
      source: 'APEX Database',
      items: local,
      pageInfo: {
        total: local.length,
        currentPage: page,
        hasNextPage: false
      }
    });
  } catch (err) {
    next(err);
  }
}

// 4. Seasonal Anime (From User Database)
function getSeasonal(req, res, next) {
  try {
    const season = req.query.season || 'FALL';
    const year = parseInt(req.query.year, 10) || new Date().getFullYear();
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 18;

    const local = db.data.anime.filter(a => {
      const matchSeason = !season || (a.season && a.season.toUpperCase() === season.toUpperCase());
      const matchYear = !year || a.year === year;
      return matchSeason && matchYear;
    });

    res.json({
      success: true,
      season,
      year,
      source: 'APEX Database',
      items: local,
      pageInfo: {
        total: local.length,
        currentPage: page,
        hasNextPage: false
      }
    });
  } catch (err) {
    next(err);
  }
}

// 5. Featured for Hero Carousel
function getFeatured(req, res, next) {
  try {
    let items = db.data.anime.filter(a => a.featured && a.published !== false);
    if (items.length === 0) {
      items = db.data.anime.slice(0, 5);
    }
    res.json({
      success: true,
      items
    });
  } catch (err) {
    next(err);
  }
}

// 6. Genres List
function getGenres(req, res, next) {
  try {
    const genreMap = {};
    for (const anime of db.data.anime) {
      if (Array.isArray(anime.genres)) {
        for (const g of anime.genres) {
          genreMap[g] = (genreMap[g] || 0) + 1;
        }
      }
    }
    const genres = Object.keys(genreMap).sort().map(name => ({
      name,
      count: genreMap[name]
    }));
    res.json({
      success: true,
      genres
    });
  } catch (err) {
    next(err);
  }
}

// 7. Search Endpoint (Hybrid AniList + Local)
async function search(req, res, next) {
  try {
    const { q, genre, sort, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length === 0) {
      return res.json({
        success: true,
        items: [],
        pageInfo: { total: 0, currentPage: 1, hasNextPage: false }
      });
    }

    // Try AniList search first
    const anilistResult = await anilistService.searchAnime(q, { genre }, page, limit);
    if (anilistResult && anilistResult.items && anilistResult.items.length > 0) {
      return res.json({
        success: true,
        source: 'AniList GraphQL API',
        attribution: 'Metadata provided by AniList (https://anilist.co)',
        items: anilistResult.items,
        pageInfo: anilistResult.pageInfo
      });
    }

    // Fallback to local DB search
    const localResult = db.getAllAnime({ search: q, genre, sort, page, limit });
    res.json({
      success: true,
      source: 'APEX Local Cache',
      ...localResult
    });
  } catch (err) {
    next(err);
  }
}

// 8. Anime Details by slug or ID
function getAnimeBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    let anime = db.getAnimeBySlug(slug) || db.getAnimeById(slug);

    if (!anime) {
      // Check if it's an AniList synthetic ID like al_151807
      if (slug.startsWith('al_')) {
        const alId = parseInt(slug.replace('al_', ''), 10);
        anime = db.data.anime.find(a => a.anilist_id === alId);
      }
    }

    if (!anime) {
      return res.status(404).json({
        success: false,
        error: 'Anime not found'
      });
    }

    db.incrementAnimeViews(anime.id);

    const episodes = db.getEpisodesByAnimeId(anime.id);

    let watchlistStatus = null;
    let userRating = null;
    let resumeEpisode = null;

    if (req.user) {
      const wl = db.getWatchlistItem(req.user.id, anime.id);
      if (wl) watchlistStatus = wl.status;

      userRating = db.getUserRating(req.user.id, anime.id);

      const userHistory = db.getUserHistory(req.user.id);
      const lastWatch = userHistory.find(h => h.anime_id === anime.id);
      if (lastWatch && lastWatch.episode) {
        resumeEpisode = {
          episode_id: lastWatch.episode_id,
          episode_number: lastWatch.episode.episode_number,
          progress_seconds: lastWatch.progress_seconds,
          total_seconds: lastWatch.total_seconds
        };
      }
    }

    // Related anime recommendations (matching genres)
    const currentGenres = anime.genres || [];
    const related = db.data.anime
      .filter(a => a.id !== anime.id)
      .map(a => {
        const commonGenres = (a.genres || []).filter(g => currentGenres.includes(g));
        return { anime: a, score: commonGenres.length };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map(item => item.anime);

    res.json({
      success: true,
      attribution: 'APEX Catalog with AniList GraphQL Enhancement',
      anime,
      episodes,
      watchlistStatus,
      userRating,
      resumeEpisode,
      related
    });
  } catch (err) {
    next(err);
  }
}

// 9. Rate Anime (1-10)
function rateAnime(req, res, next) {
  try {
    const { id } = req.params;
    const { rating } = req.body;
    const anime = db.getAnimeById(id) || db.getAnimeBySlug(id);
    if (!anime) {
      return res.status(404).json({ success: false, error: 'Anime not found' });
    }

    const savedRating = db.setUserRating(req.user.id, anime.id, rating);
    res.json({
      success: true,
      message: `You rated this anime ${savedRating}/10`,
      rating: savedRating
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAnimeList,
  getTrending,
  getPopular,
  getLatest,
  getSeasonal,
  getFeatured,
  getGenres,
  search,
  getAnimeBySlug,
  rateAnime
};
