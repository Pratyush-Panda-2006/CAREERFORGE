import test from 'node:test';
import assert from 'node:assert/strict';
import { LegalSmartContractsAuditChain } from './audit-trail.js';

test('Genesis contract root creation and initial chain integrity', () => {
  const chain = new LegalSmartContractsAuditChain({
    storageKey: 'test_legal_audit_' + Date.now()
  });

  const integrity = chain.verifyChainIntegrity();
  assert.equal(integrity.isValid, true);
  assert.equal(chain.getChain().length, 1);
  assert.equal(chain.getChain()[0].action, 'GENESIS_CONTRACT_ROOT');
});

test('Sequential smart contract event recording and previousHash chaining', () => {
  const chain = new LegalSmartContractsAuditChain({
    storageKey: 'test_legal_audit_' + Date.now()
  });

  const b1 = chain.recordEvent('MULTI_SIG_EXEC', { contractId: 'ESC-1', signer: '0x1' });
  const b2 = chain.recordEvent('ARBITRATION_PETITION', { contractId: 'ESC-2', claim: '$10k' });

  assert.equal(chain.getChain().length, 3);
  assert.equal(b1.index, 1);
  assert.equal(b2.index, 2);
  assert.equal(b2.previousHash, b1.hash);

  const verification = chain.verifyChainIntegrity();
  assert.equal(verification.isValid, true);
  assert.equal(verification.totalBlocks, 3);
});

test('Cryptographic tamper detection catches mutated clause payload', () => {
  const chain = new LegalSmartContractsAuditChain({
    storageKey: 'test_legal_audit_' + Date.now()
  });

  chain.recordEvent('MULTI_SIG_EXEC', { amount: 100 });
  const b2 = chain.recordEvent('ESCROW_RELEASE', { amount: 500 });

  // Tamper with payload
  b2.payload.amount = 999999;

  const verification = chain.verifyChainIntegrity();
  assert.equal(verification.isValid, false);
  assert.equal(verification.invalidBlockIndex, 2);
  assert.equal(verification.reason, 'Hash mismatch');
});

test('Filter action returns targeted subset of contract blocks', () => {
  const chain = new LegalSmartContractsAuditChain({
    storageKey: 'test_legal_audit_' + Date.now()
  });

  chain.recordEvent('MULTI_SIG_EXEC', { id: 1 });
  chain.recordEvent('ESCROW_RELEASE', { id: 2 });
  chain.recordEvent('MULTI_SIG_EXEC', { id: 3 });

  const multiSigBlocks = chain.getChain('MULTI_SIG_EXEC');
  assert.equal(multiSigBlocks.length, 2);
  assert.equal(multiSigBlocks[0].action, 'MULTI_SIG_EXEC');
  assert.equal(multiSigBlocks[1].action, 'MULTI_SIG_EXEC');
});
