import test from 'node:test';
import assert from 'node:assert/strict';
import { AerospaceOrbiterAuditChain } from './audit-trail.js';

test('AerospaceOrbiterAuditChain - genesis block creation and valid initial integrity', () => {
  const chain = new AerospaceOrbiterAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  const integrity = chain.verifyChainIntegrity();
  assert.equal(integrity.isValid, true);
  assert.equal(chain.getChain().length, 1);
  assert.equal(chain.getChain()[0].action, 'GENESIS_INIT');
});

test('AerospaceOrbiterAuditChain - sequential block recording and previousHash chaining', () => {
  const chain = new AerospaceOrbiterAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  const b1 = chain.recordEvent('THRUSTER_BURN_CMD', { val: 42 });
  const b2 = chain.recordEvent('ATTITUDE_SLEW_EXEC', { val: 99 });

  assert.equal(chain.getChain().length, 3);
  assert.equal(b1.index, 1);
  assert.equal(b2.index, 2);
  assert.equal(b2.previousHash, b1.hash);

  const verification = chain.verifyChainIntegrity();
  assert.equal(verification.isValid, true);
  assert.equal(verification.totalBlocks, 3);
});

test('AerospaceOrbiterAuditChain - cryptographic tamper detection catches modified payload', () => {
  const chain = new AerospaceOrbiterAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  chain.recordEvent('THRUSTER_BURN_CMD', { val: 30 });
  const b2 = chain.recordEvent('ATTITUDE_SLEW_EXEC', { val: 65 });

  b2.payload.val = 999;

  const verification = chain.verifyChainIntegrity();
  assert.equal(verification.isValid, false);
  assert.equal(verification.invalidBlockIndex, 2);
  assert.equal(verification.reason, 'Hash mismatch');
});

test('AerospaceOrbiterAuditChain - filter action returns subset of audit blocks', () => {
  const chain = new AerospaceOrbiterAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  chain.recordEvent('THRUSTER_BURN_CMD', { id: 1 });
  chain.recordEvent('ATTITUDE_SLEW_EXEC', { id: 2 });
  chain.recordEvent('THRUSTER_BURN_CMD', { id: 3 });

  const filtered = chain.getChain('THRUSTER_BURN_CMD');
  assert.equal(filtered.length, 2);
  assert.equal(filtered[0].action, 'THRUSTER_BURN_CMD');
  assert.equal(filtered[1].action, 'THRUSTER_BURN_CMD');
});
