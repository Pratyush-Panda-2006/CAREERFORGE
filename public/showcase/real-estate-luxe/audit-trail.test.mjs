import test from 'node:test';
import assert from 'node:assert/strict';
import { RealEstateLuxeAuditChain } from './audit-trail.js';

test('RealEstateLuxeAuditChain - genesis block creation and valid initial integrity', () => {
  const chain = new RealEstateLuxeAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  const integrity = chain.verifyChainIntegrity();
  assert.equal(integrity.isValid, true);
  assert.equal(chain.getChain().length, 1);
  assert.equal(chain.getChain()[0].action, 'GENESIS_INIT');
});

test('RealEstateLuxeAuditChain - sequential block recording and previousHash chaining', () => {
  const chain = new RealEstateLuxeAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  const b1 = chain.recordEvent('ESCROW_OPENED', { val: 42 });
  const b2 = chain.recordEvent('INSPECTION_CLEARED', { val: 99 });

  assert.equal(chain.getChain().length, 3);
  assert.equal(b1.index, 1);
  assert.equal(b2.index, 2);
  assert.equal(b2.previousHash, b1.hash);

  const verification = chain.verifyChainIntegrity();
  assert.equal(verification.isValid, true);
  assert.equal(verification.totalBlocks, 3);
});

test('RealEstateLuxeAuditChain - cryptographic tamper detection catches modified payload', () => {
  const chain = new RealEstateLuxeAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  chain.recordEvent('ESCROW_OPENED', { val: 30 });
  const b2 = chain.recordEvent('INSPECTION_CLEARED', { val: 65 });

  b2.payload.val = 999;

  const verification = chain.verifyChainIntegrity();
  assert.equal(verification.isValid, false);
  assert.equal(verification.invalidBlockIndex, 2);
  assert.equal(verification.reason, 'Hash mismatch');
});

test('RealEstateLuxeAuditChain - filter action returns subset of audit blocks', () => {
  const chain = new RealEstateLuxeAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  chain.recordEvent('ESCROW_OPENED', { id: 1 });
  chain.recordEvent('INSPECTION_CLEARED', { id: 2 });
  chain.recordEvent('ESCROW_OPENED', { id: 3 });

  const filtered = chain.getChain('ESCROW_OPENED');
  assert.equal(filtered.length, 2);
  assert.equal(filtered[0].action, 'ESCROW_OPENED');
  assert.equal(filtered[1].action, 'ESCROW_OPENED');
});
