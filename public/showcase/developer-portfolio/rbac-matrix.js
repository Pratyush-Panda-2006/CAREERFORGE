/**
 * Developer Portfolio - Role-Based Access Control (RBAC) Permission Matrix & Policy Guard
 * Architecture: Bitmask permissions with role inheritance hierarchy and dynamic ABAC policy guards.
 */

export const PERMISSIONS = Object.freeze({
  READ_PROJECTS: 1 << 0,   // 1
  SUBMIT_CONTACT: 1 << 1,  // 2
  COMMENT_BLOG: 1 << 2,    // 4
  EDIT_PROJECTS: 1 << 3,   // 8
  MANAGE_ARTICLES: 1 << 4, // 16
  VIEW_ANALYTICS: 1 << 5,  // 32
  MANAGE_SETTINGS: 1 << 6, // 64
  ADMIN_ALL: 1 << 7        // 128
});

export const ALL_PERMISSIONS_MASK = (1 << 8) - 1; // 255

export const ROLES = Object.freeze({
  Viewer: 'Viewer',
  Contributor: 'Contributor',
  Editor: 'Editor',
  Admin: 'Admin',
  Owner: 'Owner'
});

export const ROLE_HIERARCHY = Object.freeze({
  Viewer: {
    name: 'Viewer',
    parents: [],
    directPermissions: [PERMISSIONS.READ_PROJECTS, PERMISSIONS.SUBMIT_CONTACT],
    description: 'Read-only visitor with contact submission ability'
  },
  Contributor: {
    name: 'Contributor',
    parents: ['Viewer'],
    directPermissions: [PERMISSIONS.COMMENT_BLOG],
    description: 'Community member who can comment on blog posts'
  },
  Editor: {
    name: 'Editor',
    parents: ['Contributor'],
    directPermissions: [PERMISSIONS.EDIT_PROJECTS, PERMISSIONS.MANAGE_ARTICLES],
    description: 'Content editor managing portfolio projects and technical articles'
  },
  Admin: {
    name: 'Admin',
    parents: ['Editor'],
    directPermissions: [PERMISSIONS.VIEW_ANALYTICS, PERMISSIONS.MANAGE_SETTINGS],
    description: 'Portfolio administrator with analytics access and configuration management'
  },
  Owner: {
    name: 'Owner',
    parents: ['Admin'],
    directPermissions: [PERMISSIONS.ADMIN_ALL],
    description: 'Root system owner with unrestricted access'
  }
});

export const ACTION_ALIASES = Object.freeze({
  // Direct permission names
  'read_projects': PERMISSIONS.READ_PROJECTS,
  'read_project': PERMISSIONS.READ_PROJECTS,
  'projects:read': PERMISSIONS.READ_PROJECTS,
  'projects:view': PERMISSIONS.READ_PROJECTS,

  'submit_contact': PERMISSIONS.SUBMIT_CONTACT,
  'contact:submit': PERMISSIONS.SUBMIT_CONTACT,
  'contact:send': PERMISSIONS.SUBMIT_CONTACT,

  'comment_blog': PERMISSIONS.COMMENT_BLOG,
  'blog:comment': PERMISSIONS.COMMENT_BLOG,
  'comment:post': PERMISSIONS.COMMENT_BLOG,

  'edit_projects': PERMISSIONS.EDIT_PROJECTS,
  'edit_project': PERMISSIONS.EDIT_PROJECTS,
  'projects:edit': PERMISSIONS.EDIT_PROJECTS,
  'projects:write': PERMISSIONS.EDIT_PROJECTS,
  'projects:delete': PERMISSIONS.EDIT_PROJECTS,

  'manage_articles': PERMISSIONS.MANAGE_ARTICLES,
  'articles:manage': PERMISSIONS.MANAGE_ARTICLES,
  'articles:write': PERMISSIONS.MANAGE_ARTICLES,
  'articles:publish': PERMISSIONS.MANAGE_ARTICLES,

  'view_analytics': PERMISSIONS.VIEW_ANALYTICS,
  'analytics:view': PERMISSIONS.VIEW_ANALYTICS,
  'analytics:read': PERMISSIONS.VIEW_ANALYTICS,

  'manage_settings': PERMISSIONS.MANAGE_SETTINGS,
  'settings:manage': PERMISSIONS.MANAGE_SETTINGS,
  'settings:write': PERMISSIONS.MANAGE_SETTINGS,
  'settings:update': PERMISSIONS.MANAGE_SETTINGS,

  'admin_all': PERMISSIONS.ADMIN_ALL,
  'admin:*': PERMISSIONS.ADMIN_ALL,
  'admin:all': PERMISSIONS.ADMIN_ALL,
  '*': PERMISSIONS.ADMIN_ALL
});

/**
 * DeveloperPortfolioRbacEngine
 * Core RBAC + ABAC policy evaluation engine for Developer Portfolio.
 */
export class DeveloperPortfolioRbacEngine {
  #ipAllowlist;
  #auditLog;
  #users;
  #roles;
  #roleMasks;
  #maxAuditEntries;

  constructor(options = {}) {
    this.#maxAuditEntries = options.maxAuditEntries || 200;
    this.#ipAllowlist = new Set(options.ipAllowlist || [
      '127.0.0.1',
      '::1',
      '192.168.1.1',
      '192.168.1.100',
      '10.0.0.1'
    ]);

    this.#auditLog = [];
    this.#users = new Map();
    this.#roles = { ...ROLE_HIERARCHY };
    this.#roleMasks = this.#resolveRoleMasks();

    // Seed default demo users
    this.assignRole('user-viewer', ROLES.Viewer);
    this.assignRole('user-contributor', ROLES.Contributor);
    this.assignRole('user-editor', ROLES.Editor);
    this.assignRole('user-admin', ROLES.Admin);
    this.assignRole('user-owner', ROLES.Owner);

    // Initial user settings
    this.#users.get('user-viewer').emailVerified = true;
    this.#users.get('user-contributor').emailVerified = true;
    this.#users.get('user-editor').emailVerified = true;
    this.#users.get('user-admin').emailVerified = true;
    this.#users.get('user-admin').ip = '127.0.0.1';
    this.#users.get('user-owner').emailVerified = true;
    this.#users.get('user-owner').ip = '127.0.0.1';
  }

  #resolveRoleMasks() {
    const masks = new Map();
    const resolve = (roleName, visiting = new Set()) => {
      if (visiting.has(roleName)) throw new Error('Role inheritance cycle detected: ' + roleName);
      if (masks.has(roleName)) return masks.get(roleName);
      visiting.add(roleName);

      const roleDef = this.#roles[roleName];
      if (!roleDef) throw new TypeError('Unknown role: ' + roleName);

      let mask = 0;
      for (const perm of roleDef.directPermissions) {
        mask |= perm;
      }
      for (const parent of roleDef.parents) {
        mask |= resolve(parent, visiting);
      }
      visiting.delete(roleName);
      masks.set(roleName, mask);
      return mask;
    };

    for (const roleName of Object.keys(this.#roles)) {
      resolve(roleName);
    }
    return masks;
  }

  normalizeRoleName(role) {
    if (typeof role !== 'string') return null;
    const clean = role.trim().toLowerCase();
    for (const canonical of Object.values(ROLES)) {
      if (canonical.toLowerCase() === clean) return canonical;
    }
    return null;
  }

  isValidRole(role) {
    return this.normalizeRoleName(role) !== null;
  }

  #resolveAction(action) {
    if (typeof action === 'number' && Number.isInteger(action) && action > 0 && action <= ALL_PERMISSIONS_MASK) {
      // Find matching action name if possible
      let matchedName = `MASK_${action}`;
      for (const [key, val] of Object.entries(PERMISSIONS)) {
        if (val === action) {
          matchedName = key;
          break;
        }
      }
      const isAdminAction = (action & (PERMISSIONS.MANAGE_SETTINGS | PERMISSIONS.ADMIN_ALL)) !== 0;
      return { requiredMask: action, actionName: matchedName, isAdminAction };
    }

    if (typeof action !== 'string' || !action.trim()) return null;
    const clean = action.trim();
    const cleanLower = clean.toLowerCase();

    // Check direct match in PERMISSIONS
    if (Object.prototype.hasOwnProperty.call(PERMISSIONS, clean)) {
      const mask = PERMISSIONS[clean];
      const isAdminAction = (mask & (PERMISSIONS.MANAGE_SETTINGS | PERMISSIONS.ADMIN_ALL)) !== 0;
      return { requiredMask: mask, actionName: clean, isAdminAction };
    }

    // Check action aliases
    if (Object.prototype.hasOwnProperty.call(ACTION_ALIASES, cleanLower)) {
      const mask = ACTION_ALIASES[cleanLower];
      const isAdminAction = (mask & (PERMISSIONS.MANAGE_SETTINGS | PERMISSIONS.ADMIN_ALL)) !== 0;
      return { requiredMask: mask, actionName: clean, isAdminAction };
    }

    // Wildcard namespaces (e.g., "projects:*", "articles:*")
    if (cleanLower === 'projects:*') {
      return {
        requiredMask: PERMISSIONS.READ_PROJECTS | PERMISSIONS.EDIT_PROJECTS,
        actionName: 'projects:*',
        isAdminAction: false
      };
    }

    if (cleanLower === 'articles:*') {
      return {
        requiredMask: PERMISSIONS.MANAGE_ARTICLES,
        actionName: 'articles:*',
        isAdminAction: false
      };
    }

    if (cleanLower === 'contact:*') {
      return {
        requiredMask: PERMISSIONS.SUBMIT_CONTACT,
        actionName: 'contact:*',
        isAdminAction: false
      };
    }

    if (cleanLower === 'blog:*') {
      return {
        requiredMask: PERMISSIONS.COMMENT_BLOG,
        actionName: 'blog:*',
        isAdminAction: false
      };
    }

    if (cleanLower === 'analytics:*') {
      return {
        requiredMask: PERMISSIONS.VIEW_ANALYTICS,
        actionName: 'analytics:*',
        isAdminAction: false
      };
    }

    if (cleanLower === 'settings:*') {
      return {
        requiredMask: PERMISSIONS.MANAGE_SETTINGS,
        actionName: 'settings:*',
        isAdminAction: true
      };
    }

    return null;
  }

  #logAudit({ userId, role, action, granted, reason, abacApplied = null, ip = '127.0.0.1', context = {} }) {
    const entry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      timeIso: new Date().toISOString(),
      userId: userId || 'anonymous',
      role: role || 'unknown',
      action: action || 'unspecified',
      granted: Boolean(granted),
      reason: String(reason),
      abacApplied: abacApplied || null,
      ip: ip || '127.0.0.1',
      context: { ...context }
    };

    this.#auditLog.unshift(entry);
    if (this.#auditLog.length > this.#maxAuditEntries) {
      this.#auditLog.pop();
    }
    return entry;
  }

  /**
   * Assigns a canonical role to a user.
   * @param {string|object} user User identifier or object
   * @param {string} role Target role (Viewer, Contributor, Editor, Admin, Owner)
   * @returns {object} Updated user record
   */
  assignRole(user, role) {
    const normalizedRole = this.normalizeRoleName(role);
    if (!normalizedRole) {
      throw new TypeError(`Invalid role: '${role}'. Must be one of: ${Object.values(ROLES).join(', ')}`);
    }

    let userId;
    let userObj;

    if (typeof user === 'string') {
      if (!user.trim()) throw new TypeError('User identifier cannot be empty.');
      userId = user.trim();
      const existing = this.#users.get(userId) || {};
      userObj = { ...existing, id: userId, role: normalizedRole };
    } else if (typeof user === 'object' && user !== null) {
      if (!user.id || typeof user.id !== 'string' || !user.id.trim()) {
        throw new TypeError('User object must contain a valid string id.');
      }
      userId = user.id.trim();
      userObj = { ...user, id: userId, role: normalizedRole };
    } else {
      throw new TypeError('User must be a non-empty string or object with an id.');
    }

    this.#users.set(userId, userObj);

    this.#logAudit({
      userId,
      role: normalizedRole,
      action: 'ASSIGN_ROLE',
      granted: true,
      reason: `Assigned role '${normalizedRole}' to user '${userId}'`,
      ip: userObj.ip || '127.0.0.1',
      context: { assignedRole: normalizedRole }
    });

    return { ...userObj };
  }

  /**
   * Retrieves the permission bitmask for a role including inherited grants.
   * @param {string} role Role name
   * @returns {number} Combined bitmask integer
   */
  getPermissionsForRole(role) {
    if (typeof role !== 'string') return 0;
    const canonical = this.normalizeRoleName(role);
    if (!canonical || !this.#roleMasks.has(canonical)) return 0;
    return this.#roleMasks.get(canonical);
  }

  /**
   * Evaluates if a role possesses all bits of a policy mask.
   * @param {number} mask Target bitmask (0-255)
   * @param {string} role Role to evaluate (defaults to 'Viewer')
   * @returns {boolean} True if all requested bits are granted
   */
  evaluatePolicyBitmask(mask, role = ROLES.Viewer) {
    if (typeof mask !== 'number' || !Number.isInteger(mask) || mask < 0 || mask > ALL_PERMISSIONS_MASK) {
      throw new TypeError(`Mask must be an integer from 0 to ${ALL_PERMISSIONS_MASK}.`);
    }
    const roleMask = this.getPermissionsForRole(role);
    if (roleMask === 0 && !this.isValidRole(role)) {
      return false;
    }
    return (roleMask & mask) === mask;
  }

  /**
   * Convenience check if a user has a specific permission bit.
   * @param {string|object} user User or userId
   * @param {number|string} permissionBit Permission bit or action name
   * @returns {boolean}
   */
  hasPermission(user, permissionBit) {
    return this.checkPermission(user, permissionBit);
  }

  /**
   * Evaluates an access request against RBAC bitmask and dynamic ABAC rules.
   * @param {string|object} roleOrUser Role name, user ID, or user object
   * @param {string|number} action Requested action
   * @param {object} context Dynamic context (ip, resource, rateLimited, emailVerified, etc.)
   * @returns {boolean} True if access is granted, false if denied
   */
  checkPermission(roleOrUser, action, context = {}) {
    let user;
    let role;

    if (typeof roleOrUser === 'string') {
      const trimmed = roleOrUser.trim();
      if (this.#users.has(trimmed)) {
        user = this.#users.get(trimmed);
        role = user.role;
      } else {
        const canonical = this.normalizeRoleName(trimmed);
        if (canonical) {
          role = canonical;
          user = (context.user && typeof context.user === 'object')
            ? { ...context.user, role }
            : { id: `anon-${role.toLowerCase()}`, role };
        } else {
          user = { id: trimmed, role: ROLES.Viewer };
          role = ROLES.Viewer;
        }
      }
    } else if (typeof roleOrUser === 'object' && roleOrUser !== null) {
      user = roleOrUser;
      role = this.normalizeRoleName(user.role) || ROLES.Viewer;
    } else {
      this.#logAudit({
        userId: 'invalid-subject',
        role: 'none',
        action: String(action),
        granted: false,
        reason: 'Denied: Invalid user or role specified',
        context
      });
      return false;
    }

    if (context.user && typeof context.user === 'object') {
      user = { ...user, ...context.user };
      if (context.user.role) {
        role = this.normalizeRoleName(context.user.role) || role;
      }
    }

    const resolved = this.#resolveAction(action);
    if (!resolved) {
      this.#logAudit({
        userId: user.id || 'anonymous',
        role,
        action: String(action),
        granted: false,
        reason: `Denied: Unknown or malformed action '${action}'`,
        ip: context.ip || user.ip || '127.0.0.1',
        context
      });
      return false;
    }

    const { requiredMask, actionName, isAdminAction } = resolved;
    const clientIp = context.ip || user.ip || '127.0.0.1';

    // 1. Dynamic ABAC Rule: Rate-limit state
    const isRateLimited = Boolean(context.rateLimited ?? user.rateLimited ?? false);
    if (isRateLimited) {
      this.#logAudit({
        userId: user.id,
        role,
        action: actionName,
        granted: false,
        reason: 'Denied: Active rate-limiting policy in effect',
        abacApplied: 'RATE_LIMIT',
        ip: clientIp,
        context
      });
      return false;
    }

    // 2. Dynamic ABAC Rule: Verified email requirements
    const isEmailSensitiveAction = (
      (requiredMask & (
        PERMISSIONS.SUBMIT_CONTACT |
        PERMISSIONS.COMMENT_BLOG |
        PERMISSIONS.EDIT_PROJECTS |
        PERMISSIONS.MANAGE_ARTICLES |
        PERMISSIONS.MANAGE_SETTINGS |
        PERMISSIONS.ADMIN_ALL
      )) !== 0
    ) || Boolean(context.requireVerifiedEmail);

    if (isEmailSensitiveAction) {
      const isEmailVerified = context.emailVerified !== undefined
        ? Boolean(context.emailVerified)
        : user.emailVerified !== undefined
          ? Boolean(user.emailVerified)
          : true;

      if (!isEmailVerified) {
        this.#logAudit({
          userId: user.id,
          role,
          action: actionName,
          granted: false,
          reason: 'Denied: Action requires a verified email address',
          abacApplied: 'EMAIL_VERIFIED',
          ip: clientIp,
          context
        });
        return false;
      }
    }

    // 3. Dynamic ABAC Rule: IP allowlist check for admin paths & operations
    const isAdminPath = Boolean(
      isAdminAction ||
      context.isAdminPath ||
      (context.path && (context.path.startsWith('/admin') || context.path.startsWith('/settings'))) ||
      context.requireIpAllowlist
    );

    if (isAdminPath) {
      if (!context.ip && !user.ip && context.requireIpAllowlist) {
        this.#logAudit({
          userId: user.id,
          role,
          action: actionName,
          granted: false,
          reason: 'Denied: Admin path requires client IP identification',
          abacApplied: 'IP_ALLOWLIST',
          ip: clientIp,
          context
        });
        return false;
      }

      if (!this.#ipAllowlist.has(clientIp)) {
        this.#logAudit({
          userId: user.id,
          role,
          action: actionName,
          granted: false,
          reason: `Denied: IP address '${clientIp}' is not authorized for admin operations`,
          abacApplied: 'IP_ALLOWLIST',
          ip: clientIp,
          context
        });
        return false;
      }
    }

    // 4. Dynamic ABAC Rule: Project visibility state (public vs private/draft)
    const isReadProjects = (requiredMask & PERMISSIONS.READ_PROJECTS) !== 0;
    if (isReadProjects && context.resource) {
      const isDraftOrPrivate = (
        context.resource.visibility === 'draft' ||
        context.resource.visibility === 'private' ||
        context.resource.isDraft === true
      );

      if (isDraftOrPrivate) {
        const roleMask = this.getPermissionsForRole(role);
        const hasEditorOrAdmin = (roleMask & (PERMISSIONS.EDIT_PROJECTS | PERMISSIONS.ADMIN_ALL)) !== 0;
        const isAuthor = Boolean(context.resource.authorId && user.id && context.resource.authorId === user.id);

        if (!hasEditorOrAdmin && !isAuthor) {
          this.#logAudit({
            userId: user.id,
            role,
            action: actionName,
            granted: false,
            reason: 'Denied: Draft/private projects require editor privileges or author ownership',
            abacApplied: 'PROJECT_VISIBILITY',
            ip: clientIp,
            context
          });
          return false;
        }
      }
    }

    // 5. Dynamic ABAC Rule: Maintainer ownership matching (creator can edit own portfolio items)
    const isEditProjects = (requiredMask & PERMISSIONS.EDIT_PROJECTS) !== 0;
    if (isEditProjects && context.resource) {
      const roleMask = this.getPermissionsForRole(role);
      const hasRoleEdit = (roleMask & (PERMISSIONS.EDIT_PROJECTS | PERMISSIONS.ADMIN_ALL)) !== 0;
      const isAuthor = Boolean(context.resource.authorId && user.id && context.resource.authorId === user.id);

      if (!hasRoleEdit && isAuthor) {
        this.#logAudit({
          userId: user.id,
          role,
          action: actionName,
          granted: true,
          reason: 'Granted: Maintainer ownership matches resource creator',
          abacApplied: 'MAINTAINER_OWNERSHIP',
          ip: clientIp,
          context
        });
        return true;
      }

      if (!hasRoleEdit && !isAuthor) {
        this.#logAudit({
          userId: user.id,
          role,
          action: actionName,
          granted: false,
          reason: 'Denied: User lacks project edit permission and is not the author of this resource',
          abacApplied: 'MAINTAINER_OWNERSHIP',
          ip: clientIp,
          context
        });
        return false;
      }
    }

    // 6. Base RBAC evaluation against role bitmask
    const roleMask = this.getPermissionsForRole(role);
    const isOwner = (roleMask & PERMISSIONS.ADMIN_ALL) === PERMISSIONS.ADMIN_ALL;
    const hasBits = (roleMask & requiredMask) === requiredMask;

    if (isOwner || hasBits) {
      this.#logAudit({
        userId: user.id,
        role,
        action: actionName,
        granted: true,
        reason: `Granted: Role '${role}' possesses required permission '${actionName}'`,
        abacApplied: null,
        ip: clientIp,
        context
      });
      return true;
    }

    this.#logAudit({
      userId: user.id,
      role,
      action: actionName,
      granted: false,
      reason: `Denied: Role '${role}' lacks required permission '${actionName}' (mask ${requiredMask})`,
      abacApplied: null,
      ip: clientIp,
      context
    });
    return false;
  }

  getAuditLog() {
    return [...this.#auditLog];
  }

  clearAuditLog() {
    this.#auditLog = [];
  }

  addAllowedIp(ip) {
    if (typeof ip === 'string' && ip.trim()) {
      this.#ipAllowlist.add(ip.trim());
    }
  }

  removeAllowedIp(ip) {
    if (typeof ip === 'string') {
      this.#ipAllowlist.delete(ip.trim());
    }
  }

  getIpAllowlist() {
    return Array.from(this.#ipAllowlist);
  }

  getUser(userId) {
    if (!userId || typeof userId !== 'string') return null;
    return this.#users.get(userId.trim()) || null;
  }

  getUsers() {
    return Array.from(this.#users.values()).map(u => ({ ...u }));
  }

  snapshot() {
    return {
      roles: Object.keys(this.#roles).map(name => ({
        name,
        parents: [...this.#roles[name].parents],
        directPermissions: [...this.#roles[name].directPermissions],
        mask: this.getPermissionsForRole(name),
        description: this.#roles[name].description
      })),
      users: this.getUsers(),
      ipAllowlist: this.getIpAllowlist(),
      auditCount: this.#auditLog.length
    };
  }
}

// Browser UI initialization and live console binding
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.DeveloperPortfolioRbacEngine = DeveloperPortfolioRbacEngine;
  window.PERMISSIONS = PERMISSIONS;
  window.ROLES = ROLES;

  const initConsole = () => {
    const engine = new DeveloperPortfolioRbacEngine();
    const get = id => document.getElementById(id);

    const matrixBody = get('matrix-body');
    const userSelect = get('sim-user');
    const roleSelect = get('sim-role');
    const actionSelect = get('sim-action');
    const ipInput = get('sim-ip');
    const rateLimitCheck = get('sim-ratelimit');
    const emailVerifyCheck = get('sim-emailverified');
    const visibilitySelect = get('sim-visibility');
    const authorIdInput = get('sim-authorid');
    const resultBadge = get('result-badge');
    const resultReason = get('result-reason');
    const requestedMaskSpan = get('requested-mask');
    const roleMaskSpan = get('role-mask');
    const abacRuleSpan = get('abac-rule-applied');
    const auditBody = get('audit-table-body');
    const clearAuditBtn = get('clear-audit-btn');
    const assignForm = get('assign-form');
    const maskForm = get('mask-form');
    const maskInput = get('eval-mask-input');
    const maskResult = get('mask-eval-result');

    function renderMatrix() {
      if (!matrixBody) return;
      matrixBody.innerHTML = '';

      const roles = [ROLES.Viewer, ROLES.Contributor, ROLES.Editor, ROLES.Admin, ROLES.Owner];
      const permissionsList = [
        { key: 'READ_PROJECTS', bit: PERMISSIONS.READ_PROJECTS, label: 'Read Projects (1 << 0)' },
        { key: 'SUBMIT_CONTACT', bit: PERMISSIONS.SUBMIT_CONTACT, label: 'Submit Contact (1 << 1)' },
        { key: 'COMMENT_BLOG', bit: PERMISSIONS.COMMENT_BLOG, label: 'Comment Blog (1 << 2)' },
        { key: 'EDIT_PROJECTS', bit: PERMISSIONS.EDIT_PROJECTS, label: 'Edit Projects (1 << 3)' },
        { key: 'MANAGE_ARTICLES', bit: PERMISSIONS.MANAGE_ARTICLES, label: 'Manage Articles (1 << 4)' },
        { key: 'VIEW_ANALYTICS', bit: PERMISSIONS.VIEW_ANALYTICS, label: 'View Analytics (1 << 5)' },
        { key: 'MANAGE_SETTINGS', bit: PERMISSIONS.MANAGE_SETTINGS, label: 'Manage Settings (1 << 6)' },
        { key: 'ADMIN_ALL', bit: PERMISSIONS.ADMIN_ALL, label: 'Admin All (1 << 7)' }
      ];

      permissionsList.forEach(perm => {
        const tr = document.createElement('tr');
        const th = document.createElement('th');
        th.scope = 'row';
        th.innerHTML = `<code>${perm.key}</code><span class="bit-tag">${perm.bit}</span>`;
        tr.appendChild(th);

        roles.forEach(role => {
          const td = document.createElement('td');
          const roleDef = ROLE_HIERARCHY[role];
          const hasDirect = roleDef.directPermissions.includes(perm.bit);
          const roleMask = engine.getPermissionsForRole(role);
          const hasEffective = (roleMask & perm.bit) === perm.bit || (roleMask & PERMISSIONS.ADMIN_ALL) === PERMISSIONS.ADMIN_ALL;

          const pill = document.createElement('span');
          if (hasEffective) {
            pill.className = 'perm-pill granted';
            if (hasDirect) {
              pill.textContent = 'Direct';
              pill.title = 'Directly granted to this role';
            } else if (role === ROLES.Owner) {
              pill.textContent = 'Root';
              pill.title = 'Granted via ADMIN_ALL root override';
            } else {
              pill.textContent = 'Inherited';
              pill.title = 'Inherited from lower role hierarchy';
            }
          } else {
            pill.className = 'perm-pill denied';
            pill.textContent = 'Denied';
          }
          td.appendChild(pill);
          tr.appendChild(td);
        });

        matrixBody.appendChild(tr);
      });
    }

    function renderAuditLog() {
      if (!auditBody) return;
      auditBody.innerHTML = '';
      const logs = engine.getAuditLog();

      if (logs.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="7" class="empty-state">No audit events recorded yet.</td>`;
        auditBody.appendChild(tr);
        return;
      }

      logs.slice(0, 50).forEach(log => {
        const tr = document.createElement('tr');
        const timeStr = new Date(log.timestamp).toLocaleTimeString();
        tr.innerHTML = `
          <td><code>${timeStr}</code></td>
          <td><strong>${log.userId}</strong></td>
          <td><span class="role-badge ${log.role.toLowerCase()}">${log.role}</span></td>
          <td><code>${log.action}</code></td>
          <td><span class="status-pill ${log.granted ? 'status-granted' : 'status-denied'}">${log.granted ? 'GRANTED' : 'DENIED'}</span></td>
          <td class="reason-cell">${log.reason}</td>
          <td><code>${log.ip}</code></td>
        `;
        auditBody.appendChild(tr);
      });
    }

    function evaluateCurrentSimulator() {
      if (!userSelect || !actionSelect) return;

      const userVal = userSelect.value;
      const roleVal = roleSelect.value;
      const actionVal = actionSelect.value;
      const ipVal = ipInput.value.trim() || '127.0.0.1';
      const isRateLimited = rateLimitCheck.checked;
      const isEmailVerified = emailVerifyCheck.checked;
      const visibility = visibilitySelect.value;
      const authorId = authorIdInput.value.trim();

      const userObj = {
        id: userVal,
        role: roleVal,
        ip: ipVal,
        rateLimited: isRateLimited,
        emailVerified: isEmailVerified
      };

      const context = {
        ip: ipVal,
        rateLimited: isRateLimited,
        emailVerified: isEmailVerified,
        resource: {
          id: 'portfolio-proj-01',
          visibility: visibility,
          authorId: authorId || 'dev-root'
        }
      };

      const granted = engine.checkPermission(userObj, actionVal, context);
      const logs = engine.getAuditLog();
      const latestLog = logs[0] || {};

      if (resultBadge) {
        resultBadge.textContent = granted ? 'ACCESS GRANTED' : 'ACCESS DENIED';
        resultBadge.className = `eval-badge ${granted ? 'badge-granted' : 'badge-denied'}`;
      }

      if (resultReason) {
        resultReason.textContent = latestLog.reason || (granted ? 'Permission granted by RBAC policy matrix' : 'Permission denied');
      }

      const roleMask = engine.getPermissionsForRole(roleVal);
      if (roleMaskSpan) {
        roleMaskSpan.textContent = `0b${roleMask.toString(2).padStart(8, '0')} (${roleMask})`;
      }

      if (requestedMaskSpan) {
        const resolved = PERMISSIONS[actionVal] || ACTION_ALIASES[actionVal.toLowerCase()] || 0;
        requestedMaskSpan.textContent = `0b${resolved.toString(2).padStart(8, '0')} (${resolved})`;
      }

      if (abacRuleSpan) {
        abacRuleSpan.textContent = latestLog.abacApplied || 'None (Standard RBAC)';
      }

      renderAuditLog();
    }

    // Event listeners
    [userSelect, roleSelect, actionSelect, ipInput, rateLimitCheck, emailVerifyCheck, visibilitySelect, authorIdInput].forEach(el => {
      if (el) el.addEventListener('change', evaluateCurrentSimulator);
      if (el && el.tagName === 'INPUT') el.addEventListener('input', evaluateCurrentSimulator);
    });

    if (userSelect) {
      userSelect.addEventListener('change', () => {
        const u = engine.getUser(userSelect.value);
        if (u) {
          roleSelect.value = u.role;
          if (u.ip) ipInput.value = u.ip;
          if (u.emailVerified !== undefined) emailVerifyCheck.checked = u.emailVerified;
          if (u.rateLimited !== undefined) rateLimitCheck.checked = u.rateLimited;
        }
        evaluateCurrentSimulator();
      });
    }

    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const preset = btn.getAttribute('data-preset');
        switch (preset) {
          case 'viewer-public':
            userSelect.value = 'user-viewer';
            roleSelect.value = ROLES.Viewer;
            actionSelect.value = 'READ_PROJECTS';
            ipInput.value = '127.0.0.1';
            rateLimitCheck.checked = false;
            emailVerifyCheck.checked = true;
            visibilitySelect.value = 'public';
            authorIdInput.value = 'other-author';
            break;
          case 'viewer-draft-denied':
            userSelect.value = 'user-viewer';
            roleSelect.value = ROLES.Viewer;
            actionSelect.value = 'READ_PROJECTS';
            ipInput.value = '127.0.0.1';
            rateLimitCheck.checked = false;
            emailVerifyCheck.checked = true;
            visibilitySelect.value = 'draft';
            authorIdInput.value = 'other-author';
            break;
          case 'author-draft-allowed':
            userSelect.value = 'user-viewer';
            roleSelect.value = ROLES.Viewer;
            actionSelect.value = 'READ_PROJECTS';
            ipInput.value = '127.0.0.1';
            rateLimitCheck.checked = false;
            emailVerifyCheck.checked = true;
            visibilitySelect.value = 'draft';
            authorIdInput.value = 'user-viewer';
            break;
          case 'contributor-own-edit':
            userSelect.value = 'user-contributor';
            roleSelect.value = ROLES.Contributor;
            actionSelect.value = 'EDIT_PROJECTS';
            ipInput.value = '127.0.0.1';
            rateLimitCheck.checked = false;
            emailVerifyCheck.checked = true;
            visibilitySelect.value = 'public';
            authorIdInput.value = 'user-contributor';
            break;
          case 'admin-bad-ip':
            userSelect.value = 'user-admin';
            roleSelect.value = ROLES.Admin;
            actionSelect.value = 'MANAGE_SETTINGS';
            ipInput.value = '198.51.100.23';
            rateLimitCheck.checked = false;
            emailVerifyCheck.checked = true;
            visibilitySelect.value = 'public';
            authorIdInput.value = 'dev-root';
            break;
          case 'rate-limited':
            userSelect.value = 'user-editor';
            roleSelect.value = ROLES.Editor;
            actionSelect.value = 'EDIT_PROJECTS';
            ipInput.value = '127.0.0.1';
            rateLimitCheck.checked = true;
            emailVerifyCheck.checked = true;
            visibilitySelect.value = 'public';
            authorIdInput.value = 'user-editor';
            break;
          case 'unverified-email':
            userSelect.value = 'user-viewer';
            roleSelect.value = ROLES.Viewer;
            actionSelect.value = 'SUBMIT_CONTACT';
            ipInput.value = '127.0.0.1';
            rateLimitCheck.checked = false;
            emailVerifyCheck.checked = false;
            visibilitySelect.value = 'public';
            authorIdInput.value = 'dev-root';
            break;
        }
        evaluateCurrentSimulator();
      });
    });

    if (assignForm) {
      assignForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = get('assign-user-input').value.trim();
        const role = get('assign-role-select').value;
        try {
          engine.assignRole(user, role);
          // Update user selector if new user
          if (![...userSelect.options].some(o => o.value === user)) {
            const opt = document.createElement('option');
            opt.value = user;
            opt.textContent = `${user} (${role})`;
            userSelect.appendChild(opt);
          }
          userSelect.value = user;
          roleSelect.value = role;
          evaluateCurrentSimulator();
        } catch (err) {
          alert('Assignment failed: ' + err.message);
        }
      });
    }

    if (maskForm) {
      maskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const raw = maskInput.value.trim();
        const maskNum = parseInt(raw, 10);
        const role = roleSelect.value;
        try {
          const allowed = engine.evaluatePolicyBitmask(maskNum, role);
          maskResult.textContent = `${allowed ? 'ALLOWED' : 'DENIED'}: Role '${role}' ${allowed ? 'possesses' : 'lacks'} all bits of mask ${maskNum}`;
          maskResult.className = `mask-result ${allowed ? 'text-granted' : 'text-denied'}`;
        } catch (err) {
          maskResult.textContent = `Error: ${err.message}`;
          maskResult.className = 'mask-result text-denied';
        }
      });
    }

    if (clearAuditBtn) {
      clearAuditBtn.addEventListener('click', () => {
        engine.clearAuditLog();
        renderAuditLog();
      });
    }

    renderMatrix();
    evaluateCurrentSimulator();
    renderAuditLog();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initConsole);
  } else {
    initConsole();
  }
}
