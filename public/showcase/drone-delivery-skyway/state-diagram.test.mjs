import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DroneDeliverySkywayFsmVisualizer } from './state-diagram.js';

describe('DroneDeliverySkywayFsmVisualizer', () => {
  it('initializes with default HANGAR_DOCKED state and flight transitions', () => {
    const fsm = new DroneDeliverySkywayFsmVisualizer();
    assert.equal(fsm.getState(), 'HANGAR_DOCKED');
    assert.ok(fsm.getTransitions().length >= 10);
    const available = fsm.getAvailableEvents();
    assert.ok(available.some((e) => e.event === 'BOOT_SYSTEMS'));
  });

  it('updates state upon valid dispatched flight envelope transitions', () => {
    const fsm = new DroneDeliverySkywayFsmVisualizer();
    const result1 = fsm.dispatch('BOOT_SYSTEMS');
    assert.equal(result1.previousState, 'HANGAR_DOCKED');
    assert.equal(result1.currentState, 'PRE_FLIGHT_CHECK');
    assert.equal(fsm.getState(), 'PRE_FLIGHT_CHECK');

    const result2 = fsm.dispatch('TELEMETRY_VALIDATED');
    assert.equal(result2.currentState, 'TAKEOFF_ASCENDING');
    assert.equal(fsm.getState(), 'TAKEOFF_ASCENDING');

    const result3 = fsm.dispatch('CRUISE_ALTITUDE_REACHED');
    assert.equal(result3.currentState, 'EN_ROUTE_WAYPOINT');
    assert.equal(fsm.getState(), 'EN_ROUTE_WAYPOINT');
  });

  it('enforces guards against invalid transition dispatches', () => {
    const fsm = new DroneDeliverySkywayFsmVisualizer();
    assert.throws(() => {
      fsm.dispatch('DISENGAGE_PAYLOAD');
    }, /Invalid transition/);
    assert.equal(fsm.getState(), 'HANGAR_DOCKED');
  });

  it('supports custom transition additions and cyclic obstacle detour execution', () => {
    const fsm = new DroneDeliverySkywayFsmVisualizer({
      initialState: 'CORRIDOR_HOLD',
      transitions: []
    });
    fsm.addTransition('CORRIDOR_HOLD', 'RADAR_SCAN_CLEAR', 'RESUME_MISSION');
    fsm.addTransition('RESUME_MISSION', 'TRAFFIC_DETECTED', 'CORRIDOR_HOLD');

    assert.equal(fsm.getState(), 'CORRIDOR_HOLD');
    fsm.dispatch('RADAR_SCAN_CLEAR');
    assert.equal(fsm.getState(), 'RESUME_MISSION');
    fsm.dispatch('TRAFFIC_DETECTED');
    assert.equal(fsm.getState(), 'CORRIDOR_HOLD');
  });

  it('exports valid Mermaid.js stateDiagram-v2 definition', () => {
    const fsm = new DroneDeliverySkywayFsmVisualizer();
    const mermaid = fsm.exportMermaid();
    assert.ok(mermaid.startsWith('stateDiagram-v2'));
    assert.ok(mermaid.includes('[*] --> HANGAR_DOCKED'));
    assert.ok(mermaid.includes('HANGAR_DOCKED --> PRE_FLIGHT_CHECK: BOOT_SYSTEMS'));
  });

  it('records transition audit log and resets safely', () => {
    const fsm = new DroneDeliverySkywayFsmVisualizer();
    fsm.dispatch('BOOT_SYSTEMS');
    fsm.reset();
    assert.equal(fsm.getState(), 'HANGAR_DOCKED');
    assert.ok(fsm.getHistory().length >= 3);
  });
});
