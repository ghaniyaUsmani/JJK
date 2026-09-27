/**
 * Welcome / landing screen. Full viewport, centered stack:
 *   - Enlarged hexagonal brand mark (the app's own cursed-eye logo)
 *   - Wordmark "JJK"
 *   - Short tagline
 *   - Short 1-line description
 *   - Primary CTA that hashes to #train
 *   - Fine-print hint about camera permission
 */
export function mountWelcome(root, ctx) {
  root.innerHTML = `
    <section class="screen welcome" aria-label="Welcome">
      <div class="welcome-inner">
        <div class="welcome-logo" aria-hidden="true">
          <svg viewBox="0 0 120 132" xmlns="http://www.w3.org/2000/svg" fill="none">
            <defs>
              <radialGradient id="hexGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="rgba(176, 128, 255, 0.55)"/>
                <stop offset="70%" stop-color="rgba(122, 60, 255, 0.15)"/>
                <stop offset="100%" stop-color="rgba(122, 60, 255, 0)"/>
              </radialGradient>
              <linearGradient id="hexStroke" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#B080FF"/>
                <stop offset="100%" stop-color="#7A3CFF"/>
              </linearGradient>
            </defs>
            <circle cx="60" cy="66" r="58" fill="url(#hexGlow)"/>
            <path d="M60 8 L110 34 L110 92 L60 118 L10 92 L10 34 Z"
                  stroke="url(#hexStroke)" stroke-width="1.6" stroke-linejoin="round"/>
            <path d="M60 22 L96 40 L96 84 L60 102 L24 84 L24 40 Z"
                  stroke="rgba(176, 128, 255, 0.4)" stroke-width="1" stroke-linejoin="round"/>
            <circle cx="60" cy="66" r="6" fill="#B080FF"/>
            <circle cx="60" cy="66" r="12" stroke="rgba(176, 128, 255, 0.6)" stroke-width="1"/>
          </svg>
        </div>

        <div class="welcome-wordmark">
          <div class="welcome-brand h-display">JJK</div>
          <div class="welcome-tagline eyebrow">Hand Sign Techniques</div>
        </div>

        <p class="welcome-lede">
          Train your own hand signs, then cast cursed techniques from the camera.
        </p>

        <div class="welcome-cta">
          <button class="btn btn-primary btn-lg" data-action="begin">
            Begin
            <svg viewBox="0 0 16 16" width="14" height="14" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M4 8 L11 8 M8 5 L11 8 L8 11"
                    stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            </svg>
          </button>
        </div>

        <div class="welcome-hint">
          Requires camera access on the next screen.
        </div>
      </div>
    </section>
  `;

  const begin = () => { window.location.hash = 'train'; };
  const btn = root.querySelector('[data-action="begin"]');
  btn.addEventListener('click', begin);

  const onKey = (e) => {
    if (e.target.closest('input, textarea, [contenteditable]')) return;
    if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      begin();
    }
  };
  window.addEventListener('keydown', onKey);
  btn.focus();

  return () => {
    window.removeEventListener('keydown', onKey);
  };
}
