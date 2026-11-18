import test from 'node:test';
import assert from 'node:assert/strict';
import { EdtechAcademyAuditChain } from './audit-trail.js';

test('EdtechAcademyAuditChain - genesis block creation and valid initial integrity', () => {
  const chain = new EdtechAcademyAuditChain({
    storageKey: 'test_edtech_audit_chain_' + Date.now()
  });

  const integrity = chain.verifyChainIntegrity();
  assert.equal(integrity.isValid, true);
  assert.equal(chain.getChain().length, 1);
  assert.equal(chain.getChain()[0].action, 'GENESIS_INIT');
});

test('EdtechAcademyAuditChain - sequential block recording and previousHash chaining', () => {
  const chain = new EdtechAcademyAuditChain({
    storageKey: 'test_edtech_audit_chain_' + Date.now()
  });

  const b1 = chain.recordEvent('COURSE_COMPLETED', { courseId: 'CRS-101' });
  const b2 = chain.recordEvent('CERTIFICATE_ISSUED', { certId: 'CERT-500' });

  assert.equal(chain.getChain().length, 3);
  assert.equal(b1.index, 1);
  assert.equal(b2.index, 2);
  assert.equal(b2.previousHash, b1.hash);

  const verification = chain.verifyChainIntegrity();
  assert.equal(verification.isValid, true);
  assert.equal(verification.totalBlocks, 3);
});

test('EdtechAcademyAuditChain - cryptographic tamper detection catches modified payload', () => {
  const chain = new EdtechAcademyAuditChain({
    storageKey: 'test_edtech_audit_chain_' + Date.now()
  });

  chain.recordEvent('COURSE_COMPLETED', { courseId: 'CRS-202' });
  const b2 = chain.recordEvent('CERTIFICATE_ISSUED', { certId: 'CERT-600' });

  b2.payload.certId = 'CERT-HACKED';

  const verification = chain.verifyChainIntegrity();
  assert.equal(verification.isValid, false);
  assert.equal(verification.invalidBlockIndex, 2);
  assert.equal(verification.reason, 'Hash mismatch');
});

test('EdtechAcademyAuditChain - filter action returns subset of audit blocks', () => {
  const chain = new EdtechAcademyAuditChain({
    storageKey: 'test_edtech_audit_chain_' + Date.now()
  });

  chain.recordEvent('COURSE_COMPLETED', { id: 1 });
  chain.recordEvent('CERTIFICATE_ISSUED', { id: 2 });
  chain.recordEvent('COURSE_COMPLETED', { id: 3 });

  const filtered = chain.getChain('COURSE_COMPLETED');
  assert.equal(filtered.length, 2);
});
