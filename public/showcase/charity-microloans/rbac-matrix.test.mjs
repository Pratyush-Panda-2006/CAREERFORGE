import test from 'node:test';
import assert from 'node:assert/strict';
import { CharityMicroloansRbacEngine } from './rbac-matrix.js';

test('CharityMicroloansRbacEngine - initial roles have expected base permissions', () => {
  const engine = new CharityMicroloansRbacEngine();

  const donorMask = engine.getRoleMask('DONOR');
  const borrowerMask = engine.getRoleMask('BORROWER');
  const adminMask = engine.getRoleMask('ADMIN');

  assert.ok((donorMask & 1 << 0) !== 0, 'DONOR can VIEW_LOANS');
  assert.ok((donorMask & 1 << 1) === 0, 'DONOR cannot DISBURSE_LOANS');
  assert.ok((borrowerMask & 1 << 0) !== 0, 'BORROWER can VIEW_LOANS');
  assert.ok((borrowerMask & 1 << 2) !== 0, 'BORROWER can RECORD_REPAYMENTS');
  assert.ok(adminMask === 0xFF, 'ADMIN has ALL permissions');
});

test('CharityMicroloansRbacEngine - checkPermission grants allowed actions', () => {
  const engine = new CharityMicroloansRbacEngine();

  assert.equal(engine.checkPermission('LOAN_OFFICER', 'VIEW_LOANS'), true);
  assert.equal(engine.checkPermission('LOAN_OFFICER', 'DISBURSE_LOANS'), true);
  assert.equal(engine.checkPermission('LOAN_OFFICER', 'RECORD_REPAYMENTS'), true);
  assert.equal(engine.checkPermission('MANAGER', 'APPROVE_LOANS'), true);
  assert.equal(engine.checkPermission('ADMIN', 'REVOKE_ACCESS'), true);
  assert.equal(engine.checkPermission('ADMIN', 'MANAGE_ROLES'), true);
});

test('CharityMicroloansRbacEngine - checkPermission rejects unauthorized actions', () => {
  const engine = new CharityMicroloansRbacEngine();

  assert.equal(engine.checkPermission('DONOR', 'DISBURSE_LOANS'), false);
  assert.equal(engine.checkPermission('DONOR', 'APPROVE_LOANS'), false);
  assert.equal(engine.checkPermission('BORROWER', 'MANAGE_ROLES'), false);
  assert.equal(engine.checkPermission('LOAN_OFFICER', 'MANAGE_ROLES'), false);
  assert.equal(engine.checkPermission('DONOR', 'UNKNOWN_ACTION'), false);
});

test('CharityMicroloansRbacEngine - role inheritance resolution', () => {
  const engine = new CharityMicroloansRbacEngine();

  // MANAGER inherits LOAN_OFFICER, so it should have LOAN_OFFICER perms too
  assert.equal(engine.checkPermission('MANAGER', 'VIEW_LOANS'), true, 'MANAGER inherits VIEW_LOANS from LOAN_OFFICER');
  assert.equal(engine.checkPermission('MANAGER', 'DISBURSE_LOANS'), true, 'MANAGER inherits DISBURSE_LOANS from LOAN_OFFICER');
  assert.equal(engine.checkPermission('MANAGER', 'RECORD_REPAYMENTS'), true, 'MANAGER inherits RECORD_REPAYMENTS from LOAN_OFFICER');
  assert.equal(engine.checkPermission('MANAGER', 'MANAGE_BORROWERS'), true, 'MANAGER inherits MANAGE_BORROWERS from LOAN_OFFICER');
  assert.equal(engine.checkPermission('MANAGER', 'APPROVE_LOANS'), true, 'MANAGER has its own APPROVE_LOANS');
  assert.equal(engine.checkPermission('MANAGER', 'MANAGE_ROLES'), true, 'MANAGER has its own MANAGE_ROLES');

  // DONOR has no inheritance, should not have disburse
  assert.equal(engine.checkPermission('DONOR', 'DISBURSE_LOANS'), false);
});

test('CharityMicroloansRbacEngine - wildcard action matching grants all', () => {
  const engine = new CharityMicroloansRbacEngine();

  assert.equal(engine.checkPermission('DONOR', '*'), true);
  assert.equal(engine.checkPermission('ADMIN', '*'), true);
  assert.equal(engine.checkPermission('LOAN_OFFICER', '*'), true);
});

test('CharityMicroloansRbacEngine - assignRole stores and retrieves user role', () => {
  const engine = new CharityMicroloansRbacEngine();

  const result = engine.assignRole('alice', 'LOAN_OFFICER');
  assert.equal(result.user, 'alice');
  assert.equal(result.role, 'LOAN_OFFICER');
  assert.equal(engine.getUserRole('alice'), 'LOAN_OFFICER');

  engine.assignRole('bob', 'DONOR');
  assert.equal(engine.getUserRole('bob'), 'DONOR');

  // Reassigning overrides
  engine.assignRole('alice', 'ADMIN');
  assert.equal(engine.getUserRole('alice'), 'ADMIN');
});

test('CharityMicroloansRbacEngine - assignRole throws on unknown role', () => {
  const engine = new CharityMicroloansRbacEngine();

  assert.throws(() => engine.assignRole('alice', 'SUPER_USER'), Error);
  assert.throws(() => engine.assignRole('alice', 'NONEXISTENT'), Error);
});

test('CharityMicroloansRbacEngine - evaluatePolicyBitmask decodes granted permissions', () => {
  const engine = new CharityMicroloansRbacEngine();

  const result = engine.evaluatePolicyBitmask(0x00000001); // VIEW_LOANS only
  assert.equal(result.mask, 1);
  assert.equal(result.count, 1);
  assert.equal(result.granted[0].permission, 'VIEW_LOANS');
  assert.equal(result.isAdmin, false);

  const allResult = engine.evaluatePolicyBitmask(0xFFFFFFFF);
  assert.equal(allResult.count, 8);
  assert.equal(allResult.isAdmin, true);

  const zeroResult = engine.evaluatePolicyBitmask(0);
  assert.equal(zeroResult.count, 0);
  assert.equal(zeroResult.isAdmin, false);
});

test('CharityMicroloansRbacEngine - evaluatePolicyBitmask returns hex and binary', () => {
  const engine = new CharityMicroloansRbacEngine();

  const result = engine.evaluatePolicyBitmask(255); // 0xFF
  assert.equal(result.hex, '0x000000ff');
  assert.equal(result.binary, '00000000000000000000000011111111');
});

test('CharityMicroloansRbacEngine - custom policy guard evaluation', () => {
  const engine = new CharityMicroloansRbacEngine();

  engine.addCustomPolicy('POLICY-001', 0x00000001); // VIEW_LOANS only
  assert.equal(engine.checkPolicy('POLICY-001', 'VIEW_LOANS'), true);
  assert.equal(engine.checkPolicy('POLICY-001', 'DISBURSE_LOANS'), false);
  assert.equal(engine.checkPolicy('POLICY-001', 'APPROVE_LOANS'), false);

  assert.equal(engine.checkPolicy('UNKNOWN_POLICY', 'VIEW_LOANS'), false);
});

test('CharityMicroloansRbacEngine - unauthorized privilege rejection across roles', () => {
  const engine = new CharityMicroloansRbacEngine();

  // BORROWER cannot approve loans
  assert.equal(engine.checkPermission('BORROWER', 'APPROVE_LOANS'), false);
  // BORROWER cannot manage roles
  assert.equal(engine.checkPermission('BORROWER', 'MANAGE_ROLES'), false);
  // DONOR cannot revoke access
  assert.equal(engine.checkPermission('DONOR', 'REVOKE_ACCESS'), false);
  // Only ADMIN/MANAGER can manage roles
  assert.equal(engine.checkPermission('MANAGER', 'MANAGE_ROLES'), true);
  assert.equal(engine.checkPermission('ADMIN', 'MANAGE_ROLES'), true);
});
