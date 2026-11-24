(() => {
  const compact = matchMedia('(max-width: 1024px), (hover: none) and (pointer: coarse)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const state = window.portfolioTilt = { enabled: false, received: false, x: 0, y: 0, shakeTime: -10000, shakePower: 0 };
  let beta = null, gamma = null, lastAcceleration = null, lastShake = -10000;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'device-tilt-toggle';
  button.textContent = 'Enable motion';
  button.setAttribute('aria-pressed', 'false');
  document.body.append(button);
  const reset = () => { beta = gamma = null; state.x = state.y = 0; state.received = false; state.shakePower = 0; lastAcceleration = null; };
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
  const shake = event => {
    if (!state.enabled || !compact.matches || reduced.matches || document.hidden ||
        document.querySelector('#project-detail').open) return;
    const acceleration = event.acceleration || event.accelerationIncludingGravity;
    if (!acceleration || ![acceleration.x, acceleration.y, acceleration.z].every(Number.isFinite)) return;
    const sample = [acceleration.x, acceleration.y, acceleration.z];
    const previous = lastAcceleration;
    lastAcceleration = sample;
    if (!previous) return;
    const change = Math.hypot(...sample.map((value, index) => value - previous[index]));
    const now = performance.now();
    if (change < 3 || now - lastShake < 280) return;
    lastShake = now;
    state.shakeTime = now;
    state.shakePower = Math.min(1, (change - 3) / 9 + .25);
  };
  button.addEventListener('click', async () => {
    if (state.enabled) {
      state.enabled = false;
      window.removeEventListener('deviceorientation', orient);
      window.removeEventListener('devicemotion', shake);
      reset();
      button.textContent = 'Enable motion';
      button.setAttribute('aria-pressed', 'false');
      return;
    }
    try {
      // Request both permissions directly from this user gesture on iOS.
      const orientationAPI = window.DeviceOrientationEvent;
      const motionAPI = window.DeviceMotionEvent;
      const [orientationPermission, motionPermission] = await Promise.allSettled([
        typeof orientationAPI?.requestPermission === 'function' ? orientationAPI.requestPermission() : Promise.resolve('granted'),
        typeof motionAPI?.requestPermission === 'function' ? motionAPI.requestPermission() : Promise.resolve('granted')
      ]);
      const orientationGranted = orientationPermission.status === 'fulfilled' && orientationPermission.value === 'granted';
      const motionGranted = motionPermission.status === 'fulfilled' && motionPermission.value === 'granted';
      if (!orientationGranted && !motionGranted) {
        button.textContent = 'Motion not enabled — retry'; return;
      }
      reset(); state.enabled = true;
      if (orientationGranted) window.addEventListener('deviceorientation', orient, { passive: true });
      if (motionGranted) window.addEventListener('devicemotion', shake, { passive: true });
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