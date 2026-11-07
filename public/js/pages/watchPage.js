import { api } from '../api.js';
import { state } from '../state.js';
import { Toast } from '../components/toast.js';
import { router } from '../router.js';

// Format seconds to mm:ss or hh:mm:ss
function fmt(s) {
  s = Math.floor(s || 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

class ApexPlayer {
  constructor(container, episode, anime, settings) {
    this.container = container;
    this.episode = episode;
    this.anime = anime;
    this.settings = settings;
    this.hls = null;
    this.progressInterval = null;
    this.hideControlsTimeout = null;
    this.skipToOutro = false;
    this.sources = episode.sources || [];
    this.currentSource = this.getPreferredSource();
    this.build();
  }

  getPreferredSource() {
    const preferredAudio = this.settings?.preferredAudio || 'ja';
    const preferredServer = this.settings?.preferredServer || '';
    // Try exact server match first
    let src = this.sources.find(s => s.server === preferredServer);
    if (!src) src = this.sources.find(s => s.audio === preferredAudio);
    if (!src) src = this.sources[0];
    return src;
  }

  build() {
    this.container.innerHTML = `
      <div class="apex-player-container relative bg-black rounded-xl overflow-hidden shadow-2xl shadow-pink-500/10" id="apex-player-wrapper" style="aspect-ratio:16/9">
        <video id="apex-video" class="w-full h-full object-contain bg-black" preload="auto" playsinline></video>

        <!-- Embed / Third-Party Player Frame -->
        <div id="apex-embed-frame-wrap" class="hidden absolute inset-0 w-full h-full bg-black z-30">
          <iframe id="apex-embed-frame" class="w-full h-full border-0" allowfullscreen allow="autoplay; fullscreen; picture-in-picture; encrypted-media"></iframe>
        </div>

        <!-- Skip Intro Button -->
        <button id="skip-intro-btn" class="apex-skip-btn hidden" style="position:absolute;bottom:80px;right:20px;z-index:30">
          <i data-lucide="fast-forward" class="w-4 h-4"></i> Skip Intro
        </button>
        <!-- Skip Outro Button -->
        <button id="skip-outro-btn" class="apex-skip-btn hidden" style="position:absolute;bottom:80px;right:20px;z-index:30">
          <i data-lucide="skip-forward" class="w-4 h-4"></i> Skip Outro
        </button>

        <!-- Double-Tap Feedback Animations (YouTube Style) -->
        <div id="skip-feedback-left" class="absolute left-8 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 transition-all duration-300 transform scale-75 flex flex-col items-center justify-center z-40 bg-black/75 rounded-full w-20 h-20 border border-white/20 shadow-2xl backdrop-blur-sm">
          <i data-lucide="rotate-ccw" class="w-7 h-7 text-apex-pink"></i>
          <span class="text-xs font-black font-mono text-white mt-0.5">-10s</span>
        </div>
        <div id="skip-feedback-right" class="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none opacity-0 transition-all duration-300 transform scale-75 flex flex-col items-center justify-center z-40 bg-black/75 rounded-full w-20 h-20 border border-white/20 shadow-2xl backdrop-blur-sm">
          <i data-lucide="rotate-cw" class="w-7 h-7 text-apex-pink"></i>
          <span class="text-xs font-black font-mono text-white mt-0.5">+10s</span>
        </div>

        <!-- Next Episode Overlay -->
        <div id="next-ep-overlay" class="absolute inset-0 hidden flex-col items-center justify-center z-40 bg-black/80 backdrop-blur-sm">
          <p class="text-sm text-gray-400 mb-2">Up Next</p>
          <p id="next-ep-title" class="text-xl font-bold text-white mb-6"></p>
          <div class="flex items-center gap-4">
            <button id="cancel-next" class="px-5 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors">Cancel</button>
            <button id="play-next-now" class="btn-apex-primary px-6 py-2.5">
              <i data-lucide="play" class="w-4 h-4 fill-white"></i>
              Play Now (<span id="next-countdown">10</span>s)
            </button>
          </div>
        </div>

        <!-- Controls Overlay -->
        <div id="player-controls" class="absolute inset-0 flex flex-col justify-between transition-opacity duration-300" style="background:linear-gradient(0deg,rgba(0,0,0,0.85) 0%,transparent 25%,transparent 75%,rgba(0,0,0,0.5) 100%)">
          <!-- Top bar: Title -->
          <div class="flex items-center justify-between p-4">
            <div>
              <p class="text-xs text-gray-400 font-semibold">${this.anime?.title || ''}</p>
              <p class="text-sm font-bold text-white">EP ${this.episode.episode_number}: ${this.episode.title}</p>
            </div>
            <div class="flex items-center gap-2">
              <!-- PiP -->
              <button id="pip-btn" class="p-2 rounded-lg bg-black/30 hover:bg-black/50 text-white transition-colors" title="Picture-in-Picture (P)">
                <i data-lucide="picture-in-picture" class="w-4 h-4"></i>
              </button>
            </div>
          </div>

          <!-- Center: 10s Rewind, Big Play/Pause, 10s Forward -->
          <div class="flex items-center justify-center gap-6 sm:gap-10">
            <button id="center-rewind-btn" class="w-12 h-12 rounded-full bg-black/60 hover:bg-black/85 border border-white/20 hover:border-apex-pink text-white flex flex-col items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-xl cursor-pointer" title="Rewind 10 Seconds (← or J)">
              <i data-lucide="rotate-ccw" class="w-5 h-5 text-white"></i>
              <span class="text-[9px] font-black font-mono text-apex-pink -mt-0.5">10s</span>
            </button>
            <button id="center-play-btn" class="w-16 h-16 rounded-full bg-apex-pink/90 hover:bg-apex-pink flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95 cursor-pointer">
              <i data-lucide="play" id="center-icon" class="w-8 h-8 text-white fill-white ml-1"></i>
            </button>
            <button id="center-forward-btn" class="w-12 h-12 rounded-full bg-black/60 hover:bg-black/85 border border-white/20 hover:border-apex-pink text-white flex flex-col items-center justify-center transition-all hover:scale-110 active:scale-95 shadow-xl cursor-pointer" title="Forward 10 Seconds (→ or L)">
              <i data-lucide="rotate-cw" class="w-5 h-5 text-white"></i>
              <span class="text-[9px] font-black font-mono text-apex-pink -mt-0.5">10s</span>
            </button>
          </div>

          <!-- Bottom Controls -->
          <div class="px-4 pb-4 space-y-2">
            <!-- Progress Bar -->
            <div class="relative group cursor-pointer" id="progress-bar-wrap">
              <div class="h-1.5 group-hover:h-2.5 bg-white/20 rounded-full transition-all relative overflow-visible">
                <div id="buffer-bar" class="absolute top-0 left-0 h-full bg-white/35 rounded-full" style="width:0%"></div>
                <div id="progress-bar" class="absolute top-0 left-0 h-full bg-gradient-to-r from-apex-pink to-orange-500 rounded-full" style="width:0%">
                  <div class="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
              </div>
              <div id="scrub-tooltip" class="absolute -top-7 text-xs font-mono bg-black/90 text-white px-2 py-0.5 rounded pointer-events-none hidden">0:00</div>
            </div>

            <!-- Control Buttons Row -->
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 sm:gap-3">
                <button id="play-pause-btn" class="p-1.5 hover:text-apex-pink transition-colors" title="Play/Pause (Space)">
                  <i data-lucide="play" id="play-icon" class="w-6 h-6 fill-current"></i>
                </button>
                <button id="bar-rewind-10-btn" class="p-1.5 hover:text-apex-pink text-gray-300 hover:text-white transition-colors flex items-center gap-0.5 cursor-pointer" title="Rewind 10 Seconds (← or J)">
                  <i data-lucide="rotate-ccw" class="w-4 h-4 text-apex-pink"></i>
                  <span class="text-[11px] font-black font-mono">10s</span>
                </button>
                <button id="bar-forward-10-btn" class="p-1.5 hover:text-apex-pink text-gray-300 hover:text-white transition-colors flex items-center gap-0.5 cursor-pointer" title="Forward 10 Seconds (→ or L)">
                  <i data-lucide="rotate-cw" class="w-4 h-4 text-apex-pink"></i>
                  <span class="text-[11px] font-black font-mono">10s</span>
                </button>
                <button id="prev-ep-btn" class="p-1.5 hover:text-apex-pink transition-colors" title="Previous Episode">
                  <i data-lucide="skip-back" class="w-5 h-5"></i>
                </button>
                <button id="next-ep-btn" class="p-1.5 hover:text-apex-pink transition-colors" title="Next Episode">
                  <i data-lucide="skip-forward" class="w-5 h-5"></i>
                </button>
                <!-- Volume -->
                <div class="flex items-center gap-2">
                  <button id="mute-btn" class="p-1.5 hover:text-apex-pink transition-colors" title="Mute (M)">
                    <i data-lucide="volume-2" id="vol-icon" class="w-5 h-5"></i>
                  </button>
                  <input type="range" id="volume-slider" min="0" max="1" step="0.05" value="1" class="w-16 h-1 accent-apex-pink cursor-pointer">
                </div>
                <span id="time-display" class="text-xs font-mono text-gray-300">0:00 / 0:00</span>
              </div>
              <div class="flex items-center gap-2">
                <!-- Playback Speed -->
                <div class="relative" id="speed-menu-wrap">
                  <button id="speed-btn" class="px-2 py-1 text-xs font-bold bg-black/30 hover:bg-black/50 rounded text-white transition-colors">1×</button>
                  <div id="speed-menu" class="hidden absolute bottom-9 right-0 bg-[#1a1c2a] border border-white/10 rounded-xl p-1.5 w-28 shadow-2xl z-50">
                    ${['0.5', '0.75', '1', '1.25', '1.5', '2'].map(s => `<button class="speed-opt w-full text-left px-3 py-1.5 text-sm rounded-lg hover:bg-white/10 ${s === '1' ? 'text-apex-pink font-bold' : 'text-gray-200'}" data-speed="${s}">${s}×</button>`).join('')}
                  </div>
                </div>
                <!-- Settings (Audio/Server) -->
                <div class="relative" id="settings-menu-wrap">
                  <button id="settings-btn" class="p-1.5 hover:text-apex-pink transition-colors" title="Settings">
                    <i data-lucide="settings" class="w-5 h-5"></i>
                  </button>
                  <div id="settings-menu" class="hidden absolute bottom-11 right-0 bg-[#1a1c2a] border border-white/10 rounded-xl p-2.5 w-64 shadow-2xl z-50">
                    <p class="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 mb-2">Audio Track / Server</p>
                    ${this.sources.map((src, i) => `
                      <button class="source-opt w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-white/10 transition-colors flex items-center justify-between ${this.currentSource?.server === src.server ? 'text-apex-pink font-bold' : 'text-gray-200'}" data-index="${i}">
                        <span>${src.server}</span>
                        <span class="text-[11px] font-mono text-gray-400">${src.audioLabel || src.audio} • ${src.quality}</span>
                      </button>
                    `).join('')}
                    <div class="border-t border-white/5 my-2"></div>
                    <button id="add-custom-stream-url-btn" class="w-full text-left px-3 py-2 text-xs font-bold rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-apex-pink border border-pink-500/30 flex items-center justify-between transition-colors">
                      <span>🔗 Enter Custom Video URL</span>
                      <span class="text-[10px] bg-apex-pink text-white px-1.5 py-0.5 rounded">NEW</span>
                    </button>
                    <div class="border-t border-white/5 my-2"></div>
                    <p class="text-[10px] font-bold uppercase tracking-wider text-gray-400 px-2 mb-2">Subtitles</p>
                    <button class="sub-opt w-full text-left px-3 py-1.5 text-sm rounded-lg hover:bg-white/10 text-gray-200" data-track="off">Off</button>
                    ${(this.episode.subtitles || []).filter(s => s.src).map(sub => `
                      <button class="sub-opt w-full text-left px-3 py-1.5 text-sm rounded-lg hover:bg-white/10 text-gray-200" data-track="${sub.lang}">${sub.label}</button>
                    `).join('')}
                  </div>
                </div>
                <!-- Fullscreen -->
                <button id="fullscreen-btn" class="p-1.5 hover:text-apex-pink transition-colors" title="Fullscreen (F)">
                  <i data-lucide="maximize" id="fs-icon" class="w-5 h-5"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    this.video = document.getElementById('apex-video');
    this.loadSource(this.currentSource);
    this.attachEvents();
  }

  loadSource(source, seekTo = 0) {
    if (!source) return;
    this.currentSource = source;

    const embedWrap = document.getElementById('apex-embed-frame-wrap');
    const embedFrame = document.getElementById('apex-embed-frame');
    const controls = document.getElementById('player-controls');

    // Check if source is pure direct video or stream
    const isDirectVideo = source.type === 'mp4' || 
                          source.type === 'hls' || 
                          /\.(mp4|m3u8|webm)(\?.*)?$/i.test(source.url || '') || 
                          (source.url || '').includes('/api/stream/') ||
                          (source.url || '').includes('api.telegram.org/file/') ||
                          (source.url || '').includes('workers.dev') ||
                          (source.url || '').includes('faststream');

    const isTgPost = /(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]+)\/(\d+)/i.test(source.url || '');
    const isIframe = !isDirectVideo && (source.type === 'iframe' || source.type === 'telegram' || isTgPost);

    if (isIframe && embedWrap && embedFrame) {
      if (this.hls) {
        this.hls.destroy();
        this.hls = null;
      }
      if (this.video) {
        this.video.pause();
        this.video.style.display = 'none';
      }

      let embedUrl = source.embedUrl || source.url;
      if (isTgPost) {
        const match = (source.url || '').match(/(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]+)\/(\d+)/i);
        if (match) {
          embedUrl = `https://t.me/${match[1]}/${match[2]}?embed=1&autoplay=1`;
        }
      }

      embedFrame.src = embedUrl;
      embedWrap.classList.remove('hidden');
      if (controls) controls.style.display = 'none';
      return;
    }

    // Direct Video / HLS mode
    if (embedWrap) {
      embedWrap.classList.add('hidden');
      if (embedFrame) embedFrame.src = 'about:blank';
    }
    if (controls) controls.style.display = 'flex';
    if (this.video) this.video.style.display = 'block';

    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }

    if (source.type === 'hls' && window.Hls && Hls.isSupported()) {
      this.hls = new Hls({ enableWorker: true, lowLatencyMode: false });
      this.hls.loadSource(source.url);
      this.hls.attachMedia(this.video);
      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (seekTo > 0) this.video.currentTime = seekTo;
        this.video.play().catch(() => {});
      });
    } else if (source.type === 'hls' && this.video.canPlayType('application/vnd.apple.mpegurl')) {
      this.video.src = source.url;
      this.video.addEventListener('loadedmetadata', () => {
        if (seekTo > 0) this.video.currentTime = seekTo;
        this.video.play().catch(() => {});
      }, { once: true });
    } else {
      this.video.src = source.url;
      if (seekTo > 0) {
        this.video.addEventListener('loadedmetadata', () => {
          this.video.currentTime = seekTo;
          this.video.play().catch(() => {});
        }, { once: true });
      }
    }
  }

  attachEvents() {
    const video = this.video;
    const wrapper = document.getElementById('apex-player-wrapper');
    const controls = document.getElementById('player-controls');

    // Auto-hide controls
    const showControls = () => {
      controls.style.opacity = '1';
      controls.style.pointerEvents = 'auto';
      wrapper.style.cursor = 'default';
      clearTimeout(this.hideControlsTimeout);
      if (!video.paused) {
        this.hideControlsTimeout = setTimeout(() => {
          controls.style.opacity = '0';
          controls.style.pointerEvents = 'none';
          wrapper.style.cursor = 'none';
        }, 3000);
      }
    };
    wrapper.addEventListener('mousemove', showControls);
    wrapper.addEventListener('click', showControls);
    wrapper.addEventListener('touchstart', showControls);

    // Video events
    video.addEventListener('timeupdate', () => this.onTimeUpdate());
    video.addEventListener('progress', () => this.onProgress());
    video.addEventListener('play', () => this.onPlay());
    video.addEventListener('pause', () => this.onPause());
    video.addEventListener('ended', () => this.onEnded());
    video.addEventListener('volumechange', () => this.onVolumeChange());

    // Play/Pause
    const playPauseBtn = document.getElementById('play-pause-btn');
    const centerPlayBtn = document.getElementById('center-play-btn');
    const togglePlay = () => video.paused ? video.play() : video.pause();
    playPauseBtn?.addEventListener('click', togglePlay);
    centerPlayBtn?.addEventListener('click', togglePlay);

    // 10s Skip Functionality & Animated Feedback
    const showSkipFeedback = (dir) => {
      const el = document.getElementById(dir < 0 ? 'skip-feedback-left' : 'skip-feedback-right');
      if (!el) return;
      el.classList.remove('opacity-0', 'scale-75');
      el.classList.add('opacity-100', 'scale-100');
      clearTimeout(el._animTimeout);
      el._animTimeout = setTimeout(() => {
        el.classList.remove('opacity-100', 'scale-100');
        el.classList.add('opacity-0', 'scale-75');
      }, 700);
    };

    const skipTime = (seconds) => {
      if (!video) return;
      const target = Math.max(0, Math.min(video.duration || 999999, (video.currentTime || 0) + seconds));
      video.currentTime = target;
      showSkipFeedback(seconds);
      showControls();
    };

    // Center Rewind & Forward buttons (10s)
    document.getElementById('center-rewind-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      skipTime(-10);
    });
    document.getElementById('center-forward-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      skipTime(10);
    });

    // Bottom Bar Rewind & Forward buttons (10s)
    document.getElementById('bar-rewind-10-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      skipTime(-10);
    });
    document.getElementById('bar-forward-10-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      skipTime(10);
    });

    // Bottom Bar Previous & Next Episode buttons
    document.getElementById('prev-ep-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this._prevEpisode) router.navigate(`/watch/${this._prevEpisode.id}`);
      else Toast.info('No previous episode');
    });
    document.getElementById('next-ep-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this._nextEpisode) router.navigate(`/watch/${this._nextEpisode.id}`);
      else Toast.info('No next episode');
    });

    // Mobile Double-Tap & Desktop Double-Click detection
    let lastTapTime = 0;
    let lastTapX = 0;
    wrapper.addEventListener('touchend', (e) => {
      if (e.target.closest('button') || e.target.closest('input') || e.target.closest('#progress-bar-wrap')) return;
      const now = Date.now();
      const touch = e.changedTouches?.[0];
      if (!touch) return;
      const rect = wrapper.getBoundingClientRect();
      const tapX = touch.clientX - rect.left;
      const timeDiff = now - lastTapTime;
      const xDiff = Math.abs(tapX - lastTapX);

      if (timeDiff < 320 && timeDiff > 40 && xDiff < 100) {
        e.preventDefault();
        if (tapX < rect.width * 0.38) {
          skipTime(-10);
        } else if (tapX > rect.width * 0.62) {
          skipTime(10);
        } else {
          togglePlay();
        }
        lastTapTime = 0;
      } else {
        lastTapTime = now;
        lastTapX = tapX;
      }
    });

    wrapper.addEventListener('dblclick', (e) => {
      if (e.target.closest('button') || e.target.closest('input') || e.target.closest('#progress-bar-wrap')) return;
      const rect = wrapper.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      if (clickX < rect.width * 0.35) {
        skipTime(-10);
      } else if (clickX > rect.width * 0.65) {
        skipTime(10);
      } else {
        this.toggleFullscreen();
      }
    });

    // Volume
    const volSlider = document.getElementById('volume-slider');
    volSlider?.addEventListener('input', () => { video.volume = parseFloat(volSlider.value); video.muted = false; });
    document.getElementById('mute-btn')?.addEventListener('click', () => { video.muted = !video.muted; });

    // Progress bar scrubbing
    const progressWrap = document.getElementById('progress-bar-wrap');
    const tooltip = document.getElementById('scrub-tooltip');
    if (progressWrap) {
      const getScrubTime = (e) => {
        const rect = progressWrap.getBoundingClientRect();
        const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
        return Math.max(0, Math.min(1, x / rect.width)) * video.duration;
      };
      progressWrap.addEventListener('mousemove', (e) => {
        if (!video.duration) return;
        const t = getScrubTime(e);
        const rect = progressWrap.getBoundingClientRect();
        const x = (e.clientX - rect.left);
        tooltip.style.left = `${Math.max(0, Math.min(x, rect.width - 40))}px`;
        tooltip.textContent = fmt(t);
        tooltip.classList.remove('hidden');
      });
      progressWrap.addEventListener('mouseleave', () => tooltip.classList.add('hidden'));
      progressWrap.addEventListener('click', (e) => {
        if (!video.duration) return;
        video.currentTime = getScrubTime(e);
      });
    }

    // Fullscreen
    document.getElementById('fullscreen-btn')?.addEventListener('click', () => this.toggleFullscreen());
    document.addEventListener('fullscreenchange', () => {
      const fsIcon = document.getElementById('fs-icon');
      if (fsIcon) fsIcon.setAttribute('data-lucide', document.fullscreenElement ? 'minimize' : 'maximize');
      if (window.lucide) window.lucide.createIcons();
    });

    // PiP
    document.getElementById('pip-btn')?.addEventListener('click', async () => {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (video.requestPictureInPicture) {
        await video.requestPictureInPicture().catch(() => Toast.error('PiP not supported'));
      }
    });

    // Speed
    document.getElementById('speed-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('speed-menu').classList.toggle('hidden');
    });
    document.querySelectorAll('.speed-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        const speed = parseFloat(btn.dataset.speed);
        video.playbackRate = speed;
        document.getElementById('speed-btn').textContent = `${speed}×`;
        document.getElementById('speed-menu').classList.add('hidden');
        document.querySelectorAll('.speed-opt').forEach(b => {
          b.className = `speed-opt w-full text-left px-3 py-1.5 text-sm rounded-lg hover:bg-white/10 ${b.dataset.speed === btn.dataset.speed ? 'text-apex-pink font-bold' : 'text-gray-200'}`;
        });
      });
    });

    // Settings (Audio/Server)
    document.getElementById('settings-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('settings-menu').classList.toggle('hidden');
    });
    document.querySelectorAll('.source-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index, 10);
        const src = this.sources[idx];
        const curTime = video.currentTime;
        this.loadSource(src, curTime);
        document.getElementById('settings-menu').classList.add('hidden');
        Toast.info(`Switched to ${src.server} (${src.audioLabel || src.audio})`);
      });
    });

    // Custom Stream URL input prompt
    document.getElementById('add-custom-stream-url-btn')?.addEventListener('click', () => {
      document.getElementById('settings-menu')?.classList.add('hidden');
      const customUrl = prompt('Enter or paste video URL (HLS .m3u8, MP4, or Telegram t.me link):');
      if (customUrl && customUrl.trim()) {
        const trimmed = customUrl.trim();
        const isTg = /(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]+)\/(\d+)/i.test(trimmed);
        const isHls = trimmed.includes('.m3u8') || trimmed.includes('/hls/');
        const isEmbed = trimmed.includes('embed') || trimmed.includes('iframe');

        let type = 'mp4';
        let embedUrl = null;
        if (isTg) {
          type = 'telegram';
          const match = trimmed.match(/(?:t\.me|telegram\.me)\/([a-zA-Z0-9_]+)\/(\d+)/i);
          embedUrl = `https://t.me/${match[1]}/${match[2]}?embed=1`;
        } else if (isHls) {
          type = 'hls';
        } else if (isEmbed) {
          type = 'iframe';
          embedUrl = trimmed;
        }

        const customSource = {
          server: isTg ? 'Telegram Custom Stream' : 'Custom Stream URL',
          type,
          url: embedUrl || trimmed,
          embedUrl: embedUrl || trimmed,
          quality: 'Direct Stream',
          audio: 'custom',
          audioLabel: isTg ? 'Telegram Audio' : 'Custom Audio'
        };
        this.sources.unshift(customSource);
        this.loadSource(customSource, 0);
        Toast.success(isTg ? 'Now playing Telegram video stream! ✈' : 'Now playing your custom video stream! 🎬');
      }
    });

    // Skip Intro/Outro
    document.getElementById('skip-intro-btn')?.addEventListener('click', () => {
      video.currentTime = this.episode.intro_end || 175;
      document.getElementById('skip-intro-btn').classList.add('hidden');
    });
    document.getElementById('skip-outro-btn')?.addEventListener('click', () => {
      video.currentTime = video.duration - 1;
    });

    // Close menus on outside click
    document.addEventListener('click', () => {
      document.getElementById('speed-menu')?.classList.add('hidden');
      document.getElementById('settings-menu')?.classList.add('hidden');
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      switch (e.code) {
        case 'Space':
        case 'KeyK': e.preventDefault(); togglePlay(); break;
        case 'KeyM': video.muted = !video.muted; break;
        case 'KeyF': this.toggleFullscreen(); break;
        case 'KeyP': document.getElementById('pip-btn')?.click(); break;
        case 'ArrowLeft':
        case 'KeyJ': e.preventDefault(); skipTime(-10); break;
        case 'ArrowRight':
        case 'KeyL': e.preventDefault(); skipTime(10); break;
        case 'ArrowUp': e.preventDefault(); video.volume = Math.min(1, video.volume + 0.1); break;
        case 'ArrowDown': e.preventDefault(); video.volume = Math.max(0, video.volume - 0.1); break;
      }
    });

    // Auto-save progress every 15s
    if (state.isAuthenticated() && this.episode.anime_id) {
      this.progressInterval = setInterval(async () => {
        if (!video.paused && video.currentTime > 5) {
          try {
            await api.saveProgress(this.episode.anime_id, this.episode.id, video.currentTime, video.duration);
          } catch {}
        }
      }, 15000);
    }
  }

  onTimeUpdate() {
    const video = this.video;
    if (!video.duration) return;
    const pct = (video.currentTime / video.duration) * 100;
    const progBar = document.getElementById('progress-bar');
    if (progBar) progBar.style.width = `${pct}%`;
    const timeDisp = document.getElementById('time-display');
    if (timeDisp) timeDisp.textContent = `${fmt(video.currentTime)} / ${fmt(video.duration)}`;

    // Skip intro button
    const introStart = this.episode.intro_start || 85;
    const introEnd = this.episode.intro_end || 175;
    const outroStart = this.episode.outro_start || 1350;
    const introBtn = document.getElementById('skip-intro-btn');
    const outroBtn = document.getElementById('skip-outro-btn');

    if (introBtn) introBtn.classList.toggle('hidden', !(video.currentTime >= introStart && video.currentTime < introEnd));
    if (outroBtn) outroBtn.classList.toggle('hidden', !(video.currentTime >= outroStart && !video.ended));

    // Auto-skip intro if setting enabled
    if (state.settings?.autoSkipIntro && video.currentTime >= introStart && video.currentTime < introEnd && !this._introSkipped) {
      this._introSkipped = true;
      video.currentTime = introEnd;
      Toast.info('⏭ Skipped intro');
    }
  }

  onProgress() {
    const video = this.video;
    if (!video.duration || !video.buffered.length) return;
    const buffered = video.buffered.end(video.buffered.length - 1);
    const bufferPct = (buffered / video.duration) * 100;
    const bufBar = document.getElementById('buffer-bar');
    if (bufBar) bufBar.style.width = `${bufferPct}%`;
  }

  onPlay() {
    const icon = document.getElementById('play-icon');
    const centerIcon = document.getElementById('center-icon');
    if (icon) icon.setAttribute('data-lucide', 'pause');
    if (centerIcon) centerIcon.setAttribute('data-lucide', 'pause');
    if (window.lucide) window.lucide.createIcons();
  }

  onPause() {
    const icon = document.getElementById('play-icon');
    const centerIcon = document.getElementById('center-icon');
    if (icon) icon.setAttribute('data-lucide', 'play');
    if (centerIcon) centerIcon.setAttribute('data-lucide', 'play');
    if (window.lucide) window.lucide.createIcons();
  }

  onVolumeChange() {
    const video = this.video;
    const volSlider = document.getElementById('volume-slider');
    const volIcon = document.getElementById('vol-icon');
    if (volSlider) volSlider.value = video.muted ? 0 : video.volume;
    if (volIcon) volIcon.setAttribute('data-lucide', video.muted || video.volume === 0 ? 'volume-x' : video.volume < 0.5 ? 'volume-1' : 'volume-2');
    if (window.lucide) window.lucide.createIcons();
  }

  onEnded() {
    if (state.isAuthenticated() && this.episode.anime_id) {
      api.saveProgress(this.episode.anime_id, this.episode.id, this.video.duration, this.video.duration).catch(() => {});
    }
    // Show next episode overlay if nextEpisode exists
    if (this._nextEpisode && state.settings?.autoNextEpisode !== false) {
      this.showNextEpisodeOverlay(this._nextEpisode);
    }
  }

  showNextEpisodeOverlay(nextEp) {
    const overlay = document.getElementById('next-ep-overlay');
    const title = document.getElementById('next-ep-title');
    if (!overlay) return;
    if (title) title.textContent = `EP ${nextEp.episode_number}: ${nextEp.title}`;
    overlay.classList.remove('hidden');
    overlay.classList.add('flex');

    let countdown = 10;
    const countEl = document.getElementById('next-countdown');
    const interval = setInterval(() => {
      countdown--;
      if (countEl) countEl.textContent = countdown;
      if (countdown <= 0) {
        clearInterval(interval);
        router.navigate(`/watch/${nextEp.id}`);
      }
    }, 1000);

    document.getElementById('play-next-now')?.addEventListener('click', () => {
      clearInterval(interval);
      router.navigate(`/watch/${nextEp.id}`);
    });
    document.getElementById('cancel-next')?.addEventListener('click', () => {
      clearInterval(interval);
      overlay.classList.add('hidden');
      overlay.classList.remove('flex');
    });
  }

  setPrevEpisode(ep) {
    this._prevEpisode = ep;
  }

  setNextEpisode(ep) {
    this._nextEpisode = ep;
  }

  destroy() {
    if (this.hls) { this.hls.destroy(); this.hls = null; }
    if (this.progressInterval) clearInterval(this.progressInterval);
    if (this.video) this.video.src = '';
  }

  toggleFullscreen() {
    const wrapper = document.getElementById('apex-player-wrapper');
    if (!document.fullscreenElement) {
      wrapper?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }
}

export async function renderWatchPage(app, episodeId) {
  app.innerHTML = `
    <div class="max-w-screen-2xl mx-auto px-4 py-6">
      <div class="animate-pulse space-y-4">
        <div class="skeleton w-full rounded-xl" style="aspect-ratio:16/9"></div>
        <div class="skeleton h-6 w-1/3"></div>
        <div class="skeleton h-4 w-1/4"></div>
      </div>
    </div>
  `;

  try {
    const res = await api.getEpisode(episodeId);
    const { episode, anime, allEpisodes, prevEpisode, nextEpisode, resumeSeconds } = res;

    if (!episode) {
      app.innerHTML = `<div class="text-center py-20"><p class="text-gray-400">Episode not found</p><a href="#/" class="btn-apex-primary mt-4 inline-block">Go Home</a></div>`;
      return;
    }

    document.title = `${anime?.title || ''} EP ${episode.episode_number} — APEX`;

    // Multi-Season Grouping for Watch Page Sidebar
    const currentEpSeason = episode.season_number || episode.season || 1;
    const watchSeasonsMap = new Map();
    (allEpisodes || []).forEach(ep => {
      let s = ep.season_number || ep.season || 1;
      if (typeof s === 'string') s = parseInt(s, 10) || 1;
      if (!watchSeasonsMap.has(s)) watchSeasonsMap.set(s, []);
      watchSeasonsMap.get(s).push(ep);
    });
    const watchSeasonKeys = Array.from(watchSeasonsMap.keys()).sort((a, b) => a - b);

    app.innerHTML = `
      <div class="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
        <div class="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <!-- Main: Player + Info -->
          <div class="xl:col-span-3 space-y-5">
            <!-- Breadcrumb -->
            <div class="flex items-center gap-2 text-sm text-gray-400">
              <a href="#/anime/${anime?.slug}" class="hover:text-apex-pink transition-colors font-semibold">${anime?.title || 'Anime'}</a>
              <i data-lucide="chevron-right" class="w-4 h-4"></i>
              <span class="text-white font-semibold">Episode ${episode.episode_number}: ${episode.title}</span>
            </div>

            <!-- Video Player Container -->
            <div id="player-mount"></div>

            <!-- Episode Nav -->
            <div class="flex items-center justify-between">
              ${prevEpisode ? `
                <a href="#/watch/${prevEpisode.id}" class="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-apex-pink transition-colors">
                  <i data-lucide="skip-back" class="w-5 h-5"></i>
                  <div>
                    <div class="text-xs text-gray-500">Previous</div>
                    <div>EP ${prevEpisode.episode_number}: ${prevEpisode.title}</div>
                  </div>
                </a>
              ` : '<div></div>'}
              ${nextEpisode ? `
                <a href="#/watch/${nextEpisode.id}" class="flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-apex-pink transition-colors text-right">
                  <div>
                    <div class="text-xs text-gray-500">Next</div>
                    <div>EP ${nextEpisode.episode_number}: ${nextEpisode.title}</div>
                  </div>
                  <i data-lucide="skip-forward" class="w-5 h-5"></i>
                </a>
              ` : '<div></div>'}
            </div>

            <!-- Episode Info -->
            <div class="glass-panel rounded-xl p-5">
              <div class="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 class="text-xl font-black text-white mb-1">EP ${episode.episode_number}: ${episode.title}</h1>
                  <p class="text-sm text-gray-400">${anime?.title || ''} • ${episode.duration || '24:00'}</p>
                </div>
                ${state.isAuthenticated() ? `
                  <a href="#/anime/${anime?.slug}" class="btn-apex-secondary text-sm py-2 px-4">
                    <i data-lucide="list" class="w-4 h-4"></i>
                    <span>Anime Page</span>
                  </a>
                ` : ''}
              </div>
            </div>

            <!-- Video Source Notice -->
            <div class="text-xs text-gray-600 bg-white/3 border border-white/5 rounded-lg p-3 flex items-start gap-2">
              <i data-lucide="shield-check" class="w-4 h-4 text-apex-cyan flex-shrink-0 mt-0.5"></i>
              <span>Authorized open-source demo video streams. Use the Settings (⚙) button to switch between Japanese, English Dub, and Hindi Dub audio tracks. APEX does not host unauthorized content.</span>
            </div>

            <!-- Comments Section -->
            <div id="comments-section"></div>
          </div>

          <!-- Sidebar: Episode List with Season Selector -->
          <div class="xl:col-span-1">
            <div class="glass-panel rounded-xl p-4 sticky top-20">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-bold uppercase tracking-wider text-gray-400">Episodes <span class="text-apex-pink">${allEpisodes?.length || 0}</span></h3>
              </div>

              ${watchSeasonKeys.length > 1 ? `
                <!-- Watch Page Season Tabs -->
                <div class="flex items-center gap-1.5 mb-3.5 overflow-x-auto pb-1" id="watch-season-tabs">
                  ${watchSeasonKeys.map(s => `
                    <button class="watch-season-btn flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${s === currentEpSeason ? 'bg-apex-pink text-white shadow-md shadow-pink-500/20' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}" data-season="${s}">
                      Season ${s}
                    </button>
                  `).join('')}
                </div>
              ` : ''}

              <div class="space-y-2 max-h-[65vh] overflow-y-auto pr-1" id="watch-episode-list">
                ${(allEpisodes || []).map(ep => {
                  const sNum = ep.season_number || ep.season || 1;
                  const isHidden = watchSeasonKeys.length > 1 && sNum !== currentEpSeason;
                  return `
                    <a href="#/watch/${ep.id}" class="watch-episode-item flex items-center gap-2 p-2.5 rounded-lg border ${ep.id === episode.id ? 'border-apex-pink/50 bg-apex-pink/10' : 'border-transparent hover:border-white/10 hover:bg-white/3'} transition-all group" data-season="${sNum}" style="${isHidden ? 'display: none;' : ''}">
                      <div class="w-16 flex-shrink-0 rounded overflow-hidden aspect-video bg-black">
                        <img src="${ep.thumbnail_url || ''}" onerror="this.src='https://images.unsplash.com/photo-1534447677768-be436bb09401?w=200'" class="w-full h-full object-cover" loading="lazy">
                      </div>
                      <div class="flex-grow min-w-0">
                        <span class="text-[11px] font-mono font-bold ${ep.id === episode.id ? 'text-apex-pink' : 'text-gray-500'}">${watchSeasonKeys.length > 1 ? `S${sNum} • ` : ''}EP ${ep.episode_number}</span>
                        <p class="text-xs font-semibold text-white truncate">${ep.title}</p>
                      </div>
                    </a>
                  `;
                }).join('')}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    // Watch Page Season Switching Logic
    const watchSeasonBtns = app.querySelectorAll('.watch-season-btn');
    if (watchSeasonBtns.length > 0) {
      watchSeasonBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const s = parseInt(btn.dataset.season, 10);
          watchSeasonBtns.forEach(b => {
            b.classList.remove('bg-apex-pink', 'text-white', 'shadow-md', 'shadow-pink-500/20');
            b.classList.add('bg-white/5', 'text-gray-400');
          });
          btn.classList.add('bg-apex-pink', 'text-white', 'shadow-md', 'shadow-pink-500/20');
          btn.classList.remove('bg-white/5', 'text-gray-400');

          app.querySelectorAll('.watch-episode-item').forEach(item => {
            item.style.display = (parseInt(item.dataset.season, 10) === s) ? 'flex' : 'none';
          });
        });
      });
    }

    // Mount player
    const playerMount = document.getElementById('player-mount');
    if (playerMount) {
      const player = new ApexPlayer(playerMount, episode, anime, state.settings);
      player.setPrevEpisode(prevEpisode);
      player.setNextEpisode(nextEpisode);

      // Resume playback
      if (resumeSeconds > 10) {
        player.video?.addEventListener('loadedmetadata', () => {
          player.video.currentTime = resumeSeconds;
          Toast.info(`▶ Resuming from ${fmt(resumeSeconds)}`);
        }, { once: true });
      }

      // Cleanup on navigation
      window._apexPlayerCleanup = () => player.destroy();
    }

    // Load comments
    loadComments(episode.id, episode.anime_id, app);

  } catch (err) {
    console.error('Watch page error:', err);
    app.innerHTML = `
      <div class="text-center py-20 px-4">
        <i data-lucide="alert-triangle" class="w-14 h-14 text-apex-pink mx-auto mb-4"></i>
        <h2 class="text-xl font-bold mb-2">Episode Failed to Load</h2>
        <p class="text-gray-400 mb-6">${err.message}</p>
        <a href="#/" class="btn-apex-primary">Go Home</a>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  }
}

async function loadComments(episodeId, animeId, app) {
  const section = document.getElementById('comments-section');
  if (!section) return;
  section.innerHTML = `
    <div class="glass-panel rounded-xl p-6">
      <h3 class="text-lg font-bold text-white mb-5">Discussion</h3>
      ${state.isAuthenticated() ? `
        <div class="flex gap-3 mb-6">
          <img src="${state.user?.avatar || ''}" class="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-white/10">
          <div class="flex-grow">
            <textarea id="comment-input" rows="2" placeholder="Share your thoughts... (Use spoiler checkbox for spoilers)" class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm text-white resize-none focus:outline-none focus:border-apex-pink transition-colors"></textarea>
            <div class="flex items-center justify-between mt-2">
              <label class="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                <input type="checkbox" id="spoiler-check" class="accent-apex-pink">
                Mark as Spoiler
              </label>
              <button id="post-comment-btn" class="btn-apex-primary text-sm py-1.5 px-4">
                <i data-lucide="send" class="w-4 h-4"></i> Post
              </button>
            </div>
          </div>
        </div>
      ` : `
        <div class="mb-6 text-sm text-gray-400">
          <a href="#/login" class="text-apex-pink font-semibold hover:underline">Sign in</a> to join the discussion.
        </div>
      `}
      <div id="comments-list" class="space-y-4">
        <div class="text-center py-4 text-gray-400 text-sm">Loading comments...</div>
      </div>
    </div>
  `;
  if (window.lucide) window.lucide.createIcons();

  // Post comment handler
  document.getElementById('post-comment-btn')?.addEventListener('click', async () => {
    const content = document.getElementById('comment-input')?.value?.trim();
    const isSpoiler = document.getElementById('spoiler-check')?.checked;
    if (!content) return;

    try {
      await api.addComment(episodeId, animeId, content, isSpoiler);
      document.getElementById('comment-input').value = '';
      Toast.success('Comment posted!');
      await renderComments(episodeId);
    } catch (err) {
      Toast.error(err.message);
    }
  });

  await renderComments(episodeId);
}

async function renderComments(episodeId) {
  const list = document.getElementById('comments-list');
  if (!list) return;

  try {
    const res = await api.getComments(episodeId);
    const comments = res?.comments || [];

    if (comments.length === 0) {
      list.innerHTML = `<div class="text-center py-6 text-gray-400 text-sm">No comments yet. Be the first to comment!</div>`;
      return;
    }

    list.innerHTML = comments.map(c => {
      const time = new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      const isMine = state.isAuthenticated() && state.user.id === c.user_id;
      const isAdmin = state.isAdmin();

      return `
        <div class="flex gap-3 group" id="comment-${c.id}">
          <img src="${c.user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64'}" class="w-8 h-8 rounded-full object-cover flex-shrink-0 border border-white/10">
          <div class="flex-grow">
            <div class="flex items-center gap-2 mb-1">
              <span class="text-sm font-bold text-white">${c.user?.username || 'Unknown'}</span>
              ${c.user?.role === 'admin' ? '<span class="text-[10px] font-bold bg-apex-pink/20 text-apex-pink px-1.5 rounded">STAFF</span>' : ''}
              ${c.is_spoiler ? '<span class="text-[10px] font-bold bg-yellow-500/20 text-yellow-400 px-1.5 rounded">SPOILER</span>' : ''}
              <span class="text-xs text-gray-500">${time}</span>
              ${isMine || isAdmin ? `
                <button class="delete-comment-btn ml-auto opacity-0 group-hover:opacity-100 text-xs text-red-400 hover:text-red-300 transition-all" data-id="${c.id}">
                  <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
              ` : ''}
            </div>
            ${c.is_spoiler ? `
              <div class="spoiler-content text-sm text-gray-200 leading-relaxed" onclick="this.classList.add('revealed')" title="Click to reveal spoiler">
                ${c.content}
              </div>
              <p class="text-xs text-yellow-400 mt-0.5">⚠ Click above to reveal spoiler</p>
            ` : `
              <p class="text-sm text-gray-200 leading-relaxed">${c.content}</p>
            `}
          </div>
        </div>
      `;
    }).join('');

    if (window.lucide) window.lucide.createIcons();

    document.querySelectorAll('.delete-comment-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('Delete this comment?')) return;
        try {
          await api.deleteComment(btn.dataset.id);
          document.getElementById(`comment-${btn.dataset.id}`)?.remove();
          Toast.success('Comment deleted');
        } catch (err) {
          Toast.error(err.message);
        }
      });
    });

  } catch (err) {
    list.innerHTML = `<div class="text-center text-sm text-gray-400">Could not load comments</div>`;
  }
}
