// APEX Navigation Bar Component
import { state } from '../state.js';
import { router } from '../router.js';
import { api } from '../api.js';

let searchDebounceTimeout = null;

export function renderNavbar() {
  const header = document.getElementById('site-header');
  if (!header) return;

  const isAuth = state.isAuthenticated();
  const isAdmin = state.isAdmin();
  const user = state.user;

  header.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-18 py-3">
        
        <!-- Left: Logo & Nav Links -->
        <div class="flex items-center gap-8">
          <a href="#/" class="flex items-center gap-2 group">
            <img src="/assets/logo.svg" alt="APEX" class="h-9 w-auto filter drop-shadow group-hover:scale-105 transition-transform">
          </a>

          <nav class="hidden md:flex items-center gap-6 text-sm font-semibold text-gray-300">
            <a href="#/browse" class="nav-link hover:text-apex-pink transition-colors flex items-center gap-1.5">
              <i data-lucide="tv" class="w-4 h-4 text-apex-pink"></i> Anime
            </a>
            <a href="#/explore?type=Movie" class="nav-link hover:text-apex-pink transition-colors flex items-center gap-1.5">
              <i data-lucide="film" class="w-4 h-4 text-purple-400"></i> Movies
            </a>
            ${isAdmin ? `
              <a href="#/admin" class="flex items-center gap-1.5 text-apex-cyan hover:text-white px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/20 transition-all font-bold">
                <i data-lucide="shield" class="w-3.5 h-3.5"></i> Admin Dashboard
              </a>
            ` : ''}
          </nav>
        </div>

        <!-- Center: Search Bar with Autocomplete Dropdown -->
        <div class="relative hidden sm:block w-72 lg:w-96">
          <div class="relative">
            <input 
              type="text" 
              id="navbar-search-input" 
              placeholder="Search anime, characters, studios..." 
              class="w-full bg-[#161824] border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-apex-pink focus:ring-1 focus:ring-apex-pink transition-all"
            />
            <i data-lucide="search" class="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
          </div>
          <!-- Autocomplete results dropdown -->
          <div id="search-autocomplete-dropdown" class="absolute top-12 left-0 right-0 glass-panel rounded-xl shadow-2xl p-2 hidden z-50 max-h-96 overflow-y-auto"></div>
        </div>

        <!-- Right: User Menu or Login Button -->
        <div class="flex items-center gap-4">
          ${isAuth ? `
            <div class="relative" id="user-menu-wrapper">
              <button id="user-menu-btn" class="flex items-center gap-3 p-1 rounded-full hover:ring-2 hover:ring-apex-pink/50 transition-all">
                <img src="${user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=128&h=128&q=80'}" alt="${user.username}" class="w-9 h-9 rounded-full object-cover border border-white/20">
                <span class="hidden md:block text-sm font-semibold text-gray-200">${user.username}</span>
                <i data-lucide="chevron-down" class="w-4 h-4 text-gray-400 hidden md:block"></i>
              </button>

              <!-- Dropdown Menu -->
              <div id="user-dropdown-panel" class="absolute right-0 top-12 w-56 glass-panel rounded-xl shadow-2xl p-2 hidden z-50 border border-white/10">
                <div class="px-3 py-2 border-b border-white/10 mb-1">
                  <div class="text-sm font-bold text-white">${user.username}</div>
                  <div class="text-xs text-gray-400 truncate">${user.email}</div>
                  <span class="inline-block mt-1.5 px-2 py-0.5 text-[10px] font-bold rounded bg-apex-pink/20 text-apex-pink uppercase tracking-wider">${user.role}</span>
                </div>
                ${isAdmin ? `
                  <a href="#/admin" class="flex items-center gap-2.5 px-3 py-2 text-sm text-cyan-400 hover:bg-white/5 rounded-lg transition-colors font-medium">
                    <i data-lucide="layout-dashboard" class="w-4 h-4"></i> Admin Panel
                  </a>
                ` : ''}
                <a href="#/watchlist" class="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg transition-colors">
                  <i data-lucide="bookmark" class="w-4 h-4 text-apex-pink"></i> My Watchlist
                </a>
                <a href="#/history" class="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg transition-colors">
                  <i data-lucide="history" class="w-4 h-4 text-apex-cyan"></i> Watch History
                </a>
                <a href="#/profile" class="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-300 hover:bg-white/5 rounded-lg transition-colors">
                  <i data-lucide="settings" class="w-4 h-4 text-gray-400"></i> Account Settings
                </a>
                <div class="border-t border-white/10 my-1"></div>
                <button id="logout-btn" class="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-left">
                  <i data-lucide="log-out" class="w-4 h-4"></i> Sign Out
                </button>
              </div>
            </div>
          ` : `
            <div class="flex items-center gap-2">
              <a href="#/register" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-white/15 hover:border-apex-pink text-gray-200 hover:text-white transition-all">
                <i data-lucide="user-plus" class="w-3.5 h-3.5 text-apex-pink"></i>
                <span>Create Account</span>
              </a>
              <a href="#/login" class="btn-apex-primary text-xs sm:text-sm py-1.5 px-3.5 shadow-none flex items-center gap-1.5">
                <i data-lucide="log-in" class="w-3.5 h-3.5"></i>
                <span>Sign In</span>
              </a>
            </div>
          `}

          <!-- Mobile Hamburger Toggle -->
          <button id="mobile-menu-toggle" class="md:hidden p-2 text-gray-400 hover:text-white">
            <i data-lucide="menu" class="w-6 h-6"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Mobile Drawer Navigation -->
    <div id="mobile-drawer" class="md:hidden glass-panel border-t border-white/5 px-4 pt-3 pb-6 hidden space-y-3">
      <div class="sm:hidden mb-4">
        <input 
          type="text" 
          id="mobile-search-input" 
          placeholder="Search anime or movies..." 
          class="w-full bg-[#161824] border border-white/10 rounded-full py-2 px-4 text-sm text-gray-200"
        />
      </div>
      <a href="#/browse" class="flex items-center gap-2 py-2 text-base font-semibold text-gray-200 hover:text-apex-pink">
        <i data-lucide="tv" class="w-4 h-4 text-apex-pink"></i> Anime
      </a>
      <a href="#/explore?type=Movie" class="flex items-center gap-2 py-2 text-base font-semibold text-gray-200 hover:text-apex-pink">
        <i data-lucide="film" class="w-4 h-4 text-purple-400"></i> Movies
      </a>
      ${!isAuth ? `
        <div class="border-t border-white/10 pt-3 space-y-2">
          <a href="#/register" class="flex items-center gap-2 py-2 text-base font-bold text-apex-pink">
            <i data-lucide="user-plus" class="w-4 h-4"></i> Create Account
          </a>
          <a href="#/login" class="flex items-center gap-2 py-2 text-base font-bold text-white">
            <i data-lucide="log-in" class="w-4 h-4 text-apex-cyan"></i> Sign In
          </a>
        </div>
      ` : `
        <div class="border-t border-white/10 pt-3 space-y-2">
          <a href="#/watchlist" class="block py-2 text-sm font-semibold text-gray-300 hover:text-apex-pink">My Watchlist</a>
          <a href="#/history" class="block py-2 text-sm font-semibold text-gray-300 hover:text-apex-pink">Watch History</a>
          <a href="#/profile" class="block py-2 text-sm font-semibold text-gray-300 hover:text-apex-pink">Account Settings</a>
          ${isAdmin ? `<a href="#/admin" class="block py-2 text-sm font-bold text-cyan-400 hover:underline">Admin Dashboard</a>` : ''}
          <button id="mobile-logout-btn" class="w-full text-left py-2 text-sm font-bold text-red-400">Sign Out</button>
        </div>
      `}
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  // Attach search event listeners
  const searchInput = document.getElementById('navbar-search-input');
  const dropdown = document.getElementById('search-autocomplete-dropdown');

  if (searchInput && dropdown) {
    searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      clearTimeout(searchDebounceTimeout);
      if (q.length < 2) {
        dropdown.classList.add('hidden');
        dropdown.innerHTML = '';
        return;
      }

      searchDebounceTimeout = setTimeout(async () => {
        try {
          const res = await api.getAnimeList({ search: q, limit: 5 });
          if (res.items && res.items.length > 0) {
            dropdown.innerHTML = res.items.map(anime => `
              <a href="#/anime/${anime.slug}" class="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors group">
                <img src="${anime.poster_url}" alt="${anime.title}" class="w-10 h-14 object-cover rounded flex-shrink-0">
                <div class="flex-grow min-w-0">
                  <div class="text-sm font-semibold text-gray-200 group-hover:text-apex-pink truncate">${anime.title}</div>
                  <div class="text-xs text-gray-400 flex items-center gap-2 mt-0.5">
                    <span class="text-apex-pink font-bold">★ ${anime.rating}</span>
                    <span>•</span>
                    <span>${anime.type || 'TV'}</span>
                    <span>•</span>
                    <span>${anime.year || ''}</span>
                  </div>
                </div>
              </a>
            `).join('') + `
              <a href="#/browse?search=${encodeURIComponent(q)}" class="block text-center py-2 text-xs font-bold text-apex-cyan hover:underline border-t border-white/5 mt-1">
                View all search results →
              </a>
            `;
            dropdown.classList.remove('hidden');
            if (window.lucide) window.lucide.createIcons();
          } else {
            dropdown.innerHTML = `<div class="p-3 text-center text-sm text-gray-400">No results found for "${q}"</div>`;
            dropdown.classList.remove('hidden');
          }
        } catch (err) {
          console.error(err);
        }
      }, 300);
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });

    // Enter key submits to browse page
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = searchInput.value.trim();
        if (q) {
          dropdown.classList.add('hidden');
          router.navigate(`/browse?search=${encodeURIComponent(q)}`);
        }
      }
    });
  }

  // Mobile search
  const mobileSearch = document.getElementById('mobile-search-input');
  if (mobileSearch) {
    mobileSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = mobileSearch.value.trim();
        if (q) {
          document.getElementById('mobile-drawer').classList.add('hidden');
          router.navigate(`/browse?search=${encodeURIComponent(q)}`);
        }
      }
    });
  }

  // User menu toggle
  const userMenuBtn = document.getElementById('user-menu-btn');
  const userDropdown = document.getElementById('user-dropdown-panel');
  if (userMenuBtn && userDropdown) {
    userMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
      if (!userMenuBtn.contains(e.target) && !userDropdown.contains(e.target)) {
        userDropdown.classList.add('hidden');
      }
    });
  }

  // Logout buttons (desktop & mobile)
  const handleLogout = () => {
    state.logout();
    router.navigate('/');
  };
  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);
  document.getElementById('mobile-logout-btn')?.addEventListener('click', handleLogout);

  // Mobile drawer toggle
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const mobileDrawer = document.getElementById('mobile-drawer');
  if (mobileToggle && mobileDrawer) {
    mobileToggle.addEventListener('click', () => {
      mobileDrawer.classList.toggle('hidden');
    });
  }
}
