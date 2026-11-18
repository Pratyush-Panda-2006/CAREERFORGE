import test from 'node:test';
import assert from 'node:assert/strict';
import { EdtechAcademyFilterEngine } from './filter-engine.js';

const mockCourses = [
  { id: '1', name: 'Alpha Course', description: 'Primary track', rating: 4.8, popularity: 1200, tags: ['core', 'v1'] },
  { id: '2', name: 'Beta Module', description: 'Secondary module', rating: 4.2, popularity: 3400, tags: ['module', 'v1'] },
  { id: '3', name: 'Gamma System', description: 'Distributed systems', rating: 4.9, popularity: 980, tags: ['core', 'systems'] }
];

test('EdtechAcademyFilterEngine - returns all items by default', () => {
  const engine = new EdtechAcademyFilterEngine({ data: mockCourses });
  const results = engine.apply();
  assert.equal(results.length, 3);
});

test('EdtechAcademyFilterEngine - filterByKeyword performs case-insensitive matching', () => {
  const engine = new EdtechAcademyFilterEngine({ data: mockCourses });
  const res = engine.filterByKeyword('ALPHA');
  assert.equal(res.length, 1);
  assert.equal(res[0].id, '1');
});

test('EdtechAcademyFilterEngine - toggleTag applies compound tag filter', () => {
  const engine = new EdtechAcademyFilterEngine({ data: mockCourses });
  engine.toggleTag('core');
  assert.equal(engine.apply().length, 2);

  engine.toggleTag('v1');
  assert.equal(engine.apply().length, 1);
  assert.equal(engine.apply()[0].id, '1');
});

test('EdtechAcademyFilterEngine - sorts correctly ascending and descending', () => {
  const engine = new EdtechAcademyFilterEngine({ data: mockCourses });
  engine.sort('popularity', 'desc');
  const res = engine.apply();
  assert.equal(res[0].id, '2'); // 3400
  assert.equal(res[2].id, '3'); // 980
});
