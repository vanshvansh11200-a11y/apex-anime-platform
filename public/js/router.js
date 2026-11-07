// APEX SPA Router
import { renderNavbar } from './components/navbar.js';
import { renderFooter } from './components/footer.js';
import { state } from './state.js';

class Router {
  constructor() {
    this.routes = {};
    this.currentPath = null;
    window.addEventListener('hashchange', () => this.handleRoute());
  }

  register(path, handler) {
    this.routes[path] = handler;
    return this;
  }

  navigate(path) {
    window.location.hash = `#${path}`;
  }

  parseHash() {
    const hash = window.location.hash || '#/';
    const withoutHash = hash.startsWith('#') ? hash.slice(1) : hash;
    const [pathWithSlash, queryStr] = withoutHash.split('?');
    const path = pathWithSlash || '/';
    const params = new URLSearchParams(queryStr || '');
    return { path, params };
  }

  async handleRoute() {
    // Cleanup previous player if any
    if (window._apexPlayerCleanup) {
      try { window._apexPlayerCleanup(); } catch {}
      window._apexPlayerCleanup = null;
    }

    const { path } = this.parseHash();
    const app = document.getElementById('app');
    if (!app) return;

    // Scroll to top
    try {
      window.scrollTo(0, 0);
    } catch (_) {}

    // Re-render navbar on each route (state may have changed)
    renderNavbar();

    // Guard: Admin route protection (Only the verified owner can enter)
    if (path === '/admin' && !state.isAdmin()) {
      this.navigate(state.isAuthenticated() ? '/' : '/login');
      return;
    }

    // Try exact match first
    if (this.routes[path]) {
      this.currentPath = path;
      await this.routes[path](app);
      return;
    }

    // Try dynamic segments: /anime/:slug, /watch/:id, etc.
    for (const [pattern, handler] of Object.entries(this.routes)) {
      const match = this.matchDynamic(pattern, path);
      if (match) {
        this.currentPath = path;
        await handler(app, ...Object.values(match));
        return;
      }
    }

    // 404
    if (this.routes['*']) {
      await this.routes['*'](app);
    }
  }

  matchDynamic(pattern, path) {
    const patternParts = pattern.split('/');
    const pathParts = path.split('/');
    if (patternParts.length !== pathParts.length) return null;

    const params = {};
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        params[patternParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
      } else if (patternParts[i] !== pathParts[i]) {
        return null;
      }
    }
    return params;
  }

  start() {
    if (!window.location.hash || window.location.hash === '') {
      window.location.hash = '#/';
    }
    this.handleRoute();
  }
}

export const router = new Router();
