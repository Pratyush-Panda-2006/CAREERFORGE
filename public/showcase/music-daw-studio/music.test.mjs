import test from 'node:test';
import assert from 'node:assert/strict';
import { noteToFrequency } from './script.js';

test('MIDI note 69 produces 440 Hz (A4)', () => {
  assert.equal(noteToFrequency(69), 440.0);
});

test('MIDI note 60 produces approx 261.63 Hz (Middle C)', () => {
  assert.equal(noteToFrequency(60), 261.63);
});