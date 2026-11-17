import test from 'node:test';
import assert from 'node:assert/strict';
import { DefiYieldMatrixFilterEngine } from './filter-engine.js';

const mockItems = [
  { id: '1', name: 'Alpha Item', description: 'Primary component', rating: 4.8, popularity: 1200, tags: ['core', 'v1'] },
  { id: '2', name: 'Beta Module', description: 'Secondary module', rating: 4.2, popularity: 3400, tags: ['module', 'v1'] },
  { id: '3', name: 'Gamma Service', description: 'Background service', rating: 4.9, popularity: 980, tags: ['core', 'service'] }
];

test('DefiYieldMatrixFilterEngine - returns all items by default', () => {
  const engine = new DefiYieldMatrixFilterEngine({ data: mockItems });
  const results = engine.apply();
  assert.equal(results.length, 3);
});

test('DefiYieldMatrixFilterEngine - filterByKeyword performs case-insensitive matching', () => {
  const engine = new DefiYieldMatrixFilterEngine({ data: mockItems });
  const res = engine.filterByKeyword('ALPHA');
  assert.equal(res.length, 1);
  assert.equal(res[0].id, '1');
});

test('DefiYieldMatrixFilterEngine - toggleTag applies compound tag filter', () => {
  const engine = new DefiYieldMatrixFilterEngine({ data: mockItems });
  engine.toggleTag('core');
  assert.equal(engine.apply().length, 2);

  engine.toggleTag('v1');
  assert.equal(engine.apply().length, 1);
  assert.equal(engine.apply()[0].id, '1');
});

test('DefiYieldMatrixFilterEngine - sorts correctly ascending and descending', () => {
  const engine = new DefiYieldMatrixFilterEngine({ data: mockItems });
  engine.sort('popularity', 'desc');
  const res = engine.apply();
  assert.equal(res[0].id, '2'); // highest popularity (3400)
  assert.equal(res[2].id, '3'); // lowest popularity (980)
});
