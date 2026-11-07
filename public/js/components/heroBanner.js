// Hero Banner Component

export function renderHeroBanner(featuredAnimeList) {
  if (!featuredAnimeList || featuredAnimeList.length === 0) {
    return `
      <div class="relative w-full h-[400px] sm:h-[460px] overflow-hidden bg-gradient-to-br from-[#0a0b12] via-[#121422] to-[#1a1226] select-none flex items-center border-b border-white/5">
        <div class="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(236,72,153,0.12),transparent_60%)]"></div>
        <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
          <div class="max-w-2xl space-y-4">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-apex-pink/10 text-apex-pink border border-apex-pink/20">
              <i data-lucide="sparkles" class="w-3.5 h-3.5"></i> Custom Anime Platform
            </span>
            <h1 class="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Welcome to <span class="bg-gradient-to-r from-apex-pink via-purple-400 to-apex-cyan bg-clip-text text-transparent">APEX STREAM</span>
            </h1>
            <p class="text-gray-300 text-sm sm:text-base leading-relaxed">
              Database is clean and ready. Add anime from the Admin Panel or paste Telegram stream links to go live instantly!
            </p>
            <div class="flex flex-wrap items-center gap-3 pt-2">
              <a href="#/admin" class="btn-apex-primary px-6 py-3 text-sm flex items-center gap-2">
                <i data-lucide="plus-circle" class="w-4 h-4"></i> Add Anime from Admin
              </a>
              <a href="#/stream" class="btn-apex-secondary px-6 py-3 text-sm flex items-center gap-2">
                <i data-lucide="play" class="w-4 h-4"></i> Direct Stream URL
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  let currentIndex = 0;
  const anime = featuredAnimeList[0];

  const html = `
    <div class="relative w-full h-[520px] sm:h-[600px] overflow-hidden bg-black select-none">
      
      <!-- Backdrop Image -->
      <div id="hero-backdrop" class="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-in-out" 
           style="background-image: url('${anime.banner_url || anime.poster_url}');">
      </div>

      <!-- Gradient Overlays for readability -->
      <div class="absolute inset-0 banner-gradient-overlay"></div>
      <div class="absolute inset-0 banner-left-fade hidden sm:block"></div>

      <!-- Content Container -->
      <div class="relative max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex flex-col justify-end pb-12 sm:pb-16">
        <div class="max-w-2xl space-y-4">
          
          <!-- Japanese Title Accent -->
          ${anime.japanese_title ? `
            <div id="hero-jp-title" class="text-sm sm:text-base font-bold text-apex-cyan tracking-widest font-mono">
              ${anime.japanese_title}
            </div>
          ` : ''}

          <!-- Main English Title -->
          <h1 id="hero-title" class="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-md">
            ${anime.title}
          </h1>

          <!-- Meta Information Badges -->
          <div id="hero-meta" class="flex flex-wrap items-center gap-3 text-xs sm:text-sm font-semibold">
            <span class="badge-score text-sm px-2.5 py-1">★ ${anime.rating}</span>
            <span class="px-2.5 py-1 rounded bg-white/10 text-white font-mono">${anime.year}</span>
            <span class="px-2.5 py-1 rounded bg-white/10 text-white font-mono">${anime.type || 'TV'}</span>
            <span class="px-2.5 py-1 rounded bg-white/10 text-white font-mono">${anime.studio}</span>
            <span class="text-gray-300 hidden sm:inline">•</span>
            <span class="text-apex-pink hidden sm:inline">${(anime.genres || []).join(', ')}</span>
          </div>

          <!-- Synopsis snippet -->
          <p id="hero-synopsis" class="text-sm sm:text-base text-gray-300 line-clamp-3 leading-relaxed drop-shadow">
            ${anime.synopsis}
          </p>

          <!-- Action Buttons -->
          <div class="flex items-center gap-4 pt-2">
            <a id="hero-play-btn" href="#/anime/${anime.slug}" class="btn-apex-primary text-base py-3 px-6 shadow-xl shadow-pink-500/25">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>
              <span>Watch Now</span>
            </a>
            <a id="hero-info-btn" href="#/anime/${anime.slug}" class="btn-apex-secondary text-base py-3 px-5">
              <i data-lucide="info" class="w-5 h-5"></i>
              <span>Details</span>
            </a>
          </div>
        </div>
      </div>

      <!-- Carousel Navigation Dots -->
      ${featuredAnimeList.length > 1 ? `
        <div class="absolute right-6 bottom-8 sm:bottom-12 flex items-center gap-2 z-20">
          ${featuredAnimeList.map((item, idx) => `
            <button class="hero-dot w-2.5 h-2.5 rounded-full transition-all duration-300 ${idx === 0 ? 'bg-apex-pink w-8' : 'bg-white/30 hover:bg-white/60'}" data-index="${idx}"></button>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;

  // Attach carousel rotation logic after DOM insertion
  setTimeout(() => {
    const dots = document.querySelectorAll('.hero-dot');
    if (dots.length === 0) return;

    function updateHeroSlide(index) {
      const item = featuredAnimeList[index];
      if (!item) return;

      const backdrop = document.getElementById('hero-backdrop');
      const title = document.getElementById('hero-title');
      const jpTitle = document.getElementById('hero-jp-title');
      const synopsis = document.getElementById('hero-synopsis');
      const playBtn = document.getElementById('hero-play-btn');
      const infoBtn = document.getElementById('hero-info-btn');

      if (backdrop) backdrop.style.backgroundImage = `url('${item.banner_url || item.poster_url}')`;
      if (title) title.innerText = item.title;
      if (jpTitle) jpTitle.innerText = item.japanese_title || '';
      if (synopsis) synopsis.innerText = item.synopsis;
      if (playBtn) playBtn.href = `#/anime/${item.slug}`;
      if (infoBtn) infoBtn.href = `#/anime/${item.slug}`;

      dots.forEach((dot, idx) => {
        if (idx === index) {
          dot.className = 'hero-dot w-8 h-2.5 rounded-full bg-apex-pink transition-all duration-300';
        } else {
          dot.className = 'hero-dot w-2.5 h-2.5 rounded-full bg-white/30 hover:bg-white/60 transition-all duration-300';
        }
      });
    }

    dots.forEach(dot => {
      dot.addEventListener('click', () => {
        const idx = parseInt(dot.getAttribute('data-index'), 10);
        currentIndex = idx;
        updateHeroSlide(idx);
      });
    });

    // Auto rotate every 7 seconds
    const interval = setInterval(() => {
      if (!document.getElementById('hero-backdrop')) {
        clearInterval(interval);
        return;
      }
      currentIndex = (currentIndex + 1) % featuredAnimeList.length;
      updateHeroSlide(currentIndex);
    }, 7000);
  }, 100);

  return html;
}
