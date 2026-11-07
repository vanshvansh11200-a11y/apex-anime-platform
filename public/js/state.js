// Global Reactive State Store for APEX

class StateStore {
  constructor() {
    this.token = localStorage.getItem('apex_token') || null;
    this.user = this.loadUserFromStorage();
    this.watchlist = [];
    this.history = [];
    this.theme = localStorage.getItem('apex_theme') || 'dark';
    this.settings = {
      autoSkipIntro: localStorage.getItem('apex_auto_skip_intro') === 'true',
      autoNextEpisode: localStorage.getItem('apex_auto_next') !== 'false',
      preferredAudio: localStorage.getItem('apex_preferred_audio') || 'ja', // ja, en, hi
      preferredServer: localStorage.getItem('apex_preferred_server') || 'Kaizen (HLS Multi-Bitrate)',
      subtitlesEnabled: localStorage.getItem('apex_subtitles') !== 'false'
    };
    this.listeners = new Set();
    this.applyTheme(this.theme);
  }

  loadUserFromStorage() {
    try {
      const stored = localStorage.getItem('apex_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  applyTheme(t) {
    this.theme = t;
    localStorage.setItem('apex_theme', t);
    document.documentElement.setAttribute('data-theme', t);
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  toggleTheme() {
    const next = this.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme(next);
    this.notify();
    return next;
  }

  setUser(user, token) {
    this.user = user;
    if (token) {
      this.token = token;
      localStorage.setItem('apex_token', token);
    }
    if (user) {
      localStorage.setItem('apex_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('apex_user');
      localStorage.removeItem('apex_token');
      this.token = null;
    }
    this.notify();
  }

  logout() {
    this.setUser(null, null);
    this.watchlist = [];
    this.history = [];
    this.notify();
  }

  setSettings(key, val) {
    this.settings[key] = val;
    localStorage.setItem(`apex_${key}`, val);
    this.notify();
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  notify() {
    for (const listener of this.listeners) {
      try {
        listener(this);
      } catch (e) {
        console.error('State listener error:', e);
      }
    }
  }

  isAuthenticated() {
    return !!this.token && !!this.user;
  }

  isAdmin() {
    return this.isAuthenticated() && 
           this.user.role === 'admin' && 
           (this.user.email?.toLowerCase() === 'admin@apex.stream' || 
            this.user.username?.toLowerCase() === 'apexadmin' || 
            this.user.id === 'usr_admin_apex');
  }
}

export const state = new StateStore();
