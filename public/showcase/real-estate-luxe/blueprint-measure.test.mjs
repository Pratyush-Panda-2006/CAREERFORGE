import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const scriptPath = path.resolve('public/showcase/real-estate-luxe/script.js');
const scriptCode = fs.readFileSync(scriptPath, 'utf8');

function loadContext() {
  const context = {
    document: {
      addEventListener: () => {},
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      readyState: 'complete',
      body: { classList: { add: () => {}, remove: () => {} } }
    },
    window: {},
    console,
    Math
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(scriptCode, context);
  return context;
}

test('calculateMeasurement computes accurate euclidean distance and real-world scale (1px = 0.05m)', () => {
  const ctx = loadContext();
  const calculateMeasurement = ctx.calculateMeasurement;
  assert.equal(typeof calculateMeasurement, 'function');

  // 100px horizontal = 5.0m
  const p1 = { x: 100, y: 100 };
  const p2 = { x: 200, y: 100 };
  const m1 = calculateMeasurement(p1, p2, 0.05);

  assert.equal(m1.distPx, 100);
  assert.equal(m1.meters, 5.0);
  assert.equal(m1.feet, +(5.0 * 3.28084).toFixed(1));
  assert.equal(m1.angleDeg, 0);

  // 3-4-5 triangle: 60px and 80px -> 100px hypotenuse
  const p3 = { x: 0, y: 0 };
  const p4 = { x: 60, y: 80 };
  const m2 = calculateMeasurement(p3, p4, 0.05);

  assert.equal(m2.distPx, 100);
  assert.equal(m2.meters, 5.0);
});

test('ROOMS_DATA defines all 3 architectural levels with square footage and metrics', () => {
  const ctx = loadContext();
  const rooms = ctx.ROOMS_DATA;
  assert.ok(rooms, 'ROOMS_DATA should exist');

  // Ground level
  assert.ok(rooms.foyer, 'Ground foyer missing');
  assert.ok(rooms.salon, 'Ground salon missing');
  assert.ok(rooms.terrace, 'Ground terrace missing');

  // Upper level (Penthouse)
  assert.ok(rooms.master, 'Penthouse master suite missing');
  assert.ok(rooms.dressing, 'Penthouse dressing wing missing');
  assert.ok(rooms.spa, 'Penthouse spa missing');

  // Rooftop level (Terrace & Observatory)
  assert.ok(rooms.skylounge, 'Rooftop sky lounge missing');
  assert.ok(rooms.observatory, 'Rooftop observatory missing');
  assert.ok(rooms.sundeck, 'Rooftop sundeck missing');
  assert.ok(rooms.alfresco, 'Rooftop alfresco missing');

  // Check metrics properties
  ['foyer', 'master', 'skylounge', 'observatory'].forEach((k) => {
    assert.ok(rooms[k].sqft > 0, `${k} missing valid sqft`);
    assert.ok(rooms[k].sqm > 0, `${k} missing valid sqm`);
    assert.ok(rooms[k].ceiling, `${k} missing ceiling height`);
  });
});
