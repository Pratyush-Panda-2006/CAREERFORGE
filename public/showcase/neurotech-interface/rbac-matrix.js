/**
 * Neurotech Interface - Role-Based Access Control (RBAC) Engine
 * Issue #2888 - Level 3 Core Feature
 *
 * Implements role-to-permission resolution, bitmask permission evaluation,
 * role hierarchy / inheritance, dynamic temporary access grants, and wildcard action matching.
 */

export const Permissions = {
  READ_TELEMETRY:      1 << 0, // 1   - Read neural signals & telemetry streams
  WRITE_CALIBRATION:   1 << 1, // 2   - Calibrate BCI electrodes & filters
  STIMULATE_NEURAL:    1 << 2, // 4   - Trigger neurostimulation pulses
  EXPORT_AUDIT_LOGS:   1 << 3, // 8   - Export cryptographic audit logs & records
  MANAGE_DEVICE_SYNC:  1 << 4, // 16  - Pair, configure, and sync neurotech hardware
  OVERRIDE_SAFETY:     1 << 5, // 32  - Emergency safety threshold override
  ADMINISTER_USERS:    1 << 6, // 64  - Assign roles and policies to neural interface operators
  DEBUG_SYSTEM_CORE:   1 << 7  // 128 - Low-level firmware & DSP debug access
};

export const ActionToPermission = {
  'telemetry:read': Permissions.READ_TELEMETRY,
  'telemetry:*': Permissions.READ_TELEMETRY,
  'calibration:write': Permissions.WRITE_CALIBRATION,
  'calibration:*': Permissions.WRITE_CALIBRATION,
  'neural:stimulate': Permissions.STIMULATE_NEURAL,
  'neural:*': Permissions.STIMULATE_NEURAL,
  'audit:export': Permissions.EXPORT_AUDIT_LOGS,
  'audit:*': Permissions.EXPORT_AUDIT_LOGS,
  'device:sync': Permissions.MANAGE_DEVICE_SYNC,
  'device:*': Permissions.MANAGE_DEVICE_SYNC,
  'safety:override': Permissions.OVERRIDE_SAFETY,
  'safety:*': Permissions.OVERRIDE_SAFETY,
  'users:admin': Permissions.ADMINISTER_USERS,
  'users:*': Permissions.ADMINISTER_USERS,
  'debug:core': Permissions.DEBUG_SYSTEM_CORE,
  'debug:*': Permissions.DEBUG_SYSTEM_CORE,
  '*': Object.values(Permissions).reduce((acc, curr) => acc | curr, 0)
};

export const DefaultRoles = {
  OBSERVER: {
    name: 'Observer',
    inherits: [],
    permissions: [Permissions.READ_TELEMETRY]
  },
  TECHNICIAN: {
    name: 'Technician',
    inherits: ['OBSERVER'],
    permissions: [
      Permissions.WRITE_CALIBRATION,
      Permissions.MANAGE_DEVICE_SYNC
    ]
  },
  RESEARCHER: {
    name: 'Researcher',
    inherits: ['TECHNICIAN'],
    permissions: [
      Permissions.STIMULATE_NEURAL,
      Permissions.EXPORT_AUDIT_LOGS
    ]
  },
  SAFETY_OFFICER: {
    name: 'Safety Officer',
    inherits: ['OBSERVER'],
    permissions: [
      Permissions.EXPORT_AUDIT_LOGS,
      Permissions.OVERRIDE_SAFETY
    ]
  },
  CHIEF_ENGINEER: {
    name: 'Chief Engineer',
    inherits: ['RESEARCHER', 'SAFETY_OFFICER'],
    permissions: [
      Permissions.ADMINISTER_USERS,
      Permissions.DEBUG_SYSTEM_CORE
    ]
  }
};

export class NeurotechInterfaceRbacEngine {
  constructor(options = {}) {
    this.roles = {};
    this.users = {}; // userIdentifier -> { roles: Set<string>, temporaryGrants: Map<string, number> (action/permission -> expiryTimestamp) }
    this.customPermissions = {}; // role -> bitmask
    this.initDefaultRoles();

    if (options.roles) {
      for (const [rName, rDef] of Object.entries(options.roles)) {
        this.defineRole(rName, rDef.permissions || [], rDef.inherits || []);
      }
    }
  }

  initDefaultRoles() {
    for (const [key, roleDef] of Object.entries(DefaultRoles)) {
      this.defineRole(key, roleDef.permissions, roleDef.inherits);
    }
  }

  defineRole(roleName, permissions = [], inherits = []) {
    const roleKey = String(roleName).toUpperCase();
    let mask = 0;
    if (typeof permissions === 'number') {
      mask = permissions;
    } else if (Array.isArray(permissions)) {
      for (const p of permissions) {
        if (typeof p === 'number') {
          mask |= p;
        } else if (typeof p === 'string' && Permissions[p]) {
          mask |= Permissions[p];
        }
      }
    }

    this.roles[roleKey] = {
      name: roleName,
      directMask: mask,
      inherits: Array.isArray(inherits) ? inherits.map(r => String(r).toUpperCase()) : []
    };
  }

  getRole(roleName) {
    if (!roleName) return null;
    return this.roles[String(roleName).toUpperCase()] || null;
  }

  getAllRoles() {
    return Object.keys(this.roles);
  }

  assignRole(user, role) {
    if (!user) throw new Error('User identifier is required');
    const roleKey = String(role).toUpperCase();
    if (!this.roles[roleKey]) {
      throw new Error(`Role "${role}" does not exist in RBAC catalog`);
    }

    if (!this.users[user]) {
      this.users[user] = {
        roles: new Set(),
        temporaryGrants: new Map()
      };
    }

    this.users[user].roles.add(roleKey);
    return true;
  }

  revokeRole(user, role) {
    if (!user || !this.users[user]) return false;
    const roleKey = String(role).toUpperCase();
    return this.users[user].roles.delete(roleKey);
  }

  getUserRoles(user) {
    if (!user || !this.users[user]) return [];
    return Array.from(this.users[user].roles);
  }

  grantTemporaryPermission(user, permissionOrAction, durationMs = 60000) {
    if (!user) throw new Error('User is required');
    if (!this.users[user]) {
      this.users[user] = {
        roles: new Set(),
        temporaryGrants: new Map()
      };
    }

    const expiry = Date.now() + durationMs;
    this.users[user].temporaryGrants.set(permissionOrAction, expiry);
    return expiry;
  }

  revokeTemporaryPermission(user, permissionOrAction) {
    if (!user || !this.users[user]) return false;
    return this.users[user].temporaryGrants.delete(permissionOrAction);
  }

  getRoleInheritanceChain(roleName, visited = new Set()) {
    const roleKey = String(roleName).toUpperCase();
    if (!this.roles[roleKey] || visited.has(roleKey)) {
      return [];
    }

    visited.add(roleKey);
    const result = [roleKey];
    const role = this.roles[roleKey];

    if (role.inherits && role.inherits.length > 0) {
      for (const parent of role.inherits) {
        const parentChain = this.getRoleInheritanceChain(parent, visited);
        for (const ancestor of parentChain) {
          if (!result.includes(ancestor)) {
            result.push(ancestor);
          }
        }
      }
    }

    return result;
  }

  calculateRoleBitmask(roleName) {
    const chain = this.getRoleInheritanceChain(roleName);
    let combinedMask = 0;
    for (const r of chain) {
      const roleDef = this.roles[r];
      if (roleDef) {
        combinedMask |= (roleDef.directMask || 0);
      }
    }
    return combinedMask;
  }

  calculateUserEffectiveBitmask(user) {
    if (!user || !this.users[user]) return 0;
    let effectiveMask = 0;
    const roles = this.getUserRoles(user);
    for (const role of roles) {
      effectiveMask |= this.calculateRoleBitmask(role);
    }

    // Add active temporary grants
    const now = Date.now();
    for (const [permOrAction, expiry] of this.users[user].temporaryGrants.entries()) {
      if (expiry > now) {
        if (typeof permOrAction === 'number') {
          effectiveMask |= permOrAction;
        } else if (Permissions[permOrAction]) {
          effectiveMask |= Permissions[permOrAction];
        } else if (ActionToPermission[permOrAction]) {
          effectiveMask |= ActionToPermission[permOrAction];
        }
      }
    }

    return effectiveMask;
  }

  evaluatePolicyBitmask(mask) {
    const active = [];
    const missing = [];

    for (const [pKey, pVal] of Object.entries(Permissions)) {
      if ((mask & pVal) === pVal) {
        active.push(pKey);
      } else {
        missing.push(pKey);
      }
    }

    return {
      bitmask: mask,
      activePermissions: active,
      missingPermissions: missing,
      hasSafetyCritical: (mask & (Permissions.STIMULATE_NEURAL | Permissions.OVERRIDE_SAFETY)) !== 0
    };
  }

  resolveActionToBitmask(action) {
    if (typeof action === 'number') return action;
    if (Permissions[action]) return Permissions[action];
    if (ActionToPermission[action]) return ActionToPermission[action];

    // Check wildcard match, e.g. "telemetry:write" matches "telemetry:*" if defined
    if (typeof action === 'string' && action.includes(':')) {
      const domain = action.split(':')[0];
      const wildcardKey = `${domain}:*`;
      if (ActionToPermission[wildcardKey]) {
        return ActionToPermission[wildcardKey];
      }
    }

    return 0;
  }

  checkPermission(roleOrUser, action) {
    const requiredMask = this.resolveActionToBitmask(action);
    if (!requiredMask) {
      // Unrecognized action or zero mask
      return false;
    }

    // If passed user identifier
    if (this.users[roleOrUser]) {
      const userEffective = this.calculateUserEffectiveBitmask(roleOrUser);
      return (userEffective & requiredMask) === requiredMask;
    }

    // If passed role
    const roleKey = String(roleOrUser).toUpperCase();
    if (this.roles[roleKey]) {
      const roleMask = this.calculateRoleBitmask(roleKey);
      return (roleMask & requiredMask) === requiredMask;
    }

    return false;
  }

  toggleRolePermission(roleName, permissionKey) {
    const role = this.getRole(roleName);
    if (!role) return false;
    const permBit = Permissions[permissionKey];
    if (!permBit) return false;

    if ((role.directMask & permBit) === permBit) {
      role.directMask &= ~permBit;
    } else {
      role.directMask |= permBit;
    }
    return true;
  }
}

// -------------------------------------------------------------
// UI Integration Controller for Browser
// -------------------------------------------------------------
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new NeurotechInterfaceRbacEngine();

    // Setup mock simulation users
    engine.assignRole('dr_morales', 'CHIEF_ENGINEER');
    engine.assignRole('guest_technician', 'TECHNICIAN');

    const matrixTableBody = document.getElementById('matrixTableBody');
    const simulationSubjectSelect = document.getElementById('simulationSubjectSelect');
    const simulationActionSelect = document.getElementById('simulationActionSelect');
    const accessEvaluationBadge = document.getElementById('accessEvaluationBadge');
    const accessEvaluationIcon = document.getElementById('accessEvaluationIcon');
    const accessEvaluationText = document.getElementById('accessEvaluationText');
    const effectiveBitmaskVal = document.getElementById('effectiveBitmaskVal');
    const inheritanceDepthVal = document.getElementById('inheritanceDepthVal');
    const safetyGuardStatusVal = document.getElementById('safetyGuardStatusVal');
    const activePermissionsCountVal = document.getElementById('activePermissionsCountVal');
    const grantTempAccessBtn = document.getElementById('grantTempAccessBtn');
    const resetMatrixBtn = document.getElementById('resetMatrixBtn');
    const openDrawerBtn = document.getElementById('openDrawerBtn');
    const closeDrawerBtn = document.getElementById('closeDrawerBtn');
    const drawerCloseFooterBtn = document.getElementById('drawerCloseFooterBtn');
    const policyDrawer = document.getElementById('policyDrawer');
    const customRoleNameInput = document.getElementById('customRoleNameInput');
    const customRoleInheritSelect = document.getElementById('customRoleInheritSelect');
    const createRoleBtn = document.getElementById('createRoleBtn');
    const activeGrantsContainer = document.getElementById('activeGrantsContainer');

    function renderMatrix() {
      if (!matrixTableBody) return;
      matrixTableBody.innerHTML = '';
      const roles = engine.getAllRoles();

      roles.forEach(roleKey => {
        const role = engine.getRole(roleKey);
        const tr = document.createElement('tr');

        const roleTd = document.createElement('td');
        roleTd.innerHTML = `<strong>${role.name || roleKey}</strong><br><small style="color:var(--text-muted)">${roleKey}</small>`;
        tr.appendChild(roleTd);

        // Check for inherited ancestors' masks
        const ancestors = engine.getRoleInheritanceChain(roleKey).filter(r => r !== roleKey);
        let inheritedMask = 0;
        ancestors.forEach(a => {
          const ancestorDef = engine.getRole(a);
          if (ancestorDef) inheritedMask |= (ancestorDef.directMask || 0);
        });

        // 8 Permission Columns
        Object.entries(Permissions).forEach(([pKey, pVal]) => {
          const td = document.createElement('td');
          td.className = 'matrix-cell';

          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.className = 'perm-checkbox';

          const isDirect = (role.directMask & pVal) === pVal;
          const isInherited = (inheritedMask & pVal) === pVal;

          if (isDirect) {
            checkbox.checked = true;
          } else if (isInherited) {
            checkbox.checked = true;
            checkbox.classList.add('inherited');
            checkbox.title = 'Inherited from parent role';
            checkbox.disabled = true;
          }

          if (!isInherited) {
            checkbox.addEventListener('change', () => {
              engine.toggleRolePermission(roleKey, pKey);
              renderMatrix();
              evaluateSimulation();
            });
          }

          td.appendChild(checkbox);
          tr.appendChild(td);
        });

        // Inherits Column
        const inheritTd = document.createElement('td');
        if (role.inherits && role.inherits.length > 0) {
          inheritTd.innerHTML = role.inherits.map(i => `<span class="role-tag">${i}</span>`).join(' ');
        } else {
          inheritTd.innerHTML = '<span style="color:var(--text-muted); font-size:0.8rem;">None (Root)</span>';
        }
        tr.appendChild(inheritTd);

        matrixTableBody.appendChild(tr);
      });
    }

    function evaluateSimulation() {
      if (!simulationSubjectSelect || !simulationActionSelect) return;
      const subjectVal = simulationSubjectSelect.value;
      const action = simulationActionSelect.value;

      const [type, entity] = subjectVal.split(':');
      let isGranted = false;
      let effectiveMask = 0;
      let inheritanceChain = [];

      if (type === 'ROLE') {
        isGranted = engine.checkPermission(entity, action);
        effectiveMask = engine.calculateRoleBitmask(entity);
        inheritanceChain = engine.getRoleInheritanceChain(entity);
      } else if (type === 'USER') {
        isGranted = engine.checkPermission(entity, action);
        effectiveMask = engine.calculateUserEffectiveBitmask(entity);
        const roles = engine.getUserRoles(entity);
        roles.forEach(r => {
          engine.getRoleInheritanceChain(r).forEach(parent => {
            if (!inheritanceChain.includes(parent)) inheritanceChain.push(parent);
          });
        });
      }

      // Update badge
      if (accessEvaluationBadge && accessEvaluationIcon && accessEvaluationText) {
        if (isGranted) {
          accessEvaluationBadge.className = 'access-evaluation-badge pill-access-granted';
          accessEvaluationIcon.textContent = '✓';
          accessEvaluationText.textContent = 'ACCESS GRANTED';
        } else {
          accessEvaluationBadge.className = 'access-evaluation-badge pill-access-denied';
          accessEvaluationIcon.textContent = '✕';
          accessEvaluationText.textContent = 'ACCESS DENIED';
        }
      }

      // Update bitmask stats
      if (effectiveBitmaskVal) {
        const bin = '0b' + (effectiveMask >>> 0).toString(2).padStart(8, '0');
        const hex = '0x' + (effectiveMask >>> 0).toString(16).toUpperCase().padStart(2, '0');
        effectiveBitmaskVal.textContent = `${bin} (${hex})`;
      }

      if (inheritanceDepthVal) {
        const depth = Math.max(0, inheritanceChain.length - 1);
        inheritanceDepthVal.textContent = `${depth} parent level${depth === 1 ? '' : 's'}`;
      }

      if (safetyGuardStatusVal) {
        const hasSafety = (effectiveMask & Permissions.OVERRIDE_SAFETY) !== 0;
        safetyGuardStatusVal.textContent = hasSafety ? 'Active (Elevated)' : 'Guarded (Denied)';
        safetyGuardStatusVal.style.color = hasSafety ? 'var(--warning)' : 'var(--text-muted)';
      }

      if (activePermissionsCountVal) {
        const policy = engine.evaluatePolicyBitmask(effectiveMask);
        activePermissionsCountVal.textContent = `${policy.activePermissions.length} / 8 active`;
      }

      // Update active grants
      if (activeGrantsContainer) {
        let grantsSummary = [];
        for (const [u, userData] of Object.entries(engine.users)) {
          const now = Date.now();
          for (const [perm, exp] of userData.temporaryGrants.entries()) {
            if (exp > now) {
              const secLeft = Math.round((exp - now) / 1000);
              grantsSummary.push(`<strong>${u}</strong>: ${perm} (${secLeft}s remaining)`);
            }
          }
        }
        if (grantsSummary.length > 0) {
          activeGrantsContainer.innerHTML = grantsSummary.join('<br>');
        } else {
          activeGrantsContainer.textContent = 'No active temporary grants.';
        }
      }
    }

    // Event listeners
    if (simulationSubjectSelect) {
      simulationSubjectSelect.addEventListener('change', evaluateSimulation);
    }
    if (simulationActionSelect) {
      simulationActionSelect.addEventListener('change', evaluateSimulation);
    }

    if (grantTempAccessBtn) {
      grantTempAccessBtn.addEventListener('click', () => {
        const subjectVal = simulationSubjectSelect.value;
        const [type, entity] = subjectVal.split(':');
        const action = simulationActionSelect.value;
        const targetUser = type === 'USER' ? entity : 'temp_operator';

        engine.grantTemporaryPermission(targetUser, action, 30000);
        if (type === 'ROLE') {
          // Temporarily select or notify user
          engine.assignRole('temp_operator', entity);
          let exists = false;
          for (let opt of simulationSubjectSelect.options) {
            if (opt.value === 'USER:temp_operator') exists = true;
          }
          if (!exists) {
            const newOpt = document.createElement('option');
            newOpt.value = 'USER:temp_operator';
            newOpt.textContent = `User: temp_operator (${entity})`;
            simulationSubjectSelect.appendChild(newOpt);
          }
          simulationSubjectSelect.value = 'USER:temp_operator';
        }
        evaluateSimulation();
      });
    }

    if (resetMatrixBtn) {
      resetMatrixBtn.addEventListener('click', () => {
        engine.initDefaultRoles();
        renderMatrix();
        evaluateSimulation();
      });
    }

    if (openDrawerBtn && policyDrawer) {
      openDrawerBtn.addEventListener('click', () => {
        policyDrawer.classList.add('open');
      });
    }

    const closeDrawer = () => {
      if (policyDrawer) policyDrawer.classList.remove('open');
    };

    if (closeDrawerBtn) closeDrawerBtn.addEventListener('click', closeDrawer);
    if (drawerCloseFooterBtn) drawerCloseFooterBtn.addEventListener('click', closeDrawer);

    if (createRoleBtn && customRoleNameInput) {
      createRoleBtn.addEventListener('click', () => {
        const roleName = customRoleNameInput.value.trim().toUpperCase().replace(/\s+/g, '_');
        if (!roleName) return;
        const parentRole = customRoleInheritSelect ? customRoleInheritSelect.value : '';
        const inherits = parentRole ? [parentRole] : [];

        engine.defineRole(roleName, [], inherits);
        
        // Add to subject select
        const opt = document.createElement('option');
        opt.value = `ROLE:${roleName}`;
        opt.textContent = `Role: ${roleName}`;
        simulationSubjectSelect.appendChild(opt);

        // Add to drawer inherit options
        if (customRoleInheritSelect) {
          const inheritOpt = document.createElement('option');
          inheritOpt.value = roleName;
          inheritOpt.textContent = roleName;
          customRoleInheritSelect.appendChild(inheritOpt);
        }

        customRoleNameInput.value = '';
        renderMatrix();
        closeDrawer();
      });
    }

    // Initial render
    renderMatrix();
    evaluateSimulation();
  });
}
