import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CharityMicroloansRbacGuard } from './rbac-guard.js';

describe('CharityMicroloansRbacGuard', () => {
  it('correctly validates role permissions based on matrix', () => {
    const rbac = new CharityMicroloansRbacGuard();
    assert.equal(rbac.hasPermission('admin', 'delete'), true);
    assert.equal(rbac.hasPermission('viewer', 'delete'), false);
    assert.equal(rbac.hasPermission('analyst', 'audit'), true);
  });

  it('evaluates user access policies accurately', () => {
    const rbac = new CharityMicroloansRbacGuard();
    assert.equal(rbac.evaluatePolicy({ role: 'manager' }, 'approve'), true);
    assert.equal(rbac.evaluatePolicy({ role: 'viewer' }, 'write'), false);
    assert.equal(rbac.evaluatePolicy(null, 'read'), false);
  });

  it('allows dynamic granting of new permissions to roles', () => {
    const rbac = new CharityMicroloansRbacGuard();
    rbac.grantPermission('viewer', 'export');
    assert.equal(rbac.hasPermission('viewer', 'export'), true);
  });
});
