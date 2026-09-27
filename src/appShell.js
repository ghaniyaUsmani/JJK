import { mountTrainer } from './trainer/trainerUI.js';
import { mountPlay } from './play/playUI.js';
import { mountWelcome } from './welcome/welcomeUI.js';

const ROUTES = ['welcome', 'train', 'play'];
const NAV_ROUTES = ['train', 'play'];   // routes that show the top nav tabs
const DEFAULT_ROUTE = 'welcome';

function currentRoute() {
  const hash = window.location.hash.replace('#', '').trim();
  return ROUTES.includes(hash) ? hash : DEFAULT_ROUTE;
}

function brandSvg() {
  return `
    <svg class="brand-mark" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 2 L21 7 L21 17 L12 22 L3 17 L3 7 Z"
            stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>
      <circle cx="12" cy="12" r="2.4" fill="currentColor"/>
    </svg>
  `;
}

export function mountAppShell(root, model) {
  root.innerHTML = `
    <nav class="app-nav" aria-label="Primary" data-hidden="false">
      <button class="brand" data-action="home" aria-label="Home">
        ${brandSvg()}
        <span>JJK</span>
        <span class="slash">/</span>
        <span class="brand-sub">Hand Sign Techniques</span>
      </button>
      <div class="nav-tabs" role="tablist">
        <button class="nav-tab" data-route="train" role="tab">Train</button>
        <button class="nav-tab" data-route="play" role="tab">Play</button>
      </div>
    </nav>
    <main class="screen" id="screen"></main>
  `;

  const nav = root.querySelector('.app-nav');
  const screen = root.querySelector('#screen');
  const tabs = root.querySelectorAll('.nav-tab');
  const brand = root.querySelector('[data-action="home"]');

  tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      window.location.hash = btn.dataset.route;
    });
  });
  brand.addEventListener('click', () => {
    window.location.hash = 'welcome';
  });

  const ctx = { model };
  let disposeScreen = null;

  function render() {
    if (typeof disposeScreen === 'function') {
      try { disposeScreen(); } catch (_) { /* noop */ }
      disposeScreen = null;
    }
    const route = currentRoute();
    // Only show nav tabs on the actual app screens (Train/Play).
    // The welcome screen is a full-viewport hero, so nav slips out entirely.
    nav.setAttribute('data-hidden', NAV_ROUTES.includes(route) ? 'false' : 'true');

    tabs.forEach((btn) => {
      const active = btn.dataset.route === route;
      if (active) btn.setAttribute('aria-current', 'page');
      else btn.removeAttribute('aria-current');
    });
    screen.innerHTML = '';
    if (route === 'welcome') {
      disposeScreen = mountWelcome(screen, ctx);
    } else if (route === 'train') {
      disposeScreen = mountTrainer(screen, ctx);
    } else {
      disposeScreen = mountPlay(screen, ctx);
    }
  }

  window.addEventListener('hashchange', render);
  render();
}
