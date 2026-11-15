import { controls, stageFrame, project, canvasSize } from './stage-model.js';

const panel = document.querySelector('#stage-lighting');
const canvas = panel.querySelector('canvas');
const context = canvas.getContext('2d');
const play = panel.querySelector('#stage-play');
const status = panel.querySelector('#stage-status');
const readout = panel.querySelector('#stage-dmx');
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
const fields = [...panel.querySelectorAll('[data-stage-control]')];
let settings = controls();
let elapsed = 0, last = null, raf = null, visible = false, running = true, lastReadout = -1;

function readControls() {
  const values = Object.fromEntries(fields.map(field => [field.dataset.stageControl,
    field.type === 'checkbox' ? field.checked : field.value]));
  settings = controls(values);
  fields.forEach(field => {
    const output = panel.querySelector(`[data-stage-value="${field.dataset.stageControl}"]`);
    if (output) output.textContent = field.value;
  });
  draw();
}

function draw() {
  if (!context) return;
  const w = canvas.width, h = canvas.height;
  const frame = stageFrame(elapsed, settings);
  const point = p => project(p, w, h);
  context.clearRect(0, 0, w, h);
  context.fillStyle = '#090817'; context.fillRect(0, 0, w, h);
  // Perspective floor grid and overhead lighting truss.
  context.strokeStyle = '#27243e'; context.lineWidth = Math.max(1, w / 800);
  for (let x = -4; x <= 4; x++) line(point({ x, y: 0, z: 0 }), point({ x, y: 0, z: 7 }));
  for (let z = 0; z <= 7; z++) line(point({ x: -4, y: 0, z }), point({ x: 4, y: 0, z }));
  context.strokeStyle = '#71658d'; context.lineWidth = w / 100;
  line(point({ x: -3.3, y: 3.6, z: 1 }), point({ x: 3.3, y: 3.6, z: 1 }));
  for (const head of frame.heads) {
    const from = point(head.source), to = point(head.target);
    const radius = w * 0.032;
    const gradient = context.createLinearGradient(from.x, from.y, to.x, to.y);
    gradient.addColorStop(0, `hsla(${head.hue},100%,70%,${head.dimmer * 0.65})`);
    gradient.addColorStop(1, `hsla(${head.hue},100%,60%,${head.dimmer * 0.05})`);
    context.fillStyle = gradient;
    context.beginPath(); context.moveTo(from.x, from.y);
    context.lineTo(to.x - radius, to.y); context.lineTo(to.x + radius, to.y); context.closePath(); context.fill();
    context.fillStyle = `hsla(${head.hue},100%,65%,${head.dimmer * 0.6})`;
    context.beginPath(); context.ellipse(to.x, to.y, radius, radius / 4, 0, 0, Math.PI * 2); context.fill();
    context.fillStyle = `hsl(${head.hue},70%,${15 + head.dimmer * 60}%)`;
    context.fillRect(from.x - w / 150, from.y - w / 170, w / 75, w / 80);
    if (settings.lasers) {
      context.strokeStyle = `hsla(${head.hue},100%,70%,${head.dimmer * 0.8})`;
      context.lineWidth = Math.max(1, w / 900);
      for (let ray = -1; ray <= 1; ray++) line(from, point({ ...head.target, x: head.target.x + ray * 0.35 }));
    }
  }
  if (lastReadout < 0 || Math.abs(elapsed - lastReadout) >= 0.25) {
    readout.textContent = frame.heads.map((head, i) =>
      `HEAD ${i + 1} · CH ${String(i * 6 + 1).padStart(3, '0')}–${String(i * 6 + 6).padStart(3, '0')} · ${head.channels.map(v => String(v).padStart(3, '0')).join(' ')}`).join('\n');
    lastReadout = elapsed;
  }
}

function line(a, b) {
  context.beginPath(); context.moveTo(a.x, a.y); context.lineTo(b.x, b.y); context.stroke();
}
function resize() {
  const size = canvasSize(canvas.clientWidth, window.devicePixelRatio);
  canvas.width = size.width; canvas.height = size.height; lastReadout = -1; draw();
}
function tick(timestamp) {
  raf = null;
  if (last !== null) elapsed += Math.min(0.1, Math.max(0, (timestamp - last) / 1000));
  last = timestamp; draw(); raf = requestAnimationFrame(tick);
}
function sync() {
  if (raf !== null) cancelAnimationFrame(raf);
  raf = null; last = null;
  const active = context && running && visible && !document.hidden && !motion.matches;
  play.textContent = running ? 'Pause lighting' : 'Play lighting';
  play.setAttribute('aria-pressed', String(running));
  play.disabled = !context || motion.matches;
  status.textContent = !context ? 'Canvas unavailable. Lighting preview cannot run in this browser.'
    : motion.matches ? 'Static preview · reduced motion preference enabled.'
      : !running ? 'Paused · adjust controls or resume the sequence.'
        : !active ? 'Preview suspended while offscreen or in a hidden tab.' : 'Playing · tempo clock, no audio or hardware connection.';
  draw();
  if (active) raf = requestAnimationFrame(tick);
}
fields.forEach(field => field.addEventListener('input', () => { lastReadout = -1; readControls(); }));
play.addEventListener('click', () => { running = !running; sync(); });
panel.querySelector('#stage-reset').addEventListener('click', () => { elapsed = 0; last = null; lastReadout = -1; draw(); });
document.addEventListener('visibilitychange', sync);
motion.addEventListener('change', sync);
window.addEventListener('pagehide', () => { running = false; sync(); });
if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
else window.addEventListener('resize', resize);
if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
  visible = entries[0].isIntersecting; sync();
}, { threshold: 0.05 }).observe(panel);
else visible = true;
readControls(); resize(); sync();
