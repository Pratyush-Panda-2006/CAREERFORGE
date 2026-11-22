import test from 'node:test';
import assert from 'node:assert/strict';
import { EdTechAcademyRbacMatrix } from './rbac-matrix.js';

test('EdTechAcademyRbacMatrix - initializes canonical academic roles', () => {
  const matrix = new EdTechAcademyRbacMatrix();
  const roles = matrix.getRoles();

  assert.ok(roles.includes('Student'), 'Student role should be present');
  assert.ok(roles.includes('Teaching Assistant'), 'Teaching Assistant role should be present');
  assert.ok(roles.includes('Instructor'), 'Instructor role should be present');
  assert.ok(roles.includes('Campus Admin'), 'Campus Admin role should be present');
  assert.equal(roles.length, 4, 'Should initialize exactly 4 canonical roles by default');
});

test('EdTechAcademyRbacMatrix - verifies permission inheritance hierarchy', () => {
  const matrix = new EdTechAcademyRbacMatrix();

  // Student is base role
  const studentDef = matrix.getRoleDefinition('Student');
  assert.deepEqual(studentDef.inherits, [], 'Student should not inherit from any role');
  assert.ok(studentDef.directPermissions.includes('course:view'));
  assert.ok(studentDef.directPermissions.includes('assignment:submit'));

  // Teaching Assistant inherits from Student
  const taDef = matrix.getRoleDefinition('Teaching Assistant');
  assert.deepEqual(taDef.inherits, ['Student']);
  assert.ok(taDef.directPermissions.includes('assignment:grade'));
  assert.ok(taDef.allPermissions.includes('assignment:grade'), 'TA should have direct grade perm');
  assert.ok(taDef.allPermissions.includes('assignment:submit'), 'TA should inherit student submit perm');
  assert.ok(taDef.allPermissions.includes('course:view'), 'TA should inherit student view perm');

  // Instructor inherits from Teaching Assistant (and transitively Student)
  const instructorDef = matrix.getRoleDefinition('Instructor');
  assert.deepEqual(instructorDef.inherits, ['Teaching Assistant']);
  assert.ok(instructorDef.directPermissions.includes('course:create'));
  assert.ok(instructorDef.allPermissions.includes('assignment:grade'), 'Instructor should inherit TA grade perm');
  assert.ok(instructorDef.allPermissions.includes('course:view'), 'Instructor should inherit Student view perm');

  // Campus Admin inherits from Instructor and includes wildcard *
  const adminDef = matrix.getRoleDefinition('Campus Admin');
  assert.deepEqual(adminDef.inherits, ['Instructor']);
  assert.ok(adminDef.directPermissions.includes('*'));
  assert.ok(adminDef.directPermissions.includes('user:manage'));
});

test('EdTechAcademyRbacMatrix - inspects direct versus inherited permissions', () => {
  const matrix = new EdTechAcademyRbacMatrix();
  const taDef = matrix.getRoleDefinition('Teaching Assistant');

  assert.ok(taDef.directPermissions.includes('assignment:grade'));
  assert.ok(!taDef.directPermissions.includes('assignment:submit'), 'Submit should not be direct for TA');

  const inheritedSubmit = taDef.inheritedPermissions.find(p => p.permission === 'assignment:submit');
  assert.ok(inheritedSubmit, 'assignment:submit should appear in inheritedPermissions list');
  assert.equal(inheritedSubmit.sourceRole, 'Student', 'Submit should originate from Student');

  // getPermissionsForRole options test
  const directOnly = matrix.getPermissionsForRole('Teaching Assistant', { includeInherited: false });
  const allPerms = matrix.getPermissionsForRole('Teaching Assistant', { includeInherited: true });

  assert.ok(allPerms.length > directOnly.length);
  assert.ok(directOnly.includes('assignment:grade'));
  assert.ok(!directOnly.includes('assignment:submit'));
  assert.ok(allPerms.includes('assignment:submit'));
});

test('EdTechAcademyRbacMatrix - wildcard capability matching', () => {
  const matrix = new EdTechAcademyRbacMatrix();

  // Global wildcard
  assert.equal(matrix.matchesPermission('*', 'course:view'), true);
  assert.equal(matrix.matchesPermission('*', 'billing:manage'), true);
  assert.equal(matrix.matchesPermission('*', 'any:custom:action'), true);

  // Scoped prefix wildcards
  assert.equal(matrix.matchesPermission('course:*', 'course:view'), true);
  assert.equal(matrix.matchesPermission('course:*', 'course:create'), true);
  assert.equal(matrix.matchesPermission('course:*', 'course:materials:edit'), true);
  assert.equal(matrix.matchesPermission('course:*', 'assignment:view'), false);

  // Multi-segment wildcards
  assert.equal(matrix.matchesPermission('assignment:grade:*', 'assignment:grade:essay'), true);
  assert.equal(matrix.matchesPermission('assignment:grade:*', 'assignment:grade:quiz'), true);
  assert.equal(matrix.matchesPermission('assignment:grade:*', 'assignment:submit'), false);

  // Suffix wildcard
  assert.equal(matrix.matchesPermission('*:read', 'content:read'), true);
  assert.equal(matrix.matchesPermission('*:read', 'discussion:read'), true);
  assert.equal(matrix.matchesPermission('*:read', 'content:write'), false);

  // Exact matching
  assert.equal(matrix.matchesPermission('course:view', 'course:view'), true);
  assert.equal(matrix.matchesPermission('course:view', 'course:enroll'), false);
});

test('EdTechAcademyRbacMatrix - can() evaluates baseline RBAC permissions correctly', () => {
  const matrix = new EdTechAcademyRbacMatrix();

  // Student checks
  assert.equal(matrix.can('Student', 'course:view'), true);
  assert.equal(matrix.can('Student', 'assignment:submit'), true);
  assert.equal(matrix.can('Student', 'quiz:take'), true);
  assert.equal(matrix.can('Student', 'assignment:grade'), false, 'Student cannot grade');
  assert.equal(matrix.can('Student', 'course:create'), false, 'Student cannot create course');
  assert.equal(matrix.can('Student', 'campus:configure'), false, 'Student cannot configure campus');

  // Teaching Assistant checks
  assert.equal(matrix.can('Teaching Assistant', 'assignment:grade'), true);
  assert.equal(matrix.can('Teaching Assistant', 'course:view'), true, 'TA inherits course:view');
  assert.equal(matrix.can('Teaching Assistant', 'course:create'), false, 'TA cannot create course');
  assert.equal(matrix.can('Teaching Assistant', 'billing:manage'), false, 'TA cannot manage billing');

  // Instructor checks
  assert.equal(matrix.can('Instructor', 'course:create'), true);
  assert.equal(matrix.can('Instructor', 'curriculum:publish'), true);
  assert.equal(matrix.can('Instructor', 'assignment:grade'), true, 'Instructor inherits grade');
  assert.equal(matrix.can('Instructor', 'course:view'), true, 'Instructor inherits view');
  assert.equal(matrix.can('Instructor', 'billing:manage'), false, 'Instructor cannot manage billing');

  // Campus Admin checks (wildcard *)
  assert.equal(matrix.can('Campus Admin', 'billing:manage'), true);
  assert.equal(matrix.can('Campus Admin', 'user:manage'), true);
  assert.equal(matrix.can('Campus Admin', 'system:audit'), true);
  assert.equal(matrix.can('Campus Admin', 'any:custom:enterprise:action'), true, 'Admin has wildcard *');
});

test('EdTechAcademyRbacMatrix - ABAC policy guard: course enrollment status', () => {
  const matrix = new EdTechAcademyRbacMatrix();

  // Student enrolled actively
  const activeCheck = matrix.check(
    { id: 's1', role: 'Student', enrolledCourses: ['CS-101'] },
    'course:view',
    { courseId: 'CS-101', enrollmentStatus: 'active' }
  );
  assert.equal(activeCheck.allowed, true);

  // Student not enrolled in target course
  const notEnrolledCheck = matrix.check(
    { id: 's1', role: 'Student', enrolledCourses: ['CS-101'] },
    'course:view',
    { courseId: 'MATH-202' }
  );
  assert.equal(notEnrolledCheck.allowed, false);
  assert.ok(notEnrolledCheck.reason.includes('not enrolled'));

  // Student dropped course
  const droppedCheck = matrix.check(
    { id: 's1', role: 'Student' },
    'assignment:submit',
    { courseId: 'CS-101', enrollmentStatus: 'dropped' }
  );
  assert.equal(droppedCheck.allowed, false);
  assert.ok(droppedCheck.reason.includes('dropped'));

  // Student suspended course
  const suspendedCheck = matrix.check(
    { id: 's1', role: 'Student' },
    'content:read',
    { courseId: 'CS-101', enrollmentStatus: 'suspended' }
  );
  assert.equal(suspendedCheck.allowed, false);
  assert.ok(suspendedCheck.reason.includes('suspended'));

  // Instructor and Campus Admin bypass student enrollment restrictions
  assert.equal(matrix.can('Instructor', 'course:view', { courseId: 'MATH-202' }), true);
  assert.equal(matrix.can('Campus Admin', 'course:view', { courseId: 'MATH-202' }), true);
});

test('EdTechAcademyRbacMatrix - ABAC policy guard: assignment submission deadlines', () => {
  const matrix = new EdTechAcademyRbacMatrix();
  const now = Date.now();

  // On-time submission
  const onTimeCheck = matrix.check(
    { id: 's1', role: 'Student' },
    'assignment:submit',
    {
      courseId: 'CS-101',
      deadline: new Date(now + 3600000).toISOString(), // 1 hr future
      submittedAt: new Date(now).toISOString()
    }
  );
  assert.equal(onTimeCheck.allowed, true);

  // Overdue submission (late submissions locked)
  const overdueCheck = matrix.check(
    { id: 's1', role: 'Student' },
    'assignment:submit',
    {
      courseId: 'CS-101',
      deadline: new Date(now - 3600000).toISOString(), // 1 hr past
      submittedAt: new Date(now).toISOString(),
      allowLateSubmission: false
    }
  );
  assert.equal(overdueCheck.allowed, false);
  assert.ok(overdueCheck.reason.includes('deadline has passed'));

  // Overdue submission with allowLateSubmission = true
  const lateAllowedCheck = matrix.check(
    { id: 's1', role: 'Student' },
    'assignment:submit',
    {
      courseId: 'CS-101',
      deadline: new Date(now - 3600000).toISOString(),
      submittedAt: new Date(now).toISOString(),
      allowLateSubmission: true
    }
  );
  assert.equal(lateAllowedCheck.allowed, true);

  // Submission within grace period (e.g. 10 min grace period, submitted 4 min late)
  const graceCheck = matrix.check(
    { id: 's1', role: 'Student' },
    'assignment:submit',
    {
      courseId: 'CS-101',
      deadline: new Date(now - 240000).toISOString(), // 4 min ago
      submittedAt: new Date(now).toISOString(),
      gracePeriodMinutes: 10
    }
  );
  assert.equal(graceCheck.allowed, true);
});

test('EdTechAcademyRbacMatrix - ABAC policy guard: faculty grading deadlines', () => {
  const matrix = new EdTechAcademyRbacMatrix();
  const pastDeadline = new Date(Date.now() - 7200000).toISOString(); // 2 hours ago

  // TA grading past deadline without override
  const taGradingCheck = matrix.check(
    { id: 'ta1', role: 'Teaching Assistant' },
    'assignment:grade',
    { courseId: 'CS-101', gradingDeadline: pastDeadline }
  );
  assert.equal(taGradingCheck.allowed, false);
  assert.ok(taGradingCheck.reason.includes('Grading window has expired'));

  // Instructor grading past deadline (has override authority)
  const instructorCheck = matrix.check(
    { id: 'prof1', role: 'Instructor' },
    'assignment:grade',
    { courseId: 'CS-101', gradingDeadline: pastDeadline }
  );
  assert.equal(instructorCheck.allowed, true);
});

test('EdTechAcademyRbacMatrix - ABAC policy guard: proctoring mode flags', () => {
  const matrix = new EdTechAcademyRbacMatrix();

  // Unproctored quiz
  const unproctored = matrix.check(
    { id: 's1', role: 'Student' },
    'quiz:take',
    { proctoringMode: 'none' }
  );
  assert.equal(unproctored.allowed, true);

  // Active proctoring but unverified
  const unverified = matrix.check(
    { id: 's1', role: 'Student' },
    'quiz:take',
    { proctoringMode: 'active', proctorVerified: false }
  );
  assert.equal(unverified.allowed, false);
  assert.ok(unverified.reason.includes('Verified secure proctor session is required'));

  // Active proctoring verified
  const verified = matrix.check(
    { id: 's1', role: 'Student' },
    'quiz:take',
    { proctoringMode: 'active', proctorVerified: true, proctorSessionId: 'proc-123' }
  );
  assert.equal(verified.allowed, true);

  // Violation: fullscreen window exit
  const fullscreenViolation = matrix.check(
    { id: 's1', role: 'Student' },
    'quiz:take',
    { proctoringMode: 'active', proctorVerified: true, fullscreenExitDetected: true }
  );
  assert.equal(fullscreenViolation.allowed, false);
  assert.ok(fullscreenViolation.reason.includes('Fullscreen window exit detected'));

  // Violation: secondary monitor detected
  const secondaryDevice = matrix.check(
    { id: 's1', role: 'Student' },
    'quiz:take',
    { proctoringMode: 'active', proctorVerified: true, secondaryDeviceDetected: true }
  );
  assert.equal(secondaryDevice.allowed, false);
  assert.ok(secondaryDevice.reason.includes('secondary monitor'));

  // Violation: multiple faces detected
  const multiFace = matrix.check(
    { id: 's1', role: 'Student' },
    'quiz:take',
    { proctoringMode: 'active', proctorVerified: true, multipleFacesDetected: true }
  );
  assert.equal(multiFace.allowed, false);
  assert.ok(multiFace.reason.includes('Multiple faces'));

  // Campus Admin bypasses proctoring flags
  const adminBypass = matrix.check(
    { id: 'admin1', role: 'Campus Admin' },
    'quiz:take',
    { proctoringMode: 'active', fullscreenExitDetected: true }
  );
  assert.equal(adminBypass.allowed, true);
});

test('EdTechAcademyRbacMatrix - audit trail records, filters, and clears events', () => {
  const matrix = new EdTechAcademyRbacMatrix();

  matrix.can('Student', 'course:view');
  matrix.can('Student', 'assignment:grade'); // denied
  matrix.can('Instructor', 'curriculum:publish');

  const logs = matrix.getAuditLogs();
  assert.equal(logs.length, 3);
  assert.equal(logs[0].action, 'curriculum:publish', 'Most recent event should be first');

  const deniedLogs = matrix.getAuditLogs({ allowed: false });
  assert.equal(deniedLogs.length, 1);
  assert.equal(deniedLogs[0].action, 'assignment:grade');

  const allowedLogs = matrix.getAuditLogs({ allowed: true });
  assert.equal(allowedLogs.length, 2);

  // Export audit logs
  const exported = matrix.exportAuditLogs();
  assert.equal(typeof exported, 'string');
  assert.ok(exported.includes('curriculum:publish'));

  // Clear audit logs
  matrix.clearAuditLogs();
  assert.equal(matrix.getAuditLogs().length, 0);
});

test('EdTechAcademyRbacMatrix - dynamic role creation and permission modification', () => {
  const matrix = new EdTechAcademyRbacMatrix();

  // Add custom role 'Course Mentor' inheriting from Student
  matrix.addRole('Course Mentor', {
    inherits: ['Student'],
    permissions: ['mentorship:chat', 'session:schedule'],
    description: 'Peer mentor providing study guidance'
  });

  assert.ok(matrix.hasRole('Course Mentor'));
  assert.equal(matrix.can('Course Mentor', 'mentorship:chat'), true);
  assert.equal(matrix.can('Course Mentor', 'course:view'), true, 'Should inherit from Student');
  assert.equal(matrix.can('Course Mentor', 'assignment:grade'), false, 'Should not have TA perms');

  // Assign and revoke permission
  matrix.assignPermission('Student', 'lab:reserve');
  assert.equal(matrix.can('Student', 'lab:reserve'), true);

  matrix.revokePermission('Student', 'lab:reserve');
  assert.equal(matrix.can('Student', 'lab:reserve'), false);
});

test('EdTechAcademyRbacMatrix - multi-role user evaluation', () => {
  const matrix = new EdTechAcademyRbacMatrix();

  // User with dual roles: Student and Teaching Assistant
  const dualUser = {
    id: 'u-hybrid',
    roles: ['Student', 'Teaching Assistant']
  };

  assert.equal(matrix.can(dualUser, 'course:view'), true);
  assert.equal(matrix.can(dualUser, 'assignment:grade'), true);
  assert.equal(matrix.can(dualUser, 'course:create'), false);
});

test('EdTechAcademyRbacMatrix - edge cases and input resilience', () => {
  const matrix = new EdTechAcademyRbacMatrix();

  // Null or empty user
  assert.equal(matrix.can(null, 'course:view'), false);
  assert.equal(matrix.can({}, 'course:view'), false);

  // Invalid or empty action
  assert.equal(matrix.can('Student', ''), false);
  assert.equal(matrix.can('Student', null), false);

  // Unknown role
  assert.equal(matrix.can('UnknownAlienRole', 'course:view'), false);

  // Case-insensitive role matching
  assert.equal(matrix.can('student', 'course:view'), true);
  assert.equal(matrix.can('teaching_assistant', 'assignment:grade'), true);
  assert.equal(matrix.can('admin', 'system:audit'), true);
});
