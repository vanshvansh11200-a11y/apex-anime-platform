import { api } from '../api.js';
import { createAnimeCard } from '../components/animeCard.js';
import { renderEmptyState } from '../components/emptyState.js';
import { router } from '../router.js';

let searchDebounce = null;
let currentPage = 1;
let totalPages = 1;
let activeFilters = {};

function buildFilters(genres) {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const genre = params.get('genre') || 'All';
  const sort = params.get('sort') || 'popularity';
  const status = params.get('status') || 'All';
  const type = params.get('type') || 'All';
  const search = params.get('search') || '';

  return `
    <div class="flex flex-wrap gap-3 items-center">
      <!-- Search -->
      <div class="relative flex-grow min-w-[200px] max-w-sm">
        <input id="explore-search" type="text" value="${search}" placeholder="Search anime..." 
          class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-apex-pink transition-colors" />
        <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"></i>
      </div>

      <!-- Genre -->
      <select id="filter-genre" class="bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:border-apex-pink cursor-pointer">
        <option value="All" ${genre === 'All' ? 'selected' : ''}>All Genres</option>
        ${genres.map(g => `<option value="${g.name}" ${genre === g.name ? 'selected' : ''}>${g.name} (${g.count})</option>`).join('')}
      </select>

      <!-- Status -->
      <select id="filter-status" class="bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:border-apex-pink cursor-pointer">
        <option value="All" ${status === 'All' ? 'selected' : ''}>All Status</option>
        <option value="Airing" ${status === 'Airing' ? 'selected' : ''}>Airing</option>
        <option value="Completed" ${status === 'Completed' ? 'selected' : ''}>Completed</option>
        <option value="Upcoming" ${status === 'Upcoming' ? 'selected' : ''}>Upcoming</option>
      </select>

      <!-- Type -->
      <select id="filter-type" class="bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:border-apex-pink cursor-pointer">
        <option value="All" ${type === 'All' ? 'selected' : ''}>All Types</option>
        <option value="TV" ${type === 'TV' ? 'selected' : ''}>TV</option>
        <option value="Movie" ${type === 'Movie' ? 'selected' : ''}>Movie</option>
        <option value="OVA" ${type === 'OVA' ? 'selected' : ''}>OVA</option>
        <option value="Special" ${type === 'Special' ? 'selected' : ''}>Special</option>
      </select>

      <!-- Sort -->
      <select id="filter-sort" class="bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg py-2.5 px-3 text-sm focus:outline-none focus:border-apex-pink cursor-pointer">
        <option value="popularity" ${sort === 'popularity' ? 'selected' : ''}>Most Popular</option>
        <option value="rating" ${sort === 'rating' ? 'selected' : ''}>Top Rated</option>
        <option value="latest" ${sort === 'latest' ? 'selected' : ''}>Newest</option>
        <option value="title" ${sort === 'title' ? 'selected' : ''}>A-Z</option>
        <option value="year" ${sort === 'year' ? 'selected' : ''}>Year</option>
      </select>
    </div>
  `;
}

async function loadAnime(filters = {}, page = 1) {
  const grid = document.getElementById('anime-grid');
  const pagination = document.getElementById('pagination-row');
  if (!grid) return;

  grid.innerHTML = Array(18).fill(0).map(() => `
    <div class="rounded-xl overflow-hidden bg-[#12141e]">
      <div class="skeleton aspect-[2/3] w-full"></div>
      <div class="p-2 space-y-1.5">
        <div class="skeleton h-3.5 w-3/4"></div>
        <div class="skeleton h-3 w-1/2"></div>
      </div>
    </div>
  `).join('');

  try {
    let res;
    if (filters.search && filters.search.trim()) {
      res = await api.search(filters.search, filters.genre, page, 24);
    } else {
      res = await api.getAnimeList({ ...filters, page, limit: 24 });
    }

    const items = res?.items || [];
    totalPages = res?.totalPages || res?.pageInfo?.lastPage || 1;
    currentPage = page;

    if (items.length === 0) {
      grid.innerHTML = renderEmptyState({ title: 'No anime found', description: 'Try different filters or search terms.' });
    } else {
      grid.innerHTML = items.map(a => createAnimeCard(a)).join('');
    }

    // Pagination
    if (pagination) {
      pagination.innerHTML = totalPages > 1 ? renderPagination(currentPage, totalPages) : '';
      pagination.querySelectorAll('[data-page]').forEach(btn => {
        btn.addEventListener('click', () => {
          const p = parseInt(btn.getAttribute('data-page'), 10);
          loadAnime(activeFilters, p);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      });
    }

    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    grid.innerHTML = renderEmptyState({ icon: 'alert-triangle', title: 'Failed to load', description: err.message, actionText: null });
    if (window.lucide) window.lucide.createIcons();
  }
}

function renderPagination(current, total) {
  const pages = [];
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - 2 && i <= current + 2)) {
      pages.push(i);
    } else if (i === current - 3 || i === current + 3) {
      pages.push('...');
    }
  }
  const unique = [...new Set(pages)];
  return `
    <div class="flex items-center gap-2 justify-center py-8">
      <button data-page="${current - 1}" ${current <= 1 ? 'disabled' : ''} class="px-3 py-2 text-sm rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] disabled:opacity-30 disabled:cursor-not-allowed hover:border-apex-pink transition-colors">Prev</button>
      ${unique.map(p => p === '...' ? `<span class="text-gray-500 px-1">...</span>` : `
        <button data-page="${p}" class="w-9 h-9 text-sm rounded-lg font-semibold transition-all ${p === current ? 'bg-apex-pink text-white' : 'bg-[var(--input-bg)] border border-[var(--border-color)] hover:border-apex-pink'}">${p}</button>
      `).join('')}
      <button data-page="${current + 1}" ${current >= total ? 'disabled' : ''} class="px-3 py-2 text-sm rounded-lg bg-[var(--input-bg)] border border-[var(--border-color)] disabled:opacity-30 disabled:cursor-not-allowed hover:border-apex-pink transition-colors">Next</button>
    </div>
  `;
}

export async function renderExplore(app) {
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  activeFilters = {
    search: params.get('search') || '',
    genre: params.get('genre') || 'All',
    status: params.get('status') || 'All',
    type: params.get('type') || 'All',
    sort: params.get('sort') || 'popularity'
  };

  let genres = [];
  try {
    const gr = await api.getGenres();
    genres = gr?.genres || [];
  } catch {}

  app.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Page Header -->
      <div class="mb-6">
        <h1 class="text-3xl font-black text-white mb-1">Explore Anime</h1>
        <p class="text-gray-400 text-sm">Browse our complete catalog • Metadata by AniList GraphQL API</p>
      </div>

      <!-- Filters -->
      <div id="filter-bar" class="mb-8 p-4 glass-panel rounded-xl">
        ${buildFilters(genres)}
      </div>

      <!-- Results Grid -->
      <div id="anime-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"></div>

      <!-- Pagination -->
      <div id="pagination-row"></div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  // Attach filter listeners
  const searchInput = document.getElementById('explore-search');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        activeFilters.search = searchInput.value.trim();
        loadAnime(activeFilters, 1);
      }, 400);
    });
  }

  ['filter-genre', 'filter-status', 'filter-type', 'filter-sort'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        const key = id.replace('filter-', '');
        activeFilters[key] = el.value;
        loadAnime(activeFilters, 1);
      });
    }
  });

  await loadAnime(activeFilters, 1);
}
