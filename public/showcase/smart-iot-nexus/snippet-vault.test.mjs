import test from 'node:test';
import assert from 'node:assert/strict';
import { SmartIoTNexusSnippetVault } from './snippet-vault.js';

test('SmartIoTNexusSnippetVault', async (t) => {
  await t.test('should filter presets accurately by category tag', () => {
    const vault = new SmartIoTNexusSnippetVault();
    const mqttPresets = vault.filterByTag('mqtt');
    assert.ok(mqttPresets.length >= 1);
    assert.ok(mqttPresets.every(p => p.category === 'mqtt' || p.tags.includes('mqtt')));
  });

  await t.test('should search presets with multi-token query across title and code', () => {
    const vault = new SmartIoTNexusSnippetVault();
    const results = vault.searchSnippets('kalman noise');
    assert.equal(results.length, 1);
    assert.equal(results[0].id, 'snip-iot-02');
  });

  await t.test('should add new preset and list it', () => {
    const vault = new SmartIoTNexusSnippetVault();
    const created = vault.addSnippet({
      title: 'Hysteresis Bandwidth Threshold Trigger',
      category: 'filter',
      tags: ['filter', 'hysteresis', 'trigger'],
      description: 'Prevents relay chattering around setpoint with upper and lower deadbands.',
      code: 'function checkHysteresis(val, high = 85, low = 75, state = false) { if (val > high) return true; if (val < low) return false; return state; }'
    });

    assert.ok(created.id);
    const found = vault.searchSnippets('hysteresis');
    assert.equal(found.length, 1);
    assert.equal(found[0].title, 'Hysteresis Bandwidth Threshold Trigger');
  });

  await t.test('should throw error when missing mandatory fields', () => {
    const vault = new SmartIoTNexusSnippetVault();
    assert.throws(() => {
      vault.addSnippet({ title: 'Invalid Sensor Snippet' });
    }, /Title and code are required/);
  });
});
