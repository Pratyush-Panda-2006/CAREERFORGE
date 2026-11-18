import test from 'node:test';
import assert from 'node:assert/strict';
import { CharityMicroloansAuditChain } from './audit-trail.js';

test('CharityMicroloansAuditChain - genesis block creation and valid initial integrity', () => {
  const chain = new CharityMicroloansAuditChain({
    storageKey: 'test_charity_audit_chain_' + Date.now()
  });

  const integrity = chain.verifyChainIntegrity();
  assert.equal(integrity.isValid, true);
  assert.equal(chain.getChain().length, 1);
  assert.equal(chain.getChain()[0].action, 'GENESIS_INIT');
});

test('CharityMicroloansAuditChain - sequential block recording and previousHash chaining', () => {
  const chain = new CharityMicroloansAuditChain({
    storageKey: 'test_charity_audit_chain_' + Date.now()
  });

  const b1 = chain.recordEvent('LOAN_DISBURSED', { loanId: 'LN-101' });
  const b2 = chain.recordEvent('REPAYMENT_RECORDED', { loanId: 'LN-101', amount: 50 });

  assert.equal(chain.getChain().length, 3);
  assert.equal(b1.index, 1);
  assert.equal(b2.index, 2);
  assert.equal(b2.previousHash, b1.hash);

  const verification = chain.verifyChainIntegrity();
  assert.equal(verification.isValid, true);
  assert.equal(verification.totalBlocks, 3);
});

test('CharityMicroloansAuditChain - cryptographic tamper detection catches modified payload', () => {
  const chain = new CharityMicroloansAuditChain({
    storageKey: 'test_charity_audit_chain_' + Date.now()
  });

  chain.recordEvent('LOAN_DISBURSED', { loanId: 'LN-202' });
  const b2 = chain.recordEvent('REPAYMENT_RECORDED', { loanId: 'LN-202', amount: 100 });

  b2.payload.amount = 99999;

  const verification = chain.verifyChainIntegrity();
  assert.equal(verification.isValid, false);
  assert.equal(verification.invalidBlockIndex, 2);
  assert.equal(verification.reason, 'Hash mismatch');
});

test('CharityMicroloansAuditChain - filter action returns subset of audit blocks', () => {
  const chain = new CharityMicroloansAuditChain({
    storageKey: 'test_charity_audit_chain_' + Date.now()
  });

  chain.recordEvent('LOAN_DISBURSED', { id: 1 });
  chain.recordEvent('REPAYMENT_RECORDED', { id: 2 });
  chain.recordEvent('LOAN_DISBURSED', { id: 3 });

  const filtered = chain.getChain('LOAN_DISBURSED');
  assert.equal(filtered.length, 2);
});
