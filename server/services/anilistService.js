// AniList GraphQL Service for APEX
// Official AniList GraphQL API: https://graphql.anilist.co

const ANILIST_API_URL = 'https://graphql.anilist.co';

class AniListService {
  constructor() {
    this.cache = new Map();
    this.cacheTtlMs = 15 * 60 * 1000; // 15 minutes TTL
  }

  getCache(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return cached.data;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + this.cacheTtlMs
    });
  }

  async fetchGraphQL(query, variables = {}) {
    const cacheKey = JSON.stringify({ query, variables });
    const cached = this.getCache(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000); // 6s timeout

      const response = await fetch(ANILIST_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`[AniList] API returned HTTP ${response.status}: ${response.statusText}`);
        return null;
      }

      const json = await response.json();
      if (json.errors) {
        console.warn('[AniList] GraphQL errors:', json.errors);
        return null;
      }

      this.setCache(cacheKey, json.data);
      return json.data;
    } catch (err) {
      console.warn(`[AniList] GraphQL fetch failed (${err.message}). Using local fallback.`);
      return null;
    }
  }

  // Map AniList media object to APEX schema
  formatMedia(media) {
    if (!media) return null;
    const title = media.title?.english || media.title?.romaji || media.title?.userPreferred || 'Untitled';
    const japaneseTitle = media.title?.native || '';
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    return {
      id: `al_${media.id}`,
      anilist_id: media.id,
      slug,
      title,
      japanese_title: japaneseTitle,
      synopsis: media.description ? media.description.replace(/<[^>]*>?/gm, '') : 'No synopsis available.',
      poster_url: media.coverImage?.extraLarge || media.coverImage?.large || '',
      banner_url: media.bannerImage || media.coverImage?.extraLarge || '',
      trailer_url: media.trailer?.site === 'youtube' ? `https://www.youtube.com/watch?v=${media.trailer.id}` : null,
      rating: media.averageScore ? parseFloat((media.averageScore / 10).toFixed(1)) : 8.0,
      status: media.status === 'RELEASING' ? 'Airing' : (media.status === 'FINISHED' ? 'Completed' : 'Upcoming'),
      type: media.format || 'TV',
      season: media.season ? (media.season.charAt(0) + media.season.slice(1).toLowerCase()) : 'Fall',
      year: media.seasonYear || media.startDate?.year || new Date().getFullYear(),
      studio: media.studios?.nodes?.[0]?.name || 'Unknown Studio',
      genres: media.genres || [],
      episodes_count: media.episodes || 12,
      has_sub: true,
      has_dub: true,
      has_hindi_dub: ['Action', 'Adventure', 'Fantasy'].some(g => (media.genres || []).includes(g)),
      views_count: (media.popularity || 1000) * 12,
      attribution: 'Metadata provided by AniList GraphQL API'
    };
  }

  // 1. Trending Anime
  async getTrending(page = 1, perPage = 20) {
    const query = `
      query ($page: Int, $perPage: Int) {
        Page (page: $page, perPage: $perPage) {
          pageInfo {
            total
            currentPage
            lastPage
            hasNextPage
          }
          media (sort: TRENDING_DESC, type: ANIME, isAdult: false) {
            id
            title {
              romaji
              english
              native
              userPreferred
            }
            description
            coverImage {
              large
              extraLarge
            }
            bannerImage
            format
            status
            episodes
            duration
            genres
            averageScore
            popularity
            season
            seasonYear
            studios(isMain: true) {
              nodes {
                name
              }
            }
          }
        }
      }
    `;

    const data = await this.fetchGraphQL(query, { page, perPage });
    if (!data || !data.Page) return null;

    return {
      items: data.Page.media.map(m => this.formatMedia(m)),
      pageInfo: data.Page.pageInfo
    };
  }

  // 2. Popular Anime
  async getPopular(page = 1, perPage = 20) {
    const query = `
      query ($page: Int, $perPage: Int) {
        Page (page: $page, perPage: $perPage) {
          pageInfo {
            total
            currentPage
            lastPage
            hasNextPage
          }
          media (sort: POPULARITY_DESC, type: ANIME, isAdult: false) {
            id
            title {
              romaji
              english
              native
              userPreferred
            }
            description
            coverImage {
              large
              extraLarge
            }
            bannerImage
            format
            status
            episodes
            genres
            averageScore
            popularity
            season
            seasonYear
            studios(isMain: true) {
              nodes {
                name
              }
            }
          }
        }
      }
    `;

    const data = await this.fetchGraphQL(query, { page, perPage });
    if (!data || !data.Page) return null;

    return {
      items: data.Page.media.map(m => this.formatMedia(m)),
      pageInfo: data.Page.pageInfo
    };
  }

  // 3. Latest Airing Anime
  async getLatest(page = 1, perPage = 20) {
    const query = `
      query ($page: Int, $perPage: Int) {
        Page (page: $page, perPage: $perPage) {
          pageInfo {
            total
            currentPage
            lastPage
            hasNextPage
          }
          media (sort: START_DATE_DESC, type: ANIME, status: RELEASING, isAdult: false) {
            id
            title {
              romaji
              english
              native
              userPreferred
            }
            description
            coverImage {
              large
              extraLarge
            }
            bannerImage
            format
            status
            episodes
            genres
            averageScore
            popularity
            season
            seasonYear
            studios(isMain: true) {
              nodes {
                name
              }
            }
          }
        }
      }
    `;

    const data = await this.fetchGraphQL(query, { page, perPage });
    if (!data || !data.Page) return null;

    return {
      items: data.Page.media.map(m => this.formatMedia(m)),
      pageInfo: data.Page.pageInfo
    };
  }

  // 4. Seasonal Anime
  async getSeasonal(season = 'FALL', seasonYear = 2024, page = 1, perPage = 20) {
    const query = `
      query ($season: MediaSeason, $seasonYear: Int, $page: Int, $perPage: Int) {
        Page (page: $page, perPage: $perPage) {
          pageInfo {
            total
            currentPage
            lastPage
            hasNextPage
          }
          media (season: $season, seasonYear: $seasonYear, type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
            id
            title {
              romaji
              english
              native
              userPreferred
            }
            description
            coverImage {
              large
              extraLarge
            }
            bannerImage
            format
            status
            episodes
            genres
            averageScore
            popularity
            season
            seasonYear
            studios(isMain: true) {
              nodes {
                name
              }
            }
          }
        }
      }
    `;

    const data = await this.fetchGraphQL(query, {
      season: season.toUpperCase(),
      seasonYear: parseInt(seasonYear, 10),
      page,
      perPage
    });
    if (!data || !data.Page) return null;

    return {
      items: data.Page.media.map(m => this.formatMedia(m)),
      pageInfo: data.Page.pageInfo
    };
  }

  // 5. Search with filters
  async searchAnime(search = '', filters = {}, page = 1, perPage = 20) {
    const query = `
      query ($search: String, $genre: String, $sort: [MediaSort], $page: Int, $perPage: Int) {
        Page (page: $page, perPage: $perPage) {
          pageInfo {
            total
            currentPage
            lastPage
            hasNextPage
          }
          media (search: $search, genre: $genre, sort: $sort, type: ANIME, isAdult: false) {
            id
            title {
              romaji
              english
              native
              userPreferred
            }
            description
            coverImage {
              large
              extraLarge
            }
            bannerImage
            format
            status
            episodes
            genres
            averageScore
            popularity
            season
            seasonYear
            studios(isMain: true) {
              nodes {
                name
              }
            }
          }
        }
      }
    `;

    const variables = {
      page,
      perPage,
      sort: ['POPULARITY_DESC']
    };

    if (search && search.trim()) variables.search = search.trim();
    if (filters.genre && filters.genre !== 'All') variables.genre = filters.genre;

    const data = await this.fetchGraphQL(query, variables);
    if (!data || !data.Page) return null;

    return {
      items: data.Page.media.map(m => this.formatMedia(m)),
      pageInfo: data.Page.pageInfo
    };
  }
}

const anilistService = new AniListService();
module.exports = anilistService;
