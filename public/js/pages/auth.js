import { api } from '../api.js';
import { state } from '../state.js';
import { router } from '../router.js';
import { Toast } from '../components/toast.js';

export function renderLogin(app) {
  if (state.isAuthenticated()) {
    router.navigate('/');
    return;
  }

  app.innerHTML = `
    <div class="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div class="w-full max-w-md">
        <!-- Logo -->
        <div class="text-center mb-8">
          <img src="/assets/logo.svg" alt="APEX" class="h-10 mx-auto mb-4">
          <h1 class="text-2xl font-black text-white">Welcome Back</h1>
          <p class="text-sm text-gray-400 mt-1">Sign in to your APEX account</p>
        </div>

        <!-- Card -->
        <div class="glass-panel rounded-2xl p-8 shadow-2xl">
          <form id="login-form" class="space-y-5" novalidate>
            <div>
              <label class="block text-sm font-semibold mb-1.5 text-gray-300">Email or Username</label>
              <input type="text" id="login-identifier" required autocomplete="username"
                placeholder="Enter your email or username"
                class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-apex-pink transition-colors" />
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1.5 text-gray-300">Password</label>
              <div class="relative">
                <input type="password" id="login-password" required autocomplete="current-password"
                  placeholder="••••••••"
                  class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-apex-pink transition-colors pr-10" />
                <button type="button" id="toggle-pw" class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                  <i data-lucide="eye" class="w-4 h-4"></i>
                </button>
              </div>
            </div>

            <div id="login-error" class="hidden text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3"></div>

            <button type="submit" id="login-btn" class="btn-apex-primary w-full py-3 text-base font-bold">
              <i data-lucide="log-in" class="w-5 h-5"></i>
              <span>Sign In</span>
            </button>
          </form>

          <p class="text-sm text-center text-gray-400 mt-6">
            Don't have an account? 
            <a href="#/register" class="text-apex-pink font-semibold hover:underline">Create one</a>
          </p>
        </div>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  const pwInput = document.getElementById('login-password');
  document.getElementById('toggle-pw')?.addEventListener('click', () => {
    const isText = pwInput.type === 'text';
    pwInput.type = isText ? 'password' : 'text';
    document.querySelector('#toggle-pw i')?.setAttribute('data-lucide', isText ? 'eye' : 'eye-off');
    if (window.lucide) window.lucide.createIcons();
  });

  document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const identifier = document.getElementById('login-identifier').value.trim();
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');

    errorEl.classList.add('hidden');
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader" class="w-5 h-5 animate-spin"></i> Signing in...`;
    if (window.lucide) window.lucide.createIcons();

    try {
      const res = await api.login(identifier, password);
      state.setUser(res.user, res.token);
      Toast.success(`Welcome back, ${res.user.username}! 👋`);
      router.navigate('/');
    } catch (err) {
      errorEl.textContent = err.message || 'Login failed. Please try again.';
      errorEl.classList.remove('hidden');
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="log-in" class="w-5 h-5"></i> Sign In`;
      if (window.lucide) window.lucide.createIcons();
    }
  });
}

export function renderRegister(app) {
  if (state.isAuthenticated()) {
    router.navigate('/');
    return;
  }

  app.innerHTML = `
    <div class="min-h-[80vh] flex items-center justify-center px-4 py-16">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <img src="/assets/logo.svg" alt="APEX" class="h-10 mx-auto mb-4">
          <h1 class="text-2xl font-black text-white">Create Account</h1>
          <p class="text-sm text-gray-400 mt-1">Join anime fans on APEX</p>
        </div>
        <div class="glass-panel rounded-2xl p-8 shadow-2xl">
          <form id="register-form" class="space-y-5" novalidate>
            <div>
              <label class="block text-sm font-semibold mb-1.5 text-gray-300">Username</label>
              <input type="text" id="reg-username" required placeholder="AnimeOtaku2026" autocomplete="username"
                class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-apex-pink transition-colors" />
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1.5 text-gray-300">Email</label>
              <input type="email" id="reg-email" required placeholder="you@example.com" autocomplete="email"
                class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-apex-pink transition-colors" />
            </div>
            <div>
              <label class="block text-sm font-semibold mb-1.5 text-gray-300">Password</label>
              <input type="password" id="reg-password" required placeholder="Min. 6 characters" autocomplete="new-password"
                class="w-full bg-[var(--input-bg)] border border-[var(--border-color)] rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-apex-pink transition-colors" />
            </div>
            <div id="register-error" class="hidden text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3"></div>
            <button type="submit" id="register-btn" class="btn-apex-primary w-full py-3 text-base font-bold">
              <i data-lucide="user-plus" class="w-5 h-5"></i>
              <span>Create Account</span>
            </button>
          </form>
          <p class="text-sm text-center text-gray-400 mt-6">
            Already have an account? 
            <a href="#/login" class="text-apex-pink font-semibold hover:underline">Sign In</a>
          </p>
        </div>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  document.getElementById('register-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const errorEl = document.getElementById('register-error');
    const btn = document.getElementById('register-btn');

    errorEl.classList.add('hidden');
    btn.disabled = true;
    btn.innerHTML = `<i data-lucide="loader" class="w-5 h-5 animate-spin"></i> Creating...`;
    if (window.lucide) window.lucide.createIcons();

    try {
      const res = await api.register(username, email, password);
      state.setUser(res.user, res.token);
      Toast.success(`Account created! Welcome to APEX, ${res.user.username}! 🎉`);
      router.navigate('/');
    } catch (err) {
      errorEl.textContent = err.message || 'Registration failed.';
      errorEl.classList.remove('hidden');
      btn.disabled = false;
      btn.innerHTML = `<i data-lucide="user-plus" class="w-5 h-5"></i> Create Account`;
      if (window.lucide) window.lucide.createIcons();
    }
  });
}
