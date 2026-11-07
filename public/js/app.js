// APEX Main Application Entry Point
import { router } from './router.js';
import { state } from './state.js';
import { renderNavbar } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { renderHome } from './pages/home.js';
import { renderExplore } from './pages/explore.js';
import { renderTrending } from './pages/trending.js';
import { renderPopular } from './pages/popular.js';
import { renderLatest } from './pages/latest.js';
import { renderSeasons } from './pages/seasons.js';
import { renderSearch } from './pages/search.js';
import { renderAnimeDetail } from './pages/animeDetail.js';
import { renderWatchPage } from './pages/watchPage.js';
import { renderWatchlist } from './pages/watchlist.js';
import { renderHistory } from './pages/history.js';
import { renderLogin, renderRegister } from './pages/auth.js';
import { renderProfile } from './pages/profile.js';
import { renderAdminDashboard } from './pages/admin.js';
import { renderStreamLauncher } from './pages/streamLauncher.js';
import { renderNotFound } from './pages/notFound.js';

// Register all routes
router
  .register('/', renderHome)
  .register('/explore', renderExplore)
  .register('/browse', renderExplore)
  .register('/movies', () => { window.location.hash = '#/explore?type=Movie'; })
  .register('/trending', renderTrending)
  .register('/popular', renderPopular)
  .register('/latest', renderLatest)
  .register('/seasons', renderSeasons)
  .register('/search', renderSearch)
  .register('/stream', renderStreamLauncher)
  .register('/anime/:slug', renderAnimeDetail)
  .register('/watch/:id', renderWatchPage)
  .register('/watchlist', renderWatchlist)
  .register('/history', renderHistory)
  .register('/login', renderLogin)
  .register('/register', renderRegister)
  .register('/profile', renderProfile)
  .register('/admin', renderAdminDashboard)
  .register('*', renderNotFound);

try {
  // Initialize footer (static, render once)
  renderFooter();

  // Initialize navbar (re-renders on state changes)
  renderNavbar();

  // Re-render navbar whenever auth state changes
  state.subscribe(() => {
    try { renderNavbar(); } catch (_) {}
  });

  // Initialize icons
  if (window.lucide) window.lucide.createIcons();

  // Start the router
  router.start();
} catch (err) {
  console.error('[APEX Boot Error]', err);
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `
      <div style="min-height:60vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px;">
        <h2 style="color:#ff2e93;font-size:22px;font-weight:900;margin-bottom:8px;">APEX Ready</h2>
        <p style="color:#aaa;font-size:14px;margin-bottom:16px;">${err.message || 'Connecting to platform...'}</p>
        <button onclick="location.reload()" style="background:#ff2e93;color:#fff;border:none;padding:10px 24px;border-radius:8px;font-weight:bold;cursor:pointer;">Refresh Page</button>
      </div>
    `;
  }
}

// Global keyboard shortcut: Ctrl+K or / to focus search
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey && e.key === 'k') || (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA')) {
    e.preventDefault();
    const searchInput = document.getElementById('navbar-search-input');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }
});

// Theme toggle keyboard shortcut: Ctrl+Shift+T
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === 'T') {
    e.preventDefault();
    const newTheme = state.toggleTheme();
    // Toast notification for theme toggle
    const container = document.getElementById('toast-container');
    if (container) {
      const toast = document.createElement('div');
      toast.className = 'toast toast-info';
      toast.innerHTML = `<span class="text-sm font-medium">Switched to ${newTheme} mode</span>`;
      container.appendChild(toast);
      setTimeout(() => toast.remove(), 2000);
    }
  }
});

console.log('%c⚡ APEX Anime Platform', 'font-size:20px;font-weight:900;color:#ff2e93;');
console.log('%cBuilt with AniList GraphQL API + HLS.js + Vanilla ES Modules', 'font-size:12px;color:#9ca3af;');
