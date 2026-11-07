// APEX Batch Video Upload & Smart AI Episode Parser Component
import { api } from '../api.js';
import { Toast } from './toast.js';

/**
 * Intelligent Anime & Episode parser from filename
 * Supports both: Series Mode (Episodes 1 to 10) & Movie Mode (Full Movies)
 */
export function parseAnimeFilename(filename, isMovie = false) {
  if (!filename) return { animeTitle: '', episodeNumber: 1, audio: 'ja', cleanTitle: '' };

  // Remove extension (.mp4, .mkv, .avi, etc.)
  let clean = filename.replace(/\.[a-zA-Z0-9]{2,5}$/, '');

  // Detect Audio
  let audio = 'ja';
  let audioLabel = 'Japanese (Original)';
  if (/\b(hindi|dubbed_hindi|hin)\b/i.test(clean)) {
    audio = 'hi';
    audioLabel = 'Hindi Dub';
  } else if (/\b(english|eng|dub|dubbed)\b/i.test(clean)) {
    audio = 'en';
    audioLabel = 'English Dub';
  }

  // Remove release groups like [SubsPlease], [Judas], [AnimeTime], (1080p), etc.
  clean = clean
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^\)]*(?:1080p|720p|480p|4k|hevc|x264|x265|aac|bluray|web-dl)[^\)]*\)/gi, ' ')
    .replace(/\b(1080p|720p|480p|4k|2160p|hevc|x264|x265|bluray|bdrip|web-dl|webrip|aac|flac|dual-audio|multi-audio|hindi|english|dub|sub)\b/gi, ' ')
    .replace(/[._]/g, ' ')
    .trim();

  if (isMovie) {
    // In Movie Mode, the whole cleaned string is the Movie Title
    let movieTitle = clean
      .replace(/[-–_]+$/, '')
      .replace(/^[-–_]+/, '')
      .trim();

    movieTitle = movieTitle
      .split(' ')
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ') || 'Anime Movie';

    return {
      animeTitle: movieTitle,
      episodeNumber: 1,
      episodeTitle: `${movieTitle} (Full Movie)`,
      audio,
      audioLabel,
      originalName: filename,
      isMovie: true
    };
  }

  // Series Mode: Extract Episode Number
  let episodeNumber = 1;
  let epMatch = null;

  // Pattern 1: Ep / Episode / E followed by numbers: "Episode 05", "EP 10", "E01"
  epMatch = clean.match(/(?:ep|episode|eps)[.\s_-]*(\d+)/i);
  if (!epMatch) {
    // Pattern 2: S01E05
    epMatch = clean.match(/s\d+[.\s_-]*e(\d+)/i);
  }
  if (!epMatch) {
    // Pattern 3: Separator with number: " - 05 ", " - 10"
    epMatch = clean.match(/(?:^|[\s–-])(\d{1,4})(?:v\d)?(?:[\s–-]|$)/);
  }
  if (!epMatch) {
    // Pattern 4: Fallback any stand-alone number
    epMatch = clean.match(/\b(\d+)\b/);
  }

  if (epMatch) {
    episodeNumber = parseInt(epMatch[1], 10) || 1;
  }

  // Extract Anime Title: text before the episode number
  let animeTitle = clean;
  if (epMatch && epMatch.index !== undefined) {
    animeTitle = clean.slice(0, epMatch.index).trim();
  }

  animeTitle = animeTitle
    .replace(/[-–_]+$/, '')
    .replace(/^[-–_]+/, '')
    .trim();

  if (!animeTitle || animeTitle.length < 2) {
    animeTitle = clean.replace(/\d+/g, '').replace(/[-–_]/g, ' ').trim() || 'Anime Series';
  }

  animeTitle = animeTitle
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  return {
    animeTitle,
    episodeNumber,
    episodeTitle: `Episode ${episodeNumber}`,
    audio,
    audioLabel,
    originalName: filename,
    isMovie: false
  };
}

function formatSize(bytes) {
  if (!bytes) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  return `${mb.toFixed(1)} MB`;
}

/**
 * Render the Batch MP4 Upload UI Section
 */
export function renderBatchUploadSection(container, onCompleted) {
  let selectedFiles = [];
  let aiMetadata = null;
  let isUploading = false;
  let activeMode = 'series'; // 'series' or 'movie'

  container.innerHTML = `
    <div class="space-y-6">
      
      <!-- Top Mode Selector & Banner -->
      <div class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-900/40 via-pink-900/30 to-[#0e1017] border border-pink-500/20 p-6">
        <div class="relative z-10 space-y-4">
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/20 text-apex-pink text-xs font-bold uppercase tracking-wider mb-2">
                <i data-lucide="sparkles" class="w-3.5 h-3.5"></i> AI-Powered Batch Video Ingestion
              </div>
              <h2 id="batch-headline" class="text-2xl font-black text-white">Multi MP4 File Uploader & Episode Detector</h2>
              <p id="batch-subheadline" class="text-sm text-gray-300 mt-1 max-w-2xl">
                Phone File Manager se ek sath multiple MP4 files (1 se 40+ episodes tak) select karein. AI auto-detect karega!
              </p>
            </div>

            <!-- Choose Mode Toggle (Series vs Movie) -->
            <div class="flex items-center gap-2 p-1.5 bg-black/60 rounded-2xl border border-white/10 w-fit">
              <button id="mode-series-btn" class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all bg-blue-600 text-white shadow-lg shadow-blue-500/30 cursor-pointer">
                <i data-lucide="tv" class="w-4 h-4"></i> 📺 Anime Series Mode
              </button>
              <button id="mode-movie-btn" class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all text-gray-400 hover:text-white cursor-pointer">
                <i data-lucide="film" class="w-4 h-4"></i> 🎬 Movie Mode
              </button>
            </div>
          </div>

          <!-- Dual Select Buttons: File Manager vs Gallery -->
          <div class="pt-2 flex flex-wrap items-center gap-3">
            <!-- Button 1: True Android File Manager (accept="*/*") -->
            <button id="batch-open-filemanager-btn" class="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 font-bold text-white shadow-lg shadow-emerald-500/20 flex items-center gap-2.5 transition-all transform active:scale-95 cursor-pointer">
              <i data-lucide="folder-open" class="w-5 h-5"></i> 📁 Open Phone File Manager (All Folders)
            </button>

            <!-- Button 2: Video Gallery Picker (accept="video/*") -->
            <button id="batch-open-gallery-btn" class="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-white border border-white/10 flex items-center gap-2.5 transition-all transform active:scale-95 cursor-pointer">
              <i data-lucide="video" class="w-5 h-5 text-apex-pink"></i> 🎞️ Select from Video Gallery
            </button>

            <!-- Hidden Inputs for Android -->
            <input type="file" id="batch-filemanager-input" multiple accept="*/*" class="hidden" />
            <input type="file" id="batch-gallery-input" multiple accept="video/mp4,video/*,.mp4,.mkv,.webm" class="hidden" />
          </div>
        </div>
      </div>

      <!-- Mode explanation banner -->
      <div id="batch-mode-indicator-box" class="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-center gap-2.5">
        <i data-lucide="info" class="w-4 h-4 flex-shrink-0 text-blue-400"></i>
        <span id="batch-mode-desc">
          <strong>📺 Anime Series Mode Active:</strong> Filename se Episode 1, 2, ... 40+ auto-detect hoga aur ek Anime Folder me add hoga.
        </span>
      </div>

      <!-- File Manager Dropzone (Shown when no files selected) -->
      <div id="batch-dropzone" class="border-2 border-dashed border-white/10 hover:border-pink-500/50 rounded-2xl p-10 text-center transition-all cursor-pointer bg-white/[0.02] hover:bg-white/[0.04]">
        <div class="w-16 h-16 rounded-2xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mx-auto text-apex-pink mb-4">
          <i data-lucide="folder-up" class="w-8 h-8"></i>
        </div>
        <h3 class="text-lg font-bold text-white mb-1">Click to Open Phone File Manager</h3>
        <p class="text-xs text-gray-400 max-w-md mx-auto mb-4">
          Apne phone ke <strong>Downloads</strong>, <strong>Internal Storage</strong> ya <strong>SD Card</strong> me jakar multiple MP4 files (1 se 40+ tak) select karein!
        </p>
        <div class="flex items-center justify-center gap-3 text-xs">
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 font-semibold">
            <i data-lucide="check" class="w-3.5 h-3.5 text-emerald-400"></i> File Manager Supported
          </span>
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 font-semibold">
            <i data-lucide="check" class="w-3.5 h-3.5 text-apex-cyan"></i> Auto 1 to 40+ Episodes
          </span>
          <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-gray-300 font-semibold">
            <i data-lucide="check" class="w-3.5 h-3.5 text-purple-400"></i> Full Movie Mode
          </span>
        </div>
      </div>

      <!-- Main Staging Workspace (Hidden until files chosen) -->
      <div id="batch-staging-workspace" class="hidden space-y-6">

        <!-- AI Detected Anime / Movie Banner Card -->
        <div id="batch-ai-card" class="glass-panel rounded-2xl p-5 border border-white/10 relative overflow-hidden">
          <div id="batch-banner-backdrop" class="absolute inset-0 bg-cover bg-center opacity-20 filter blur-sm pointer-events-none transition-all"></div>
          <div class="relative z-10 flex flex-col md:flex-row gap-5 items-start">
            <img id="batch-poster-img" src="https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600" class="w-24 md:w-32 aspect-[2/3] object-cover rounded-xl shadow-lg border border-white/10 flex-shrink-0" />
            <div class="flex-grow space-y-3 min-w-0">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="flex-grow">
                  <label id="batch-title-label" class="block text-xs font-bold uppercase tracking-wider text-apex-pink mb-1">
                    Detected Anime Series Title (Editable)
                  </label>
                  <div class="flex gap-2">
                    <input type="text" id="batch-anime-title-input" class="bg-black/50 border border-white/15 rounded-xl px-4 py-2 text-base font-bold text-white flex-grow focus:outline-none focus:border-apex-pink" />
                    <button id="batch-ai-refresh-btn" class="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-1.5 whitespace-nowrap">
                      <i data-lucide="sparkles" class="w-3.5 h-3.5 text-apex-pink"></i> Refresh AI Data
                    </button>
                  </div>
                </div>
              </div>

              <!-- Metadata pills -->
              <div id="batch-ai-pills" class="flex flex-wrap items-center gap-2 text-xs">
                <span id="batch-ai-type-pill" class="px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-300 font-bold uppercase">TV SERIES</span>
                <span id="batch-ai-score" class="px-2.5 py-1 rounded-md bg-yellow-500/20 text-yellow-300 font-bold">★ 8.8</span>
                <span id="batch-ai-year" class="px-2.5 py-1 rounded-md bg-white/10 text-gray-200 font-semibold">2026</span>
                <span id="batch-ai-studio" class="px-2.5 py-1 rounded-md bg-white/10 text-gray-200">Studio</span>
                <span id="batch-ai-genres" class="px-2.5 py-1 rounded-md bg-pink-500/10 text-apex-pink border border-pink-500/20">Action, Fantasy</span>
              </div>

              <p id="batch-ai-synopsis" class="text-xs text-gray-300 line-clamp-2 leading-relaxed">
                Loading official details from AniList & MAL...
              </p>
            </div>
          </div>
        </div>

        <!-- Batch Queue Header & Controls -->
        <div class="glass-panel rounded-2xl p-5 border border-white/10 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 class="text-lg font-bold text-white flex items-center gap-2">
                <i data-lucide="list-video" class="w-5 h-5 text-apex-pink"></i>
                <span id="batch-queue-title">Selected Queue (0 Files)</span>
              </h3>
              <p id="batch-queue-subtitle" class="text-xs text-gray-400">
                Aap upload se pehle details ko edit ya change kar sakte hain
              </p>
            </div>
            <div class="flex items-center gap-2">
              <button id="batch-clear-btn" class="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 text-xs font-bold transition-colors">
                Clear All
              </button>
              <button id="batch-start-upload-btn" class="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-90 font-bold text-white text-sm shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all cursor-pointer">
                <i data-lucide="play" class="w-4 h-4 fill-current"></i>
                Upload All & Publish Live
              </button>
            </div>
          </div>

          <!-- Overall Progress Bar -->
          <div id="batch-overall-progress-box" class="hidden p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
            <div class="flex items-center justify-between text-xs font-bold">
              <span id="batch-overall-status" class="text-emerald-400 flex items-center gap-1.5">
                <i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Uploading...
              </span>
              <span id="batch-overall-pct" class="text-white font-mono">0%</span>
            </div>
            <div class="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div id="batch-overall-bar" class="h-full bg-gradient-to-r from-apex-pink to-emerald-400 rounded-full transition-all duration-300" style="width: 0%"></div>
            </div>
          </div>

          <!-- Items Table (Scrollable container optimized for 40+ episodes) -->
          <div class="overflow-x-auto max-h-[550px] overflow-y-auto rounded-xl border border-white/5">
            <table class="w-full text-left text-xs">
              <thead class="sticky top-0 bg-[#0d0e17] z-10 shadow-sm border-b border-white/10">
                <tr class="text-gray-400 font-bold uppercase tracking-wider">
                  <th class="py-3 px-3">#</th>
                  <th class="py-3 px-3">File Name</th>
                  <th id="th-ep-num" class="py-3 px-3 w-28">Episode No.</th>
                  <th class="py-3 px-3">Stream / Item Title</th>
                  <th class="py-3 px-3 w-32">Audio</th>
                  <th class="py-3 px-3 w-40">Status</th>
                  <th class="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody id="batch-items-tbody" class="divide-y divide-white/5"></tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  const fileManagerBtn = container.querySelector('#batch-open-filemanager-btn');
  const galleryBtn = container.querySelector('#batch-open-gallery-btn');
  const fileManagerInput = container.querySelector('#batch-filemanager-input');
  const galleryInput = container.querySelector('#batch-gallery-input');
  const dropzone = container.querySelector('#batch-dropzone');
  const stagingWorkspace = container.querySelector('#batch-staging-workspace');
  const itemsTbody = container.querySelector('#batch-items-tbody');
  const queueTitle = container.querySelector('#batch-queue-title');
  const queueSubtitle = container.querySelector('#batch-queue-subtitle');
  const animeTitleInput = container.querySelector('#batch-anime-title-input');
  const titleLabel = container.querySelector('#batch-title-label');
  const refreshAiBtn = container.querySelector('#batch-ai-refresh-btn');
  const clearBtn = container.querySelector('#batch-clear-btn');
  const startUploadBtn = container.querySelector('#batch-start-upload-btn');
  const overallProgressBox = container.querySelector('#batch-overall-progress-box');
  const overallStatus = container.querySelector('#batch-overall-status');
  const overallPct = container.querySelector('#batch-overall-pct');
  const overallBar = container.querySelector('#batch-overall-bar');

  const modeSeriesBtn = container.querySelector('#mode-series-btn');
  const modeMovieBtn = container.querySelector('#mode-movie-btn');
  const modeIndicatorBox = container.querySelector('#batch-mode-indicator-box');
  const modeDesc = container.querySelector('#batch-mode-desc');
  const headline = container.querySelector('#batch-headline');
  const subheadline = container.querySelector('#batch-subheadline');
  const thEpNum = container.querySelector('#th-ep-num');
  const typePill = container.querySelector('#batch-ai-type-pill');

  // Mode Switcher function
  const setMode = (mode) => {
    activeMode = mode;
    const isMov = mode === 'movie';

    if (isMov) {
      modeMovieBtn.className = 'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all bg-purple-600 text-white shadow-lg shadow-purple-500/30 cursor-pointer';
      modeSeriesBtn.className = 'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all text-gray-400 hover:text-white cursor-pointer';
      modeIndicatorBox.className = 'p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300 flex items-center gap-2.5';
      modeDesc.innerHTML = '<strong>🎬 Full Movie Mode Active:</strong> Video direct Full Movie play hogi (bina kisi episode number ke). Catalog me Movie section me dikhegi!';
      headline.textContent = '🎬 Full Movie MP4 Uploader (AI Movie Details)';
      subheadline.textContent = 'Movie MP4 file select karein. AI auto-detect karega movie name, poster aur official details!';
      titleLabel.textContent = 'Movie Name / Title (Editable)';
      thEpNum.textContent = 'Type';
      if (typePill) {
        typePill.textContent = 'FULL MOVIE';
        typePill.className = 'px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-300 font-bold uppercase';
      }
    } else {
      modeSeriesBtn.className = 'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all bg-blue-600 text-white shadow-lg shadow-blue-500/30 cursor-pointer';
      modeMovieBtn.className = 'flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all text-gray-400 hover:text-white cursor-pointer';
      modeIndicatorBox.className = 'p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-center gap-2.5';
      modeDesc.innerHTML = '<strong>📺 Anime Series Mode Active:</strong> Filename se Episode 1, 2, ... 40+ auto-detect hoga aur ek Anime Series Folder me save hoga.';
      headline.textContent = 'Multi MP4 File Uploader & Episode Detector';
      subheadline.textContent = 'Phone File Manager se multiple MP4 files ek sath select karein. AI auto-detect karega!';
      titleLabel.textContent = 'Detected Anime Series Title (Editable)';
      thEpNum.textContent = 'Episode No.';
      if (typePill) {
        typePill.textContent = 'TV SERIES';
        typePill.className = 'px-2.5 py-1 rounded-md bg-blue-500/20 text-blue-300 font-bold uppercase';
      }
    }

    // Re-parse existing files if already chosen
    if (selectedFiles.length > 0) {
      selectedFiles.forEach(item => {
        const parsed = parseAnimeFilename(item.originalName, isMov);
        item.isMovie = isMov;
        item.animeTitle = parsed.animeTitle;
        item.episodeNumber = parsed.episodeNumber;
        item.episodeTitle = parsed.episodeTitle;
      });
      renderQueueTable();
      fetchAiDetails(animeTitleInput.value.trim());
    }
  };

  modeSeriesBtn?.addEventListener('click', () => setMode('series'));
  modeMovieBtn?.addEventListener('click', () => setMode('movie'));

  // Trigger File Manager (accept="*/*")
  fileManagerBtn?.addEventListener('click', () => fileManagerInput.click());
  // Trigger Gallery Picker (accept="video/*")
  galleryBtn?.addEventListener('click', () => galleryInput.click());
  // Dropzone defaults to File Manager
  dropzone?.addEventListener('click', () => fileManagerInput.click());

  fileManagerInput?.addEventListener('change', () => {
    if (fileManagerInput.files && fileManagerInput.files.length > 0) {
      handleFilesSelected(Array.from(fileManagerInput.files));
    }
  });

  galleryInput?.addEventListener('change', () => {
    if (galleryInput.files && galleryInput.files.length > 0) {
      handleFilesSelected(Array.from(galleryInput.files));
    }
  });

  // Drag & drop
  dropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('border-pink-500', 'bg-pink-500/10');
  });
  dropzone?.addEventListener('dragleave', () => {
    dropzone.classList.remove('border-pink-500', 'bg-pink-500/10');
  });
  dropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('border-pink-500', 'bg-pink-500/10');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFilesSelected(Array.from(e.dataTransfer.files));
    }
  });

  function handleFilesSelected(files) {
    // Filter videos by mime or extension
    const validExts = /\.(mp4|mkv|webm|avi|mov|m4v|flv|ts|3gp)$/i;
    const videoFiles = files.filter(f => f.type.startsWith('video/') || validExts.test(f.name));

    if (videoFiles.length === 0) {
      Toast.error('Please select valid MP4 / video files from your file manager!');
      return;
    }

    const isMov = activeMode === 'movie';

    const parsedList = videoFiles.map((file, idx) => {
      const parsed = parseAnimeFilename(file.name, isMov);
      return {
        id: `item_${Date.now()}_${idx}`,
        file,
        originalName: file.name,
        size: formatSize(file.size),
        animeTitle: parsed.animeTitle,
        episodeNumber: parsed.episodeNumber,
        episodeTitle: parsed.episodeTitle,
        audio: parsed.audio,
        audioLabel: parsed.audioLabel,
        isMovie: isMov,
        status: 'pending',
        progress: 0,
        videoUrl: null,
        errorMessage: null
      };
    });

    // Natural sort by episode number in Series mode
    if (!isMov) {
      parsedList.sort((a, b) => a.episodeNumber - b.episodeNumber);
    }

    selectedFiles = parsedList;

    // Detect primary Title
    const titleCounts = {};
    parsedList.forEach(item => {
      titleCounts[item.animeTitle] = (titleCounts[item.animeTitle] || 0) + 1;
    });
    const primaryTitle = Object.keys(titleCounts).reduce((a, b) => titleCounts[a] > titleCounts[b] ? a : b, parsedList[0].animeTitle);

    animeTitleInput.value = primaryTitle;

    dropzone.classList.add('hidden');
    stagingWorkspace.classList.remove('hidden');

    renderQueueTable();
    fetchAiDetails(primaryTitle);
  }

  // Fetch AI details
  async function fetchAiDetails(title) {
    if (!title || !title.trim()) return;

    refreshAiBtn.disabled = true;
    refreshAiBtn.innerHTML = `<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Fetching AI Info...`;
    if (window.lucide) window.lucide.createIcons();

    try {
      const res = await api.aiEnrich(title.trim(), 1, activeMode === 'movie');
      aiMetadata = res;

      const posterImg = container.querySelector('#batch-poster-img');
      const backdrop = container.querySelector('#batch-banner-backdrop');
      const score = container.querySelector('#batch-ai-score');
      const year = container.querySelector('#batch-ai-year');
      const studio = container.querySelector('#batch-ai-studio');
      const genres = container.querySelector('#batch-ai-genres');
      const synopsis = container.querySelector('#batch-ai-synopsis');

      if (res.poster_url && posterImg) posterImg.src = res.poster_url;
      if (res.banner_url && backdrop) backdrop.style.backgroundImage = `url('${res.banner_url}')`;
      if (score) score.textContent = `★ ${res.rating || 8.8}`;
      if (year) year.textContent = res.year || new Date().getFullYear();
      if (studio) studio.textContent = res.studio || 'Studio';
      if (genres) genres.textContent = (res.genres || ['Anime']).join(', ');
      if (synopsis) synopsis.textContent = res.synopsis || `Watch ${title} online in HD on APEX.`;

      Toast.success(`✨ Official HD Banner & details auto-fetched for "${res.title || title}"!`);
    } catch (err) {
      console.warn('AI enrich error:', err);
      Toast.warning('Could not auto-fetch official metadata. You can still upload normally.');
    } finally {
      refreshAiBtn.disabled = false;
      refreshAiBtn.innerHTML = `<i data-lucide="sparkles" class="w-3.5 h-3.5 text-apex-pink"></i> Refresh AI Data`;
      if (window.lucide) window.lucide.createIcons();
    }
  }

  refreshAiBtn?.addEventListener('click', () => {
    fetchAiDetails(animeTitleInput.value.trim());
  });

  // Render Queue Table
  function renderQueueTable() {
    const isMov = activeMode === 'movie';
    queueTitle.textContent = isMov
      ? `Selected Movies Queue (${selectedFiles.length} Movie${selectedFiles.length > 1 ? 's' : ''})`
      : `Selected Episodes Queue (${selectedFiles.length} Episodes)`;

    itemsTbody.innerHTML = selectedFiles.map((item, idx) => `
      <tr id="row-${item.id}" class="hover:bg-white/[0.02] transition-colors">
        <td class="py-3 px-3 font-mono text-gray-500 font-bold">${idx + 1}</td>
        <td class="py-3 px-3">
          <div class="font-semibold text-white truncate max-w-xs" title="${item.originalName}">${item.originalName}</div>
          <div class="text-[10px] text-gray-400 font-mono">${item.size}</div>
        </td>
        <td class="py-3 px-3">
          ${isMov
            ? `<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-500/20 text-purple-300 font-bold text-[11px] uppercase"><i data-lucide="film" class="w-3 h-3"></i> Full Movie</span>`
            : `<input type="number" min="1" max="9999" value="${item.episodeNumber}" class="ep-num-input w-20 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-center font-bold text-white focus:outline-none focus:border-apex-pink" data-id="${item.id}" ${isUploading ? 'disabled' : ''} />`
          }
        </td>
        <td class="py-3 px-3">
          <input type="text" value="${item.episodeTitle}" class="ep-title-input bg-black/40 border border-white/10 rounded-lg px-2.5 py-1 text-xs text-gray-200 focus:outline-none focus:border-apex-pink w-full min-w-[130px]" data-id="${item.id}" ${isUploading ? 'disabled' : ''} />
        </td>
        <td class="py-3 px-3">
          <select class="ep-audio-select bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-apex-pink cursor-pointer" data-id="${item.id}" ${isUploading ? 'disabled' : ''}>
            <option value="hi" ${item.audio === 'hi' ? 'selected' : ''}>🇮🇳 Hindi Dub</option>
            <option value="en" ${item.audio === 'en' ? 'selected' : ''}>🇬🇧 English Dub</option>
            <option value="ja" ${item.audio === 'ja' ? 'selected' : ''}>🇯🇵 Japanese (Sub)</option>
          </select>
        </td>
        <td class="py-3 px-3">
          <div id="status-box-${item.id}">
            ${renderItemStatus(item)}
          </div>
        </td>
        <td class="py-3 px-3 text-right">
          <button class="remove-item-btn p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors" data-id="${item.id}" ${isUploading ? 'disabled' : ''} title="Remove this file">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </td>
      </tr>
    `).join('');

    if (window.lucide) window.lucide.createIcons();

    // Attach listeners
    itemsTbody.querySelectorAll('.ep-num-input').forEach(input => {
      input.addEventListener('change', () => {
        const item = selectedFiles.find(f => f.id === input.dataset.id);
        if (item) {
          item.episodeNumber = parseInt(input.value, 10) || 1;
          item.episodeTitle = `Episode ${item.episodeNumber}`;
          const titleInput = itemsTbody.querySelector(`.ep-title-input[data-id="${item.id}"]`);
          if (titleInput) titleInput.value = item.episodeTitle;
        }
      });
    });

    itemsTbody.querySelectorAll('.ep-title-input').forEach(input => {
      input.addEventListener('change', () => {
        const item = selectedFiles.find(f => f.id === input.dataset.id);
        if (item) item.episodeTitle = input.value.trim();
      });
    });

    itemsTbody.querySelectorAll('.ep-audio-select').forEach(select => {
      select.addEventListener('change', () => {
        const item = selectedFiles.find(f => f.id === select.dataset.id);
        if (item) item.audio = select.value;
      });
    });

    itemsTbody.querySelectorAll('.remove-item-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedFiles = selectedFiles.filter(f => f.id !== btn.dataset.id);
        if (selectedFiles.length === 0) {
          dropzone.classList.remove('hidden');
          stagingWorkspace.classList.add('hidden');
        } else {
          renderQueueTable();
        }
      });
    });
  }

  function renderItemStatus(item) {
    if (item.status === 'pending') {
      return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/5 text-gray-400 font-semibold text-[11px]"><i data-lucide="clock" class="w-3 h-3"></i> Ready</span>`;
    }
    if (item.status === 'uploading') {
      return `
        <div class="space-y-1">
          <div class="flex items-center justify-between text-[10px]">
            <span class="text-pink-400 font-bold flex items-center gap-1"><i data-lucide="loader" class="w-3 h-3 animate-spin"></i> Uploading...</span>
            <span class="font-mono text-white">${item.progress}%</span>
          </div>
          <div class="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div class="h-full bg-apex-pink rounded-full transition-all" style="width: ${item.progress}%"></div>
          </div>
        </div>
      `;
    }
    if (item.status === 'published') {
      return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[11px]"><i data-lucide="check-circle" class="w-3 h-3"></i> Live on Site!</span>`;
    }
    if (item.status === 'error') {
      return `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-500/10 text-red-400 border border-red-500/20 font-bold text-[11px]" title="${item.errorMessage || ''}"><i data-lucide="alert-circle" class="w-3 h-3"></i> Failed</span>`;
    }
    return '';
  }

  clearBtn?.addEventListener('click', () => {
    if (isUploading) return;
    selectedFiles = [];
    dropzone.classList.remove('hidden');
    stagingWorkspace.classList.add('hidden');
    fileManagerInput.value = '';
    galleryInput.value = '';
  });

  // Start Batch Upload
  startUploadBtn?.addEventListener('click', async () => {
    if (isUploading || selectedFiles.length === 0) return;

    const baseTitle = animeTitleInput.value.trim();
    if (!baseTitle) {
      Toast.error('Please enter the Title first!');
      animeTitleInput.focus();
      return;
    }

    isUploading = true;
    startUploadBtn.disabled = true;
    clearBtn.disabled = true;
    overallProgressBox.classList.remove('hidden');

    let completedCount = 0;
    const totalFiles = selectedFiles.length;
    const isMov = activeMode === 'movie';

    for (let i = 0; i < totalFiles; i++) {
      const item = selectedFiles[i];

      const currentTitle = isMov && selectedFiles.length > 1
        ? (item.animeTitle || baseTitle)
        : baseTitle;

      overallStatus.innerHTML = `<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Uploading ${isMov ? 'Movie' : 'Ep ' + item.episodeNumber} (${i + 1} of ${totalFiles})...`;
      const overallPercent = Math.round((completedCount / totalFiles) * 100);
      overallPct.textContent = `${overallPercent}%`;
      overallBar.style.width = `${overallPercent}%`;
      if (window.lucide) window.lucide.createIcons();

      item.status = 'uploading';
      item.progress = 0;
      updateRowStatus(item);

      try {
        // Step 1: Raw video stream upload
        const uploadRes = await api.uploadVideo(item.file, (pct) => {
          item.progress = pct;
          updateRowStatus(item);
        });

        item.videoUrl = uploadRes.url;

        // Step 2: Auto-Publish
        await api.quickPublish({
          title: currentTitle,
          content_type: isMov ? 'movie' : 'series',
          type: isMov ? 'Movie' : 'TV',
          episode_number: isMov ? 1 : item.episodeNumber,
          episode_title: isMov ? (item.episodeTitle || `${currentTitle} (Full Movie)`) : item.episodeTitle,
          stream_url: uploadRes.url,
          audio: item.audio,
          quality: '1080p',
          poster_url: aiMetadata?.poster_url,
          banner_url: aiMetadata?.banner_url,
          genres: aiMetadata?.genres
        });

        item.status = 'published';
        completedCount++;
      } catch (err) {
        console.error(`Error uploading ${item.originalName}:`, err);
        item.status = 'error';
        item.errorMessage = err.message || 'Upload failed';
      }

      updateRowStatus(item);
    }

    isUploading = false;
    startUploadBtn.disabled = false;
    clearBtn.disabled = false;
    overallPct.textContent = '100%';
    overallBar.style.width = '100%';
    overallStatus.innerHTML = `<i data-lucide="check-circle" class="w-3.5 h-3.5 text-emerald-400"></i> All ${completedCount} of ${totalFiles} ${isMov ? 'Movies' : 'Episodes'} Published Successfully!`;
    if (window.lucide) window.lucide.createIcons();

    Toast.success(`🎉 ${completedCount} ${isMov ? 'movies' : 'episodes'} are now LIVE on APEX!`);

    if (onCompleted) {
      onCompleted(baseTitle);
    }
  });

  function updateRowStatus(item) {
    const box = container.querySelector(`#status-box-${item.id}`);
    if (box) {
      box.innerHTML = renderItemStatus(item);
      if (window.lucide) window.lucide.createIcons();
    }
  }
}
