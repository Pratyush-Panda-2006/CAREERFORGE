import test from 'node:test';
import assert from 'node:assert/strict';
import { AiVoiceStudioSnippetVault } from './snippet-vault.js';

test('AiVoiceStudioSnippetVault - initializes with default presets', () => {
  const vault = new AiVoiceStudioSnippetVault();
  const snippets = vault.getSnippets();
  assert.ok(snippets.length >= 5);
  assert.ok(snippets.some(s => s.tags.includes('ssml')));
  assert.ok(snippets.some(s => s.tags.includes('phoneme')));
});

test('AiVoiceStudioSnippetVault - extracts unique sorted tags and categories', () => {
  const vault = new AiVoiceStudioSnippetVault();
  const tags = vault.getAllTags();
  assert.ok(tags.includes('ssml'));
  assert.ok(tags.includes('phoneme'));
  assert.ok(tags.includes('cloning'));

  const categories = vault.getAllCategories();
  assert.ok(categories.includes('SSML'));
  assert.ok(categories.includes('Phonetics'));
  assert.ok(categories.includes('Neural Engine'));
});

test('AiVoiceStudioSnippetVault - searches by text and tag', () => {
  const vault = new AiVoiceStudioSnippetVault();
  
  const ssmlMatches = vault.search('prosody', 'ssml');
  assert.ok(ssmlMatches.length >= 1);
  assert.ok(ssmlMatches[0].title.includes('Prosody'));

  const emptyMatches = vault.search('nonexistent_audio_term_xyz');
  assert.equal(emptyMatches.length, 0);
});

test('AiVoiceStudioSnippetVault - adds and removes snippets', () => {
  const vault = new AiVoiceStudioSnippetVault();
  const initialCount = vault.getSnippets().length;

  const added = vault.addSnippet({
    title: 'Custom Vocoder Filter',
    description: 'High-pass dynamic equalizer for speech clarity',
    category: 'Filters',
    tags: ['filter', 'vocoder'],
    code: '{"filter": "highpass", "frequency": 80}'
  });

  assert.ok(added.id);
  assert.equal(vault.getSnippets().length, initialCount + 1);

  const removed = vault.removeSnippet(added.id);
  assert.equal(removed, true);
  assert.equal(vault.getSnippets().length, initialCount);
});
