import test from 'node:test';
import assert from 'node:assert/strict';
import { BiotechGenomicsAuditChain } from './audit-trail.js';

test('BiotechGenomicsAuditChain - genesis block creation and valid initial integrity', () => {
  const chain = new BiotechGenomicsAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  const integrity = chain.verifyChainIntegrity();
  assert.equal(integrity.isValid, true);
  assert.equal(chain.getChain().length, 1);
  assert.equal(chain.getChain()[0].action, 'GENESIS_INIT');
});

test('BiotechGenomicsAuditChain - sequential block recording and previousHash chaining', () => {
  const chain = new BiotechGenomicsAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  const b1 = chain.recordEvent('CRISPR_GUIDE_RNA_SYNTHESIS', { val: 42 });
  const b2 = chain.recordEvent('DNA_SEQUENCING_READ', { val: 99 });

  assert.equal(chain.getChain().length, 3);
  assert.equal(b1.index, 1);
  assert.equal(b2.index, 2);
  assert.equal(b2.previousHash, b1.hash);

  const verification = chain.verifyChainIntegrity();
  assert.equal(verification.isValid, true);
  assert.equal(verification.totalBlocks, 3);
});

test('BiotechGenomicsAuditChain - cryptographic tamper detection catches modified payload', () => {
  const chain = new BiotechGenomicsAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  chain.recordEvent('CRISPR_GUIDE_RNA_SYNTHESIS', { val: 30 });
  const b2 = chain.recordEvent('DNA_SEQUENCING_READ', { val: 65 });

  b2.payload.val = 999;

  const verification = chain.verifyChainIntegrity();
  assert.equal(verification.isValid, false);
  assert.equal(verification.invalidBlockIndex, 2);
  assert.equal(verification.reason, 'Hash mismatch');
});

test('BiotechGenomicsAuditChain - filter action returns subset of audit blocks', () => {
  const chain = new BiotechGenomicsAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  chain.recordEvent('CRISPR_GUIDE_RNA_SYNTHESIS', { id: 1 });
  chain.recordEvent('DNA_SEQUENCING_READ', { id: 2 });
  chain.recordEvent('CRISPR_GUIDE_RNA_SYNTHESIS', { id: 3 });

  const filtered = chain.getChain('CRISPR_GUIDE_RNA_SYNTHESIS');
  assert.equal(filtered.length, 2);
  assert.equal(filtered[0].action, 'CRISPR_GUIDE_RNA_SYNTHESIS');
  assert.equal(filtered[1].action, 'CRISPR_GUIDE_RNA_SYNTHESIS');
});
