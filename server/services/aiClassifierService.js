const aiEnricherService = require('./aiEnricherService');

/**
 * AI Media Classifier & Smart Renamer Service
 * Intelligently classifies uploaded media into Anime Series vs Movies,
 * extracts clean titles and episode numbers, and formats target file paths.
 */
class AiClassifierService {
  constructor() {
    this.ANIME_BASE_DIR = '/storage/emulated/0/ALL ANIMA VIDIOS';
    this.MOVIE_BASE_DIR = '/storage/emulated/0/ALL MOVIES FOLDERS';
  }

  /**
   * Cleans raw filenames or captions by removing release groups, quality tags, and junk
   */
  cleanText(text) {
    if (!text || typeof text !== 'string') return '';

    let clean = text
      // Remove file extension if present
      .replace(/\.(mp4|mkv|webm|avi|mov|flv|wmv|m4v|ts)$/i, '')
      // Remove release groups: [SubsPlease], [Judas], [Erai-raws], [ASW], etc.
      .replace(/\[[^\]]*\]/g, ' ')
      // Remove quality in parentheses: (1080p), (720p), (4k), etc.
      .replace(/\([^\)]*(?:1080p|720p|480p|4k|2160p|hevc|x264|x265|aac|bluray|web-dl|bdrip|remux)[^\)]*\)/gi, ' ')
      // Remove standalone tech keywords
      .replace(/\b(1080p|720p|480p|4k|2160p|hevc|x264|x265|h264|h265|bluray|bdrip|web-dl|webrip|web|hdtv|aac|flac|mp3|ddp5\.1|dual-audio|multi-audio|hindi|english|dub|sub|subbed|dubbed|esub)\b/gi, ' ')
      // Clean dots and underscores
      .replace(/[._]/g, ' ')
      // Replace multiple spaces
      .replace(/\s+/g, ' ')
      .trim();

    return clean;
  }

  /**
   * Title Case Formatter (preserves Roman Numerals and DBZ/OVA/GT)
   */
  toTitleCase(str) {
    if (!str) return '';
    return str
      .split(/\s+/)
      .filter(Boolean)
      .map(word => {
        if (/^(ii|iii|iv|vi|vii|viii|ix|x|dbz|gt|ova|ona|tv)$/i.test(word)) {
          return word.toUpperCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  }

  /**
   * Extract Episode Number from text
   */
  extractEpisodeNumber(rawText) {
    if (!rawText) return null;

    // Pattern 1: Ep / Episode / Eps followed by number: "Ep 01", "Episode 12", "Eps 5", "E01"
    let match = rawText.match(/(?:ep|episode|eps)[.\s_#–-]*(\d{1,4})/i);
    if (match) return parseInt(match[1], 10);

    // Pattern 2: S01E05 or S1E5
    match = rawText.match(/s\d+[.\s_#–-]*e(\d{1,4})/i);
    if (match) return parseInt(match[1], 10);

    // Pattern 3: Standalone E followed by number: "E01", "E12"
    match = rawText.match(/\be(\d{1,4})\b/i);
    if (match) return parseInt(match[1], 10);

    // Pattern 4: Anime standard dash separator: "Naruto - 01", "Bleach - 26"
    match = rawText.match(/[-–]\s*(\d{1,4})(?:\s*[-–]|\.|\s|$)/);
    if (match) return parseInt(match[1], 10);

    // Pattern 5: #01 or #1
    match = rawText.match(/#(\d{1,4})/);
    if (match) return parseInt(match[1], 10);

    return null;
  }

  /**
   * Cleanly extract Anime Title by removing episode patterns
   */
  extractCleanTitle(cleanedText, episodeNumber) {
    if (!cleanedText) return 'Unknown Title';

    let title = cleanedText;

    // Remove episode patterns
    if (episodeNumber !== null) {
      title = title
        .replace(new RegExp(`(?:ep|episode|eps)[.\\s_#–-]*${episodeNumber}\\b`, 'i'), '')
        .replace(new RegExp(`s\\d+[.\\s_#–-]*e${episodeNumber}\\b`, 'i'), '')
        .replace(new RegExp(`\\be${episodeNumber}\\b`, 'i'), '')
        .replace(new RegExp(`[-–]\\s*${episodeNumber}(?:\\s*[-–]|\\.|\\s|$)`, 'i'), '')
        .replace(new RegExp(`#${episodeNumber}\\b`, 'i'), '')
        // Standalone number removal at the end
        .replace(new RegExp(`\\b${episodeNumber}$`), '');
    }

    // Remove keywords like "Full Movie", "Movie", "Film"
    title = title
      .replace(/\b(full\s*movie|movie|film|cinema)\b/gi, '')
      .replace(/[-–_]+$/, '')
      .replace(/^[-–_]+/, '')
      .trim();

    return this.toTitleCase(title) || 'Unknown Title';
  }

  /**
   * Detect Year if present
   */
  extractYear(rawText) {
    const match = rawText.match(/\b(19\d{2}|20\d{2})\b/);
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Detect Audio Language (Hindi, English, Japanese)
   */
  detectAudio(rawText) {
    if (/\b(hindi|hin|dubbed_hindi)\b/i.test(rawText)) {
      return { code: 'hi', label: 'Hindi Dub' };
    }
    if (/\b(english|eng|dub|dubbed)\b/i.test(rawText)) {
      return { code: 'en', label: 'English Dub' };
    }
    return { code: 'ja', label: 'Japanese (Original)' };
  }

  /**
   * Main AI Classifier:
   * Categorizes media into Anime Series vs Movie and generates clean target paths.
   */
  async classify({ filename = '', caption = '', fileSize = 0 }) {
    const rawCombined = `${caption} ${filename}`.trim();
    const primaryText = (caption && caption.trim().length > 2) ? caption.trim() : filename.trim();
    const cleanedText = this.cleanText(primaryText);

    // 1. Detect Episode Number
    let detectedEp = this.extractEpisodeNumber(primaryText) || this.extractEpisodeNumber(rawCombined);
    
    // 2. Detect Year
    const year = this.extractYear(rawCombined) || this.extractYear(filename);

    // 3. Audio detection
    const audio = this.detectAudio(rawCombined);

    // 4. Initial title extraction
    let cleanTitle = this.extractCleanTitle(cleanedText, detectedEp);

    // 5. Keyword indicators
    const hasMovieKeyword = /\b(movie|film|cinema|full movie|bollywood|hollywood)\b/i.test(rawCombined);
    const hasEpKeyword = /(?:ep|episode|eps|s\d+e\d+|\be\d+\b)/i.test(rawCombined) || detectedEp !== null;

    let isMovie = false;
    let isAnime = true; // Default priority for APEX platform

    if (hasMovieKeyword && !hasEpKeyword) {
      isMovie = true;
      isAnime = false;
    } else if (hasEpKeyword) {
      isMovie = false;
      isAnime = true;
    }

    // 6. Deep AI Lookup (AniList + iTunes + Wikipedia)
    try {
      const aiData = await aiEnricherService.enrich({
        title: cleanTitle,
        episodeNumber: detectedEp || 1,
        isMovie
      });

      if (aiData && aiData.found) {
        if (aiData.title) {
          cleanTitle = aiData.title;
        }

        // AniList returns type TV or MOVIE for anime
        if (aiData.type === 'Movie' && hasMovieKeyword) {
          isMovie = true;
        } else if (aiData.type === 'TV') {
          isAnime = true;
          isMovie = false;
        }

        // If found in iTunes/Wikipedia as Indian/Hollywood Cinema
        if (aiData.studio && /indian cinema|bollywood|hollywood|warner|disney|marvel|t-series|yash raj/i.test(aiData.studio)) {
          isMovie = true;
          isAnime = false;
        }
      }
    } catch (err) {
      console.warn('[AiClassifier] AI enricher lookup warning:', err.message);
    }

    // Default episode number to 1 if it is an Anime series without explicit number
    if (isAnime && detectedEp === null) {
      detectedEp = 1;
    }

    // 7. Format Target Filename & Directory strictly as requested
    let targetDir = '';
    let targetFileName = '';
    let categoryLabel = '';

    if (isAnime) {
      categoryLabel = '🎌 Anime Series';
      targetDir = this.ANIME_BASE_DIR;
      // Format: "Naruto Ep 1.mp4"
      targetFileName = `${cleanTitle} Ep ${detectedEp}.mp4`;
    } else {
      categoryLabel = '🎬 Movie';
      targetDir = this.MOVIE_BASE_DIR;
      // Format: "Jawan (2023).mp4" or "Jawan.mp4"
      targetFileName = year ? `${cleanTitle} (${year}).mp4` : `${cleanTitle}.mp4`;
    }

    // Sanitize illegal filesystem characters for Android/Linux
    targetFileName = targetFileName.replace(/[/\\?%*:|"<>]/g, '').trim();

    return {
      category: isAnime ? 'anime' : 'movie',
      categoryLabel,
      isAnime,
      isMovie,
      title: cleanTitle,
      episodeNumber: isAnime ? detectedEp : 1,
      year: year || null,
      audio,
      targetDir,
      targetFileName,
      targetPath: `${targetDir}/${targetFileName}`,
      fileSize: fileSize || 0,
      originalName: filename || caption || 'video.mp4'
    };
  }
}

const aiClassifierService = new AiClassifierService();

module.exports = aiClassifierService;
