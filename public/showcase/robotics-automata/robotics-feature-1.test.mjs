import test from 'node:test';
import assert from 'node:assert/strict';
import { RoboticsAutomataPreferenceManager } from './preferences.js';

test('RoboticsAutomataPreferenceManager - default fallback values', () => {
  const manager = new RoboticsAutomataPreferenceManager('test_robotics_prefs');
  const prefs = manager.load();
  assert.equal(prefs.theme, 'cyber-amber');
  assert.equal(prefs.kinematicsModel, 'inverse-6dof');
  assert.equal(prefs.telemetryUnits, 'rad-sec');
  assert.equal(prefs.collisionWarningAudio, true);
  assert.equal(prefs.hapticFeedback, false);
  assert.equal(prefs.autoCalibrateHz, 60);
});

test('RoboticsAutomataPreferenceManager - save and get preferences', () => {
  const manager = new RoboticsAutomataPreferenceManager('test_robotics_save');
  manager.save('kinematicsModel', 'forward-cartesian');
  manager.save('hapticFeedback', true);
  assert.equal(manager.get('kinematicsModel'), 'forward-cartesian');
  assert.equal(manager.get('hapticFeedback'), true);

  // Object batch update
  manager.save({ autoCalibrateHz: 120, emergencyBrakeThresholdM: 0.8 });
  assert.equal(manager.get('autoCalibrateHz'), 120);
  assert.equal(manager.get('emergencyBrakeThresholdM'), 0.8);
});

test('RoboticsAutomataPreferenceManager - export and import JSON integrity', () => {
  const manager = new RoboticsAutomataPreferenceManager('test_robotics_export');
  manager.save('kinematicsModel', 'neural-rl-motion');
  const exported = manager.exportJSON();
  assert.ok(typeof exported === 'string');
  const parsed = JSON.parse(exported);
  assert.equal(parsed.kinematicsModel, 'neural-rl-motion');

  const manager2 = new RoboticsAutomataPreferenceManager('test_robotics_import');
  const success = manager2.importJSON(JSON.stringify({ kinematicsModel: 'neural-rl-motion', autoCalibrateHz: 90 }));
  assert.equal(success, true);
  assert.equal(manager2.get('kinematicsModel'), 'neural-rl-motion');
  assert.equal(manager2.get('autoCalibrateHz'), 90);
});

test('RoboticsAutomataPreferenceManager - resetDefaults restores baseline', () => {
  const manager = new RoboticsAutomataPreferenceManager('test_robotics_reset');
  manager.save('kinematicsModel', 'neural-rl-motion');
  manager.save('collisionWarningAudio', false);
  manager.resetDefaults();
  assert.equal(manager.get('kinematicsModel'), 'inverse-6dof');
  assert.equal(manager.get('collisionWarningAudio'), true);
});

test('RoboticsAutomataPreferenceManager - persistence across instances with same backend', () => {
  class MockStorage {
    constructor() { this.data = new Map(); }
    getItem(k) { return this.data.get(k) || null; }
    setItem(k, v) { this.data.set(k, String(v)); }
    removeItem(k) { this.data.delete(k); }
  }
  const sharedStorage = new MockStorage();
  const managerA = new RoboticsAutomataPreferenceManager('shared_robotics', sharedStorage);
  managerA.save('telemetryUnits', 'deg-sec');

  const managerB = new RoboticsAutomataPreferenceManager('shared_robotics', sharedStorage);
  assert.equal(managerB.get('telemetryUnits'), 'deg-sec');
});
