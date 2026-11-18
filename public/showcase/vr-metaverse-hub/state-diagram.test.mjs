import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { VrMetaverseHubFsmVisualizer } from './state-diagram.js';

describe('VrMetaverseHubFsmVisualizer', () => {
  it('initializes with default DISCONNECTED state and avatar transitions', () => {
    const fsm = new VrMetaverseHubFsmVisualizer();
    assert.equal(fsm.getState(), 'DISCONNECTED');
    assert.ok(fsm.getTransitions().length >= 10);
    const available = fsm.getAvailableEvents();
    assert.ok(available.some((e) => e.event === 'POWER_ON_HMD'));
  });

  it('updates state upon valid dispatched immersion transitions', () => {
    const fsm = new VrMetaverseHubFsmVisualizer();
    const result1 = fsm.dispatch('POWER_ON_HMD');
    assert.equal(result1.previousState, 'DISCONNECTED');
    assert.equal(result1.currentState, 'HMD_CALIBRATING');
    assert.equal(fsm.getState(), 'HMD_CALIBRATING');

    const result2 = fsm.dispatch('CALIBRATION_SUCCESS');
    assert.equal(result2.currentState, 'LOBBY_PORTAL');
    assert.equal(fsm.getState(), 'LOBBY_PORTAL');
  });

  it('enforces guards against invalid transition dispatches', () => {
    const fsm = new VrMetaverseHubFsmVisualizer();
    assert.throws(() => {
      fsm.dispatch('ENTER_GATEWAY');
    }, /Invalid transition/);
    assert.equal(fsm.getState(), 'DISCONNECTED');
  });

  it('supports custom transition additions and cyclic graph execution', () => {
    const fsm = new VrMetaverseHubFsmVisualizer({
      initialState: 'AVATAR_CUSTOMIZATION',
      transitions: []
    });
    fsm.addTransition('AVATAR_CUSTOMIZATION', 'SAVE_AVATAR', 'MIRROR_ROOM');
    fsm.addTransition('MIRROR_ROOM', 'EDIT_SKIN', 'AVATAR_CUSTOMIZATION');

    assert.equal(fsm.getState(), 'AVATAR_CUSTOMIZATION');
    fsm.dispatch('SAVE_AVATAR');
    assert.equal(fsm.getState(), 'MIRROR_ROOM');
    fsm.dispatch('EDIT_SKIN');
    assert.equal(fsm.getState(), 'AVATAR_CUSTOMIZATION');
  });

  it('exports valid Mermaid.js stateDiagram-v2 definition', () => {
    const fsm = new VrMetaverseHubFsmVisualizer();
    const mermaid = fsm.exportMermaid();
    assert.ok(mermaid.startsWith('stateDiagram-v2'));
    assert.ok(mermaid.includes('[*] --> DISCONNECTED'));
    assert.ok(mermaid.includes('DISCONNECTED --> HMD_CALIBRATING: POWER_ON_HMD'));
  });

  it('records transition audit log and resets safely', () => {
    const fsm = new VrMetaverseHubFsmVisualizer();
    fsm.dispatch('POWER_ON_HMD');
    fsm.reset();
    assert.equal(fsm.getState(), 'DISCONNECTED');
    const history = fsm.getHistory();
    assert.ok(history.length >= 3);
    assert.equal(history[0].event, 'RESET');
  });
});
