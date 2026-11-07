import { api } from '../api.js';
import { state } from '../state.js';
import { renderHeroBanner } from '../components/heroBanner.js';
import { createAnimeCard } from '../components/animeCard.js';

function skeletonCards(count = 12) {
  return Array(count).fill(0).map(() => `
    <div class="rounded-xl overflow-hidden bg-[#12141e]">
      <div class="skeleton aspect-[2/3] w-full"></div>
      <div class="p-3 space-y-2">
        <div class="skeleton h-4 w-3/4"></div>
        <div class="skeleton h-3 w-1/2"></div>
      </div>
    </div>
  `).join('');
}

function renderContinueWatching(history) {
  if (!history || history.length === 0) return '';
  const items = history.slice(0, 5);
  return `
    <section class="mb-10">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-xl font-black text-white flex items-center gap-2">
            <i data-lucide="play-circle" class="w-5 h-5 text-apex-pink"></i> Continue Watching
          </h2>
          <p class="text-xs text-gray-400 mt-0.5">Resume where you left off</p>
        </div>
        <a href="#/history" class="text-xs font-semibold text-apex-pink hover:underline flex items-center gap-1">
          View History <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
        </a>
      </div>
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        ${items.map(h => {
          const pct = h.total_seconds > 0 ? Math.round((h.progress_seconds / h.total_seconds) * 100) : 0;
          return `
            <a href="#/watch/${h.episode_id}" class="group block relative bg-[#12141e] rounded-xl overflow-hidden border border-white/5 hover:border-apex-pink/40 transition-all hover:-translate-y-1">
              <div class="relative aspect-video overflow-hidden">
                <img src="${h.anime?.banner_url || h.anime?.poster_url || ''}" alt="${h.anime?.title}" loading="lazy" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                <div class="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div class="w-10 h-10 rounded-full bg-apex-pink flex items-center justify-center">
                    <i data-lucide="play" class="w-5 h-5 text-white fill-white"></i>
                  </div>
                </div>
                <div class="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
                  <div class="h-full bg-gradient-to-r from-apex-pink to-orange-500" style="width: ${pct}%"></div>
                </div>
              </div>
              <div class="p-2.5">
                <p class="text-xs font-bold text-white truncate">${h.anime?.title || ''}</p>
                <p class="text-xs text-gray-400">Ep ${h.episode?.episode_number || 1} • ${pct}%</p>
              </div>
            </a>
          `;
        }).join('')}
      </div>
    </section>
  `;
}

export async function renderHome(app) {
  // Loading skeleton
  app.innerHTML = `
    <div class="skeleton w-full h-[460px] rounded-none"></div>
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div>
        <div class="skeleton h-8 w-56 mb-4"></div>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">${skeletonCards(6)}</div>
      </div>
      <div>
        <div class="skeleton h-8 w-56 mb-4"></div>
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">${skeletonCards(6)}</div>
      </div>
    </div>
  `;

  try {
    const res = await api.getAnimeList({ limit: 100 });
    const allItems = res?.items || [];

    const series = allItems.filter(a => a.type !== 'Movie');
    const movies = allItems.filter(a => a.type === 'Movie');
    const featuredItems = allItems.filter(a => a.featured);
    const featured = featuredItems.length > 0 ? featuredItems : (allItems.length > 0 ? allItems.slice(0, 5) : []);

    let continueWatchingHtml = '';
    if (state.isAuthenticated()) {
      try {
        const histRes = await api.getHistory();
        const history = histRes?.items || [];
        const inProgress = history.filter(h => !h.completed && h.progress_seconds > 10);
        continueWatchingHtml = renderContinueWatching(inProgress);
      } catch {}
    }

    const isEmpty = series.length === 0 && movies.length === 0;

    app.innerHTML = `
      ${renderHeroBanner(featured)}

      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        ${continueWatchingHtml}

        ${isEmpty ? `
          <!-- Clean Empty State -->
          <div class="glass-panel p-8 sm:p-14 rounded-2xl text-center max-w-xl mx-auto my-10 border border-white/10">
            <div class="w-16 h-16 rounded-2xl bg-apex-pink/10 flex items-center justify-center mx-auto mb-4 text-apex-pink">
              <i data-lucide="film" class="w-8 h-8"></i>
            </div>
            <h3 class="text-2xl font-black text-white mb-2">Welcome to APEX</h3>
            <p class="text-sm text-gray-400 mb-6 leading-relaxed">
              ${state.isAdmin() ? 'Website clean hai! Admin Dashboard me ja kar anime series ya movies add karein.' : 'Discover and stream high quality anime series and movies. Stay tuned for new releases!'}
            </p>
            <div class="flex flex-wrap items-center justify-center gap-3">
              ${state.isAdmin() ? `
                <a href="#/admin" class="btn-apex-primary text-sm py-2.5 px-6 flex items-center gap-2">
                  <i data-lucide="plus-circle" class="w-4 h-4"></i> Add Anime / Movie in Admin
                </a>
              ` : `
                <a href="#/browse" class="btn-apex-primary text-sm py-2.5 px-6 flex items-center gap-2">
                  <i data-lucide="compass" class="w-4 h-4"></i> Explore Anime
                </a>
              `}
            </div>
          </div>
        ` : `
          <!-- Filter Navigation Tabs (Anime vs Movies) -->
          <div class="flex flex-wrap items-center justify-between gap-4 mb-8 pb-4 border-b border-white/5">
            <div class="flex items-center gap-2">
              <button id="home-filter-all" class="home-tab px-4 py-2 rounded-lg text-xs sm:text-sm font-bold bg-apex-pink text-white transition-all flex items-center gap-1.5 cursor-pointer" data-filter="all">
                <i data-lucide="sparkles" class="w-3.5 h-3.5"></i> All (${allItems.length})
              </button>
              <button id="home-filter-series" class="home-tab px-4 py-2 rounded-lg text-xs sm:text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5 cursor-pointer" data-filter="series">
                <i data-lucide="tv" class="w-3.5 h-3.5"></i> Anime Series (${series.length})
              </button>
              <button id="home-filter-movies" class="home-tab px-4 py-2 rounded-lg text-xs sm:text-sm font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5 cursor-pointer" data-filter="movies">
                <i data-lucide="film" class="w-3.5 h-3.5 text-purple-400"></i> Movies (${movies.length})
              </button>
            </div>

            <div class="text-xs text-gray-400 font-medium">
              Showing <span id="home-active-count" class="text-white font-bold">${allItems.length}</span> titles
            </div>
          </div>

          <!-- Section 1: Anime Series -->
          <section id="section-series" class="mb-14 ${series.length === 0 ? 'hidden' : ''}">
            <div class="flex items-center justify-between mb-5">
              <div>
                <h2 class="text-2xl font-black text-white flex items-center gap-2">
                  <i data-lucide="tv" class="w-6 h-6 text-apex-pink"></i> Anime Series
                </h2>
                <p class="text-xs text-gray-400 mt-0.5">Episodic series & seasonal anime folders</p>
              </div>
              <span class="text-xs font-bold px-2.5 py-1 rounded bg-white/5 text-gray-300 border border-white/10">
                ${series.length} Series
              </span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              ${series.map(a => createAnimeCard(a)).join('')}
            </div>
          </section>

          <!-- Section 2: Movies -->
          <section id="section-movies" class="mb-14 ${movies.length === 0 ? 'hidden' : ''}">
            <div class="flex items-center justify-between mb-5">
              <div>
                <h2 class="text-2xl font-black text-white flex items-center gap-2">
                  <i data-lucide="film" class="w-6 h-6 text-purple-400"></i> Movies
                </h2>
                <p class="text-xs text-gray-400 mt-0.5">Full-length standalone anime movies</p>
              </div>
              <span class="text-xs font-bold px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                ${movies.length} Movies
              </span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              ${movies.map(a => createAnimeCard(a)).join('')}
            </div>
          </section>
        `}
      </div>
    `;

    if (window.lucide) window.lucide.createIcons();

    // Attach Filter Tab handlers
    const tabButtons = app.querySelectorAll('.home-tab');
    const secSeries = app.querySelector('#section-series');
    const secMovies = app.querySelector('#section-movies');
    const countSpan = app.querySelector('#home-active-count');

    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = btn.dataset.filter;
        tabButtons.forEach(b => {
          b.className = `home-tab px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${b.dataset.filter === filter ? 'bg-apex-pink text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`;
        });

        if (filter === 'series') {
          if (secSeries) secSeries.classList.remove('hidden');
          if (secMovies) secMovies.classList.add('hidden');
          if (countSpan) countSpan.textContent = series.length;
        } else if (filter === 'movies') {
          if (secSeries) secSeries.classList.add('hidden');
          if (secMovies) secMovies.classList.remove('hidden');
          if (countSpan) countSpan.textContent = movies.length;
        } else {
          // 'all'
          if (secSeries && series.length > 0) secSeries.classList.remove('hidden');
          if (secMovies && movies.length > 0) secMovies.classList.remove('hidden');
          if (countSpan) countSpan.textContent = allItems.length;
        }
      });
    });

  } catch (err) {
    console.error('Home load error:', err);
    app.innerHTML = `
      <div class="max-w-7xl mx-auto px-4 py-20 text-center">
        <i data-lucide="wifi-off" class="w-12 h-12 text-apex-pink mx-auto mb-4"></i>
        <h2 class="text-xl font-bold mb-2">Connection Error</h2>
        <p class="text-gray-400 mb-6">Could not load content. Please check your connection.</p>
        <button onclick="location.reload()" class="btn-apex-primary">Retry</button>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
  }
}
