/**
 * AI Voice Studio - Role-Based Access Control (RBAC) Permission Matrix & Policy Guard
 * Manages roles, hierarchical inheritance, granular permissions, dynamic ABAC policies, and audit logging.
 */

export const DEFAULT_PERMISSIONS = [
  'voice:synthesize',
  'voice:clone',
  'voice:preview',
  'audio:record',
  'audio:edit',
  'audio:export',
  'project:create',
  'project:delete',
  'settings:manage',
  'analytics:view',
  'users:manage',
  'audit:read'
];

export const DEFAULT_ROLES = {
  'Admin': {
    description: 'Full administrative access across all studio workspaces and system settings',
    permissions: ['*'],
    inherits: []
  },
  'Producer': {
    description: 'Directs audio production, voice synthesis, editing, exports, and project pipelines',
    permissions: [
      'voice:synthesize',
      'voice:clone',
      'audio:record',
      'audio:edit',
      'audio:export',
      'project:create',
      'analytics:view',
      'audit:read'
    ],
    inherits: ['Voice Talent']
  },
  'Voice Talent': {
    description: 'Records source takes, previews voice generation, and accesses assigned scripts',
    permissions: [
      'voice:synthesize',
      'voice:preview',
      'audio:record',
      'audio:edit'
    ],
    inherits: ['Guest']
  },
  'Guest': {
    description: 'Read-only observer with sample listening and demo preview capabilities',
    permissions: [
      'voice:preview'
    ],
    inherits: []
  }
};

export class AiVoiceStudioRbacMatrix {
  constructor(options = {}) {
    this.roles = new Map();
    this.userRoles = new Map();
    this.policies = new Map();
    this.auditLog = [];
    this.maxAuditEntries = options.maxAuditEntries || 300;
    this.storageKey = options.storageKey || 'ai_voice_studio_rbac_matrix_v1';

    if (options.seedDefaults !== false) {
      this.initDefaultRoles();
      this.initDefaultPolicies();
    }

    if (options.seedDemoUsers) {
      this.assignRole('alex_admin', 'Admin');
      this.assignRole('sarah_producer', 'Producer');
      this.assignRole('elena_talent', 'Voice Talent');
      this.assignRole('marcus_guest', 'Guest');
    }
  }

  initDefaultRoles() {
    for (const [roleName, config] of Object.entries(DEFAULT_ROLES)) {
      this.defineRole(roleName, config.permissions, {
        inherits: config.inherits,
        description: config.description,
        silent: true
      });
    }
  }

  initDefaultPolicies() {
    // Ownership guard: Non-admins cannot delete or modify resources owned by someone else
    this.addPolicy('resourceOwnership', (ctx, rbac) => {
      if (ctx.resource && ctx.resource.owner && ctx.action) {
        const isDestructive = ctx.action.includes('delete') || ctx.action.includes('edit');
        if (isDestructive) {
          const userRoles = rbac.getUserRoles(ctx.user);
          const isAdmin = userRoles.includes('Admin') || rbac.can(ctx.user, '*');
          const isOwner = ctx.resource.owner === ctx.user;
          if (!isOwner && !isAdmin) {
            return {
              allowed: false,
              reason: `Policy Violation: Resource owned by '${ctx.resource.owner}' cannot be modified by '${ctx.user}'`
            };
          }
        }
      }
      return true;
    });

    // Production environment guard: Project deletion in production requires Admin role
    this.addPolicy('productionGuard', (ctx, rbac) => {
      if (ctx.environment === 'production' && ctx.action === 'project:delete') {
        const userRoles = rbac.getUserRoles(ctx.user);
        if (!userRoles.includes('Admin')) {
          return {
            allowed: false,
            reason: `Policy Violation: Deleting projects in production requires explicit Admin privileges`
          };
        }
      }
      return true;
    });

    // Confidentiality guard: Resources flagged confidential require security clearance or Admin
    this.addPolicy('confidentialityGuard', (ctx, rbac) => {
      if (ctx.resource && ctx.resource.confidential === true) {
        const userRoles = rbac.getUserRoles(ctx.user);
        const isCleared = ctx.userCleared === true || userRoles.includes('Admin');
        if (!isCleared) {
          return {
            allowed: false,
            reason: `Policy Violation: Access to confidential studio resource denied without security clearance`
          };
        }
      }
      return true;
    });
  }

  /**
   * Defines or updates a role with specific permissions and inherited parent roles.
   * @param {string} name 
   * @param {Array<string>|Set<string>} permissions 
   * @param {Object} options 
   */
  defineRole(name, permissions = [], options = {}) {
    if (!name || typeof name !== 'string') {
      throw new Error('Role name must be a non-empty string');
    }

    const permsSet = new Set(Array.isArray(permissions) ? permissions : (permissions ? Array.from(permissions) : []));
    const inheritsArr = Array.isArray(options.inherits) 
      ? options.inherits 
      : (options.inherits ? [options.inherits] : []);

    const roleData = {
      name,
      permissions: permsSet,
      inherits: new Set(inheritsArr),
      description: options.description || ''
    };

    this.roles.set(name, roleData);

    if (!options.silent) {
      this._logAudit('ROLE_DEFINED', {
        role: name,
        permissions: Array.from(permsSet),
        inherits: Array.from(roleData.inherits)
      });
    }

    return roleData;
  }

  getRole(name) {
    return this.roles.get(name) || null;
  }

  getRoles() {
    return Array.from(this.roles.values()).map(r => ({
      name: r.name,
      permissions: Array.from(r.permissions),
      inherits: Array.from(r.inherits),
      description: r.description
    }));
  }

  hasRole(name) {
    return this.roles.has(name);
  }

  removeRole(name) {
    if (!this.roles.has(name)) return false;

    this.roles.delete(name);

    // Clean up role from all users
    for (const [user, roles] of this.userRoles.entries()) {
      if (roles.has(name)) {
        roles.delete(name);
      }
    }

    this._logAudit('ROLE_REMOVED', { role: name });
    return true;
  }

  /**
   * Assigns a role to a user.
   * @param {string|Object} user 
   * @param {string} role 
   */
  assignRole(user, role) {
    const userId = this._resolveUserId(user);
    if (!userId) {
      throw new Error('Invalid user identifier');
    }

    if (!this.roles.has(role)) {
      throw new Error(`Role "${role}" does not exist`);
    }

    if (!this.userRoles.has(userId)) {
      this.userRoles.set(userId, new Set());
    }

    this.userRoles.get(userId).add(role);

    this._logAudit('ROLE_ASSIGNED', {
      user: userId,
      role
    });

    return true;
  }

  revokeRole(user, role) {
    const userId = this._resolveUserId(user);
    if (!userId || !this.userRoles.has(userId)) return false;

    const roles = this.userRoles.get(userId);
    const deleted = roles.delete(role);

    if (deleted) {
      this._logAudit('ROLE_REVOKED', {
        user: userId,
        role
      });
    }

    return deleted;
  }

  getUserRoles(user) {
    const userId = this._resolveUserId(user);
    if (!userId || !this.userRoles.has(userId)) return [];
    return Array.from(this.userRoles.get(userId));
  }

  /**
   * Recursively computes all permissions for a role, resolving inheritance.
   * Protects against cycles using visited set.
   * @param {string} roleName 
   * @param {Set<string>} visited 
   * @returns {Set<string>}
   */
  getRolePermissions(roleName, visited = new Set()) {
    const permissions = new Set();
    if (!roleName || visited.has(roleName)) return permissions;

    visited.add(roleName);
    const role = this.roles.get(roleName);
    if (!role) return permissions;

    // Direct permissions
    for (const perm of role.permissions) {
      permissions.add(perm);
    }

    // Inherited permissions
    for (const parentRole of role.inherits) {
      const parentPerms = this.getRolePermissions(parentRole, visited);
      for (const p of parentPerms) {
        permissions.add(p);
      }
    }

    return permissions;
  }

  /**
   * Retrieves all permissions accumulated across all roles assigned to a user.
   * @param {string|Object} user 
   * @returns {Set<string>}
   */
  getUserPermissions(user) {
    const userId = this._resolveUserId(user);
    const allPermissions = new Set();
    const roles = this.getUserRoles(userId);

    for (const role of roles) {
      const perms = this.getRolePermissions(role);
      for (const p of perms) {
        allPermissions.add(p);
      }
    }

    return allPermissions;
  }

  /**
   * Checks whether a user has permission to perform an action.
   * Supports wildcards like '*' or 'voice:*'.
   * @param {string|Object} user 
   * @param {string} action 
   * @param {Object} context 
   * @returns {boolean}
   */
  can(user, action, context = {}) {
    const userId = this._resolveUserId(user);
    if (!userId || !action) {
      this._logAudit('ACCESS_CHECK', {
        user: userId || 'anonymous',
        action: action || 'unknown',
        decision: 'DENIED',
        granted: false,
        reason: 'Missing user or action parameter'
      });
      return false;
    }

    const perms = this.getUserPermissions(userId);
    let granted = false;

    if (perms.has('*')) {
      granted = true;
    } else if (perms.has(action)) {
      granted = true;
    } else {
      // Check prefix / domain wildcards (e.g. "voice:*" matches "voice:synthesize")
      for (const p of perms) {
        if (p.endsWith(':*')) {
          const prefix = p.slice(0, -1); // e.g. "voice:"
          if (action.startsWith(prefix)) {
            granted = true;
            break;
          }
        }
      }
    }

    if (!context.silent) {
      this._logAudit('ACCESS_CHECK', {
        user: userId,
        action,
        decision: granted ? 'GRANTED' : 'DENIED',
        granted,
        reason: granted ? 'Authorized by RBAC policy' : 'Lacks required permission'
      });
    }

    return granted;
  }

  /**
   * Registers a custom policy guard callback.
   * @param {string} name 
   * @param {Function} ruleFn 
   */
  addPolicy(name, ruleFn) {
    if (typeof ruleFn !== 'function') {
      throw new Error('Policy rule must be a function');
    }
    this.policies.set(name, ruleFn);
  }

  removePolicy(name) {
    return this.policies.delete(name);
  }

  /**
   * Evaluates dynamic policy rules combining RBAC permissions and ABAC context constraints.
   * @param {Object} context 
   * @returns {{ allowed: boolean, decision: string, reason: string, user: string, action: string, timestamp: number }}
   */
  evaluatePolicy(context = {}) {
    const timestamp = Date.now();
    const user = context.user ? this._resolveUserId(context.user) : null;
    const action = context.action;

    // Validate action
    if (!action) {
      const decision = {
        allowed: false,
        decision: 'DENIED',
        reason: 'Policy evaluation failed: No action specified',
        user: user || 'anonymous',
        action: '',
        timestamp
      };
      this._logAudit('POLICY_EVALUATION', decision);
      return decision;
    }

    // 1. RBAC Core Check
    if (user) {
      const isPermitted = this.can(user, action, { silent: true });
      if (!isPermitted) {
        const decision = {
          allowed: false,
          decision: 'DENIED',
          reason: `Unauthorized: User '${user}' lacks permission '${action}'`,
          user,
          action,
          timestamp
        };
        this._logAudit('POLICY_EVALUATION', decision);
        return decision;
      }
    } else if (context.role) {
      const perms = this.getRolePermissions(context.role);
      const isPermitted = perms.has('*') || perms.has(action) || Array.from(perms).some(p => p.endsWith(':*') && action.startsWith(p.slice(0, -1)));
      if (!isPermitted) {
        const decision = {
          allowed: false,
          decision: 'DENIED',
          reason: `Unauthorized: Role '${context.role}' lacks permission '${action}'`,
          role: context.role,
          action,
          timestamp
        };
        this._logAudit('POLICY_EVALUATION', decision);
        return decision;
      }
    } else {
      const decision = {
        allowed: false,
        decision: 'DENIED',
        reason: 'Unauthorized: No user or role provided in policy context',
        action,
        timestamp
      };
      this._logAudit('POLICY_EVALUATION', decision);
      return decision;
    }

    // 2. Custom Condition Callback inside context
    if (typeof context.condition === 'function') {
      const condResult = context.condition(context, this);
      if (condResult === false || (typeof condResult === 'object' && condResult && condResult.allowed === false)) {
        const reason = (typeof condResult === 'object' && condResult.reason) || context.conditionReason || 'Context condition check returned false';
        const decision = {
          allowed: false,
          decision: 'DENIED',
          reason,
          user: user || context.role,
          action,
          timestamp
        };
        this._logAudit('POLICY_EVALUATION', decision);
        return decision;
      }
    }

    // 3. Registered Policy Guard Rules
    for (const [policyName, policyFn] of this.policies.entries()) {
      try {
        const policyRes = policyFn(context, this);
        if (policyRes === false) {
          const decision = {
            allowed: false,
            decision: 'DENIED',
            reason: `Violated policy guard rule '${policyName}'`,
            user: user || context.role,
            action,
            policyName,
            timestamp
          };
          this._logAudit('POLICY_EVALUATION', decision);
          return decision;
        } else if (typeof policyRes === 'object' && policyRes && policyRes.allowed === false) {
          const decision = {
            allowed: false,
            decision: 'DENIED',
            reason: policyRes.reason || `Violated policy guard rule '${policyName}'`,
            user: user || context.role,
            action,
            policyName,
            timestamp
          };
          this._logAudit('POLICY_EVALUATION', decision);
          return decision;
        }
      } catch (err) {
        const decision = {
          allowed: false,
          decision: 'DENIED',
          reason: `Policy execution error in '${policyName}': ${err.message}`,
          user: user || context.role,
          action,
          policyName,
          timestamp
        };
        this._logAudit('POLICY_EVALUATION', decision);
        return decision;
      }
    }

    // All checks passed
    const decision = {
      allowed: true,
      decision: 'GRANTED',
      reason: `Access granted for action '${action}' under policy guard rules`,
      user: user || context.role,
      action,
      timestamp
    };
    this._logAudit('POLICY_EVALUATION', decision);
    return decision;
  }

  /**
   * Modifies a specific permission for a role dynamically.
   * @param {string} roleName 
   * @param {string} permission 
   * @param {boolean} granted 
   */
  updatePermission(roleName, permission, granted) {
    const role = this.roles.get(roleName);
    if (!role) {
      throw new Error(`Role "${roleName}" does not exist`);
    }

    if (granted) {
      role.permissions.add(permission);
    } else {
      role.permissions.delete(permission);
    }

    this._logAudit('PERMISSION_MUTATED', {
      role: roleName,
      permission,
      granted
    });

    return true;
  }

  /**
   * Returns matrix representation showing direct and inherited permissions per role.
   * @param {Array<string>} permissionList 
   */
  getMatrix(permissionList = DEFAULT_PERMISSIONS) {
    const rolesList = Array.from(this.roles.keys());
    const matrix = {};

    for (const roleName of rolesList) {
      const role = this.roles.get(roleName);
      matrix[roleName] = {};

      const hasWildcard = role.permissions.has('*');

      for (const perm of permissionList) {
        const direct = role.permissions.has(perm) || hasWildcard;
        let inherited = false;
        let inheritedFrom = null;

        if (!direct) {
          for (const parent of role.inherits) {
            const parentPerms = this.getRolePermissions(parent);
            if (parentPerms.has(perm) || parentPerms.has('*')) {
              inherited = true;
              inheritedFrom = parent;
              break;
            }
          }
        }

        matrix[roleName][perm] = {
          granted: direct || inherited,
          direct,
          inherited,
          inheritedFrom
        };
      }
    }

    return {
      roles: rolesList,
      permissions: permissionList,
      matrix
    };
  }

  /**
   * Retrieves audit log records with optional filtering.
   * @param {Object} filter 
   * @returns {Array<Object>}
   */
  getAuditLog(filter = {}) {
    let result = [...this.auditLog];

    if (filter.type) {
      result = result.filter(e => e.type === filter.type);
    }
    if (filter.user) {
      result = result.filter(e => e.user === filter.user || (e.details && e.details.user === filter.user));
    }
    if (filter.action) {
      result = result.filter(e => e.action === filter.action || (e.details && e.details.action === filter.action));
    }
    if (filter.decision) {
      result = result.filter(e => e.decision === filter.decision || (e.details && e.details.decision === filter.decision));
    }
    if (typeof filter.limit === 'number' && filter.limit > 0) {
      result = result.slice(-filter.limit);
    }

    return result;
  }

  clearAuditLog() {
    this.auditLog = [];
  }

  _logAudit(type, details) {
    const entry = {
      id: 'audit_' + Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
      type,
      user: details.user || null,
      action: details.action || null,
      decision: details.decision || (details.granted ? 'GRANTED' : (details.granted === false ? 'DENIED' : null)),
      details
    };

    this.auditLog.push(entry);

    if (this.auditLog.length > this.maxAuditEntries) {
      this.auditLog.shift();
    }

    return entry;
  }

  _resolveUserId(user) {
    if (!user) return '';
    if (typeof user === 'string') return user.trim();
    if (typeof user === 'object') {
      return (user.id || user.username || user.name || '').trim();
    }
    return String(user).trim();
  }
}

// -------------------------------------------------------------
// Interactive UI Controller (Browser Environment Only)
// -------------------------------------------------------------
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const rbac = new AiVoiceStudioRbacMatrix({
      seedDefaults: true,
      seedDemoUsers: true
    });

    let currentSelectedRole = 'Admin';
    let permissionsList = [...DEFAULT_PERMISSIONS];

    const roleSelector = document.getElementById('roleSelector');
    const userSelect = document.getElementById('userSelect');
    const roleAssignSelect = document.getElementById('roleAssignSelect');
    const assignRoleBtn = document.getElementById('assignRoleBtn');
    const userRoleBadges = document.getElementById('userRoleBadges');
    const matrixTableBody = document.getElementById('matrixTableBody');
    const matrixTableHeader = document.getElementById('matrixTableHeader');
    const auditStream = document.getElementById('auditStream');
    const clearAuditBtn = document.getElementById('clearAuditBtn');
    const exportAuditBtn = document.getElementById('exportAuditBtn');
    const auditFilterSelect = document.getElementById('auditFilterSelect');
    const roleStatsOverview = document.getElementById('roleStatsOverview');

    // Policy Tester Elements
    const testUserSelect = document.getElementById('testUserSelect');
    const testActionSelect = document.getElementById('testActionSelect');
    const testResourceOwner = document.getElementById('testResourceOwner');
    const testEnvironment = document.getElementById('testEnvironment');
    const testConfidential = document.getElementById('testConfidential');
    const testEvaluateBtn = document.getElementById('testEvaluateBtn');
    const policyResultBox = document.getElementById('policyResultBox');
    const policyStatusIndicator = document.getElementById('policyStatusIndicator');
    const policyReasonText = document.getElementById('policyReasonText');

    function populateRoleSelectors() {
      const roles = rbac.getRoles();

      if (roleSelector) {
        roleSelector.innerHTML = '';
        roles.forEach(r => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = `role-tab ${r.name === currentSelectedRole ? 'active' : ''}`;
          btn.textContent = r.name;
          btn.addEventListener('click', () => {
            currentSelectedRole = r.name;
            populateRoleSelectors();
            renderRoleDetails();
          });
          roleSelector.appendChild(btn);
        });
      }

      if (roleAssignSelect) {
        roleAssignSelect.innerHTML = '';
        roles.forEach(r => {
          const opt = document.createElement('option');
          opt.value = r.name;
          opt.textContent = r.name;
          roleAssignSelect.appendChild(opt);
        });
      }
    }

    function renderRoleDetails() {
      if (!roleStatsOverview) return;
      const role = rbac.getRole(currentSelectedRole);
      if (!role) return;

      const perms = rbac.getRolePermissions(currentSelectedRole);
      const inherits = Array.from(role.inherits);

      roleStatsOverview.innerHTML = `
        <div class="role-stat-card">
          <div class="role-title-row">
            <h3 class="role-name">${role.name}</h3>
            <span class="badge ${role.name === 'Admin' ? 'badge-admin' : 'badge-role'}">${perms.size} Permissions</span>
          </div>
          <p class="role-desc">${role.description || 'Custom studio role'}</p>
          <div class="role-inheritance">
            <span class="label">Inherits:</span>
            ${inherits.length > 0 
              ? inherits.map(i => `<span class="chip-inherit">â†ª ${i}</span>`).join(' ') 
              : '<span class="text-muted">None (Base Role)</span>'}
          </div>
        </div>
      `;
    }

    function renderUserRoles() {
      if (!userSelect || !userRoleBadges) return;
      const user = userSelect.value;
      const roles = rbac.getUserRoles(user);
      userRoleBadges.innerHTML = '';

      if (roles.length === 0) {
        userRoleBadges.innerHTML = '<span class="text-muted">No roles assigned</span>';
        return;
      }

      roles.forEach(roleName => {
        const badge = document.createElement('span');
        badge.className = 'user-badge';
        badge.innerHTML = `${roleName} <button type="button" class="btn-remove-role" title="Revoke ${roleName}">&times;</button>`;
        badge.querySelector('.btn-remove-role').addEventListener('click', () => {
          rbac.revokeRole(user, roleName);
          renderUserRoles();
          renderMatrix();
          renderAuditStream();
        });
        userRoleBadges.appendChild(badge);
      });
    }

    function renderMatrix() {
      if (!matrixTableBody || !matrixTableHeader) return;

      const matrixData = rbac.getMatrix(permissionsList);
      const roles = matrixData.roles;

      // Render Header
      matrixTableHeader.innerHTML = `
        <tr>
          <th class="col-permission">Action / Permission</th>
          ${roles.map(r => `<th class="col-role ${r === currentSelectedRole ? 'col-highlight' : ''}">${r}</th>`).join('')}
        </tr>
      `;

      // Render Rows
      matrixTableBody.innerHTML = '';
      permissionsList.forEach(perm => {
        const tr = document.createElement('tr');
        
        // Permission cell
        const permTd = document.createElement('td');
        permTd.className = 'cell-permission';
        const parts = perm.split(':');
        permTd.innerHTML = `<span class="perm-domain">${parts[0]}</span><span class="perm-sep">:</span><span class="perm-action">${parts[1] || '*'}</span>`;
        tr.appendChild(permTd);

        // Role checkbox cells
        roles.forEach(roleName => {
          const td = document.createElement('td');
          td.className = `cell-check ${roleName === currentSelectedRole ? 'cell-highlight' : ''}`;
          
          const cellData = matrixData.matrix[roleName][perm];
          const isDirect = cellData.direct;
          const isInherited = cellData.inherited;
          const isGranted = cellData.granted;

          const label = document.createElement('label');
          label.className = `switch-label ${isInherited ? 'switch-inherited' : ''}`;

          const input = document.createElement('input');
          input.type = 'checkbox';
          input.checked = isGranted;
          input.disabled = isInherited; // Inherited permissions are read-only from parent

          if (isInherited) {
            label.title = `Inherited from ${cellData.inheritedFrom}`;
          }

          input.addEventListener('change', () => {
            rbac.updatePermission(roleName, perm, input.checked);
            renderMatrix();
            renderRoleDetails();
            renderAuditStream();
          });

          const span = document.createElement('span');
          span.className = 'switch-indicator';

          label.appendChild(input);
          label.appendChild(span);

          if (isInherited) {
            const inhBadge = document.createElement('span');
            inhBadge.className = 'inh-badge';
            inhBadge.textContent = 'INH';
            inhBadge.title = `Inherited via ${cellData.inheritedFrom}`;
            label.appendChild(inhBadge);
          }

          td.appendChild(label);
          tr.appendChild(td);
        });

        matrixTableBody.appendChild(tr);
      });
    }

    function renderAuditStream() {
      if (!auditStream) return;
      const filterType = auditFilterSelect ? auditFilterSelect.value : '';
      const logs = rbac.getAuditLog(filterType ? { type: filterType } : {}).slice(-40).reverse();

      auditStream.innerHTML = '';
      if (logs.length === 0) {
        auditStream.innerHTML = '<div class="audit-empty">No audit records logged yet</div>';
        return;
      }

      logs.forEach(log => {
        const item = document.createElement('div');
        item.className = `audit-entry audit-${(log.decision || 'info').toLowerCase()}`;

        const timeStr = new Date(log.timestamp).toLocaleTimeString();
        const badgeClass = log.decision === 'GRANTED' ? 'badge-granted' : (log.decision === 'DENIED' ? 'badge-denied' : 'badge-neutral');

        item.innerHTML = `
          <div class="audit-row-top">
            <span class="audit-time">${timeStr}</span>
            <span class="audit-type">${log.type}</span>
            ${log.decision ? `<span class="audit-decision ${badgeClass}">${log.decision}</span>` : ''}
          </div>
          <div class="audit-desc">
            ${log.user ? `<span class="audit-user">@${log.user}</span> ` : ''}
            ${log.action ? `<span class="audit-action">${log.action}</span> ` : ''}
            <span class="audit-reason">${log.details.reason || JSON.stringify(log.details)}</span>
          </div>
        `;

        auditStream.appendChild(item);
      });
    }

    function runPolicyTester() {
      if (!testUserSelect || !testActionSelect) return;

      const user = testUserSelect.value;
      const action = testActionSelect.value;
      const owner = testResourceOwner ? testResourceOwner.value.trim() : '';
      const environment = testEnvironment ? testEnvironment.value : 'development';
      const confidential = testConfidential ? testConfidential.checked : false;

      const context = {
        user,
        action,
        environment,
        resource: {
          owner: owner || user,
          confidential
        }
      };

      const result = rbac.evaluatePolicy(context);

      if (policyResultBox && policyStatusIndicator && policyReasonText) {
        policyResultBox.className = `policy-result-card ${result.allowed ? 'result-granted' : 'result-denied'}`;
        policyStatusIndicator.textContent = result.allowed ? '✓ ACCESS GRANTED' : '✕ ACCESS DENIED';
        policyReasonText.textContent = result.reason;
      }

      renderAuditStream();
    }

    // Event Listeners
    if (assignRoleBtn && userSelect && roleAssignSelect) {
      assignRoleBtn.addEventListener('click', () => {
        const user = userSelect.value;
        const role = roleAssignSelect.value;
        try {
          rbac.assignRole(user, role);
          renderUserRoles();
          renderMatrix();
          renderAuditStream();
        } catch (e) {
          alert(e.message);
        }
      });
    }

    if (userSelect) {
      userSelect.addEventListener('change', renderUserRoles);
    }

    if (testEvaluateBtn) {
      testEvaluateBtn.addEventListener('click', runPolicyTester);
    }

    if (clearAuditBtn) {
      clearAuditBtn.addEventListener('click', () => {
        rbac.clearAuditLog();
        renderAuditStream();
      });
    }

    if (exportAuditBtn) {
      exportAuditBtn.addEventListener('click', () => {
        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(rbac.getAuditLog(), null, 2));
        const a = document.createElement('a');
        a.href = dataStr;
        a.download = `rbac-audit-log-${Date.now()}.json`;
        a.click();
      });
    }

    if (auditFilterSelect) {
      auditFilterSelect.addEventListener('change', renderAuditStream);
    }

    // Initial render
    populateRoleSelectors();
    renderRoleDetails();
    renderUserRoles();
    renderMatrix();
    renderAuditStream();
    runPolicyTester();
  });
}
