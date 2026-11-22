import test from 'node:test';
import assert from 'node:assert/strict';
import { AiVoiceStudioRbacMatrix, DEFAULT_PERMISSIONS, DEFAULT_ROLES } from './rbac-matrix.js';

test('AiVoiceStudioRbacMatrix - default roles and permissions initialization', () => {
  const rbac = new AiVoiceStudioRbacMatrix();
  
  assert.equal(rbac.hasRole('Admin'), true);
  assert.equal(rbac.hasRole('Producer'), true);
  assert.equal(rbac.hasRole('Voice Talent'), true);
  assert.equal(rbac.hasRole('Guest'), true);

  const roles = rbac.getRoles();
  assert.equal(roles.length, 4);
});

test('AiVoiceStudioRbacMatrix - defineRole creates custom role with permissions and metadata', () => {
  const rbac = new AiVoiceStudioRbacMatrix({ seedDefaults: false });
  
  rbac.defineRole('Audio Engineer', ['audio:record', 'audio:edit'], {
    description: 'Specialist for audio recording and track mastering'
  });

  assert.equal(rbac.hasRole('Audio Engineer'), true);
  const role = rbac.getRole('Audio Engineer');
  assert.equal(role.name, 'Audio Engineer');
  assert.equal(role.description, 'Specialist for audio recording and track mastering');
  assert.equal(role.permissions.has('audio:record'), true);
  assert.equal(role.permissions.has('audio:edit'), true);
});

test('AiVoiceStudioRbacMatrix - assignRole and getUserRoles correctly track user assignments', () => {
  const rbac = new AiVoiceStudioRbacMatrix();
  
  rbac.assignRole('alex_producer', 'Producer');
  let roles = rbac.getUserRoles('alex_producer');
  assert.deepEqual(roles, ['Producer']);

  // Assign multiple roles
  rbac.assignRole('alex_producer', 'Voice Talent');
  roles = rbac.getUserRoles('alex_producer');
  assert.equal(roles.length, 2);
  assert.equal(roles.includes('Producer'), true);
  assert.equal(roles.includes('Voice Talent'), true);

  // Works with user object
  rbac.assignRole({ id: 'sam_guest', name: 'Sam' }, 'Guest');
  assert.deepEqual(rbac.getUserRoles('sam_guest'), ['Guest']);
});

test('AiVoiceStudioRbacMatrix - revokeRole successfully removes assigned role', () => {
  const rbac = new AiVoiceStudioRbacMatrix();
  rbac.assignRole('charlie', 'Producer');
  assert.equal(rbac.getUserRoles('charlie').includes('Producer'), true);

  const revoked = rbac.revokeRole('charlie', 'Producer');
  assert.equal(revoked, true);
  assert.equal(rbac.getUserRoles('charlie').includes('Producer'), false);
});

test('AiVoiceStudioRbacMatrix - permission inheritance resolves parent and ancestor permissions', () => {
  const rbac = new AiVoiceStudioRbacMatrix({ seedDefaults: false });

  // Guest has preview
  rbac.defineRole('Guest', ['voice:preview']);
  // Voice Talent inherits Guest and adds audio:record
  rbac.defineRole('Voice Talent', ['audio:record'], { inherits: ['Guest'] });
  // Producer inherits Voice Talent and adds audio:export
  rbac.defineRole('Producer', ['audio:export'], { inherits: ['Voice Talent'] });

  const guestPerms = rbac.getRolePermissions('Guest');
  assert.equal(guestPerms.has('voice:preview'), true);
  assert.equal(guestPerms.has('audio:record'), false);

  const talentPerms = rbac.getRolePermissions('Voice Talent');
  assert.equal(talentPerms.has('audio:record'), true);
  assert.equal(talentPerms.has('voice:preview'), true); // inherited from Guest

  const producerPerms = rbac.getRolePermissions('Producer');
  assert.equal(producerPerms.has('audio:export'), true);
  assert.equal(producerPerms.has('audio:record'), true); // inherited from Voice Talent
  assert.equal(producerPerms.has('voice:preview'), true); // inherited from Guest through Voice Talent
});

test('AiVoiceStudioRbacMatrix - cycle detection in permission inheritance prevents infinite loops', () => {
  const rbac = new AiVoiceStudioRbacMatrix({ seedDefaults: false });

  rbac.defineRole('RoleA', ['action:a'], { inherits: ['RoleB'] });
  rbac.defineRole('RoleB', ['action:b'], { inherits: ['RoleC'] });
  rbac.defineRole('RoleC', ['action:c'], { inherits: ['RoleA'] }); // Circular dependency

  const permsA = rbac.getRolePermissions('RoleA');
  assert.equal(permsA.has('action:a'), true);
  assert.equal(permsA.has('action:b'), true);
  assert.equal(permsA.has('action:c'), true);
});

test('AiVoiceStudioRbacMatrix - can() authorizes valid permissions and rejects unauthorized access', () => {
  const rbac = new AiVoiceStudioRbacMatrix();
  
  rbac.assignRole('dave_guest', 'Guest');
  rbac.assignRole('sarah_producer', 'Producer');

  // Guest can preview voice, but cannot clone or export
  assert.equal(rbac.can('dave_guest', 'voice:preview'), true);
  assert.equal(rbac.can('dave_guest', 'voice:clone'), false);
  assert.equal(rbac.can('dave_guest', 'audio:export'), false);
  assert.equal(rbac.can('dave_guest', 'project:delete'), false);

  // Producer can synthesize, clone, record, edit, and export
  assert.equal(rbac.can('sarah_producer', 'voice:synthesize'), true);
  assert.equal(rbac.can('sarah_producer', 'voice:clone'), true);
  assert.equal(rbac.can('sarah_producer', 'audio:export'), true);

  // Unassigned user gets rejected
  assert.equal(rbac.can('unknown_user', 'voice:preview'), false);
  assert.equal(rbac.can('', 'voice:preview'), false);
});

test('AiVoiceStudioRbacMatrix - wildcard permission grants all actions', () => {
  const rbac = new AiVoiceStudioRbacMatrix();
  rbac.assignRole('super_admin', 'Admin');

  assert.equal(rbac.can('super_admin', 'voice:synthesize'), true);
  assert.equal(rbac.can('super_admin', 'project:delete'), true);
  assert.equal(rbac.can('super_admin', 'system:reboot'), true);
  assert.equal(rbac.can('super_admin', 'arbitrary:new:permission'), true);
});

test('AiVoiceStudioRbacMatrix - domain prefix wildcard (domain:*) matching', () => {
  const rbac = new AiVoiceStudioRbacMatrix({ seedDefaults: false });
  rbac.defineRole('Voice Specialist', ['voice:*']);
  rbac.assignRole('voice_actor', 'Voice Specialist');

  assert.equal(rbac.can('voice_actor', 'voice:synthesize'), true);
  assert.equal(rbac.can('voice_actor', 'voice:clone'), true);
  assert.equal(rbac.can('voice_actor', 'voice:pitch_shift'), true);
  assert.equal(rbac.can('voice_actor', 'audio:export'), false);
});

test('AiVoiceStudioRbacMatrix - evaluatePolicy enforces RBAC permission check', () => {
  const rbac = new AiVoiceStudioRbacMatrix();
  rbac.assignRole('guest_user', 'Guest');
  rbac.assignRole('producer_user', 'Producer');

  // Denied when lacking permission
  const guestEval = rbac.evaluatePolicy({
    user: 'guest_user',
    action: 'audio:export'
  });
  assert.equal(guestEval.allowed, false);
  assert.equal(guestEval.decision, 'DENIED');
  assert.match(guestEval.reason, /lacks permission/i);

  // Allowed when role has permission
  const producerEval = rbac.evaluatePolicy({
    user: 'producer_user',
    action: 'audio:export'
  });
  assert.equal(producerEval.allowed, true);
  assert.equal(producerEval.decision, 'GRANTED');
});

test('AiVoiceStudioRbacMatrix - evaluatePolicy enforces resource ownership guard', () => {
  const rbac = new AiVoiceStudioRbacMatrix();
  rbac.assignRole('bob_talent', 'Voice Talent');
  rbac.assignRole('alice_admin', 'Admin');

  // Bob owns resource 1
  const bobResource = { owner: 'bob_talent', title: 'Bob Voice Script' };

  // Bob can edit his own resource
  const bobSelfEval = rbac.evaluatePolicy({
    user: 'bob_talent',
    action: 'audio:edit',
    resource: bobResource
  });
  assert.equal(bobSelfEval.allowed, true);

  // Bob tries to edit someone else's resource -> denied
  const bobOtherEval = rbac.evaluatePolicy({
    user: 'bob_talent',
    action: 'audio:edit',
    resource: { owner: 'carol_producer' }
  });
  assert.equal(bobOtherEval.allowed, false);
  assert.match(bobOtherEval.reason, /Resource owned by 'carol_producer'/);

  // Admin can edit anyone's resource
  const adminEval = rbac.evaluatePolicy({
    user: 'alice_admin',
    action: 'audio:edit',
    resource: { owner: 'carol_producer' }
  });
  assert.equal(adminEval.allowed, true);
});

test('AiVoiceStudioRbacMatrix - evaluatePolicy enforces production environment guard', () => {
  const rbac = new AiVoiceStudioRbacMatrix();
  rbac.assignRole('john_producer', 'Producer');
  rbac.assignRole('kate_admin', 'Admin');

  // Producer has project:create, but deleting project in production is guarded
  rbac.updatePermission('Producer', 'project:delete', true);

  const prodEval = rbac.evaluatePolicy({
    user: 'john_producer',
    action: 'project:delete',
    environment: 'production'
  });
  assert.equal(prodEval.allowed, false);
  assert.match(prodEval.reason, /production requires explicit Admin/);

  // Admin in production is allowed
  const adminProdEval = rbac.evaluatePolicy({
    user: 'kate_admin',
    action: 'project:delete',
    environment: 'production'
  });
  assert.equal(adminProdEval.allowed, true);
});

test('AiVoiceStudioRbacMatrix - evaluatePolicy enforces confidentiality clearance guard', () => {
  const rbac = new AiVoiceStudioRbacMatrix();
  rbac.assignRole('tony_talent', 'Voice Talent');

  const confidentialEval = rbac.evaluatePolicy({
    user: 'tony_talent',
    action: 'voice:preview',
    resource: { confidential: true },
    userCleared: false
  });
  assert.equal(confidentialEval.allowed, false);
  assert.match(confidentialEval.reason, /confidential studio resource denied/i);

  // With clearance
  const clearedEval = rbac.evaluatePolicy({
    user: 'tony_talent',
    action: 'voice:preview',
    resource: { confidential: true },
    userCleared: true
  });
  assert.equal(clearedEval.allowed, true);
});

test('AiVoiceStudioRbacMatrix - custom policy addition and removal via addPolicy', () => {
  const rbac = new AiVoiceStudioRbacMatrix();
  rbac.assignRole('mike_talent', 'Voice Talent');

  // Custom quota policy
  rbac.addPolicy('dailyQuotaGuard', (ctx) => {
    if (ctx.quotaExceeded) {
      return { allowed: false, reason: 'Daily synthesis quota exceeded' };
    }
    return true;
  });

  const quotaPass = rbac.evaluatePolicy({
    user: 'mike_talent',
    action: 'voice:synthesize',
    quotaExceeded: false
  });
  assert.equal(quotaPass.allowed, true);

  const quotaFail = rbac.evaluatePolicy({
    user: 'mike_talent',
    action: 'voice:synthesize',
    quotaExceeded: true
  });
  assert.equal(quotaFail.allowed, false);
  assert.equal(quotaFail.reason, 'Daily synthesis quota exceeded');

  // Remove policy
  rbac.removePolicy('dailyQuotaGuard');
  const removedEval = rbac.evaluatePolicy({
    user: 'mike_talent',
    action: 'voice:synthesize',
    quotaExceeded: true
  });
  assert.equal(removedEval.allowed, true);
});

test('AiVoiceStudioRbacMatrix - updatePermission dynamically toggles role capabilities', () => {
  const rbac = new AiVoiceStudioRbacMatrix();
  rbac.assignRole('maya_guest', 'Guest');

  assert.equal(rbac.can('maya_guest', 'audio:record'), false);

  // Dynamically grant audio:record to Guest
  rbac.updatePermission('Guest', 'audio:record', true);
  assert.equal(rbac.can('maya_guest', 'audio:record'), true);

  // Dynamically revoke
  rbac.updatePermission('Guest', 'audio:record', false);
  assert.equal(rbac.can('maya_guest', 'audio:record'), false);
});

test('AiVoiceStudioRbacMatrix - getMatrix produces comprehensive role/permission grid', () => {
  const rbac = new AiVoiceStudioRbacMatrix();
  const matrix = rbac.getMatrix();

  assert.ok(matrix.roles.includes('Admin'));
  assert.ok(matrix.roles.includes('Producer'));
  assert.ok(matrix.permissions.length > 0);

  // Admin has wildcard direct
  assert.equal(matrix.matrix['Admin']['voice:synthesize'].granted, true);
  assert.equal(matrix.matrix['Admin']['voice:synthesize'].direct, true);

  // Producer has voice:preview via inheritance from Voice Talent -> Guest
  assert.equal(matrix.matrix['Producer']['voice:preview'].granted, true);
  assert.equal(matrix.matrix['Producer']['voice:preview'].inherited, true);
});

test('AiVoiceStudioRbacMatrix - audit logging captures events and allows filtered queries', () => {
  const rbac = new AiVoiceStudioRbacMatrix({ seedDefaults: true });
  rbac.clearAuditLog();

  rbac.assignRole('user_1', 'Producer');
  rbac.can('user_1', 'audio:export');
  rbac.evaluatePolicy({ user: 'user_1', action: 'project:delete' });

  const allLogs = rbac.getAuditLog();
  assert.ok(allLogs.length >= 3);

  const assignmentLogs = rbac.getAuditLog({ type: 'ROLE_ASSIGNED' });
  assert.equal(assignmentLogs.length, 1);
  assert.equal(assignmentLogs[0].details.user, 'user_1');

  const policyLogs = rbac.getAuditLog({ type: 'POLICY_EVALUATION' });
  assert.equal(policyLogs.length, 1);
  assert.equal(policyLogs[0].action, 'project:delete');
});
