import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AiVoiceStudioFsmVisualizer } from './state-diagram.js';

describe('AiVoiceStudioFsmVisualizer', () => {
  it('initializes in STUDIO_IDLE state with predefined voice transitions', () => {
    const fsm = new AiVoiceStudioFsmVisualizer();
    assert.equal(fsm.name, 'AiVoiceStudioFsmVisualizer');
    assert.equal(fsm.currentState, 'STUDIO_IDLE');
    assert.ok(fsm.transitions.length >= 6);
    assert.ok(fsm.states.has('AUDIO_RECORDING'));
    assert.ok(fsm.states.has('NEURAL_SYNTHESIS'));
  });

  it('transitions sequentially through speech recording and mastering lifecycle', () => {
    const fsm = new AiVoiceStudioFsmVisualizer();

    let res = fsm.dispatch('START_RECORDING');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'AUDIO_RECORDING');

    res = fsm.dispatch('STOP_RECORDING');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'VOICE_ANALYSIS');

    res = fsm.dispatch('TRIGGER_SYNTHESIS');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'NEURAL_SYNTHESIS');

    res = fsm.dispatch('START_MASTERING');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'MASTERING_EXPORT');

    res = fsm.dispatch('EXPORT_COMPLETE');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'STUDIO_IDLE');
  });

  it('guards against invalid event dispatching from mismatched states', () => {
    const fsm = new AiVoiceStudioFsmVisualizer();
    const res = fsm.dispatch('EXPORT_COMPLETE');
    assert.equal(res.success, false);
    assert.equal(fsm.currentState, 'STUDIO_IDLE');
    assert.match(res.error, /Cannot dispatch event/);
  });

  it('handles input clipping error recovery correctly', () => {
    const fsm = new AiVoiceStudioFsmVisualizer();
    fsm.dispatch('START_RECORDING');
    assert.equal(fsm.currentState, 'AUDIO_RECORDING');

    const errRes = fsm.dispatch('DETECT_CLIPPING');
    assert.equal(errRes.success, true);
    assert.equal(fsm.currentState, 'INPUT_CLIPPING_ERROR');

    const resetRes = fsm.dispatch('RESET_LIMITER');
    assert.equal(resetRes.success, true);
    assert.equal(fsm.currentState, 'STUDIO_IDLE');
  });

  it('dynamically registers custom transitions and expands state universe', () => {
    const fsm = new AiVoiceStudioFsmVisualizer();
    fsm.addTransition('STUDIO_IDLE', 'LOAD_STEMS', 'MULTI_TRACK_SESSION');
    assert.ok(fsm.states.has('MULTI_TRACK_SESSION'));

    const res = fsm.dispatch('LOAD_STEMS');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'MULTI_TRACK_SESSION');
  });

  it('exports valid Mermaid.js stateDiagram-v2 definition with state transitions', () => {
    const fsm = new AiVoiceStudioFsmVisualizer();
    const mermaid = fsm.exportMermaid();
    assert.match(mermaid, /^stateDiagram-v2/);
    assert.match(mermaid, /\[\*\] --> STUDIO_IDLE/);
    assert.match(mermaid, /STUDIO_IDLE --> AUDIO_RECORDING : START_RECORDING/);
  });

  it('records chronological transition history and resets state safely', () => {
    const fsm = new AiVoiceStudioFsmVisualizer();
    fsm.dispatch('START_RECORDING');
    fsm.dispatch('STOP_RECORDING');
    assert.equal(fsm.history.length, 2);

    fsm.reset();
    assert.equal(fsm.currentState, 'STUDIO_IDLE');
    assert.equal(fsm.history.length, 0);
  });
});
