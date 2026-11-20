import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SmartIotNexusFsmVisualizer } from './state-diagram.js';

describe('SmartIotNexusFsmVisualizer', () => {
  it('initializes with default DEVICE_DISCONNECTED state and IoT states', () => {
    const fsm = new SmartIotNexusFsmVisualizer();
    assert.strictEqual(fsm.currentState, 'DEVICE_DISCONNECTED');
    assert.ok(fsm.states.has('PAIRING_HANDSHAKE'));
    assert.ok(fsm.states.has('ACTIVE_TELEMETRY_STREAM'));
    assert.ok(fsm.states.has('FIRMWARE_OTA_UPDATE'));
  });

  it('executes valid sequential transitions along IoT device lifecycle', () => {
    const fsm = new SmartIotNexusFsmVisualizer();

    const res1 = fsm.dispatch('PROVISION');
    assert.strictEqual(res1.success, true);
    assert.strictEqual(fsm.currentState, 'PAIRING_HANDSHAKE');

    const res2 = fsm.dispatch('HANDSHAKE_ACK');
    assert.strictEqual(res2.success, true);
    assert.strictEqual(fsm.currentState, 'ACTIVE_TELEMETRY_STREAM');

    const res3 = fsm.dispatch('PUSH_OTA');
    assert.strictEqual(res3.success, true);
    assert.strictEqual(fsm.currentState, 'FIRMWARE_OTA_UPDATE');

    const res4 = fsm.dispatch('OTA_SUCCESS');
    assert.strictEqual(res4.success, true);
    assert.strictEqual(fsm.currentState, 'ACTIVE_TELEMETRY_STREAM');

    const res5 = fsm.dispatch('LOW_BATTERY');
    assert.strictEqual(res5.success, true);
    assert.strictEqual(fsm.currentState, 'POWER_SAVE_SLEEP');
  });

  it('rejects invalid transitions with error payload while protecting state', () => {
    const fsm = new SmartIotNexusFsmVisualizer();
    assert.strictEqual(fsm.currentState, 'DEVICE_DISCONNECTED');

    const invalid = fsm.dispatch('PUSH_OTA');
    assert.strictEqual(invalid.success, false);
    assert.strictEqual(fsm.currentState, 'DEVICE_DISCONNECTED');
    assert.match(invalid.error, /Cannot dispatch event/);
  });

  it('supports custom transition additions and cyclic execution', () => {
    const fsm = new SmartIotNexusFsmVisualizer();
    fsm.addTransition('DEVICE_DISCONNECTED', 'CALIBRATE_MESH', 'MESH_TOPOLOGY_CALIBRATION');
    fsm.addTransition('MESH_TOPOLOGY_CALIBRATION', 'CALIBRATION_OK', 'DEVICE_DISCONNECTED');

    const res1 = fsm.dispatch('CALIBRATE_MESH');
    assert.strictEqual(res1.success, true);
    assert.strictEqual(fsm.currentState, 'MESH_TOPOLOGY_CALIBRATION');

    const res2 = fsm.dispatch('CALIBRATION_OK');
    assert.strictEqual(res2.success, true);
    assert.strictEqual(fsm.currentState, 'DEVICE_DISCONNECTED');
  });

  it('exports valid Mermaid.js stateDiagram-v2 definition', () => {
    const fsm = new SmartIotNexusFsmVisualizer();
    const mermaid = fsm.exportMermaid();

    assert.ok(mermaid.startsWith('stateDiagram-v2'));
    assert.ok(mermaid.includes('[*] --> DEVICE_DISCONNECTED'));
    assert.ok(mermaid.includes('DEVICE_DISCONNECTED --> PAIRING_HANDSHAKE : PROVISION'));
  });

  it('maintains history log and resets state reliably', () => {
    const fsm = new SmartIotNexusFsmVisualizer();
    fsm.dispatch('PROVISION');
    fsm.dispatch('HANDSHAKE_ACK');

    assert.strictEqual(fsm.history.length, 2);
    fsm.reset();

    assert.strictEqual(fsm.currentState, 'DEVICE_DISCONNECTED');
    assert.strictEqual(fsm.history.length, 0);
  });
});
