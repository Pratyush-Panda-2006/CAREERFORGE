import test from 'node:test';
import assert from 'node:assert/strict';
import { AiVoiceStudioAuditChain } from './audit-trail.js';

test('AiVoiceStudioAuditChain - genesis block creation and valid initial integrity', () => {
  const chain = new AiVoiceStudioAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  const integrity = chain.verifyChainIntegrity();
  assert.equal(integrity.isValid, true);
  assert.equal(chain.getChain().length, 1);
  assert.equal(chain.getChain()[0].action, 'GENESIS_INIT');
});

test('AiVoiceStudioAuditChain - sequential block recording and previousHash chaining', () => {
  const chain = new AiVoiceStudioAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  const b1 = chain.recordEvent('VOICE_CLONE_CONSENT', { val: 42 });
  const b2 = chain.recordEvent('SYNTHESIS_QUEUED', { val: 99 });

  assert.equal(chain.getChain().length, 3);
  assert.equal(b1.index, 1);
  assert.equal(b2.index, 2);
  assert.equal(b2.previousHash, b1.hash);

  const verification = chain.verifyChainIntegrity();
  assert.equal(verification.isValid, true);
  assert.equal(verification.totalBlocks, 3);
});

test('AiVoiceStudioAuditChain - cryptographic tamper detection catches modified payload', () => {
  const chain = new AiVoiceStudioAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  chain.recordEvent('VOICE_CLONE_CONSENT', { val: 30 });
  const b2 = chain.recordEvent('SYNTHESIS_QUEUED', { val: 65 });

  b2.payload.val = 999;

  const verification = chain.verifyChainIntegrity();
  assert.equal(verification.isValid, false);
  assert.equal(verification.invalidBlockIndex, 2);
  assert.equal(verification.reason, 'Hash mismatch');
});

test('AiVoiceStudioAuditChain - filter action returns subset of audit blocks', () => {
  const chain = new AiVoiceStudioAuditChain({
    storageKey: 'test_audit_chain_' + Date.now()
  });

  chain.recordEvent('VOICE_CLONE_CONSENT', { id: 1 });
  chain.recordEvent('SYNTHESIS_QUEUED', { id: 2 });
  chain.recordEvent('VOICE_CLONE_CONSENT', { id: 3 });

  const filtered = chain.getChain('VOICE_CLONE_CONSENT');
  assert.equal(filtered.length, 2);
  assert.equal(filtered[0].action, 'VOICE_CLONE_CONSENT');
  assert.equal(filtered[1].action, 'VOICE_CLONE_CONSENT');
});
