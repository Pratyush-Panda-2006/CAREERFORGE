import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FintechVaultRbacEngine } from './rbac-matrix.js';

test('FintechVaultRbacEngine - Role inheritance resolution and hierarchical bitmask calculation', () => {
  const rbac = new FintechVaultRbacEngine();

  // Viewer: only READ (bit 1)
  const viewerMask = rbac.calculateRoleBitmask('viewer');
  assert.strictEqual(viewerMask, FintechVaultRbacEngine.PERMISSIONS.READ);

  // Operator: inherits Viewer (READ + WRITE = 1 + 2 = 3)
  const operatorMask = rbac.calculateRoleBitmask('operator');
  assert.strictEqual(operatorMask, FintechVaultRbacEngine.PERMISSIONS.READ | FintechVaultRbacEngine.PERMISSIONS.WRITE);

  // Settlement Officer: inherits Operator -> inherits Viewer (READ + WRITE + EXECUTE = 1 + 2 + 4 = 7)
  const settlementMask = rbac.calculateRoleBitmask('settlement_officer');
  assert.strictEqual(
    settlementMask,
    FintechVaultRbacEngine.PERMISSIONS.READ |
      FintechVaultRbacEngine.PERMISSIONS.WRITE |
      FintechVaultRbacEngine.PERMISSIONS.EXECUTE
  );

  // Role inheritance set resolution
  const settlementAncestors = rbac.resolveRoleInheritance('settlement_officer');
  assert.ok(settlementAncestors.has('settlement_officer'));
  assert.ok(settlementAncestors.has('operator'));
  assert.ok(settlementAncestors.has('viewer'));
  assert.strictEqual(settlementAncestors.size, 3);
});

test('FintechVaultRbacEngine - Multi-parent role inheritance (Vault Admin)', () => {
  const rbac = new FintechVaultRbacEngine();

  // Vault Admin inherits settlement_officer AND compliance_lead
  const adminAncestors = rbac.resolveRoleInheritance('vault_admin');
  assert.ok(adminAncestors.has('vault_admin'));
  assert.ok(adminAncestors.has('settlement_officer'));
  assert.ok(adminAncestors.has('operator'));
  assert.ok(adminAncestors.has('viewer'));
  assert.ok(adminAncestors.has('compliance_lead'));
  assert.ok(adminAncestors.has('analyst'));

  const adminMask = rbac.calculateRoleBitmask('vault_admin');
  // Admin should have SUPER_ADMIN flag
  assert.ok((adminMask & FintechVaultRbacEngine.PERMISSIONS.SUPER_ADMIN) !== 0);
  // Admin should inherit READ from viewer
  assert.ok((adminMask & FintechVaultRbacEngine.PERMISSIONS.READ) !== 0);
  // Admin should inherit FREEZE_VAULT from compliance_lead
  assert.ok((adminMask & FintechVaultRbacEngine.PERMISSIONS.FREEZE_VAULT) !== 0);
});

test('FintechVaultRbacEngine - Wildcard action matching and policy guard evaluation', () => {
  const rbac = new FintechVaultRbacEngine();

  // Analyst role has ['reports:*', 'audit:read', 'telemetry:*']
  assert.strictEqual(rbac.checkPermission('analyst', 'reports:export:csv'), true);
  assert.strictEqual(rbac.checkPermission('analyst', 'reports:quarterly'), true);
  assert.strictEqual(rbac.checkPermission('analyst', 'audit:read'), true);
  assert.strictEqual(rbac.checkPermission('analyst', 'telemetry:stress:start'), true);

  // Negative matching for analyst
  assert.strictEqual(rbac.checkPermission('analyst', 'transfers:execute'), false);
  assert.strictEqual(rbac.checkPermission('analyst', 'vault:freeze'), false);

  // Global wildcard '*' for vault_admin
  assert.strictEqual(rbac.checkPermission('vault_admin', 'arbitrary:danger:action'), true);
  assert.strictEqual(rbac.checkPermission('vault_admin', 'vault:reconfigure:nodes'), true);
});

test('FintechVaultRbacEngine - Unauthorized privilege rejection and canonical bitmask check', () => {
  const rbac = new FintechVaultRbacEngine();

  // Viewer cannot execute or freeze vault
  assert.strictEqual(rbac.checkPermission('viewer', 'EXECUTE'), false);
  assert.strictEqual(rbac.checkPermission('viewer', 'FREEZE_VAULT'), false);
  assert.strictEqual(rbac.checkPermission('viewer', 'SUPER_ADMIN'), false);

  // Viewer can READ
  assert.strictEqual(rbac.checkPermission('viewer', 'READ'), true);

  // Compliance lead cannot execute settlement transfer directly without settlement role
  // (compliance_lead has APPROVE and FREEZE_VAULT, but not EXECUTE)
  assert.strictEqual(rbac.checkPermission('compliance_lead', 'EXECUTE'), false);
  assert.strictEqual(rbac.checkPermission('compliance_lead', 'FREEZE_VAULT'), true);
  assert.strictEqual(rbac.checkPermission('compliance_lead', 'APPROVE'), true);
});

test('FintechVaultRbacEngine - evaluatePolicyBitmask detailed breakdown', () => {
  const rbac = new FintechVaultRbacEngine();

  // Bitmask with READ (1) and FREEZE_VAULT (64) = 65 (0b01000001)
  const evalResult = rbac.evaluatePolicyBitmask(65);
  assert.strictEqual(evalResult.mask, 65);
  assert.strictEqual(evalResult.binaryString, '01000001');
  assert.strictEqual(evalResult.hexString, '0x41');
  assert.ok(evalResult.granted.includes('READ'));
  assert.ok(evalResult.granted.includes('FREEZE_VAULT'));
  assert.ok(evalResult.denied.includes('WRITE'));
  assert.ok(evalResult.denied.includes('SUPER_ADMIN'));
  assert.strictEqual(evalResult.canFreeze, true);
  assert.strictEqual(evalResult.isSuperAdmin, false);
});

test('FintechVaultRbacEngine - User role assignment and access evaluation', () => {
  const rbac = new FintechVaultRbacEngine();

  rbac.assignRole('alice', 'operator');
  assert.deepStrictEqual(rbac.getUserRoles('alice'), ['operator']);

  // alice inherits viewer (READ) and operator (WRITE)
  assert.strictEqual(rbac.evaluateUserAccess('alice', 'READ'), true);
  assert.strictEqual(rbac.evaluateUserAccess('alice', 'WRITE'), true);
  assert.strictEqual(rbac.evaluateUserAccess('alice', 'EXECUTE'), false);

  // Assign second role to alice
  rbac.assignRole('alice', 'settlement_officer');
  assert.strictEqual(rbac.evaluateUserAccess('alice', 'EXECUTE'), true);

  // Revoke role
  rbac.revokeRole('alice', 'settlement_officer');
  assert.strictEqual(rbac.evaluateUserAccess('alice', 'EXECUTE'), false);

  // Invalid user or role error handling
  assert.throws(() => rbac.assignRole('', 'operator'), /Invalid user identifier/);
  assert.throws(() => rbac.assignRole('bob', 'nonexistent_role'), /does not exist in RBAC registry/);
});

test('FintechVaultRbacEngine - Static wildcard matcher glob handling', () => {
  assert.strictEqual(FintechVaultRbacEngine.matchWildcard('*', 'anything'), true);
  assert.strictEqual(FintechVaultRbacEngine.matchWildcard('transfers:*', 'transfers:stage'), true);
  assert.strictEqual(FintechVaultRbacEngine.matchWildcard('transfers:*', 'transfers:execute'), true);
  assert.strictEqual(FintechVaultRbacEngine.matchWildcard('transfers:*', 'audit:read'), false);
  assert.strictEqual(FintechVaultRbacEngine.matchWildcard('audit:*:verified', 'audit:transactions:verified'), true);
  assert.strictEqual(FintechVaultRbacEngine.matchWildcard('audit:*:verified', 'audit:transactions:rejected'), false);
});
