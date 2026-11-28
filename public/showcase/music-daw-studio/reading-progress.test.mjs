import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MusicDawStudioReadingTracker } from './reading-progress.js';

const words = (count) => Array(count).fill('beat').join(' ');

test('counts words and rounds the read time up', () => {
  const tracker = new MusicDawStudioReadingTracker();
  assert.deepEqual(tracker.computeReadTime('  one\n two   three '), { words: 3, minutes: 1 });
  assert.deepEqual(tracker.computeReadTime(words(450)), { words: 450, minutes: 3 });
  assert.deepEqual(tracker.computeReadTime(words(450), 450), { words: 450, minutes: 1 });
  assert.deepEqual(tracker.computeReadTime(''), { words: 0, minutes: 0 });
});

test('falls back to the default speed for a bad speed', () => {
  assert.equal(new MusicDawStudioReadingTracker().computeReadTime(words(400), 0).minutes, 2);
});

test('reports percent and time left, clamped to the page', () => {
  const tracker = new MusicDawStudioReadingTracker();
  tracker.computeReadTime(words(800));
  assert.deepEqual(tracker.updateScrollProgress(250, 1000), { percent: 25, minutesLeft: 3 });
  assert.deepEqual(tracker.updateScrollProgress(-40, 1000), { percent: 0, minutesLeft: 4 });
  assert.deepEqual(tracker.updateScrollProgress(1200, 1000), { percent: 100, minutesLeft: 0 });
});

test('treats a page that cannot scroll as read', () => {
  assert.equal(new MusicDawStudioReadingTracker().updateScrollProgress(0, 0).percent, 100);
});

test('listens to scrolling once per frame and can be unbound', () => {
  const listeners = {};
  const frames = [];
  const view = {
    scrollY: 0,
    innerHeight: 500,
    document: { documentElement: { scrollHeight: 1500 } },
    requestAnimationFrame: (fn) => frames.push(fn),
    addEventListener: (name, fn) => { listeners[name] = fn; },
    removeEventListener: (name) => { delete listeners[name]; },
  };
  const seen = [];
  const tracker = new MusicDawStudioReadingTracker({ onProgress: (state) => seen.push(state.percent) });
  const unbind = tracker.bindScrollListener(view);

  view.scrollY = 500;
  listeners.scroll();
  listeners.scroll();
  assert.equal(frames.length, 1);
  frames.shift()();
  assert.deepEqual(seen, [0, 50]);

  unbind();
  assert.deepEqual(listeners, {});
});
