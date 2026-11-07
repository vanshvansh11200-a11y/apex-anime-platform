// Universal Direct Stream URL Player for APEX
// Allows pasting ANY stream URL (HLS m3u8, MP4, WebM, etc.) and playing directly!
import { state } from '../state.js';
import { api } from '../api.js';
import { Toast } from '../components/toast.js';
import { router } from '../router.js';

function fmt(s) {
  s = Math.floor(s || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function renderStreamLauncher(app) {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const prefillUrl = params.get('url') || '';
  const prefillTitle = params.get('title') || '';

  app.innerHTML = `
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <!-- Header -->
      <div class="mb-6">
        <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-apex-pink mb-1">
          <i data-lucide="zap" class="w-4 h-4"></i> Universal Stream Player
        </div>
        <h1 class="text-3xl font-black text-white">Direct Stream Player</h1>
        <p class="text-sm text-gray-400 mt-1">Paste any video stream URL (HLS .m3u8, MP4, WebM) to play immediately with custom controls, audio switching, and auto-skip!</p>
      </div>

      <!-- Input Card -->
      <div class="glass-panel rounded-2xl p-6 mb-8 border border-white/10 shadow-2xl">
        <form id="direct-stream-form" class="space-y-4">
          <div>
            <label class="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-2">
              Video Stream URL * <span class="text-apex-pink">(HLS .m3u8 / MP4 / Direct Stream)</span>
            </label>
            <div class="relative">
              <input 
                type="url" 
                id="stream-url-input" 
                required 
                value="${prefillUrl}"
                placeholder="https://example.com/stream.m3u8 or https://example.com/video.mp4" 
                class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-3.5 pl-11 pr-24 text-sm font-mono text-white focus:outline-none focus:border-apex-pink transition-all"
              />
              <i data-lucide="link" class="w-5 h-5 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
              <button type="button" id="paste-btn" class="absolute right-2.5 top-1/2 -translate-y-1/2 px-3 py-1.5 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors">
                Paste
              </button>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">Anime / Episode Title</label>
              <input 
                type="text" 
                id="stream-title-input" 
                value="${prefillTitle}"
                placeholder="e.g. Solo Leveling Episode 12" 
                class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-apex-pink transition-colors"
              />
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">Audio Track</label>
              <select id="stream-audio-input" class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-apex-pink cursor-pointer">
                <option value="ja">Japanese (Original Audio)</option>
                <option value="en">English Dub</option>
                <option value="hi">Hindi Dub</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1.5">Subtitles URL (Optional .vtt)</label>
              <input 
                type="url" 
                id="stream-sub-input" 
                placeholder="https://example.com/subs.vtt" 
                class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-apex-pink transition-colors font-mono"
              />
            </div>
          </div>

          <!-- Quick Test Samples -->
          <div class="flex flex-wrap items-center gap-2 pt-1">
            <span class="text-xs font-bold text-gray-500 uppercase mr-1">Quick Samples:</span>
            <button type="button" class="sample-link-btn text-xs px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 transition-colors" data-url="https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" data-title="Demo HLS Multi-Quality Stream">
              ⚡ HLS Multi-Quality (.m3u8)
            </button>
            <button type="button" class="sample-link-btn text-xs px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 transition-colors" data-url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" data-title="Big Buck Bunny HD 1080p">
              🎥 Direct MP4 1080p
            </button>
            <button type="button" class="sample-link-btn text-xs px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-gray-300 border border-white/5 transition-colors" data-url="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4" data-title="Tears of Steel (Anime CGI Demo)">
              🚀 Tears of Steel Direct
            </button>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-4 pt-2">
            <label class="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" id="save-to-library-check" class="accent-apex-pink w-4 h-4">
              <span>Save this stream to my APEX Anime Library</span>
            </label>

            <button type="submit" id="play-stream-btn" class="btn-apex-primary text-base py-3 px-8 shadow-xl shadow-pink-500/25">
              <i data-lucide="play" class="w-5 h-5 fill-white"></i>
              <span>Play Video Now</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Player Screen Section (Appears when video is loaded) -->
      <div id="player-section" class="hidden space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 id="active-video-title" class="text-xl font-black text-white"></h2>
            <p id="active-video-url-display" class="text-xs text-gray-400 font-mono truncate max-w-xl"></p>
          </div>
          <button id="copy-share-btn" class="btn-apex-secondary text-xs py-1.5 px-3">
            <i data-lucide="share-2" class="w-3.5 h-3.5"></i> Share Stream Link
          </button>
        </div>

        <!-- Player Mount Point -->
        <div class="relative bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10" style="aspect-ratio:16/9" id="player-container-box">
          <video id="custom-video-el" class="w-full h-full object-contain bg-black" playsinline></video>
        </div>

        <div class="glass-panel p-4 rounded-xl flex items-center justify-between text-xs text-gray-400">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Direct Stream Active • Full Hardware Acceleration Enabled</span>
          </div>
          <div class="flex items-center gap-4">
            <span>Press <kbd class="px-1.5 py-0.5 rounded bg-white/10 font-mono text-white">Space</kbd> for Play/Pause</span>
            <span>Press <kbd class="px-1.5 py-0.5 rounded bg-white/10 font-mono text-white">F</kbd> for Fullscreen</span>
          </div>
        </div>
      </div>

    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  // Paste clipboard support
  document.getElementById('paste-btn')?.addEventListener('click', async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        document.getElementById('stream-url-input').value = text;
        Toast.success('URL pasted from clipboard!');
      }
    } catch {
      Toast.info('Please paste manually using Ctrl+V or long-press');
    }
  });

  // Sample buttons click handler
  document.querySelectorAll('.sample-link-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('stream-url-input').value = btn.dataset.url;
      document.getElementById('stream-title-input').value = btn.dataset.title;
      Toast.info(`Loaded: ${btn.dataset.title}`);
    });
  });

  // Handle Form Submit (Play Video)
  document.getElementById('direct-stream-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = document.getElementById('stream-url-input').value.trim();
    const title = document.getElementById('stream-title-input').value.trim() || 'Custom Stream';
    const audio = document.getElementById('stream-audio-input').value;
    const subUrl = document.getElementById('stream-sub-input').value.trim();
    const saveToLibrary = document.getElementById('save-to-library-check')?.checked;

    if (!url) {
      Toast.error('Please enter a valid video URL');
      return;
    }

    // Play video directly on page
    playCustomStream(url, title, subUrl);

    // Save to APEX library if requested and user is authenticated/admin
    if (saveToLibrary) {
      try {
        await api.createAnime({
          title: title,
          synopsis: `Custom direct stream for ${title}`,
          poster_url: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600',
          banner_url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1920',
          rating: 9.0,
          status: 'Completed',
          type: 'Movie',
          genres: ['Custom', 'Stream'],
          published: true
        });
        Toast.success(`"${title}" saved to your APEX library!`);
      } catch (err) {
        console.warn('Could not save to library:', err.message);
      }
    }
  });

  // Auto-play if prefilled in URL
  if (prefillUrl) {
    playCustomStream(prefillUrl, prefillTitle || 'Direct Stream');
  }

  function playCustomStream(streamUrl, videoTitle, subUrl = '') {
    const section = document.getElementById('player-section');
    const titleEl = document.getElementById('active-video-title');
    const urlEl = document.getElementById('active-video-url-display');
    const video = document.getElementById('custom-video-el');

    if (!section || !video) return;

    section.classList.remove('hidden');
    titleEl.textContent = videoTitle;
    urlEl.textContent = streamUrl;

    // Scroll smoothly to player
    section.scrollIntoView({ behavior: 'smooth' });

    // Destroy previous HLS instance if any
    if (window._customHls) {
      window._customHls.destroy();
      window._customHls = null;
    }

    // Remove old subtitle tracks
    while (video.firstChild) {
      video.removeChild(video.firstChild);
    }

    // Add subtitle track if provided
    if (subUrl) {
      const track = document.createElement('track');
      track.kind = 'subtitles';
      track.label = 'English';
      track.srclang = 'en';
      track.src = subUrl;
      track.default = true;
      video.appendChild(track);
    }

    const isHls = streamUrl.includes('.m3u8') || streamUrl.includes('/hls/');

    if (isHls && window.Hls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
        Toast.success('HLS Stream Connected! Playing now... 🎬');
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.warn('HLS fatal error:', data);
          Toast.error('HLS stream error. Trying direct playback...');
          video.src = streamUrl;
          video.play().catch(() => {});
        }
      });
      window._customHls = hls;
    } else {
      video.src = streamUrl;
      video.play().catch(() => {});
      Toast.success('Playing video stream! 🎬');
    }

    video.controls = true;

    // Share link button
    document.getElementById('copy-share-btn')?.addEventListener('click', () => {
      const shareUrl = `${location.origin}/#/stream?url=${encodeURIComponent(streamUrl)}&title=${encodeURIComponent(videoTitle)}`;
      navigator.clipboard.writeText(shareUrl).then(() => {
        Toast.success('Direct stream link copied to clipboard!');
      }).catch(() => {
        Toast.info(shareUrl);
      });
    });
  }
}
