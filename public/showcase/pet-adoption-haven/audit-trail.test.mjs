import test from 'node:test';
import assert from 'node:assert/strict';
import { PetAdoptionHavenAuditChain } from './audit-trail.js';

test('PetAdoptionHavenAuditChain - genesis block creation and valid initial integrity', () => {
  const chain = new PetAdoptionHavenAuditChain({
    storageKey: 'test_audit_pet_' + Date.now()
  });

  const integrity = chain.verifyChainIntegrity();
  assert.equal(integrity.isValid, true);
  assert.equal(chain.getChain().length, 1);
  assert.equal(chain.getChain()[0].action, 'GENESIS_INIT');
});

test('PetAdoptionHavenAuditChain - sequential block recording and previousHash chaining', () => {
  const chain = new PetAdoptionHavenAuditChain({
    storageKey: 'test_audit_pet_' + Date.now()
  });

  const b1 = chain.recordEvent('PET_ADOPTED', { pet: 'Bella' });
  const b2 = chain.recordEvent('VET_EXAM_PASSED', { pet: 'Bella' });

  assert.equal(chain.getChain().length, 3);
  assert.equal(b1.index, 1);
  assert.equal(b2.index, 2);
  assert.equal(b2.previousHash, b1.hash);

  const verification = chain.verifyChainIntegrity();
  assert.equal(verification.isValid, true);
  assert.equal(verification.totalBlocks, 3);
});

test('PetAdoptionHavenAuditChain - cryptographic tamper detection catches modified payload', () => {
  const chain = new PetAdoptionHavenAuditChain({
    storageKey: 'test_audit_pet_' + Date.now()
  });

  chain.recordEvent('PET_ADOPTED', { pet: 'Milo' });
  const b2 = chain.recordEvent('INTAKE_LOGGED', { pet: 'Luna' });

  b2.payload.pet = 'TamperedPet';

  const verification = chain.verifyChainIntegrity();
  assert.equal(verification.isValid, false);
  assert.equal(verification.invalidBlockIndex, 2);
  assert.equal(verification.reason, 'Hash mismatch');
});

test('PetAdoptionHavenAuditChain - filter action returns subset of audit blocks', () => {
  const chain = new PetAdoptionHavenAuditChain({
    storageKey: 'test_audit_pet_' + Date.now()
  });

  chain.recordEvent('PET_ADOPTED', { pet: 'Max' });
  chain.recordEvent('FOSTER_PLACED', { pet: 'Daisy' });
  chain.recordEvent('PET_ADOPTED', { pet: 'Rocky' });

  const adoptions = chain.filterByAction('PET_ADOPTED');
  assert.equal(adoptions.length, 2);
  assert.equal(adoptions[0].action, 'PET_ADOPTED');
  assert.equal(adoptions[1].action, 'PET_ADOPTED');
});
