import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DroneDeliverySkywaySnippetVault } from './snippet-vault.js';

test('DroneDeliverySkywaySnippetVault - filters avionics specs by tag accurately', () => {
  const vault = new DroneDeliverySkywaySnippetVault();
  const navSnippets = vault.filterByTag('navigation');
  const safetySnippets = vault.filterByTag('safety');

  assert.ok(navSnippets.length >= 1);
  assert.strictEqual(navSnippets[0].id, 'skyway-corridor-nav');

  assert.ok(safetySnippets.length >= 2);
  assert.strictEqual(safetySnippets.every(s => s.tags.includes('safety')), true);
});

test('DroneDeliverySkywaySnippetVault - multi-token search filters correctly across title and code', () => {
  const vault = new DroneDeliverySkywaySnippetVault();
  const searchResults = vault.searchSnippets('urban corridor altitude');

  assert.strictEqual(searchResults.length, 1);
  assert.strictEqual(searchResults[0].id, 'skyway-corridor-nav');
});

test('DroneDeliverySkywaySnippetVault - prevents duplicate snippet keys', () => {
  const vault = new DroneDeliverySkywaySnippetVault();

  assert.throws(() => {
    vault.addSnippet('Urban Altitude Corridor Nav Vector Spec', '{}', ['corridor']);
  }, /already exists/);
});

test('DroneDeliverySkywaySnippetVault - adds valid snippet and retrieves updated tags', () => {
  const vault = new DroneDeliverySkywaySnippetVault();
  const added = vault.addSnippet('Thermal Parachute Ejection Sequence', '{"pyro_channel": 2}', ['parachute', 'emergency']);

  assert.strictEqual(added.id, 'thermal-parachute-ejection-sequence');
  const tags = vault.getAllTags();
  assert.ok(tags.includes('parachute'));
  assert.ok(tags.includes('emergency'));

  const filtered = vault.filterByTag('emergency');
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].id, 'thermal-parachute-ejection-sequence');
});
