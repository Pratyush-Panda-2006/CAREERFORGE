import test from 'node:test';
import assert from 'node:assert/strict';
import { QuantumForgePreferenceManager } from './preferences.js';

class MockStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

test('QuantumForgePreferenceManager - returns default fallback preferences when storage is empty', () => {
  const storage = new MockStorage();
  const manager = new QuantumForgePreferenceManager({ storage });

  const prefs = manager.getAll();
  assert.equal(prefs.theme, 'superconducting-dark');
  assert.equal(prefs.circuitLayout, 'bloch-sphere');
  assert.equal(prefs.simulationShots, 1024);
  assert.equal(prefs.decoherenceAlertSound, true);
  assert.equal(prefs.gateExecutionTone, true);
  assert.equal(prefs.highContrastQubits, false);
  assert.equal(prefs.noiseMitigationMethod, 'zero-noise-extrapolation');
  assert.equal(prefs.basisGateSet, 'ibm-falcon');
  assert.equal(prefs.qubitRegisterCount, 16);
  assert.equal(prefs.optimizationLevel, 3);
});

test('QuantumForgePreferenceManager - save updates state and persists to storage', () => {
  const storage = new MockStorage();
  const manager = new QuantumForgePreferenceManager({ storage });

  manager.save('simulationShots', 4096);
  manager.save('basisGateSet', 'ionq-aria');
  manager.save('qubitRegisterCount', 32);

  assert.equal(manager.get('simulationShots'), 4096);
  assert.equal(manager.get('basisGateSet'), 'ionq-aria');
  assert.equal(manager.get('qubitRegisterCount'), 32);

  // Reload verification
  const reloaded = new QuantumForgePreferenceManager({ storage });
  assert.equal(reloaded.get('simulationShots'), 4096);
  assert.equal(reloaded.get('basisGateSet'), 'ionq-aria');
  assert.equal(reloaded.get('qubitRegisterCount'), 32);
  assert.equal(reloaded.get('theme'), 'superconducting-dark');
});

test('QuantumForgePreferenceManager - resetDefaults restores all settings to default state', () => {
  const storage = new MockStorage();
  const manager = new QuantumForgePreferenceManager({ storage });

  manager.save('theme', 'trapped-ion-violet');
  manager.save('simulationShots', 8192);
  assert.equal(manager.get('theme'), 'trapped-ion-violet');
  assert.equal(manager.get('simulationShots'), 8192);

  manager.resetDefaults();
  assert.equal(manager.get('theme'), 'superconducting-dark');
  assert.equal(manager.get('simulationShots'), 1024);

  const reloaded = new QuantumForgePreferenceManager({ storage });
  assert.equal(reloaded.get('theme'), 'superconducting-dark');
  assert.equal(reloaded.get('simulationShots'), 1024);
});

test('QuantumForgePreferenceManager - exportJSON produces valid JSON with required schema metadata', () => {
  const storage = new MockStorage();
  const manager = new QuantumForgePreferenceManager({ storage });
  manager.save('basisGateSet', 'rigetti-aspen');

  const jsonStr = manager.exportJSON();
  assert.ok(typeof jsonStr === 'string');

  const parsed = JSON.parse(jsonStr);
  assert.equal(parsed.app, 'Quantum Forge IDE');
  assert.equal(parsed.version, '1.0.0');
  assert.ok(parsed.exportedAt);
  assert.equal(parsed.preferences.basisGateSet, 'rigetti-aspen');
  assert.equal(parsed.preferences.theme, 'superconducting-dark');
});

test('QuantumForgePreferenceManager - importJSON restores state from exported JSON string', () => {
  const storage = new MockStorage();
  const manager = new QuantumForgePreferenceManager({ storage });

  const customConfig = {
    app: 'Quantum Forge IDE',
    version: '1.0.0',
    preferences: {
      theme: 'topological-emerald',
      circuitLayout: 'q-sphere',
      simulationShots: 4096,
      qubitRegisterCount: 64
    }
  };

  manager.importJSON(JSON.stringify(customConfig));
  assert.equal(manager.get('theme'), 'topological-emerald');
  assert.equal(manager.get('circuitLayout'), 'q-sphere');
  assert.equal(manager.get('simulationShots'), 4096);
  assert.equal(manager.get('qubitRegisterCount'), 64);

  const reloaded = new QuantumForgePreferenceManager({ storage });
  assert.equal(reloaded.get('theme'), 'topological-emerald');
  assert.equal(reloaded.get('simulationShots'), 4096);
});

test('QuantumForgePreferenceManager - subscribe notifies listeners on save and reset', () => {
  const storage = new MockStorage();
  const manager = new QuantumForgePreferenceManager({ storage });

  const events = [];
  const unsubscribe = manager.subscribe((key, val) => {
    events.push({ key, val });
  });

  manager.save('simulationShots', 256);
  manager.resetDefaults();

  assert.equal(events.length, 2);
  assert.equal(events[0].key, 'simulationShots');
  assert.equal(events[0].val, 256);
  assert.equal(events[1].key, '__reset__');

  unsubscribe();
  manager.save('simulationShots', 1024);
  assert.equal(events.length, 2);
});
