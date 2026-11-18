import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WeatherRadarAtlasFsmVisualizer } from './state-diagram.js';

describe('WeatherRadarAtlasFsmVisualizer', () => {
  it('initializes with default RADAR_STANDBY state and radar states', () => {
    const fsm = new WeatherRadarAtlasFsmVisualizer();
    assert.strictEqual(fsm.currentState, 'RADAR_STANDBY');
    assert.ok(fsm.states.has('AZIMUTH_SWEEPING'));
    assert.ok(fsm.states.has('DOPPLER_PROCESSING'));
    assert.ok(fsm.states.has('STORM_CELL_ALERT'));
  });

  it('executes valid sequential transitions along radar sweep lifecycle', () => {
    const fsm = new WeatherRadarAtlasFsmVisualizer();

    const res1 = fsm.dispatch('START_SCAN');
    assert.strictEqual(res1.success, true);
    assert.strictEqual(fsm.currentState, 'AZIMUTH_SWEEPING');

    const res2 = fsm.dispatch('TILT_ANTENNA');
    assert.strictEqual(res2.success, true);
    assert.strictEqual(fsm.currentState, 'ELEVATION_TILTING');

    const res3 = fsm.dispatch('PROCESS_PULSE');
    assert.strictEqual(res3.success, true);
    assert.strictEqual(fsm.currentState, 'DOPPLER_PROCESSING');

    const res4 = fsm.dispatch('SEVERE_DETECTION');
    assert.strictEqual(res4.success, true);
    assert.strictEqual(fsm.currentState, 'STORM_CELL_ALERT');

    const res5 = fsm.dispatch('CLEAR_ALERT');
    assert.strictEqual(res5.success, true);
    assert.strictEqual(fsm.currentState, 'AZIMUTH_SWEEPING');
  });

  it('rejects invalid transitions with error payload while protecting state', () => {
    const fsm = new WeatherRadarAtlasFsmVisualizer();
    assert.strictEqual(fsm.currentState, 'RADAR_STANDBY');

    const invalid = fsm.dispatch('PROCESS_PULSE');
    assert.strictEqual(invalid.success, false);
    assert.strictEqual(fsm.currentState, 'RADAR_STANDBY');
    assert.match(invalid.error, /Cannot dispatch event/);
  });

  it('supports custom transition additions and cyclic execution', () => {
    const fsm = new WeatherRadarAtlasFsmVisualizer();
    fsm.addTransition('RADAR_STANDBY', 'SATELLITE_SYNC', 'SATELLITE_UPLINK');
    fsm.addTransition('SATELLITE_UPLINK', 'SYNC_COMPLETE', 'RADAR_STANDBY');

    const res1 = fsm.dispatch('SATELLITE_SYNC');
    assert.strictEqual(res1.success, true);
    assert.strictEqual(fsm.currentState, 'SATELLITE_UPLINK');

    const res2 = fsm.dispatch('SYNC_COMPLETE');
    assert.strictEqual(res2.success, true);
    assert.strictEqual(fsm.currentState, 'RADAR_STANDBY');
  });

  it('exports valid Mermaid.js stateDiagram-v2 definition', () => {
    const fsm = new WeatherRadarAtlasFsmVisualizer();
    const mermaid = fsm.exportMermaid();

    assert.ok(mermaid.startsWith('stateDiagram-v2'));
    assert.ok(mermaid.includes('[*] --> RADAR_STANDBY'));
    assert.ok(mermaid.includes('RADAR_STANDBY --> AZIMUTH_SWEEPING : START_SCAN'));
  });

  it('maintains history log and resets state reliably', () => {
    const fsm = new WeatherRadarAtlasFsmVisualizer();
    fsm.dispatch('START_SCAN');
    fsm.dispatch('TILT_ANTENNA');

    assert.strictEqual(fsm.history.length, 2);
    fsm.reset();

    assert.strictEqual(fsm.currentState, 'RADAR_STANDBY');
    assert.strictEqual(fsm.history.length, 0);
  });
});
