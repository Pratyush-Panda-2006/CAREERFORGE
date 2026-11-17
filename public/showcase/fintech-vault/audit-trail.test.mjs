import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FintechVaultAuditChain, computeAuditHash } from './audit-trail.js';

describe('FintechVaultAuditChain', () => {
  it('computes deterministic hashes from input strings', () => {
    const hash1 = computeAuditHash('fintech-tx-1');
    const hash2 = computeAuditHash('fintech-tx-1');
    const hash3 = computeAuditHash('fintech-tx-2');

    assert.equal(typeof hash1, 'string');
    assert.equal(hash1, hash2);
    assert.notEqual(hash1, hash3);
  });

  it('initializes with a valid genesis ledger block', () => {
    const chain = new FintechVaultAuditChain({ storageKey: 'test_fintech_audit_chain_1' });
    const blocks = chain.getChain();

    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].index, 0);
    assert.equal(blocks[0].action, 'GENESIS_VAULT_ROOT');
    assert.ok(blocks[0].hash.length > 0);

    const verification = chain.verifyChainIntegrity();
    assert.equal(verification.isValid, true);
    assert.equal(verification.blockCount, 1);
  });

  it('records financial transactions and chains hashes sequentially', () => {
    const chain = new FintechVaultAuditChain({ storageKey: 'test_fintech_audit_chain_2' });
    const block1 = chain.recordEvent('DEPOSIT_ESCROW', { amount: 10000 });
    const block2 = chain.recordEvent('PAYMENT_DISBURSED', { amount: 4500 });

    const blocks = chain.getChain();
    assert.equal(blocks.length, 3);
    assert.equal(block1.index, 1);
    assert.equal(block2.index, 2);
    assert.equal(block1.previousHash, blocks[0].hash);
    assert.equal(block2.previousHash, block1.hash);

    const integrity = chain.verifyChainIntegrity();
    assert.equal(integrity.isValid, true);
    assert.equal(integrity.blockCount, 3);
  });

  it('detects tampering when transaction ledger or hash is corrupted', () => {
    const chain = new FintechVaultAuditChain({ storageKey: 'test_fintech_audit_chain_3' });
    chain.recordEvent('TREASURY_TRANSFER', { amount: 50000 });
    chain.recordEvent('AUDIT_VERIFIED', { verified: true });

    assert.equal(chain.verifyChainIntegrity().isValid, true);

    // Tamper with intermediate block
    chain.chain[1].payload = { amount: 999999, forged: true };
    const checkTampered = chain.verifyChainIntegrity();
    assert.equal(checkTampered.isValid, false);
    assert.equal(checkTampered.brokenBlockIndex, 1);
  });

  it('exports formatted audit trail JSON', () => {
    const chain = new FintechVaultAuditChain({ storageKey: 'test_fintech_audit_chain_4' });
    chain.recordEvent('FEE_COLLECTED', { fee: 25 });

    const logJson = chain.exportAuditLog();
    const parsed = JSON.parse(logJson);
    assert.ok(parsed.exportedAt);
    assert.equal(parsed.integrity.isValid, true);
    assert.equal(parsed.chain.length, 2);
  });
});
