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
