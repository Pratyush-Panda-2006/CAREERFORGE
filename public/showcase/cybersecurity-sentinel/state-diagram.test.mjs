import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CybersecuritySentinelFsmVisualizer } from './state-diagram.js';

describe('CybersecuritySentinelFsmVisualizer', () => {
  it('initializes in MONITORING_SECURE state with predefined incident transitions', () => {
    const fsm = new CybersecuritySentinelFsmVisualizer();
    assert.equal(fsm.currentState, 'MONITORING_SECURE');
    assert.ok(fsm.transitions.length >= 6);
    assert.ok(fsm.states.has('ANOMALY_DETECTED'));
    assert.ok(fsm.states.has('QUARANTINE_ISOLATION'));
  });

  it('transitions sequentially through threat detection and remediation lifecycle', () => {
    const fsm = new CybersecuritySentinelFsmVisualizer();

    let res = fsm.dispatch('FLAG_ANOMALY');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'ANOMALY_DETECTED');

    res = fsm.dispatch('CORRELATE_THREAT');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'THREAT_ANALYSIS');

    res = fsm.dispatch('TRIGGER_CONTAINMENT');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'QUARANTINE_ISOLATION');

    res = fsm.dispatch('APPLY_REMEDIATION');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'INCIDENT_REMEDIATION');

    res = fsm.dispatch('START_AUDIT');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'FORENSIC_AUDIT');

    res = fsm.dispatch('CLEAR_POSTURE');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'MONITORING_SECURE');
  });

  it('guards against invalid event dispatching from mismatched states', () => {
    const fsm = new CybersecuritySentinelFsmVisualizer();
    const res = fsm.dispatch('CLEAR_POSTURE');
    assert.equal(res.success, false);
    assert.equal(fsm.currentState, 'MONITORING_SECURE');
    assert.match(res.error, /Cannot dispatch event/);
  });

  it('supports false positive dismissal and early downgrade to normal posture', () => {
    const fsm = new CybersecuritySentinelFsmVisualizer();
    fsm.dispatch('FLAG_ANOMALY');
    assert.equal(fsm.currentState, 'ANOMALY_DETECTED');

    const res = fsm.dispatch('DISMISS_FALSE_POSITIVE');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'MONITORING_SECURE');
  });

  it('dynamically registers custom transitions and expands state universe', () => {
    const fsm = new CybersecuritySentinelFsmVisualizer();
    fsm.addTransition('MONITORING_SECURE', 'SIMULATE_CHAOS', 'CHAOS_DRILL');
    assert.ok(fsm.states.has('CHAOS_DRILL'));

    const res = fsm.dispatch('SIMULATE_CHAOS');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'CHAOS_DRILL');
  });

  it('exports valid Mermaid.js stateDiagram-v2 definition with state transitions', () => {
    const fsm = new CybersecuritySentinelFsmVisualizer();
    const mermaid = fsm.exportMermaid();
    assert.match(mermaid, /^stateDiagram-v2/);
    assert.match(mermaid, /\[\*\] --> MONITORING_SECURE/);
    assert.match(mermaid, /MONITORING_SECURE --> ANOMALY_DETECTED : FLAG_ANOMALY/);
  });

  it('records chronological transition history and resets state safely', () => {
    const fsm = new CybersecuritySentinelFsmVisualizer();
    fsm.dispatch('FLAG_ANOMALY');
    fsm.dispatch('CORRELATE_THREAT');
    assert.equal(fsm.history.length, 2);

    fsm.reset();
    assert.equal(fsm.currentState, 'MONITORING_SECURE');
    assert.equal(fsm.history.length, 0);
  });
});
