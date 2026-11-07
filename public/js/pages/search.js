import { api } from '../api.js';
import { createAnimeCard } from '../components/animeCard.js';
import { renderEmptyState } from '../components/emptyState.js';
import { Toast } from '../components/toast.js';

let debounceTimeout = null;

export async function renderSearch(app) {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const initialQuery = params.get('q') || params.get('search') || '';
  let currentProvider = 'all'; // 'all', 'mal', 'kitsu'

  app.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-black text-white mb-2">Search Anime</h1>
        <p class="text-sm text-gray-400 mb-4">Search across APEX, AniList, MyAnimeList (Jikan), and Kitsu 3rd party databases</p>

        <!-- Search Input -->
        <div class="relative max-w-xl mb-4">
          <input type="text" id="search-main-input" value="${initialQuery}" placeholder="Search by title (e.g. Dragon Ball, Bleach, Naruto)..." class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-xl py-3.5 pl-12 pr-4 text-base focus:outline-none focus:border-apex-pink transition-all text-white placeholder-gray-500" autofocus />
          <i data-lucide="search" class="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none"></i>
          <div id="search-loading" class="absolute right-4 top-1/2 -translate-y-1/2 hidden">
            <i data-lucide="loader" class="w-4 h-4 animate-spin text-apex-pink"></i>
          </div>
        </div>

        <!-- 3rd Party Provider Switcher Tabs -->
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs font-bold uppercase tracking-wider text-gray-500 mr-2">Source:</span>
          <button class="source-tab px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all bg-apex-pink text-white" data-source="all">
            ⚡ All Sources (Hybrid)
          </button>
          <button class="source-tab px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all bg-white/5 text-gray-400 hover:text-white" data-source="mal">
            🌐 MyAnimeList (Jikan v4)
          </button>
          <button class="source-tab px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all bg-white/5 text-gray-400 hover:text-white" data-source="kitsu">
            🦊 Kitsu API
          </button>
        </div>

        <p id="search-meta" class="text-sm text-gray-400 mt-3"></p>
      </div>

      <div id="search-results" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        ${!initialQuery ? renderEmptyState({ icon: 'search', title: 'Start searching', description: 'Type at least 2 characters to fetch anime from 3rd party providers', actionText: null }) : ''}
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  // Attach Provider Tab switches
  document.querySelectorAll('.source-tab').forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      currentProvider = tabBtn.dataset.source;
      document.querySelectorAll('.source-tab').forEach(b => {
        b.className = `source-tab px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${b.dataset.source === currentProvider ? 'bg-apex-pink text-white' : 'bg-white/5 text-gray-400 hover:text-white'}`;
      });
      const q = document.getElementById('search-main-input')?.value?.trim();
      if (q && q.length >= 2) {
        doSearch(q);
      }
    });
  });

  if (initialQuery) await doSearch(initialQuery);

  document.getElementById('search-main-input')?.addEventListener('input', (e) => {
    clearTimeout(debounceTimeout);
    const q = e.target.value.trim();
    if (q.length < 2) { 
      document.getElementById('search-results').innerHTML = renderEmptyState({ icon: 'search', title: 'Keep typing...', description: 'Enter at least 2 characters', actionText: null }); 
      if (window.lucide) window.lucide.createIcons(); 
      return; 
    }
    debounceTimeout = setTimeout(() => doSearch(q), 400);
  });

  async function doSearch(q) {
    const grid = document.getElementById('search-results');
    const meta = document.getElementById('search-meta');
    const loader = document.getElementById('search-loading');
    if (!grid) return;

    if (loader) loader.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();

    try {
      const start = Date.now();
      let items = [];
      let sourceName = 'APEX / AniList';

      if (currentProvider === 'mal' || currentProvider === 'kitsu') {
        const res = await api.searchThirdParty(q, currentProvider);
        items = res?.items || [];
        sourceName = currentProvider === 'mal' ? 'MyAnimeList (Jikan v4)' : 'Kitsu API';
      } else {
        // First try standard hybrid search
        const res = await api.search(q, '', 1, 24);
        items = res?.items || [];

        // If less than 2 items found, automatically fall back to 3rd party fetcher!
        if (items.length < 2) {
          const thirdPartyRes = await api.searchThirdParty(q, 'all');
          if (thirdPartyRes?.items && thirdPartyRes.items.length > 0) {
            items = [...items, ...thirdPartyRes.items];
            sourceName = '3rd Party Providers (MyAnimeList & Kitsu)';
          }
        }
      }

      const elapsed = Date.now() - start;
      if (meta) meta.innerHTML = `Found <span class="text-white font-bold">${items.length}</span> results from <span class="text-apex-cyan font-bold">${sourceName}</span> (${elapsed}ms)`;

      if (items.length === 0) {
        grid.innerHTML = renderEmptyState({ icon: 'search-x', title: `No results for "${q}"`, description: 'Try different keywords or check spelling', actionText: 'Browse Catalog', actionHref: '#/explore' });
      } else {
        grid.innerHTML = items.map(anime => {
          // If it's a 3rd party anime without internal slug, render card with 1-click import
          const isThirdParty = !!anime.mal_id || !!anime.kitsu_id;
          return `
            <div class="relative group">
              ${createAnimeCard(anime)}
              ${isThirdParty ? `
                <div class="absolute top-2 right-2 z-20">
                  <span class="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-500/80 text-white shadow">3rd Party</span>
                </div>
              ` : ''}
            </div>
          `;
        }).join('');
      }

      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      grid.innerHTML = renderEmptyState({ icon: 'alert-triangle', title: 'Search failed', description: err.message, actionText: null });
      if (window.lucide) window.lucide.createIcons();
    } finally {
      if (loader) loader.classList.add('hidden');
    }
  }
}
