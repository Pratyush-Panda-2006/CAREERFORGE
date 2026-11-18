import test from 'node:test';
import assert from 'node:assert/strict';
import { EcommerceStoreAuditTrail } from './audit-trail.js';

test('EcommerceStoreAuditTrail - initializes genesis block correctly', () => {
  const audit = new EcommerceStoreAuditTrail();
  assert.equal(audit.chain.length, 1);
  const genesis = audit.chain[0];
  assert.equal(genesis.index, 0);
  assert.equal(genesis.action, 'GENESIS_ORDER_LEDGER');
  assert.equal(genesis.previousHash, '0'.repeat(64));
  assert.ok(genesis.hash.length === 64);
});

test('EcommerceStoreAuditTrail - appendEvent appends valid cryptographic block', () => {
  const audit = new EcommerceStoreAuditTrail();
  const block1 = audit.appendEvent('ORDER_PLACED', { orderId: 'ORD-101', total: 49.99 });
  assert.equal(audit.chain.length, 2);
  assert.equal(block1.index, 1);
  assert.equal(block1.action, 'ORDER_PLACED');
  assert.equal(block1.previousHash, audit.chain[0].hash);
  assert.ok(block1.hash.length === 64);
});

test('EcommerceStoreAuditTrail - verifyChain passes on valid unaltered chain', () => {
  const audit = new EcommerceStoreAuditTrail();
  audit.appendEvent('CHECKOUT_INIT', { cartId: 'C-1' });
  audit.appendEvent('PAYMENT_PROCESSED', { status: 'SUCCESS' });
  audit.appendEvent('ORDER_FULFILLED', { tracking: 'TRK-999' });

  const result = audit.verifyChain();
  assert.equal(result.valid, true);
  assert.equal(result.blockCount, 4);
});

test('EcommerceStoreAuditTrail - detects tampering in block payload', () => {
  const audit = new EcommerceStoreAuditTrail();
  audit.appendEvent('PAYMENT_PROCESSED', { amount: 100 });
  audit.appendEvent('ORDER_DISPATCHED', { carrier: 'FedEx' });

  // Tamper middle block
  audit.tamperBlock(1, { amount: 10000 });
  const result = audit.verifyChain();
  assert.equal(result.valid, false);
  assert.ok(result.reason.includes('Tampered block data at index 1'));
});

test('EcommerceStoreAuditTrail - detects broken chain previousHash', () => {
  const audit = new EcommerceStoreAuditTrail();
  audit.appendEvent('PAYMENT_PROCESSED', { amount: 100 });
  audit.appendEvent('ORDER_DISPATCHED', { carrier: 'FedEx' });

  // Tamper hash link directly
  audit.chain[2].previousHash = 'f'.repeat(64);
  const result = audit.verifyChain();
  assert.equal(result.valid, false);
  assert.ok(result.reason.includes('Broken chain link at index 2'));
});
