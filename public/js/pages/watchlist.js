import { api } from '../api.js';
import { state } from '../state.js';
import { router } from '../router.js';
import { Toast } from '../components/toast.js';
import { renderEmptyState } from '../components/emptyState.js';
import { createAnimeCard } from '../components/animeCard.js';

const STATUS_TABS = [
  { key: 'all', label: 'All', icon: 'list' },
  { key: 'watching', label: 'Watching', icon: 'play-circle' },
  { key: 'plan_to_watch', label: 'Plan to Watch', icon: 'bookmark' },
  { key: 'completed', label: 'Completed', icon: 'check-circle' },
  { key: 'dropped', label: 'Dropped', icon: 'x-circle' }
];

export async function renderWatchlist(app) {
  if (!state.isAuthenticated()) {
    app.innerHTML = `
      <div class="max-w-md mx-auto text-center py-24 px-4">
        <i data-lucide="bookmark" class="w-16 h-16 text-apex-pink mx-auto mb-4 opacity-80"></i>
        <h2 class="text-2xl font-black text-white mb-2">Your Watchlist</h2>
        <p class="text-gray-400 mb-6">Sign in to track your anime journey, never miss a new episode, and sync progress across all your devices.</p>
        <a href="#/login" class="btn-apex-primary">Sign In to Continue</a>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  let activeStatus = 'all';

  app.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="mb-6">
        <h1 class="text-3xl font-black text-white mb-1">My Watchlist</h1>
        <p class="text-sm text-gray-400">Track your anime progress</p>
      </div>

      <!-- Status Tabs -->
      <div class="flex flex-wrap gap-2 mb-6" id="status-tab-row"></div>

      <!-- Counts Row -->
      <div id="counts-row" class="flex flex-wrap gap-3 mb-6"></div>

      <!-- Grid -->
      <div id="watchlist-grid"></div>
    </div>
  `;

  async function loadWatchlist() {
    const grid = document.getElementById('watchlist-grid');
    const tabRow = document.getElementById('status-tab-row');
    const countsRow = document.getElementById('counts-row');
    if (!grid) return;

    grid.innerHTML = Array(6).fill(0).map(() => `<div class="rounded-xl overflow-hidden bg-[#12141e]"><div class="skeleton aspect-[2/3] w-full"></div></div>`).join('');

    try {
      const res = await api.getWatchlist('all');
      const all = res?.items || [];
      const counts = res?.counts || {};

      // Render counts
      if (countsRow) {
        countsRow.innerHTML = STATUS_TABS.filter(t => t.key !== 'all').map(t => `
          <div class="text-xs font-semibold px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300">
            <span class="text-white font-black">${counts[t.key] || 0}</span> ${t.label}
          </div>
        `).join('');
      }

      // Render tabs
      if (tabRow) {
        tabRow.innerHTML = STATUS_TABS.map(t => `
          <button class="status-tab flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${t.key === activeStatus ? 'bg-apex-pink text-white' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/8'}" data-status="${t.key}">
            <i data-lucide="${t.icon}" class="w-3.5 h-3.5"></i>
            ${t.label}
            <span class="text-[11px] opacity-70">${t.key === 'all' ? all.length : (counts[t.key] || 0)}</span>
          </button>
        `).join('');
        if (window.lucide) window.lucide.createIcons();

        document.querySelectorAll('.status-tab').forEach(btn => {
          btn.addEventListener('click', () => {
            activeStatus = btn.dataset.status;
            renderGrid(all, activeStatus);
            document.querySelectorAll('.status-tab').forEach(b => {
              b.className = `status-tab flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${b.dataset.status === activeStatus ? 'bg-apex-pink text-white' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/8'}`;
            });
          });
        });
      }

      renderGrid(all, activeStatus);
    } catch (err) {
      grid.innerHTML = renderEmptyState({ icon: 'alert-triangle', title: 'Failed to load watchlist', description: err.message, actionText: null });
      if (window.lucide) window.lucide.createIcons();
    }
  }

  function renderGrid(items, status) {
    const grid = document.getElementById('watchlist-grid');
    if (!grid) return;
    const filtered = status === 'all' ? items : items.filter(i => i.status === status);

    if (filtered.length === 0) {
      grid.innerHTML = renderEmptyState({
        icon: 'bookmark',
        title: `No anime in "${status.replace('_', ' ')}"`,
        description: 'Start watching and tracking your progress',
        actionText: 'Browse Anime',
        actionHref: '#/explore'
      });
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    grid.innerHTML = `
      <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        ${filtered.map(item => `
          <div class="relative group">
            ${createAnimeCard(item.anime)}
            <div class="absolute bottom-0 left-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <button class="remove-btn w-full text-xs font-bold bg-red-500/90 hover:bg-red-500 text-white rounded-b-xl py-1.5 transition-colors" data-id="${item.anime.id}">
                Remove
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();

    document.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        try {
          await api.removeFromWatchlist(btn.dataset.id);
          Toast.success('Removed from watchlist');
          await loadWatchlist();
        } catch (err) { Toast.error(err.message); }
      });
    });
  }

  await loadWatchlist();
}
