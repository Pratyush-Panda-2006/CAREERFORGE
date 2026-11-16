import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';

test('script metrics update on load and input, including whitespace and the warning threshold', () => {
  const elements = new Map();
  function element(value = '') {
    return {
      value,
      maxLength: 2000,
      textContent: '',
      disabled: false,
      listeners: {},
      classes: new Set(),
      classList: { toggle(name, enabled) { elements.get('tts-count').classes[enabled ? 'add' : 'delete'](name); } },
      addEventListener(name, handler) { this.listeners[name] = handler; },
      appendChild() {},
    };
  }
  for (const id of [
    'tts-form', 'tts-text', 'tts-count', 'tts-duration', 'tts-voice', 'tts-voice-note',
    'tts-rate', 'tts-pitch', 'tts-rate-out', 'tts-pitch-out', 'tts-play', 'tts-pause',
    'tts-stop', 'tts-eq', 'tts-status', 'tts-unsupported',
  ]) elements.set(id, element());
  elements.get('tts-text').value = 'Hello world';
  elements.get('tts-rate').value = '1';
  elements.get('tts-pitch').value = '1';

  const document = {
    addEventListener() {},
    getElementById(id) { return elements.get(id); },
    createElement() { return element(); },
  };
  const context = { document, window: {} };
  runInNewContext(readFileSync(new URL('./script.js', import.meta.url), 'utf8'), context);
  context.initTtsStudio();

  const input = elements.get('tts-text');
  const count = elements.get('tts-count');
  const duration = elements.get('tts-duration');
  assert.equal(count.textContent, '11 chars / 2000');
  assert.equal(duration.textContent, '~1 sec spoken');

  input.value = '  one\n two\tthree  ';
  input.listeners.input();
  assert.equal(duration.textContent, '~1 sec spoken');
  assert.equal(count.textContent, '18 chars / 2000');

  input.value = Array(150).fill('word').join(' ');
  input.listeners.input();
  assert.equal(duration.textContent, '~1 min 0 sec spoken');
  assert.equal(count.classes.has('near-limit'), false);

  input.value = 'a'.repeat(900);
  input.listeners.input();
  assert.equal(count.classes.has('near-limit'), true);
  input.value = '';
  input.listeners.input();
  assert.equal(duration.textContent, '~0 sec spoken');
  assert.equal(count.classes.has('near-limit'), false);
});
