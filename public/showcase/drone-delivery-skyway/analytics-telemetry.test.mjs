import test from 'node:test';
import assert from 'node:assert/strict';
import { DroneDeliverySkywayAnalyticsEngine as Engine, sanitizeEvent, TARGETS } from './analytics-telemetry.js';
function fixture() {
  let now = 100;
  return { engine: new Engine({ clock: () => now }), at(value) { now = value; } };
}
test('collection is opt-in and paused/hidden input is discarded', () => {
  const { engine: e } = fixture();
  assert.equal(e.trackEvent('click', { target: 'route' }), false);
  e.start(); assert.equal(e.trackEvent('click', { target: 'route' }), true);
  e.setVisible(false); assert.equal(e.trackEvent('click', { target: 'route' }), false);
  e.setVisible(true); e.pause(); assert.equal(e.trackEvent('scroll', { depth: 100 }), false);
  assert.equal(e.snapshot().clicks, 1); assert.equal(e.getScrollDepthPercentage(), 0);
});
test('only fixed event names/targets and coarse integer cells are serialized', () => {
  const secret = 'SYNTHETIC_SECRET_CANARY_47', e = new Engine(); e.start();
  for (const target of TARGETS) {
    assert.equal(e.trackEvent('click', { target, xCell: 7, yCell: 5, password: secret, value: secret, url: 'https://example.invalid/?token=' + secret, nested: { text: secret }, selector: secret }), true);
  }
  assert.equal(e.trackEvent(secret, { target: 'route' }), false);
  assert.equal(e.trackEvent('click', { target: secret }), false);
  const report = e.snapshot(), serialized = JSON.stringify(report);
  assert.equal(serialized.includes(secret), false); assert.equal(serialized.includes('example.invalid'), false);
  assert.equal(report.clicks, 4); assert.equal(report.heatmap.cells[47], 4);
  assert.deepEqual(Object.keys(report.events[0]).sort(), ['atMs', 'cell', 'target', 'type']);
});
test('invalid input never contributes a partial count or coordinate', () => {
  const { engine: e } = fixture(); e.start();
  for (const data of [null, [], {}, { target: '__proto__' }, { target: 'route', xCell: 1 }, { target: 'route', xCell: 8, yCell: 0 }, { target: 'route', xCell: 0, yCell: -1 }, { target: 'route', xCell: 1.5, yCell: 1 }, { target: 'route', xCell: NaN, yCell: 0 }]) assert.equal(e.trackEvent('click', data), false);
  for (const depth of [NaN, Infinity, '100', undefined]) assert.equal(e.trackEvent('scroll', { depth }), false);
  assert.equal(e.snapshot().acceptedEvents, 0); assert.equal(e.snapshot().heatmap.cells.reduce((a, b) => a + b, 0), 0);
});
test('keyboard clicks add target totals without inventing pointer cells', () => {
  const { engine: e } = fixture(); e.start(); e.trackEvent('click', { target: 'dispatch' });
  const s = e.snapshot(); assert.equal(s.targets.dispatch, 1); assert.equal(s.events[0].cell, null); assert.equal(s.heatmap.cells.reduce((a, b) => a + b, 0), 0);
});
test('all 48 coarse cells conserve independently enumerated counts', () => {
  const { engine: e } = fixture(); e.start();
  for (let y = 0; y < 6; y++) for (let x = 0; x < 8; x++) for (let i = 0; i <= x + y; i++) e.trackEvent('click', { target: TARGETS[(x + y) % 4], xCell: x, yCell: y });
  const s = e.snapshot();
  assert.deepEqual(s.heatmap.cells, Array.from({ length: 48 }, (_, i) => i % 8 + Math.floor(i / 8) + 1));
  assert.equal(Object.values(s.targets).reduce((a, b) => a + b, 0), s.clicks);
  assert.equal(s.heatmap.cells.reduce((a, b) => a + b, 0), s.clicks);
});
test('scroll depth clamps to 0–100, advances in 5% steps and never regresses', () => {
  const { engine: e } = fixture(); e.start();
  for (const [depth, accepted, expected] of [[-10, false, 0], [4.9, false, 0], [5, true, 5], [19.9, true, 15], [10, false, 15], [101, true, 100], [50, false, 100]]) {
    assert.equal(e.trackEvent('scroll', { depth }), accepted); assert.equal(e.getScrollDepthPercentage(), expected);
  }
  assert.equal(e.snapshot().acceptedEvents, 3);
});
test('only visible running intervals count; pauses and hidden time are excluded', () => {
  const f = fixture(), e = f.engine;
  f.at(500); e.start(); f.at(1500); assert.equal(e.computeSessionDuration(), 1000);
  e.pause(); f.at(9000); assert.equal(e.computeSessionDuration(), 1000);
  e.start(); f.at(9500); e.setVisible(false); f.at(50000); assert.equal(e.computeSessionDuration(), 1500);
  e.setVisible(true); f.at(50500); assert.equal(e.computeSessionDuration(), 2000);
});
test('clock rollback cannot subtract time or double count the recovery interval', () => {
  const f = fixture(), e = f.engine; e.start(); f.at(1100); assert.equal(e.computeSessionDuration(), 1000);
  f.at(600); assert.equal(e.computeSessionDuration(), 1000); f.at(1200); assert.equal(e.computeSessionDuration(), 1100);
});
test('duration saturates at one day and event times use active relative milliseconds', () => {
  const f = fixture(), e = f.engine; e.start(); f.at(101.9); e.trackEvent('click', { target: 'route' });
  assert.equal(e.snapshot().events[0].atMs, 1); f.at(1e12); assert.equal(e.computeSessionDuration(), 86400000);
});
test('the log retains 100 newest events while counters retain all accepted clicks', () => {
  const f = fixture(), e = f.engine; e.start();
  for (let i = 0; i < 250; i++) { f.at(100 + i); e.trackEvent('click', { target: 'weather' }); }
  const s = e.snapshot(); assert.equal(s.events.length, 100); assert.equal(s.events[0].atMs, 150); assert.equal(s.events.at(-1).atMs, 249);
  assert.equal(s.targets.weather, 250); assert.equal(s.acceptedEvents, 250);
});
test('snapshots are detached and deep frozen at every mutable boundary', () => {
  const { engine: e } = fixture(); e.start(); e.trackEvent('click', { target: 'route', xCell: 0, yCell: 0 });
  const s = e.snapshot(); assert.throws(() => { s.targets.route = 99; }); assert.throws(() => { s.heatmap.cells[0] = 99; }); assert.throws(() => { s.events[0].cell[0] = 99; });
  e.trackEvent('click', { target: 'route' }); assert.equal(s.clicks, 1); assert.equal(e.snapshot().clicks, 2);
});
test('clear stops collection and removes all previous measurements', () => {
  const f = fixture(), e = f.engine; e.start(); f.at(500); e.trackEvent('click', { target: 'route' }); e.trackEvent('scroll', { depth: 80 }); e.clear();
  f.at(5000); const s = e.snapshot(); assert.equal(s.state, 'paused'); assert.equal(s.activeMs, 0); assert.equal(s.acceptedEvents, 0); assert.equal(s.events.length, 0); assert.equal(s.maximumScrollPercent, 0); assert.equal(s.clicks, 0);
  e.start(); f.at(5100); assert.equal(e.computeSessionDuration(), 100);
});
test('invalid clocks and visibility values fail explicitly', () => {
  assert.throws(() => new Engine({ clock: null })); assert.throws(() => new Engine({ clock: () => NaN }));
  const { engine: e } = fixture(); assert.throws(() => e.setVisible('yes'));
  assert.equal(sanitizeEvent('scroll', { depth: 23.7, password: 'SECRET' }).depth, 20);
});
