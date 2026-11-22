import test from 'node:test';
import assert from 'node:assert/strict';
import { EcommerceStoreRbacEngine as Engine, ACTIONS } from './rbac-matrix.js';
const admin = 'owner-demo';
test('default transitive inheritance grants known actions only', () => {
  const e = new Engine();
  assert.equal(e.checkPermission('manager', 'catalog:read'), true);
  assert.equal(e.checkPermission('manager', 'orders:write'), true);
  assert.equal(e.checkPermission('manager', 'inventory:write'), true);
  assert.equal(e.checkPermission('manager', 'policy:manage'), false);
  assert.equal(e.checkPermission('customer', 'orders:read'), false);
});
test('wildcards expand against the exact allow-list and namespace boundary', () => {
  const e = new Engine();
  e.updateRole('customer', { parents: [], permissions: ['orders:*'] }, admin);
  assert.equal(e.checkPermission('customer', 'orders:read'), true);
  assert.equal(e.checkPermission('customer', 'orders:write'), true);
  assert.equal(e.checkPermission('customer', 'inventory:read'), false);
  assert.equal(e.checkPermission('owner', 'orders:delete'), false);
  for (const a of ACTIONS) assert.equal(e.checkPermission('owner', a), true);
});
test('all 128 masks reconcile with an independent action-set reference', () => {
  const e = new Engine();
  const allowed = ['catalog:read', 'orders:read', 'orders:write', 'inventory:read'];
  for (let mask = 0; mask < 128; mask++) {
    const expected = ACTIONS.every((a, bit) => !(Math.floor(mask / 2 ** bit) % 2) || allowed.includes(a));
    assert.equal(e.evaluatePolicyBitmask(mask, 'clerk'), expected);
  }
  assert.equal(e.evaluatePolicyBitmask(1), true);
  assert.equal(e.evaluatePolicyBitmask(17), false);
  assert.equal(e.evaluatePolicyBitmask(0, 'missing'), false);
});
test('unknown or malformed permission checks fail closed', () => {
  const e = new Engine();
  for (const r of ['missing', '__proto__', null, {}, 1]) assert.equal(e.checkPermission(r, 'catalog:read'), false);
  for (const a of ['*', 'catalog:*', 'catalog:read:extra', '', null, {}]) assert.equal(e.checkPermission('owner', a), false);
});
test('assignment requires an explicitly authorized current actor', () => {
  const e = new Engine(), before = e.snapshot();
  for (const actor of ['shopper-demo', 'clerk-demo', 'missing', undefined]) assert.throws(() => e.assignRole('shopper-demo', 'owner', actor));
  assert.deepEqual(e.snapshot(), before);
  e.assignRole('shopper-demo', 'manager', admin);
  assert.equal(e.snapshot().users.find(x => x.user === 'shopper-demo').role, 'manager');
});
test('proposed grants cannot authorize their own policy mutation', () => {
  const e = new Engine(), before = e.snapshot();
  assert.throws(() => e.updateRole('customer', { parents: ['owner'], permissions: ['*'] }, 'shopper-demo'), /Denied/);
  assert.deepEqual(e.snapshot(), before);
});
test('legitimate delegation can be granted and revoked by the owner', () => {
  const e = new Engine();
  e.updateRole('clerk', { parents: ['customer'], permissions: ['roles:assign'] }, admin);
  e.assignRole('shopper-demo', 'manager', 'clerk-demo');
  e.updateRole('clerk', { parents: ['customer'], permissions: [] }, admin);
  assert.throws(() => e.assignRole('shopper-demo', 'owner', 'clerk-demo'), /Denied/);
});
test('removing direct permissions preserves inherited grants', () => {
  const e = new Engine();
  e.updateRole('clerk', { parents: ['customer'], permissions: [] }, admin);
  assert.equal(e.checkPermission('clerk', 'catalog:read'), true);
  assert.equal(e.checkPermission('clerk', 'orders:read'), false);
  e.updateRole('clerk', { parents: [], permissions: [] }, admin);
  assert.equal(e.checkPermission('clerk', 'catalog:read'), false);
});
test('parent changes immediately update descendants without stale cached grants', () => {
  const e = new Engine();
  e.updateRole('customer', { parents: [], permissions: [] }, admin);
  assert.equal(e.checkPermission('manager', 'catalog:read'), false);
});
test('self cycles, transitive cycles and unknown parents retain old state', () => {
  const e = new Engine(), before = e.snapshot();
  for (const parents of [['customer'], ['manager'], ['missing']]) {
    assert.throws(() => e.updateRole('customer', { parents, permissions: [] }, admin));
    assert.deepEqual(e.snapshot(), before);
  }
});
test('invalid patterns and duplicate or oversized lists are rejected atomically', () => {
  const e = new Engine(), before = e.snapshot();
  for (const permissions of [['orders*'], ['*:read'], ['unknown:*'], ['orders:delete'], ['orders:read', 'orders:read'], Array(8).fill('*')]) {
    assert.throws(() => e.updateRole('customer', { parents: [], permissions }, admin));
    assert.deepEqual(e.snapshot(), before);
  }
});
test('policy getters, prototypes, sparse arrays and extra fields are rejected', () => {
  const e = new Engine(), before = e.snapshot(); let calls = 0;
  const accessor = { get parents() { calls++; return []; }, permissions: [] };
  const values = [accessor, Object.create(null), JSON.parse('{"parents":[],"permissions":[],"__proto__":{}}'), { parents: [], permissions: new Array(2) }, { parents: [], permissions: [], extra: true }];
  for (const value of values) assert.throws(() => e.updateRole('customer', value, admin));
  assert.equal(calls, 0); assert.deepEqual(e.snapshot(), before);
});
test('input and returned snapshots cannot mutate active permissions', () => {
  const e = new Engine(), value = { parents: [], permissions: ['catalog:read'] };
  e.updateRole('customer', value, admin); value.permissions.push('*');
  const snapshot = e.snapshot(); snapshot.roles[0].parents.push('owner'); snapshot.roles[0].permissions.push('*'); snapshot.users[0].role = 'customer';
  assert.equal(e.checkPermission('customer', 'policy:manage'), false);
  assert.equal(e.checkPermission('owner', 'policy:manage'), true);
});
test('bootstrap identity and policy cannot be replaced', () => {
  const e = new Engine();
  assert.throws(() => e.assignRole(admin, 'customer', admin));
  assert.throws(() => e.updateRole('owner', { parents: [], permissions: [] }, admin));
});
test('invalid identities and role names preserve state', () => {
  const e = new Engine(), before = e.snapshot();
  for (const user of ['', '<img>', '__proto__', 'a'.repeat(41), null]) assert.throws(() => e.assignRole(user, 'customer', admin));
  assert.throws(() => e.assignRole('new-user', 'missing', admin));
  assert.deepEqual(e.snapshot(), before);
});
test('user capacity is bounded and existing users can still change roles', () => {
  const e = new Engine();
  for (let i = 0; i < 29; i++) e.assignRole('user-' + i, 'customer', admin);
  assert.throws(() => e.assignRole('overflow', 'customer', admin), /32/);
  e.assignRole('user-0', 'manager', admin);
  assert.equal(e.snapshot().users.length, 32);
});
test('unknown mask bits, signed/overflow masks and coercions are rejected', () => {
  const e = new Engine();
  for (const mask of [-1, 128, 2 ** 32, .5, NaN, Infinity, '1', true, null]) assert.throws(() => e.evaluatePolicyBitmask(mask));
});
