import test from 'node:test';
import assert from 'node:assert/strict';
import { CybersecuritySentinelAuditChain } from './audit-trail.js';

test('CybersecuritySentinelAuditChain - genesis block creation and valid initial integrity', () => {
  const chain = new CybersecuritySentinelAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  const integrity = chain.verifyChainIntegrity();
  assert.equal(integrity.isValid, true);
  assert.equal(chain.getChain().length, 1);
  assert.equal(chain.getChain()[0].action, 'GENESIS_INIT');
});

test('CybersecuritySentinelAuditChain - sequential block recording and previousHash chaining', () => {
  const chain = new CybersecuritySentinelAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  const b1 = chain.recordEvent('IDS_ALERT_TRIGGERED', { val: 42 });
  const b2 = chain.recordEvent('FIREWALL_RULE_UPDATED', { val: 99 });

  assert.equal(chain.getChain().length, 3);
  assert.equal(b1.index, 1);
  assert.equal(b2.index, 2);
  assert.equal(b2.previousHash, b1.hash);

  const verification = chain.verifyChainIntegrity();
  assert.equal(verification.isValid, true);
  assert.equal(verification.totalBlocks, 3);
});

test('CybersecuritySentinelAuditChain - cryptographic tamper detection catches modified payload', () => {
  const chain = new CybersecuritySentinelAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  chain.recordEvent('IDS_ALERT_TRIGGERED', { val: 30 });
  const b2 = chain.recordEvent('FIREWALL_RULE_UPDATED', { val: 65 });

  b2.payload.val = 999;

  const verification = chain.verifyChainIntegrity();
  assert.equal(verification.isValid, false);
  assert.equal(verification.invalidBlockIndex, 2);
  assert.equal(verification.reason, 'Hash mismatch');
});

test('CybersecuritySentinelAuditChain - filter action returns subset of audit blocks', () => {
  const chain = new CybersecuritySentinelAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  chain.recordEvent('IDS_ALERT_TRIGGERED', { id: 1 });
  chain.recordEvent('FIREWALL_RULE_UPDATED', { id: 2 });
  chain.recordEvent('IDS_ALERT_TRIGGERED', { id: 3 });

  const filtered = chain.getChain('IDS_ALERT_TRIGGERED');
  assert.equal(filtered.length, 2);
  assert.equal(filtered[0].action, 'IDS_ALERT_TRIGGERED');
  assert.equal(filtered[1].action, 'IDS_ALERT_TRIGGERED');
});
