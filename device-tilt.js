(() => {
  const compact = matchMedia('(max-width: 1024px)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const state = window.portfolioTilt = { enabled: false, received: false, x: 0, y: 0 };
  let beta = null, gamma = null;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'device-tilt-toggle';
  button.textContent = 'Enable motion';
  button.setAttribute('aria-pressed', 'false');
  document.body.append(button);
  const reset = () => { beta = gamma = null; state.x = state.y = 0; state.received = false; };
  const clamp = n => Math.max(-1, Math.min(1, n));
  const orient = event => {
    if (!state.enabled || !compact.matches || reduced.matches || document.hidden ||
        document.querySelector('#project-detail').open ||
        !Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
    if (beta === null) { beta = event.beta; gamma = event.gamma; }
    const x = clamp((event.gamma - gamma) / 25);
    const y = clamp((event.beta - beta) / 25);
    const angle = (screen.orientation?.angle ?? window.orientation ?? 0) * Math.PI / 180;
    state.x = x * Math.cos(angle) + y * Math.sin(angle);
    state.y = y * Math.cos(angle) - x * Math.sin(angle);
    state.received = true;
  };
  button.addEventListener('click', async () => {
    if (state.enabled) {
      state.enabled = false;
      window.removeEventListener('deviceorientation', orient);
      reset();
      button.textContent = 'Enable motion';
      button.setAttribute('aria-pressed', 'false');
      return;
    }
    try {
      const API = window.DeviceOrientationEvent;
      if (typeof API?.requestPermission === 'function' && await API.requestPermission() !== 'granted') {
        button.textContent = 'Motion not enabled — retry'; return;
      }
      reset(); state.enabled = true;
      window.addEventListener('deviceorientation', orient, { passive: true });
      button.textContent = 'Disable motion';
      button.setAttribute('aria-pressed', 'true');
    } catch { button.textContent = 'Motion unavailable — retry'; }
  });
  const sync = () => {
    button.hidden = !compact.matches || reduced.matches || !isSecureContext || !('DeviceOrientationEvent' in window);
    if (!compact.matches || reduced.matches) reset();
  };
  compact.addEventListener('change', sync);
  reduced.addEventListener('change', sync);
  window.addEventListener('orientationchange', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
  sync();
})();