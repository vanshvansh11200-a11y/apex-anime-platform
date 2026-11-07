const anilistService = require('./anilistService');
const thirdPartyFetcher = require('./thirdPartyFetcher');

class AiEnricherService {
  constructor() {
    this.cache = new Map();
  }

  cleanHtml(text) {
    if (!text) return '';
    return text
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<i>(.*?)<\/i>/gi, '$1')
      .replace(/<b>(.*?)<\/b>/gi, '$1')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#039;/g, "'")
      .trim();
  }

  async fetchWithTimeout(url, timeoutMs = 6000) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'application/json'
        },
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!res.ok) return null;
      return await res.json().catch(() => null);
    } catch (_) {
      return null;
    }
  }

  /**
   * Search Hollywood & Bollywood Movies via Apple iTunes Store API
   * Free public API, no key required, covers global cinema & India
   */
  async searchItunesMovie(cleanTitle, country = 'IN') {
    try {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(cleanTitle)}&media=movie&entity=movie&country=${country}&limit=5`;
      const data = await this.fetchWithTimeout(url, 5000);
      if (data && data.results && data.results.length > 0) {
        const top = data.results[0];
        let poster = top.artworkUrl100 || '';
        if (poster) {
          poster = poster.replace(/100x100[a-z0-9]*/, '1200x1200bb');
        }
        let banner = poster;
        const year = top.releaseDate ? new Date(top.releaseDate).getFullYear() : new Date().getFullYear();
        const synopsis = top.longDescription || top.shortDescription || `Watch ${top.trackName} full movie online in HD on APEX.`;
        const genres = top.primaryGenreName ? [top.primaryGenreName, 'Movie'] : ['Action', 'Drama'];
        const studio = top.artistName || 'Studio';

        return {
          title: top.trackName,
          poster_url: poster,
          banner_url: banner,
          synopsis,
          year,
          studio,
          genres,
          rating: 8.7,
          type: 'Movie'
        };
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /**
   * Search Wikipedia REST API (Covers 100% Bollywood, Hollywood, South Indian Cinema in Hindi/English)
   */
  async searchWikipediaMovie(cleanTitle) {
    try {
      // 1. Search for Wikipedia page
      const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(cleanTitle + ' film')}&format=json&origin=*`;
      const searchRes = await this.fetchWithTimeout(searchUrl, 5000);
      const searchItem = searchRes?.query?.search?.[0];

      if (!searchItem || !searchItem.title) return null;

      const pageTitle = searchItem.title;
      const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle)}`;
      const summary = await this.fetchWithTimeout(summaryUrl, 5000);

      if (summary && summary.extract) {
        const title = (summary.title || cleanTitle).replace(/\s*\(.*film.*\)/i, '').trim();
        const poster = summary.originalimage?.source || summary.thumbnail?.source || '';
        const banner = poster;
        const synopsis = summary.extract;
        
        let year = new Date().getFullYear();
        const yearMatch = (summary.description || summary.extract).match(/\b(19\d{2}|20\d{2})\b/);
        if (yearMatch) {
          year = parseInt(yearMatch[1], 10);
        }

        let genres = ['Movie', 'Cinema'];
        if (summary.description) {
          if (/action/i.test(summary.description)) genres.push('Action');
          if (/thriller/i.test(summary.description)) genres.push('Thriller');
          if (/drama/i.test(summary.description)) genres.push('Drama');
          if (/comedy/i.test(summary.description)) genres.push('Comedy');
          if (/romance|romantic/i.test(summary.description)) genres.push('Romance');
          if (/sci-fi|science fiction/i.test(summary.description)) genres.push('Sci-Fi');
          if (/hindi/i.test(summary.description)) genres.push('Bollywood');
        }

        return {
          title,
          poster_url: poster,
          banner_url: banner,
          synopsis,
          year,
          studio: summary.description || 'Indian Cinema / Hollywood',
          genres,
          rating: 8.8,
          type: 'Movie'
        };
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /**
   * Search TVMaze API for Global Web Series / TV Shows
   */
  async searchTvMaze(cleanTitle) {
    try {
      const url = `https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(cleanTitle)}`;
      const show = await this.fetchWithTimeout(url, 4000);
      if (show && show.name) {
        return {
          title: show.name,
          poster_url: show.image?.original || show.image?.medium || '',
          banner_url: show.image?.original || '',
          synopsis: this.cleanHtml(show.summary) || `Watch ${show.name} series online on APEX.`,
          year: show.premiered ? new Date(show.premiered).getFullYear() : new Date().getFullYear(),
          studio: show.network?.name || show.webChannel?.name || 'Studio',
          genres: show.genres?.length ? show.genres : ['Drama', 'Action'],
          rating: show.rating?.average || 8.6,
          type: 'TV'
        };
      }
      return null;
    } catch (_) {
      return null;
    }
  }

  /**
   * Main Universal Metadata Enricher
   * Intelligently enriches Anime, Bollywood, Hollywood, South Indian & World Cinema
   */
  async enrich({ title, episodeNumber = 1, isMovie = false }) {
    if (!title || !title.trim()) {
      return { success: false, error: 'Title is required for AI auto-fill' };
    }

    const cleanTitle = title.trim();
    const epNum = parseInt(episodeNumber, 10) || 1;
    const cacheKey = `${cleanTitle.toLowerCase()}:${epNum}:${isMovie ? 'movie' : 'series'}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    let result = {
      success: true,
      found: false,
      title: cleanTitle,
      japanese_title: '',
      synopsis: '',
      poster_url: '',
      banner_url: '',
      trailer_url: '',
      rating: 8.8,
      year: new Date().getFullYear(),
      season: 'Fall',
      studio: 'Cinema Studio',
      genres: ['Action', 'Entertainment'],
      type: isMovie ? 'Movie' : 'TV',
      episode_number: epNum,
      episode_title: isMovie ? `${cleanTitle} (Full Movie)` : `Episode ${epNum}`,
      episode_synopsis: '',
      episode_thumbnail: '',
      duration: isMovie ? '2h 15m' : '24:00'
    };

    try {
      // ========================================================
      // PATHWAY A: MOVIE MODE (Bollywood, Hollywood & Cinema First)
      // ========================================================
      if (isMovie) {
        // 1. Check Indian Cinema Store (Bollywood, Hindi, South Dubbed)
        let movieData = await this.searchItunesMovie(cleanTitle, 'IN');

        // 2. Check Global Hollywood Store
        if (!movieData) {
          movieData = await this.searchItunesMovie(cleanTitle, 'US');
        }

        // 3. Check Wikipedia Global Movie Database (100% Bollywood & Regional coverage)
        if (!movieData) {
          movieData = await this.searchWikipediaMovie(cleanTitle);
        }

        if (movieData) {
          result.found = true;
          result.title = movieData.title || cleanTitle;
          result.poster_url = movieData.poster_url || '';
          result.banner_url = movieData.banner_url || movieData.poster_url || '';
          result.synopsis = movieData.synopsis || `Watch ${cleanTitle} full movie online in HD on APEX.`;
          result.year = movieData.year || new Date().getFullYear();
          result.studio = movieData.studio || 'Studio';
          result.genres = movieData.genres || ['Action', 'Movie'];
          result.rating = movieData.rating || 8.8;
          result.type = 'Movie';
          result.episode_title = `${result.title} (Full Movie)`;
          result.episode_thumbnail = result.banner_url || result.poster_url;
        }
      }

      // ========================================================
      // PATHWAY B: ANIME OR FALLBACK (AniList & MAL)
      // ========================================================
      if (!result.found) {
        // 1. AniList GraphQL API
        const anilistResults = await anilistService.searchAnime(cleanTitle, {}, 1, 5).catch(() => null);
        let matchedAniList = null;

        if (anilistResults && anilistResults.items && anilistResults.items.length > 0) {
          matchedAniList = anilistResults.items[0];
        }

        if (matchedAniList) {
          result.found = true;
          result.title = matchedAniList.title || cleanTitle;
          result.japanese_title = matchedAniList.japanese_title || '';
          result.synopsis = this.cleanHtml(matchedAniList.synopsis) || `Watch ${cleanTitle} online in HD on APEX.`;
          result.poster_url = matchedAniList.poster_url || '';
          result.banner_url = matchedAniList.banner_url || matchedAniList.poster_url || '';
          result.rating = parseFloat(matchedAniList.rating) || 8.5;
          result.year = matchedAniList.year || new Date().getFullYear();
          result.season = matchedAniList.season || 'Fall';
          result.studio = matchedAniList.studio || 'Unknown';
          result.genres = matchedAniList.genres || ['Action', 'Fantasy'];
          if (matchedAniList.type) {
            result.type = matchedAniList.type === 'Movie' || isMovie ? 'Movie' : 'TV';
          }
        }

        // 2. Jikan / MyAnimeList (MAL)
        const malResults = await thirdPartyFetcher.searchMAL(cleanTitle, 1, 3).catch(() => []);
        if (malResults && malResults.length > 0) {
          const topMal = malResults[0];
          result.found = true;
          if (!result.poster_url) result.poster_url = topMal.poster_url;
          if (!result.banner_url) result.banner_url = topMal.banner_url || topMal.poster_url;
          if (!result.japanese_title) result.japanese_title = topMal.japanese_title;
          if (!result.synopsis) result.synopsis = this.cleanHtml(topMal.synopsis);
          if (topMal.trailer_url) result.trailer_url = topMal.trailer_url;
        }
      }

      // ========================================================
      // PATHWAY C: SERIES FALLBACK (TVMaze & Wikipedia for Global/Hindi TV Series)
      // ========================================================
      if (!result.found && !isMovie) {
        const tvShow = await this.searchTvMaze(cleanTitle);
        if (tvShow) {
          result.found = true;
          result.title = tvShow.title || cleanTitle;
          result.poster_url = tvShow.poster_url;
          result.banner_url = tvShow.banner_url || tvShow.poster_url;
          result.synopsis = tvShow.synopsis;
          result.year = tvShow.year;
          result.studio = tvShow.studio;
          result.genres = tvShow.genres;
          result.rating = tvShow.rating;
        } else {
          const wikiSeries = await this.searchWikipediaMovie(cleanTitle);
          if (wikiSeries) {
            result.found = true;
            result.title = wikiSeries.title || cleanTitle;
            result.poster_url = wikiSeries.poster_url;
            result.banner_url = wikiSeries.banner_url || wikiSeries.poster_url;
            result.synopsis = wikiSeries.synopsis;
            result.year = wikiSeries.year;
            result.studio = wikiSeries.studio;
            result.genres = wikiSeries.genres;
          }
        }
      }

      // ========================================================
      // PATHWAY D: Default Fallback Artwork if still missing
      // ========================================================
      if (!result.banner_url || result.banner_url === result.poster_url) {
        result.banner_url = result.poster_url || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1920&q=80';
      }

      if (!result.poster_url) {
        result.poster_url = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&q=80';
      }

      result.episode_thumbnail = result.banner_url;

      if (isMovie) {
        result.type = 'Movie';
        result.episode_title = `${result.title} (Full Movie)`;
        result.episode_number = 1;
      }

      this.cache.set(cacheKey, result);
      return result;
    } catch (err) {
      console.error('[AiEnricher] Universal search failed:', err.message);
      return result;
    }
  }
}

const aiEnricherService = new AiEnricherService();

module.exports = aiEnricherService;
