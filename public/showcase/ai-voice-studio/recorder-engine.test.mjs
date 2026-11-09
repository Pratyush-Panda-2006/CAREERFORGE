import test from 'node:test';
import assert from 'node:assert/strict';
import { VoiceRecorder } from './recorder-engine.js';
function fixture(overrides = {}) {
  const calls = { stopped: 0, closed: 0, revoked: [], urls: [], timers: [] };
  const stream = { getTracks: () => [{ stop: () => calls.stopped++ }] };
  const recorder = { state: 'inactive', mimeType: 'audio/webm', start() { this.state = 'recording'; }, stop() { this.state = 'inactive'; }, finish(blob = new Blob(['sample'])) { this.ondataavailable({ data: blob }); this.onstop(); } };
  const analyser = { disconnect() {} }; const source = { connect(value) { assert.equal(value, analyser); }, disconnect() {} };
  const context = { resume: async () => {}, close: async () => { calls.closed++; }, createAnalyser: () => analyser, createMediaStreamSource: () => source };
  const api = { getStream: async () => stream, createContext: () => context, createRecorder: () => recorder,
    setTimeout: (callback, delay) => { calls.timers.push({ callback, delay }); return 1; }, clearTimeout() {},
    createURL: blob => { calls.urls.push(blob); return 'blob:sample'; }, revokeURL: url => calls.revoked.push(url), ...overrides };
  const events = []; const engine = new VoiceRecorder(api, event => events.push(event));
  return { engine, calls, stream, recorder, events, api };
}
test('record, stop and preview keep real blob MIME and release capture', async () => {
  const f = fixture(); await f.engine.start(); assert.equal(f.engine.state, 'recording');
  assert.equal(f.calls.timers[0].delay, 30000); assert.equal(f.engine.analyser.fftSize, 1024);
  f.engine.stop(); assert.equal(f.engine.state, 'stopping'); assert.ok(f.calls.stopped);
  f.recorder.finish(); assert.equal(f.engine.state, 'ready'); assert.equal(f.calls.closed, 1);
  assert.equal(f.calls.urls[0].type, 'audio/webm'); assert.equal(await f.calls.urls[0].text(), 'sample');
  f.engine.cancel(); assert.deepEqual(f.calls.revoked, ['blob:sample']); assert.equal(f.engine.state, 'idle');
});
test('permission denial is recoverable and never creates a preview', async () => {
  const f = fixture({ getStream: async () => { throw Object.assign(new Error(), { name: 'NotAllowedError' }); } });
  await f.engine.start(); assert.equal(f.engine.state, 'error'); assert.match(f.events.at(-1).message, /denied/);
  f.api.getStream = async () => f.stream; await f.engine.start(); assert.equal(f.engine.state, 'recording');
});
test('cancelled permission request stops late-acquired microphone tracks', async () => {
  let resolve; const f = fixture({ getStream: () => new Promise(done => { resolve = done; }) });
  const pending = f.engine.start(); f.engine.cancel(); resolve(f.stream); await pending;
  assert.equal(f.engine.state, 'idle'); assert.equal(f.calls.stopped, 1); assert.equal(f.calls.urls.length, 0);
});
test('duplicate start and stop calls cannot create concurrent sessions', async () => {
  let acquired = 0; const f = fixture(); const original = f.api.getStream;
  f.api.getStream = () => { acquired++; return original(); };
  await Promise.all([f.engine.start(), f.engine.start()]); await f.engine.start(); assert.equal(acquired, 1);
  f.engine.stop(); f.engine.stop(); f.recorder.finish(); assert.equal(f.calls.urls.length, 1);
});
test('cancel ignores late data/stop events and revokes previous preview on rerecord', async () => {
  const f = fixture(); await f.engine.start(); f.engine.stop(); f.recorder.finish();
  await f.engine.start(); assert.deepEqual(f.calls.revoked, ['blob:sample']);
  f.engine.cancel(); f.recorder.finish(); assert.equal(f.engine.state, 'idle'); assert.equal(f.calls.urls.length, 1);
});
test('setup failure releases the microphone and audio context', async () => {
  const f = fixture({ createRecorder: () => { throw new Error('unsupported codec'); } });
  await f.engine.start(); assert.equal(f.engine.state, 'error'); assert.equal(f.calls.closed, 1); assert.ok(f.calls.stopped);
});
test('automatic limit finishes recording and empty audio gives an error', async () => {
  const f = fixture(); await f.engine.start(); f.calls.timers[0].callback(); assert.equal(f.engine.state, 'stopping');
  f.recorder.finish(new Blob([])); assert.equal(f.engine.state, 'error'); assert.equal(f.calls.urls.length, 0);
});
test('recorder error invalidates callbacks and releases resources', async () => {
  const f = fixture(); await f.engine.start(); f.recorder.onerror(); f.recorder.finish();
  assert.equal(f.engine.state, 'error'); assert.equal(f.calls.closed, 1); assert.equal(f.calls.urls.length, 0);
});
