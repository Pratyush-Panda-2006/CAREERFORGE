import test from 'node:test';
import assert from 'node:assert/strict';
import { StreamingCinemaHubAuditChain } from './audit-trail.js';

test('StreamingCinemaHubAuditChain - genesis block creation and valid initial integrity', () => {
  const chain = new StreamingCinemaHubAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  const integrity = chain.verifyChainIntegrity();
  assert.equal(integrity.isValid, true);
  assert.equal(chain.getChain().length, 1);
  assert.equal(chain.getChain()[0].action, 'GENESIS_INIT');
});

test('StreamingCinemaHubAuditChain - sequential block recording and previousHash chaining', () => {
  const chain = new StreamingCinemaHubAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  const b1 = chain.recordEvent('DRM_KEY_REQUESTED', { val: 42 });
  const b2 = chain.recordEvent('LICENSE_ISSUED', { val: 99 });

  assert.equal(chain.getChain().length, 3);
  assert.equal(b1.index, 1);
  assert.equal(b2.index, 2);
  assert.equal(b2.previousHash, b1.hash);

  const verification = chain.verifyChainIntegrity();
  assert.equal(verification.isValid, true);
  assert.equal(verification.totalBlocks, 3);
});

test('StreamingCinemaHubAuditChain - cryptographic tamper detection catches modified payload', () => {
  const chain = new StreamingCinemaHubAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  chain.recordEvent('DRM_KEY_REQUESTED', { val: 30 });
  const b2 = chain.recordEvent('LICENSE_ISSUED', { val: 65 });

  b2.payload.val = 999;

  const verification = chain.verifyChainIntegrity();
  assert.equal(verification.isValid, false);
  assert.equal(verification.invalidBlockIndex, 2);
  assert.equal(verification.reason, 'Hash mismatch');
});

test('StreamingCinemaHubAuditChain - filter action returns subset of audit blocks', () => {
  const chain = new StreamingCinemaHubAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  chain.recordEvent('DRM_KEY_REQUESTED', { id: 1 });
  chain.recordEvent('LICENSE_ISSUED', { id: 2 });
  chain.recordEvent('DRM_KEY_REQUESTED', { id: 3 });

  const filtered = chain.getChain('DRM_KEY_REQUESTED');
  assert.equal(filtered.length, 2);
  assert.equal(filtered[0].action, 'DRM_KEY_REQUESTED');
  assert.equal(filtered[1].action, 'DRM_KEY_REQUESTED');
});
