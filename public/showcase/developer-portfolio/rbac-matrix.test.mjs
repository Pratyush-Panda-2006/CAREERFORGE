import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DeveloperPortfolioRbacEngine,
  PERMISSIONS,
  ROLES,
  ALL_PERMISSIONS_MASK,
  ROLE_HIERARCHY
} from './rbac-matrix.js';

test('RBAC Bitmask Architecture - Canonical roles have exact expected bitmasks', () => {
  const engine = new DeveloperPortfolioRbacEngine();

  // Viewer = READ_PROJECTS (1) | SUBMIT_CONTACT (2) = 3
  assert.strictEqual(engine.getPermissionsForRole(ROLES.Viewer), 3);
  assert.strictEqual(engine.getPermissionsForRole('viewer'), 3);

  // Contributor = Viewer (3) | COMMENT_BLOG (4) = 7
  assert.strictEqual(engine.getPermissionsForRole(ROLES.Contributor), 7);
  assert.strictEqual(engine.getPermissionsForRole('contributor'), 7);

  // Editor = Contributor (7) | EDIT_PROJECTS (8) | MANAGE_ARTICLES (16) = 31
  assert.strictEqual(engine.getPermissionsForRole(ROLES.Editor), 31);
  assert.strictEqual(engine.getPermissionsForRole('editor'), 31);

  // Admin = Editor (31) | VIEW_ANALYTICS (32) | MANAGE_SETTINGS (64) = 127
  assert.strictEqual(engine.getPermissionsForRole(ROLES.Admin), 127);
  assert.strictEqual(engine.getPermissionsForRole('admin'), 127);

  // Owner = Admin (127) | ADMIN_ALL (128) = 255
  assert.strictEqual(engine.getPermissionsForRole(ROLES.Owner), 255);
  assert.strictEqual(engine.getPermissionsForRole('owner'), 255);

  // Unknown role returns 0
  assert.strictEqual(engine.getPermissionsForRole('NonExistentRole'), 0);
  assert.strictEqual(engine.getPermissionsForRole(''), 0);
  assert.strictEqual(engine.getPermissionsForRole(null), 0);
});

test('RBAC Inheritance Resolution - Roles inherit permissions from lower tiers', () => {
  const engine = new DeveloperPortfolioRbacEngine();

  // Contributor inherits Viewer's read and contact permissions
  assert.strictEqual(engine.checkPermission(ROLES.Contributor, 'READ_PROJECTS'), true);
  assert.strictEqual(engine.checkPermission(ROLES.Contributor, 'SUBMIT_CONTACT'), true);
  assert.strictEqual(engine.checkPermission(ROLES.Contributor, 'COMMENT_BLOG'), true);
  assert.strictEqual(engine.checkPermission(ROLES.Contributor, 'EDIT_PROJECTS'), false);

  // Editor inherits Contributor & Viewer permissions
  assert.strictEqual(engine.checkPermission(ROLES.Editor, 'READ_PROJECTS'), true);
  assert.strictEqual(engine.checkPermission(ROLES.Editor, 'SUBMIT_CONTACT'), true);
  assert.strictEqual(engine.checkPermission(ROLES.Editor, 'COMMENT_BLOG'), true);
  assert.strictEqual(engine.checkPermission(ROLES.Editor, 'EDIT_PROJECTS'), true);
  assert.strictEqual(engine.checkPermission(ROLES.Editor, 'MANAGE_ARTICLES'), true);
  assert.strictEqual(engine.checkPermission(ROLES.Editor, 'VIEW_ANALYTICS'), false);

  // Admin inherits Editor permissions plus analytics and settings
  assert.strictEqual(engine.checkPermission(ROLES.Admin, 'READ_PROJECTS'), true);
  assert.strictEqual(engine.checkPermission(ROLES.Admin, 'EDIT_PROJECTS'), true);
  assert.strictEqual(engine.checkPermission(ROLES.Admin, 'VIEW_ANALYTICS'), true);
  assert.strictEqual(engine.checkPermission(ROLES.Admin, 'MANAGE_SETTINGS', { ip: '127.0.0.1' }), true);

  // Owner possesses all permissions
  for (const permKey of Object.keys(PERMISSIONS)) {
    assert.strictEqual(engine.checkPermission(ROLES.Owner, permKey, { ip: '127.0.0.1' }), true);
  }
});

test('RBAC Wildcard Action Matching - Evaluates namespace wildcards and full wildcard', () => {
  const engine = new DeveloperPortfolioRbacEngine();

  // Root wildcard '*' grants to Owner
  assert.strictEqual(engine.checkPermission(ROLES.Owner, '*', { ip: '127.0.0.1' }), true);
  assert.strictEqual(engine.checkPermission(ROLES.Editor, '*'), false);
  assert.strictEqual(engine.checkPermission(ROLES.Viewer, '*'), false);

  // Namespace wildcard 'projects:*' requires READ_PROJECTS & EDIT_PROJECTS
  assert.strictEqual(engine.checkPermission(ROLES.Editor, 'projects:*'), true);
  assert.strictEqual(engine.checkPermission(ROLES.Viewer, 'projects:*'), false);
  assert.strictEqual(engine.checkPermission(ROLES.Contributor, 'projects:*'), false);

  // Namespace wildcard 'articles:*'
  assert.strictEqual(engine.checkPermission(ROLES.Editor, 'articles:*'), true);
  assert.strictEqual(engine.checkPermission(ROLES.Contributor, 'articles:*'), false);

  // Namespace wildcard 'admin:*'
  assert.strictEqual(engine.checkPermission(ROLES.Owner, 'admin:*', { ip: '127.0.0.1' }), true);
  assert.strictEqual(engine.checkPermission(ROLES.Editor, 'admin:*'), false);
});

test('RBAC Privilege Rejection - Unauthorized roles are strictly denied', () => {
  const engine = new DeveloperPortfolioRbacEngine();

  // Viewer cannot edit projects or view analytics
  assert.strictEqual(engine.checkPermission(ROLES.Viewer, 'EDIT_PROJECTS'), false);
  assert.strictEqual(engine.checkPermission(ROLES.Viewer, 'MANAGE_ARTICLES'), false);
  assert.strictEqual(engine.checkPermission(ROLES.Viewer, 'VIEW_ANALYTICS'), false);
  assert.strictEqual(engine.checkPermission(ROLES.Viewer, 'MANAGE_SETTINGS'), false);
  assert.strictEqual(engine.checkPermission(ROLES.Viewer, 'ADMIN_ALL'), false);

  // Contributor cannot edit projects or manage articles
  assert.strictEqual(engine.checkPermission(ROLES.Contributor, 'EDIT_PROJECTS'), false);
  assert.strictEqual(engine.checkPermission(ROLES.Contributor, 'MANAGE_ARTICLES'), false);

  // Editor cannot manage settings or admin all
  assert.strictEqual(engine.checkPermission(ROLES.Editor, 'MANAGE_SETTINGS'), false);
  assert.strictEqual(engine.checkPermission(ROLES.Editor, 'ADMIN_ALL'), false);
});

test('ABAC Dynamic Rule - IP allowlist check for admin paths', () => {
  const engine = new DeveloperPortfolioRbacEngine();

  // Admin from allowlisted IP (127.0.0.1) is permitted
  assert.strictEqual(
    engine.checkPermission(ROLES.Admin, 'MANAGE_SETTINGS', { ip: '127.0.0.1' }),
    true
  );

  // Admin from unlisted IP (203.0.113.88) is denied
  assert.strictEqual(
    engine.checkPermission(ROLES.Admin, 'MANAGE_SETTINGS', { ip: '203.0.113.88' }),
    false
  );

  // Admin path context flag triggers IP verification
  assert.strictEqual(
    engine.checkPermission(ROLES.Admin, 'VIEW_ANALYTICS', { isAdminPath: true, ip: '203.0.113.88' }),
    false
  );
  assert.strictEqual(
    engine.checkPermission(ROLES.Admin, 'VIEW_ANALYTICS', { isAdminPath: true, ip: '127.0.0.1' }),
    true
  );

  // Dynamic addition of IP to allowlist grants access
  engine.addAllowedIp('203.0.113.88');
  assert.strictEqual(
    engine.checkPermission(ROLES.Admin, 'MANAGE_SETTINGS', { ip: '203.0.113.88' }),
    true
  );

  // Removal of IP restores protection
  engine.removeAllowedIp('203.0.113.88');
  assert.strictEqual(
    engine.checkPermission(ROLES.Admin, 'MANAGE_SETTINGS', { ip: '203.0.113.88' }),
    false
  );
});

test('ABAC Dynamic Rule - Rate-limit state rejects requests', () => {
  const engine = new DeveloperPortfolioRbacEngine();

  // User without rate limiting can submit contact
  assert.strictEqual(
    engine.checkPermission('user-viewer', 'SUBMIT_CONTACT', { rateLimited: false }),
    true
  );

  // User with rateLimited: true in context is rejected
  assert.strictEqual(
    engine.checkPermission('user-viewer', 'SUBMIT_CONTACT', { rateLimited: true }),
    false
  );

  // User object with rateLimited: true is rejected
  const rateLimitedEditor = {
    id: 'spammer-dev',
    role: ROLES.Editor,
    rateLimited: true,
    emailVerified: true
  };
  assert.strictEqual(
    engine.checkPermission(rateLimitedEditor, 'EDIT_PROJECTS'),
    false
  );
});

test('ABAC Dynamic Rule - Verified email requirements for interactive actions', () => {
  const engine = new DeveloperPortfolioRbacEngine();

  // Reading public projects does NOT require verified email
  assert.strictEqual(
    engine.checkPermission(ROLES.Viewer, 'READ_PROJECTS', { emailVerified: false }),
    true
  );

  // Submitting contact requires verified email
  assert.strictEqual(
    engine.checkPermission(ROLES.Viewer, 'SUBMIT_CONTACT', { emailVerified: false }),
    false
  );
  assert.strictEqual(
    engine.checkPermission(ROLES.Viewer, 'SUBMIT_CONTACT', { emailVerified: true }),
    true
  );

  // Commenting on blog requires verified email
  assert.strictEqual(
    engine.checkPermission(ROLES.Contributor, 'COMMENT_BLOG', { emailVerified: false }),
    false
  );
  assert.strictEqual(
    engine.checkPermission(ROLES.Contributor, 'COMMENT_BLOG', { emailVerified: true }),
    true
  );

  // Editing projects requires verified email
  assert.strictEqual(
    engine.checkPermission(ROLES.Editor, 'EDIT_PROJECTS', { emailVerified: false }),
    false
  );
  assert.strictEqual(
    engine.checkPermission(ROLES.Editor, 'EDIT_PROJECTS', { emailVerified: true }),
    true
  );
});

test('ABAC Dynamic Rule - Project visibility state (public vs private/draft)', () => {
  const engine = new DeveloperPortfolioRbacEngine();

  const publicResource = { id: 'p1', visibility: 'public', authorId: 'creator-alpha' };
  const draftResource = { id: 'p2', visibility: 'draft', authorId: 'creator-alpha' };

  // Viewer can read public project
  assert.strictEqual(
    engine.checkPermission(ROLES.Viewer, 'READ_PROJECTS', { resource: publicResource }),
    true
  );

  // Viewer cannot read draft project if not the author
  assert.strictEqual(
    engine.checkPermission(ROLES.Viewer, 'READ_PROJECTS', {
      resource: draftResource,
      user: { id: 'random-visitor' }
    }),
    false
  );

  // Creator can read their own draft project even with Viewer role
  assert.strictEqual(
    engine.checkPermission(ROLES.Viewer, 'READ_PROJECTS', {
      resource: draftResource,
      user: { id: 'creator-alpha' }
    }),
    true
  );

  // Editor can read draft project regardless of authorship
  assert.strictEqual(
    engine.checkPermission(ROLES.Editor, 'READ_PROJECTS', {
      resource: draftResource,
      user: { id: 'editor-beta' }
    }),
    true
  );
});

test('ABAC Dynamic Rule - Maintainer ownership matching (creator can edit own items)', () => {
  const engine = new DeveloperPortfolioRbacEngine();

  const resource = { id: 'proj-demo', authorId: 'user-contributor' };

  // Contributor normally lacks EDIT_PROJECTS permission
  assert.strictEqual(
    engine.checkPermission('user-contributor', 'EDIT_PROJECTS', {
      resource: { id: 'proj-other', authorId: 'different-author' }
    }),
    false
  );

  // Contributor CAN edit their own project item via maintainer ownership match
  assert.strictEqual(
    engine.checkPermission('user-contributor', 'EDIT_PROJECTS', { resource }),
    true
  );

  // Viewer CAN edit their own project item via maintainer ownership match
  const viewerResource = { id: 'proj-viewer', authorId: 'user-viewer' };
  assert.strictEqual(
    engine.checkPermission('user-viewer', 'EDIT_PROJECTS', { resource: viewerResource }),
    true
  );

  // Viewer CANNOT edit someone else's project
  assert.strictEqual(
    engine.checkPermission('user-viewer', 'EDIT_PROJECTS', { resource }),
    false
  );
});

test('Bitwise Policy Evaluation - evaluatePolicyBitmask verifies exact bit requirements', () => {
  const engine = new DeveloperPortfolioRbacEngine();

  // Viewer has mask 3: can satisfy mask 1 (READ), mask 2 (CONTACT), mask 3 (BOTH)
  assert.strictEqual(engine.evaluatePolicyBitmask(1, ROLES.Viewer), true);
  assert.strictEqual(engine.evaluatePolicyBitmask(2, ROLES.Viewer), true);
  assert.strictEqual(engine.evaluatePolicyBitmask(3, ROLES.Viewer), true);
  assert.strictEqual(engine.evaluatePolicyBitmask(4, ROLES.Viewer), false);
  assert.strictEqual(engine.evaluatePolicyBitmask(7, ROLES.Viewer), false);

  // Editor has mask 31: can satisfy mask 7, 8, 16, 31
  assert.strictEqual(engine.evaluatePolicyBitmask(7, ROLES.Editor), true);
  assert.strictEqual(engine.evaluatePolicyBitmask(31, ROLES.Editor), true);
  assert.strictEqual(engine.evaluatePolicyBitmask(32, ROLES.Editor), false);

  // Owner satisfies all masks 0-255
  for (let mask = 0; mask <= 255; mask++) {
    assert.strictEqual(engine.evaluatePolicyBitmask(mask, ROLES.Owner), true);
  }

  // Zero mask requests no permissions, returns true for valid role
  assert.strictEqual(engine.evaluatePolicyBitmask(0, ROLES.Viewer), true);
  assert.strictEqual(engine.evaluatePolicyBitmask(0, 'NonExistentRole'), false);

  // Out of range or non-integer throws TypeError
  assert.throws(() => engine.evaluatePolicyBitmask(-1), TypeError);
  assert.throws(() => engine.evaluatePolicyBitmask(256), TypeError);
  assert.throws(() => engine.evaluatePolicyBitmask(1.5), TypeError);
  assert.throws(() => engine.evaluatePolicyBitmask('1'), TypeError);
  assert.throws(() => engine.evaluatePolicyBitmask(null), TypeError);
});

test('Role Assignment - assignRole updates user role and state', () => {
  const engine = new DeveloperPortfolioRbacEngine();

  // Assign user-viewer as Editor
  const updated = engine.assignRole('user-viewer', ROLES.Editor);
  assert.strictEqual(updated.role, ROLES.Editor);
  assert.strictEqual(engine.getUser('user-viewer').role, ROLES.Editor);

  // Now user-viewer can edit projects
  assert.strictEqual(engine.checkPermission('user-viewer', 'EDIT_PROJECTS'), true);

  // Object user assignment
  const customUser = { id: 'new-dev', emailVerified: true };
  engine.assignRole(customUser, ROLES.Contributor);
  assert.strictEqual(engine.getUser('new-dev').role, ROLES.Contributor);
  assert.strictEqual(engine.checkPermission('new-dev', 'COMMENT_BLOG'), true);
  assert.strictEqual(engine.checkPermission('new-dev', 'EDIT_PROJECTS'), false);

  // Invalid role throws TypeError
  assert.throws(() => engine.assignRole('test-user', 'InvalidRole'), TypeError);
  assert.throws(() => engine.assignRole('', ROLES.Viewer), TypeError);
  assert.throws(() => engine.assignRole(null, ROLES.Viewer), TypeError);
});

test('hasPermission method delegates accurately', () => {
  const engine = new DeveloperPortfolioRbacEngine();

  assert.strictEqual(engine.hasPermission('user-viewer', PERMISSIONS.READ_PROJECTS), true);
  assert.strictEqual(engine.hasPermission('user-viewer', PERMISSIONS.EDIT_PROJECTS), false);
  assert.strictEqual(engine.hasPermission('user-editor', PERMISSIONS.EDIT_PROJECTS), true);
  assert.strictEqual(engine.hasPermission('user-admin', 'VIEW_ANALYTICS'), true);
});

test('Audit Logging - tracks all events and supports clearing', () => {
  const engine = new DeveloperPortfolioRbacEngine();
  engine.clearAuditLog();
  assert.strictEqual(engine.getAuditLog().length, 0);

  // Check an allowed permission
  engine.checkPermission('user-viewer', 'READ_PROJECTS');
  let logs = engine.getAuditLog();
  assert.strictEqual(logs.length, 1);
  assert.strictEqual(logs[0].granted, true);
  assert.strictEqual(logs[0].action, 'READ_PROJECTS');
  assert.strictEqual(logs[0].userId, 'user-viewer');

  // Check a denied permission
  engine.checkPermission('user-viewer', 'EDIT_PROJECTS');
  logs = engine.getAuditLog();
  assert.strictEqual(logs.length, 2);
  assert.strictEqual(logs[0].granted, false);
  assert.strictEqual(logs[0].action, 'EDIT_PROJECTS');

  // Clearing audit log resets array
  engine.clearAuditLog();
  assert.strictEqual(engine.getAuditLog().length, 0);
});

test('Fail-Closed Security Guarantees - Malformed actions or subjects fail safely', () => {
  const engine = new DeveloperPortfolioRbacEngine();

  // Invalid or null action
  assert.strictEqual(engine.checkPermission(ROLES.Owner, null), false);
  assert.strictEqual(engine.checkPermission(ROLES.Owner, ''), false);
  assert.strictEqual(engine.checkPermission(ROLES.Owner, 'unknown:malformed:action'), false);

  // Invalid role/user
  assert.strictEqual(engine.checkPermission(null, 'READ_PROJECTS'), false);
  assert.strictEqual(engine.checkPermission(undefined, 'READ_PROJECTS'), false);
  assert.strictEqual(engine.checkPermission(12345, 'READ_PROJECTS'), false);

  // Snapshot integrity
  const snap = engine.snapshot();
  assert.strictEqual(snap.roles.length, 5);
  assert.strictEqual(snap.users.length >= 5, true);
  assert.strictEqual(Array.isArray(snap.ipAllowlist), true);
});
