import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DeveloperPortfolioAuditChain, computeAuditHash } from './audit-trail.js';

describe('DeveloperPortfolioAuditChain', () => {
  it('computes deterministic hashes from input strings', () => {
    const hash1 = computeAuditHash('developer-action-1');
    const hash2 = computeAuditHash('developer-action-1');
    const hash3 = computeAuditHash('developer-action-2');

    assert.equal(typeof hash1, 'string');
    assert.equal(hash1, hash2);
    assert.notEqual(hash1, hash3);
  });

  it('initializes with a valid genesis portfolio block', () => {
    const chain = new DeveloperPortfolioAuditChain({ storageKey: 'test_dev_audit_chain_1' });
    const blocks = chain.getChain();

    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].index, 0);
    assert.equal(blocks[0].action, 'GENESIS_PORTFOLIO_ROOT');
    assert.ok(blocks[0].hash.length > 0);

    const verification = chain.verifyChainIntegrity();
    assert.equal(verification.isValid, true);
    assert.equal(verification.blockCount, 1);
  });

  it('records development events and chains hashes sequentially', () => {
    const chain = new DeveloperPortfolioAuditChain({ storageKey: 'test_dev_audit_chain_2' });
    const block1 = chain.recordEvent('COMMIT_PUSHED', { commit: 'a1b2c3d' });
    const block2 = chain.recordEvent('RELEASE_TAGGED', { tag: 'v1.0.0' });

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

  it('detects tampering when commit record or hash is altered', () => {
    const chain = new DeveloperPortfolioAuditChain({ storageKey: 'test_dev_audit_chain_3' });
    chain.recordEvent('SKILL_VERIFIED', { skill: 'TypeScript' });
    chain.recordEvent('BADGE_AWARDED', { badge: 'Gold' });

    assert.equal(chain.verifyChainIntegrity().isValid, true);

    // Tamper with intermediate block
    chain.chain[1].payload = { skill: 'Corrupted', forged: true };
    const checkTampered = chain.verifyChainIntegrity();
    assert.equal(checkTampered.isValid, false);
    assert.equal(checkTampered.brokenBlockIndex, 1);
  });

  it('exports formatted audit trail JSON', () => {
    const chain = new DeveloperPortfolioAuditChain({ storageKey: 'test_dev_audit_chain_4' });
    chain.recordEvent('ARTICLE_PUBLISHED', { id: 'dev-to-123' });

    const logJson = chain.exportAuditLog();
    const parsed = JSON.parse(logJson);
    assert.ok(parsed.exportedAt);
    assert.equal(parsed.integrity.isValid, true);
    assert.equal(parsed.chain.length, 2);
  });
});
