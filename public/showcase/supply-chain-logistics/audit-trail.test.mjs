import test from 'node:test';
import assert from 'node:assert/strict';
import { SupplyChainLogisticsAuditChain } from './audit-trail.js';

test('SupplyChainLogisticsAuditChain - genesis block creation and valid initial integrity', () => {
  const chain = new SupplyChainLogisticsAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  const integrity = chain.verifyChainIntegrity();
  assert.equal(integrity.isValid, true);
  assert.equal(chain.getChain().length, 1);
  assert.equal(chain.getChain()[0].action, 'GENESIS_INIT');
});

test('SupplyChainLogisticsAuditChain - sequential block recording and previousHash chaining', () => {
  const chain = new SupplyChainLogisticsAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  const b1 = chain.recordEvent('RFID_PALLET_SCAN', { val: 42 });
  const b2 = chain.recordEvent('COLD_CHAIN_TEMP_LOG', { val: 99 });

  assert.equal(chain.getChain().length, 3);
  assert.equal(b1.index, 1);
  assert.equal(b2.index, 2);
  assert.equal(b2.previousHash, b1.hash);

  const verification = chain.verifyChainIntegrity();
  assert.equal(verification.isValid, true);
  assert.equal(verification.totalBlocks, 3);
});

test('SupplyChainLogisticsAuditChain - cryptographic tamper detection catches modified payload', () => {
  const chain = new SupplyChainLogisticsAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  chain.recordEvent('RFID_PALLET_SCAN', { val: 30 });
  const b2 = chain.recordEvent('COLD_CHAIN_TEMP_LOG', { val: 65 });

  b2.payload.val = 999;

  const verification = chain.verifyChainIntegrity();
  assert.equal(verification.isValid, false);
  assert.equal(verification.invalidBlockIndex, 2);
  assert.equal(verification.reason, 'Hash mismatch');
});

test('SupplyChainLogisticsAuditChain - filter action returns subset of audit blocks', () => {
  const chain = new SupplyChainLogisticsAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  chain.recordEvent('RFID_PALLET_SCAN', { id: 1 });
  chain.recordEvent('COLD_CHAIN_TEMP_LOG', { id: 2 });
  chain.recordEvent('RFID_PALLET_SCAN', { id: 3 });

  const filtered = chain.getChain('RFID_PALLET_SCAN');
  assert.equal(filtered.length, 2);
  assert.equal(filtered[0].action, 'RFID_PALLET_SCAN');
  assert.equal(filtered[1].action, 'RFID_PALLET_SCAN');
});
