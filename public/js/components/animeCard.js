// Anime Card Component

export function createAnimeCard(anime) {
  const genresText = (anime.genres || []).slice(0, 2).join(' • ');
  const numRating = parseFloat(anime.rating);
  const score = !isNaN(numRating) ? numRating.toFixed(1) : '8.0';
  const isMovie = anime.type === 'Movie';

  return `
    <div class="anime-card group" onclick="location.hash = '#/anime/${anime.slug}'">
      <div class="relative overflow-hidden aspect-[2/3] bg-[#12141e]">
        <img 
          src="${anime.poster_url || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&h=900&q=80'}" 
          alt="${anime.title}" 
          loading="lazy"
          onerror="this.src='https://images.unsplash.com/photo-1578632767115-351597cf2477?auto=format&fit=crop&w=600&h=900&q=80'"
          class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        <!-- Top Badges -->
        <div class="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          <span class="badge-score">
            ★ ${score}
          </span>
          <div class="flex items-center gap-1">
            ${isMovie ? `<span class="bg-purple-600/90 text-white font-black text-[9px] px-1.5 py-0.5 rounded shadow">MOVIE</span>` : ''}
            ${anime.has_hindi_dub ? `<span class="bg-amber-500/90 text-black font-black text-[9px] px-1.5 py-0.5 rounded shadow">HINDI</span>` : ''}
            ${anime.has_sub !== false && !isMovie ? `<span class="badge-sub">SUB</span>` : ''}
            ${anime.has_dub && !isMovie ? `<span class="badge-dub">DUB</span>` : ''}
          </div>
        </div>

        <!-- Center Play Icon on Hover -->
        <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/40 backdrop-blur-[2px]">
          <div class="w-12 h-12 rounded-full bg-apex-pink text-white flex items-center justify-center shadow-lg shadow-pink-500/50 transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3"></polygon></svg>
          </div>
        </div>

        <!-- Card bottom info overlay -->
        <div class="card-overlay">
          <div class="text-[11px] font-bold text-apex-cyan uppercase tracking-wider mb-0.5 truncate">${genresText}</div>
          <h3 class="text-sm font-bold text-white line-clamp-1 group-hover:text-apex-pink transition-colors">${anime.title}</h3>
          <div class="text-[11px] text-gray-400 flex items-center gap-2 mt-1">
            <span>${anime.type || 'TV'}</span>
            <span>•</span>
            <span>${isMovie ? 'Full Movie' : `${anime.episodes_count || 0} Eps`}</span>
            <span>•</span>
            <span>${anime.year || ''}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}
