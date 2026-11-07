import { api } from '../api.js';
import { state } from '../state.js';
import { router } from '../router.js';
import { Toast } from '../components/toast.js';

export async function renderProfile(app) {
  if (!state.isAuthenticated()) {
    router.navigate('/login');
    return;
  }

  const user = state.user;
  app.innerHTML = `
    <div class="max-w-2xl mx-auto px-4 py-10">
      <h1 class="text-3xl font-black text-white mb-8">Account Settings</h1>

      <!-- Avatar & Username Header -->
      <div class="glass-panel rounded-xl p-6 mb-6 flex items-center gap-5">
        <div class="relative">
          <img src="${user.avatar}" id="avatar-preview" class="w-20 h-20 rounded-2xl object-cover border-2 border-apex-pink/30" alt="${user.username}">
          <div class="absolute -bottom-1 -right-1 w-7 h-7 bg-apex-pink rounded-full flex items-center justify-center cursor-pointer" onclick="document.getElementById('avatar-url-input').focus()">
            <i data-lucide="camera" class="w-3.5 h-3.5 text-white"></i>
          </div>
        </div>
        <div>
          <div class="text-xl font-black text-white">${user.username}</div>
          <div class="text-sm text-gray-400">${user.email}</div>
          <span class="inline-block mt-1.5 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-apex-pink/20 text-apex-pink uppercase">${user.role}</span>
        </div>
      </div>

      <!-- Profile Form -->
      <div class="glass-panel rounded-xl p-6 mb-6">
        <h2 class="text-sm font-bold uppercase tracking-wider text-gray-400 mb-5">Profile Information</h2>
        <form id="profile-form" class="space-y-4">
          <div>
            <label class="block text-sm font-semibold mb-1.5 text-gray-300">Username</label>
            <input type="text" id="edit-username" value="${user.username}" class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-apex-pink transition-colors" />
          </div>
          <div>
            <label class="block text-sm font-semibold mb-1.5 text-gray-300">Avatar URL</label>
            <input type="url" id="avatar-url-input" value="${user.avatar}" placeholder="https://..." class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-apex-pink transition-colors" />
          </div>
          <div>
            <label class="block text-sm font-semibold mb-1.5 text-gray-300">Bio</label>
            <textarea id="edit-bio" rows="3" class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-apex-pink resize-none transition-colors">${user.bio || ''}</textarea>
          </div>
          <button type="submit" class="btn-apex-primary w-full py-2.5">
            <i data-lucide="save" class="w-4 h-4"></i> Save Profile
          </button>
        </form>
      </div>

      <!-- Change Password -->
      <div class="glass-panel rounded-xl p-6 mb-6">
        <h2 class="text-sm font-bold uppercase tracking-wider text-gray-400 mb-5">Change Password</h2>
        <form id="password-form" class="space-y-4">
          <div>
            <label class="block text-sm font-semibold mb-1.5 text-gray-300">Current Password</label>
            <input type="password" id="cur-password" class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-apex-pink transition-colors" />
          </div>
          <div>
            <label class="block text-sm font-semibold mb-1.5 text-gray-300">New Password</label>
            <input type="password" id="new-password" class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-apex-pink transition-colors" />
          </div>
          <button type="submit" class="btn-apex-secondary w-full py-2.5">
            <i data-lucide="lock" class="w-4 h-4"></i> Update Password
          </button>
        </form>
      </div>

      <!-- Preferences -->
      <div class="glass-panel rounded-xl p-6">
        <h2 class="text-sm font-bold uppercase tracking-wider text-gray-400 mb-5">Preferences</h2>
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-semibold text-white">Auto-Skip Intro</p>
              <p class="text-xs text-gray-400">Automatically skip opening themes</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="auto-skip-toggle" class="sr-only peer" ${state.settings.autoSkipIntro ? 'checked' : ''}>
              <div class="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-apex-pink peer-focus:outline-none transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
            </label>
          </div>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-semibold text-white">Auto Next Episode</p>
              <p class="text-xs text-gray-400">Automatically play next episode when current ends</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="auto-next-toggle" class="sr-only peer" ${state.settings.autoNextEpisode ? 'checked' : ''}>
              <div class="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-apex-pink peer-focus:outline-none transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
            </label>
          </div>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-semibold text-white">Default Audio Track</p>
              <p class="text-xs text-gray-400">Preferred audio language</p>
            </div>
            <select id="pref-audio" class="bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-apex-pink cursor-pointer">
              <option value="ja" ${state.settings.preferredAudio === 'ja' ? 'selected' : ''}>Japanese (Original)</option>
              <option value="en" ${state.settings.preferredAudio === 'en' ? 'selected' : ''}>English Dub</option>
              <option value="hi" ${state.settings.preferredAudio === 'hi' ? 'selected' : ''}>Hindi Dub</option>
            </select>
          </div>
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-semibold text-white">Theme</p>
              <p class="text-xs text-gray-400">Dark or light mode</p>
            </div>
            <button id="theme-toggle-profile" class="btn-apex-secondary text-sm py-1.5 px-4">
              <i data-lucide="${state.theme === 'dark' ? 'sun' : 'moon'}" class="w-4 h-4"></i>
              ${state.theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  // Live avatar preview
  document.getElementById('avatar-url-input')?.addEventListener('input', (e) => {
    const preview = document.getElementById('avatar-preview');
    if (preview) preview.src = e.target.value;
  });

  // Profile form
  document.getElementById('profile-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const data = {
        username: document.getElementById('edit-username').value.trim(),
        avatar: document.getElementById('avatar-url-input').value.trim(),
        bio: document.getElementById('edit-bio').value.trim()
      };
      const res = await api.updateProfile(data);
      state.setUser({ ...state.user, ...res.user }, state.token);
      Toast.success('Profile updated!');
    } catch (err) { Toast.error(err.message); }
  });

  // Password form
  document.getElementById('password-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('cur-password').value;
    const newPassword = document.getElementById('new-password').value;
    if (!password || !newPassword) { Toast.error('Fill both password fields'); return; }
    try {
      await api.updateProfile({ password, newPassword });
      Toast.success('Password changed!');
      document.getElementById('cur-password').value = '';
      document.getElementById('new-password').value = '';
    } catch (err) { Toast.error(err.message); }
  });

  // Preferences toggles
  document.getElementById('auto-skip-toggle')?.addEventListener('change', (e) => {
    state.setSettings('autoSkipIntro', e.target.checked);
    Toast.info(`Auto-skip intro ${e.target.checked ? 'enabled' : 'disabled'}`);
  });
  document.getElementById('auto-next-toggle')?.addEventListener('change', (e) => {
    state.setSettings('autoNextEpisode', e.target.checked);
    Toast.info(`Auto next episode ${e.target.checked ? 'enabled' : 'disabled'}`);
  });
  document.getElementById('pref-audio')?.addEventListener('change', (e) => {
    state.setSettings('preferredAudio', e.target.value);
    Toast.info(`Default audio set to ${e.target.options[e.target.selectedIndex].text}`);
  });

  // Theme toggle
  document.getElementById('theme-toggle-profile')?.addEventListener('click', () => {
    const newTheme = state.toggleTheme();
    Toast.info(`Switched to ${newTheme} mode`);
    renderProfile(app);
  });
}
