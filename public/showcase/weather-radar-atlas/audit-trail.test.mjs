import test from 'node:test';
import assert from 'node:assert/strict';
import { WeatherRadarAtlasAuditChain } from './audit-trail.js';

test('WeatherRadarAtlasAuditChain - genesis block creation and valid initial integrity', () => {
  const chain = new WeatherRadarAtlasAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  const integrity = chain.verifyChainIntegrity();
  assert.equal(integrity.isValid, true);
  assert.equal(chain.getChain().length, 1);
  assert.equal(chain.getChain()[0].action, 'GENESIS_INIT');
});

test('WeatherRadarAtlasAuditChain - sequential block recording and previousHash chaining', () => {
  const chain = new WeatherRadarAtlasAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  const b1 = chain.recordEvent('DOPPLER_REFLECTIVITY_SWEEP', { val: 42 });
  const b2 = chain.recordEvent('STORM_CELL_TRACK_UPDATE', { val: 99 });

  assert.equal(chain.getChain().length, 3);
  assert.equal(b1.index, 1);
  assert.equal(b2.index, 2);
  assert.equal(b2.previousHash, b1.hash);

  const verification = chain.verifyChainIntegrity();
  assert.equal(verification.isValid, true);
  assert.equal(verification.totalBlocks, 3);
});

test('WeatherRadarAtlasAuditChain - cryptographic tamper detection catches modified payload', () => {
  const chain = new WeatherRadarAtlasAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  chain.recordEvent('DOPPLER_REFLECTIVITY_SWEEP', { val: 30 });
  const b2 = chain.recordEvent('STORM_CELL_TRACK_UPDATE', { val: 65 });

  b2.payload.val = 999;

  const verification = chain.verifyChainIntegrity();
  assert.equal(verification.isValid, false);
  assert.equal(verification.invalidBlockIndex, 2);
  assert.equal(verification.reason, 'Hash mismatch');
});

test('WeatherRadarAtlasAuditChain - filter action returns subset of audit blocks', () => {
  const chain = new WeatherRadarAtlasAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  chain.recordEvent('DOPPLER_REFLECTIVITY_SWEEP', { id: 1 });
  chain.recordEvent('STORM_CELL_TRACK_UPDATE', { id: 2 });
  chain.recordEvent('DOPPLER_REFLECTIVITY_SWEEP', { id: 3 });

  const filtered = chain.getChain('DOPPLER_REFLECTIVITY_SWEEP');
  assert.equal(filtered.length, 2);
  assert.equal(filtered[0].action, 'DOPPLER_REFLECTIVITY_SWEEP');
  assert.equal(filtered[1].action, 'DOPPLER_REFLECTIVITY_SWEEP');
});
