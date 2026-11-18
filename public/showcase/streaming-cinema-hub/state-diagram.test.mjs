import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { StreamingCinemaHubFsmVisualizer } from './state-diagram.js';

describe('StreamingCinemaHubFsmVisualizer', () => {
  it('initializes with default IDLE_BROWSE state and playback states', () => {
    const fsm = new StreamingCinemaHubFsmVisualizer();
    assert.strictEqual(fsm.currentState, 'IDLE_BROWSE');
    assert.ok(fsm.states.has('PLAYING_4K_STREAM'));
    assert.ok(fsm.states.has('DOWNLOAD_OFFLINE'));
  });

  it('executes valid sequential transitions along cinema playback lifecycle', () => {
    const fsm = new StreamingCinemaHubFsmVisualizer();

    const res1 = fsm.dispatch('SELECT_TITLE');
    assert.strictEqual(res1.success, true);
    assert.strictEqual(fsm.currentState, 'PREVIEW_BUFFERING');

    const res2 = fsm.dispatch('BUFFER_COMPLETE');
    assert.strictEqual(res2.success, true);
    assert.strictEqual(fsm.currentState, 'PLAYING_4K_STREAM');

    const res3 = fsm.dispatch('PAUSE');
    assert.strictEqual(res3.success, true);
    assert.strictEqual(fsm.currentState, 'PLAYBACK_PAUSED');

    const res4 = fsm.dispatch('RESUME');
    assert.strictEqual(res4.success, true);
    assert.strictEqual(fsm.currentState, 'PLAYING_4K_STREAM');
  });

  it('rejects invalid transitions with error payload while protecting state', () => {
    const fsm = new StreamingCinemaHubFsmVisualizer();
    assert.strictEqual(fsm.currentState, 'IDLE_BROWSE');

    const invalid = fsm.dispatch('RESUME');
    assert.strictEqual(invalid.success, false);
    assert.strictEqual(fsm.currentState, 'IDLE_BROWSE');
    assert.match(invalid.error, /Cannot dispatch event/);
  });

  it('supports custom transition additions and cyclic execution', () => {
    const fsm = new StreamingCinemaHubFsmVisualizer();
    fsm.addTransition('IDLE_BROWSE', 'VR_MODE', 'VR_CINEMA_IMMERSIVE');
    fsm.addTransition('VR_CINEMA_IMMERSIVE', 'EXIT_VR', 'IDLE_BROWSE');

    const res1 = fsm.dispatch('VR_MODE');
    assert.strictEqual(res1.success, true);
    assert.strictEqual(fsm.currentState, 'VR_CINEMA_IMMERSIVE');

    const res2 = fsm.dispatch('EXIT_VR');
    assert.strictEqual(res2.success, true);
    assert.strictEqual(fsm.currentState, 'IDLE_BROWSE');
  });

  it('exports valid Mermaid.js stateDiagram-v2 definition', () => {
    const fsm = new StreamingCinemaHubFsmVisualizer();
    const mermaid = fsm.exportMermaid();

    assert.ok(mermaid.startsWith('stateDiagram-v2'));
    assert.ok(mermaid.includes('[*] --> IDLE_BROWSE'));
    assert.ok(mermaid.includes('IDLE_BROWSE --> PREVIEW_BUFFERING : SELECT_TITLE'));
  });

  it('maintains history log and resets state reliably', () => {
    const fsm = new StreamingCinemaHubFsmVisualizer();
    fsm.dispatch('SELECT_TITLE');
    fsm.dispatch('BUFFER_COMPLETE');

    assert.strictEqual(fsm.history.length, 2);
    fsm.reset();

    assert.strictEqual(fsm.currentState, 'IDLE_BROWSE');
    assert.strictEqual(fsm.history.length, 0);
  });
});
