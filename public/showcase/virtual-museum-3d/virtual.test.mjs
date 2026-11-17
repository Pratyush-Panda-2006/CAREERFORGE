import test from 'node:test';
import assert from 'node:assert/strict';
import { filterArtifactsByCentury, calculateViewerMagnification } from './script.js';

test('Filter artifacts between 15th and 18th century', () => {
  const mock = [{ id: 1, century: 16 }, { id: 2, century: 19 }, { id: 3, century: 14 }];
  const filtered = filterArtifactsByCentury(mock, 15, 18);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 1);
});