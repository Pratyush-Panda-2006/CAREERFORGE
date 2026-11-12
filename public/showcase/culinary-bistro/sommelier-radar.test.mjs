import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const scriptPath = path.resolve('public/showcase/culinary-bistro/script.js');
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

test('TASTING_COURSES has complete 5-dimensional flavor radar profiles for all 7 wines', () => {
  const ctx = loadContext();
  const courses = ctx.TASTING_COURSES;
  assert.equal(courses.length, 7, 'Expected 7 tasting courses');

  const requiredAxes = ['tannin', 'acidity', 'body', 'sweetness', 'fruit'];

  courses.forEach((c) => {
    assert.ok(c.winePairing, `Course ${c.roman} missing winePairing`);
    assert.ok(c.winePairing.wine, `Course ${c.roman} missing wine title`);
    assert.ok(c.winePairing.flavorProfile, `Course ${c.roman} missing flavorProfile`);
    assert.ok(c.winePairing.varietal, `Course ${c.roman} missing varietal`);
    assert.ok(c.winePairing.terroir, `Course ${c.roman} missing terroir`);

    requiredAxes.forEach((axis) => {
      const val = c.winePairing.flavorProfile[axis];
      assert.equal(typeof val, 'number', `Course ${c.roman} axis ${axis} is not a number`);
      assert.ok(val >= 0 && val <= 100, `Course ${c.roman} axis ${axis} out of range (0-100): ${val}`);
    });
  });
});

test('calculateRadarPoints computes exact 5 geometric polygon vertices', () => {
  const ctx = loadContext();
  const calculateRadarPoints = ctx.calculateRadarPoints;
  assert.equal(typeof calculateRadarPoints, 'function');

  const profile = { tannin: 50, acidity: 100, body: 0, sweetness: 80, fruit: 60 };
  const points = calculateRadarPoints(profile, 170, 155, 100);

  assert.equal(points.length, 5, 'Should calculate 5 points for the 5 axes');

  // Axis 0: tannin at 50% radius pointing upwards (-90 deg)
  assert.equal(points[0].label, 'Tannins');
  assert.equal(points[0].val, 50);
  assert.ok(Math.abs(points[0].x - 170) < 0.01, 'X coordinate of top axis should be center');
  assert.ok(Math.abs(points[0].y - (155 - 50)) < 0.01, 'Y coordinate should be cy - 50');

  // Axis 1: acidity at 100% radius
  assert.equal(points[1].label, 'Acidity');
  assert.equal(points[1].val, 100);
});
