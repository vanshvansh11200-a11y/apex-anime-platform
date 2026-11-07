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

  /**
   * Enrich Anime and Episode metadata using AniList, MAL/Jikan & Kitsu
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
      rating: 8.5,
      year: new Date().getFullYear(),
      season: 'Fall',
      studio: 'Unknown',
      genres: ['Action', 'Fantasy'],
      type: isMovie ? 'Movie' : 'TV',
      episode_number: epNum,
      episode_title: isMovie ? `${cleanTitle} (Full Movie)` : `Episode ${epNum}`,
      episode_synopsis: '',
      episode_thumbnail: '',
      duration: isMovie ? '1h 50m' : '24:00'
    };

    try {
      // 1. Fetch from AniList GraphQL (Best for HD banners, covers & metadata)
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

      // 2. Fetch from Jikan / MyAnimeList (Best for specific Episode titles & synopses)
      const malResults = await thirdPartyFetcher.searchMAL(cleanTitle, 1, 3).catch(() => []);
      if (malResults && malResults.length > 0) {
        const topMal = malResults[0];

        if (!result.poster_url) result.poster_url = topMal.poster_url;
        if (!result.banner_url) result.banner_url = topMal.banner_url || topMal.poster_url;
        if (!result.japanese_title) result.japanese_title = topMal.japanese_title;
        if (!result.synopsis) result.synopsis = this.cleanHtml(topMal.synopsis);
        if (topMal.trailer_url) result.trailer_url = topMal.trailer_url;

        // Try getting specific episode title
        if (!isMovie && topMal.mal_id) {
          try {
            const malDetails = await thirdPartyFetcher.getMALDetails(topMal.mal_id);
            if (malDetails && malDetails.episodes_list && malDetails.episodes_list.length > 0) {
              const matchedEp = malDetails.episodes_list.find(e => e.episode_number === epNum);
              if (matchedEp && matchedEp.title) {
                result.episode_title = matchedEp.title;
                if (matchedEp.duration) result.duration = matchedEp.duration;
              }
            }
          } catch (_) {}
        }
      }

      // 3. Fallback Banner Generator (Ensure high-resolution 16:9 banner)
      if (!result.banner_url || result.banner_url === result.poster_url) {
        // High quality anime wallpaper fallback
        result.banner_url = 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1920&q=80';
      }

      if (!result.poster_url) {
        result.poster_url = 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&q=80';
      }

      // Episode thumbnail defaults to wide banner
      result.episode_thumbnail = result.banner_url;

      if (isMovie) {
        result.type = 'Movie';
        result.episode_title = `${result.title} (Full Movie)`;
        result.episode_number = 1;
      }

      this.cache.set(cacheKey, result);
      return result;
    } catch (err) {
      console.error('[AiEnricher] Enrichment failed:', err.message);
      return result;
    }
  }
}

const aiEnricherService = new AiEnricherService();

module.exports = aiEnricherService;
