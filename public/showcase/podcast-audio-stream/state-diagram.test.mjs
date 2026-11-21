import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PodcastAudioStreamFsmVisualizer } from './state-diagram.js';

describe('PodcastAudioStreamFsmVisualizer', () => {
  it('initializes in EPISODE_PLANNING state with predefined production transitions', () => {
    const fsm = new PodcastAudioStreamFsmVisualizer();
    assert.equal(fsm.currentState, 'EPISODE_PLANNING');
    assert.ok(fsm.transitions.length >= 6);
    assert.ok(fsm.states.has('AUDIO_RECORDING'));
    assert.ok(fsm.states.has('EPISODE_PUBLISHED'));
  });

  it('transitions sequentially through podcast episode production lifecycle', () => {
    const fsm = new PodcastAudioStreamFsmVisualizer();

    let res = fsm.dispatch('START_RECORDING');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'AUDIO_RECORDING');

    res = fsm.dispatch('FINISH_TRACK_RECORD');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'POST_EDITING_MIX');

    res = fsm.dispatch('DRAFT_SHOW_NOTES');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'SHOW_NOTES_DRAFT');

    res = fsm.dispatch('ATTACH_SPONSORS');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'SPONSOR_INSERTION');

    res = fsm.dispatch('DISTRIBUTE_FEED');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'EPISODE_PUBLISHED');

    res = fsm.dispatch('PLAN_NEXT_SEASON');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'EPISODE_PLANNING');
  });

  it('guards against invalid event dispatching from mismatched states', () => {
    const fsm = new PodcastAudioStreamFsmVisualizer();
    const res = fsm.dispatch('DISTRIBUTE_FEED');
    assert.equal(res.success, false);
    assert.equal(fsm.currentState, 'EPISODE_PLANNING');
    assert.match(res.error, /Cannot dispatch event/);
  });

  it('supports audio re-recording and mix revision loops', () => {
    const fsm = new PodcastAudioStreamFsmVisualizer();
    fsm.dispatch('START_RECORDING');
    fsm.dispatch('FINISH_TRACK_RECORD');
    assert.equal(fsm.currentState, 'POST_EDITING_MIX');

    const res = fsm.dispatch('RE_RECORD_SEGMENT');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'AUDIO_RECORDING');
  });

  it('dynamically registers custom transitions and expands state universe', () => {
    const fsm = new PodcastAudioStreamFsmVisualizer();
    fsm.addTransition('EPISODE_PLANNING', 'EMERGENCY_LIVE_STREAM', 'LIVE_BROADCAST');

    const res = fsm.dispatch('EMERGENCY_LIVE_STREAM');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'LIVE_BROADCAST');
  });

  it('exports valid Mermaid.js stateDiagram-v2 definition with state transitions', () => {
    const fsm = new PodcastAudioStreamFsmVisualizer();
    const mermaid = fsm.exportMermaid();
    assert.match(mermaid, /^stateDiagram-v2/);
    assert.match(mermaid, /\[\*\] --> EPISODE_PLANNING/);
    assert.match(mermaid, /EPISODE_PLANNING --> AUDIO_RECORDING : START_RECORDING/);
  });

  it('records chronological transition history and resets state safely', () => {
    const fsm = new PodcastAudioStreamFsmVisualizer();
    fsm.dispatch('START_RECORDING');
    fsm.dispatch('FINISH_TRACK_RECORD');
    assert.equal(fsm.history.length, 2);

    fsm.reset();
    assert.equal(fsm.currentState, 'EPISODE_PLANNING');
    assert.equal(fsm.history.length, 0);
  });
});
