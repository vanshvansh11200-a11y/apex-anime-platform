const thirdPartyFetcher = require('../services/thirdPartyFetcher');
const db = require('../database/db');

// Multi-server demo streams with Japanese, English Dub, and Hindi Dub
const defaultVideoSources = [
  {
    server: 'Kaizen (HLS Multi-Bitrate)',
    type: 'hls',
    url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    quality: '1080p Auto',
    audio: 'ja',
    audioLabel: 'Japanese (Original Audio)'
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
    server: 'Apex CDN (Fast)',
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
  { label: 'Hindi', lang: 'hi', src: '' }
];

// 1. Search 3rd party websites (MyAnimeList + Kitsu)
async function search3rdParty(req, res, next) {
  try {
    const { q, provider = 'all' } = req.query;
    if (!q || q.trim().length === 0) {
      return res.json({ success: true, items: [] });
    }

    let items = [];
    if (provider === 'mal') {
      items = await thirdPartyFetcher.searchMAL(q.trim());
    } else if (provider === 'kitsu') {
      items = await thirdPartyFetcher.searchKitsu(q.trim());
    } else {
      items = await thirdPartyFetcher.searchAll(q.trim());
    }

    res.json({
      success: true,
      query: q,
      provider,
      count: items.length,
      items
    });
  } catch (err) {
    next(err);
  }
}

// 2. Get full details + episode list from MyAnimeList or Kitsu
async function get3rdPartyDetails(req, res, next) {
  try {
    const { id } = req.params;
    const { source = 'mal' } = req.query;

    if (source === 'mal') {
      const details = await thirdPartyFetcher.getMALDetails(id);
      if (!details) {
        return res.status(404).json({ success: false, error: 'Anime not found on MyAnimeList' });
      }
      return res.json({ success: true, anime: details });
    }

    res.status(400).json({ success: false, error: 'Unsupported 3rd party source' });
  } catch (err) {
    next(err);
  }
}

// 3. Fetch from 3rd party and import directly into APEX Database
async function importFrom3rdParty(req, res, next) {
  try {
    const { mal_id, kitsu_id, custom_data } = req.body;

    let animeData = custom_data || null;

    if (!animeData && mal_id) {
      animeData = await thirdPartyFetcher.getMALDetails(mal_id);
    }

    if (!animeData) {
      return res.status(400).json({ success: false, error: 'Could not fetch anime data to import' });
    }

    // Check if anime already exists in local DB
    let existing = db.getAnimeBySlug(animeData.slug);
    if (existing) {
      return res.json({
        success: true,
        message: 'Anime already exists in APEX database',
        anime: existing
      });
    }

    // Create Anime in Local DB
    const episodesList = animeData.episodes_list || [];
    delete animeData.episodes_list;

    const createdAnime = db.createAnime({
      ...animeData,
      published: true
    });

    // Create Episodes with Working Video Sources
    const totalEpisodes = episodesList.length > 0 ? episodesList.length : (createdAnime.episodes_count || 12);

    for (let i = 1; i <= Math.min(totalEpisodes, 24); i++) {
      const epInfo = episodesList[i - 1] || {};
      db.createEpisode({
        anime_id: createdAnime.id,
        episode_number: epInfo.episode_number || i,
        title: epInfo.title || `Episode ${i}`,
        thumbnail_url: createdAnime.banner_url || createdAnime.poster_url,
        duration: epInfo.duration || '24:00',
        duration_seconds: 1440,
        video_url: defaultVideoSources[0].url,
        sources: defaultVideoSources,
        subtitles: defaultSubtitles,
        intro_start: 85,
        intro_end: 175,
        outro_start: 1350,
        outro_end: 1440,
        published: true
      });
    }

    res.status(201).json({
      success: true,
      message: `Successfully imported "${createdAnime.title}" with episodes from 3rd party source!`,
      anime: createdAnime
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  search3rdParty,
  get3rdPartyDetails,
  importFrom3rdParty
};
