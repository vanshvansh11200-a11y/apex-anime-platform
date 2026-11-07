// APEX Footer Component

export function renderFooter() {
  const footer = document.getElementById('site-footer');
  if (!footer) return;

  footer.innerHTML = `
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <!-- Col 1: Brand -->
        <div class="md:col-span-1">
          <img src="/assets/logo.svg" alt="APEX" class="h-8 mb-4">
          <p class="text-sm text-gray-400 leading-relaxed">
            The next-generation production anime streaming platform with adaptive 1080p playback, auto-skip intro, and seamless community synchronization.
          </p>
          <div class="flex items-center gap-3 mt-4 text-gray-400">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span class="text-xs font-mono text-emerald-400">APEX Core v1.0 • Operational</span>
          </div>
        </div>

        <!-- Col 2: Navigation -->
        <div>
          <h4 class="text-xs font-bold uppercase tracking-wider text-gray-200 mb-4">Navigation</h4>
          <ul class="space-y-2 text-sm text-gray-400">
            <li><a href="#/" class="hover:text-apex-pink transition-colors">Home</a></li>
            <li><a href="#/browse" class="hover:text-apex-pink transition-colors">Popular Anime</a></li>
            <li><a href="#/browse?status=Airing" class="hover:text-apex-pink transition-colors">Currently Airing</a></li>
            <li><a href="#/browse?sort=rating" class="hover:text-apex-pink transition-colors">Top Rated</a></li>
          </ul>
        </div>

        <!-- Col 3: Community & User -->
        <div>
          <h4 class="text-xs font-bold uppercase tracking-wider text-gray-200 mb-4">User Hub</h4>
          <ul class="space-y-2 text-sm text-gray-400">
            <li><a href="#/browse" class="hover:text-apex-pink transition-colors">Anime Series</a></li>
            <li><a href="#/explore?type=Movie" class="hover:text-apex-pink transition-colors">Movies</a></li>
            <li><a href="#/register" class="hover:text-apex-pink transition-colors">Create Account</a></li>
            <li><a href="#/login" class="hover:text-apex-pink transition-colors">Sign In</a></li>
          </ul>
        </div>

        <!-- Col 4: Security & Direct Stream -->
        <div>
          <h4 class="text-xs font-bold uppercase tracking-wider text-apex-cyan mb-4">Secure Network</h4>
          <div class="text-xs bg-[#12141e] border border-white/5 rounded-lg p-3 space-y-2">
            <div class="flex items-center gap-2 text-emerald-400 font-semibold">
              <i data-lucide="shield-check" class="w-4 h-4"></i>
              <span>Hardened API Shield</span>
            </div>
            <p class="text-gray-400 text-xs leading-relaxed">
              Anti-Brute Force Protection, 12-round bcrypt hash & encrypted streaming tokens active.
            </p>
            <div class="pt-1">
              <a href="#/register" class="text-apex-pink text-xs font-bold hover:underline flex items-center gap-1">
                Create User Account <i data-lucide="arrow-right" class="w-3 h-3"></i>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div class="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
        <div>© 2026 APEX Media Streaming Inc. All rights reserved. Built for anime enthusiasts worldwide.</div>
        <div class="flex items-center gap-6">
          <a href="#/" class="hover:text-gray-400">Terms of Service</a>
          <a href="#/" class="hover:text-gray-400">Privacy Policy</a>
          <a href="#/" class="hover:text-gray-400">DMCA Notice</a>
        </div>
      </div>
    </div>
  `;
}
