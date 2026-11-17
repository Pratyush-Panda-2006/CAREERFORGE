import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const scriptPath = path.resolve('public/showcase/agency-studio/script.js');
const scriptCode = fs.readFileSync(scriptPath, 'utf8');

function createEnvironment(mockStore = {}) {
  const store = { ...mockStore };
  const mockStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => {
      for (const k in store) delete store[k];
    }
  };

  const sandbox = {
    console,
    Date,
    Math,
    String,
    Number,
    Array,
    Object,
    JSON,
    URL: {
      createObjectURL: () => 'blob:mock-url',
      revokeObjectURL: () => {}
    },
    Blob: class MockBlob {
      constructor(chunks, options = {}) {
        this.chunks = chunks;
        this.type = options.type || '';
      }
    },
    document: {
      addEventListener: () => {},
      getElementById: () => null,
      querySelector: () => null,
      querySelectorAll: () => [],
      documentElement: {
        classList: {
          add: () => {},
          remove: () => {}
        },
        setAttribute: () => {},
        removeAttribute: () => {}
      },
      createElement: (tag) => ({
        tag,
        setAttribute: () => {},
        appendChild: () => {},
        click: () => {},
        classList: { add: () => {}, remove: () => {} }
      }),
      body: {
        appendChild: () => {},
        removeChild: () => {}
      }
    },
    window: {
      addEventListener: () => {},
      localStorage: mockStorage
    }
  };
  sandbox.window.document = sandbox.document;
  vm.createContext(sandbox);
  vm.runInContext(scriptCode, sandbox);
  sandbox.AgencyStudioPreferenceManager = sandbox.AgencyStudioPreferenceManager || sandbox.window?.AgencyStudioPreferenceManager;
  return { sandbox, store };
}

test('AgencyStudioPreferenceManager falls back to default preferences when storage empty', () => {
  const { sandbox } = createEnvironment();
  assert.ok(sandbox.AgencyStudioPreferenceManager, 'AgencyStudioPreferenceManager must be defined');
  const manager = new sandbox.AgencyStudioPreferenceManager();
  const prefs = manager.load();

  assert.equal(prefs.theme, 'dark');
  assert.equal(prefs.viewLayout, 'grid');
  assert.equal(prefs.soundCues, false);
  assert.equal(prefs.highContrast, false);
  assert.equal(prefs.metricUnits, 'metric');
});

test('save(key, val) updates in-memory state and persists to storage', () => {
  const { sandbox, store } = createEnvironment();
  const manager = new sandbox.AgencyStudioPreferenceManager();

  manager.save('soundCues', true);
  manager.save('highContrast', true);
  manager.save('viewLayout', 'compact');

  assert.equal(manager.get('soundCues'), true);
  assert.equal(manager.get('highContrast'), true);
  assert.equal(manager.get('viewLayout'), 'compact');

  const rawStorage = store['agency_studio_preferences_v1'];
  assert.ok(rawStorage);
  const parsed = JSON.parse(rawStorage);
  assert.equal(parsed.soundCues, true);
  assert.equal(parsed.highContrast, true);
  assert.equal(parsed.viewLayout, 'compact');
});

test('resetDefaults restores initial settings and clears custom storage', () => {
  const { sandbox, store } = createEnvironment({
    agency_studio_preferences_v1: JSON.stringify({
      theme: 'light',
      highContrast: true,
      soundCues: true
    })
  });
  const manager = new sandbox.AgencyStudioPreferenceManager();
  assert.equal(manager.get('highContrast'), true);

  const resetPrefs = manager.resetDefaults();
  assert.equal(resetPrefs.highContrast, false);
  assert.equal(resetPrefs.soundCues, false);
  assert.equal(resetPrefs.theme, 'dark');
  assert.equal(store['agency_studio_preferences_v1'], undefined);
});

test('exportJSON returns valid serialized JSON containing complete preference state', () => {
  const { sandbox } = createEnvironment();
  const manager = new sandbox.AgencyStudioPreferenceManager();
  manager.save('metricUnits', 'imperial');
  manager.save('viewLayout', 'masonry');

  const jsonStr = manager.exportJSON();
  assert.equal(typeof jsonStr, 'string');
  const obj = JSON.parse(jsonStr);
  assert.equal(obj.metricUnits, 'imperial');
  assert.equal(obj.viewLayout, 'masonry');
  assert.equal(obj.theme, 'dark');
});

test('importJSON successfully hydrates preferences from valid JSON string', () => {
  const { sandbox } = createEnvironment();
  const manager = new sandbox.AgencyStudioPreferenceManager();

  const customConfig = JSON.stringify({
    soundCues: true,
    highContrast: true,
    metricUnits: 'imperial',
    viewLayout: 'list'
  });

  const success = manager.importJSON(customConfig);
  assert.equal(success, true);
  assert.equal(manager.get('soundCues'), true);
  assert.equal(manager.get('highContrast'), true);
  assert.equal(manager.get('metricUnits'), 'imperial');
  assert.equal(manager.get('viewLayout'), 'list');
});
