const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function pointerTilt(x, y, rect) {
  if (!(rect.width > 0 && rect.height > 0)) return { x: 0, y: 0 };
  const nx = clamp((x - rect.left) / rect.width * 2 - 1, -1, 1);
  const ny = clamp((y - rect.top) / rect.height * 2 - 1, -1, 1);
  const distance = Math.min(1, Math.hypot(nx, ny));
  return { x: -ny * 8 * distance, y: nx * 8 * distance };
}

export function orientationTilt(beta, gamma, origin, angle = 0) {
  if (![beta, gamma, origin.beta, origin.gamma, angle].every(Number.isFinite)) return null;
  const radians = angle * Math.PI / 180;
  const dx = gamma - origin.gamma;
  const dy = beta - origin.beta;
  return {
    x: clamp(-(dy * Math.cos(radians) + dx * Math.sin(radians)) / 3, -8, 8),
    y: clamp((dx * Math.cos(radians) - dy * Math.sin(radians)) / 3, -8, 8),
  };
}

export function springStep(state, target, seconds) {
  let { position, velocity } = state;
  const dt = clamp(seconds, 0, 1 / 30);
  // Small integration steps keep damping stable after a dropped frame.
  for (let i = 0; i < 4; i++) {
    velocity += (140 * (target - position) - 20 * velocity) * dt / 4;
    position += velocity * dt / 4;
  }
  return { position, velocity };
}

export function mountPerspective(root, win = window) {
  const toggle = root.querySelector('#card-motion');
  const sensor = root.querySelector('#card-orientation');
  const status = root.querySelector('#card-motion-status');
  if (!toggle || !sensor || !status) return () => {};
  const media = win.matchMedia('(prefers-reduced-motion: reduce)');
  const entries = [...root.querySelectorAll('.project-card')].map(card => {
    const wrapper = root.ownerDocument.createElement('div');
    wrapper.className = 'perspective-stage';
    card.before(wrapper);
    wrapper.append(card);
    card.classList.add('perspective-card');
    return { card, wrapper, visible: true, target: { x: 0, y: 0 },
      x: { position: 0, velocity: 0 }, y: { position: 0, velocity: 0 }, last: null };
  });
  if (!entries.length) return () => {};
  let paused = false, frame = 0, lastTime = 0, sensorOn = false;
  let origin = null, timer = 0, generation = 0, disposed = false;
  const removers = [];
  const enabled = () => !paused && !media.matches && !root.ownerDocument.hidden && !disposed;
  const on = (target, type, callback) => {
    target.addEventListener(type, callback);
    removers.push(() => target.removeEventListener(type, callback));
  };
  const paint = entry => {
    entry.card.style.setProperty('--card-pitch', `${entry.x.position.toFixed(3)}deg`);
    entry.card.style.setProperty('--card-roll', `${entry.y.position.toFixed(3)}deg`);
    entry.card.style.setProperty('--glare-x', `${50 - entry.y.position * 4}%`);
    entry.card.style.setProperty('--glare-y', `${50 + entry.x.position * 4}%`);
    entry.card.style.setProperty('--glare-opacity', `${Math.min(.24, Math.hypot(entry.x.position, entry.y.position) / 40)}`);
  };
  const reset = entry => {
    entry.x = { position: 0, velocity: 0 };
    entry.y = { position: 0, velocity: 0 };
    entry.target = { x: 0, y: 0 };
    entry.last = null;
    paint(entry);
  };
  const animate = time => {
    frame = 0;
    if (!enabled()) return;
    const dt = lastTime ? (time - lastTime) / 1000 : 1 / 60;
    lastTime = time;
    let moving = false;
    entries.filter(entry => entry.visible).forEach(entry => {
      entry.x = springStep(entry.x, entry.target.x, dt);
      entry.y = springStep(entry.y, entry.target.y, dt);
      const unsettled = ['x', 'y'].some(axis =>
        Math.abs(entry[axis].position - entry.target[axis]) > .005 || Math.abs(entry[axis].velocity) > .005);
      if (!unsettled) {
        entry.x = { position: entry.target.x, velocity: 0 };
        entry.y = { position: entry.target.y, velocity: 0 };
      }
      paint(entry);
      moving ||= unsettled;
    });
    if (moving) frame = win.requestAnimationFrame(animate);
    else lastTime = 0;
  };
  const wake = () => {
    if (enabled() && !frame) frame = win.requestAnimationFrame(animate);
  };
  const stopSensor = () => {
    generation++;
    sensorOn = false;
    origin = null;
    win.clearTimeout(timer);
    win.removeEventListener('deviceorientation', orientation);
    sensor.setAttribute('aria-pressed', 'false');
    sensor.textContent = 'Enable device tilt';
  };
  const stop = () => {
    win.cancelAnimationFrame(frame);
    frame = lastTime = 0;
    stopSensor();
    entries.forEach(reset);
  };
  function orientation(event) {
    if (!enabled() || !sensorOn || !Number.isFinite(event.beta) || !Number.isFinite(event.gamma)) return;
    win.clearTimeout(timer);
    origin ||= { beta: event.beta, gamma: event.gamma };
    const target = orientationTilt(event.beta, event.gamma, origin, win.screen.orientation?.angle || 0);
    entries.filter(entry => entry.visible).forEach(entry => { entry.target = target; });
    status.textContent = 'Device tilt enabled. Move your device gently; tap again to stop.';
    wake();
  }
  entries.forEach(entry => {
    on(entry.wrapper, 'pointermove', event => {
      if (!enabled() || sensorOn || event.pointerType === 'touch' || !entry.visible) return;
      const target = pointerTilt(event.clientX, event.clientY, entry.wrapper.getBoundingClientRect());
      if (entry.last) {
        const dt = Math.max(.008, (event.timeStamp - entry.last.time) / 1000);
        // Pointer velocity gives a bounded inertial kick, in addition to position.
        entry.x.velocity = clamp(entry.x.velocity + clamp((target.x - entry.last.x) / dt * .04, -4, 4), -60, 60);
        entry.y.velocity = clamp(entry.y.velocity + clamp((target.y - entry.last.y) / dt * .04, -4, 4), -60, 60);
      }
      entry.last = { ...target, time: event.timeStamp };
      entry.target = target;
      wake();
    });
    const release = () => { entry.target = { x: 0, y: 0 }; entry.last = null; wake(); };
    on(entry.wrapper, 'pointerleave', release);
    on(entry.wrapper, 'pointercancel', release);
  });
  const refresh = () => {
    stop();
    toggle.disabled = media.matches;
    toggle.setAttribute('aria-pressed', String(paused));
    toggle.textContent = paused ? 'Resume card motion' : 'Pause card motion';
    sensor.disabled = paused || media.matches || !win.DeviceOrientationEvent || !win.isSecureContext;
    status.textContent = media.matches ? 'Card motion is off to respect reduced motion.' :
      paused ? 'Card motion paused.' : 'Move a pointer over a card. Device tilt is optional.';
  };
  on(toggle, 'click', () => { paused = !paused; refresh(); });
  on(sensor, 'click', async () => {
    if (sensorOn) { refresh(); return; }
    const attempt = ++generation;
    sensor.disabled = true;
    try {
      const API = win.DeviceOrientationEvent;
      const permission = typeof API.requestPermission === 'function' ? await API.requestPermission() : 'granted';
      if (disposed || attempt !== generation || !enabled()) return;
      if (permission !== 'granted') { status.textContent = 'Device tilt permission was denied. Pointer controls remain available.'; return; }
      sensorOn = true;
      sensor.setAttribute('aria-pressed', 'true');
      sensor.textContent = 'Disable device tilt';
      status.textContent = 'Waiting for device motion…';
      win.addEventListener('deviceorientation', orientation);
      timer = win.setTimeout(() => {
        stopSensor();
        status.textContent = 'No orientation sensor detected. Pointer controls remain available.';
      }, 3000);
    } catch {
      if (attempt === generation) status.textContent = 'Device tilt unavailable. Pointer controls remain available.';
    } finally {
      if (!disposed) sensor.disabled = !enabled() || !win.DeviceOrientationEvent || !win.isSecureContext;
    }
  });
  on(media, 'change', refresh);
  on(root.ownerDocument, 'visibilitychange', refresh);
  on(win, 'pagehide', stop);
  on(win, 'pageshow', refresh);
  on(win, 'orientationchange', () => { origin = null; entries.forEach(reset); });
  const observer = win.IntersectionObserver ? new win.IntersectionObserver(records => {
    records.forEach(record => {
      const entry = entries.find(item => item.wrapper === record.target);
      entry.visible = record.isIntersecting;
      if (!entry.visible) reset(entry);
    });
  }) : null;
  entries.forEach(entry => observer?.observe(entry.wrapper));
  toggle.hidden = sensor.hidden = false;
  refresh();
  return () => {
    disposed = true;
    stop();
    observer?.disconnect();
    removers.forEach(remove => remove());
    entries.forEach(({ card, wrapper }) => {
      card.classList.remove('perspective-card');
      wrapper.replaceWith(card);
    });
  };
}

if (typeof document !== 'undefined') {
  const root = document.querySelector('#work');
  if (root) mountPerspective(root);
}
