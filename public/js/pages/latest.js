import { api } from '../api.js';
import { createAnimeCard } from '../components/animeCard.js';
import { renderEmptyState } from '../components/emptyState.js';

export async function renderLatest(app) {
  app.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-black text-white mb-1">🆕 Currently Airing</h1>
        <p class="text-sm text-gray-400">Fresh episodes every week</p>
      </div>
      <div id="latest-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        ${Array(18).fill(0).map(() => `<div class="rounded-xl overflow-hidden bg-[#12141e]"><div class="skeleton aspect-[2/3] w-full"></div></div>`).join('')}
      </div>
    </div>
  `;
  const grid = document.getElementById('latest-grid');
  try {
    const res = await api.getLatest(24, 1);
    const items = res?.items || [];
    grid.innerHTML = items.length ? items.map(a => createAnimeCard(a)).join('') : renderEmptyState({ title: 'No airing anime' });
    if (window.lucide) window.lucide.createIcons();
  } catch (err) {
    grid.innerHTML = renderEmptyState({ icon: 'wifi-off', title: 'Failed to load', description: err.message });
    if (window.lucide) window.lucide.createIcons();
  }
}
