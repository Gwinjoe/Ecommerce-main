// loader.js
// Exports: inlineLoadingIndicator(color = '#6b7280', size = 30)
// and loadingIndicator singleton: { show(text = 'Loading...', opts = {}), hide() }

export function inlineLoadingIndicator(color = '#6b7280', size = 30) {
  // Dot/loader sized relative to size argument. Returns an SVG string.
  const dot = Math.max(2, Math.round(size / 6));
  const gap = Math.max(4, Math.round(size / 4));
  const anim = 0.75;
  return `
    <svg viewBox="0 0 ${size + gap * 4} ${size}" width="${size + gap * 4}" height="${size}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
      <style>
        .ld-dot { fill: ${color}; transform-origin: center; animation: ld-bounce ${anim}s infinite ease-in-out; }
        .ld-dot.d2 { animation-delay: ${-anim * 0.12}s; }
        .ld-dot.d3 { animation-delay: ${-anim * 0.24}s; }
        @keyframes ld-bounce {
          0%, 80%, 100% { transform: translateY(0) scale(0.9); opacity: 0.8; }
          40% { transform: translateY(-${Math.round(size * 0.25)}px) scale(1.05); opacity: 1; }
        }
      </style>
      <circle class="ld-dot d1" cx="${gap}" cy="${size / 2}" r="${dot}"></circle>
      <circle class="ld-dot d2" cx="${gap * 2 + dot * 1.8}" cy="${size / 2}" r="${dot}"></circle>
      <circle class="ld-dot d3" cx="${gap * 3 + dot * 3.6}" cy="${size / 2}" r="${dot}"></circle>
    </svg>
  `;
}

export const loadingIndicator = (() => {
  let overlay = null;
  let styleEl = null;

  const DEFAULT_ACCENT = '#0b74ff'; // tweak to match brand highlight
  const createStyle = () => {
    if (styleEl) return;
    styleEl = document.createElement('style');
    styleEl.id = 'app-loading-indicator-styles';
    styleEl.textContent = `
      :root {
        --li-overlay-bg: rgba(10,11,13,0.55);
        --li-panel-bg: rgba(255,255,255,0.98);
        --li-accent: ${DEFAULT_ACCENT};
        --li-radius: 14px;
        --li-text: #111827;
      }
      .li-overlay {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--li-overlay-bg);
        backdrop-filter: blur(4px) saturate(120%);
        z-index: 99999;
        -webkit-tap-highlight-color: transparent;
      }
      .li-panel {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 20px 26px;
        border-radius: var(--li-radius);
        background: var(--li-panel-bg);
        box-shadow: 0 12px 30px rgba(2,6,23,0.35);
        transform: translateY(6px) scale(0.98);
        opacity: 0;
        transition: transform 260ms cubic-bezier(.2,.9,.3,1), opacity 260ms ease;
        min-width: 180px;
        max-width: calc(100% - 40px);
      }
      .li-panel.show {
        transform: translateY(0) scale(1);
        opacity: 1;
      }
      .li-spinner {
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .li-text {
        font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
        font-size: 15px;
        color: var(--li-text);
        font-weight: 600;
        letter-spacing: 0.1px;
      }
      .li-subtext {
        font-size: 13px;
        color: #6b7280;
        font-weight: 500;
      }
      .li-dismiss {
        position: absolute;
        top: 14px;
        right: 16px;
        background: transparent;
        border: none;
        color: #374151;
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
      }
      /* circular spinner style fallback */
      .li-circle {
        width: 56px;
        height: 56px;
      }
      .li-circle svg { width: 100%; height: 100%; display: block; }
      .li-ring { stroke: rgba(15,23,42,0.08); }
      .li-arc { stroke: var(--li-accent); stroke-linecap: round; transform-origin: center; animation: li-rotate 1s linear infinite; }
      @keyframes li-rotate { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(styleEl);
  };

  const createSpinnerSVG = (size = 56, color = DEFAULT_ACCENT) => {
    // circular spinner with subtle arc
    return `
      <div class="li-circle" aria-hidden="true">
        <svg viewBox="0 0 48 48" role="img" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="liGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stop-color="${color}" stop-opacity="1"/>
              <stop offset="100%" stop-color="${color}" stop-opacity="0.4"/>
            </linearGradient>
          </defs>
          <circle class="li-ring" cx="24" cy="24" r="18" fill="none" stroke-width="4"></circle>
          <path class="li-arc" fill="none" stroke="url(#liGrad)" stroke-width="4"
            d="M24 6 a18 18 0 0 1 0 36 a9 9 0 0 0 0 -36" />
        </svg>
      </div>
    `;
  };

  return {
    /**
     * show(text = 'Loading...', opts = {})
     * opts:
     *   - color: accent color string
     *   - size: spinner size in px
     *   - dismissible: boolean (allow user to dismiss via click or ESC)
     *   - subtext: optional smaller text
     */
    show: (text = 'Loading…', opts = {}) => {
      // normalize
      const color = opts.color || DEFAULT_ACCENT;
      const size = opts.size || 56;
      const dismissible = !!opts.dismissible;
      const subtext = opts.subtext || '';

      // remove existing
      if (overlay) loadingIndicator.hide();

      createStyle();

      // overlay
      overlay = document.createElement('div');
      overlay.className = 'li-overlay';
      overlay.setAttribute('role', 'alertdialog');
      overlay.setAttribute('aria-live', 'assertive');
      overlay.setAttribute('aria-modal', 'true');

      // panel
      const panel = document.createElement('div');
      panel.className = 'li-panel';
      panel.setAttribute('tabindex', '-1');

      // optional dismiss button
      if (dismissible) {
        const btn = document.createElement('button');
        btn.className = 'li-dismiss';
        btn.setAttribute('aria-label', 'Dismiss loading');
        btn.innerHTML = '&times;';
        btn.addEventListener('click', () => loadingIndicator.hide());
        panel.appendChild(btn);
      }

      // spinner + text container
      const spinnerWrap = document.createElement('div');
      spinnerWrap.className = 'li-spinner';
      spinnerWrap.innerHTML = createSpinnerSVG(size, color);
      panel.appendChild(spinnerWrap);

      const t = document.createElement('div');
      t.className = 'li-text';
      t.textContent = text;
      panel.appendChild(t);

      if (subtext) {
        const st = document.createElement('div');
        st.className = 'li-subtext';
        st.textContent = subtext;
        panel.appendChild(st);
      }

      overlay.appendChild(panel);
      document.body.appendChild(overlay);

      // show animation
      // small timeout to allow insertion before toggling class
      requestAnimationFrame(() => panel.classList.add('show'));

      // prevent scroll
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';

      // dismiss handlers
      const onKey = (e) => {
        if (e.key === 'Escape' && dismissible) loadingIndicator.hide();
      };
      const onClickOutside = (ev) => {
        if (!dismissible) return;
        if (ev.target === overlay) loadingIndicator.hide();
      };

      overlay.__li_onKey = onKey;
      overlay.__li_onClickOutside = onClickOutside;
      if (dismissible) {
        window.addEventListener('keydown', onKey);
        overlay.addEventListener('click', onClickOutside);
      }
    },

    hide: () => {
      if (!overlay) return;
      try {
        const panel = overlay.querySelector('.li-panel');
        if (panel) panel.classList.remove('show');
        // small delay to allow animation to finish
        setTimeout(() => {
          if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
          overlay = null;
          // remove handlers
          if (styleEl && !document.querySelector('.li-overlay')) {
            // leave style as long as app is loaded; optionally remove
            // document.head.removeChild(styleEl);
            // styleEl = null;
          }
        }, 220);
      } finally {
        // restore scroll
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        // cleanup listeners if any
        if (overlay && overlay.__li_onKey) {
          window.removeEventListener('keydown', overlay.__li_onKey);
        }
        if (overlay && overlay.__li_onClickOutside) {
          overlay.removeEventListener('click', overlay.__li_onClickOutside);
        }
      }
    }
  };
})();

