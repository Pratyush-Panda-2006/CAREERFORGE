import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { VirtualMuseum3dFsmVisualizer } from './state-diagram.js';

describe('VirtualMuseum3dFsmVisualizer', () => {
  it('initializes with default MUSEUM_LOBBY state and museum states', () => {
    const fsm = new VirtualMuseum3dFsmVisualizer();
    assert.strictEqual(fsm.currentState, 'MUSEUM_LOBBY');
    assert.ok(fsm.states.has('GALLERY_NAVIGATION'));
    assert.ok(fsm.states.has('ARTIFACT_INSPECTION_3D'));
    assert.ok(fsm.states.has('VR_IMMERSION_MODE'));
  });

  it('executes valid sequential transitions along museum exploration lifecycle', () => {
    const fsm = new VirtualMuseum3dFsmVisualizer();

    const res1 = fsm.dispatch('ENTER_GALLERY');
    assert.strictEqual(res1.success, true);
    assert.strictEqual(fsm.currentState, 'GALLERY_NAVIGATION');

    const res2 = fsm.dispatch('SELECT_ARTIFACT');
    assert.strictEqual(res2.success, true);
    assert.strictEqual(fsm.currentState, 'ARTIFACT_INSPECTION_3D');

    const res3 = fsm.dispatch('PLAY_GUIDE');
    assert.strictEqual(res3.success, true);
    assert.strictEqual(fsm.currentState, 'AUDIO_GUIDE_PLAYBACK');

    const res4 = fsm.dispatch('STOP_GUIDE');
    assert.strictEqual(res4.success, true);
    assert.strictEqual(fsm.currentState, 'ARTIFACT_INSPECTION_3D');

    const res5 = fsm.dispatch('ACTIVATE_VR');
    assert.strictEqual(res5.success, true);
    assert.strictEqual(fsm.currentState, 'VR_IMMERSION_MODE');
  });

  it('rejects invalid transitions with error payload while protecting state', () => {
    const fsm = new VirtualMuseum3dFsmVisualizer();
    assert.strictEqual(fsm.currentState, 'MUSEUM_LOBBY');

    const invalid = fsm.dispatch('ACTIVATE_VR');
    assert.strictEqual(invalid.success, false);
    assert.strictEqual(fsm.currentState, 'MUSEUM_LOBBY');
    assert.match(invalid.error, /Cannot dispatch event/);
  });

  it('supports custom transition additions and cyclic execution', () => {
    const fsm = new VirtualMuseum3dFsmVisualizer();
    fsm.addTransition('MUSEUM_LOBBY', 'SECRET_VAULT', 'UNDERGROUND_VAULT');
    fsm.addTransition('UNDERGROUND_VAULT', 'EXIT_VAULT', 'MUSEUM_LOBBY');

    const res1 = fsm.dispatch('SECRET_VAULT');
    assert.strictEqual(res1.success, true);
    assert.strictEqual(fsm.currentState, 'UNDERGROUND_VAULT');

    const res2 = fsm.dispatch('EXIT_VAULT');
    assert.strictEqual(res2.success, true);
    assert.strictEqual(fsm.currentState, 'MUSEUM_LOBBY');
  });

  it('exports valid Mermaid.js stateDiagram-v2 definition', () => {
    const fsm = new VirtualMuseum3dFsmVisualizer();
    const mermaid = fsm.exportMermaid();

    assert.ok(mermaid.startsWith('stateDiagram-v2'));
    assert.ok(mermaid.includes('[*] --> MUSEUM_LOBBY'));
    assert.ok(mermaid.includes('MUSEUM_LOBBY --> GALLERY_NAVIGATION : ENTER_GALLERY'));
  });

  it('maintains history log and resets state reliably', () => {
    const fsm = new VirtualMuseum3dFsmVisualizer();
    fsm.dispatch('ENTER_GALLERY');
    fsm.dispatch('SELECT_ARTIFACT');

    assert.strictEqual(fsm.history.length, 2);
    fsm.reset();

    assert.strictEqual(fsm.currentState, 'MUSEUM_LOBBY');
    assert.strictEqual(fsm.history.length, 0);
  });
});
