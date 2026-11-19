import test from 'node:test';
import assert from 'node:assert/strict';
import { computeAuditHash, LuxuryRealmsAuditChain } from './audit-trail.js';

test('computeAuditHash produces stable, unique hashes', () => {
  const hash1 = computeAuditHash('luxury-realms-event-1');
  const hash2 = computeAuditHash('luxury-realms-event-1');
  const hash3 = computeAuditHash('luxury-realms-event-2');

  assert.equal(hash1, hash2);
  assert.notEqual(hash1, hash3);
  assert.equal(hash1.length, 64);
});

test('LuxuryRealmsAuditChain initializes with genesis block', () => {
  const chain = new LuxuryRealmsAuditChain({ storageKey: 'test_luxury_key_1' });
  const blocks = chain.getChain();

  assert.equal(blocks.length, 1);
  assert.equal(blocks[0].index, 0);
  assert.equal(blocks[0].action, 'GENESIS_INIT');
  assert.equal(chain.verifyChainIntegrity().isValid, true);
});

test('LuxuryRealmsAuditChain records and chains events securely', () => {
  const chain = new LuxuryRealmsAuditChain({ storageKey: 'test_luxury_key_2' });
  chain.recordEvent('PROPERTY_LISTED', { property: 'Villa Azure', price: 8500000 });
  chain.recordEvent('PRICE_REVISED', { property: 'Villa Azure', price: 8200000 });

  const blocks = chain.getChain();
  assert.equal(blocks.length, 3);
  assert.equal(blocks[1].previousHash, blocks[0].hash);
  assert.equal(blocks[2].previousHash, blocks[1].hash);

  const verification = chain.verifyChainIntegrity();
  assert.equal(verification.isValid, true);
  assert.equal(verification.totalBlocks, 3);
});

test('LuxuryRealmsAuditChain detects tampering', () => {
  const chain = new LuxuryRealmsAuditChain({ storageKey: 'test_luxury_key_3' });
  chain.recordEvent('ESCROW_OPENED', { escrowId: 'ESC-9901' });

  assert.equal(chain.verifyChainIntegrity().isValid, true);

  // Tamper with payload
  chain.chain[1].payload.escrowId = 'TAMPERED';
  assert.equal(chain.verifyChainIntegrity().isValid, false);
});
