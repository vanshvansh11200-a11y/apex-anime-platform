import { api } from '../api.js';
import { state } from '../state.js';
import { router } from '../router.js';
import { Toast } from '../components/toast.js';
import { renderEmptyState } from '../components/emptyState.js';

export async function renderHistory(app) {
  if (!state.isAuthenticated()) {
    app.innerHTML = `
      <div class="max-w-md mx-auto text-center py-24 px-4">
        <i data-lucide="history" class="w-16 h-16 text-apex-cyan mx-auto mb-4 opacity-80"></i>
        <h2 class="text-2xl font-black text-white mb-2">Watch History</h2>
        <p class="text-gray-400 mb-6">Sign in to see your watch history and resume where you left off on any device.</p>
        <a href="#/login" class="btn-apex-primary">Sign In</a>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  app.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-3xl font-black text-white">Watch History</h1>
          <p class="text-sm text-gray-400 mt-1">Your recently watched episodes</p>
        </div>
        <button id="clear-history-btn" class="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-400 hover:text-white hover:bg-red-500/10 border border-red-500/20 hover:border-red-500/40 rounded-lg transition-all">
          <i data-lucide="trash-2" class="w-4 h-4"></i> Clear All
        </button>
      </div>
      <div id="history-list"></div>
    </div>
  `;
  if (window.lucide) window.lucide.createIcons();

  document.getElementById('clear-history-btn')?.addEventListener('click', async () => {
    if (!confirm('Clear your entire watch history?')) return;
    try {
      await api.clearHistory();
      Toast.success('Watch history cleared');
      loadHistory();
    } catch (err) { Toast.error(err.message); }
  });

  async function loadHistory() {
    const list = document.getElementById('history-list');
    if (!list) return;
    list.innerHTML = `<div class="text-center py-8"><i data-lucide="loader" class="w-7 h-7 animate-spin text-apex-pink mx-auto"></i></div>`;
    if (window.lucide) window.lucide.createIcons();

    try {
      const res = await api.getHistory();
      const items = res?.items || [];
      if (items.length === 0) {
        list.innerHTML = renderEmptyState({ icon: 'history', title: 'No watch history', description: 'Start watching some anime!', actionText: 'Browse Anime', actionHref: '#/explore' });
        if (window.lucide) window.lucide.createIcons();
        return;
      }

      list.innerHTML = `
        <div class="space-y-3">
          ${items.map(h => {
            const pct = h.total_seconds > 0 ? Math.round((h.progress_seconds / h.total_seconds) * 100) : 0;
            const timeStr = new Date(h.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            return `
              <a href="#/watch/${h.episode_id}" class="group flex items-center gap-4 glass-panel rounded-xl p-4 hover:border-apex-pink/30 transition-all">
                <div class="relative w-32 flex-shrink-0 rounded-lg overflow-hidden aspect-video bg-black">
                  <img src="${h.anime?.banner_url || h.anime?.poster_url || ''}" class="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy">
                  <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50">
                    <div class="w-9 h-9 rounded-full bg-apex-pink flex items-center justify-center">
                      <i data-lucide="play" class="w-4 h-4 text-white fill-white"></i>
                    </div>
                  </div>
                  <div class="absolute bottom-0 left-0 right-0 h-0.5 bg-white/15">
                    <div class="h-full bg-gradient-to-r from-apex-pink to-orange-500 transition-all" style="width:${pct}%"></div>
                  </div>
                </div>
                <div class="flex-grow min-w-0">
                  <p class="text-sm font-bold text-white group-hover:text-apex-pink transition-colors truncate">${h.anime?.title || 'Unknown'}</p>
                  <p class="text-xs text-gray-400 mt-0.5">Episode ${h.episode?.episode_number || '?'}: ${h.episode?.title || ''}</p>
                  <div class="flex items-center gap-3 mt-2">
                    <div class="flex items-center gap-1.5 text-xs text-gray-400">
                      <div class="w-20 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div class="h-full bg-apex-pink rounded-full" style="width:${pct}%"></div>
                      </div>
                      <span>${pct}% watched</span>
                    </div>
                    ${h.completed ? '<span class="text-xs font-bold text-emerald-400">✓ Completed</span>' : ''}
                  </div>
                </div>
                <div class="flex-shrink-0 text-xs text-gray-500">${timeStr}</div>
              </a>
            `;
          }).join('')}
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
    } catch (err) {
      list.innerHTML = renderEmptyState({ icon: 'alert-triangle', title: 'Failed to load history', description: err.message, actionText: null });
      if (window.lucide) window.lucide.createIcons();
    }
  }

  await loadHistory();
}
