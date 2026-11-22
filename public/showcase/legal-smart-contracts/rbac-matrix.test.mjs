import test from 'node:test';
import assert from 'node:assert/strict';
import { LegalSmartContractsRbacEngine as Engine, ACTIONS } from './rbac-matrix.js';
const admin = 'admin-demo';

test('default transitive inheritance grants known actions only', () => {
  const e = new Engine();
  assert.equal(e.checkPermission('attorney', 'contracts:read'), true);
  assert.equal(e.checkPermission('attorney', 'clauses:write'), true);
  assert.equal(e.checkPermission('attorney', 'audit:verify'), true);
  assert.equal(e.checkPermission('attorney', 'policy:manage'), false);
  assert.equal(e.checkPermission('client', 'contracts:write'), false);
});
test('wildcards expand against the exact allow-list and namespace boundary', () => {
  const e = new Engine();
  e.updateRole('client', { parents: [], permissions: ['contracts:*'] }, admin);
  assert.equal(e.checkPermission('client', 'contracts:read'), true);
  assert.equal(e.checkPermission('client', 'contracts:write'), true);
  assert.equal(e.checkPermission('client', 'clauses:read'), false);
  assert.equal(e.checkPermission('admin', 'contracts:delete'), false);
  for (const a of ACTIONS) assert.equal(e.checkPermission('admin', a), true);
});
test('all 128 masks reconcile with an independent action-set reference', () => {
  const e = new Engine();
  const allowed = ['contracts:read', 'contracts:write', 'clauses:read'];
  for (let mask = 0; mask < 128; mask++) {
    const expected = ACTIONS.every((a, bit) => !(Math.floor(mask / 2 ** bit) % 2) || allowed.includes(a));
    assert.equal(e.evaluatePolicyBitmask(mask, 'paralegal'), expected);
  }
  assert.equal(e.evaluatePolicyBitmask(1), true);
  assert.equal(e.evaluatePolicyBitmask(17), false);
  assert.equal(e.evaluatePolicyBitmask(0, 'missing'), false);
});
test('unknown or malformed permission checks fail closed', () => {
  const e = new Engine();
  for (const r of ['missing', '__proto__', null, {}, 1]) assert.equal(e.checkPermission(r, 'contracts:read'), false);
  for (const a of ['*', 'contracts:*', 'contracts:read:extra', '', null, {}]) assert.equal(e.checkPermission('admin', a), false);
});
test('assignment requires an explicitly authorized current actor', () => {
  const e = new Engine(), before = e.snapshot();
  for (const actor of ['client-demo', 'paralegal-demo', 'missing', undefined]) assert.throws(() => e.assignRole('client-demo', 'admin', actor));
  assert.deepEqual(e.snapshot(), before);
  e.assignRole('client-demo', 'attorney', admin);
  assert.equal(e.snapshot().users.find(x => x.user === 'client-demo').role, 'attorney');
});
test('proposed grants cannot authorize their own policy mutation', () => {
  const e = new Engine(), before = e.snapshot();
  assert.throws(() => e.updateRole('client', { parents: ['admin'], permissions: ['*'] }, 'client-demo'), /Denied/);
  assert.deepEqual(e.snapshot(), before);
});
test('legitimate delegation can be granted and revoked by the admin', () => {
  const e = new Engine();
  e.updateRole('paralegal', { parents: ['client'], permissions: ['roles:assign'] }, admin);
  e.assignRole('client-demo', 'attorney', 'paralegal-demo');
  e.updateRole('paralegal', { parents: ['client'], permissions: [] }, admin);
  assert.throws(() => e.assignRole('client-demo', 'admin', 'paralegal-demo'), /Denied/);
});
test('removing direct permissions preserves inherited grants', () => {
  const e = new Engine();
  e.updateRole('paralegal', { parents: ['client'], permissions: [] }, admin);
  assert.equal(e.checkPermission('paralegal', 'contracts:read'), true);
  assert.equal(e.checkPermission('paralegal', 'clauses:read'), false);
  e.updateRole('paralegal', { parents: [], permissions: [] }, admin);
  assert.equal(e.checkPermission('paralegal', 'contracts:read'), false);
});
test('parent changes immediately update descendants without stale cached grants', () => {
  const e = new Engine();
  e.updateRole('client', { parents: [], permissions: [] }, admin);
  assert.equal(e.checkPermission('attorney', 'contracts:read'), false);
});
test('self cycles, transitive cycles and unknown parents retain old state', () => {
  const e = new Engine(), before = e.snapshot();
  for (const parents of [['client'], ['attorney'], ['missing']]) {
    assert.throws(() => e.updateRole('client', { parents, permissions: [] }, admin));
    assert.deepEqual(e.snapshot(), before);
  }
});
test('invalid patterns and duplicate or oversized lists are rejected atomically', () => {
  const e = new Engine(), before = e.snapshot();
  for (const permissions of [['contracts*'], ['*:read'], ['unknown:*'], ['contracts:delete'], ['contracts:read', 'contracts:read'], Array(8).fill('*')]) {
    assert.throws(() => e.updateRole('client', { parents: [], permissions }, admin));
    assert.deepEqual(e.snapshot(), before);
  }
});
test('policy getters, prototypes, sparse arrays and extra fields are rejected', () => {
  const e = new Engine(), before = e.snapshot(); let calls = 0;
  const accessor = { get parents() { calls++; return []; }, permissions: [] };
  const values = [accessor, Object.create(null), JSON.parse('{"parents":[],"permissions":[],"__proto__":{}}'), { parents: [], permissions: new Array(2) }, { parents: [], permissions: [], extra: true }];
  for (const value of values) assert.throws(() => e.updateRole('client', value, admin));
  assert.equal(calls, 0); assert.deepEqual(e.snapshot(), before);
});
test('input and returned snapshots cannot mutate active permissions', () => {
  const e = new Engine(), value = { parents: [], permissions: ['contracts:read'] };
  e.updateRole('client', value, admin); value.permissions.push('*');
  const snapshot = e.snapshot(); snapshot.roles[0].parents.push('admin'); snapshot.roles[0].permissions.push('*'); snapshot.users[0].role = 'client';
  assert.equal(e.checkPermission('client', 'policy:manage'), false);
  assert.equal(e.checkPermission('admin', 'policy:manage'), true);
});
test('bootstrap identity and policy cannot be replaced', () => {
  const e = new Engine();
  assert.throws(() => e.assignRole(admin, 'client', admin));
  assert.throws(() => e.updateRole('admin', { parents: [], permissions: [] }, admin));
});
test('invalid identities and role names preserve state', () => {
  const e = new Engine(), before = e.snapshot();
  for (const user of ['', '<img>', '__proto__', 'a'.repeat(41), null]) assert.throws(() => e.assignRole(user, 'client', admin));
  assert.throws(() => e.assignRole('new-user', 'missing', admin));
  assert.deepEqual(e.snapshot(), before);
});
test('user capacity is bounded and existing users can still change roles', () => {
  const e = new Engine();
  for (let i = 0; i < 29; i++) e.assignRole('user-' + i, 'client', admin);
  assert.throws(() => e.assignRole('overflow', 'client', admin), /32/);
  e.assignRole('user-0', 'attorney', admin);
  assert.equal(e.snapshot().users.length, 32);
});
test('unknown mask bits, signed/overflow masks and coercions are rejected', () => {
  const e = new Engine();
  for (const mask of [-1, 128, 2 ** 32, .5, NaN, Infinity, '1', true, null]) assert.throws(() => e.evaluatePolicyBitmask(mask));
});
