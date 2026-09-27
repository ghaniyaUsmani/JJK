/**
 * Welcome / landing screen. Full viewport, centered stack:
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
