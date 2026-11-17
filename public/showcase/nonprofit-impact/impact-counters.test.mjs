import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

const script = readFileSync(new URL('./impact-counters.js', import.meta.url), 'utf8');

function createCounters(reducedMotion = false) {
  const counters = [
    { dataset: { impactTarget: '42500' }, textContent: '42,500+' },
    { dataset: { impactTarget: '18', suffix: '' }, textContent: '18' },
    { dataset: { impactTarget: '1200000', compact: 'million' }, textContent: '1.2M+' },
  ];
  const section = { querySelectorAll: () => counters };
  const frames = [];
  let observer;
  class FakeObserver {
    constructor(callback) { this.callback = callback; observer = this; }
    observe(target) { assert.equal(target, section); }
    disconnect() { this.disconnected = true; }
  }
  runInNewContext(script, {
    document: { querySelector: () => section },
    window: { matchMedia: () => ({ matches: reducedMotion }) },
    IntersectionObserver: FakeObserver,
    performance: { now: () => 0 },
    requestAnimationFrame(callback) { frames.push(callback); },
  });
  return { counters, frames, observer };
}

test('impact metrics count up once when they enter the viewport', () => {
  const { counters, frames, observer } = createCounters();
  assert.deepEqual(counters.map((counter) => counter.textContent), ['0+', '0', '0+']);
  observer.callback([{ isIntersecting: true }]);
  assert.equal(observer.disconnected, true);
  frames.shift()(700);
  assert.notEqual(counters[0].textContent, '42,500+');
  frames.shift()(1400);
  assert.deepEqual(counters.map((counter) => counter.textContent), ['42,500+', '18', '1.2M+']);
  assert.equal(frames.length, 0);
});

test('reduced motion keeps final numbers visible without animation', () => {
  const { counters, observer } = createCounters(true);
  assert.equal(observer, undefined);
  assert.deepEqual(counters.map((counter) => counter.textContent), ['42,500+', '18', '1.2M+']);
});
