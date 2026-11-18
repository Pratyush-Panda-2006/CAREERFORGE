import test from 'node:test';
import assert from 'node:assert/strict';
import { HealthVitalityFilterEngine } from './filter-engine.js';

const mockItems = [
  { id: '1', name: 'Alpha Item', description: 'Primary component', rating: 4.8, popularity: 1200, tags: ['core', 'v1'] },
  { id: '2', name: 'Beta Module', description: 'Secondary module', rating: 4.2, popularity: 3400, tags: ['module', 'v1'] },
  { id: '3', name: 'Gamma Service', description: 'Background service', rating: 4.9, popularity: 980, tags: ['core', 'service'] }
];

test('HealthVitalityFilterEngine - returns all items by default', () => {
  const engine = new HealthVitalityFilterEngine({ data: mockItems });
  const results = engine.apply();
  assert.equal(results.length, 3);
});

test('HealthVitalityFilterEngine - filterByKeyword performs case-insensitive matching', () => {
  const engine = new HealthVitalityFilterEngine({ data: mockItems });
  const res = engine.filterByKeyword('ALPHA');
  assert.equal(res.length, 1);
  assert.equal(res[0].id, '1');
});

test('HealthVitalityFilterEngine - toggleTag applies compound tag filter', () => {
  const engine = new HealthVitalityFilterEngine({ data: mockItems });
  engine.toggleTag('core');
  assert.equal(engine.apply().length, 2);

  engine.toggleTag('v1');
  assert.equal(engine.apply().length, 1);
  assert.equal(engine.apply()[0].id, '1');
});

test('HealthVitalityFilterEngine - sorts correctly ascending and descending', () => {
  const engine = new HealthVitalityFilterEngine({ data: mockItems });
  engine.sort('popularity', 'desc');
  const res = engine.apply();
  assert.equal(res[0].id, '2'); // highest popularity (3400)
  assert.equal(res[2].id, '3'); // lowest popularity (980)
});
