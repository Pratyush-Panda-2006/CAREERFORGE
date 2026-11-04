// Run with: node --test public/showcase/culinary-bistro/tasting.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const src = fs.readFileSync(new URL('./script.js', import.meta.url), 'utf8');

// Provide minimal mock environment for script loading
const ctx = {
  window: {},
  document: {
    readyState: 'complete',
    getElementById: () => null,
    querySelectorAll: () => [],
    addEventListener: () => {}
  }
};
ctx.window = ctx;

vm.createContext(ctx);
vm.runInContext(src, ctx);

const courses = ctx.TASTING_COURSES;

test('tasting menu defines exactly 7 curated courses', () => {
  assert.ok(Array.isArray(courses), 'TASTING_COURSES should be an array');
  assert.equal(courses.length, 7, 'Should have exactly 7 courses');
});

test('course IDs and Roman numerals are sequenced I through VII', () => {
  const expectedRomans = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  courses.forEach((c, idx) => {
    assert.equal(c.id, idx + 1);
    assert.equal(c.roman, expectedRomans[idx]);
  });
});

test('every course has complete bilingual titles, stage, and description', () => {
  courses.forEach((c) => {
    assert.ok(c.stage && c.stage.length > 0, `Course ${c.id} missing stage`);
    assert.ok(c.titleFr && c.titleFr.length > 0, `Course ${c.id} missing French title`);
    assert.ok(c.titleEn && c.titleEn.length > 0, `Course ${c.id} missing English title`);
    assert.ok(c.description && c.description.length > 0, `Course ${c.id} missing description`);
    assert.ok(c.emoji && c.emoji.length > 0, `Course ${c.id} missing emoji`);
  });
});

test('every course includes authentic chef inspiration notes', () => {
  courses.forEach((c) => {
    assert.ok(c.chefInspiration && c.chefInspiration.length > 20, `Course ${c.id} has insufficient chef inspiration`);
  });
});

test('every course includes sommelier wine pairing with vintage, region and notes', () => {
  courses.forEach((c) => {
    assert.ok(c.winePairing, `Course ${c.id} missing wine pairing`);
    assert.ok(c.winePairing.wine, `Course ${c.id} missing wine bottle name`);
    assert.ok(c.winePairing.region, `Course ${c.id} missing wine region`);
    assert.ok(c.winePairing.notes, `Course ${c.id} missing wine tasting notes`);
    assert.ok(c.winePairing.temp, `Course ${c.id} missing serving temperature`);
  });
});

test('savory courses comprise stages 1-5 and sweet/cheese comprise stages 6-7', () => {
  const savory = courses.filter((c) => c.type === 'savory');
  const sweet = courses.filter((c) => c.type === 'sweet');
  assert.equal(savory.length, 5);
  assert.equal(sweet.length, 2);
  assert.equal(JSON.stringify(savory.map((c) => c.id)), JSON.stringify([1, 2, 3, 4, 5]));
  assert.equal(JSON.stringify(sweet.map((c) => c.id)), JSON.stringify([6, 7]));
});

test('sensory metrics have valid percentages between 0 and 100', () => {
  courses.forEach((c) => {
    assert.ok(c.sensory, `Course ${c.id} missing sensory ratings`);
    ['acidity', 'richness', 'complexity'].forEach((key) => {
      assert.ok(typeof c.sensory[key] === 'number');
      assert.ok(c.sensory[key] >= 0 && c.sensory[key] <= 100);
    });
  });
});
