import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DocsPortalAuditChain, computeAuditHash } from './audit-trail.js';

describe('DocsPortalAuditChain', () => {
  it('computes deterministic hashes from input strings', () => {
    const hash1 = computeAuditHash('docs-revision-1');
    const hash2 = computeAuditHash('docs-revision-1');
    const hash3 = computeAuditHash('docs-revision-2');

    assert.equal(typeof hash1, 'string');
    assert.equal(hash1, hash2);
    assert.notEqual(hash1, hash3);
  });

  it('initializes with a valid genesis documentation block', () => {
    const chain = new DocsPortalAuditChain({ storageKey: 'test_docs_audit_chain_1' });
    const blocks = chain.getChain();

    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].index, 0);
    assert.equal(blocks[0].action, 'GENESIS_DOCS_ROOT');
    assert.ok(blocks[0].hash.length > 0);

    const verification = chain.verifyChainIntegrity();
    assert.equal(verification.isValid, true);
    assert.equal(verification.blockCount, 1);
  });

  it('records documentation events and chains hashes sequentially', () => {
    const chain = new DocsPortalAuditChain({ storageKey: 'test_docs_audit_chain_2' });
    const block1 = chain.recordEvent('GUIDE_ADDED', { title: 'Getting Started' });
    const block2 = chain.recordEvent('API_UPDATED', { endpoint: '/v1/users' });

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

  it('detects tampering when documentation record or hash is altered', () => {
    const chain = new DocsPortalAuditChain({ storageKey: 'test_docs_audit_chain_3' });
    chain.recordEvent('RELEASE_NOTES', { version: '2.0.0' });
    chain.recordEvent('SECURITY_POLICY', { compliant: true });

    assert.equal(chain.verifyChainIntegrity().isValid, true);

    // Tamper with intermediate block
    chain.chain[1].payload = { version: 'HACKED', compliant: false };
    const checkTampered = chain.verifyChainIntegrity();
    assert.equal(checkTampered.isValid, false);
    assert.equal(checkTampered.brokenBlockIndex, 1);
  });

  it('exports formatted audit trail JSON', () => {
    const chain = new DocsPortalAuditChain({ storageKey: 'test_docs_audit_chain_4' });
    chain.recordEvent('TRANSLATION_MERGED', { lang: 'es-ES' });

    const logJson = chain.exportAuditLog();
    const parsed = JSON.parse(logJson);
    assert.ok(parsed.exportedAt);
    assert.equal(parsed.integrity.isValid, true);
    assert.equal(parsed.chain.length, 2);
  });
});
