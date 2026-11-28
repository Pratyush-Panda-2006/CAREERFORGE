import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AgritechPrecisionFarmingCommandPalette } from './command-palette.js';

function build(calls = []) {
  const palette = new AgritechPrecisionFarmingCommandPalette();
  const handler = (action) => calls.push(action.id);
  palette.registerAction('irrigate', 'Start irrigation cycle', 'Field', handler);
  palette.registerAction('soil', 'Review soil moisture', 'Telemetry', handler);
  palette.registerAction('drone', 'Schedule drone survey', 'Field', handler);
  return palette;
}
const ids = (results) => results.map((action) => action.id);

test('an empty query lists everything grouped by category', () => {
  assert.deepEqual(ids(build().fuzzySearch('')), ['irrigate', 'drone', 'soil']);
});

test('matches substrings, letter sequences and category names', () => {
  const palette = build();
  assert.deepEqual(ids(palette.fuzzySearch('MOIST')), ['soil']);
  assert.equal(ids(palette.fuzzySearch('sds'))[0], 'drone');
  assert.deepEqual(ids(palette.fuzzySearch('telemetry')), ['soil']);
  assert.deepEqual(palette.fuzzySearch('zzz'), []);
});

test('selection wraps and executes the highlighted action', () => {
  const calls = [];
  const palette = build(calls);
  palette.fuzzySearch('');
  palette.moveSelection(-1);
  assert.equal(palette.executeSelected(), 'soil');
  palette.moveSelection(1);
  palette.executeSelected();
  assert.deepEqual(calls, ['soil', 'irrigate']);
});

test('a new search resets the selection and no match runs nothing', () => {
  const calls = [];
  const palette = build(calls);
  palette.fuzzySearch('');
  palette.moveSelection(2);
  palette.fuzzySearch('zzz');
  assert.equal(palette.moveSelection(1), 0);
  assert.equal(palette.executeSelected(), null);
  assert.deepEqual(calls, []);
});

test('rejects incomplete actions', () => {
  assert.throws(() => build().registerAction('x', 'No handler', 'Field'), TypeError);
});
