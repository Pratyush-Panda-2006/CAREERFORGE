import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { CIRCUITS, COMPOUNDS, simulateLap, sampleLap } from './lap-physics.js';

// Execute the actual controller with small DOM/RAF/media fixtures; physics stays real.
function fixture(reduced = false) {
  const elements = new Map(), callbacks = new Map();
  let nextFrame = 0;
  function element(key) {
    if (!elements.has(key)) {
      const node = { value: '', textContent: '', disabled: false, className: '', events: {},
        addEventListener(type, handler) { this.events[type] = handler; },
        querySelector(selector) { return element(`${key}/${selector}`); },
        setAttribute(name, value) { this[name] = value; }, reportValidity() { return true; },
        getTotalLength() { return 100; }, getPointAtLength(distance) { return { x: distance, y: 0 }; } };
      node.classList = { add(name) { node.className += ` ${name}`; } };
      elements.set(key, node);
    }
    return elements.get(key);
  }
  const panel = { querySelector: element };
  const document = { hidden: false, events: {}, getElementById() { return panel; },
    addEventListener(type, handler) { this.events[type] = handler; } };
  const motion = { matches: reduced, events: {}, addEventListener(type, handler) { this.events[type] = handler; } };
  for (const [key, value] of Object.entries({ '#lap-track': 'silverstone', '#lap-compound': 'soft', '#lap-condition': 'dry', '#lap-age': '0', '#lap-pace': '10' })) element(key).value = value;
  const source = readFileSync(new URL('./lap-simulator.js', import.meta.url), 'utf8').replace(/^import[^\n]+\n/, '');
  runInNewContext(source, { CIRCUITS, COMPOUNDS, simulateLap, sampleLap, document,
    window: { matchMedia: () => motion }, requestAnimationFrame(fn) { callbacks.set(++nextFrame, fn); return nextFrame; },
    cancelAnimationFrame(id) { callbacks.delete(id); } });
  function fire(key, event) { element(key).events[event]({ preventDefault() {} }); }
  function tick(now) { const batch = [...callbacks.values()]; callbacks.clear(); batch.forEach(fn => fn(now)); }
  return { element, fire, tick, motion, document, callbacks, start: () => fire('form', 'submit') };
}

test('controller advances by elapsed time equally at 60 and 240 Hz', () => {
  const clocks = [];
  for (const hz of [60, 240]) {
    const ui = fixture(); ui.start();
    for (let frame = 0; frame <= hz * 2; frame++) ui.tick(frame / hz * 1000);
    clocks.push(ui.element('#lap-clock').textContent);
  }
  assert.equal(clocks[0], '0:20.000');
  assert.equal(clocks[1], clocks[0]);
});
test('pause excludes the paused wall-clock gap and resume starts one RAF loop', () => {
  const ui = fixture(); ui.start(); ui.tick(0); ui.tick(1000);
  ui.fire('#lap-pause', 'click'); ui.tick(10_000);
  assert.equal(ui.element('#lap-clock').textContent, '0:10.000');
  assert.equal(ui.callbacks.size, 0);
  ui.fire('#lap-pause', 'click'); ui.tick(10_000); ui.tick(11_000);
  assert.equal(ui.element('#lap-clock').textContent, '0:20.000');
  assert.equal(ui.callbacks.size, 1);
});
test('cancelled runs cannot record a best or continue a queued animation', () => {
  const ui = fixture(); ui.start(); ui.tick(0); ui.tick(1000);
  ui.fire('#lap-stop', 'click'); ui.tick(100_000);
  assert.equal(ui.element('#lap-best').textContent, 'No completed lap');
  assert.equal(ui.callbacks.size, 0);
  assert.match(ui.element('#lap-status').textContent, /cancelled/);
});
test('reduced motion completes immediately; changing preference also finishes a running lap', () => {
  const ui = fixture(true); ui.start();
  assert.match(ui.element('#lap-status').textContent, /Lap complete/);
  assert.equal(ui.element('#lap-progress').value, 100);
  assert.equal(ui.callbacks.size, 0);
  const live = fixture(); live.start(); live.motion.matches = true; live.motion.events.change();
  assert.match(live.element('#lap-status').textContent, /Lap complete/);
  assert.equal(live.callbacks.size, 0);
});
test('hidden tabs pause without awarding an unfinished lap', () => {
  const ui = fixture(); ui.start(); ui.document.hidden = true; ui.document.events.visibilitychange();
  assert.equal(ui.callbacks.size, 0);
  assert.match(ui.element('#lap-status').textContent, /paused/);
  assert.equal(ui.element('#lap-best').textContent, 'No completed lap');
});
test('completed runs update track PB, populate all sectors and compare faster compounds', () => {
  const ui = fixture(true);
  ui.element('#lap-compound').value = 'wet'; ui.start();
  const prior = ui.element('#lap-best').textContent;
  ui.element('#lap-compound').value = 'soft'; ui.start();
  assert.notEqual(ui.element('#lap-best').textContent, prior);
  assert.equal(ui.element('#lap-best').textContent, ui.element('#lap-clock').textContent);
  for (let sector = 0; sector < 3; sector++) {
    assert.notEqual(ui.element(`[data-lap-sector="${sector}"]/output`).textContent, '—');
    assert.match(ui.element(`[data-lap-sector="${sector}"]/.lap-delta`).className, /lap-fastest/);
  }
});
