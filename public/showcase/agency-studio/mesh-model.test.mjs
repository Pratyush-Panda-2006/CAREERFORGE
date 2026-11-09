import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ParticleMesh, canvasScale } from './mesh-model.js';
const mesh = () => new ParticleMesh(900, 450, () => 0.5);

test('node counts, edge count and degree remain bounded across screen sizes', () => {
  for (const [w, h] of [[320, 600], [900, 450], [3840, 2160], [1, 16384], [16384, 1]]) {
    const model = new ParticleMesh(w, h);
    assert.ok(model.nodes.length >= 18 && model.nodes.length <= 72);
    assert.ok(model.edges.length <= 108);
    const degrees = new Array(model.nodes.length).fill(0);
    model.edges.forEach(edge => { degrees[edge.a]++; degrees[edge.b]++; assert.ok(edge.rest <= 190); });
    assert.ok(degrees.every(degree => degree <= 3));
    assert.ok(model.nodes.every(node => node.x >= 0 && node.x <= w && node.y >= 0 && node.y <= h));
  }
});
test('fixed-step integration produces the same state across rendering cadences', () => {
  const results = [];
  for (const hz of [30, 60, 120, 144, 240]) {
    const model = mesh();
    for (let frame = 0; frame < hz * 3; frame++) model.advance(1 / hz);
    results.push(model.nodes);
  }
  results.forEach(nodes => nodes.forEach((node, index) => assert.ok(Math.abs(node.x - results[0][index].x) < 1e-8 && Math.abs(node.y - results[0][index].y) < 1e-8)));
});
test('cursor force responds to velocity without mutating pointer data', () => {
  const slow = mesh(), fast = mesh();
  const pointer = { x: 450, y: 225, vx: 1200, vy: 0 };
  for (let index = 0; index < 60; index++) { slow.advance(1 / 60, { ...pointer, vx: 0 }); fast.advance(1 / 60, pointer); }
  assert.notDeepEqual(slow.nodes, fast.nodes);
  assert.equal(pointer.vx, 1200);
});
test('long gaps are capped and invalid pointer coordinates cannot poison physics', () => {
  const a = mesh(), b = mesh(); a.advance(10); b.advance(0.1);
  assert.deepEqual(a.nodes, b.nodes);
  a.advance(0.1, { x: NaN, y: 0, vx: 0, vy: 0 });
  assert.ok(a.nodes.every(node => Number.isFinite(node.x) && Number.isFinite(node.y)));
  assert.throws(() => a.advance(NaN)); assert.throws(() => a.advance(-1));
});
test('sustained cursor stress remains finite, position-bounded and speed-limited', () => {
  const model = mesh();
  for (let index = 0; index < 2400; index++) model.advance(1 / 120, { x: 450, y: 225, vx: 1e9, vy: -1e9 });
  assert.ok(model.nodes.every(node => Number.isFinite(node.x) && node.x >= -12 && node.x <= 912 && node.y >= -12 && node.y <= 462 && Math.hypot(node.vx, node.vy) <= 120 + 1e-8));
});
test('resize resets coordinates/accumulator, rejects invalid sizes atomically and contains bad RNG', () => {
  const model = mesh(); model.advance(0.1); model.resize(390, 600);
  assert.equal(model.time, 0); assert.equal(model.accumulator, 0);
  assert.ok(model.nodes.every(node => node.x <= 390 && node.y <= 600));
  assert.throws(() => model.resize(0, 1)); assert.equal(model.width, 390);
  assert.ok(new ParticleMesh(390, 400, () => NaN).nodes.every(node => Number.isFinite(node.phase)));
});
test('canvas backing scale caps DPR and pixel area', () => {
  assert.equal(canvasScale(900, 450, 4), 2);
  const scale = canvasScale(3840, 2160, 3);
  assert.ok(3840 * 2160 * scale ** 2 <= 2_000_000 + 1e-6);
  assert.equal(canvasScale(390, 400, NaN), 1);
});
