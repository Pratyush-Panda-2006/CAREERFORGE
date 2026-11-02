import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const sandbox = {};
vm.runInNewContext(readFileSync(new URL('./player-logic.js', import.meta.url), 'utf8'), sandbox);
const { clampVolume, clampTime, volumeLabel, serializeState, parseState } = sandbox.PlayerLogic;

test('clampVolume keeps values in 0..1 and survives bad input', () => {
  assert.equal(clampVolume(0.4), 0.4);
  assert.equal(clampVolume(-2), 0);
  assert.equal(clampVolume(7), 1);
  assert.equal(clampVolume('abc'), 0);
  assert.equal(clampVolume(undefined), 0);
});

test('clampTime keeps the playhead inside the episode', () => {
  assert.equal(clampTime(-5, 2880), 0);
  assert.equal(clampTime(3000, 2880), 2880);
  assert.equal(clampTime(120, 2880), 120);
});

test('volumeLabel renders a percentage', () => {
  assert.equal(volumeLabel(0.5), '50%');
  assert.equal(volumeLabel(2), '100%');
  assert.equal(volumeLabel(0), '0%');
});

test('state round-trips through serialize and parse', () => {
  const raw = serializeState({ episode: '141', time: 125.9, volume: 0.3, speedIndex: 2 });
  assert.deepEqual({ ...parseState(raw, 2880) }, { episode: '141', time: 125, volume: 0.3, speedIndex: 2 });
});

test('parseState rejects empty or corrupt storage', () => {
  assert.equal(parseState(null, 2880), null);
  assert.equal(parseState('', 2880), null);
  assert.equal(parseState('{not json', 2880), null);
  assert.equal(parseState('42', 2880), null);
});

test('parseState sanitizes out-of-range fields', () => {
  const s = parseState(JSON.stringify({ episode: 'x', time: 99999, volume: 9, speedIndex: 17 }), 2880);
  assert.deepEqual({ ...s }, { episode: '142', time: 2880, volume: 1, speedIndex: 0 });
  assert.equal(parseState('{}', 2880).volume, 1);
});

test('bookmark control prompts, persists, renders, and seeks to a saved moment', () => {
  class Element {
    constructor(id = '') {
      this.id = id;
      this.children = [];
      this.listeners = {};
      this.attributes = {};
      this.style = {};
      this.classList = { add() {}, remove() {}, toggle() {} };
      this.dataset = {};
      this.value = '';
      this.textContent = '';
    }
    addEventListener(type, listener) { this.listeners[type] = listener; }
    click() { this.listeners.click?.({ target: this }); }
    appendChild(child) { this.children.push(child); }
    replaceChildren(...children) { this.children = children; }
    setAttribute(name, value) { this.attributes[name] = value; }
    querySelector() { return null; }
  }

  const elements = new Map(['bookmark-moment-btn', 'bookmarks-tray', 'current-time-label',
    'dock-scrubber', 'scrubber-fill', 'player-dock', 'dock-volume'].map(id => [id, new Element(id)]));
  const storage = new Map();
  const listeners = {};
  const document = {
    body: { classList: { add() {} } },
    addEventListener(type, listener) { listeners[type] = listener; },
    getElementById(id) { return elements.get(id) || null; },
    createElement() { return new Element(); },
    querySelector() { return null; },
    querySelectorAll() { return []; }
  };
  const context = {
    document,
    localStorage: {
      getItem(key) { return storage.get(key) ?? null; },
      setItem(key, value) { storage.set(key, value); }
    },
    window: { prompt: () => '  Key idea  ' },
    console,
    setInterval: () => 1,
    clearInterval() {}
  };
  vm.runInNewContext(readFileSync(new URL('./player-logic.js', import.meta.url), 'utf8'), context);
  context.PlayerLogic = context.window.PlayerLogic;
  vm.runInNewContext(readFileSync(new URL('./script.js', import.meta.url), 'utf8'), context);
  listeners.DOMContentLoaded();

  elements.get('dock-scrubber').listeners.input({ target: { value: '125' } });
  elements.get('bookmark-moment-btn').click();

  assert.deepEqual(JSON.parse(storage.get('waveform-episode-bookmarks')), [{ time: 125, note: 'Key idea' }]);
  const tray = elements.get('bookmarks-tray');
  assert.equal(tray.children.length, 1);
  assert.match(tray.children[0].textContent, /02:05.*Key idea/);

  context.window.prompt = () => '  ';
  elements.get('bookmark-moment-btn').click();
  assert.equal(JSON.parse(storage.get('waveform-episode-bookmarks')).length, 1);

  tray.children[0].click();
  assert.equal(elements.get('current-time-label').textContent, '02:05');
  assert.equal(JSON.parse(storage.get('waveform-mini-player')).time, 125);
});
