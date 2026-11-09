import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { ParticleMesh, canvasScale } from './mesh-model.js';

function fixture(reduced = false, contextAvailable = true) {
  const frames = new Map(); let sequence = 0, observe;
  const events = object => Object.assign(object, { events: {}, addEventListener(type, handler) { this.events[type] = handler; } });
  const context = Object.fromEntries(['clearRect', 'beginPath', 'moveTo', 'lineTo', 'stroke', 'arc', 'fill', 'setTransform'].map(key => [key, () => {}]));
  const hero = events({ getBoundingClientRect: () => ({ width: 900, height: 450, left: 0, top: 0 }) });
  const canvas = { getContext: () => contextAvailable ? context : null };
  const control = events({ setAttribute(key, value) { this[key] = value; } });
  const motion = events({ matches: reduced });
  class Observer { constructor(fn) { observe = fn; } observe() {} }
  const window = events({ devicePixelRatio: 3, matchMedia: () => motion, IntersectionObserver: Observer });
  const document = events({ hidden: false, querySelector: () => hero, getElementById: key => key === 'heroMeshCanvas' ? canvas : control });
  const source = readFileSync(new URL('./hero-mesh.js', import.meta.url), 'utf8').replace(/^import[^\n]+\n/, '');
  runInNewContext(source, { ParticleMesh, canvasScale, window, document, IntersectionObserver: Observer, performance: { now: () => 100 },
    requestAnimationFrame(fn) { frames.set(++sequence, fn); return sequence; }, cancelAnimationFrame(id) { frames.delete(id); } });
  return { frames, control, motion, document, canvas, window, observe: value => observe([{ isIntersecting: value }]),
    tick(now) { const batch = [...frames.values()]; frames.clear(); batch.forEach(fn => fn(now)); } };
}
test('offscreen hero starts static and schedules exactly one loop when visible', () => {
  const ui = fixture(); assert.equal(ui.frames.size, 0);
  ui.observe(true); ui.observe(true); assert.equal(ui.frames.size, 1);
  ui.tick(1000); ui.tick(1016); assert.equal(ui.frames.size, 1);
  ui.observe(false); assert.equal(ui.frames.size, 0);
});
test('explicit pause and hidden tab stop work; resume does not stack RAF loops', () => {
  const ui = fixture(); ui.observe(true); ui.control.events.click(); assert.equal(ui.frames.size, 0);
  ui.control.events.click(); assert.equal(ui.frames.size, 1);
  ui.document.hidden = true; ui.document.events.visibilitychange(); assert.equal(ui.frames.size, 0);
  ui.document.hidden = false; ui.document.events.visibilitychange(); assert.equal(ui.frames.size, 1);
});
test('reduced motion renders a static mesh and reacts to preference changes', () => {
  const ui = fixture(true); ui.observe(true);
  assert.equal(ui.frames.size, 0); assert.equal(ui.control.disabled, true);
  ui.motion.matches = false; ui.motion.events.change(); assert.equal(ui.frames.size, 1);
  ui.motion.matches = true; ui.motion.events.change(); assert.equal(ui.frames.size, 0);
});
test('no-canvas fallback hides decorative controls without scheduling animation', () => {
  const ui = fixture(false, false);
  assert.equal(ui.canvas.hidden, true); assert.equal(ui.control.hidden, true); assert.equal(ui.frames.size, 0);
});
