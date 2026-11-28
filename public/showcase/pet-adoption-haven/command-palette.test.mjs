import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fuzzyScore, PetAdoptionHavenCommandPalette } from './command-palette.js';

function build(run = []) {
  const palette = new PetAdoptionHavenCommandPalette();
  const handler = (action) => run.push(action.id);
  palette.registerAction('home', 'Go to home', 'Navigate', handler);
  palette.registerAction('tour', 'Take the virtual tour', 'Navigate', handler);
  palette.registerAction('prefs', 'Change preferences', 'Settings', handler);
  palette.registerAction('sounds', 'Open the sound board', 'Tools', handler);
  return palette;
}

const ids = (results) => results.map((r) => r.id);

test('fuzzyScore needs every letter in order', () => {
  assert.equal(fuzzyScore('ruot', 'virtual tour'), null);
  assert.equal(fuzzyScore('zz', 'home'), null);
  assert.deepEqual(fuzzyScore('vt', 'virtual tour').positions, [0, 8]);
});

test('fuzzyScore prefers letters that sit together over scattered ones', () => {
  assert.deepEqual(fuzzyScore('tour', 'Take the virtual tour').positions, [17, 18, 19, 20]);
  assert.ok(fuzzyScore('tour', 'virtual tour').score > fuzzyScore('tour', 'to our').score);
});

test('an empty query lists every action grouped by category', () => {
  assert.deepEqual(ids(build().fuzzySearch('')), ['home', 'tour', 'prefs', 'sounds']);
});

test('the best match comes first and non matches are dropped', () => {
  assert.deepEqual(ids(build().fuzzySearch('pref')), ['prefs']);
  assert.equal(build().fuzzySearch('sound')[0].id, 'sounds');
  assert.deepEqual(build().fuzzySearch('qqqq'), []);
});

test('a category name finds its actions', () => {
  assert.deepEqual(ids(build().fuzzySearch('navigate')).sort(), ['home', 'tour']);
});

test('results of one category stay next to each other', () => {
  const categories = build().fuzzySearch('o').map((r) => r.category);
  const runs = categories.filter((c, i) => c !== categories[i - 1]);
  assert.equal(runs.length, new Set(categories).size);
});

test('the cursor wraps and executeSelected runs the highlighted action', () => {
  const run = [];
  const palette = build(run);
  palette.fuzzySearch('');
  palette.moveSelection(-1);
  assert.equal(palette.executeSelected().id, 'sounds');
  palette.moveSelection(1);
  assert.equal(palette.executeSelected().id, 'home');
  assert.deepEqual(run, ['sounds', 'home']);
});

test('a new search puts the cursor back on the first result', () => {
  const palette = build();
  palette.fuzzySearch('');
  palette.moveSelection(2);
  palette.fuzzySearch('tour');
  assert.equal(palette.selected, 0);
});

test('executeSelected does nothing when there are no results', () => {
  const run = [];
  const palette = build(run);
  palette.fuzzySearch('qqqq');
  palette.moveSelection(1);
  assert.equal(palette.executeSelected(), null);
  assert.deepEqual(run, []);
});

test('registerAction rejects bad input and replaces a repeated id', () => {
  const palette = build();
  assert.throws(() => palette.registerAction('x', 'No handler', 'Tools'), TypeError);
  palette.registerAction('home', 'Return home', 'Navigate', () => {});
  assert.equal(palette.actions.size, 4);
  assert.equal(palette.fuzzySearch('return')[0].id, 'home');
});
