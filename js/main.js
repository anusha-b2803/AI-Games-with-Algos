/* ============================================
   AI GAME PLAYGROUND - MAIN.JS
   Core utilities, navigation, theme
   ============================================ */

// ============ THEME MANAGER ============
const ThemeManager = {
  KEY: 'ai-playground-theme',

  init() {
    const saved = localStorage.getItem(this.KEY) || 'dark';
    this.apply(saved);
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.addEventListener('click', () => this.toggle());
    });
  },

  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      btn.textContent = theme === 'dark' ? '☀️' : '🌙';
    });
    localStorage.setItem(this.KEY, theme);
  },

  toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    this.apply(current === 'dark' ? 'light' : 'dark');
  }
};

// ============ NAVBAR ============
const NavBar = {
  init() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    // Scroll effect
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 20);
    });

    // Active link
    const path = window.location.pathname.split('/').pop();
    document.querySelectorAll('.nav-links a').forEach(link => {
      const href = link.getAttribute('href')?.split('/').pop();
      if (href === path || (path === '' && href === 'index.html')) {
        link.classList.add('active');
      }
    });

    // Hamburger
    const hamburger = document.querySelector('.hamburger');
    const links = document.querySelector('.nav-links');
    hamburger?.addEventListener('click', () => {
      links?.classList.toggle('nav-open');
    });
  }
};

// ============ RIPPLE EFFECT ============
function addRipple(el) {
  el.addEventListener('click', function(e) {
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    const rect = this.getBoundingClientRect();
    const x = e.clientX - rect.left - 4;
    const y = e.clientY - rect.top - 4;
    ripple.style.cssText = `left:${x}px;top:${y}px`;
    this.appendChild(ripple);
    setTimeout(() => ripple.remove(), 500);
  });
  el.classList.add('ripple-container');
}

// ============ TOAST NOTIFICATIONS ============
const Toast = {
  container: null,

  init() {
    this.container = document.getElementById('toast-container');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      this.container.id = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(message, type = 'info', duration = 3000) {
    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${icons[type] || 'ℹ'}</span> ${message}`;
    this.container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};

// ============ PARTICLES ============
const Particles = {
  init(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const colors = ['#06b6d4', '#3b82f6', '#8b5cf6', '#10b981'];
    const count = 20;

    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.cssText = `
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100 + 100}%;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        animation-delay: ${Math.random() * 6}s;
        animation-duration: ${5 + Math.random() * 5}s;
        --tx: ${(Math.random() - 0.5) * 100}px;
        width: ${2 + Math.random() * 3}px;
        height: ${2 + Math.random() * 3}px;
        opacity: 0;
      `;
      container.appendChild(p);
    }
  }
};

// ============ SCROLL ANIMATIONS ============
const ScrollAnimator = {
  init() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in-up');
          entry.target.style.animationDelay = entry.target.dataset.delay || '0s';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('[data-animate]').forEach(el => {
      observer.observe(el);
    });
  }
};

// ============ COUNTER ANIMATION ============
function animateCounter(el, target, duration = 1500) {
  const start = performance.now();
  const startVal = 0;

  const update = (time) => {
    const elapsed = time - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(startVal + (target - startVal) * ease);
    if (progress < 1) requestAnimationFrame(update);
    else el.textContent = target;
  };

  requestAnimationFrame(update);
}

// ============ COLLAPSIBLE INFO CARDS ============
function initCollapsibles() {
  document.querySelectorAll('.info-card-header').forEach(header => {
    header.addEventListener('click', () => {
      const card = header.closest('.info-card');
      card?.classList.toggle('collapsed');
    });
  });
}

// ============ MODE SELECTOR ============
function initModeSelectors() {
  document.querySelectorAll('.mode-selector').forEach(selector => {
    selector.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        selector.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        // Dispatch custom event
        selector.dispatchEvent(new CustomEvent('modeChange', {
          detail: { mode: this.dataset.mode }
        }));
      });
    });
  });
}

// ============ GLOBAL INIT ============
document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
  NavBar.init();
  Toast.init();
  ScrollAnimator.init();
  initCollapsibles();
  initModeSelectors();

  // Add ripple to all buttons
  document.querySelectorAll('.btn').forEach(addRipple);

  // Particles on hero
  if (document.getElementById('particles')) {
    Particles.init('particles');
  }

  // Animate counters
  document.querySelectorAll('[data-counter]').forEach(el => {
    const target = parseInt(el.dataset.counter);
    const obs = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        animateCounter(el, target);
        obs.disconnect();
      }
    });
    obs.observe(el);
  });

  // Page entrance
  document.querySelector('.page-content')?.classList.add('page-transition-enter');
});

// ============ EXPORT UTILITIES ============
window.AIPlayground = {
  Toast,
  ThemeManager,
  animateCounter,
  addRipple
};
