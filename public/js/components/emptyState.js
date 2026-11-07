// Reusable Empty State Component

export function renderEmptyState({
  icon = 'film',
  title = 'No anime found',
  description = 'Try adjusting your filters or search terms to find what you are looking for.',
  actionText = 'Browse All Anime',
  actionHref = '#/explore'
} = {}) {
  return `
    <div class="empty-state py-16 px-4 max-w-md mx-auto">
      <div class="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-apex-pink mb-4 shadow-xl shadow-pink-500/10">
        <i data-lucide="${icon}" class="w-8 h-8"></i>
      </div>
      <h3 class="text-xl font-bold text-white mb-2">${title}</h3>
      <p class="text-sm text-gray-400 mb-6 leading-relaxed">${description}</p>
      ${actionText ? `
        <a href="${actionHref}" class="btn-apex-primary text-sm py-2 px-5">
          <span>${actionText}</span>
          <i data-lucide="arrow-right" class="w-4 h-4"></i>
        </a>
      ` : ''}
    </div>
  `;
}
