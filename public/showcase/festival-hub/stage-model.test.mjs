import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { controls, stageFrame, project, canvasSize } from './stage-model.js';

test('controls reject non-finite values and clamp inputs to console bounds', () => {
  assert.deepEqual(controls({ bpm: Infinity, hue: -20, intensity: 1000, sweep: NaN, pattern: 'bad' }),
    { bpm: 120, hue: 0, intensity: 100, sweep: 55, pattern: 'sweep', lasers: false, pulse: false });
  assert.equal(controls({ bpm: 1, sweep: 200 }).bpm, 60);
  assert.equal(controls({ sweep: 200 }).sweep, 80);
});

test('tempo controls the deterministic beat clock and four-beat pan sequence', () => {
  assert.equal(stageFrame(1, { bpm: 120 }).beat, 2);
  assert.equal(stageFrame(1, { bpm: 60 }).beat, 1);
  assert.deepEqual(stageFrame(1, { bpm: 120 }).heads.map(h => h.target.x),
    stageFrame(2, { bpm: 60 }).heads.map(h => h.target.x));
  assert.deepEqual(stageFrame(-1).heads, stageFrame(NaN).heads);
});

test('all patterns keep positions, projections and DMX values finite and bounded', () => {
  for (const pattern of ['sweep', 'chase', 'fan']) for (let t = 0; t < 100; t += 0.19) {
    const frame = stageFrame(t, { bpm: 180, intensity: 100, sweep: 80, pulse: true, lasers: true, pattern });
    assert.equal(frame.heads.length, 6);
    for (const head of frame.heads) {
      assert.ok(head.dimmer >= 0 && head.dimmer <= 1);
      assert.ok(Math.abs(head.target.x) <= 4.1);
      for (const channel of head.channels) assert.ok(Number.isInteger(channel) && channel >= 0 && channel <= 255);
      for (const p of [head.source, head.target]) {
        const screen = project(p, 1200, 624);
        assert.ok(Number.isFinite(screen.x) && Number.isFinite(screen.y));
      }
    }
  }
});

test('master zero extinguishes every beam and chase selects one bright head', () => {
  assert.ok(stageFrame(12, { intensity: 0 }).heads.every(h => h.dimmer === 0));
  const frame = stageFrame(0, { intensity: 100, pattern: 'chase' });
  assert.equal(frame.heads.filter(h => h.dimmer === 1).length, 1);
  assert.equal(frame.heads.filter(h => h.dimmer === 0.15).length, 5);
});

test('fan is symmetric and strobe caps to two cycles per second at fast tempos', () => {
  const fan = stageFrame(0, { pattern: 'fan' });
  assert.equal(fan.heads[0].target.x, -fan.heads[5].target.x);
  const bright = t => stageFrame(t, { bpm: 180, pulse: true, intensity: 100 }).heads[0].dimmer;
  assert.equal(bright(0), 1);
  assert.equal(bright(0.2), 0.12);
  assert.equal(bright(0.5), 1);
});

test('canvas backing store caps width, DPR and total pixel cost', () => {
  assert.deepEqual(canvasSize(10000, 5), { width: 2400, height: 1248 });
  assert.deepEqual(canvasSize(360, 1), { width: 360, height: 187 });
  assert.deepEqual(canvasSize(NaN, Infinity), { width: 800, height: 416 });
});

function lifecycle({ reduced = false, graphics = true } = {}) {
  const frames = new Map(), events = {}, buttons = {}, mediaEvents = {};
  let serial = 0, intersection;
  const context = new Proxy({}, { get: (_, key) => key === 'createLinearGradient'
    ? () => ({ addColorStop() {} }) : () => {} });
  const canvas = { width: 800, height: 416, clientWidth: 800, getContext: () => graphics ? context : null };
  const status = {}, readout = {};
  const button = id => buttons[id] ??= { addEventListener(type, fn) { this[type] = fn; }, setAttribute() {} };
  const panel = { querySelectorAll: () => [], querySelector: selector => selector === 'canvas' ? canvas
    : selector === '#stage-status' ? status : selector === '#stage-dmx' ? readout
      : selector.startsWith('[data-') ? null : button(selector) };
  const document = { hidden: false, querySelector: () => panel,
    addEventListener: (type, fn) => { events[type] = fn; } };
  const media = { matches: reduced, addEventListener: (type, fn) => { mediaEvents[type] = fn; } };
  const window = { devicePixelRatio: 1, matchMedia: () => media, addEventListener() {} };
  class IntersectionObserver { constructor(fn) { intersection = fn; } observe() {} }
  window.IntersectionObserver = IntersectionObserver;
  const source = readFileSync(new URL('./stage-lighting.js', import.meta.url), 'utf8').replace(/^import[^\n]+\n/, '');
  vm.runInNewContext(source, { controls, stageFrame, project, canvasSize, document, window,
    IntersectionObserver, requestAnimationFrame: fn => { frames.set(++serial, fn); return serial; },
    cancelAnimationFrame: id => frames.delete(id) });
  return { frames, status, readout, buttons, document, media, events, mediaEvents,
    visible: value => intersection([{ isIntersecting: value }]) };
}

test('visibility, pause/resume and reduced motion never stack animation loops', () => {
  const app = lifecycle();
  assert.equal(app.frames.size, 0);
  app.visible(true); assert.equal(app.frames.size, 1);
  app.visible(true); assert.equal(app.frames.size, 1);
  app.buttons['#stage-play'].click(); assert.equal(app.frames.size, 0);
  app.buttons['#stage-play'].click(); assert.equal(app.frames.size, 1);
  app.document.hidden = true; app.events.visibilitychange(); assert.equal(app.frames.size, 0);
  app.document.hidden = false; app.events.visibilitychange(); assert.equal(app.frames.size, 1);
  app.media.matches = true; app.mediaEvents.change(); assert.equal(app.frames.size, 0);
  assert.match(app.status.textContent, /reduced motion/);
  app.media.matches = false; app.mediaEvents.change(); assert.equal(app.frames.size, 1);
  app.visible(false); assert.equal(app.frames.size, 0);
});

test('graphics fallback disables play and leaves an actionable status', () => {
  const app = lifecycle({ graphics: false });
  app.visible(true);
  assert.equal(app.frames.size, 0);
  assert.equal(app.buttons['#stage-play'].disabled, true);
  assert.match(app.status.textContent, /Canvas unavailable/);
});
