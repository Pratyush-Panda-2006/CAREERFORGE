import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DroneDeliverySkywaySoundSynthesizer, scopePoints, SOUNDS } from './audio-synthesizer.js';

// A stand in for AudioContext that records the notes scheduled on it.
function fakeAudio() {
  const log = { contexts: 0, resumed: 0, notes: [], gains: [] };
  const context = {
    currentTime: 5,
    state: 'suspended',
    destination: {},
    resume() { log.resumed += 1; this.state = 'running'; },
    createAnalyser: () => ({ connect() {} }),
    createGain() {
      const node = {
        gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() {},
        disconnect() {},
      };
      log.gains.push(node);
      return node;
    },
    createOscillator() {
      const note = { connect() {} };
      note.frequency = { setValueAtTime: (value) => { note.freq = value; } };
      note.start = (at) => { note.from = at; };
      note.stop = (at) => { note.to = at; };
      log.notes.push(note);
      return note;
    },
  };
  const synth = new DroneDeliverySkywaySoundSynthesizer({
    createContext: () => { log.contexts += 1; return context; },
  });
  return { synth, context, log };
}

test('no audio context exists until a sound is played', () => {
  const { synth, log } = fakeAudio();
  synth.setVolume(0.3);
  assert.equal(log.contexts, 0);
  assert.equal(synth.isPlaying(), false);
  synth.playClick();
  synth.playClick();
  assert.equal(log.contexts, 1);
  assert.equal(log.resumed, 1);
});

test('playTone schedules the note it was asked for', () => {
  const { synth, log } = fakeAudio();
  assert.equal(synth.playTone(330, 'square', 0.4, 1), true);
  const [note] = log.notes;
  assert.equal(note.freq, 330);
  assert.equal(note.type, 'square');
  assert.equal(note.from, 6);
  assert.equal(note.to, 6.4);
});

test('playTone rejects unusable values without building a context', () => {
  const { synth, log } = fakeAudio();
  for (const [freq, duration] of [[0, 1], [-5, 1], [Number.NaN, 1], [440, 0], [440, Infinity]]) {
    assert.equal(synth.playTone(freq, 'sine', duration), false);
  }
  assert.equal(log.contexts, 0);
});

test('setVolume clamps the level and ignores non numbers', () => {
  const { synth } = fakeAudio();
  assert.equal(synth.setVolume(2), 1);
  assert.equal(synth.setVolume(-1), 0);
  assert.equal(synth.setVolume(0.4), 0.4);
  assert.equal(synth.setVolume('0.9'), 0.4);
  assert.equal(synth.setVolume(Number.NaN), 0.4);
});

test('mute silences the output and unmute restores the level', () => {
  const { synth, log } = fakeAudio();
  synth.setVolume(0.6);
  synth.playClick();
  const output = log.gains[0];
  assert.equal(output.gain.value, 0.6);
  synth.setMuted(true);
  assert.equal(output.gain.value, 0);
  synth.setMuted(false);
  assert.equal(output.gain.value, 0.6);
});

test('the success chime climbs and the error buzzer falls low', () => {
  const { synth, log } = fakeAudio();
  synth.playSuccessChime();
  const chime = log.notes.splice(0).map((note) => note.freq);
  assert.equal(chime.length, 3);
  assert.ok(chime[0] < chime[1] && chime[1] < chime[2]);

  synth.playErrorBuzzer();
  const buzz = log.notes.map((note) => note.freq);
  assert.ok(buzz[1] < buzz[0] && buzz[0] < 200);
});

test('every named sound plays and unknown names do not', () => {
  const { synth, log } = fakeAudio();
  for (const name of Object.keys(SOUNDS)) assert.equal(synth.play(name), true);
  assert.equal(log.notes.length, Object.values(SOUNDS).flat().length);
  assert.equal(synth.play('toString'), false);
});

test('isPlaying lasts until the final note ends', () => {
  const { synth, context } = fakeAudio();
  synth.playTone(440, 'sine', 0.5);
  context.currentTime = 5.4;
  assert.equal(synth.isPlaying(), true);
  context.currentTime = 5.5;
  assert.equal(synth.isPlaying(), false);
});

test('scopePoints spans the canvas', () => {
  assert.deepEqual(scopePoints([0, 255, 0], 100, 50), [[0, 0], [50, 50], [100, 0]]);
});
