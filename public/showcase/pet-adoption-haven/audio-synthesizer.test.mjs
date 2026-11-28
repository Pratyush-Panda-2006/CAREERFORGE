import assert from 'node:assert/strict';
import { test } from 'node:test';
import { PetAdoptionHavenSoundSynthesizer } from './audio-synthesizer.js';

// Just enough of the Web Audio API to record what gets scheduled.
function fakeContext() {
  const log = { notes: [], gains: [], resumed: 0, created: 0 };
  const context = {
    currentTime: 10,
    state: 'suspended',
    destination: {},
    resume() { log.resumed += 1; this.state = 'running'; },
    createAnalyser: () => ({ connect() {} }),
    createGain: () => {
      const node = {
        gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {},
      };
      log.gains.push(node);
      return node;
    },
    createOscillator: () => {
      const note = { frequency: { value: 0 }, connect() {} };
      note.start = (at) => { note.from = at; };
      note.stop = (at) => { note.to = at; };
      log.notes.push(note);
      return note;
    },
  };
  const createContext = () => { log.created += 1; return context; };
  return { createContext, log };
}

test('creates and resumes the audio context only when a sound is played', () => {
  const { createContext, log } = fakeContext();
  const synth = new PetAdoptionHavenSoundSynthesizer({ createContext });
  synth.setVolume(0.5);
  assert.equal(log.created, 0);

  synth.playClick();
  synth.playClick();
  assert.equal(log.created, 1);
  assert.equal(log.resumed, 1);
});

test('playTone schedules the requested note', () => {
  const { createContext, log } = fakeContext();
  const synth = new PetAdoptionHavenSoundSynthesizer({ createContext });
  assert.equal(synth.playTone(220, 'square', 0.5, 1), true);

  const [note] = log.notes;
  assert.equal(note.type, 'square');
  assert.equal(note.frequency.value, 220);
  assert.equal(note.from, 11);
  assert.equal(note.to, 11.5);
});

test('playTone ignores unusable input', () => {
  const { createContext, log } = fakeContext();
  const synth = new PetAdoptionHavenSoundSynthesizer({ createContext });
  assert.equal(synth.playTone(0), false);
  assert.equal(synth.playTone(440, 'sine', -1), false);
  assert.equal(log.created, 0);
});

test('volume is clamped and mute silences the output without losing the level', () => {
  const { createContext, log } = fakeContext();
  const synth = new PetAdoptionHavenSoundSynthesizer({ createContext });
  assert.equal(synth.setVolume(5), 1);
  assert.equal(synth.setVolume(Number.NaN), 1);
  synth.setVolume(0.25);
  synth.playClick();
  const master = log.gains[0];
  assert.equal(master.gain.value, 0.25);

  synth.setMuted(true);
  assert.equal(master.gain.value, 0);
  synth.setMuted(false);
  assert.equal(master.gain.value, 0.25);
});

test('success rises in pitch and the error buzzer stays low', () => {
  const { createContext, log } = fakeContext();
  const synth = new PetAdoptionHavenSoundSynthesizer({ createContext });
  synth.playSuccessChime();
  const chime = log.notes.splice(0).map((n) => n.frequency.value);
  assert.deepEqual(chime, [...chime].sort((a, b) => a - b));
  assert.equal(chime.length, 3);

  synth.playErrorBuzzer();
  assert.ok(log.notes.every((n) => n.frequency.value < 200 && n.type === 'sawtooth'));
});
