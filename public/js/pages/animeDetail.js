import { api } from '../api.js';
import { state } from '../state.js';
import { createAnimeCard } from '../components/animeCard.js';
import { Toast } from '../components/toast.js';

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function renderEpisodeList(episodes, resumeEpisode, animeSlug, isMovie = false) {
  if (!episodes || episodes.length === 0) {
    return `<p class="text-gray-400 text-sm py-4 text-center">${isMovie ? 'No movie stream link available yet.' : 'No episodes available yet.'}</p>`;
  }

  // Group episodes by Season (Season 1, Season 2, etc.)
  const seasonsMap = new Map();
  episodes.forEach(ep => {
    let sNum = ep.season_number || ep.season || 1;
    if (typeof sNum === 'string') sNum = parseInt(sNum, 10) || 1;
    if (!seasonsMap.has(sNum)) seasonsMap.set(sNum, []);
    seasonsMap.get(sNum).push(ep);
  });

  const seasonKeys = Array.from(seasonsMap.keys()).sort((a, b) => a - b);
  const hasMultipleSeasons = seasonKeys.length > 1;
  const initialSeason = seasonKeys[0];

  return `
    ${hasMultipleSeasons ? `
      <!-- Multi-Season Selector Tabs -->
      <div class="flex items-center gap-2 mb-3.5 overflow-x-auto pb-1" id="season-selector-tabs">
        ${seasonKeys.map((s, idx) => `
          <button class="season-tab-btn flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${idx === 0 ? 'bg-apex-pink text-white shadow-lg shadow-pink-500/20' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}" data-season="${s}">
            Season ${s} <span class="ml-1 opacity-75 text-[10px]">(${seasonsMap.get(s).length})</span>
          </button>
        `).join('')}
      </div>
    ` : ''}

    <div class="space-y-2 max-h-[480px] overflow-y-auto pr-1" id="episode-list">
      ${episodes.map(ep => {
        const epSeason = ep.season_number || ep.season || 1;
        const isResume = resumeEpisode && resumeEpisode.episode_id === ep.id;
        const pct = isResume && resumeEpisode.total_seconds > 0
          ? Math.round((resumeEpisode.progress_seconds / resumeEpisode.total_seconds) * 100)
          : 0;
        const isHidden = hasMultipleSeasons && epSeason !== initialSeason;
        return `
          <a href="#/watch/${ep.id}" class="episode-list-item group flex items-start gap-3 p-3 rounded-xl border border-[var(--border-color)] hover:border-apex-pink/40 hover:bg-white/3 transition-all bg-[var(--bg-secondary)]" data-season="${epSeason}" style="${isHidden ? 'display: none;' : ''}">
            <div class="relative w-28 flex-shrink-0 rounded-lg overflow-hidden aspect-video bg-black">
              <img src="${ep.thumbnail_url || ''}" alt="${ep.title || 'Stream'}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400'" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
              ${isResume ? `
                <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
                  <div class="h-full bg-apex-pink" style="width:${pct}%"></div>
                </div>
              ` : ''}
              <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50">
                <i data-lucide="play" class="w-6 h-6 text-white fill-white"></i>
              </div>
            </div>
            <div class="flex-grow min-w-0">
              <div class="flex items-center gap-2 mb-0.5">
                <span class="text-xs font-mono font-bold ${isMovie ? 'text-purple-400' : 'text-apex-pink'}">
                  ${isMovie ? '🎬 FULL MOVIE' : (hasMultipleSeasons ? `S${epSeason} • EP ${ep.episode_number}` : `EP ${ep.episode_number}`)}
                </span>
                ${isResume ? `<span class="text-[10px] font-bold bg-apex-pink/20 text-apex-pink px-1.5 rounded">RESUME</span>` : ''}
              </div>
              <p class="text-sm font-semibold text-white truncate">${ep.title}</p>
              <p class="text-xs text-gray-400 mt-0.5">${ep.duration || (isMovie ? 'Feature Film' : '24:00')}</p>
            </div>
          </a>
        `;
      }).join('')}
    </div>
  `;
}

export async function renderAnimeDetail(app, slug) {
  app.innerHTML = `
    <div class="animate-pulse">
      <div class="skeleton w-full h-[400px]"></div>
      <div class="max-w-7xl mx-auto px-4 py-8">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div class="lg:col-span-2 space-y-4">
            <div class="skeleton h-10 w-3/4"></div>
            <div class="skeleton h-4 w-1/4"></div>
            <div class="skeleton h-24 w-full"></div>
          </div>
          <div class="space-y-3">
            <div class="skeleton h-4 w-full"></div>
            <div class="skeleton h-4 w-5/6"></div>
            <div class="skeleton h-4 w-4/6"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  try {
    const res = await api.getAnimeBySlug(slug);
    const { anime, episodes, watchlistStatus, userRating, resumeEpisode, related } = res;

    if (!anime) {
      app.innerHTML = `<div class="max-w-xl mx-auto py-20 text-center">
        <i data-lucide="film-x" class="w-16 h-16 text-apex-pink mx-auto mb-4"></i>
        <h2 class="text-2xl font-bold mb-2">Anime Not Found</h2>
        <p class="text-gray-400 mb-6">The anime you are looking for does not exist.</p>
        <a href="#/explore" class="btn-apex-primary">Browse Catalog</a>
      </div>`;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    // Update page title & meta for SEO
    document.title = `${anime.title} — APEX`;
    
    const firstEpisode = episodes && episodes.length > 0 ? episodes[0] : null;
    const watchHref = resumeEpisode ? `#/watch/${resumeEpisode.episode_id}` : (firstEpisode ? `#/watch/${firstEpisode.id}` : '#');

    const watchlistOptions = [
      { value: 'watching', label: '▶ Watching', color: 'text-apex-cyan' },
      { value: 'plan_to_watch', label: '📌 Plan to Watch', color: 'text-apex-orange' },
      { value: 'completed', label: '✅ Completed', color: 'text-emerald-400' },
      { value: 'dropped', label: '❌ Dropped', color: 'text-red-400' }
    ];

    app.innerHTML = `
      <!-- Banner -->
      <div class="relative w-full h-[400px] overflow-hidden">
        <img src="${anime.banner_url || anime.poster_url}" alt="${anime.title}" class="w-full h-full object-cover" loading="eager">
        <div class="absolute inset-0 banner-gradient-overlay"></div>
        <div class="absolute inset-0 banner-left-fade hidden sm:block"></div>
      </div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-24 relative z-10 pb-16">
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <!-- Left: Main Info -->
          <div class="lg:col-span-2 space-y-6">
            ${anime.japanese_title ? `<p class="text-sm font-mono text-apex-cyan tracking-widest">${anime.japanese_title}</p>` : ''}
            <h1 class="text-4xl sm:text-5xl font-black text-white leading-tight">${anime.title}</h1>

            <!-- Meta badges row -->
            <div class="flex flex-wrap items-center gap-2 text-sm">
              <span class="badge-score text-sm px-2.5 py-1">★ ${anime.rating}</span>
              <span class="px-2.5 py-1 rounded bg-white/10 text-white font-mono text-xs">${anime.year || ''}</span>
              <span class="px-2.5 py-1 rounded bg-white/10 text-white font-mono text-xs">${anime.type || 'TV'}</span>
              <span class="px-2.5 py-1 rounded ${anime.status === 'Airing' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-gray-300'} font-semibold text-xs">${anime.status}</span>
              <span class="px-2.5 py-1 rounded bg-white/10 text-gray-300 text-xs">${anime.studio || ''}</span>
              ${anime.has_sub ? '<span class="badge-sub">SUB</span>' : ''}
              ${anime.has_dub ? '<span class="badge-dub">DUB</span>' : ''}
              ${anime.has_hindi_dub ? '<span class="badge-hindi">हिन्दी</span>' : ''}
            </div>

            <!-- Genres -->
            <div class="flex flex-wrap gap-2">
              ${(anime.genres || []).map(g => `<span class="px-3 py-1 text-xs font-semibold rounded-full border border-white/10 bg-white/5 text-gray-300 hover:border-apex-pink hover:text-apex-pink transition-colors cursor-pointer" onclick="location.hash='#/explore?genre=${encodeURIComponent(g)}'">${g}</span>`).join('')}
            </div>

            <!-- CTA Buttons -->
            <div class="flex flex-wrap gap-4 pt-2">
              ${firstEpisode ? `
                <a href="${watchHref}" class="btn-apex-primary text-base py-3 px-7 shadow-xl shadow-pink-500/20">
                  <i data-lucide="${resumeEpisode ? 'refresh-cw' : 'play'}" class="w-5 h-5 fill-white"></i>
                  <span>${resumeEpisode ? (anime.type === 'Movie' ? 'Resume Movie' : `Resume EP ${resumeEpisode.episode_number}`) : (anime.type === 'Movie' ? 'Watch Full Movie' : 'Watch Now')}</span>
                </a>
              ` : ''}

              ${state.isAuthenticated() ? `
                <div class="relative" id="watchlist-dropdown-wrapper">
                  <button id="watchlist-btn" class="btn-apex-secondary py-3 px-5">
                    <i data-lucide="bookmark" class="w-5 h-5 ${watchlistStatus ? 'text-apex-pink fill-apex-pink' : ''}"></i>
                    <span>${watchlistStatus ? watchlistStatus.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) : 'Add to Watchlist'}</span>
                    <i data-lucide="chevron-down" class="w-4 h-4"></i>
                  </button>
                  <div id="watchlist-menu" class="hidden absolute top-14 left-0 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-2 w-52 shadow-2xl z-20">
                    ${watchlistOptions.map(opt => `
                      <button class="watchlist-option w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-white/5 ${watchlistStatus === opt.value ? 'bg-white/8 font-bold' : ''} ${opt.color}" data-status="${opt.value}">${opt.label}</button>
                    `).join('')}
                    ${watchlistStatus ? `<button id="remove-watchlist-btn" class="w-full text-left px-3 py-2.5 text-sm rounded-lg hover:bg-red-500/10 text-red-400 border-t border-white/5 mt-1">🗑 Remove</button>` : ''}
                  </div>
                </div>
              ` : `<a href="#/login" class="btn-apex-secondary py-3 px-5"><i data-lucide="bookmark" class="w-5 h-5"></i><span>Add to Watchlist</span></a>`}

              ${anime.trailer_url ? `
                <a href="${anime.trailer_url}" target="_blank" rel="noopener noreferrer" class="btn-apex-secondary py-3 px-5">
                  <i data-lucide="youtube" class="w-5 h-5 text-red-400"></i>
                  <span>Trailer</span>
                </a>
              ` : ''}
            </div>

            <!-- Synopsis -->
            <div class="glass-panel rounded-xl p-6">
              <h3 class="text-sm font-bold uppercase tracking-wider text-gray-400 mb-3">Synopsis</h3>
              <p class="text-gray-200 leading-relaxed" id="synopsis-text">${anime.synopsis}</p>
            </div>

            <!-- User Rating -->
            ${state.isAuthenticated() ? `
              <div class="glass-panel rounded-xl p-6">
                <h3 class="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">Your Rating</h3>
                <div class="flex items-center gap-2" id="star-rating">
                  ${Array.from({length: 10}, (_, i) => i + 1).map(n => `
                    <button class="star-btn text-2xl transition-all ${userRating && n <= userRating ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-300'}" data-rating="${n}">★</button>
                  `).join('')}
                  ${userRating ? `<span class="ml-3 text-sm font-mono font-bold text-yellow-400">${userRating}/10</span>` : ''}
                </div>
              </div>
            ` : ''}
          </div>

          <!-- Right: Stats & Episodes -->
          <div class="space-y-6">
            <!-- Stats card -->
            <div class="glass-panel rounded-xl p-5 space-y-3">
              <h3 class="text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">Series Info</h3>
              ${[
                ['Episodes', anime.episodes_count || episodes.length],
                ['Season', anime.season ? `${anime.season} ${anime.year}` : anime.year || '—'],
                ['Studio', anime.studio || '—'],
                ['Status', anime.status],
                ['Type', anime.type]
              ].map(([label, val]) => `
                <div class="flex items-center justify-between text-sm">
                  <span class="text-gray-400">${label}</span>
                  <span class="font-semibold text-white">${val}</span>
                </div>
              `).join('')}
            </div>

            <!-- Episodes / Stream list -->
            <div class="glass-panel rounded-xl p-5">
              <h3 class="text-sm font-bold uppercase tracking-wider text-gray-400 mb-4">${anime.type === 'Movie' ? '🎬 Full Movie Stream' : `Episodes <span class="text-apex-pink">${episodes.length}</span>`}</h3>
              ${renderEpisodeList(episodes, resumeEpisode, anime.slug, anime.type === 'Movie')}
            </div>
          </div>
        </div>

        <!-- Related Anime -->
        ${related && related.length > 0 ? `
          <div class="mt-14">
            <h2 class="text-2xl font-black text-white mb-6">Related Anime</h2>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              ${related.map(a => createAnimeCard(a)).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Attribution -->
        <p class="text-xs text-gray-600 mt-10 text-center">Metadata provided by <a href="https://anilist.co" target="_blank" class="text-apex-cyan hover:underline">AniList GraphQL API</a>. APEX does not host or scrape unauthorized video content.</p>
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    // Multi-Season Tab Toggle Logic
    const seasonTabs = app.querySelectorAll('.season-tab-btn');
    if (seasonTabs.length > 0) {
      seasonTabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const targetSeason = tab.dataset.season;
          seasonTabs.forEach(t => {
            t.classList.remove('bg-apex-pink', 'text-white', 'shadow-lg', 'shadow-pink-500/20');
            t.classList.add('bg-white/5', 'text-gray-400');
          });
          tab.classList.add('bg-apex-pink', 'text-white', 'shadow-lg', 'shadow-pink-500/20');
          tab.classList.remove('bg-white/5', 'text-gray-400');

          const items = app.querySelectorAll('.episode-list-item');
          items.forEach(item => {
            item.style.display = (item.dataset.season === targetSeason) ? 'flex' : 'none';
          });
        });
      });
    }

    // Watchlist Dropdown Logic
    const watchlistBtn = document.getElementById('watchlist-btn');
    const watchlistMenu = document.getElementById('watchlist-menu');
    if (watchlistBtn && watchlistMenu) {
      watchlistBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        watchlistMenu.classList.toggle('hidden');
      });
      document.addEventListener('click', () => watchlistMenu.classList.add('hidden'));

      document.querySelectorAll('.watchlist-option').forEach(btn => {
        btn.addEventListener('click', async () => {
          try {
            await api.setWatchlist(anime.id, btn.dataset.status);
            Toast.success(`Added to ${btn.dataset.status.replace('_', ' ')} list`);
            renderAnimeDetail(app, slug);
          } catch (err) {
            Toast.error(err.message);
          }
        });
      });

      const removeBtn = document.getElementById('remove-watchlist-btn');
      if (removeBtn) {
        removeBtn.addEventListener('click', async () => {
          try {
            await api.removeFromWatchlist(anime.id);
            Toast.success('Removed from watchlist');
            renderAnimeDetail(app, slug);
          } catch (err) {
            Toast.error(err.message);
          }
        });
      }
    }

    // Star Rating
    document.querySelectorAll('.star-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!state.isAuthenticated()) {
          Toast.info('Please log in to rate anime');
          return;
        }
        try {
          const rating = parseInt(btn.dataset.rating, 10);
          await api.rateAnime(anime.id, rating);
          Toast.success(`Rated ${rating}/10 ⭐`);
          document.querySelectorAll('.star-btn').forEach((s, i) => {
            s.className = `star-btn text-2xl transition-all ${i + 1 <= rating ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-300'}`;
          });
        } catch (err) {
          Toast.error(err.message);
        }
      });
    });

  } catch (err) {
    console.error('Anime detail error:', err);
    app.innerHTML = `
      <div class="max-w-xl mx-auto py-20 text-center px-4">
        <i data-lucide="alert-triangle" class="w-14 h-14 text-apex-pink mx-auto mb-4"></i>
        <h2 class="text-2xl font-bold mb-2">Something went wrong</h2>
        <p class="text-gray-400 mb-6">${err.message}</p>
        <a href="#/explore" class="btn-apex-primary">Back to Browse</a>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();

    // Multi-Season Tab Toggle Logic
    const seasonTabs = app.querySelectorAll('.season-tab-btn');
    if (seasonTabs.length > 0) {
      seasonTabs.forEach(tab => {
        tab.addEventListener('click', () => {
          const targetSeason = tab.dataset.season;
          seasonTabs.forEach(t => {
            t.classList.remove('bg-apex-pink', 'text-white', 'shadow-lg', 'shadow-pink-500/20');
            t.classList.add('bg-white/5', 'text-gray-400');
          });
          tab.classList.add('bg-apex-pink', 'text-white', 'shadow-lg', 'shadow-pink-500/20');
          tab.classList.remove('bg-white/5', 'text-gray-400');

          const items = app.querySelectorAll('.episode-list-item');
          items.forEach(item => {
            item.style.display = (item.dataset.season === targetSeason) ? 'flex' : 'none';
          });
        });
      });
    }
  }
}
