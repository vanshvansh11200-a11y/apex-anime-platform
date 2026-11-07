import { api } from '../api.js';
import { createAnimeCard } from '../components/animeCard.js';
import { renderEmptyState } from '../components/emptyState.js';

export async function renderPopular(app) {
  app.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="mb-8">
        <h1 class="text-3xl font-black text-white mb-1">⭐ All-Time Popular</h1>
        <p class="text-sm text-gray-400">Highest-rated and most beloved anime • <a href="https://anilist.co" target="_blank" class="text-apex-cyan hover:underline">AniList</a></p>
      </div>
      <div id="popular-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        ${Array(18).fill(0).map(() => `<div class="rounded-xl overflow-hidden bg-[#12141e]"><div class="skeleton aspect-[2/3] w-full"></div></div>`).join('')}
      </div>
      <div id="popular-pagination" class="flex justify-center gap-3 mt-10"></div>
    </div>
  `;

  async function load(p) {
    const grid = document.getElementById('popular-grid');
    if (!grid) return;
    try {
      const res = await api.getPopular(24, p);
      const items = res?.items || [];
      grid.innerHTML = items.length ? items.map(a => createAnimeCard(a)).join('') : renderEmptyState({ title: 'No data available' });
      if (window.lucide) window.lucide.createIcons();
      const pag = document.getElementById('popular-pagination');
      if (pag && res?.pageInfo?.hasNextPage) {
        pag.innerHTML = `<button id="next-pop" class="btn-apex-primary px-6 py-2">Load More</button>`;
        document.getElementById('next-pop')?.addEventListener('click', () => load(p + 1));
      } else if (pag) pag.innerHTML = '';
    } catch (err) {
      grid.innerHTML = renderEmptyState({ icon: 'wifi-off', title: 'Could not load', description: err.message });
      if (window.lucide) window.lucide.createIcons();
    }
  }
  await load(1);
}
