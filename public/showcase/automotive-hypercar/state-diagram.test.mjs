import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AutomotiveHypercarFsmVisualizer } from './state-diagram.js';

describe('AutomotiveHypercarFsmVisualizer', () => {
  it('initializes in STANDBY_PARK state with predefined powertrain transitions', () => {
    const fsm = new AutomotiveHypercarFsmVisualizer();
    assert.equal(fsm.name, 'AutomotiveHypercarFsmVisualizer');
    assert.equal(fsm.currentState, 'STANDBY_PARK');
    assert.ok(fsm.transitions.length >= 8);
    assert.ok(fsm.states.has('ROAD_COMFORT'));
    assert.ok(fsm.states.has('TRACK_ATTACK'));
    assert.ok(fsm.states.has('DRS_OVERTAKE'));
  });

  it('transitions sequentially through track driving and DRS overtake lifecycle', () => {
    const fsm = new AutomotiveHypercarFsmVisualizer();

    let res = fsm.dispatch('ENGAGE_IGNITION');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'ROAD_COMFORT');

    res = fsm.dispatch('SELECT_TRACK_MODE');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'TRACK_ATTACK');

    res = fsm.dispatch('ACTIVATE_DRS');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'DRS_OVERTAKE');

    res = fsm.dispatch('BRAKE_TAP');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'TRACK_ATTACK');

    res = fsm.dispatch('COOL_DOWN');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'ROAD_COMFORT');

    res = fsm.dispatch('PARK_VEHICLE');
    assert.equal(res.success, true);
    assert.equal(fsm.currentState, 'STANDBY_PARK');
  });

  it('guards against invalid event dispatching from mismatched states', () => {
    const fsm = new AutomotiveHypercarFsmVisualizer();
    const res = fsm.dispatch('ACTIVATE_DRS');
    assert.equal(res.success, false);
    assert.equal(fsm.currentState, 'STANDBY_PARK');
    assert.match(res.error, /Cannot dispatch event/);
  });

  it('handles launch control arming and release properly', () => {
    const fsm = new AutomotiveHypercarFsmVisualizer();
    fsm.dispatch('ENGAGE_IGNITION');
    fsm.dispatch('SELECT_TRACK_MODE');
    assert.equal(fsm.currentState, 'TRACK_ATTACK');

    const armRes = fsm.dispatch('ARM_LAUNCH');
    assert.equal(armRes.success, true);
    assert.equal(fsm.currentState, 'LAUNCH_CONTROL');

    const launchRes = fsm.dispatch('RELEASE_BRAKE');
    assert.equal(launchRes.success, true);
    assert.equal(fsm.currentState, 'TRACK_ATTACK');
  });

  it('handles overheat limp mode recovery safely', () => {
    const fsm = new AutomotiveHypercarFsmVisualizer();
    fsm.dispatch('ENGAGE_IGNITION');
    fsm.dispatch('SELECT_TRACK_MODE');

    const limpRes = fsm.dispatch('THERMAL_SPIKE');
    assert.equal(limpRes.success, true);
    assert.equal(fsm.currentState, 'OVERHEAT_LIMP_MODE');

    const normRes = fsm.dispatch('TEMPS_NORMALIZED');
    assert.equal(normRes.success, true);
    assert.equal(fsm.currentState, 'ROAD_COMFORT');
  });

  it('exports valid Mermaid.js stateDiagram-v2 definition with state transitions', () => {
    const fsm = new AutomotiveHypercarFsmVisualizer();
    const mermaid = fsm.exportMermaid();
    assert.match(mermaid, /^stateDiagram-v2/);
    assert.match(mermaid, /\[\*\] --> STANDBY_PARK/);
    assert.match(mermaid, /STANDBY_PARK --> ROAD_COMFORT : ENGAGE_IGNITION/);
  });

  it('records chronological transition history and resets state safely', () => {
    const fsm = new AutomotiveHypercarFsmVisualizer();
    fsm.dispatch('ENGAGE_IGNITION');
    fsm.dispatch('SELECT_TRACK_MODE');
    assert.equal(fsm.history.length, 2);

    fsm.reset();
    assert.equal(fsm.currentState, 'STANDBY_PARK');
    assert.equal(fsm.history.length, 0);
  });
});
