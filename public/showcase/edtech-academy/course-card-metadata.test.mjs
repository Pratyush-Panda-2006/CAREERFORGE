import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');
const cards = [...html.matchAll(/<div class="card"[^>]*>([\s\S]*?)<\/div>\s*(?=<div class="card"|<\/div>)/g)]
  .map((match) => match[1]);

test('each popular course card displays a difficulty and duration badge', () => {
  assert.equal(cards.length, 2);
  assert.match(cards[0], /course-difficulty-badge difficulty-advanced">Advanced<\/span>/);
  assert.match(cards[0], /course-duration-badge">12 Weeks<\/span>/);
  assert.match(cards[1], /course-difficulty-badge difficulty-intermediate">Intermediate<\/span>/);
  assert.match(cards[1], /course-duration-badge">8 Weeks<\/span>/);
});

test('course metadata badges use responsive wrapping styles', async () => {
  const css = await readFile(new URL('./styles.css', import.meta.url), 'utf8');
  assert.match(css, /\.course-meta\s*\{[^}]*flex-wrap:\s*wrap/s);
  assert.match(css, /@media\s*\(max-width:\s*480px\)/);
});
