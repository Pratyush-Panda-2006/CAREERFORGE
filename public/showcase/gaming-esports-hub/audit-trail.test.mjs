import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GamingEsportsHubAuditChain, computeAuditHash } from './audit-trail.js';

describe('GamingEsportsHubAuditChain', () => {
  it('computes deterministic hashes from input strings', () => {
    const hash1 = computeAuditHash('esports-match-1');
    const hash2 = computeAuditHash('esports-match-1');
    const hash3 = computeAuditHash('esports-match-2');

    assert.equal(typeof hash1, 'string');
    assert.equal(hash1, hash2);
    assert.notEqual(hash1, hash3);
  });

  it('initializes with a valid genesis tournament block', () => {
    const chain = new GamingEsportsHubAuditChain({ storageKey: 'test_esports_audit_chain_1' });
    const blocks = chain.getChain();

    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].index, 0);
    assert.equal(blocks[0].action, 'GENESIS_TOURNAMENT_ROOT');
    assert.ok(blocks[0].hash.length > 0);

    const verification = chain.verifyChainIntegrity();
    assert.equal(verification.isValid, true);
    assert.equal(verification.blockCount, 1);
  });

  it('records match events and chains hashes sequentially', () => {
    const chain = new GamingEsportsHubAuditChain({ storageKey: 'test_esports_audit_chain_2' });
    const block1 = chain.recordEvent('MATCH_STARTED', { matchId: 'M-101' });
    const block2 = chain.recordEvent('MATCH_FINISHED', { winner: 'Team Liquid' });

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

  it('detects tampering when tournament record or hash is altered', () => {
    const chain = new GamingEsportsHubAuditChain({ storageKey: 'test_esports_audit_chain_3' });
    chain.recordEvent('BRACKET_SEEDED', { seed: 1 });
    chain.recordEvent('PRIZE_AWARDED', { amount: 100000 });

    assert.equal(chain.verifyChainIntegrity().isValid, true);

    // Tamper with intermediate block
    chain.chain[1].payload = { seed: 99, rigged: true };
    const checkTampered = chain.verifyChainIntegrity();
    assert.equal(checkTampered.isValid, false);
    assert.equal(checkTampered.brokenBlockIndex, 1);
  });

  it('exports formatted audit trail JSON', () => {
    const chain = new GamingEsportsHubAuditChain({ storageKey: 'test_esports_audit_chain_4' });
    chain.recordEvent('MVP_VOTED', { player: 'TenZ' });

    const logJson = chain.exportAuditLog();
    const parsed = JSON.parse(logJson);
    assert.ok(parsed.exportedAt);
    assert.equal(parsed.integrity.isValid, true);
    assert.equal(parsed.chain.length, 2);
  });
});
