import { api } from '../api.js';
import { state } from '../state.js';
import { router } from '../router.js';
import { Toast } from '../components/toast.js';
import { renderBatchUploadSection } from '../components/batchUpload.js';

function statCard(icon, label, value, color = 'text-apex-pink') {
  return `
    <div class="glass-panel rounded-xl p-5 flex items-center gap-4">
      <div class="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center ${color}">
        <i data-lucide="${icon}" class="w-6 h-6"></i>
      </div>
      <div>
        <div class="text-2xl font-black text-white">${typeof value === 'number' ? value.toLocaleString() : value}</div>
        <div class="text-xs text-gray-400 font-semibold uppercase tracking-wider">${label}</div>
      </div>
    </div>
  `;
}

function renderAnimeForm(existingAnime = null) {
  const a = existingAnime || {};
  return `
    <form id="anime-form" class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="md:col-span-2">
          <label class="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Title *</label>
          <input type="text" name="title" value="${a.title || ''}" required placeholder="e.g. Solo Leveling, Jawan, Inception" class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-apex-pink transition-colors text-white font-bold" />
        </div>

        <!-- Interactive Visual Banner & Poster Customizer Card -->
        <div class="md:col-span-2 p-4 rounded-xl bg-black/50 border border-white/10 space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <span class="text-xs font-bold uppercase tracking-wider text-apex-pink flex items-center gap-1.5">
              <i data-lucide="image" class="w-4 h-4"></i> Banner & Poster Artwork Customizer
            </span>
            <button type="button" id="edit-ai-fetch-banner-btn" class="px-3 py-1 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 text-apex-pink font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors">
              <i data-lucide="sparkles" class="w-3.5 h-3.5"></i> ✨ AI Auto-Find Official Banner
            </button>
          </div>

          <!-- Live Visual Preview of Banner with Poster overlay -->
          <div class="relative w-full h-36 sm:h-44 rounded-xl overflow-hidden border border-white/10 bg-black/60 flex items-end p-3">
            <img id="edit-banner-preview-img" src="${a.banner_url || a.poster_url || 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1920'}" class="absolute inset-0 w-full h-full object-cover filter brightness-75 transition-all" onerror="this.src='https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1920'" />
            <div class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent"></div>
            
            <div class="relative z-10 flex items-center gap-3">
              <img id="edit-poster-preview-img" src="${a.poster_url || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600'}" class="w-14 sm:w-16 aspect-[2/3] object-cover rounded-lg border border-white/20 shadow-md flex-shrink-0" onerror="this.src='https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600'" />
              <div class="text-white min-w-0">
                <span class="text-[10px] uppercase font-bold text-apex-pink px-2 py-0.5 rounded bg-black/70 border border-white/10">Live Banner Preview</span>
                <p id="edit-preview-title" class="font-bold text-sm truncate max-w-xs sm:max-w-md mt-0.5">${a.title || 'Anime / Movie Title'}</p>
              </div>
            </div>
          </div>

          <!-- Banner & Poster inputs with file upload buttons -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                Banner URL (Wide Landscape 16:9)
              </label>
              <div class="flex gap-1.5">
                <input type="url" name="banner_url" id="edit-banner-url-input" value="${a.banner_url || ''}" placeholder="Paste URL or Upload..." class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-apex-pink text-white font-mono" />
                <button type="button" id="edit-upload-banner-btn" class="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-1.5 whitespace-nowrap cursor-pointer">
                  <i data-lucide="upload" class="w-3.5 h-3.5"></i> Upload Image
                </button>
                <input type="file" id="edit-banner-file-input" accept="image/*" class="hidden" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">
                Poster URL (Portrait Cover)
              </label>
              <div class="flex gap-1.5">
                <input type="url" name="poster_url" id="edit-poster-url-input" value="${a.poster_url || ''}" placeholder="Paste URL or Upload..." class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-apex-pink text-white font-mono" />
                <button type="button" id="edit-upload-poster-btn" class="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-bold text-white flex items-center gap-1.5 whitespace-nowrap cursor-pointer">
                  <i data-lucide="upload" class="w-3.5 h-3.5"></i> Upload Image
                </button>
                <input type="file" id="edit-poster-file-input" accept="image/*" class="hidden" />
              </div>
            </div>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Original / Japanese / Sub Title</label>
          <input type="text" name="japanese_title" value="${a.japanese_title || ''}" placeholder="Original language title..." class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-apex-pink transition-colors text-white" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Studio / Production House</label>
          <input type="text" name="studio" value="${a.studio || ''}" placeholder="e.g. YRF, Marvel Studios, A-1 Pictures" class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-apex-pink transition-colors text-white" />
        </div>
        <div class="md:col-span-2">
          <label class="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Synopsis / Storyline</label>
          <textarea name="synopsis" rows="3" placeholder="Movie or Series storyline..." class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-apex-pink transition-colors resize-none text-white">${a.synopsis || ''}</textarea>
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Status</label>
          <select name="status" class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-apex-pink cursor-pointer text-white">
            ${['Completed', 'Airing', 'Upcoming'].map(s => `<option value="${s}" ${a.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Type</label>
          <select name="type" class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-apex-pink cursor-pointer text-white">
            ${['TV', 'Movie', 'OVA', 'ONA', 'Special'].map(t => `<option value="${t}" ${a.type === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Season</label>
          <select name="season" class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-apex-pink cursor-pointer text-white">
            ${['Winter', 'Spring', 'Summer', 'Fall'].map(s => `<option value="${s}" ${a.season === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Year</label>
          <input type="number" name="year" value="${a.year || new Date().getFullYear()}" min="1950" max="2035" class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-apex-pink text-white" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Rating (0-10)</label>
          <input type="number" name="rating" value="${a.rating || 8.0}" min="0" max="10" step="0.1" class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-apex-pink text-white" />
        </div>
        <div class="md:col-span-2">
          <label class="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Genres (comma separated)</label>
          <input type="text" name="genres" value="${Array.isArray(a.genres) ? a.genres.join(', ') : (a.genres || '')}" placeholder="Action, Drama, Thriller, Bollywood, Sci-Fi" class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-apex-pink text-white" />
        </div>
      </div>
      <div class="flex flex-wrap gap-4 pt-2">
        <label class="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" name="has_sub" ${a.has_sub !== false ? 'checked' : ''} class="accent-apex-pink"> Has Sub</label>
        <label class="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" name="has_dub" ${a.has_dub ? 'checked' : ''} class="accent-apex-pink"> Has Dub (English)</label>
        <label class="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" name="has_hindi_dub" ${a.has_hindi_dub ? 'checked' : ''} class="accent-apex-pink"> Has Hindi Dub</label>
        <label class="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" name="featured" ${a.featured ? 'checked' : ''} class="accent-apex-pink"> Featured (Hero Banner)</label>
        <label class="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" name="published" ${a.published !== false ? 'checked' : ''} class="accent-apex-pink"> Published</label>
      </div>
    </form>
  `;
}

function attachAnimeFormHandlers(container, existingAnime = null) {
  const bannerInput = container.querySelector('#edit-banner-url-input');
  const posterInput = container.querySelector('#edit-poster-url-input');
  const bannerImg = container.querySelector('#edit-banner-preview-img');
  const posterImg = container.querySelector('#edit-poster-preview-img');
  const titleInput = container.querySelector('input[name="title"]');
  const previewTitle = container.querySelector('#edit-preview-title');

  // Title sync
  titleInput?.addEventListener('input', () => {
    if (previewTitle) previewTitle.textContent = titleInput.value || 'Title';
  });

  // Live preview for Banner URL
  bannerInput?.addEventListener('input', () => {
    const val = bannerInput.value.trim();
    if (bannerImg && val) bannerImg.src = val;
  });

  // Live preview for Poster URL
  posterInput?.addEventListener('input', () => {
    const val = posterInput.value.trim();
    if (posterImg && val) posterImg.src = val;
  });

  // Banner file upload from Phone
  const uploadBannerBtn = container.querySelector('#edit-upload-banner-btn');
  const bannerFileInput = container.querySelector('#edit-banner-file-input');

  uploadBannerBtn?.addEventListener('click', () => bannerFileInput?.click());

  bannerFileInput?.addEventListener('change', async () => {
    const file = bannerFileInput.files?.[0];
    if (!file) return;

    uploadBannerBtn.disabled = true;
    uploadBannerBtn.innerHTML = `<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Uploading...`;
    if (window.lucide) window.lucide.createIcons();

    try {
      const res = await api.uploadVideo(file);
      if (res && res.url) {
        bannerInput.value = res.url;
        if (bannerImg) bannerImg.src = res.url;
        Toast.success('✓ New banner image uploaded and applied!');
      }
    } catch (err) {
      Toast.error('Banner upload failed: ' + err.message);
    } finally {
      uploadBannerBtn.disabled = false;
      uploadBannerBtn.innerHTML = `<i data-lucide="upload" class="w-3.5 h-3.5"></i> Upload Image`;
      if (window.lucide) window.lucide.createIcons();
    }
  });

  // Poster file upload from Phone
  const uploadPosterBtn = container.querySelector('#edit-upload-poster-btn');
  const posterFileInput = container.querySelector('#edit-poster-file-input');

  uploadPosterBtn?.addEventListener('click', () => posterFileInput?.click());

  posterFileInput?.addEventListener('change', async () => {
    const file = posterFileInput.files?.[0];
    if (!file) return;

    uploadPosterBtn.disabled = true;
    uploadPosterBtn.innerHTML = `<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Uploading...`;
    if (window.lucide) window.lucide.createIcons();

    try {
      const res = await api.uploadVideo(file);
      if (res && res.url) {
        posterInput.value = res.url;
        if (posterImg) posterImg.src = res.url;
        Toast.success('✓ New poster image uploaded and applied!');
      }
    } catch (err) {
      Toast.error('Poster upload failed: ' + err.message);
    } finally {
      uploadPosterBtn.disabled = false;
      uploadPosterBtn.innerHTML = `<i data-lucide="upload" class="w-3.5 h-3.5"></i> Upload Image`;
      if (window.lucide) window.lucide.createIcons();
    }
  });

  // AI Auto-Find Official Banner & Poster
  const aiFetchBtn = container.querySelector('#edit-ai-fetch-banner-btn');
  aiFetchBtn?.addEventListener('click', async () => {
    const title = titleInput?.value?.trim();
    if (!title) {
      Toast.error('Please enter the Title first!');
      titleInput?.focus();
      return;
    }

    const typeSelect = container.querySelector('select[name="type"]');
    const isMovie = typeSelect ? typeSelect.value === 'Movie' : false;

    aiFetchBtn.disabled = true;
    aiFetchBtn.innerHTML = `<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Searching Official Banner...`;
    if (window.lucide) window.lucide.createIcons();

    try {
      const res = await api.aiEnrich(title, 1, isMovie);
      if (res && res.found) {
        if (res.banner_url) {
          bannerInput.value = res.banner_url;
          if (bannerImg) bannerImg.src = res.banner_url;
        }
        if (res.poster_url) {
          posterInput.value = res.poster_url;
          if (posterImg) posterImg.src = res.poster_url;
        }
        const synInput = container.querySelector('textarea[name="synopsis"]');
        if (synInput && (!synInput.value.trim() || synInput.value.length < 20) && res.synopsis) {
          synInput.value = res.synopsis;
        }
        Toast.success(`✨ Official HD Banner & Poster auto-fetched for "${res.title || title}"!`);
      } else {
        Toast.warning('Could not find official artwork automatically. You can upload an image or paste a URL.');
      }
    } catch (err) {
      Toast.error('AI fetch failed: ' + err.message);
    } finally {
      aiFetchBtn.disabled = false;
      aiFetchBtn.innerHTML = `<i data-lucide="sparkles" class="w-3.5 h-3.5"></i> ✨ AI Auto-Find Official Banner`;
      if (window.lucide) window.lucide.createIcons();
    }
  });
}

function renderEpisodeForm(animeId = '', existingEp = null) {
  const ep = existingEp || {};
  const src = ep.sources?.[0] || {};
  const videoUrl = ep.video_url || src.url || '';
  const audio = src.audio || 'hi';
  const quality = src.quality || '1080p';
  const server = src.server || 'Telegram Fast Server';

  return `
    <form id="episode-form" class="space-y-4">
      <input type="hidden" name="anime_id" value="${animeId}" />
      <div class="grid grid-cols-2 gap-4">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">Episode Number *</label>
          <input type="number" name="episode_number" id="edit-ep-num" value="${ep.episode_number || 1}" min="0" step="0.5" required class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-apex-pink text-white font-mono" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">Duration (mm:ss)</label>
          <input type="text" name="duration" id="edit-ep-duration" value="${ep.duration || '24:00'}" placeholder="24:00" class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-apex-pink text-white" />
        </div>
        <div class="col-span-2">
          <label class="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">Episode Title</label>
          <input type="text" name="title" id="edit-ep-title" value="${ep.title || ''}" placeholder="e.g. Enter Naruto Uzumaki!" class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-apex-pink text-white" />
        </div>

        <!-- Video Stream URL with Paste & Upload -->
        <div class="col-span-2">
          <div class="flex items-center justify-between mb-1.5">
            <label class="block text-xs font-bold uppercase tracking-wider text-gray-300">Stream Link or Direct Video Upload *</label>
            <label for="edit-ep-file-upload" class="cursor-pointer text-xs font-bold text-apex-cyan hover:underline flex items-center gap-1 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded">
              <i data-lucide="upload" class="w-3.5 h-3.5"></i> Upload from Phone
            </label>
            <input type="file" id="edit-ep-file-upload" accept="video/*" class="hidden" />
          </div>
          <div class="relative">
            <input type="text" name="video_url" id="edit-ep-video-url" required value="${videoUrl}" placeholder="Paste direct .mp4, Catbox, Streamwish, or upload from phone" class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg py-2.5 pl-4 pr-24 text-sm font-mono text-white focus:outline-none focus:border-apex-pink" />
            <button type="button" id="edit-ep-paste-btn" class="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded transition-colors flex items-center gap-1 cursor-pointer">
              <i data-lucide="clipboard" class="w-3.5 h-3.5"></i> Paste
            </button>
          </div>
          <div id="edit-ep-upload-progress" class="hidden mt-2 p-2.5 bg-black/40 rounded-lg border border-white/10 text-xs">
            <div class="flex justify-between mb-1 text-gray-300">
              <span id="edit-ep-upload-status">Uploading video from phone...</span>
              <span id="edit-ep-upload-pct">0%</span>
            </div>
            <div class="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div id="edit-ep-upload-bar" class="h-full bg-gradient-to-r from-apex-pink to-cyan-400 transition-all duration-150" style="width:0%"></div>
            </div>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">Audio Track</label>
          <select name="audio" id="edit-ep-audio" class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-apex-pink text-white cursor-pointer">
            <option value="hi" ${audio === 'hi' ? 'selected' : ''}>Hindi Dub</option>
            <option value="ja" ${audio === 'ja' ? 'selected' : ''}>Japanese (Original)</option>
            <option value="en" ${audio === 'en' ? 'selected' : ''}>English Dub</option>
          </select>
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">Quality</label>
          <select name="quality" id="edit-ep-quality" class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-apex-pink text-white cursor-pointer">
            <option value="1080p" ${quality === '1080p' ? 'selected' : ''}>1080p FHD</option>
            <option value="720p" ${quality === '720p' ? 'selected' : ''}>720p HD</option>
            <option value="480p" ${quality === '480p' ? 'selected' : ''}>480p SD</option>
            <option value="auto" ${quality === 'auto' ? 'selected' : ''}>Auto Adaptive</option>
          </select>
        </div>

        <div class="col-span-2">
          <label class="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">Server Label Name</label>
          <input type="text" name="server" id="edit-ep-server" value="${server}" class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-apex-pink text-white" />
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">Intro Start (seconds)</label>
          <input type="number" name="intro_start" value="${ep.intro_start !== undefined ? ep.intro_start : 85}" class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-apex-pink text-white font-mono" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">Intro End (seconds)</label>
          <input type="number" name="intro_end" value="${ep.intro_end !== undefined ? ep.intro_end : 175}" class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-apex-pink text-white font-mono" />
        </div>
      </div>
      <label class="flex items-center gap-2 text-sm cursor-pointer pt-2 text-gray-300">
        <input type="checkbox" name="published" ${ep.published !== false ? 'checked' : ''} class="accent-apex-pink"> Published (Visible to users)
      </label>
    </form>
  `;
}

function renderQuickTelegramModal(animeList = [], prefillTitle = '', prefillEpisode = '', defaultType = 'series') {
  const isSeries = defaultType !== 'movie';
  return `
    <form id="quick-stream-form" class="space-y-4">
      <!-- Content Type Selector: Series vs Movie -->
      <div>
        <label class="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">Content Category *</label>
        <div class="grid grid-cols-2 gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
          <label class="flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold cursor-pointer transition-all ${isSeries ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'} qs-type-pill" id="pill-series">
            <input type="radio" name="content_type" value="series" ${isSeries ? 'checked' : ''} class="hidden" id="qs-radio-series">
            <i data-lucide="tv" class="w-4 h-4"></i> 📺 Anime Series (Folder)
          </label>
          <label class="flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold cursor-pointer transition-all ${!isSeries ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-white'} qs-type-pill" id="pill-movie">
            <input type="radio" name="content_type" value="movie" ${!isSeries ? 'checked' : ''} class="hidden" id="qs-radio-movie">
            <i data-lucide="film" class="w-4 h-4"></i> 🎬 Movie (Full Film)
          </label>
        </div>
      </div>

      <div class="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl flex items-start gap-3 text-xs text-blue-300">
        <div class="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0 text-blue-400 mt-0.5">
          <i data-lucide="send" class="w-4 h-4"></i>
        </div>
        <div>
          <strong class="text-blue-200" id="qs-mode-headline">${isSeries ? 'Series Folder Stream' : 'Full Movie Stream'}</strong>
          <p class="text-blue-300/80 mt-0.5" id="qs-mode-desc">
            ${isSeries ? 'Har anime ka folder banega (e.g. Naruto). Us folder me aap Ep 1, Ep 2, Ep 3... kitne bhi episodes add kar sakte hain!' : 'Movie bina kisi episode number ke direct play hogi!'}
          </p>
        </div>
      </div>

      <!-- Title / Folder Name -->
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <label class="block text-xs font-bold uppercase tracking-wider text-gray-300" id="qs-title-label">
            ${isSeries ? 'Anime Series / Folder Name *' : 'Movie Name / Title *'}
          </label>
          <button type="button" id="qs-ai-enrich-btn" class="text-xs font-bold text-apex-pink hover:text-white flex items-center gap-1 bg-pink-500/10 border border-pink-500/30 px-2.5 py-1 rounded transition-all cursor-pointer">
            <i data-lucide="sparkles" class="w-3.5 h-3.5 text-apex-pink"></i> ✨ AI Auto-Fill (Banner & Details)
          </button>
        </div>
        <div class="relative">
          <input type="text" name="title" id="qs-anime-title" value="${prefillTitle || ''}" required list="existing-anime-datalist" placeholder="${isSeries ? 'Pick existing folder or type new name (e.g. Naruto)' : 'Type movie name (e.g. Jujutsu Kaisen 0)'}" class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-apex-pink text-white" />
          <datalist id="existing-anime-datalist">
            ${animeList.map(a => `<option value="${a.title}">${a.type === 'Movie' ? '🎬 Movie' : `📁 ${a.episodes_count || 0} episodes`}</option>`).join('')}
          </datalist>
        </div>
        <div id="qs-folder-indicator" class="hidden mt-1.5 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2"></div>

        <!-- AI Auto-Fetched Preview Card -->
        <div id="qs-ai-preview" class="hidden mt-2 p-3 rounded-xl bg-black/40 border border-pink-500/30 space-y-2 text-xs">
          <div class="flex items-center justify-between text-pink-400 font-bold">
            <span class="flex items-center gap-1.5"><i data-lucide="sparkles" class="w-3.5 h-3.5"></i> AI Auto-Fetched Official Metadata</span>
            <span id="qs-ai-score" class="text-amber-400 font-mono">★ 8.8</span>
          </div>
          <div class="flex gap-3 items-center">
            <img id="qs-ai-poster-img" src="" class="w-12 h-16 object-cover rounded border border-white/10 flex-shrink-0" onerror="this.style.display='none'">
            <div class="min-w-0 flex-grow">
              <p id="qs-ai-preview-title" class="font-bold text-white truncate"></p>
              <p id="qs-ai-preview-meta" class="text-gray-400 text-[11px]"></p>
              <p id="qs-ai-preview-desc" class="text-gray-400 text-[11px] line-clamp-2 mt-0.5"></p>
            </div>
          </div>
          <input type="hidden" name="poster_url" id="qs-ai-poster-input" />
          <input type="hidden" name="banner_url" id="qs-ai-banner-input" />
          <input type="hidden" name="synopsis" id="qs-ai-synopsis-input" />
          <input type="hidden" name="genres" id="qs-ai-genres-input" />
        </div>
      </div>

      <!-- Series Episode Row (Hidden for Movies) -->
      <div id="qs-series-section" class="${isSeries ? '' : 'hidden'} space-y-4">
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">Episode Number *</label>
            <input type="number" name="episode_number" id="qs-ep-num" value="${prefillEpisode || 1}" min="1" step="0.5" class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-apex-pink text-white font-mono" />
          </div>
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">Audio Track</label>
            <select name="audio" class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-apex-pink text-white cursor-pointer">
              <option value="hi" selected>Hindi Dub</option>
              <option value="ja">Japanese (Original)</option>
              <option value="en">English Dub</option>
            </select>
          </div>
        </div>

        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">Episode Title (Optional)</label>
          <input type="text" name="episode_title" id="qs-ep-title" placeholder="e.g. Enter Naruto Uzumaki!" class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-apex-pink text-white" />
        </div>
      </div>

      <!-- Movie Audio Row (Shown when Movie) -->
      <div id="qs-movie-section" class="${!isSeries ? '' : 'hidden'}">
        <label class="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">Movie Audio Track</label>
        <select name="movie_audio" class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-apex-pink text-white cursor-pointer">
          <option value="hi" selected>Hindi Dub</option>
          <option value="ja">Japanese (Original)</option>
          <option value="en">English Dub</option>
        </select>
      </div>

      <!-- Stream URL input with Paste button & Direct Phone Upload -->
      <div>
        <div class="flex items-center justify-between mb-1.5">
          <label class="block text-xs font-bold uppercase tracking-wider text-gray-300">Stream Link or Direct Video Upload *</label>
          <label for="qs-file-upload" class="cursor-pointer text-xs font-bold text-apex-cyan hover:underline flex items-center gap-1 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded">
            <i data-lucide="upload" class="w-3.5 h-3.5"></i> Upload from Phone
          </label>
          <input type="file" id="qs-file-upload" accept="video/*" class="hidden" />
        </div>
        <div class="relative">
          <input type="text" name="stream_url" id="qs-stream-url" required placeholder="Paste direct .mp4, Catbox, Streamwish, or upload from phone" class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg py-2.5 pl-4 pr-24 text-sm font-mono text-white focus:outline-none focus:border-apex-pink" />
          <button type="button" id="qs-paste-btn" class="absolute right-2 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded transition-colors flex items-center gap-1">
            <i data-lucide="clipboard" class="w-3.5 h-3.5"></i> Paste
          </button>
        </div>
        <div id="qs-upload-progress" class="hidden mt-2 p-2.5 bg-black/40 rounded-lg border border-white/10 text-xs">
          <div class="flex justify-between mb-1 text-gray-300">
            <span id="qs-upload-status">Uploading video from phone...</span>
            <span id="qs-upload-pct">0%</span>
          </div>
          <div class="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div id="qs-upload-bar" class="h-full bg-gradient-to-r from-apex-pink to-cyan-400 transition-all duration-150" style="width:0%"></div>
          </div>
        </div>
        <p class="text-[11px] text-gray-400 mt-1">✓ Supports Phone Upload (<code>/videos/...</code>), Direct MP4, Catbox.moe, Streamwish, and HLS (.m3u8).</p>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">Server Label Name</label>
          <input type="text" name="server_name" id="qs-server-name" value="${isSeries ? 'Telegram Fast Server' : 'Telegram Movie Server'}" class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-apex-pink text-white" />
        </div>
        <div>
          <label class="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">Quality</label>
          <select name="quality" class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-apex-pink text-white cursor-pointer">
            <option value="1080p" selected>1080p FHD</option>
            <option value="720p">720p HD</option>
            <option value="480p">480p SD</option>
            <option value="auto">Auto Adaptive</option>
          </select>
        </div>
      </div>
    </form>
  `;
}

function openModal(title, formHtml, onSave, onRender = null) {
  const container = document.getElementById('modal-container');
  container.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal-card p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-black text-white">${title}</h2>
          <button id="close-modal-btn" class="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>
        ${formHtml}
        <div class="flex gap-3 mt-6">
          <button id="modal-save-btn" class="btn-apex-primary flex-grow py-2.5 flex items-center justify-center gap-2">
            <i data-lucide="check" class="w-4 h-4"></i> Save & Publish
          </button>
          <button id="close-modal-btn-2" class="btn-apex-secondary px-6 py-2.5">Cancel</button>
        </div>
      </div>
    </div>
  `;
  if (window.lucide) window.lucide.createIcons();

  const close = () => container.innerHTML = '';
  document.getElementById('close-modal-btn')?.addEventListener('click', close);
  document.getElementById('close-modal-btn-2')?.addEventListener('click', close);
  document.getElementById('modal-backdrop')?.addEventListener('click', (e) => { if (e.target.id === 'modal-backdrop') close(); });

  if (onRender) onRender(container, close);

  document.getElementById('modal-save-btn')?.addEventListener('click', async () => {
    const saveBtn = document.getElementById('modal-save-btn');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Saving...`;
      if (window.lucide) window.lucide.createIcons();
    }
    try {
      const res = await onSave();
      if (res !== false) {
        close();
      }
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = `<i data-lucide="check" class="w-4 h-4"></i> Save & Publish`;
        if (window.lucide) window.lucide.createIcons();
      }
    }
  });
}

function getFormData(formId) {
  const form = document.getElementById(formId);
  if (!form) return {};
  const data = {};
  new FormData(form).forEach((val, key) => { data[key] = val; });
  // Handle unchecked checkboxes
  ['has_sub', 'has_dub', 'has_hindi_dub', 'featured', 'published'].forEach(key => {
    data[key] = form.querySelector(`[name="${key}"]`)?.checked || false;
  });
  return data;
}

export async function renderAdminDashboard(app) {
  if (!state.isAdmin()) {
    router.navigate('/');
    Toast.error('Admin access required');
    return;
  }

  let stats = null;
  let animeList = [];
  let users = [];
  let activeTab = 'dashboard';

  async function loadData() {
    const [statsRes, animeRes, usersRes] = await Promise.allSettled([
      api.getAdminStats(),
      api.getAnimeList({ limit: 100, includeUnpublished: true }),
      api.getAdminUsers()
    ]);
    stats = statsRes.status === 'fulfilled' ? statsRes.value?.stats : null;
    animeList = animeRes.status === 'fulfilled' ? (animeRes.value?.items || []) : [];
    users = usersRes.status === 'fulfilled' ? (usersRes.value?.users || []) : [];
  }

  function renderTabContent(tab) {
    const content = document.getElementById('admin-tab-content');
    if (!content) return;

    if (tab === 'dashboard') {
      content.innerHTML = `
        <div class="space-y-6">
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            ${statCard('users', 'Total Users', stats?.totalUsers || 0, 'text-apex-cyan')}
            ${statCard('film', 'Anime Series', stats?.totalAnime || 0, 'text-apex-pink')}
            ${statCard('play-circle', 'Episodes', stats?.totalEpisodes || 0, 'text-apex-orange')}
            ${statCard('eye', 'Total Views', stats?.totalViews || 0, 'text-apex-purple')}
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Top Anime -->
            <div class="glass-panel rounded-xl p-5">
              <h3 class="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Top Anime by Views</h3>
              <div class="space-y-3">
                ${(stats?.topAnime || []).map((a, i) => `
                  <div class="flex items-center gap-3">
                    <span class="w-6 text-sm font-mono text-apex-pink font-bold">#${i + 1}</span>
                    <div class="flex-grow min-w-0">
                      <p class="text-sm font-semibold text-white truncate">${a.title}</p>
                      <p class="text-xs text-gray-400">${a.views?.toLocaleString() || 0} views • ★ ${a.rating}</p>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- System Info -->
            <div class="glass-panel rounded-xl p-5">
              <h3 class="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">System Status</h3>
              <div class="space-y-3 text-sm">
                ${[
                  ['Node.js', stats?.nodeVersion || 'Unknown'],
                  ['Uptime', `${Math.floor((stats?.serverUptimeSeconds || 0) / 60)} min`],
                  ['Memory Usage', `${stats?.memoryUsageMb || 0} MB`],
                  ['Comments', `${stats?.totalComments || 0} total`]
                ].map(([k, v]) => `
                  <div class="flex items-center justify-between">
                    <span class="text-gray-400">${k}</span>
                    <span class="font-semibold text-white font-mono text-xs">${v}</span>
                  </div>
                `).join('')}
                <div class="flex items-center gap-2 mt-2">
                  <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span class="text-xs text-emerald-400 font-semibold">All Systems Operational</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    } else if (tab === 'anime') {
      let catalogFilter = 'all'; // 'all', 'series', 'movie'
      let catalogSearch = '';

      const filterAnime = () => {
        return animeList.filter(a => {
          const matchType = catalogFilter === 'all' 
            ? true 
            : (catalogFilter === 'movie' ? a.type === 'Movie' : a.type !== 'Movie');
          const matchSearch = !catalogSearch || a.title.toLowerCase().includes(catalogSearch.toLowerCase());
          return matchType && matchSearch;
        });
      };

      const openQuickPublish = (prefillTitle = '', prefillEpisode = '', defaultType = 'series') => {
        openModal('Add Telegram / 3rd Party Stream Link', renderQuickTelegramModal(animeList, prefillTitle, prefillEpisode, defaultType), async () => {
          const data = getFormData('quick-stream-form');
          const isMovie = data.content_type === 'movie';
          if (!data.title?.trim() || !data.stream_url?.trim()) {
            Toast.error('Anime title and Stream URL are required!');
            return false;
          }
          if (isMovie) {
            data.type = 'Movie';
            data.audio = data.movie_audio || data.audio || 'hi';
            data.episode_number = 1;
            data.episode_title = data.episode_title || `${data.title.trim()} (Full Movie)`;
          }
          try {
            const res = await api.quickPublish(data);
            Toast.success(res.message || 'Stream link published live!');
            if (res.warning) {
              Toast.warning(res.warning, 6000);
            }
            await loadData();
            renderTabContent('anime');
            return true;
          } catch (err) {
            const msg = err.message || '';
            if (msg.includes('404')) {
              Toast.error('Server restart required: Termux me "bash ~/start_apex.sh" run karke server restart karein!');
            } else {
              Toast.error(msg || 'Failed to publish stream');
            }
            return false;
          }
        }, (container) => {
          // Paste button handler
          const pasteBtn = container.querySelector('#qs-paste-btn');
          const streamInput = container.querySelector('#qs-stream-url');
          if (pasteBtn && streamInput) {
            pasteBtn.addEventListener('click', async () => {
              try {
                if (navigator.clipboard && navigator.clipboard.readText) {
                  const text = await navigator.clipboard.readText();
                  if (text) {
                    streamInput.value = text.trim();
                    Toast.success('URL pasted from clipboard!');
                    return;
                  }
                }
              } catch (_) {}
              const manual = prompt('Paste your Telegram or 3rd-party video stream URL:');
              if (manual) {
                streamInput.value = manual.trim();
                Toast.success('URL set!');
              }
            });
          }

          // Direct file upload handler
          const fileInput = container.querySelector('#qs-file-upload');
          const uploadProgress = container.querySelector('#qs-upload-progress');
          const uploadStatus = container.querySelector('#qs-upload-status');
          const uploadPct = container.querySelector('#qs-upload-pct');
          const uploadBar = container.querySelector('#qs-upload-bar');

          if (fileInput && streamInput) {
            fileInput.addEventListener('change', async () => {
              const file = fileInput.files?.[0];
              if (!file) return;

              uploadProgress.classList.remove('hidden');
              uploadStatus.textContent = `Uploading ${file.name}...`;
              uploadPct.textContent = '0%';
              uploadBar.style.width = '0%';

              try {
                const res = await api.uploadVideo(file, (pct) => {
                  uploadPct.textContent = `${pct}%`;
                  uploadBar.style.width = `${pct}%`;
                });
                streamInput.value = res.url;
                uploadStatus.textContent = `✓ Uploaded: ${res.filename}`;
                uploadStatus.className = 'text-emerald-400 font-bold';
                Toast.success('Video uploaded from phone! Stream link auto-set.');
              } catch (err) {
                uploadStatus.textContent = `Upload failed: ${err.message}`;
                uploadStatus.className = 'text-red-400 font-bold';
                Toast.error(err.message || 'Upload failed');
              }
            });
          }

          // AI Auto-Fill Details Handler
          const aiEnrichBtn = container.querySelector('#qs-ai-enrich-btn');
          const titleInput = container.querySelector('#qs-anime-title');
          const epNumInput = container.querySelector('#qs-ep-num');
          const epTitleInput = container.querySelector('#qs-ep-title');
          const aiPreview = container.querySelector('#qs-ai-preview');
          const aiPosterImg = container.querySelector('#qs-ai-poster-img');
          const aiPreviewTitle = container.querySelector('#qs-ai-preview-title');
          const aiPreviewMeta = container.querySelector('#qs-ai-preview-meta');
          const aiPreviewDesc = container.querySelector('#qs-ai-preview-desc');
          const aiScore = container.querySelector('#qs-ai-score');
          const aiPosterInput = container.querySelector('#qs-ai-poster-input');
          const aiBannerInput = container.querySelector('#qs-ai-banner-input');
          const aiSynopsisInput = container.querySelector('#qs-ai-synopsis-input');
          const aiGenresInput = container.querySelector('#qs-ai-genres-input');

          if (aiEnrichBtn && titleInput) {
            aiEnrichBtn.addEventListener('click', async () => {
              const currentTitle = titleInput.value.trim();
              if (!currentTitle) {
                Toast.error('Please enter the Anime or Movie name first!');
                titleInput.focus();
                return;
              }

              const isMov = container.querySelector('#qs-radio-movie')?.checked || false;
              const epNum = epNumInput ? (parseInt(epNumInput.value, 10) || 1) : 1;

              aiEnrichBtn.disabled = true;
              aiEnrichBtn.innerHTML = `<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> AI Searching Official Details...`;
              if (window.lucide) window.lucide.createIcons();

              try {
                const res = await api.aiEnrich(currentTitle, epNum, isMov);
                if (res.found) {
                  titleInput.value = res.title;
                  if (epTitleInput && res.episode_title) {
                    epTitleInput.value = res.episode_title;
                  }
                  if (aiPosterInput) aiPosterInput.value = res.poster_url;
                  if (aiBannerInput) aiBannerInput.value = res.banner_url;
                  if (aiSynopsisInput) aiSynopsisInput.value = res.synopsis;
                  if (aiGenresInput) aiGenresInput.value = (res.genres || []).join(', ');

                  // Show Preview
                  if (aiPreview) {
                    aiPreview.classList.remove('hidden');
                    if (aiPosterImg) {
                      aiPosterImg.src = res.poster_url;
                      aiPosterImg.style.display = 'block';
                    }
                    if (aiPreviewTitle) {
                      aiPreviewTitle.textContent = res.title + (res.japanese_title ? ` (${res.japanese_title})` : '');
                    }
                    if (aiPreviewMeta) {
                      aiPreviewMeta.textContent = `${res.year || ''} • ${res.studio || 'Studio'} • ${(res.genres || []).join(', ')}`;
                    }
                    if (aiPreviewDesc) {
                      aiPreviewDesc.textContent = res.synopsis;
                    }
                    if (aiScore) {
                      aiScore.textContent = `★ ${res.rating || 8.5}`;
                    }
                  }

                  Toast.success(`✨ Official HD Banner, Poster & ${isMov ? 'Movie' : 'Ep ' + epNum} details auto-filled!`);
                } else {
                  Toast.warning('Anime details not found in database. You can still publish normally.');
                }
              } catch (err) {
                Toast.error('Failed to auto-fetch metadata: ' + err.message);
              } finally {
                aiEnrichBtn.disabled = false;
                aiEnrichBtn.innerHTML = `<i data-lucide="sparkles" class="w-3.5 h-3.5 text-apex-pink"></i> ✨ AI Auto-Fill (Banner & Details)`;
                if (window.lucide) window.lucide.createIcons();
              }
            });
          }

          // Content type switcher (Series vs Movie)
          const seriesRadio = container.querySelector('#qs-radio-series');
          const movieRadio = container.querySelector('#qs-radio-movie');
          const pillSeries = container.querySelector('#pill-series');
          const pillMovie = container.querySelector('#pill-movie');
          const seriesSection = container.querySelector('#qs-series-section');
          const movieSection = container.querySelector('#qs-movie-section');
          const titleLabel = container.querySelector('#qs-title-label');
          const modeHeadline = container.querySelector('#qs-mode-headline');
          const modeDesc = container.querySelector('#qs-mode-desc');
          const serverNameInput = container.querySelector('#qs-server-name');

          const updateTypeUI = (type) => {
            const isMov = type === 'movie';
            if (isMov) {
              pillMovie.className = 'flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold cursor-pointer transition-all bg-purple-600 text-white shadow-md qs-type-pill';
              pillSeries.className = 'flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold cursor-pointer transition-all text-gray-400 hover:text-white qs-type-pill';
              seriesSection.classList.add('hidden');
              movieSection.classList.remove('hidden');
              titleLabel.textContent = 'Movie Name / Title *';
              modeHeadline.textContent = '🎬 Full Movie Stream';
              modeDesc.textContent = 'Movie bina kisi episode number ke direct play hogi!';
              if (serverNameInput.value === 'Telegram Fast Server') serverNameInput.value = 'Telegram Movie Server';
            } else {
              pillSeries.className = 'flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold cursor-pointer transition-all bg-blue-600 text-white shadow-md qs-type-pill';
              pillMovie.className = 'flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold cursor-pointer transition-all text-gray-400 hover:text-white qs-type-pill';
              seriesSection.classList.remove('hidden');
              movieSection.classList.add('hidden');
              titleLabel.textContent = 'Anime Series / Folder Name *';
              modeHeadline.textContent = '📁 Series Folder Stream';
              modeDesc.textContent = 'Har anime ka folder banega (e.g. Naruto). Us folder me aap Ep 1, Ep 2, Ep 3... kitne bhi episodes add kar sakte hain!';
              if (serverNameInput.value === 'Telegram Movie Server') serverNameInput.value = 'Telegram Fast Server';
            }
          };

          seriesRadio?.addEventListener('change', () => updateTypeUI('series'));
          movieRadio?.addEventListener('change', () => updateTypeUI('movie'));

          // Dynamic existing folder detector
          const folderIndicator = container.querySelector('#qs-folder-indicator');
          if (titleInput && epNumInput && folderIndicator) {
            const checkFolder = () => {
              const val = titleInput.value.trim().toLowerCase();
              const existing = animeList.find(a => a.title.toLowerCase() === val || a.slug === val);
              if (existing) {
                const nextEp = (existing.episodes_count || 0) + 1;
                if (!prefillEpisode && existing.type !== 'Movie') {
                  epNumInput.value = nextEp;
                }
                folderIndicator.innerHTML = `
                  <i data-lucide="folder-check" class="w-4 h-4 flex-shrink-0 text-emerald-400"></i>
                  <span>Existing Folder: <strong>${existing.title}</strong> (${existing.type === 'Movie' ? 'Movie' : `${existing.episodes_count || 0} episodes currently saved`}). ${existing.type === 'Movie' ? 'Updating stream link.' : `Adding as Episode ${nextEp}!`}</span>
                `;
                folderIndicator.classList.remove('hidden');
                if (window.lucide) window.lucide.createIcons();
              } else {
                folderIndicator.classList.add('hidden');
              }
            };
            titleInput.addEventListener('input', checkFolder);
            titleInput.addEventListener('change', checkFolder);
            if (prefillTitle) checkFolder();
          }
        });
      };

      const renderCatalogView = () => {
        const filtered = filterAnime();
        const seriesCount = animeList.filter(a => a.type !== 'Movie').length;
        const moviesCount = animeList.filter(a => a.type === 'Movie').length;

        content.innerHTML = `
          <div>
            <!-- Header Row -->
            <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-5">
              <div>
                <h3 class="font-bold text-white text-lg flex items-center gap-2">
                  <i data-lucide="folder" class="w-5 h-5 text-apex-pink"></i>
                  Anime & Movie Catalog (${animeList.length})
                </h3>
                <p class="text-xs text-gray-400 mt-0.5">Manage series folders, episodes count, and full movie streams</p>
              </div>
              <div class="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                <button id="quick-batch-upload-btn" class="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white shadow-lg shadow-pink-500/25 transition-all cursor-pointer">
                  <i data-lucide="folder-plus" class="w-4 h-4"></i> ⚡ Multi MP4 Upload (Up to 40+ Eps)
                </button>
                <button id="quick-telegram-btn" class="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/25 transition-all cursor-pointer">
                  <i data-lucide="send" class="w-4 h-4"></i> Add Telegram / 3rd Party Link
                </button>
                <button id="add-anime-btn" class="btn-apex-primary text-xs py-2.5 px-4 flex items-center justify-center gap-1.5 flex-1 sm:flex-none cursor-pointer">
                  <i data-lucide="plus" class="w-4 h-4"></i> Add Folder / Movie
                </button>
              </div>
            </div>

            <!-- Filter Pills & Search Bar -->
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-4">
              <div class="flex items-center gap-1.5 p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
                <button class="catalog-filter-btn px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${catalogFilter === 'all' ? 'bg-apex-pink text-white shadow' : 'text-gray-400 hover:text-white'}" data-filter="all">
                  📁 All Folders (${animeList.length})
                </button>
                <button class="catalog-filter-btn px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${catalogFilter === 'series' ? 'bg-blue-600 text-white shadow' : 'text-gray-400 hover:text-white'}" data-filter="series">
                  📺 Series (${seriesCount})
                </button>
                <button class="catalog-filter-btn px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${catalogFilter === 'movie' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-white'}" data-filter="movie">
                  🎬 Movies (${moviesCount})
                </button>
              </div>

              <!-- Search filter input -->
              <div class="relative max-w-xs">
                <input type="text" id="catalog-search-input" value="${catalogSearch}" placeholder="Filter folders by title..." class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-1.5 pl-9 pr-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-apex-pink" />
                <i data-lucide="search" class="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"></i>
              </div>
            </div>

            <!-- Folders List -->
            <div class="space-y-3" id="catalog-folders-container">
              ${filtered.length === 0 ? `
                <div class="glass-panel p-8 sm:p-12 rounded-2xl text-center border border-white/10 my-4">
                  <div class="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4 text-blue-400">
                    <i data-lucide="folder-plus" class="w-8 h-8"></i>
                  </div>
                  <h4 class="text-lg font-bold text-white mb-2">${animeList.length === 0 ? 'Catalog is Clean & Empty' : 'No matches found'}</h4>
                  <p class="text-sm text-gray-400 max-w-md mx-auto mb-6">
                    ${animeList.length === 0 
                      ? 'Abhi koi folder ya movie nahi hai. Upar <strong>"Add Telegram / 3rd Party Link"</strong> par tap karke Naruto, Solo Leveling, ya koi bhi Movie link paste karein!' 
                      : 'Try different search keywords.'}
                  </p>
                </div>
              ` : filtered.map(a => {
                const isMovie = a.type === 'Movie';
                const epCount = a.episodes_count || 0;
                return `
                  <div class="glass-panel rounded-xl border border-white/5 hover:border-white/20 transition-all overflow-hidden" id="folder-card-${a.id}">
                    <!-- Card Top Header -->
                    <div class="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div class="flex items-center gap-3.5 min-w-0 flex-grow">
                        <img src="${a.poster_url}" class="w-12 h-16 object-cover rounded-lg flex-shrink-0 bg-white/5" onerror="this.src='https://images.unsplash.com/photo-1578632767115-351597cf2477?w=200'">
                        <div class="min-w-0 flex-grow">
                          <div class="flex items-center gap-2 flex-wrap">
                            <p class="text-sm font-bold text-white truncate">${a.title}</p>
                            <span class="text-[10px] font-bold px-2 py-0.5 rounded ${isMovie ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30' : 'bg-blue-600/20 text-blue-300 border border-blue-500/30'}">
                              ${isMovie ? '🎬 MOVIE' : '📁 SERIES FOLDER'}
                            </span>
                            ${!a.published ? '<span class="text-[10px] font-bold bg-yellow-500/20 text-yellow-400 px-1.5 rounded">DRAFT</span>' : '<span class="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 px-1.5 rounded">LIVE</span>'}
                            ${a.has_hindi_dub ? '<span class="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-1.5 rounded">HINDI DUB</span>' : ''}
                          </div>

                          <div class="flex items-center gap-2.5 mt-2 flex-wrap text-xs text-gray-400">
                            <!-- Toggle Episodes Button -->
                            <button class="toggle-folder-btn inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white font-bold transition-all border border-white/10 cursor-pointer text-xs" data-id="${a.id}">
                              <i data-lucide="${isMovie ? 'film' : 'folder'}" class="w-3.5 h-3.5 text-apex-pink"></i>
                              <span id="badge-text-${a.id}">
                                ${isMovie ? '🎬 View Movie Stream' : `📁 ${epCount} Episodes Inside`}
                              </span>
                              <i data-lucide="chevron-down" class="w-3.5 h-3.5 chevron-icon transition-transform"></i>
                            </button>
                            <span>★ ${a.rating}</span>
                            <span>•</span>
                            <span>${a.year || new Date().getFullYear()}</span>
                          </div>
                        </div>
                      </div>

                      <!-- Action Buttons -->
                      <div class="flex items-center gap-1.5 w-full sm:w-auto justify-end flex-shrink-0">
                        <a href="#/anime/${a.slug}" target="_blank" class="p-2 rounded-lg hover:bg-emerald-500/10 text-emerald-400 transition-colors" title="View Live on Website">
                          <i data-lucide="external-link" class="w-4 h-4"></i>
                        </a>
                        <button class="add-ep-to-folder-btn px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-blue-500/20" data-id="${a.id}" data-title="${a.title}" data-type="${a.type || 'TV'}" data-count="${epCount}" title="${isMovie ? 'Update Movie Stream' : `Add Episode ${epCount + 1}`}">
                          <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                          <span>${isMovie ? 'Update Stream' : `+ Add Ep ${epCount + 1}`}</span>
                        </button>
                        <button class="edit-anime-btn p-2 rounded-lg hover:bg-apex-orange/10 text-apex-orange transition-colors" data-id="${a.id}" title="Edit Folder Details">
                          <i data-lucide="edit" class="w-4 h-4"></i>
                        </button>
                        <button class="delete-anime-btn p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors" data-id="${a.id}" data-title="${a.title}" title="Delete Folder">
                          <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                      </div>
                    </div>

                    <!-- Expandable Drawer for Episodes -->
                    <div id="folder-drawer-${a.id}" class="hidden bg-[#0c0e18] border-t border-white/5 p-4 transition-all">
                      <div class="flex items-center justify-between mb-3 text-xs">
                        <span class="text-gray-300 font-semibold flex items-center gap-1.5">
                          <i data-lucide="folder-open" class="w-4 h-4 text-blue-400"></i>
                          Saved in <strong>${a.title}</strong>:
                        </span>
                        <button class="add-ep-inside-drawer-btn text-xs font-bold text-apex-pink hover:underline flex items-center gap-1 cursor-pointer" data-id="${a.id}" data-title="${a.title}" data-type="${a.type || 'TV'}" data-count="${epCount}">
                          <i data-lucide="plus" class="w-3.5 h-3.5"></i> Add Next Episode
                        </button>
                      </div>
                      <div id="folder-episodes-list-${a.id}" class="space-y-2">
                        <div class="text-center py-4 text-xs text-gray-500">
                          <i data-lucide="loader" class="w-4 h-4 animate-spin inline-block mr-1"></i> Loading episodes...
                        </div>
                      </div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;

        if (window.lucide) window.lucide.createIcons();
        attachCatalogListeners();
      };

      const attachCatalogListeners = () => {
        // Filter pills
        content.querySelectorAll('.catalog-filter-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            catalogFilter = btn.dataset.filter;
            renderCatalogView();
          });
        });

        // Search filter input
        const searchInput = content.querySelector('#catalog-search-input');
        if (searchInput) {
          searchInput.addEventListener('input', (e) => {
            catalogSearch = e.target.value;
            renderCatalogView();
          });
        }

        // Header Buttons
        content.querySelector('#quick-batch-upload-btn')?.addEventListener('click', () => {
          activeTab = 'batch';
          document.querySelectorAll('.admin-tab').forEach(b => {
            b.className = `admin-tab px-5 py-2 rounded-lg text-sm font-semibold transition-all ${b.dataset.tab === activeTab ? 'bg-apex-pink text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`;
          });
          renderTabContent('batch');
        });

        content.querySelector('#quick-telegram-btn')?.addEventListener('click', () => {
          openQuickPublish('', '', 'series');
        });

        content.querySelector('#add-anime-btn')?.addEventListener('click', () => {
          openModal('Add New Anime Folder / Movie', renderAnimeForm(), async () => {
            const data = getFormData('anime-form');
            if (!data.title) { Toast.error('Title required'); return; }
            try {
              await api.createAnime(data);
              Toast.success('Folder created!');
              await loadData();
              renderTabContent('anime');
            } catch (err) { Toast.error(err.message); }
          }, (modalContainer) => {
            attachAnimeFormHandlers(modalContainer, null);
          });
        });

        // Add Ep to folder buttons (header of card or inside drawer)
        content.querySelectorAll('.add-ep-to-folder-btn, .add-ep-inside-drawer-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const title = btn.dataset.title;
            const type = btn.dataset.type === 'Movie' ? 'movie' : 'series';
            const count = parseInt(btn.dataset.count, 10) || 0;
            openQuickPublish(title, type === 'movie' ? 1 : count + 1, type);
          });
        });

        // Toggle Folder Drawer
        content.querySelectorAll('.toggle-folder-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            const animeId = btn.dataset.id;
            const drawer = content.querySelector(`#folder-drawer-${animeId}`);
            const chevron = btn.querySelector('.chevron-icon');
            if (!drawer) return;

            const isExpanded = !drawer.classList.contains('hidden');
            if (isExpanded) {
              drawer.classList.add('hidden');
              if (chevron) chevron.style.transform = 'rotate(0deg)';
              return;
            }

            // Open drawer
            drawer.classList.remove('hidden');
            if (chevron) chevron.style.transform = 'rotate(180deg)';

            const listDiv = drawer.querySelector(`#folder-episodes-list-${animeId}`);
            if (!listDiv) return;

            try {
              const res = await api.getAnimeEpisodes(animeId);
              const episodes = res?.episodes || [];

              if (episodes.length === 0) {
                listDiv.innerHTML = `
                  <div class="text-xs text-gray-400 py-3 text-center bg-white/3 rounded-lg border border-white/5">
                    No episodes added yet. Click <strong>"+ Add Next Episode"</strong> above to add Episode 1!
                  </div>
                `;
              } else {
                listDiv.innerHTML = episodes.map(ep => `
                  <div class="flex items-center justify-between p-2.5 rounded-lg bg-white/5 hover:bg-white/8 transition-colors border border-white/5 gap-3">
                    <div class="flex items-center gap-3 min-w-0 flex-grow">
                      <span class="w-8 h-8 rounded-md bg-white/10 flex items-center justify-center font-mono font-bold text-xs text-apex-pink flex-shrink-0">
                        ${ep.episode_number}
                      </span>
                      <div class="min-w-0 flex-grow">
                        <p class="text-xs font-bold text-white truncate">${ep.title || `Episode ${ep.episode_number}`}</p>
                        <p class="text-[11px] text-gray-400 font-mono truncate">
                          ${ep.sources?.[0]?.server || 'Telegram Server'} • ${ep.sources?.[0]?.audioLabel || ep.sources?.[0]?.audio || 'Original'} • ${ep.sources?.[0]?.quality || '1080p'}
                        </p>
                      </div>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0">
                      <a href="#/watch/${ep.id}" target="_blank" class="px-2.5 py-1 text-[11px] font-bold rounded bg-apex-pink/15 hover:bg-apex-pink/25 text-apex-pink transition-colors flex items-center gap-1">
                        <i data-lucide="play" class="w-3 h-3"></i> Watch
                      </a>
                      <button class="edit-ep-btn px-2.5 py-1 text-[11px] font-bold rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 transition-colors flex items-center gap-1 cursor-pointer" data-id="${ep.id}" data-anime-id="${animeId}" title="Edit Episode Details">
                        <i data-lucide="edit-3" class="w-3 h-3"></i> Edit
                      </button>
                      <button class="delete-ep-btn p-1.5 rounded hover:bg-red-500/15 text-red-400 transition-colors" data-id="${ep.id}" data-anime-id="${animeId}" title="Delete Episode">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                      </button>
                    </div>
                  </div>
                `).join('');
                if (window.lucide) window.lucide.createIcons();

                // Wire up edit episode inside drawer
                listDiv.querySelectorAll('.edit-ep-btn').forEach(editEpBtn => {
                  editEpBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const ep = episodes.find(x => x.id === editEpBtn.dataset.id);
                    if (!ep) return;

                    openModal(`Edit Episode ${ep.episode_number}: ${ep.title || ''}`, renderEpisodeForm(animeId, ep), async () => {
                      const form = document.getElementById('episode-form');
                      if (!form) return;

                      const epNum = parseFloat(form.querySelector('[name="episode_number"]')?.value) || ep.episode_number;
                      const title = form.querySelector('[name="title"]')?.value.trim() || `Episode ${epNum}`;
                      const videoUrl = form.querySelector('[name="video_url"]')?.value.trim() || ep.video_url;
                      const duration = form.querySelector('[name="duration"]')?.value.trim() || ep.duration || '24:00';
                      const audio = form.querySelector('[name="audio"]')?.value || ep.sources?.[0]?.audio || 'hi';
                      const quality = form.querySelector('[name="quality"]')?.value || ep.sources?.[0]?.quality || '1080p';
                      const server = form.querySelector('[name="server"]')?.value.trim() || ep.sources?.[0]?.server || 'Telegram Fast Server';
                      const introStart = parseInt(form.querySelector('[name="intro_start"]')?.value, 10) || 85;
                      const introEnd = parseInt(form.querySelector('[name="intro_end"]')?.value, 10) || 175;
                      const published = form.querySelector('[name="published"]')?.checked !== false;

                      if (!videoUrl) {
                        Toast.error('Video URL / Stream Link is required!');
                        return false;
                      }

                      const audioLabel = audio === 'hi' ? 'Hindi Dub' : (audio === 'en' ? 'English Dub' : 'Japanese (Original)');
                      const sourceType = videoUrl.includes('.m3u8') ? 'hls' : (videoUrl.includes('embed') || videoUrl.includes('iframe') ? 'iframe' : 'mp4');

                      const updatedSources = [
                        {
                          server,
                          type: sourceType,
                          url: videoUrl,
                          quality,
                          audio,
                          audioLabel
                        }
                      ];

                      try {
                        await api.updateEpisode(ep.id, {
                          episode_number: epNum,
                          title,
                          duration,
                          video_url: videoUrl,
                          sources: updatedSources,
                          intro_start: introStart,
                          intro_end: introEnd,
                          published
                        });
                        Toast.success(`Episode ${epNum} updated successfully!`);
                        await loadData();
                        // Refresh drawer
                        btn.click();
                        btn.click();
                      } catch (err) {
                        Toast.error(err.message || 'Failed to update episode');
                        return false;
                      }
                    }, (modalContainer) => {
                      // Paste button in Edit Episode
                      const pasteBtn = modalContainer.querySelector('#edit-ep-paste-btn');
                      const streamInput = modalContainer.querySelector('#edit-ep-video-url');
                      if (pasteBtn && streamInput) {
                        pasteBtn.addEventListener('click', async () => {
                          try {
                            if (navigator.clipboard?.readText) {
                              const text = await navigator.clipboard.readText();
                              if (text) {
                                streamInput.value = text.trim();
                                Toast.success('Pasted from clipboard!');
                                return;
                              }
                            }
                          } catch (_) {}
                          const manual = prompt('Paste stream link:');
                          if (manual) {
                            streamInput.value = manual.trim();
                            Toast.success('URL set!');
                          }
                        });
                      }

                      // Upload from Phone in Edit Episode
                      const fileInput = modalContainer.querySelector('#edit-ep-file-upload');
                      const uploadProgress = modalContainer.querySelector('#edit-ep-upload-progress');
                      const uploadStatus = modalContainer.querySelector('#edit-ep-upload-status');
                      const uploadPct = modalContainer.querySelector('#edit-ep-upload-pct');
                      const uploadBar = modalContainer.querySelector('#edit-ep-upload-bar');

                      if (fileInput && streamInput) {
                        fileInput.addEventListener('change', async () => {
                          const file = fileInput.files?.[0];
                          if (!file) return;
                          uploadProgress.classList.remove('hidden');
                          uploadStatus.textContent = `Uploading ${file.name}...`;
                          try {
                            const res = await api.uploadVideo(file, (pct) => {
                              uploadPct.textContent = `${pct}%`;
                              uploadBar.style.width = `${pct}%`;
                            });
                            streamInput.value = res.url;
                            uploadStatus.textContent = `✓ Uploaded: ${res.filename}`;
                            uploadStatus.className = 'text-emerald-400 font-bold';
                            Toast.success('Video uploaded from phone!');
                          } catch (err) {
                            uploadStatus.textContent = `Upload failed: ${err.message}`;
                            uploadStatus.className = 'text-red-400 font-bold';
                            Toast.error(err.message || 'Upload failed');
                          }
                        });
                      }
                    });
                  });
                });

                // Wire up delete episode inside drawer
                listDiv.querySelectorAll('.delete-ep-btn').forEach(delBtn => {
                  delBtn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if (!confirm('Are you sure you want to delete this episode?')) return;
                    try {
                      await api.deleteEpisode(delBtn.dataset.id);
                      Toast.success('Episode deleted!');
                      await loadData();
                      // Refresh drawer
                      btn.click();
                      btn.click();
                    } catch (err) {
                      Toast.error(err.message || 'Failed to delete episode');
                    }
                  });
                });
              }
            } catch (err) {
              listDiv.innerHTML = `<div class="text-xs text-red-400 py-2">Failed to load episodes: ${err.message}</div>`;
            }
          });
        });

        // Edit Anime
        content.querySelectorAll('.edit-anime-btn').forEach(btn => {
          btn.addEventListener('click', () => {
            const anime = animeList.find(a => a.id === btn.dataset.id);
            if (!anime) return;
            openModal(`Edit: ${anime.title}`, renderAnimeForm(anime), async () => {
              const data = getFormData('anime-form');
              try {
                await api.updateAnime(anime.id, data);
                Toast.success('Anime updated!');
                await loadData();
                renderTabContent('anime');
              } catch (err) { Toast.error(err.message); }
            }, (modalContainer) => {
              attachAnimeFormHandlers(modalContainer, anime);
            });
          });
        });

        // Delete Anime
        content.querySelectorAll('.delete-anime-btn').forEach(btn => {
          btn.addEventListener('click', async () => {
            if (!confirm(`Delete folder "${btn.dataset.title}" and all its episodes?`)) return;
            try {
              await api.deleteAnime(btn.dataset.id);
              Toast.success('Deleted!');
              await loadData();
              renderTabContent('anime');
            } catch (err) { Toast.error(err.message); }
          });
        });
      };

      renderCatalogView();

    } else if (tab === 'batch') {
      renderBatchUploadSection(content, async () => {
        await loadData();
      });

    } else if (tab === 'settings') {
      content.innerHTML = `
        <div class="max-w-2xl mx-auto space-y-6">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-black text-xl text-white flex items-center gap-2">
                <i data-lucide="shield-check" class="w-6 h-6 text-apex-pink"></i> Admin Security & Credentials
              </h3>
              <p class="text-xs text-gray-400 mt-0.5">Master Admin ka Username, Email aur Password yaha se change karein</p>
            </div>
            <span class="px-3 py-1 rounded-full text-xs font-bold bg-pink-500/10 border border-pink-500/20 text-apex-pink flex items-center gap-1.5">
              <i data-lucide="lock" class="w-3.5 h-3.5"></i> Admin Only
            </span>
          </div>

          <!-- Main Credentials Card -->
          <div class="glass-panel rounded-2xl p-6 sm:p-8 border border-white/10 space-y-6">
            <form id="admin-credentials-form" class="space-y-5">
              
              <!-- Section 1: Username & Email -->
              <div>
                <h4 class="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                  <i data-lucide="user" class="w-3.5 h-3.5 text-apex-cyan"></i> 1. Admin Identity
                </h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs font-bold text-gray-300 mb-1.5">Admin Username *</label>
                    <input type="text" id="admin-user-input" required class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-apex-pink font-semibold" placeholder="e.g. MyAdmin" />
                  </div>
                  <div>
                    <label class="block text-xs font-bold text-gray-300 mb-1.5">Admin Login Email *</label>
                    <input type="email" id="admin-email-input" required class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-apex-pink font-semibold" placeholder="admin@apex.stream" />
                  </div>
                </div>
              </div>

              <!-- Section 2: Password Change -->
              <div class="pt-4 border-t border-white/5 space-y-4">
                <h4 class="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
                  <i data-lucide="key" class="w-3.5 h-3.5 text-apex-orange"></i> 2. Change Password (Optional)
                </h4>
                <p class="text-xs text-gray-400">Agar password nahi badalna, to niche ke password fields khali chhod dein.</p>

                <div class="space-y-3">
                  <div>
                    <label class="block text-xs font-bold text-gray-300 mb-1.5">Current Password (Purana Password)</label>
                    <div class="relative">
                      <input type="password" id="admin-current-pass" class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-apex-pink pr-10" placeholder="••••••••" />
                      <button type="button" class="toggle-pass-btn absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white" data-target="admin-current-pass">
                        <i data-lucide="eye" class="w-4 h-4"></i>
                      </button>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label class="block text-xs font-bold text-gray-300 mb-1.5">New Password (Naya Password)</label>
                      <div class="relative">
                        <input type="password" id="admin-new-pass" minlength="6" class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-apex-pink pr-10" placeholder="Min 6 characters" />
                        <button type="button" class="toggle-pass-btn absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white" data-target="admin-new-pass">
                          <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                      </div>
                    </div>
                    <div>
                      <label class="block text-xs font-bold text-gray-300 mb-1.5">Confirm New Password</label>
                      <div class="relative">
                        <input type="password" id="admin-confirm-pass" minlength="6" class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-apex-pink pr-10" placeholder="Re-enter new password" />
                        <button type="button" class="toggle-pass-btn absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white" data-target="admin-confirm-pass">
                          <i data-lucide="eye" class="w-4 h-4"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Save Button -->
              <div class="pt-4 border-t border-white/5 flex items-center justify-between gap-4 flex-wrap">
                <span class="text-xs text-gray-400">Save karte hi aapka naya login password turant active ho jayega.</span>
                <button type="submit" id="save-credentials-btn" class="px-6 py-3 rounded-xl bg-gradient-to-r from-apex-pink to-purple-600 hover:opacity-90 font-bold text-white text-sm shadow-lg shadow-pink-500/25 flex items-center gap-2 cursor-pointer transition-all">
                  <i data-lucide="check-circle" class="w-4 h-4"></i> Save Credentials
                </button>
              </div>

            </form>
          </div>
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();

      const userInput = content.querySelector('#admin-user-input');
      const emailInput = content.querySelector('#admin-email-input');
      const curPassInput = content.querySelector('#admin-current-pass');
      const newPassInput = content.querySelector('#admin-new-pass');
      const confirmPassInput = content.querySelector('#admin-confirm-pass');
      const credForm = content.querySelector('#admin-credentials-form');
      const saveBtn = content.querySelector('#save-credentials-btn');

      api.getAdminCredentials().then(res => {
        if (res && res.success) {
          if (userInput) userInput.value = res.username || '';
          if (emailInput) emailInput.value = res.email || '';
        }
      }).catch(() => {
        if (userInput) userInput.value = state.user?.username || 'ApexAdmin';
        if (emailInput) emailInput.value = state.user?.email || 'admin@apex.stream';
      });

      content.querySelectorAll('.toggle-pass-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const target = content.querySelector(`#${btn.dataset.target}`);
          if (target) {
            target.type = target.type === 'password' ? 'text' : 'password';
            btn.innerHTML = `<i data-lucide="${target.type === 'password' ? 'eye' : 'eye-off'}" class="w-4 h-4"></i>`;
            if (window.lucide) window.lucide.createIcons();
          }
        });
      });

      credForm?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = userInput.value.trim();
        const email = emailInput.value.trim();
        const currentPassword = curPassInput.value;
        const newPassword = newPassInput.value;
        const confirmPassword = confirmPassInput.value;

        if (!username || !email) {
          Toast.error('Username and Email are required!');
          return;
        }

        if (newPassword) {
          if (newPassword.length < 6) {
            Toast.error('New password must be at least 6 characters long!');
            newPassInput.focus();
            return;
          }
          if (newPassword !== confirmPassword) {
            Toast.error('New Password and Confirm Password do not match!');
            confirmPassInput.focus();
            return;
          }
          if (!currentPassword) {
            Toast.error('Please enter your Current Password to set a new password!');
            curPassInput.focus();
            return;
          }
        }

        saveBtn.disabled = true;
        saveBtn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Saving...`;
        if (window.lucide) window.lucide.createIcons();

        try {
          const res = await api.updateAdminCredentials({
            username,
            email,
            currentPassword: currentPassword || undefined,
            newPassword: newPassword || undefined
          });

          if (res && res.success) {
            if (res.user) state.setUser(res.user);
            if (res.token) state.setToken(res.token);

            curPassInput.value = '';
            newPassInput.value = '';
            confirmPassInput.value = '';

            Toast.success('🎉 Admin Username & Password successfully updated!');
          }
        } catch (err) {
          Toast.error(err.message || 'Failed to update admin credentials');
        } finally {
          saveBtn.disabled = false;
          saveBtn.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4"></i> Save Credentials`;
          if (window.lucide) window.lucide.createIcons();
        }
      });

    } else if (tab === 'users') {
      content.innerHTML = `
        <div>
          <h3 class="font-bold text-white mb-4">User Management (${users.length})</h3>
          <div class="space-y-2">
            ${users.map(u => `
              <div class="glass-panel rounded-xl p-4 flex items-center gap-4 group">
                <img src="${u.avatar}" class="w-10 h-10 rounded-full object-cover border border-white/10 flex-shrink-0">
                <div class="flex-grow min-w-0">
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-bold text-white">${u.username}</p>
                    <span class="text-[10px] font-bold px-1.5 py-0.5 rounded ${u.role === 'admin' ? 'bg-apex-pink/20 text-apex-pink' : 'bg-white/10 text-gray-400'}">${u.role}</span>
                    ${u.status === 'banned' ? '<span class="text-[10px] font-bold bg-red-500/20 text-red-400 px-1.5 rounded">BANNED</span>' : ''}
                  </div>
                  <p class="text-xs text-gray-400">${u.email} • Joined ${new Date(u.created_at).toLocaleDateString()}</p>
                </div>
                ${u.id !== state.user.id ? `
                  <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <select class="user-role-sel bg-[var(--input-bg)] border border-[var(--border-color)] rounded px-2 py-1 text-xs focus:outline-none" data-id="${u.id}">
                      <option value="user" ${u.role === 'user' ? 'selected' : ''}>User</option>
                      <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                    <button class="ban-btn p-2 rounded-lg hover:bg-yellow-500/10 text-yellow-400 transition-colors text-xs font-bold" data-id="${u.id}" data-status="${u.status}">${u.status === 'banned' ? 'Unban' : 'Ban'}</button>
                    <button class="delete-user-btn p-2 rounded-lg hover:bg-red-500/10 text-red-400 transition-colors" data-id="${u.id}">
                      <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                  </div>
                ` : '<span class="text-xs text-gray-500 font-semibold">(you)</span>'}
              </div>
            `).join('')}
          </div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();

      document.querySelectorAll('.user-role-sel').forEach(sel => {
        sel.addEventListener('change', async () => {
          try {
            await api.updateAdminUser(sel.dataset.id, { role: sel.value });
            Toast.success('Role updated');
            await loadData();
            renderTabContent('users');
          } catch (err) { Toast.error(err.message); }
        });
      });

      document.querySelectorAll('.ban-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          const newStatus = btn.dataset.status === 'banned' ? 'active' : 'banned';
          try {
            await api.updateAdminUser(btn.dataset.id, { status: newStatus });
            Toast.success(newStatus === 'banned' ? 'User banned' : 'User unbanned');
            await loadData();
            renderTabContent('users');
          } catch (err) { Toast.error(err.message); }
        });
      });

      document.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Delete this user?')) return;
          try {
            await api.deleteAdminUser(btn.dataset.id);
            Toast.success('User deleted');
            await loadData();
            renderTabContent('users');
          } catch (err) { Toast.error(err.message); }
        });
      });
    } else if (tab === 'fetcher') {
      content.innerHTML = `
        <div class="space-y-6">
          <div class="glass-panel rounded-xl p-5">
            <h3 class="font-bold text-white mb-2">Fetch & Import from 3rd Party Websites</h3>
            <p class="text-xs text-gray-400 mb-4">Search across MyAnimeList (Jikan v4) and Kitsu to import complete series metadata and episodes with 1-click!</p>
            <div class="flex gap-3">
              <input type="text" id="thirdparty-query" placeholder="Type anime name (e.g. Bleach, Naruto, Steins Gate)..." class="flex-grow bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-apex-pink text-white" />
              <button id="thirdparty-search-btn" class="btn-apex-primary text-sm py-2 px-5">
                <i data-lucide="search" class="w-4 h-4"></i> Fetch Live
              </button>
            </div>
          </div>
          <div id="thirdparty-results" class="space-y-3"></div>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();

      const searchBtn = document.getElementById('thirdparty-search-btn');
      const input = document.getElementById('thirdparty-query');
      const resultsDiv = document.getElementById('thirdparty-results');

      const doFetch = async () => {
        const q = input?.value?.trim();
        if (!q) return;
        resultsDiv.innerHTML = `<div class="text-center py-10 text-gray-400"><i data-lucide="loader" class="w-8 h-8 animate-spin mx-auto mb-2 text-apex-pink"></i>Fetching from 3rd party APIs...</div>`;
        if (window.lucide) window.lucide.createIcons();

        try {
          const res = await api.searchThirdParty(q, 'all');
          const items = res?.items || [];
          if (items.length === 0) {
            resultsDiv.innerHTML = `<div class="glass-panel p-6 rounded-xl text-center text-gray-400">No results found on 3rd party providers for "${q}".</div>`;
            return;
          }

          resultsDiv.innerHTML = items.map((a, i) => `
            <div class="glass-panel rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div class="flex items-center gap-4 min-w-0">
                <img src="${a.poster_url}" class="w-12 h-16 object-cover rounded flex-shrink-0" onerror="this.style.display='none'">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <p class="text-sm font-bold text-white truncate">${a.title}</p>
                    <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 uppercase">${a.source || '3rd Party'}</span>
                  </div>
                  <p class="text-xs text-gray-400 mt-0.5">${a.type} • ${a.year} • ${a.episodes_count || 12} eps • ★ ${a.rating}</p>
                  <p class="text-xs text-gray-500 line-clamp-1 mt-1 max-w-xl">${a.synopsis}</p>
                </div>
              </div>
              <button class="import-now-btn btn-apex-primary text-xs py-2 px-4 whitespace-nowrap" data-index="${i}">
                <i data-lucide="download-cloud" class="w-3.5 h-3.5"></i> Import to APEX
              </button>
            </div>
          `).join('');
          if (window.lucide) window.lucide.createIcons();

          document.querySelectorAll('.import-now-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
              const idx = parseInt(btn.dataset.index, 10);
              const target = items[idx];
              btn.disabled = true;
              btn.innerHTML = `<i data-lucide="loader" class="w-3.5 h-3.5 animate-spin"></i> Importing...`;
              if (window.lucide) window.lucide.createIcons();
              try {
                const importRes = await api.importThirdPartyAnime({
                  mal_id: target.mal_id,
                  kitsu_id: target.kitsu_id,
                  custom_data: target
                });
                Toast.success(importRes.message || 'Imported successfully!');
                btn.innerHTML = `✓ Imported`;
                btn.className = `btn-apex-secondary text-xs py-2 px-4 text-emerald-400`;
                await loadData();
              } catch (err) {
                btn.disabled = false;
                btn.innerHTML = `Import`;
                Toast.error(err.message);
              }
            });
          });
        } catch (err) {
          resultsDiv.innerHTML = `<div class="glass-panel p-6 rounded-xl text-center text-red-400">Failed to fetch: ${err.message}</div>`;
        }
      };

      searchBtn?.addEventListener('click', doFetch);
      input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') doFetch(); });
    } else if (tab === 'bot') {
      content.innerHTML = `
        <div class="space-y-6">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="font-black text-xl text-white flex items-center gap-2">
                <i data-lucide="bot" class="w-6 h-6 text-apex-cyan"></i> Telegram Bot & Direct Link Generator
              </h3>
              <p class="text-xs text-gray-400 mt-0.5">Generate direct high-speed video streaming links and auto-publish from Telegram</p>
            </div>
            <div id="bot-status-badge" class="px-3 py-1.5 rounded-full text-xs font-bold border border-white/10 flex items-center gap-2 bg-white/5 text-gray-400">
              <span class="w-2 h-2 rounded-full bg-gray-400"></span> Loading status...
            </div>
          </div>

          <!-- Grid: Config & Tester -->
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <!-- Box 1: Bot Configuration -->
            <div class="glass-panel rounded-xl p-5 border border-white/10 space-y-4">
              <div class="flex items-center justify-between">
                <h4 class="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                  <i data-lucide="key" class="w-4 h-4 text-apex-pink"></i> Telegram Bot Setup
                </h4>
                <a href="https://t.me/BotFather" target="_blank" class="text-xs text-apex-cyan hover:underline flex items-center gap-1 font-semibold">
                  Open @BotFather <i data-lucide="external-link" class="w-3 h-3"></i>
                </a>
              </div>

              <div class="bg-black/30 p-3 rounded-lg border border-white/5 text-xs text-gray-300 space-y-1.5 leading-relaxed">
                <p class="font-bold text-white">⚡ 30-Second Bot Setup:</p>
                <p>1. Telegram par <b>@BotFather</b> search karein aur <code class="text-apex-pink font-mono">/newbot</code> bhejein.</p>
                <p>2. Apna Bot Name aur Username chun lein (e.g. <i>MyApexStreamBot</i>).</p>
                <p>3. @BotFather se jo <b>HTTP API Token</b> milega, use neeche paste karke <b>Save & Connect</b> karein!</p>
              </div>

              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Telegram Bot Token *</label>
                <div class="flex gap-2">
                  <input type="password" id="bot-token-input" placeholder="e.g. 7123456789:AAHkLp..." class="flex-grow bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-apex-pink text-white font-mono" />
                  <button id="toggle-token-btn" class="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10 text-gray-300">Show</button>
                </div>
              </div>

              <div class="flex gap-3 pt-2">
                <button id="save-bot-btn" class="btn-apex-primary text-sm py-2 px-5 flex-grow flex items-center justify-center gap-2">
                  <i data-lucide="zap" class="w-4 h-4"></i> Save & Connect Bot
                </button>
                <button id="stop-bot-btn" class="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm font-semibold hover:bg-red-500/20">
                  Stop
                </button>
              </div>

              <div id="bot-info-card" class="hidden p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                <p class="font-bold">✅ Bot is Live & Listening!</p>
                <p class="mt-1">Username: <a id="bot-link" href="#" target="_blank" class="underline font-mono font-bold">@...</a></p>
                <p class="text-gray-300 mt-1">Aap is bot ko Telegram par koi bhi video ya channel post link bhejenge to direct streaming link mil jayega!</p>
              </div>
            </div>

            <!-- Box 2: Direct Link Generator & Tester -->
            <div class="glass-panel rounded-xl p-5 border border-white/10 space-y-4">
              <h4 class="font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
                <i data-lucide="link" class="w-4 h-4 text-apex-cyan"></i> Instant Direct Link Generator
              </h4>
              <p class="text-xs text-gray-400">Telegram post link (jaise: <code>https://t.me/RAZXCHEATS/141</code>) ya direct video URL paste karke instant stream aur embed links generate karein:</p>

              <div class="space-y-2">
                <div class="relative">
                  <input type="text" id="test-url-input" placeholder="Paste link (e.g. https://t.me/RAZXCHEATS/141)" class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg py-2.5 pl-3 pr-20 text-sm focus:outline-none focus:border-apex-pink text-white" />
                  <button id="paste-test-btn" class="absolute right-1.5 top-1/2 -translate-y-1/2 text-xs bg-white/10 hover:bg-white/20 text-gray-200 px-2.5 py-1 rounded">Paste</button>
                </div>
                <button id="generate-link-btn" class="btn-apex-primary w-full text-sm py-2.5 flex items-center justify-center gap-2">
                  <i data-lucide="sparkles" class="w-4 h-4"></i> Generate Direct Stream Link
                </button>
              </div>

              <div id="generator-output" class="hidden space-y-3 pt-2 border-t border-white/5"></div>
            </div>

          </div>

          <!-- Box 3: Telegram Bot Commands Cheat Sheet -->
          <div class="glass-panel rounded-xl p-5 border border-white/10">
            <h4 class="font-bold text-white text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
              <i data-lucide="terminal" class="w-4 h-4 text-purple-400"></i> Bot Commands Cheat Sheet (Telegram me use karein)
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div class="p-3 bg-black/30 rounded-lg border border-white/5 space-y-1">
                <p class="font-mono text-apex-pink font-bold">1. Send any Link (e.g. https://t.me/...)</p>
                <p class="text-gray-400">Bot turant direct stream link, embed player aur preview URL return karega.</p>
              </div>
              <div class="p-3 bg-black/30 rounded-lg border border-white/5 space-y-1">
                <p class="font-mono text-apex-pink font-bold">2. /publish &lt;Anime&gt; &lt;Ep&gt; [Audio] [URL]</p>
                <p class="text-gray-400">Episode direct website pe publish ho jayega. Example: <code class="text-gray-300 font-mono">/publish Naruto 1 hi</code></p>
              </div>
              <div class="p-3 bg-black/30 rounded-lg border border-white/5 space-y-1">
                <p class="font-mono text-apex-pink font-bold">3. /movie &lt;Movie Title&gt; [Audio] [URL]</p>
                <p class="text-gray-400">Full-length movie add hogi. Example: <code class="text-gray-300 font-mono">/movie Demon Slayer Mugen Train</code></p>
              </div>
              <div class="p-3 bg-black/30 rounded-lg border border-white/5 space-y-1">
                <p class="font-mono text-apex-pink font-bold">4. /folders aur /status</p>
                <p class="text-gray-400">Current anime folders, episode count aur server uptime display karega.</p>
              </div>
            </div>
          </div>
        </div>
      `;

      if (window.lucide) window.lucide.createIcons();

      const statusBadge = document.getElementById('bot-status-badge');
      const tokenInput = document.getElementById('bot-token-input');
      const toggleTokenBtn = document.getElementById('toggle-token-btn');
      const saveBotBtn = document.getElementById('save-bot-btn');
      const stopBotBtn = document.getElementById('stop-bot-btn');
      const botInfoCard = document.getElementById('bot-info-card');
      const botLink = document.getElementById('bot-link');

      const testUrlInput = document.getElementById('test-url-input');
      const pasteTestBtn = document.getElementById('paste-test-btn');
      const generateLinkBtn = document.getElementById('generate-link-btn');
      const generatorOutput = document.getElementById('generator-output');

      // Toggle show/hide token
      toggleTokenBtn?.addEventListener('click', () => {
        if (tokenInput.type === 'password') {
          tokenInput.type = 'text';
          toggleTokenBtn.textContent = 'Hide';
        } else {
          tokenInput.type = 'password';
          toggleTokenBtn.textContent = 'Show';
        }
      });

      // Load status
      const loadBotStatus = async () => {
        try {
          const res = await api.getBotStatus();
          if (res.isRunning && res.botInfo) {
            statusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> <span class="text-emerald-400">ONLINE (@${res.botInfo.username})</span>`;
            statusBadge.className = 'px-3 py-1.5 rounded-full text-xs font-bold border border-emerald-500/20 flex items-center gap-2 bg-emerald-500/10 text-emerald-400';
            botInfoCard.classList.remove('hidden');
            botLink.textContent = `@${res.botInfo.username}`;
            botLink.href = `https://t.me/${res.botInfo.username}`;
            if (res.maskedToken && !tokenInput.value) {
              tokenInput.value = res.maskedToken;
            }
          } else {
            statusBadge.innerHTML = `<span class="w-2 h-2 rounded-full bg-gray-400"></span> <span class="text-gray-400">NOT CONNECTED</span>`;
            statusBadge.className = 'px-3 py-1.5 rounded-full text-xs font-bold border border-white/10 flex items-center gap-2 bg-white/5 text-gray-400';
            botInfoCard.classList.add('hidden');
          }
        } catch (_) {}
      };

      loadBotStatus();

      // Save bot
      saveBotBtn?.addEventListener('click', async () => {
        const val = tokenInput.value?.trim();
        if (!val || !val.includes(':')) {
          Toast.error('Please enter a valid Bot Token (e.g. 123456:ABC-DEF)');
          return;
        }
        saveBotBtn.disabled = true;
        saveBotBtn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Connecting...`;
        if (window.lucide) window.lucide.createIcons();
        try {
          const res = await api.saveBotConfig(val);
          Toast.success(res.message || 'Bot connected successfully!');
          await loadBotStatus();
        } catch (err) {
          Toast.error(err.message || 'Failed to connect bot');
        } finally {
          saveBotBtn.disabled = false;
          saveBotBtn.innerHTML = `<i data-lucide="zap" class="w-4 h-4"></i> Save & Connect Bot`;
          if (window.lucide) window.lucide.createIcons();
        }
      });

      // Stop bot
      stopBotBtn?.addEventListener('click', async () => {
        try {
          await api.stopBot();
          Toast.success('Bot stopped');
          await loadBotStatus();
        } catch (err) {
          Toast.error(err.message);
        }
      });

      // Paste test url
      pasteTestBtn?.addEventListener('click', async () => {
        try {
          if (navigator.clipboard?.readText) {
            const t = await navigator.clipboard.readText();
            if (t) { testUrlInput.value = t.trim(); return; }
          }
        } catch (_) {}
        const m = prompt('Paste stream link:');
        if (m) testUrlInput.value = m.trim();
      });

      // Generate Link tester
      generateLinkBtn?.addEventListener('click', async () => {
        const url = testUrlInput.value?.trim();
        if (!url) {
          Toast.error('Please enter a link first!');
          return;
        }
        generateLinkBtn.disabled = true;
        generateLinkBtn.innerHTML = `<i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Resolving...`;
        if (window.lucide) window.lucide.createIcons();

        try {
          const res = await api.generateStreamLink(url);
          generatorOutput.classList.remove('hidden');

          generatorOutput.innerHTML = `
            <div class="p-3 bg-black/40 rounded-xl border border-white/10 space-y-2 text-xs">
              <div class="flex items-center justify-between">
                <span class="font-bold text-white flex items-center gap-1.5"><i data-lucide="check-circle" class="w-3.5 h-3.5 text-emerald-400"></i> Links Generated!</span>
                <span class="px-2 py-0.5 rounded bg-pink-500/20 text-apex-pink font-mono text-[10px] uppercase font-bold">${res.isTelegram ? 'Telegram Stream' : 'Direct Stream'}</span>
              </div>

              ${res.directVideoUrl ? `
                <div>
                  <span class="text-gray-400 block mb-0.5">⚡ Direct Video Stream URL:</span>
                  <div class="flex gap-1.5 items-center">
                    <input type="text" readonly value="${res.directVideoUrl}" class="flex-grow bg-[#11131f] border border-white/10 rounded px-2 py-1 text-xs text-gray-200 font-mono" />
                    <button class="copy-url-btn px-2 py-1 bg-white/10 rounded hover:bg-white/20 text-white font-bold" data-copy="${res.directVideoUrl}">Copy</button>
                  </div>
                </div>
              ` : ''}

              <div>
                <span class="text-gray-400 block mb-0.5">📱 Embed Player URL:</span>
                <div class="flex gap-1.5 items-center">
                  <input type="text" readonly value="${res.embedUrl}" class="flex-grow bg-[#11131f] border border-white/10 rounded px-2 py-1 text-xs text-gray-200 font-mono" />
                  <button class="copy-url-btn px-2 py-1 bg-white/10 rounded hover:bg-white/20 text-white font-bold" data-copy="${res.embedUrl}">Copy</button>
                </div>
              </div>

              <div class="pt-2 flex flex-wrap gap-2">
                <a href="${res.apexPlayerUrl}" target="_blank" class="px-3 py-1.5 rounded-lg bg-pink-500/20 border border-pink-500/30 text-apex-pink hover:bg-pink-500/30 font-bold flex items-center gap-1.5">
                  <i data-lucide="play" class="w-3.5 h-3.5"></i> Test in APEX Player
                </a>
                <button id="add-to-folder-btn" class="px-3 py-1.5 rounded-lg btn-apex-primary font-bold flex items-center gap-1.5">
                  <i data-lucide="folder-plus" class="w-3.5 h-3.5"></i> Add to Anime Folder
                </button>
              </div>

              ${res.warning ? `<p class="text-yellow-400 mt-1">⚠️ ${res.warning}</p>` : ''}
            </div>
          `;

          if (window.lucide) window.lucide.createIcons();

          // Copy buttons
          generatorOutput.querySelectorAll('.copy-url-btn').forEach(b => {
            b.addEventListener('click', () => {
              navigator.clipboard?.writeText(b.dataset.copy);
              Toast.success('Link copied to clipboard!');
            });
          });

          // Add to folder button
          document.getElementById('add-to-folder-btn')?.addEventListener('click', () => {
            activeTab = 'anime';
            renderTabContent('anime');
            // Trigger Quick modal
            setTimeout(() => {
              const quickBtn = document.getElementById('quick-add-telegram-btn');
              if (quickBtn) quickBtn.click();
              setTimeout(() => {
                const sInput = document.getElementById('qs-stream-url');
                if (sInput) sInput.value = res.directVideoUrl || res.embedUrl;
              }, 150);
            }, 100);
          });

        } catch (err) {
          Toast.error(err.message || 'Failed to generate link');
        } finally {
          generateLinkBtn.disabled = false;
          generateLinkBtn.innerHTML = `<i data-lucide="sparkles" class="w-4 h-4"></i> Generate Direct Stream Link`;
          if (window.lucide) window.lucide.createIcons();
        }
      });
    }
  }

  // Initial render (loading state)
  app.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-black text-white">Admin Dashboard</h1>
        <p class="text-gray-400 text-sm mt-1">APEX Platform Management Panel • Logged in as ${state.user?.username}</p>
      </div>

      <!-- Tab Nav -->
      <div class="flex gap-2 mb-6 border-b border-white/5 pb-2 overflow-x-auto">
        ${['dashboard', 'anime', 'batch', 'settings', 'bot', 'users', 'fetcher'].map(tab => `
          <button class="admin-tab px-5 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${tab === activeTab ? 'bg-apex-pink text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}" data-tab="${tab}">
            ${tab === 'batch' ? '⚡ Multi MP4 Upload' : (tab === 'settings' ? '⚙️ Admin Settings (User & Pass)' : (tab === 'bot' ? '🤖 Telegram Bot' : (tab === 'fetcher' ? '🌐 3rd-Party Fetcher' : (tab.charAt(0).toUpperCase() + tab.slice(1)))))}
          </button>
        `).join('')}
      </div>

      <div id="admin-tab-content">
        <div class="text-center py-16 text-gray-400">
          <i data-lucide="loader" class="w-8 h-8 animate-spin mx-auto mb-3"></i>
          <p>Loading dashboard data...</p>
        </div>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  // Tab switching
  document.querySelectorAll('.admin-tab').forEach(btn => {
    btn.addEventListener('click', async () => {
      activeTab = btn.dataset.tab;
      document.querySelectorAll('.admin-tab').forEach(b => {
        b.className = `admin-tab px-5 py-2 rounded-lg text-sm font-semibold transition-all ${b.dataset.tab === activeTab ? 'bg-apex-pink text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`;
      });
      renderTabContent(activeTab);
    });
  });

  await loadData();
  renderTabContent('dashboard');
}
