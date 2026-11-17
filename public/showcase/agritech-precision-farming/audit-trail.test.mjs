import test from 'node:test';
import assert from 'node:assert/strict';
import { AgritechPrecisionFarmingAuditChain } from './audit-trail.js';

test('Genesis block creation and valid initial integrity', () => {
  const chain = new AgritechPrecisionFarmingAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  const integrity = chain.verifyChainIntegrity();
  assert.equal(integrity.isValid, true);
  assert.equal(chain.getChain().length, 1);
  assert.equal(chain.getChain()[0].action, 'GENESIS_INIT');
});

test('Sequential block recording and previousHash chaining', () => {
  const chain = new AgritechPrecisionFarmingAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  const b1 = chain.recordEvent('SOIL_TELEMETRY', { moisture: 42 });
  const b2 = chain.recordEvent('DRONE_SURVEY', { ndvi: 0.81 });

  assert.equal(chain.getChain().length, 3);
  assert.equal(b1.index, 1);
  assert.equal(b2.index, 2);
  assert.equal(b2.previousHash, b1.hash);

  const verification = chain.verifyChainIntegrity();
  assert.equal(verification.isValid, true);
  assert.equal(verification.totalBlocks, 3);
});

test('Cryptographic tamper detection catches modified payload', () => {
  const chain = new AgritechPrecisionFarmingAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  chain.recordEvent('SOIL_TELEMETRY', { moisture: 30 });
  const b2 = chain.recordEvent('DRONE_SURVEY', { ndvi: 0.65 });

  // Tamper payload directly
  b2.payload.ndvi = 0.99; // Tampered data without updating hash

  const verification = chain.verifyChainIntegrity();
  assert.equal(verification.isValid, false);
  assert.equal(verification.invalidBlockIndex, 2);
  assert.equal(verification.reason, 'Hash mismatch');
});

test('Filter action returns subset of audit blocks', () => {
  const chain = new AgritechPrecisionFarmingAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  chain.recordEvent('SOIL_TELEMETRY', { id: 1 });
  chain.recordEvent('DRONE_SURVEY', { id: 2 });
  chain.recordEvent('SOIL_TELEMETRY', { id: 3 });

  const soilBlocks = chain.getChain('SOIL_TELEMETRY');
  assert.equal(soilBlocks.length, 2);
  assert.equal(soilBlocks[0].action, 'SOIL_TELEMETRY');
  assert.equal(soilBlocks[1].action, 'SOIL_TELEMETRY');
});
