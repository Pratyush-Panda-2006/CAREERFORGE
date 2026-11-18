import test from 'node:test';
import assert from 'node:assert/strict';
import { EdtechAcademySnippetVault } from './snippet-vault.js';

test('EdtechAcademySnippetVault - initializes with presets', () => {
  const vault = new EdtechAcademySnippetVault();
  const list = vault.getSnippets();
  assert.ok(list.length >= 5);
  assert.ok(list.some(s => s.tags.includes('flashcards')));
  assert.ok(list.some(s => s.tags.includes('bloom')));
});

test('EdtechAcademySnippetVault - extracts unique tags and categories', () => {
  const vault = new EdtechAcademySnippetVault();
  const tags = vault.getAllTags();
  assert.ok(tags.includes('flashcards'));
  assert.ok(tags.includes('bloom'));
  assert.ok(tags.includes('adaptive'));

  const categories = vault.getAllCategories();
  assert.ok(categories.includes('Cognitive Learning'));
  assert.ok(categories.includes('Curriculum Design'));
  assert.ok(categories.includes('Coding Exercises'));
});

test('EdtechAcademySnippetVault - search filters correctly', () => {
  const vault = new EdtechAcademySnippetVault();
  const bloomMatches = vault.search('Bloom', 'pedagogy');
  assert.ok(bloomMatches.length >= 1);
  assert.ok(bloomMatches[0].title.includes('Bloom'));

  const empty = vault.search('nonexistent_curriculum_xyz_999');
  assert.equal(empty.length, 0);
});

test('EdtechAcademySnippetVault - adds and removes snippets', () => {
  const vault = new EdtechAcademySnippetVault();
  const initialCount = vault.getSnippets().length;

  const added = vault.addSnippet({
    title: 'Gamification Streak Points Formula',
    description: 'Exponential multiplier for consecutive daily study streaks',
    category: 'Cognitive Learning',
    tags: ['gamification', 'streaks', 'points'],
    code: '{"multiplier": 1.25, "cap": 3.0}'
  });

  assert.ok(added.id);
  assert.equal(vault.getSnippets().length, initialCount + 1);

  const res = vault.removeSnippet(added.id);
  assert.equal(res, true);
  assert.equal(vault.getSnippets().length, initialCount);
});
