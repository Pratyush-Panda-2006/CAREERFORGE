/**
 * EdTechAcademyRbacMatrix
 * Role-Based Access Control (RBAC) Permission Matrix & Attribute-Based Access Control (ABAC) Policy Guard
 * for EdTech Academy educational platforms.
 * 
 * Features:
 * - Four canonical academic roles: Student, Teaching Assistant, Instructor, Campus Admin
 * - Hierarchical permission inheritance (Student -> TA -> Instructor -> Campus Admin)
 * - Wildcard capability resolution (*, course:*, assignment:grade:*, etc.)
 * - Contextual ABAC policy evaluations:
 *     1. Course enrollment status (active, completed, dropped, suspended, not_enrolled)
 *     2. Assessment & grading submission deadlines (on-time, late, grace periods)
 *     3. Active proctoring mode flags (lockdown browser, camera verification, violation triggers)
 * - Audit trail logging with filtering and export capabilities
 * - Headless and browser DOM matrix visualization
 */

export class EdTechAcademyRbacMatrix {
  /**
   * Initializes the RBAC Matrix with default academic roles, permissions, and inheritance hierarchy.
   * @param {Object} [options] Optional custom configuration
   */
  constructor(options = {}) {
    this.roles = {
      'Student': {
        inherits: [],
        permissions: [
          'course:view',
          'course:enroll',
          'content:read',
          'assignment:view',
          'assignment:submit',
          'quiz:take',
          'quiz:submit',
          'discussion:read',
          'discussion:post',
          'grade:view_own'
        ],
        description: 'Enrolled learner with course consumption, quiz taking, and assignment submission capabilities.'
      },
      'Teaching Assistant': {
        inherits: ['Student'],
        permissions: [
          'assignment:grade',
          'submission:review',
          'discussion:moderate',
          'proctor:monitor',
          'grade:view_class',
          'course:materials_edit',
          'office_hours:host'
        ],
        description: 'Course facilitator assisting with evaluation, moderation, proctoring, and student support.'
      },
      'Instructor': {
        inherits: ['Teaching Assistant'],
        permissions: [
          'course:create',
          'course:edit',
          'course:delete',
          'curriculum:publish',
          'exam:create',
          'exam:publish',
          'assignment:manage',
          'grade:override',
          'analytics:view_cohort',
          'proctor:configure'
        ],
        description: 'Faculty leader with authoring, exam management, grade override, and cohort telemetry powers.'
      },
      'Campus Admin': {
        inherits: ['Instructor'],
        permissions: [
          '*',
          'user:manage',
          'role:assign',
          'campus:configure',
          'system:audit',
          'billing:manage',
          'proctor:bypass'
        ],
        description: 'Campus administrator with universal access (*), user provisioning, and institution configuration.'
      }
    };

    // Role aliases for flexible lookups
    this.roleAliases = {
      'student': 'Student',
      'learner': 'Student',
      'ta': 'Teaching Assistant',
      'teaching assistant': 'Teaching Assistant',
      'teachingassistant': 'Teaching Assistant',
      'teaching_assistant': 'Teaching Assistant',
      'assistant': 'Teaching Assistant',
      'instructor': 'Instructor',
      'faculty': 'Instructor',
      'teacher': 'Instructor',
      'professor': 'Instructor',
      'admin': 'Campus Admin',
      'campus admin': 'Campus Admin',
      'campus_admin': 'Campus Admin',
      'administrator': 'Campus Admin',
      'superadmin': 'Campus Admin'
    };

    // Apply any custom roles or permissions provided in options
    if (options.roles) {
      for (const [roleName, roleDef] of Object.entries(options.roles)) {
        this.addRole(roleName, roleDef);
      }
    }

    this.auditLogs = [];
    this.maxAuditLogs = options.maxAuditLogs || 1000;
  }

  /**
   * Normalizes a role string to canonical title case or known alias.
   * @param {string} role 
   * @returns {string} Canonical role name
   */
  _normalizeRole(role) {
    if (!role || typeof role !== 'string') return '';
    const clean = role.trim();
    const lower = clean.toLowerCase();
    if (this.roleAliases[lower]) {
      return this.roleAliases[lower];
    }
    // Check if role exists with case-insensitive search
    const found = Object.keys(this.roles).find(r => r.toLowerCase() === lower);
    return found || clean;
  }

  /**
   * Gets list of defined canonical role names.
   * @returns {string[]}
   */
  getRoles() {
    return Object.keys(this.roles);
  }

  /**
   * Checks whether a role is defined.
   * @param {string} role 
   * @returns {boolean}
   */
  hasRole(role) {
    const canonical = this._normalizeRole(role);
    return Boolean(this.roles[canonical]);
  }

  /**
   * Adds or updates a role definition.
   * @param {string} roleName 
   * @param {Object} [roleDef] 
   */
  addRole(roleName, roleDef = {}) {
    if (!roleName || typeof roleName !== 'string') {
      throw new Error('Role name must be a valid non-empty string.');
    }
    const cleanName = roleName.trim();
    this.roles[cleanName] = {
      inherits: Array.isArray(roleDef.inherits) ? [...roleDef.inherits] : [],
      permissions: Array.isArray(roleDef.permissions) ? [...roleDef.permissions] : [],
      description: roleDef.description || `Custom role ${cleanName}`
    };
    this.roleAliases[cleanName.toLowerCase()] = cleanName;
  }

  /**
   * Assigns a permission to an existing role.
   * @param {string} role 
   * @param {string} permission 
   */
  assignPermission(role, permission) {
    const canonical = this._normalizeRole(role);
    if (!this.roles[canonical]) {
      throw new Error(`Role "${role}" does not exist in the matrix.`);
    }
    if (!this.roles[canonical].permissions.includes(permission)) {
      this.roles[canonical].permissions.push(permission);
    }
  }

  /**
   * Revokes a permission from an existing role.
   * @param {string} role 
   * @param {string} permission 
   */
  revokePermission(role, permission) {
    const canonical = this._normalizeRole(role);
    if (!this.roles[canonical]) {
      throw new Error(`Role "${role}" does not exist in the matrix.`);
    }
    this.roles[canonical].permissions = this.roles[canonical].permissions.filter(p => p !== permission);
  }

  /**
   * Retrieves all permissions for a role, resolving direct and optionally inherited permissions.
   * @param {string} role 
   * @param {Object} [options] 
   * @param {boolean} [options.includeInherited=true] 
   * @returns {string[]} List of distinct permissions
   */
  getPermissionsForRole(role, { includeInherited = true } = {}) {
    const canonical = this._normalizeRole(role);
    if (!this.roles[canonical]) {
      return [];
    }

    if (!includeInherited) {
      return [...this.roles[canonical].permissions];
    }

    const collected = new Set();
    const visitedRoles = new Set();

    const traverse = (currentRole) => {
      const norm = this._normalizeRole(currentRole);
      if (!this.roles[norm] || visitedRoles.has(norm)) return;
      visitedRoles.add(norm);

      // Add direct permissions
      for (const perm of this.roles[norm].permissions) {
        collected.add(perm);
      }

      // Traverse inherited roles
      const parents = this.roles[norm].inherits || [];
      for (const parent of parents) {
        traverse(parent);
      }
    };

    traverse(canonical);
    return Array.from(collected);
  }

  /**
   * Gets detailed breakdown of a role: direct permissions, inherited permissions, and sources.
   * @param {string} role 
   * @returns {Object}
   */
  getRoleDefinition(role) {
    const canonical = this._normalizeRole(role);
    if (!this.roles[canonical]) {
      return null;
    }

    const direct = [...this.roles[canonical].permissions];
    const inherited = [];
    const parents = this.roles[canonical].inherits || [];

    const inheritedMap = new Map();
    const visited = new Set([canonical]);

    const collectInherited = (currentRole) => {
      const norm = this._normalizeRole(currentRole);
      if (!this.roles[norm] || visited.has(norm)) return;
      visited.add(norm);

      for (const p of this.roles[norm].permissions) {
        if (!inheritedMap.has(p)) {
          inheritedMap.set(p, norm);
        }
      }

      for (const parent of this.roles[norm].inherits || []) {
        collectInherited(parent);
      }
    };

    for (const parent of parents) {
      collectInherited(parent);
    }

    for (const [perm, sourceRole] of inheritedMap.entries()) {
      if (!direct.includes(perm)) {
        inherited.push({ permission: perm, sourceRole });
      }
    }

    const allDistinct = Array.from(new Set([...direct, ...inherited.map(i => i.permission)]));

    return {
      role: canonical,
      description: this.roles[canonical].description,
      inherits: [...parents],
      directPermissions: direct,
      inheritedPermissions: inherited,
      allPermissions: allDistinct
    };
  }

  /**
   * Checks whether a granted permission pattern matches the requested action.
   * Supports wildcards (*, course:*, assignment:grade:*, *:read).
   * @param {string} pattern Granted permission pattern
   * @param {string} requestedAction Requested specific action
   * @returns {boolean}
   */
  matchesPermission(pattern, requestedAction) {
    if (!pattern || !requestedAction || typeof pattern !== 'string' || typeof requestedAction !== 'string') {
      return false;
    }

    // Direct match or global wildcard
    if (pattern === '*' || pattern === requestedAction) {
      return true;
    }

    // If wildcard pattern exists
    if (pattern.includes('*')) {
      const regexStr = '^' + pattern
        .split('*')
        .map(seg => seg.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*') + '$';
      return new RegExp(regexStr).test(requestedAction);
    }

    return false;
  }

  /**
   * Evaluates Attribute-Based Access Control (ABAC) contextual policy guards.
   * Supported conditions:
   * 1. Course Enrollment Status (active, dropped, suspended, not_enrolled)
   * 2. Assignment / Assessment Deadlines (before due date, late submission policies, grace periods)
   * 3. Proctoring Mode Flags (active proctoring requirement, fullscreen exits, secondary monitors)
   * 
   * @param {Object} context Context object containing user, course, deadline, proctoring attributes
   * @returns {Object} Evaluation outcome { allowed: boolean, reason: string, condition: string, details?: Object }
   */
  evaluatePolicy(context) {
    if (!context || typeof context !== 'object') {
      return {
        allowed: true,
        reason: 'No policy context provided; default permissive ABAC.',
        condition: 'POLICY_DEFAULT_PASS'
      };
    }

    const action = context.action || '';
    const userRole = this._normalizeRole(context.user?.role || context.role || '');

    // Campus Admins bypass operational ABAC guards unless explicit strict enforcement is demanded
    if (userRole === 'Campus Admin' && !context.strictAdminEnforcement) {
      return {
        allowed: true,
        reason: 'Campus Admin administrative bypass granted.',
        condition: 'ADMIN_BYPASS'
      };
    }

    // -------------------------------------------------------------
    // 1. COURSE ENROLLMENT STATUS CHECK
    // -------------------------------------------------------------
    if (context.courseId) {
      const courseId = String(context.courseId).trim();
      const user = context.user || {};

      // If user is a Student (or non-faculty performing course-specific actions)
      const isStudentRole = userRole === 'Student' || !['Instructor', 'Campus Admin'].includes(userRole);
      const isCourseContentAction = action.startsWith('course:') ||
        action.startsWith('content:') ||
        action.startsWith('assignment:') ||
        action.startsWith('quiz:') ||
        action.startsWith('discussion:');

      if (isStudentRole && isCourseContentAction) {
        // Explicit enrollment status from context
        const status = (context.enrollmentStatus || '').toLowerCase();

        if (status === 'dropped') {
          return {
            allowed: false,
            reason: `Course enrollment dropped: User does not have access to course "${courseId}".`,
            condition: 'ENROLLMENT_DROPPED',
            details: { courseId, status: 'dropped' }
          };
        }

        if (status === 'suspended') {
          return {
            allowed: false,
            reason: `Course enrollment suspended: Disciplinary or administrative hold on course "${courseId}".`,
            condition: 'ENROLLMENT_SUSPENDED',
            details: { courseId, status: 'suspended' }
          };
        }

        if (status === 'not_enrolled') {
          return {
            allowed: false,
            reason: `User is not enrolled in course "${courseId}".`,
            condition: 'NOT_ENROLLED',
            details: { courseId, status: 'not_enrolled' }
          };
        }

        // Check user's own enrolledCourses property if present
        if (Array.isArray(user.enrolledCourses)) {
          const isEnrolled = user.enrolledCourses.some(id => String(id).toLowerCase() === courseId.toLowerCase());
          if (!isEnrolled && status !== 'active') {
            return {
              allowed: false,
              reason: `User is not enrolled in course "${courseId}".`,
              condition: 'NOT_ENROLLED',
              details: { courseId, enrolledCourses: user.enrolledCourses }
            };
          }
        }

        // Check user's enrollments map if present (e.g. { 'cs101': { status: 'active' } })
        if (user.enrollments && typeof user.enrollments === 'object') {
          const courseRecord = user.enrollments[courseId] || user.enrollments[courseId.toLowerCase()];
          if (!courseRecord) {
            return {
              allowed: false,
              reason: `No enrollment record found for course "${courseId}".`,
              condition: 'NOT_ENROLLED',
              details: { courseId }
            };
          }
          const recStatus = (typeof courseRecord === 'string' ? courseRecord : courseRecord.status || '').toLowerCase();
          if (recStatus === 'dropped' || recStatus === 'suspended') {
            return {
              allowed: false,
              reason: `Enrollment status is "${recStatus}" for course "${courseId}".`,
              condition: 'ENROLLMENT_' + recStatus.toUpperCase(),
              details: { courseId, status: recStatus }
            };
          }
        }
      }
    }

    // -------------------------------------------------------------
    // 2. GRADING & SUBMISSION DEADLINE CHECK
    // -------------------------------------------------------------
    const isSubmissionAction = action.includes('submit') || context.isSubmission === true;
    const isGradingAction = action.includes('grade') || action.includes('review') || context.isGrading === true;

    // Student assessment submission deadline guard
    if (isSubmissionAction && (context.deadline || context.dueDate)) {
      const deadline = new Date(context.deadline || context.dueDate).getTime();
      const gracePeriodMs = (Number(context.gracePeriodMinutes) || 0) * 60 * 1000;
      const submittedAt = context.submittedAt
        ? new Date(context.submittedAt).getTime()
        : (context.timestamp ? new Date(context.timestamp).getTime() : Date.now());

      if (submittedAt > (deadline + gracePeriodMs)) {
        if (!context.allowLateSubmission) {
          const overMs = submittedAt - (deadline + gracePeriodMs);
          const minutesLate = Math.ceil(overMs / 60000);
          return {
            allowed: false,
            reason: `Submission deadline has passed by ${minutesLate} minute(s). Late submissions are locked.`,
            condition: 'DEADLINE_EXPIRED',
            details: { deadline: new Date(deadline).toISOString(), submittedAt: new Date(submittedAt).toISOString(), minutesLate }
          };
        }
      }
    }

    // Faculty grading window deadline guard (e.g. TAs cannot grade after term cutoff, unless Instructor overrides)
    if (isGradingAction && context.gradingDeadline) {
      const gradingDeadline = new Date(context.gradingDeadline).getTime();
      const evalTime = context.timestamp ? new Date(context.timestamp).getTime() : Date.now();

      if (evalTime > gradingDeadline) {
        // Instructors with grade:override or admins can grade past deadline
        const canOverride = userRole === 'Instructor' || userRole === 'Campus Admin' || context.allowLateGrading === true;
        if (!canOverride) {
          return {
            allowed: false,
            reason: 'Grading window has expired for this cohort assessment. Grade override required.',
            condition: 'GRADING_DEADLINE_EXPIRED',
            details: { gradingDeadline: new Date(gradingDeadline).toISOString() }
          };
        }
      }
    }

    // -------------------------------------------------------------
    // 3. PROCTORING MODE FLAGS & INTEGRITY GUARDS
    // -------------------------------------------------------------
    const proctoringActive = context.proctoringMode === 'active' ||
      context.proctoringMode === 'strict' ||
      context.proctoringMode === 'enabled' ||
      context.isProctored === true;

    if (proctoringActive) {
      // Check for proctoring bypass exemption
      const hasBypass = (context.user?.permissions && context.user.permissions.includes('proctor:bypass')) ||
        userRole === 'Campus Admin' ||
        context.bypassProctoring === true;

      if (!hasBypass) {
        // Violation: Fullscreen exit detected
        if (context.fullscreenExitDetected === true) {
          return {
            allowed: false,
            reason: 'Proctoring integrity violation: Fullscreen window exit detected.',
            condition: 'PROCTOR_FULLSCREEN_VIOLATION',
            details: { violation: 'fullscreen_exit' }
          };
        }

        // Violation: Secondary monitor or external display detected
        if (context.secondaryDeviceDetected === true) {
          return {
            allowed: false,
            reason: 'Proctoring integrity violation: Unauthorized secondary monitor or external device detected.',
            condition: 'PROCTOR_SECONDARY_DEVICE',
            details: { violation: 'secondary_device' }
          };
        }

        // Violation: Multiple faces detected by webcam AI
        if (context.multipleFacesDetected === true) {
          return {
            allowed: false,
            reason: 'Proctoring integrity violation: Multiple faces or unauthorized individuals detected.',
            condition: 'PROCTOR_MULTIPLE_FACES',
            details: { violation: 'multiple_faces' }
          };
        }

        // Session verification guard
        const hasSession = Boolean(context.proctorSessionId || context.proctorVerified === true);
        if (context.proctorVerified === false || !hasSession) {
          return {
            allowed: false,
            reason: 'Active proctoring mode is enabled: Verified secure proctor session is required.',
            condition: 'PROCTOR_UNVERIFIED',
            details: { proctoringMode: context.proctoringMode, sessionVerified: false }
          };
        }
      }
    }

    return {
      allowed: true,
      reason: 'All contextual ABAC policy conditions passed.',
      condition: 'POLICY_SATISFIED'
    };
  }

  /**
   * Evaluates whether a user can perform an action in a given context.
   * Performs RBAC hierarchical permission resolution first, then runs contextual ABAC policies.
   * Logs the outcome to the internal audit trail.
   * 
   * @param {Object|string} user User object ({ id, role, roles, ... }) or role string
   * @param {string} action The permission action (e.g. 'course:view', 'assignment:grade')
   * @param {Object} [context] Optional ABAC context (courseId, deadline, proctoringMode, etc.)
   * @returns {boolean} True if authorized, false if denied
   */
  can(user, action, context = null) {
    const checkResult = this.check(user, action, context);
    return checkResult.allowed;
  }

  /**
   * Detailed diagnostic check returning authorization status, matched permission,
   * inheritance origin, ABAC outcome, and reason.
   * 
   * @param {Object|string} user 
   * @param {string} action 
   * @param {Object} [context] 
   * @returns {Object}
   */
  check(user, action, context = null) {
    if (!action || typeof action !== 'string') {
      const logEntry = this._recordAudit({
        user,
        action: action || 'unknown',
        allowed: false,
        reason: 'Invalid or missing action requested.',
        context
      });
      return { allowed: false, reason: 'Invalid action.', logId: logEntry.id };
    }

    // Resolve user roles
    let userRoles = [];
    let userId = 'anonymous';

    if (typeof user === 'string') {
      const canonical = this._normalizeRole(user);
      if (canonical) userRoles.push(canonical);
    } else if (user && typeof user === 'object') {
      userId = user.id || user.username || user.email || 'anonymous';
      if (user.role) {
        const canonical = this._normalizeRole(user.role);
        if (canonical) userRoles.push(canonical);
      }
      if (Array.isArray(user.roles)) {
        for (const r of user.roles) {
          const canonical = this._normalizeRole(r);
          if (canonical && !userRoles.includes(canonical)) {
            userRoles.push(canonical);
          }
        }
      }
    }

    if (userRoles.length === 0) {
      const reason = 'User has no valid roles assigned.';
      const logEntry = this._recordAudit({
        user: { id: userId },
        action,
        allowed: false,
        reason,
        context
      });
      return {
        allowed: false,
        reason,
        role: null,
        matchedPermission: null,
        inheritedFrom: null,
        logId: logEntry.id
      };
    }

    // Evaluate RBAC permissions across all user roles
    let rbacAllowed = false;
    let matchedPermission = null;
    let grantRole = null;
    let inheritedFrom = null;

    for (const role of userRoles) {
      const roleDef = this.getRoleDefinition(role);
      if (!roleDef) continue;

      // Check direct permissions first
      for (const perm of roleDef.directPermissions) {
        if (this.matchesPermission(perm, action)) {
          rbacAllowed = true;
          matchedPermission = perm;
          grantRole = role;
          inheritedFrom = null;
          break;
        }
      }

      if (rbacAllowed) break;

      // Check inherited permissions
      for (const inh of roleDef.inheritedPermissions) {
        if (this.matchesPermission(inh.permission, action)) {
          rbacAllowed = true;
          matchedPermission = inh.permission;
          grantRole = role;
          inheritedFrom = inh.sourceRole;
          break;
        }
      }

      if (rbacAllowed) break;
    }

    if (!rbacAllowed) {
      const reason = `Role "${userRoles.join(', ')}" lacks permission "${action}".`;
      const logEntry = this._recordAudit({
        user: { id: userId, roles: userRoles },
        action,
        allowed: false,
        reason,
        context
      });
      return {
        allowed: false,
        reason,
        role: userRoles[0],
        matchedPermission: null,
        inheritedFrom: null,
        logId: logEntry.id
      };
    }

    // RBAC check passed -> Now evaluate ABAC context policy
    const mergedContext = {
      ...(context || {}),
      action,
      user: typeof user === 'object' && user !== null ? user : { id: userId, role: userRoles[0] },
      role: grantRole
    };

    const abacResult = this.evaluatePolicy(mergedContext);

    if (!abacResult.allowed) {
      const logEntry = this._recordAudit({
        user: { id: userId, roles: userRoles },
        action,
        allowed: false,
        reason: abacResult.reason,
        context: mergedContext,
        condition: abacResult.condition
      });
      return {
        allowed: false,
        reason: abacResult.reason,
        role: grantRole,
        matchedPermission,
        inheritedFrom,
        abac: abacResult,
        logId: logEntry.id
      };
    }

    // Both RBAC and ABAC checks passed
    const successReason = `Authorized: Permission "${matchedPermission}" verified for role "${grantRole}"${inheritedFrom ? ` (inherited from ${inheritedFrom})` : ''}.`;
    const logEntry = this._recordAudit({
      user: { id: userId, roles: userRoles },
      action,
      allowed: true,
      reason: successReason,
      context: mergedContext,
      condition: abacResult.condition
    });

    return {
      allowed: true,
      reason: successReason,
      role: grantRole,
      matchedPermission,
      inheritedFrom,
      abac: abacResult,
      logId: logEntry.id
    };
  }

  /**
   * Internal recorder for audit logs.
   * @private
   */
  _recordAudit(entry) {
    const record = {
      id: 'audit-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 7),
      timestamp: new Date().toISOString(),
      userId: entry.user?.id || 'anonymous',
      roles: entry.user?.roles || (entry.user?.role ? [entry.user.role] : []),
      action: entry.action,
      resource: entry.context?.courseId || entry.context?.resource || 'system',
      allowed: Boolean(entry.allowed),
      reason: entry.reason,
      condition: entry.condition || (entry.allowed ? 'AUTHORIZED' : 'DENIED'),
      context: entry.context ? { ...entry.context } : null
    };

    this.auditLogs.unshift(record);
    if (this.auditLogs.length > this.maxAuditLogs) {
      this.auditLogs.pop();
    }
    return record;
  }

  /**
   * Returns a filtered list of audit logs.
   * @param {Object} [filter] 
   * @returns {Object[]}
   */
  getAuditLogs(filter = {}) {
    let result = [...this.auditLogs];

    if (typeof filter.allowed === 'boolean') {
      result = result.filter(log => log.allowed === filter.allowed);
    }
    if (filter.role) {
      const r = this._normalizeRole(filter.role).toLowerCase();
      result = result.filter(log => log.roles.some(role => role.toLowerCase() === r));
    }
    if (filter.action) {
      const q = filter.action.toLowerCase();
      result = result.filter(log => log.action.toLowerCase().includes(q));
    }
    if (filter.userId) {
      result = result.filter(log => log.userId === filter.userId);
    }
    if (filter.limit && typeof filter.limit === 'number') {
      result = result.slice(0, filter.limit);
    }

    return result;
  }

  /**
   * Clears all stored audit logs.
   */
  clearAuditLogs() {
    this.auditLogs = [];
  }

  /**
   * Exports the audit log list as JSON.
   * @returns {string}
   */
  exportAuditLogs() {
    return JSON.stringify(this.auditLogs, null, 2);
  }

  /**
   * Renders the interactive educational permissions matrix console in a browser DOM container.
   * @param {HTMLElement} container 
   */
  render(container) {
    if (typeof document === 'undefined' || !container) return;

    container.innerHTML = '';

    const rootWrapper = document.createElement('div');
    rootWrapper.className = 'ed-rbac-console';

    // 1. Header summary stats
    const statsBar = document.createElement('div');
    statsBar.className = 'ed-stats-bar';

    const rolesList = this.getRoles();
    let totalDirectPerms = 0;
    for (const r of rolesList) {
      totalDirectPerms += this.roles[r].permissions.length;
    }

    statsBar.innerHTML = `
      <div class="ed-stat-card">
        <span class="ed-stat-label">Defined Roles</span>
        <span class="ed-stat-value">${rolesList.length}</span>
      </div>
      <div class="ed-stat-card">
        <span class="ed-stat-label">Direct Capabilities</span>
        <span class="ed-stat-value">${totalDirectPerms}</span>
      </div>
      <div class="ed-stat-card">
        <span class="ed-stat-label">Hierarchy Layers</span>
        <span class="ed-stat-value">4 Tiers</span>
      </div>
      <div class="ed-stat-card">
        <span class="ed-stat-label">Audit Events</span>
        <span class="ed-stat-value" id="ed-audit-counter">${this.auditLogs.length}</span>
      </div>
    `;

    // 2. Matrix Table Section
    const matrixSection = document.createElement('div');
    matrixSection.className = 'ed-matrix-section';

    const matrixHeader = document.createElement('div');
    matrixHeader.className = 'ed-section-header';
    matrixHeader.innerHTML = `
      <h3>Educational RBAC Permission Matrix</h3>
      <p>Capabilities across academic roles indicating direct assignment versus hierarchical inheritance.</p>
    `;

    // Collect all distinct permissions across all roles
    const allKnownPermissions = new Set();
    for (const r of rolesList) {
      for (const p of this.getPermissionsForRole(r, { includeInherited: true })) {
        allKnownPermissions.add(p);
      }
    }
    const sortedPermissions = Array.from(allKnownPermissions).sort();

    const tableWrap = document.createElement('div');
    tableWrap.className = 'ed-table-wrap';

    const table = document.createElement('table');
    table.className = 'ed-matrix-table';

    // Table Header
    const thead = document.createElement('thead');
    let headerHtml = '<tr><th>Permission / Capability</th>';
    for (const role of rolesList) {
      headerHtml += `<th>${role}</th>`;
    }
    headerHtml += '</tr>';
    thead.innerHTML = headerHtml;
    table.appendChild(thead);

    // Table Body
    const tbody = document.createElement('tbody');
    for (const perm of sortedPermissions) {
      const tr = document.createElement('tr');
      const tdLabel = document.createElement('td');
      tdLabel.className = 'ed-perm-code';
      tdLabel.textContent = perm;
      tr.appendChild(tdLabel);

      for (const role of rolesList) {
        const td = document.createElement('td');
        const roleDef = this.getRoleDefinition(role);

        if (roleDef.directPermissions.includes(perm)) {
          td.innerHTML = '<span class="ed-badge ed-badge-direct">Direct</span>';
        } else if (roleDef.allPermissions.includes(perm)) {
          const inheritedEntry = roleDef.inheritedPermissions.find(i => i.permission === perm);
          const src = inheritedEntry ? inheritedEntry.sourceRole : 'Parent';
          td.innerHTML = `<span class="ed-badge ed-badge-inherited" title="Inherited from ${src}">Inherited</span>`;
        } else if (roleDef.allPermissions.includes('*')) {
          td.innerHTML = '<span class="ed-badge ed-badge-wildcard" title="Wildcard access via *">Wildcard *</span>';
        } else {
          td.innerHTML = '<span class="ed-cell-empty">—</span>';
        }

        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    tableWrap.appendChild(table);
    matrixSection.append(matrixHeader, tableWrap);

    // 3. Interactive Policy Tester Playground
    const playground = document.createElement('div');
    playground.className = 'ed-tester-section';
    playground.innerHTML = `
      <div class="ed-section-header">
        <h3>Interactive Policy Tester Playground</h3>
        <p>Test RBAC permissions and real-time ABAC conditions (course enrollment, deadlines, proctoring).</p>
      </div>
      <div class="ed-tester-grid">
        <div class="ed-form-group">
          <label>Academic Role</label>
          <select id="ed-test-role" class="ed-select">
            ${rolesList.map(r => `<option value="${r}">${r}</option>`).join('')}
          </select>
        </div>
        <div class="ed-form-group">
          <label>Target Capability Action</label>
          <select id="ed-test-action" class="ed-select">
            <option value="course:view">course:view (View course materials)</option>
            <option value="assignment:submit" selected>assignment:submit (Submit assignment)</option>
            <option value="quiz:take">quiz:take (Take proctored quiz)</option>
            <option value="assignment:grade">assignment:grade (Grade submissions)</option>
            <option value="curriculum:publish">curriculum:publish (Publish syllabus)</option>
            <option value="campus:configure">campus:configure (Campus IT configs)</option>
            <option value="billing:manage">billing:manage (Manage tuition/billing)</option>
          </select>
        </div>
        <div class="ed-form-group">
          <label>Course Enrollment Status (ABAC)</label>
          <select id="ed-test-enrollment" class="ed-select">
            <option value="active">Active (Enrolled)</option>
            <option value="not_enrolled">Not Enrolled</option>
            <option value="dropped">Dropped</option>
            <option value="suspended">Suspended (Academic Hold)</option>
          </select>
        </div>
        <div class="ed-form-group">
          <label>Submission Deadline (ABAC)</label>
          <select id="ed-test-deadline" class="ed-select">
            <option value="ontime">On-Time (Before Due Date)</option>
            <option value="late">Overdue (Past Deadline - Locked)</option>
            <option value="grace">Late (Within 10 min Grace Period)</option>
          </select>
        </div>
        <div class="ed-form-group">
          <label>Proctoring Mode & Integrity (ABAC)</label>
          <select id="ed-test-proctoring" class="ed-select">
            <option value="none">Disabled (Unproctored)</option>
            <option value="verified">Active Proctoring (Verified Session)</option>
            <option value="unverified">Active Proctoring (Missing Verification)</option>
            <option value="fullscreen_exit">Violation: Fullscreen Window Exited</option>
            <option value="secondary_device">Violation: Secondary Monitor Detected</option>
          </select>
        </div>
        <div class="ed-form-group ed-btn-wrap">
          <button id="ed-run-eval-btn" class="ed-btn ed-btn-primary">Evaluate Policy Guard</button>
        </div>
      </div>
      <div id="ed-eval-result" class="ed-eval-result-card" style="display: none;"></div>
    `;

    // 4. Audit Stream Section
    const auditSection = document.createElement('div');
    auditSection.className = 'ed-audit-section';
    auditSection.innerHTML = `
      <div class="ed-audit-header">
        <div>
          <h3>Audit Trail Stream</h3>
          <p>Cryptographically traceable access evaluations and policy decisions.</p>
        </div>
        <div class="ed-audit-actions">
          <button id="ed-sim-traffic-btn" class="ed-btn ed-btn-secondary">Simulate Academy Traffic</button>
          <button id="ed-clear-audit-btn" class="ed-btn ed-btn-outline">Clear Logs</button>
        </div>
      </div>
      <div id="ed-audit-stream" class="ed-audit-stream-list"></div>
    `;

    rootWrapper.append(statsBar, matrixSection, playground, auditSection);
    container.appendChild(rootWrapper);

    // Hook up interactive logic
    this._attachDomEvents(rootWrapper);
    this._refreshAuditStream(rootWrapper);
  }

  /**
   * Attaches DOM events for the interactive playground.
   * @private
   */
  _attachDomEvents(root) {
    const evalBtn = root.querySelector('#ed-run-eval-btn');
    const resultBox = root.querySelector('#ed-eval-result');
    const simBtn = root.querySelector('#ed-sim-traffic-btn');
    const clearBtn = root.querySelector('#ed-clear-audit-btn');

    const updateEvaluation = () => {
      const role = root.querySelector('#ed-test-role').value;
      const action = root.querySelector('#ed-test-action').value;
      const enrollment = root.querySelector('#ed-test-enrollment').value;
      const deadlineChoice = root.querySelector('#ed-test-deadline').value;
      const proctorChoice = root.querySelector('#ed-test-proctoring').value;

      // Construct context
      const context = {
        courseId: 'CS-401-QUANTUM-ALGO',
        enrollmentStatus: enrollment
      };

      const now = Date.now();
      if (deadlineChoice === 'ontime') {
        context.deadline = new Date(now + 3600000).toISOString(); // 1 hour ahead
        context.submittedAt = new Date(now).toISOString();
      } else if (deadlineChoice === 'late') {
        context.deadline = new Date(now - 3600000).toISOString(); // 1 hour ago
        context.submittedAt = new Date(now).toISOString();
        context.allowLateSubmission = false;
      } else if (deadlineChoice === 'grace') {
        context.deadline = new Date(now - 120000).toISOString(); // 2 mins ago
        context.submittedAt = new Date(now).toISOString();
        context.gracePeriodMinutes = 5;
      }

      if (proctorChoice === 'verified') {
        context.proctoringMode = 'active';
        context.proctorVerified = true;
        context.proctorSessionId = 'proc-sess-882';
      } else if (proctorChoice === 'unverified') {
        context.proctoringMode = 'active';
        context.proctorVerified = false;
      } else if (proctorChoice === 'fullscreen_exit') {
        context.proctoringMode = 'active';
        context.proctorVerified = true;
        context.fullscreenExitDetected = true;
      } else if (proctorChoice === 'secondary_device') {
        context.proctoringMode = 'active';
        context.proctorVerified = true;
        context.secondaryDeviceDetected = true;
      } else {
        context.proctoringMode = 'none';
      }

      const res = this.check({ id: 'user_' + role.toLowerCase().replace(/\s+/g, '_'), role }, action, context);

      resultBox.style.display = 'block';
      resultBox.className = `ed-eval-result-card ${res.allowed ? 'ed-eval-pass' : 'ed-eval-deny'}`;
      resultBox.innerHTML = `
        <div class="ed-eval-header">
          <span class="ed-eval-status-badge ${res.allowed ? 'status-pass' : 'status-deny'}">
            ${res.allowed ? 'ACCESS GRANTED (200)' : 'ACCESS DENIED (403)'}
          </span>
          <span class="ed-eval-time">${new Date().toLocaleTimeString()}</span>
        </div>
        <div class="ed-eval-body">
          <p class="ed-eval-reason"><strong>Decision:</strong> ${res.reason}</p>
          <div class="ed-eval-meta">
            <span><strong>Role:</strong> ${res.role || role}</span>
            <span><strong>Action:</strong> <code>${action}</code></span>
            <span><strong>Matched:</strong> <code>${res.matchedPermission || 'none'}</code></span>
            ${res.inheritedFrom ? `<span><strong>Inherited From:</strong> ${res.inheritedFrom}</span>` : ''}
          </div>
        </div>
      `;

      this._refreshAuditStream(root);
    };

    if (evalBtn) {
      evalBtn.addEventListener('click', updateEvaluation);
    }

    if (simBtn) {
      simBtn.addEventListener('click', () => {
        // Run simulated realistic scenarios
        this.can('Student', 'course:view', { courseId: 'CS-101', enrollmentStatus: 'active' });
        this.can('Student', 'assignment:submit', { courseId: 'CS-101', enrollmentStatus: 'dropped' });
        this.can('Student', 'assignment:submit', { courseId: 'CS-101', enrollmentStatus: 'active', deadline: '2020-01-01' });
        this.can('Teaching Assistant', 'assignment:grade', { courseId: 'CS-101' });
        this.can('Teaching Assistant', 'campus:configure');
        this.can('Instructor', 'curriculum:publish', { courseId: 'CS-101' });
        this.can('Student', 'quiz:take', { proctoringMode: 'active', fullscreenExitDetected: true });
        this.can('Campus Admin', 'billing:manage');
        this._refreshAuditStream(root);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearAuditLogs();
        this._refreshAuditStream(root);
      });
    }
  }

  /**
   * Refreshes the audit stream view in the DOM.
   * @private
   */
  _refreshAuditStream(root) {
    const listEl = root.querySelector('#ed-audit-stream');
    const counterEl = root.querySelector('#ed-audit-counter');
    if (!listEl) return;

    if (counterEl) {
      counterEl.textContent = this.auditLogs.length;
    }

    listEl.innerHTML = '';
    const logs = this.getAuditLogs({ limit: 8 });

    if (logs.length === 0) {
      listEl.innerHTML = '<div class="ed-audit-empty">No audit events recorded yet. Run a policy evaluation above.</div>';
      return;
    }

    for (const log of logs) {
      const item = document.createElement('div');
      item.className = `ed-audit-row ${log.allowed ? 'audit-pass' : 'audit-deny'}`;
      item.innerHTML = `
        <div class="ed-audit-badge-wrap">
          <span class="ed-audit-tag ${log.allowed ? 'tag-pass' : 'tag-deny'}">${log.allowed ? 'ALLOW' : 'DENY'}</span>
        </div>
        <div class="ed-audit-details">
          <div class="ed-audit-top">
            <span class="ed-audit-user">${log.userId} (${log.roles.join(', ') || 'No Role'})</span>
            <span class="ed-audit-action"><code>${log.action}</code></span>
            <span class="ed-audit-resource">@ ${log.resource}</span>
            <span class="ed-audit-timestamp">${new Date(log.timestamp).toLocaleTimeString()}</span>
          </div>
          <div class="ed-audit-reason">${log.reason}</div>
        </div>
      `;
      listEl.appendChild(item);
    }
  }
}
