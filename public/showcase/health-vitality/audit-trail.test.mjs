import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HealthVitalityAuditChain, computeAuditHash } from './audit-trail.js';

describe('HealthVitalityAuditChain', () => {
  it('computes deterministic hashes from input strings', () => {
    const hash1 = computeAuditHash('test-string');
    const hash2 = computeAuditHash('test-string');
    const hash3 = computeAuditHash('different-string');

    assert.equal(typeof hash1, 'string');
    assert.equal(hash1, hash2);
    assert.notEqual(hash1, hash3);
  });

  it('initializes with a valid genesis block', () => {
    const chain = new HealthVitalityAuditChain({ storageKey: 'test_health_audit_chain_1' });
    const blocks = chain.getChain();

    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].index, 0);
    assert.equal(blocks[0].action, 'GENESIS_HEALTH_RECORD');
    assert.ok(blocks[0].hash.length > 0);

    const verification = chain.verifyChainIntegrity();
    assert.equal(verification.isValid, true);
    assert.equal(verification.blockCount, 1);
  });

  it('records new events and links hashes sequentially', () => {
    const chain = new HealthVitalityAuditChain({ storageKey: 'test_health_audit_chain_2' });
    const block1 = chain.recordEvent('HEART_RATE_MEASURED', { bpm: 68 });
    const block2 = chain.recordEvent('CALORIES_BURNED', { kcal: 350 });

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

  it('detects tampering when block payload or hash is manipulated', () => {
    const chain = new HealthVitalityAuditChain({ storageKey: 'test_health_audit_chain_3' });
    chain.recordEvent('VITAL_SIGNS_STABLE', { status: 'NORMAL' });
    chain.recordEvent('BLOOD_PRESSURE_CHECK', { systolic: 120, diastolic: 80 });

    assert.equal(chain.verifyChainIntegrity().isValid, true);

    // Tamper with intermediate block
    chain.chain[1].payload = { status: 'CRITICAL_TAMPERED' };
    const checkTampered = chain.verifyChainIntegrity();
    assert.equal(checkTampered.isValid, false);
    assert.equal(checkTampered.brokenBlockIndex, 1);
  });

  it('exports formatted audit log JSON', () => {
    const chain = new HealthVitalityAuditChain({ storageKey: 'test_health_audit_chain_4' });
    chain.recordEvent('DIET_LOG', { waterMl: 2000 });

    const logJson = chain.exportAuditLog();
    const parsed = JSON.parse(logJson);
    assert.ok(parsed.exportedAt);
    assert.equal(parsed.integrity.isValid, true);
    assert.equal(parsed.chain.length, 2);
  });
});
