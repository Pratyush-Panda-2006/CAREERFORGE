import test from 'node:test';
import assert from 'node:assert/strict';
import { SaasLaunchpadAuditTrail } from './audit-trail.js';

test('SaasLaunchpadAuditTrail - initializes genesis block correctly', () => {
  const audit = new SaasLaunchpadAuditTrail();
  assert.equal(audit.chain.length, 1);
  const genesis = audit.chain[0];
  assert.equal(genesis.index, 0);
  assert.equal(genesis.action, 'GENESIS_SAAS_TRAIL');
  assert.equal(genesis.previousHash, '0'.repeat(64));
  assert.ok(genesis.hash.length === 64);
});

test('SaasLaunchpadAuditTrail - appendEvent appends valid cryptographic block', () => {
  const audit = new SaasLaunchpadAuditTrail();
  const block1 = audit.appendEvent('TENANT_CREATED', { tenantId: 'tenant_omega_1' });
  assert.equal(audit.chain.length, 2);
  assert.equal(block1.index, 1);
  assert.equal(block1.action, 'TENANT_CREATED');
  assert.equal(block1.previousHash, audit.chain[0].hash);
  assert.ok(block1.hash.length === 64);
});

test('SaasLaunchpadAuditTrail - verifyChain passes on valid unaltered chain', () => {
  const audit = new SaasLaunchpadAuditTrail();
  audit.appendEvent('SSO_CONFIGURED', { provider: 'Okta' });
  audit.appendEvent('KEY_ROTATED', { keyId: 'k-991' });
  audit.appendEvent('USER_INVITED', { email: 'dev@saas.com' });

  const result = audit.verifyChain();
  assert.equal(result.valid, true);
  assert.equal(result.blockCount, 4);
});

test('SaasLaunchpadAuditTrail - detects tampering in block payload', () => {
  const audit = new SaasLaunchpadAuditTrail();
  audit.appendEvent('ROLE_ASSIGNED', { role: 'member' });
  audit.appendEvent('TIER_UPGRADE', { tier: 'pro' });

  // Tamper role
  audit.tamperBlock(1, { role: 'superadmin' });
  const result = audit.verifyChain();
  assert.equal(result.valid, false);
  assert.ok(result.reason.includes('Tampered block data at index 1'));
});

test('SaasLaunchpadAuditTrail - detects broken chain previousHash', () => {
  const audit = new SaasLaunchpadAuditTrail();
  audit.appendEvent('ROLE_ASSIGNED', { role: 'member' });
  audit.appendEvent('TIER_UPGRADE', { tier: 'pro' });

  // Tamper hash link directly
  audit.chain[2].previousHash = '0123456789abcdef'.repeat(4);
  const result = audit.verifyChain();
  assert.equal(result.valid, false);
  assert.ok(result.reason.includes('Broken chain link at index 2'));
});
