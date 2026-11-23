import test from 'node:test';
import assert from 'node:assert/strict';
import { MusicDawStudioRbacEngine as Engine, ACTIONS } from './rbac-matrix.js';
const admin = 'admin-demo';

test('default transitive inheritance grants known actions only', () => {
  const e = new Engine();
  assert.equal(e.checkPermission('producer', 'tracks:read'), true);
  assert.equal(e.checkPermission('producer', 'plugins:write'), true);
  assert.equal(e.checkPermission('producer', 'master:export'), true);
  assert.equal(e.checkPermission('producer', 'policy:manage'), false);
  assert.equal(e.checkPermission('listener', 'tracks:write'), false);
});
test('wildcards expand against the exact allow-list and namespace boundary', () => {
  const e = new Engine();
  e.updateRole('listener', { parents: [], permissions: ['tracks:*'] }, admin);
  assert.equal(e.checkPermission('listener', 'tracks:read'), true);
  assert.equal(e.checkPermission('listener', 'tracks:write'), true);
  assert.equal(e.checkPermission('listener', 'plugins:read'), false);
  assert.equal(e.checkPermission('admin', 'tracks:delete'), false);
  for (const a of ACTIONS) assert.equal(e.checkPermission('admin', a), true);
});
test('all 128 masks reconcile with an independent action-set reference', () => {
  const e = new Engine();
  const allowed = ['tracks:read', 'tracks:write', 'plugins:read'];
  for (let mask = 0; mask < 128; mask++) {
    const expected = ACTIONS.every((a, bit) => !(Math.floor(mask / 2 ** bit) % 2) || allowed.includes(a));
    assert.equal(e.evaluatePolicyBitmask(mask, 'composer'), expected);
  }
  assert.equal(e.evaluatePolicyBitmask(1), true);
  assert.equal(e.evaluatePolicyBitmask(17), false);
  assert.equal(e.evaluatePolicyBitmask(0, 'missing'), false);
});
test('unknown or malformed permission checks fail closed', () => {
  const e = new Engine();
  for (const r of ['missing', '__proto__', null, {}, 1]) assert.equal(e.checkPermission(r, 'tracks:read'), false);
  for (const a of ['*', 'tracks:*', 'tracks:read:extra', '', null, {}]) assert.equal(e.checkPermission('admin', a), false);
});
test('assignment requires an explicitly authorized current actor', () => {
  const e = new Engine(), before = e.snapshot();
  for (const actor of ['listener-demo', 'composer-demo', 'missing', undefined]) assert.throws(() => e.assignRole('listener-demo', 'admin', actor));
  assert.deepEqual(e.snapshot(), before);
  e.assignRole('listener-demo', 'producer', admin);
  assert.equal(e.snapshot().users.find(x => x.user === 'listener-demo').role, 'producer');
});
test('proposed grants cannot authorize their own policy mutation', () => {
  const e = new Engine(), before = e.snapshot();
  assert.throws(() => e.updateRole('listener', { parents: ['admin'], permissions: ['*'] }, 'listener-demo'), /Denied/);
  assert.deepEqual(e.snapshot(), before);
});
test('legitimate delegation can be granted and revoked by the admin', () => {
  const e = new Engine();
  e.updateRole('composer', { parents: ['listener'], permissions: ['roles:assign'] }, admin);
  e.assignRole('listener-demo', 'producer', 'composer-demo');
  e.updateRole('composer', { parents: ['listener'], permissions: [] }, admin);
  assert.throws(() => e.assignRole('listener-demo', 'admin', 'composer-demo'), /Denied/);
});
test('removing direct permissions preserves inherited grants', () => {
  const e = new Engine();
  e.updateRole('composer', { parents: ['listener'], permissions: [] }, admin);
  assert.equal(e.checkPermission('composer', 'tracks:read'), true);
  assert.equal(e.checkPermission('composer', 'plugins:read'), false);
  e.updateRole('composer', { parents: [], permissions: [] }, admin);
  assert.equal(e.checkPermission('composer', 'tracks:read'), false);
});
test('parent changes immediately update descendants without stale cached grants', () => {
  const e = new Engine();
  e.updateRole('listener', { parents: [], permissions: [] }, admin);
  assert.equal(e.checkPermission('producer', 'tracks:read'), false);
});
test('self cycles, transitive cycles and unknown parents retain old state', () => {
  const e = new Engine(), before = e.snapshot();
  for (const parents of [['listener'], ['producer'], ['missing']]) {
    assert.throws(() => e.updateRole('listener', { parents, permissions: [] }, admin));
    assert.deepEqual(e.snapshot(), before);
  }
});
test('invalid patterns and duplicate or oversized lists are rejected atomically', () => {
  const e = new Engine(), before = e.snapshot();
  for (const permissions of [['tracks*'], ['*:read'], ['unknown:*'], ['tracks:delete'], ['tracks:read', 'tracks:read'], Array(8).fill('*')]) {
    assert.throws(() => e.updateRole('listener', { parents: [], permissions }, admin));
    assert.deepEqual(e.snapshot(), before);
  }
});
test('policy getters, prototypes, sparse arrays and extra fields are rejected', () => {
  const e = new Engine(), before = e.snapshot(); let calls = 0;
  const accessor = { get parents() { calls++; return []; }, permissions: [] };
  const values = [accessor, Object.create(null), JSON.parse('{"parents":[],"permissions":[],"__proto__":{}}'), { parents: [], permissions: new Array(2) }, { parents: [], permissions: [], extra: true }];
  for (const value of values) assert.throws(() => e.updateRole('listener', value, admin));
  assert.equal(calls, 0); assert.deepEqual(e.snapshot(), before);
});
test('input and returned snapshots cannot mutate active permissions', () => {
  const e = new Engine(), value = { parents: [], permissions: ['tracks:read'] };
  e.updateRole('listener', value, admin); value.permissions.push('*');
  const snapshot = e.snapshot(); snapshot.roles[0].parents.push('admin'); snapshot.roles[0].permissions.push('*'); snapshot.users[0].role = 'listener';
  assert.equal(e.checkPermission('listener', 'policy:manage'), false);
  assert.equal(e.checkPermission('admin', 'policy:manage'), true);
});
test('bootstrap identity and policy cannot be replaced', () => {
  const e = new Engine();
  assert.throws(() => e.assignRole(admin, 'listener', admin));
  assert.throws(() => e.updateRole('admin', { parents: [], permissions: [] }, admin));
});
test('invalid identities and role names preserve state', () => {
  const e = new Engine(), before = e.snapshot();
  for (const user of ['', '<img>', '__proto__', 'a'.repeat(41), null]) assert.throws(() => e.assignRole(user, 'listener', admin));
  assert.throws(() => e.assignRole('new-user', 'missing', admin));
  assert.deepEqual(e.snapshot(), before);
});
test('user capacity is bounded and existing users can still change roles', () => {
  const e = new Engine();
  for (let i = 0; i < 29; i++) e.assignRole('user-' + i, 'listener', admin);
  assert.throws(() => e.assignRole('overflow', 'listener', admin), /32/);
  e.assignRole('user-0', 'producer', admin);
  assert.equal(e.snapshot().users.length, 32);
});
test('unknown mask bits, signed/overflow masks and coercions are rejected', () => {
  const e = new Engine();
  for (const mask of [-1, 128, 2 ** 32, .5, NaN, Infinity, '1', true, null]) assert.throws(() => e.evaluatePolicyBitmask(mask));
});
