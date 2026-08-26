/**
 * Algorithm Master - Main App Controller & Sound Effects
 * จัดการการเปลี่ยนหน้า (SPA), Night Mode Toggle, Web Audio SFX และ Responsive Navigation
 */

class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  play(type) {
    if (this.muted) return;
    try {
      this.initContext();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      const now = this.ctx.currentTime;

      if (type === 'click' || type === 'place') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'pop') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(300, now + 0.06);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.06);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.06);
      } else if (type === 'correct') {
        // High pleasant chord
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + (i * 0.07));
          gain.gain.setValueAtTime(0.18, now + (i * 0.07));
          gain.gain.exponentialRampToValueAtTime(0.001, now + (i * 0.07) + 0.35);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + (i * 0.07));
          osc.stop(now + (i * 0.07) + 0.35);
        });
      } else if (type === 'wrong') {
        // Low buzzy chord
        [220, 196, 174].forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + (i * 0.08));
          gain.gain.setValueAtTime(0.15, now + (i * 0.08));
          gain.gain.exponentialRampToValueAtTime(0.001, now + (i * 0.08) + 0.25);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + (i * 0.08));
          osc.stop(now + (i * 0.08) + 0.25);
        });
      } else if (type === 'start') {
        [392, 523.25, 659.25].forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + (i * 0.08));
          gain.gain.setValueAtTime(0.2, now + (i * 0.08));
          gain.gain.exponentialRampToValueAtTime(0.001, now + (i * 0.08) + 0.2);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + (i * 0.08));
          osc.stop(now + (i * 0.08) + 0.2);
        });
      } else if (type === 'tick') {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.03);
      } else if (type === 'gameover') {
        [440, 392, 349.23, 329.63].forEach((freq, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + (i * 0.15));
          gain.gain.setValueAtTime(0.2, now + (i * 0.15));
          gain.gain.exponentialRampToValueAtTime(0.001, now + (i * 0.15) + 0.4);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + (i * 0.15));
          osc.stop(now + (i * 0.15) + 0.4);
        });
      }
    } catch (e) {
      console.warn('Audio context playback failed:', e);
    }
  }
}

class AppController {
  constructor() {
    this.currentPage = 'home';
    this.isDarkMode = false;
    this.init();
  }

  init() {
    this.initTheme();
    this.bindNavigation();
    this.bindSettings();
  }

  initTheme() {
    const savedTheme = localStorage.getItem('algorithm_master_theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      this.setDarkMode(true);
    } else {
      this.setDarkMode(false);
    }
  }

  setDarkMode(isDark) {
    this.isDarkMode = isDark;
    const html = document.documentElement;
    const nightToggle = document.getElementById('night-mode-toggle');
    const nightQuickToggle = document.getElementById('quick-theme-toggle');

    if (isDark) {
      html.classList.add('dark');
      localStorage.setItem('algorithm_master_theme', 'dark');
      if (nightToggle) nightToggle.checked = true;
      if (nightQuickToggle) nightQuickToggle.innerHTML = '🌙';
    } else {
      html.classList.remove('dark');
      localStorage.setItem('algorithm_master_theme', 'light');
      if (nightToggle) nightToggle.checked = false;
      if (nightQuickToggle) nightQuickToggle.innerHTML = '☀️';
    }
  }

  bindNavigation() {
    // Nav buttons
    document.querySelectorAll('[data-nav-target]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = btn.dataset.navTarget;
        this.switchPage(target);
        if (window.soundManager) window.soundManager.play('click');
      });
    });

    // Quick theme toggle button in navbar
    const quickTheme = document.getElementById('quick-theme-toggle');
    if (quickTheme) {
      quickTheme.addEventListener('click', () => {
        this.setDarkMode(!this.isDarkMode);
        if (window.soundManager) window.soundManager.play('click');
      });
    }

    // Mobile navigation menu toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu-dropdown');
    if (mobileMenuBtn && mobileMenu) {
      mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
      });

      // Close mobile menu when a nav item is clicked
      mobileMenu.querySelectorAll('[data-nav-target]').forEach(item => {
        item.addEventListener('click', () => {
          mobileMenu.classList.add('hidden');
        });
      });
    }
  }

  bindSettings() {
    const nightToggle = document.getElementById('night-mode-toggle');
    if (nightToggle) {
      nightToggle.addEventListener('change', (e) => {
        this.setDarkMode(e.target.checked);
        if (window.soundManager) window.soundManager.play('click');
      });
    }

    const soundToggle = document.getElementById('sound-toggle');
    if (soundToggle) {
      soundToggle.addEventListener('change', (e) => {
        if (window.soundManager) {
          window.soundManager.muted = !e.target.checked;
        }
      });
    }
  }

  switchPage(pageName) {
    this.currentPage = pageName;

    // Hide all pages
    document.querySelectorAll('.page-view').forEach(p => p.classList.add('hidden'));

    // Show target page
    const targetPage = document.getElementById(`page-${pageName}`);
    if (targetPage) {
      targetPage.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Update Nav Link Active States
    document.querySelectorAll('[data-nav-target]').forEach(btn => {
      if (btn.dataset.navTarget === pageName) {
        btn.classList.add('active-nav-link', 'text-pink-600', 'dark:text-pink-400', 'font-extrabold');
        btn.classList.remove('text-zinc-700', 'dark:text-zinc-300');
      } else {
        btn.classList.remove('active-nav-link', 'text-pink-600', 'dark:text-pink-400', 'font-extrabold');
        btn.classList.add('text-zinc-700', 'dark:text-zinc-300');
      }
    });

    // If switching to Play, make sure lobby leaderboard is rendered
    if (pageName === 'play') {
      if (typeof renderLeaderboardUI === 'function' && window.algorithmGame) {
        renderLeaderboardUI(String(window.algorithmGame.selectedTimeLimit || 60));
      }
    }
  }
}

// Global instances
window.soundManager = new SoundManager();
window.app = null;

document.addEventListener('DOMContentLoaded', () => {
  window.app = new AppController();
});
