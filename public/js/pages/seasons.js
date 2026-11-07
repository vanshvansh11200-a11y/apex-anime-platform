import { api } from '../api.js';
import { createAnimeCard } from '../components/animeCard.js';
import { renderEmptyState } from '../components/emptyState.js';

export async function renderSeasons(app) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({length: 6}, (_, i) => currentYear - i);
  const seasons = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  let activeSeason = params.get('season') || 'FALL';
  let activeYear = parseInt(params.get('year') || currentYear, 10);
  app.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="mb-6"><h1 class="text-3xl font-black text-white mb-1">📅 Seasonal Anime</h1><p class="text-sm text-gray-400">Browse by season</p></div>
      <div class="glass-panel rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div class="flex gap-2 flex-wrap">
          ${seasons.map(s => `<button class="season-btn px-4 py-2 rounded-lg text-sm font-bold transition-all ${s === activeSeason ? 'bg-apex-pink text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}" data-season="${s}">${s.charAt(0)+s.slice(1).toLowerCase()}</button>`).join('')}
        </div>
        <select id="year-sel" class="bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-apex-pink cursor-pointer">
          ${years.map(y => `<option value="${y}" ${y === activeYear ? 'selected' : ''}>${y}</option>`).join('')}
        </select>
      </div>
      <div id="season-grid" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"></div>
    </div>
  `;
  async function load() {
    const grid = document.getElementById('season-grid');
    if (!grid) return;
    grid.innerHTML = Array(12).fill(0).map(() => `<div class="rounded-xl overflow-hidden bg-[#12141e]"><div class="skeleton aspect-[2/3] w-full"></div></div>`).join('');
    try {
      const res = await api.getSeasonal(activeSeason, activeYear);
      const items = res?.items || [];
      grid.innerHTML = items.length ? items.map(a => createAnimeCard(a)).join('') : renderEmptyState({ title: `No ${activeSeason.toLowerCase()} ${activeYear} anime` });
      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      grid.innerHTML = renderEmptyState({ icon: 'wifi-off', title: 'Failed', description: err.message });
      if (window.lucide) window.lucide.createIcons();
    }
  }
  document.querySelectorAll('.season-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activeSeason = btn.dataset.season;
      document.querySelectorAll('.season-btn').forEach(b => { b.className = `season-btn px-4 py-2 rounded-lg text-sm font-bold transition-all ${b.dataset.season === activeSeason ? 'bg-apex-pink text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`; });
      load();
    });
  });
  document.getElementById('year-sel')?.addEventListener('change', (e) => { activeYear = parseInt(e.target.value, 10); load(); });
  await load();
}
