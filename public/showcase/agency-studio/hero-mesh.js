import { ParticleMesh, canvasScale } from './mesh-model.js';
const hero = document.querySelector('.hero');
const canvas = document.getElementById('heroMeshCanvas');
const control = document.getElementById('mesh-motion');
if (hero && canvas && control) {
  const context = canvas.getContext('2d');
  if (!context) { canvas.hidden = true; control.hidden = true; }
  else {
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let model = null, frameId = null, lastStamp = null, pointer = null;
    let visible = !('IntersectionObserver' in window), userPaused = false;
    const shouldRun = () => visible && !document.hidden && !userPaused && !motion.matches;
    function draw() {
      if (!model) return;
      context.clearRect(0, 0, model.width, model.height);
      context.lineWidth = 1;
      for (const edge of model.edges) {
        const a = model.nodes[edge.a], b = model.nodes[edge.b];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (distance > 230) continue;
        context.strokeStyle = `rgba(192,132,252,${0.26 * (1 - distance / 260)})`;
        context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.stroke();
      }
      context.fillStyle = 'rgba(216,180,254,0.55)';
      model.nodes.forEach(node => {
        context.beginPath(); context.arc(node.x, node.y, 2, 0, Math.PI * 2); context.fill();
      });
    }
    function frame(now) {
      frameId = null;
      if (!shouldRun()) return;
      const decay = pointer ? Math.exp(-Math.max(0, now - pointer.time) / 170) : 0;
      const cursor = pointer ? { ...pointer, vx: pointer.vx * decay, vy: pointer.vy * decay } : null;
      if (lastStamp !== null) model.advance((now - lastStamp) / 1000, cursor);
      lastStamp = now; draw(); frameId = requestAnimationFrame(frame);
    }
    function sync() {
      control.disabled = motion.matches;
      control.setAttribute('aria-pressed', String(userPaused || motion.matches));
      control.textContent = motion.matches ? 'Static mesh · reduced motion' : userPaused ? 'Resume background motion' : 'Pause background motion';
      if (shouldRun()) { if (frameId === null) { lastStamp = null; frameId = requestAnimationFrame(frame); } }
      else { cancelAnimationFrame(frameId); frameId = null; lastStamp = null; pointer = null; draw(); }
    }
    function resize() {
      const bounds = hero.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      if (model && Math.abs(model.width - bounds.width) < 0.5 && Math.abs(model.height - bounds.height) < 0.5) return;
      model = new ParticleMesh(bounds.width, bounds.height);
      const scale = canvasScale(bounds.width, bounds.height, window.devicePixelRatio);
      canvas.width = Math.floor(bounds.width * scale); canvas.height = Math.floor(bounds.height * scale);
      context.setTransform(scale, 0, 0, scale, 0, 0);
      lastStamp = null; pointer = null; draw(); sync();
    }
    hero.addEventListener('pointermove', event => {
      if (event.pointerType === 'touch' || !shouldRun()) return;
      const bounds = hero.getBoundingClientRect(), now = performance.now();
      const x = event.clientX - bounds.left, y = event.clientY - bounds.top;
      const dt = pointer ? Math.max(0.016, (now - pointer.time) / 1000) : 1;
      pointer = { x, y, vx: pointer ? Math.max(-1200, Math.min(1200, (x - pointer.x) / dt)) : 0,
        vy: pointer ? Math.max(-1200, Math.min(1200, (y - pointer.y) / dt)) : 0, time: now };
    });
    hero.addEventListener('pointerleave', () => { pointer = null; });
    window.addEventListener('blur', () => { pointer = null; });
    control.addEventListener('click', () => { userPaused = !userPaused; sync(); });
    motion.addEventListener('change', sync);
    document.addEventListener('visibilitychange', sync);
    if ('IntersectionObserver' in window) new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }).observe(hero);
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(hero);
    window.addEventListener('resize', resize);
    resize();
  }
}
