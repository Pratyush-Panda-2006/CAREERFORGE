import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pointerTilt, orientationTilt, springStep, mountPerspective } from './perspective.js';

test('pointer target is neutral at center and bounded outside the card', () => {
  const rect = { left: 10, top: 20, width: 200, height: 100 };
  assert.equal(Math.abs(pointerTilt(110, 70, rect).x), 0);
  assert.equal(pointerTilt(110, 70, rect).y, 0);
  assert.deepEqual(pointerTilt(10000, -10000, rect), { x: 8, y: 8 });
  assert.deepEqual(pointerTilt(0, 0, { ...rect, width: 0 }), { x: 0, y: 0 });
});
test('pointer distance produces a gentle nonlinear tilt near the center', () => {
  assert.equal(pointerTilt(75, 50, { left: 0, top: 0, width: 100, height: 100 }).y, 2);
});
test('spring converges and returns to rest at multiple refresh rates', () => {
  for (const hz of [30, 60, 120]) {
    let state = { position: 0, velocity: 0 };
    for (let i = 0; i < hz * 3; i++) state = springStep(state, 8, 1 / hz);
    assert.ok(Math.abs(state.position - 8) < .001);
    for (let i = 0; i < hz * 3; i++) state = springStep(state, 0, 1 / hz);
    assert.ok(Math.abs(state.position) < .001);
    assert.ok(Math.abs(state.velocity) < .001);
  }
});
test('dropped frames do not destabilize a released inertial spring', () => {
  let state = { position: 8, velocity: 120 };
  for (let i = 0; i < 240; i++) state = springStep(state, 0, i % 5 ? 1 / 60 : 10);
  assert.ok(Number.isFinite(state.position));
  assert.ok(Math.abs(state.position) < .001);
});
test('orientation is calibrated, bounded, and rejects unavailable readings', () => {
  const origin = { beta: 45, gamma: 10 };
  assert.equal(Math.abs(orientationTilt(45, 10, origin).x), 0);
  assert.deepEqual(orientationTilt(90, 90, origin), { x: -8, y: 8 });
  assert.equal(orientationTilt(null, 0, origin), null);
  assert.equal(orientationTilt(0, NaN, origin), null);
});
test('landscape orientation rotates the tilt axes', () => {
  const result = orientationTilt(0, 12, { beta: 0, gamma: 0 }, 90);
  assert.equal(result.x, -4);
  assert.ok(Math.abs(result.y) < .0001);
});

function fixture() {
  class Element extends EventTarget {
    values = new Map();
    style = { setProperty: (key, value) => this.values.set(key, value) };
    classList = { add() {}, remove() {} };
    setAttribute(key, value) { this.values.set(key, value); }
    before(wrapper) { this.wrapper = wrapper; }
    append() {}
    replaceWith() {}
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 100 }; }
  }
  const card = new Element(), toggle = new Element(), sensor = new Element(), status = new Element();
  const doc = new EventTarget();
  doc.createElement = () => new Element();
  doc.hidden = false;
  const root = {
    ownerDocument: doc,
    querySelector: selector => ({ '#card-motion': toggle, '#card-orientation': sensor, '#card-motion-status': status })[selector],
    querySelectorAll: () => [card],
  };
  const media = new EventTarget();
  media.matches = false;
  const frames = new Map(), timers = new Map();
  let id = 0;
  const win = Object.assign(new EventTarget(), {
    matchMedia: () => media, isSecureContext: true, screen: { orientation: { angle: 0 } },
    DeviceOrientationEvent: {},
    requestAnimationFrame: callback => { frames.set(++id, callback); return id; },
    cancelAnimationFrame: key => frames.delete(key),
    setTimeout: callback => { timers.set(++id, callback); return id; },
    clearTimeout: key => timers.delete(key),
  });
  const fire = (target, type, fields = {}) => target.dispatchEvent(Object.assign(new Event(type), fields));
  const dispose = mountPerspective(root, win);
  return { card, toggle, sensor, status, doc, win, media, frames, timers, fire, dispose };
}

test('pause and live reduced-motion changes stop frames and reset transforms', () => {
  const f = fixture();
  f.fire(f.card.wrapper, 'pointermove', { clientX: 100, clientY: 0, pointerType: 'mouse' });
  assert.equal(f.frames.size, 1);
  f.fire(f.toggle, 'click');
  assert.equal(f.frames.size, 0);
  assert.equal(f.card.values.get('--card-pitch'), '0.000deg');
  f.fire(f.toggle, 'click');
  f.media.matches = true;
  f.fire(f.media, 'change');
  f.fire(f.card.wrapper, 'pointermove', { clientX: 100, clientY: 0, pointerType: 'mouse' });
  assert.equal(f.frames.size, 0);
  assert.equal(f.toggle.disabled, true);
  f.dispose();
});

test('sensor permission is opt-in and a late grant cannot enable after pausing', async () => {
  const f = fixture();
  let grant, calls = 0;
  f.win.DeviceOrientationEvent.requestPermission = () => {
    calls++;
    return new Promise(resolve => { grant = resolve; });
  };
  assert.equal(calls, 0);
  f.fire(f.sensor, 'click');
  assert.equal(calls, 1);
  f.fire(f.toggle, 'click');
  grant('granted');
  await Promise.resolve();
  f.fire(f.win, 'deviceorientation', { beta: 40, gamma: 20 });
  assert.equal(f.frames.size, 0);
  assert.equal(f.sensor.values.get('aria-pressed'), 'false');
  assert.equal(f.timers.size, 0);
  f.dispose();
});

test('sensor denial and missing readings preserve pointer fallback', async () => {
  const f = fixture();
  f.win.DeviceOrientationEvent.requestPermission = async () => 'denied';
  f.fire(f.sensor, 'click');
  await Promise.resolve();
  assert.match(f.status.textContent, /denied/);
  f.win.DeviceOrientationEvent.requestPermission = async () => 'granted';
  f.fire(f.sensor, 'click');
  await Promise.resolve();
  assert.equal(f.timers.size, 1);
  [...f.timers.values()][0]();
  assert.match(f.status.textContent, /No orientation sensor/);
  f.fire(f.card.wrapper, 'pointermove', { clientX: 100, clientY: 0, pointerType: 'mouse' });
  assert.equal(f.frames.size, 1);
  f.dispose();
  assert.equal(f.frames.size, 0);
});

test('touch scroll never starts pointer tilt and hidden pages stop sensors', async () => {
  const f = fixture();
  f.fire(f.card.wrapper, 'pointermove', { clientX: 100, clientY: 0, pointerType: 'touch' });
  assert.equal(f.frames.size, 0);
  f.fire(f.sensor, 'click');
  await Promise.resolve();
  assert.equal(f.timers.size, 1);
  f.doc.hidden = true;
  f.fire(f.doc, 'visibilitychange');
  assert.equal(f.timers.size, 0);
  assert.equal(f.sensor.values.get('aria-pressed'), 'false');
  f.dispose();
});
