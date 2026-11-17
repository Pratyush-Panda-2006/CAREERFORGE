import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MusicDawStudioSnippetVault } from './snippet-vault.js';

test('MusicDawStudioSnippetVault - filters presets by tag accurately', () => {
  const vault = new MusicDawStudioSnippetVault();
  const synthSnippets = vault.filterByTag('synth');
  const midiSnippets = vault.filterByTag('midi');

  assert.ok(synthSnippets.length >= 1);
  assert.strictEqual(synthSnippets.every(s => s.tags.includes('synth')), true);

  assert.strictEqual(midiSnippets.length, 1);
  assert.strictEqual(midiSnippets[0].id, 'lofi-rhodes-chords');
});

test('MusicDawStudioSnippetVault - multi-token search filters correctly across title and code', () => {
  const vault = new MusicDawStudioSnippetVault();
  const searchResults = vault.searchSnippets('analog moog');

  assert.strictEqual(searchResults.length, 1);
  assert.strictEqual(searchResults[0].id, 'analog-moog-bass');
});

test('MusicDawStudioSnippetVault - prevents duplicate snippet keys', () => {
  const vault = new MusicDawStudioSnippetVault();

  assert.throws(() => {
    vault.addSnippet('Deep Analog 24dB Moog Bass Patch', '{}', ['synth']);
  }, /already exists/);
});

test('MusicDawStudioSnippetVault - adds valid snippet and retrieves updated tags', () => {
  const vault = new MusicDawStudioSnippetVault();
  const added = vault.addSnippet('Vocal Formant Shifter Chain', '{"formant_shift_cents": -200}', ['vocal', 'fx']);

  assert.strictEqual(added.id, 'vocal-formant-shifter-chain');
  const tags = vault.getAllTags();
  assert.ok(tags.includes('vocal'));
  assert.ok(tags.includes('fx'));

  const vocalFiltered = vault.filterByTag('vocal');
  assert.strictEqual(vocalFiltered.length, 1);
  assert.strictEqual(vocalFiltered[0].id, 'vocal-formant-shifter-chain');
});
