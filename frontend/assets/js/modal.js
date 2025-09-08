// modal.js
// default export: showStatusModal(status, msg, opts = {})
//
// status: 'success' | 'error' | 'info' (string)
// msg: string message
// opts:
//   - timeout: ms to auto-dismiss (default 1600). Set 0 or null to disable auto-dismiss.
//   - dismissible: boolean (click or ESC will close) default true
//   - action: { label, callback } optional action button

export default function showStatusModal(status = 'info', msg = '', opts = {}) {
  const { timeout = 1600, dismissible = true, action = null } = opts;

  // create styles if not present
  let style = document.getElementById('status-modal-styles');
  if (!style) {
    style = document.createElement('style');
    style.id = 'status-modal-styles';
    style.textContent = `
      .sm-overlay {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(7,10,15,0.45);
        backdrop-filter: blur(4px);
        z-index: 110000;
        -webkit-tap-highlight-color: transparent;
      }
      .sm-card {
        width: min(460px, 92%);
        max-width: 460px;
        background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(250,250,250,0.98));
        border-radius: 12px;
        padding: 20px 22px;
        box-shadow: 0 18px 40px rgba(2,6,23,0.36);
        display: flex;
        gap: 14px;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        text-align: center;
        transform: translateY(10px) scale(.98);
        opacity: 0;
        transition: transform 300ms cubic-bezier(.2,.9,.3,1), opacity 300ms ease;
      }
      .sm-card.show { transform: translateY(0) scale(1); opacity: 1; }
      .sm-icon {
        width: 92px;
        height: 92px;
        display:block;
      }
      .sm-title {
        font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto;
        font-weight: 700;
        color: #0f172a;
        font-size: 20px;
        margin-top: 6px;
      }
      .sm-msg {
        font-size: 14px;
        color: #374151;
        margin-top: 6px;
      }
      .sm-action {
        margin-top: 12px;
        display:flex;
        gap:8px;
      }
      .sm-btn {
        padding: 8px 12px;
        border-radius: 8px;
        border: none;
        cursor: pointer;
        font-weight: 600;
        font-size: 14px;
      }
      .sm-btn.primary { background: var(--sm-accent, #0b74ff); color: white; }
      .sm-btn.ghost { background: transparent; color: #374151; border: 1px solid rgba(15,23,42,0.06); }
      /* icon animations */
      .sm-icon .sm-circle { transform-origin: center; opacity: 0; transform: scale(0.6); animation: sm-scale 320ms forwards; }
      .sm-icon .sm-check, .sm-icon .sm-x { stroke-dasharray: 120; stroke-dashoffset: 120; stroke-linecap: round; animation: sm-draw 520ms 180ms forwards; }
      @keyframes sm-scale { to { transform: scale(1); opacity: 1; } }
      @keyframes sm-draw { to { stroke-dashoffset: 0; } }
    `;
    document.head.appendChild(style);
  }

  // colors for different statuses
  const palette = {
    success: { bg: '#ECFDF5', accent: '#10B981', text: 'Success' },
    error: { bg: '#FEF2F2', accent: '#EF4444', text: 'Failed' },
    info: { bg: '#EFF6FF', accent: '#0B74FF', text: 'Info' }
  };
  const p = palette[status] || palette.info;

  // base elements
  const overlay = document.createElement('div');
  overlay.className = 'sm-overlay';
  overlay.setAttribute('role', 'alert');
  overlay.setAttribute('aria-live', 'polite');

  const card = document.createElement('div');
  card.className = 'sm-card';
  card.style.setProperty('--sm-accent', p.accent);

  // SVG icon
  let svg = '';
  if (status === 'success') {
    svg = `
      <svg class="sm-icon" viewBox="0 0 100 100" aria-hidden="true">
        <circle class="sm-circle" cx="50" cy="50" r="44" fill="${p.bg}" stroke="${p.accent}" stroke-width="2.5"/>
        <path class="sm-check" d="M32 52 L45 64 L70 38" fill="none" stroke="#fff" stroke-width="6" transform="translate(0,0)"/>
        <circle cx="50" cy="50" r="44" fill="none" stroke="${p.accent}" stroke-width="2" opacity="0.06"/>
      </svg>
    `;
  } else if (status === 'error') {
    svg = `
      <svg class="sm-icon" viewBox="0 0 100 100" aria-hidden="true">
        <circle class="sm-circle" cx="50" cy="50" r="44" fill="${p.bg}" stroke="${p.accent}" stroke-width="2.5"/>
        <path class="sm-x" d="M36 36 L64 64 M64 36 L36 64" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round"/>
        <circle cx="50" cy="50" r="44" fill="none" stroke="${p.accent}" stroke-width="2" opacity="0.06"/>
      </svg>
    `;
  } else {
    svg = `
      <svg class="sm-icon" viewBox="0 0 100 100" aria-hidden="true">
        <circle class="sm-circle" cx="50" cy="50" r="44" fill="${p.bg}" stroke="${p.accent}" stroke-width="2.5"/>
        <circle cx="50" cy="36" r="6" fill="#fff" />
        <rect x="46" y="48" width="8" height="20" rx="4" fill="#fff" />
        <circle cx="50" cy="50" r="44" fill="none" stroke="${p.accent}" stroke-width="2" opacity="0.06"/>
      </svg>
    `;
  }

  card.innerHTML = svg;
  const title = document.createElement('div');
  title.className = 'sm-title';
  title.textContent = p.text;

  const message = document.createElement('div');
  message.className = 'sm-msg';
  message.textContent = msg || '';

  card.appendChild(title);
  card.appendChild(message);

  // optional action
  if (action && action.label && typeof action.callback === 'function') {
    const actionWrap = document.createElement('div');
    actionWrap.className = 'sm-action';
    const actionBtn = document.createElement('button');
    actionBtn.className = 'sm-btn primary';
    actionBtn.type = 'button';
    actionBtn.textContent = action.label;
    actionBtn.addEventListener('click', (e) => {
      try { action.callback(e); } catch (err) { console.error(err); }
      // close after action
      close(true);
    });
    actionWrap.appendChild(actionBtn);

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'sm-btn ghost';
    cancelBtn.type = 'button';
    cancelBtn.textContent = 'Close';
    cancelBtn.addEventListener('click', () => close(true));
    actionWrap.appendChild(cancelBtn);

    card.appendChild(actionWrap);
  }

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // animate in
  requestAnimationFrame(() => {
    card.classList.add('show');
  });

  // accessibility focus
  card.setAttribute('tabindex', '-1');
  card.focus({ preventScroll: true });

  // dismissal handling
  let removed = false;
  const close = (byUser = false) => {
    if (removed) return;
    removed = true;
    card.classList.remove('show');
    overlay.style.transition = 'opacity 240ms ease';
    overlay.style.opacity = '0';
    setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 260);
    if (dismissible) {
      window.removeEventListener('keydown', onKey);
      overlay.removeEventListener('click', onOverlayClick);
    }
  };

  const onKey = (e) => {
    if (e.key === 'Escape' && dismissible) close(true);
  };

  const onOverlayClick = (ev) => {
    if (dismissible && ev.target === overlay) close(true);
  };

  if (dismissible) {
    window.addEventListener('keydown', onKey);
    overlay.addEventListener('click', onOverlayClick);
  }

  // auto-dismiss
  if (timeout && timeout > 0) {
    setTimeout(() => close(false), timeout);
  }
}

