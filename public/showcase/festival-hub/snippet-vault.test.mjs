import test from 'node:test';
import assert from 'node:assert/strict';
import { FestivalHubSnippetVault } from './snippet-vault.js';

test('FestivalHubSnippetVault prevents duplicate snippet titles/keys', () => {
  const vault = new FestivalHubSnippetVault();
  vault.addSnippet('Stage DMX Presets', '{"channels": [1, 2, 3]}', ['lighting', 'stage']);

  assert.throws(() => {
    vault.addSnippet('Stage DMX Presets', '{"channels": [4, 5, 6]}', ['lighting']);
  }, /already exists/);

  assert.throws(() => {
    vault.addSnippet('  stage dmx presets  ', 'different code', ['test']);
  }, /already exists/);
});

test('filters snippets accurately by category tag', () => {
  const vault = new FestivalHubSnippetVault();
  vault.addSnippet('Pyrotechnics Cue', 'FIRE_CUE_01', ['pyro', 'fx']);
  vault.addSnippet('Laser Sync Protocol', 'LASER_SYNC_60HZ', ['lighting', 'fx']);
  vault.addSnippet('Subwoofer EQ Curve', 'EQ_PRESET_BASS', ['audio', 'sound']);

  const fxSnippets = vault.filterByTag('fx');
  assert.equal(fxSnippets.length, 2);
  assert.ok(fxSnippets.some(s => s.title === 'Pyrotechnics Cue'));
  assert.ok(fxSnippets.some(s => s.title === 'Laser Sync Protocol'));

  const audioSnippets = vault.filterByTag('audio');
  assert.equal(audioSnippets.length, 1);
  assert.equal(audioSnippets[0].title, 'Subwoofer EQ Curve');

  const allSnippets = vault.filterByTag('all');
  assert.equal(allSnippets.length, 3);
});

test('performs multi-token query search across titles, code, and tags', () => {
  const vault = new FestivalHubSnippetVault();
  vault.addSnippet('Main Stage LED Wall', 'RESOLUME_MAP_4K', ['display', 'video']);
  vault.addSnippet('VIP Acoustic Monitor', 'DBX_DRIVE_RACK_PA2', ['audio', 'vip']);
  vault.addSnippet('Entrance Turnstile Beacon', 'BLE_BEACON_BROADCAST', ['iot', 'rfid']);

  // Multi-token: matching title token + tag token
  const res1 = vault.searchSnippets('stage video');
  assert.equal(res1.length, 1);
  assert.equal(res1[0].title, 'Main Stage LED Wall');

  // Token matching inside code string
  const res2 = vault.searchSnippets('RESOLUME 4K');
  assert.equal(res2.length, 1);
  assert.equal(res2[0].title, 'Main Stage LED Wall');

  // Non-matching query
  const res3 = vault.searchSnippets('nonexistent term');
  assert.equal(res3.length, 0);
});

test('retrieves snippet code for instant clipboard copy', () => {
  const vault = new FestivalHubSnippetVault();
  const snip = vault.addSnippet('VIP Welcome SMS', 'Welcome to Aura Fest! Your lounge code is 7821.', ['sms', 'guest']);

  const copied = vault.copySnippetCode(snip.id);
  assert.equal(copied, 'Welcome to Aura Fest! Your lounge code is 7821.');
});
