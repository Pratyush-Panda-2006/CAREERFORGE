import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AutomotiveHypercarTelemetryLedger,
  GENESIS_PREVIOUS_HASH,
  hashTelemetryPayload,
  createInitialTelemetryState
} from './event-ledger.js';

test('AutomotiveHypercarTelemetryLedger - initialization and genesis baseline state', () => {
  const ledger = new AutomotiveHypercarTelemetryLedger();
  const state = ledger.getCurrentState();

  assert.equal(state.speed, 0);
  assert.equal(state.rpm, 0);
  assert.equal(state.gear, 0);
  assert.equal(state.batterySoC, 100);
  assert.equal(state.driveMode, 'TRACK');
  assert.equal(state.thermalWarning, false);
  assert.equal(state.lastEventHash, GENESIS_PREVIOUS_HASH);
  assert.equal(ledger.getEvents().length, 0);

  const integrity = ledger.verifyCryptographicIntegrity();
  assert.equal(integrity.isValid, true);
  assert.equal(integrity.checkedCount, 0);
  assert.equal(integrity.errorIndex, null);
});

test('AutomotiveHypercarTelemetryLedger - deterministic telemetry_frame updates and clamping', () => {
  const ledger = new AutomotiveHypercarTelemetryLedger();

  const ev1 = ledger.appendEvent('telemetry_frame', {
    speed: 285.4,
    rpm: 11200,
    gear: 6,
    throttle: 94,
    brake: 0,
    batteryTemp: 44.5,
    motorTemp: 52.0,
    batterySoC: 88.5,
    energyDelta: 1.42,
    distanceDelta: 0.85
  }, 1000);

  assert.equal(ev1.index, 0);
  assert.equal(ev1.previousHash, GENESIS_PREVIOUS_HASH);
  assert.equal(typeof ev1.hash, 'string');
  assert.equal(ev1.hash.length, 64);

  const state1 = ledger.getCurrentState();
  assert.equal(state1.speed, 285.4);
  assert.equal(state1.rpm, 11200);
  assert.equal(state1.gear, 6);
  assert.equal(state1.throttle, 94);
  assert.equal(state1.brake, 0);
  assert.equal(state1.batteryTemp, 44.5);
  assert.equal(state1.motorTemp, 52.0);
  assert.equal(state1.batterySoC, 88.5);
  assert.equal(state1.totalEnergyConsumed, 1.42);
  assert.equal(state1.odometer, 0.85);
  assert.equal(state1.thermalWarning, false);

  // Out of bounds test
  ledger.appendEvent('telemetry_frame', {
    speed: 650, // exceeds 500 cap
    rpm: 25000, // exceeds 20000 cap
    gear: 12,   // exceeds 8 cap
    throttle: 150, // exceeds 100%
    batterySoC: -10 // below 0%
  }, 1100);

  const state2 = ledger.getCurrentState();
  assert.equal(state2.speed, 500);
  assert.equal(state2.rpm, 20000);
  assert.equal(state2.gear, 8);
  assert.equal(state2.throttle, 100);
  assert.equal(state2.batterySoC, 0);
});

test('AutomotiveHypercarTelemetryLedger - telemetry_anomaly logging and resolution', () => {
  const ledger = new AutomotiveHypercarTelemetryLedger();

  ledger.appendEvent('telemetry_anomaly', {
    code: 'ERR_INVERTER_OVERCURRENT',
    severity: 'CRITICAL',
    message: 'Phase B gate drive overcurrent detected on front inverter',
    component: 'FrontInverter'
  }, 2000);

  ledger.appendEvent('telemetry_anomaly', {
    code: 'WARN_AERO_DRAG_FLAP',
    severity: 'WARNING',
    message: 'Active rear wing angle discrepancy +2.4 deg',
    component: 'Aerodynamics'
  }, 2100);

  let state = ledger.getCurrentState();
  assert.equal(state.activeAnomalies.length, 2);
  assert.equal(state.activeAnomalies[0].code, 'ERR_INVERTER_OVERCURRENT');
  assert.equal(state.activeAnomalies[0].severity, 'CRITICAL');
  assert.equal(state.activeAnomalies[1].code, 'WARN_AERO_DRAG_FLAP');

  // Resolve inverter error
  ledger.appendEvent('telemetry_anomaly', {
    code: 'ERR_INVERTER_OVERCURRENT',
    resolved: true
  }, 2200);

  state = ledger.getCurrentState();
  assert.equal(state.activeAnomalies.length, 1);
  assert.equal(state.activeAnomalies[0].code, 'WARN_AERO_DRAG_FLAP');
});

test('AutomotiveHypercarTelemetryLedger - lap_split timing and split tracking', () => {
  const ledger = new AutomotiveHypercarTelemetryLedger();

  ledger.appendEvent('lap_split', {
    lap: 1,
    splitTime: 82.345,
    sector1: 24.120,
    sector2: 29.450,
    sector3: 28.775
  }, 3000);

  ledger.appendEvent('lap_split', {
    lap: 2,
    splitTime: 81.112,
    sector1: 23.950,
    sector2: 28.820,
    sector3: 28.342
  }, 3100);

  const state = ledger.getCurrentState();
  assert.equal(state.lapCount, 2);
  assert.equal(state.currentLapTime, 81.112);
  assert.equal(state.lapTimes.length, 2);
  assert.equal(state.lapTimes[0].splitTime, 82.345);
  assert.equal(state.lapTimes[1].splitTime, 81.112);
  assert.equal(state.lapTimes[1].sector1, 23.950);
});

test('AutomotiveHypercarTelemetryLedger - mode_switch state transition', () => {
  const ledger = new AutomotiveHypercarTelemetryLedger();

  ledger.appendEvent('mode_switch', { mode: 'QUALIFYING', reason: 'Hotlap flying lap start' }, 4000);
  assert.equal(ledger.getCurrentState().driveMode, 'QUALIFYING');

  ledger.appendEvent('mode_switch', { mode: 'LUDICROUS', reason: 'Straightaway DRS overtake' }, 4100);
  assert.equal(ledger.getCurrentState().driveMode, 'LUDICROUS');

  ledger.appendEvent('mode_switch', { mode: 'ECO', reason: 'Pit lane crawl' }, 4200);
  assert.equal(ledger.getCurrentState().driveMode, 'ECO');
});

test('AutomotiveHypercarTelemetryLedger - battery_thermal_spike activates alert and critical anomaly', () => {
  const ledger = new AutomotiveHypercarTelemetryLedger();

  ledger.appendEvent('telemetry_frame', { batteryTemp: 42.0 }, 5000);
  assert.equal(ledger.getCurrentState().thermalWarning, false);

  ledger.appendEvent('battery_thermal_spike', {
    peakTemp: 78.4,
    cellIndex: 'CELL_BANK_C3'
  }, 5100);

  const state = ledger.getCurrentState();
  assert.equal(state.batteryTemp, 78.4);
  assert.equal(state.thermalWarning, true);
  assert.equal(state.activeAnomalies.length, 1);
  assert.equal(state.activeAnomalies[0].code, 'ERR_BATTERY_THERMAL_SPIKE');
  assert.equal(state.activeAnomalies[0].severity, 'CRITICAL');
});

test('AutomotiveHypercarTelemetryLedger - cryptographic chaining continuity', () => {
  const ledger = new AutomotiveHypercarTelemetryLedger();

  const e0 = ledger.appendEvent('telemetry_frame', { speed: 100 }, 1000);
  const e1 = ledger.appendEvent('telemetry_frame', { speed: 150 }, 2000);
  const e2 = ledger.appendEvent('telemetry_frame', { speed: 200 }, 3000);

  assert.equal(e0.previousHash, GENESIS_PREVIOUS_HASH);
  assert.equal(e1.previousHash, e0.hash);
  assert.equal(e2.previousHash, e1.hash);

  const events = ledger.getEvents();
  assert.equal(events[0].previousHash, GENESIS_PREVIOUS_HASH);
  assert.equal(events[1].previousHash, events[0].hash);
  assert.equal(events[2].previousHash, events[1].hash);
});

test('AutomotiveHypercarTelemetryLedger - cryptographic integrity verification passes on untampered ledger', () => {
  const ledger = new AutomotiveHypercarTelemetryLedger();

  for (let i = 0; i < 10; i++) {
    ledger.appendEvent('telemetry_frame', { speed: 100 + i * 15, rpm: 3000 + i * 500 }, 1000 + i * 100);
  }

  const result = ledger.verifyCryptographicIntegrity();
  assert.equal(result.isValid, true);
  assert.equal(result.checkedCount, 10);
  assert.equal(result.errorIndex, null);
  assert.equal(result.reason, null);
});

test('AutomotiveHypercarTelemetryLedger - cryptographic integrity catches payload tampering', () => {
  const ledger = new AutomotiveHypercarTelemetryLedger();

  ledger.appendEvent('telemetry_frame', { speed: 120 }, 1000);
  ledger.appendEvent('telemetry_frame', { speed: 220 }, 2000);
  ledger.appendEvent('telemetry_frame', { speed: 310 }, 3000);

  // Alter payload at event index 1
  const tampered = ledger.tamperEvent(1, { speed: 999 });
  assert.equal(tampered, true);

  const result = ledger.verifyCryptographicIntegrity();
  assert.equal(result.isValid, false);
  assert.equal(result.errorIndex, 1);
  assert.match(result.reason, /Content hash mismatch at index 1/);
});

test('AutomotiveHypercarTelemetryLedger - cryptographic integrity catches broken hash chaining', () => {
  const ledger = new AutomotiveHypercarTelemetryLedger();

  ledger.appendEvent('telemetry_frame', { speed: 100 }, 1000);
  ledger.appendEvent('telemetry_frame', { speed: 150 }, 2000);
  ledger.appendEvent('telemetry_frame', { speed: 200 }, 3000);

  // Directly break previousHash at index 2
  ledger.events[2].previousHash = 'badc0ffee0000000000000000000000000000000000000000000000000000000';

  const result = ledger.verifyCryptographicIntegrity();
  assert.equal(result.isValid, false);
  assert.equal(result.errorIndex, 2);
  assert.match(result.reason, /Previous hash mismatch at index 2/);
});

test('AutomotiveHypercarTelemetryLedger - temporal state replay reconstructs historical timeline', () => {
  const ledger = new AutomotiveHypercarTelemetryLedger();

  ledger.appendEvent('telemetry_frame', { speed: 100, gear: 2 }, 1000);
  ledger.appendEvent('mode_switch', { mode: 'TRACK' }, 2000);
  ledger.appendEvent('telemetry_frame', { speed: 220, gear: 4 }, 3000);
  ledger.appendEvent('mode_switch', { mode: 'QUALIFYING' }, 4000);
  ledger.appendEvent('telemetry_frame', { speed: 320, gear: 6 }, 5000);

  // Replay at t = 2500 (before speed 220 and before QUALIFYING)
  const stateAt2500 = ledger.replayEvents(2500);
  assert.equal(stateAt2500.speed, 100);
  assert.equal(stateAt2500.gear, 2);
  assert.equal(stateAt2500.driveMode, 'TRACK');
  assert.equal(stateAt2500.eventCount, 2);

  // Replay at t = 4500 (after QUALIFYING, before speed 320)
  const stateAt4500 = ledger.replayEvents(4500);
  assert.equal(stateAt4500.speed, 220);
  assert.equal(stateAt4500.gear, 4);
  assert.equal(stateAt4500.driveMode, 'QUALIFYING');
  assert.equal(stateAt4500.eventCount, 4);

  // Replay at Infinity matches live state
  const liveState = ledger.replayEvents(Infinity);
  assert.equal(liveState.speed, 320);
  assert.equal(liveState.gear, 6);
  assert.equal(liveState.driveMode, 'QUALIFYING');
  assert.equal(liveState.eventCount, 5);
});

test('AutomotiveHypercarTelemetryLedger - getTelemetryAt helper equals replayEvents', () => {
  const ledger = new AutomotiveHypercarTelemetryLedger();

  ledger.appendEvent('telemetry_frame', { speed: 150 }, 1000);
  ledger.appendEvent('telemetry_frame', { speed: 250 }, 2000);

  const viaGet = ledger.getTelemetryAt(1500);
  const viaReplay = ledger.replayEvents(1500);

  assert.deepEqual(viaGet, viaReplay);
  assert.equal(viaGet.speed, 150);
});

test('AutomotiveHypercarTelemetryLedger - snapshotState records checkpoint with cryptographic hash', () => {
  const ledger = new AutomotiveHypercarTelemetryLedger();

  ledger.appendEvent('telemetry_frame', { speed: 280, gear: 6 }, 1000);
  ledger.appendEvent('lap_split', { lap: 1, splitTime: 82.5 }, 2000);

  const snapshot = ledger.snapshotState('End of Lap 1 Checkpoint');

  assert.equal(snapshot.label, 'End of Lap 1 Checkpoint');
  assert.equal(snapshot.eventIndex, 1);
  assert.equal(snapshot.state.speed, 280);
  assert.equal(snapshot.state.lapCount, 1);
  assert.equal(snapshot.lastEventHash, ledger.getLatestHash());
  assert.equal(ledger.getSnapshots().length, 1);
});

test('AutomotiveHypercarTelemetryLedger - reconstructLedger rebuilds chain and deterministic state', () => {
  const sourceLedger = new AutomotiveHypercarTelemetryLedger();

  sourceLedger.appendEvent('telemetry_frame', { speed: 200, gear: 4, batterySoC: 95 }, 1000);
  sourceLedger.appendEvent('mode_switch', { mode: 'QUALIFYING' }, 2000);
  sourceLedger.appendEvent('lap_split', { lap: 1, splitTime: 83.1 }, 3000);

  const exportedEvents = sourceLedger.getEvents();

  // Reconstruct into new ledger
  const targetLedger = new AutomotiveHypercarTelemetryLedger();
  targetLedger.reconstructLedger(exportedEvents);

  assert.equal(targetLedger.getEvents().length, 3);
  assert.equal(targetLedger.getCurrentState().speed, 200);
  assert.equal(targetLedger.getCurrentState().driveMode, 'QUALIFYING');
  assert.equal(targetLedger.getCurrentState().lapCount, 1);

  const targetIntegrity = targetLedger.verifyCryptographicIntegrity();
  assert.equal(targetIntegrity.isValid, true);
  assert.equal(targetIntegrity.checkedCount, 3);
  assert.equal(targetLedger.getLatestHash(), sourceLedger.getLatestHash());
});

test('AutomotiveHypercarTelemetryLedger - exportAuditTrail contains verifiable package metadata', () => {
  const ledger = new AutomotiveHypercarTelemetryLedger();

  ledger.appendEvent('telemetry_frame', { speed: 210, gear: 5 }, 1000);
  ledger.appendEvent('battery_thermal_spike', { peakTemp: 72.0 }, 2000);
  ledger.snapshotState('Post-Spike Checkpoint');

  const audit = ledger.exportAuditTrail();

  assert.equal(audit.metadata.totalEvents, 2);
  assert.equal(audit.metadata.totalSnapshots, 1);
  assert.equal(audit.metadata.rootHash, ledger.getLatestHash());
  assert.equal(audit.metadata.integrity.isValid, true);
  assert.equal(audit.events.length, 2);
  assert.equal(audit.snapshots.length, 1);
  assert.equal(audit.finalState.speed, 210);
  assert.equal(audit.finalState.thermalWarning, true);
});

test('AutomotiveHypercarTelemetryLedger - clear resets state to pristine genesis', () => {
  const ledger = new AutomotiveHypercarTelemetryLedger();

  ledger.appendEvent('telemetry_frame', { speed: 300 }, 1000);
  ledger.snapshotState('Pre-clear');
  assert.equal(ledger.getEvents().length, 1);

  ledger.clear();
  assert.equal(ledger.getEvents().length, 0);
  assert.equal(ledger.getSnapshots().length, 0);
  assert.equal(ledger.getCurrentState().speed, 0);
  assert.equal(ledger.getLatestHash(), GENESIS_PREVIOUS_HASH);
  assert.equal(ledger.verifyCryptographicIntegrity().isValid, true);
});
