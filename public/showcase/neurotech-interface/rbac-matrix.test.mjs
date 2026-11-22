import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NeurotechInterfaceRbacEngine,
  Permissions,
  ActionToPermission
} from './rbac-matrix.js';

test('RBAC Engine - initial role registry and permission bitmasks', () => {
  const engine = new NeurotechInterfaceRbacEngine();
  const observerMask = engine.calculateRoleBitmask('OBSERVER');
  assert.equal(observerMask, Permissions.READ_TELEMETRY);

  const policy = engine.evaluatePolicyBitmask(observerMask);
  assert.ok(policy.activePermissions.includes('READ_TELEMETRY'));
  assert.equal(policy.hasSafetyCritical, false);
});

test('RBAC Engine - role inheritance chain resolution', () => {
  const engine = new NeurotechInterfaceRbacEngine();
  
  // TECHNICIAN inherits OBSERVER
  const techChain = engine.getRoleInheritanceChain('TECHNICIAN');
  assert.deepEqual(techChain, ['TECHNICIAN', 'OBSERVER']);

  const techMask = engine.calculateRoleBitmask('TECHNICIAN');
  // TECHNICIAN should have READ_TELEMETRY (inherited) + WRITE_CALIBRATION + MANAGE_DEVICE_SYNC
  assert.equal((techMask & Permissions.READ_TELEMETRY) !== 0, true);
  assert.equal((techMask & Permissions.WRITE_CALIBRATION) !== 0, true);
  assert.equal((techMask & Permissions.MANAGE_DEVICE_SYNC) !== 0, true);
  assert.equal((techMask & Permissions.STIMULATE_NEURAL) !== 0, false);

  // CHIEF_ENGINEER multi-inheritance (RESEARCHER & SAFETY_OFFICER)
  const chiefMask = engine.calculateRoleBitmask('CHIEF_ENGINEER');
  const chiefPolicy = engine.evaluatePolicyBitmask(chiefMask);
  assert.ok(chiefPolicy.activePermissions.includes('ADMINISTER_USERS'));
  assert.ok(chiefPolicy.activePermissions.includes('OVERRIDE_SAFETY'));
  assert.ok(chiefPolicy.activePermissions.includes('STIMULATE_NEURAL'));
  assert.ok(chiefPolicy.activePermissions.includes('READ_TELEMETRY'));
  assert.equal(chiefPolicy.hasSafetyCritical, true);
});

test('RBAC Engine - checkPermission role and action resolution', () => {
  const engine = new NeurotechInterfaceRbacEngine();

  // Direct action check on role
  assert.equal(engine.checkPermission('OBSERVER', 'telemetry:read'), true);
  assert.equal(engine.checkPermission('OBSERVER', 'calibration:write'), false);

  // Inherited action check
  assert.equal(engine.checkPermission('RESEARCHER', 'telemetry:read'), true);
  assert.equal(engine.checkPermission('RESEARCHER', 'neural:stimulate'), true);
  assert.equal(engine.checkPermission('RESEARCHER', 'safety:override'), false);

  // Safety Officer
  assert.equal(engine.checkPermission('SAFETY_OFFICER', 'safety:override'), true);
  assert.equal(engine.checkPermission('SAFETY_OFFICER', 'neural:stimulate'), false);
});

test('RBAC Engine - wildcard action matching', () => {
  const engine = new NeurotechInterfaceRbacEngine();

  // Wildcard action matches
  assert.equal(engine.checkPermission('OBSERVER', 'telemetry:*'), true);
  assert.equal(engine.checkPermission('TECHNICIAN', 'calibration:*'), true);
  assert.equal(engine.checkPermission('SAFETY_OFFICER', 'safety:*'), true);

  // Global wildcard matches full permission set
  assert.equal(engine.checkPermission('CHIEF_ENGINEER', '*'), true);
  assert.equal(engine.checkPermission('OBSERVER', '*'), false);
});

test('RBAC Engine - user assignment and privilege evaluation', () => {
  const engine = new NeurotechInterfaceRbacEngine();
  const userId = 'operator_alpha_01';

  engine.assignRole(userId, 'TECHNICIAN');
  assert.deepEqual(engine.getUserRoles(userId), ['TECHNICIAN']);
  assert.equal(engine.checkPermission(userId, 'telemetry:read'), true);
  assert.equal(engine.checkPermission(userId, 'device:sync'), true);
  assert.equal(engine.checkPermission(userId, 'neural:stimulate'), false);

  // Dynamic role assignment
  engine.assignRole(userId, 'SAFETY_OFFICER');
  assert.equal(engine.checkPermission(userId, 'safety:override'), true);

  // Role revocation
  engine.revokeRole(userId, 'SAFETY_OFFICER');
  assert.equal(engine.checkPermission(userId, 'safety:override'), false);
});

test('RBAC Engine - dynamic temporary access grant and expiration', () => {
  const engine = new NeurotechInterfaceRbacEngine();
  const userId = 'guest_observer_99';

  engine.assignRole(userId, 'OBSERVER');
  assert.equal(engine.checkPermission(userId, 'neural:stimulate'), false);

  // Grant temporary access with 5000ms duration
  engine.grantTemporaryPermission(userId, 'neural:stimulate', 5000);
  assert.equal(engine.checkPermission(userId, 'neural:stimulate'), true);

  // Manual revocation
  engine.revokeTemporaryPermission(userId, 'neural:stimulate');
  assert.equal(engine.checkPermission(userId, 'neural:stimulate'), false);

  // Grant already expired permission
  engine.grantTemporaryPermission(userId, 'neural:stimulate', -100);
  assert.equal(engine.checkPermission(userId, 'neural:stimulate'), false);
});

test('RBAC Engine - unauthorized privilege rejection and safety guarding', () => {
  const engine = new NeurotechInterfaceRbacEngine();
  const untrustedUser = 'untrusted_client';
  engine.assignRole(untrustedUser, 'OBSERVER');

  // Unauthorized actions must be rejected
  assert.equal(engine.checkPermission(untrustedUser, 'safety:override'), false);
  assert.equal(engine.checkPermission(untrustedUser, 'debug:core'), false);
  assert.equal(engine.checkPermission(untrustedUser, 'users:admin'), false);
  assert.equal(engine.checkPermission(untrustedUser, 'nonexistent:action'), false);

  // Toggle permission directly on role
  engine.toggleRolePermission('OBSERVER', 'DEBUG_SYSTEM_CORE');
  assert.equal(engine.checkPermission(untrustedUser, 'debug:core'), true);
  engine.toggleRolePermission('OBSERVER', 'DEBUG_SYSTEM_CORE');
  assert.equal(engine.checkPermission(untrustedUser, 'debug:core'), false);
});
