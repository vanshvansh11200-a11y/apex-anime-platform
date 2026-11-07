export function renderNotFound(app) {
  app.innerHTML = `
    <div class="min-h-[80vh] flex items-center justify-center px-4">
      <div class="text-center max-w-md">
        <div class="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-apex-pink to-orange-500 mb-4">404</div>
        <h2 class="text-2xl font-black text-white mb-3">Page Not Found</h2>
        <p class="text-gray-400 mb-8">The page you're looking for doesn't exist or has been moved.</p>
        <div class="flex gap-4 justify-center">
          <a href="#/" class="btn-apex-primary"><i data-lucide="home" class="w-5 h-5"></i> Go Home</a>
          <a href="#/explore" class="btn-apex-secondary"><i data-lucide="film" class="w-5 h-5"></i> Browse Anime</a>
        </div>
      </div>
    </div>
  `;
  if (window.lucide) window.lucide.createIcons();
}
