/**
 * Fintech Vault - Role-Based Access Control (RBAC) Permission Matrix & Policy Guard
 * Evaluates bitmask permissions, validates user role inheritance hierarchies,
 * and dynamically enforces granular security policies across financial vault domains.
 */

export class FintechVaultRbacEngine {
  // Canonical Action Bitmasks
  static PERMISSIONS = {
    READ: 1 << 0,       // 1 (0b00000001) - Read asset metadata & public balances
    WRITE: 1 << 1,      // 2 (0b00000010) - Stage/edit draft transactions
    EXECUTE: 1 << 2,    // 4 (0b00000100) - Execute vault settlement transfers
    APPROVE: 1 << 3,    // 8 (0b00001000) - Multi-sig dual approval & verification
    AUDIT: 1 << 4,      // 16 (0b00010000) - Inspect full ledger cryptographs & audit trails
    MANAGE_POLICY: 1 << 5, // 32 (0b00100000) - Alter RBAC matrices and roles
    FREEZE_VAULT: 1 << 6,  // 64 (0b01000000) - Emergency vault circuit breaker
    SUPER_ADMIN: 1 << 7    // 128 (0b10000000) - Global master authority
  };

  // Standard Default Roles & Their Direct Explicit Permissions
  static DEFAULT_ROLES = {
    viewer: {
      name: 'Viewer / Auditor Intern',
      description: 'Read-only access to asset metadata and basic balance reports.',
      inherits: [],
      permissions: ['READ'],
      policies: ['vault:read', 'reports:read']
    },
    analyst: {
      name: 'Financial Analyst',
      description: 'Audit logs, generate analytics, and inspect ledgers.',
      inherits: ['viewer'],
      permissions: ['AUDIT'],
      policies: ['reports:*', 'audit:read', 'telemetry:*']
    },
    operator: {
      name: 'Vault Operator',
      description: 'Stage and prepare draft transactions and balance reallocations.',
      inherits: ['viewer'],
      permissions: ['WRITE'],
      policies: ['transactions:create', 'transactions:read', 'transfers:stage']
    },
    settlement_officer: {
      name: 'Settlement Officer',
      description: 'Execute finalized transactions and transfer funds.',
      inherits: ['operator'],
      permissions: ['EXECUTE'],
      policies: ['transfers:execute', 'settlement:*']
    },
    compliance_lead: {
      name: 'Compliance & Risk Officer',
      description: 'Approve large volume wires, freeze compromised vaults, audit logs.',
      inherits: ['analyst'],
      permissions: ['APPROVE', 'FREEZE_VAULT'],
      policies: ['compliance:*', 'vault:freeze', 'transactions:approve', 'audit:*']
    },
    vault_admin: {
      name: 'Vault Administrator',
      description: 'Full supervisory authority over vault configuration and policies.',
      inherits: ['settlement_officer', 'compliance_lead'],
      permissions: ['MANAGE_POLICY', 'SUPER_ADMIN'],
      policies: ['*']
    }
  };

  constructor(customRoles = null) {
    this.roles = {};
    const baseRoles = customRoles || FintechVaultRbacEngine.DEFAULT_ROLES;
    for (const [key, val] of Object.entries(baseRoles)) {
      this.roles[key] = {
        name: val.name || key,
        description: val.description || '',
        inherits: Array.isArray(val.inherits) ? [...val.inherits] : [],
        permissions: Array.isArray(val.permissions) ? [...val.permissions] : [],
        policies: Array.isArray(val.policies) ? [...val.policies] : []
      };
    }

    // User assignment repository: username -> { roles: Set, customGrants: Set, customDenials: Set }
    this.users = new Map();
  }

  /**
   * Assigns a role to a user.
   * @param {string} user 
   * @param {string} role 
   * @returns {boolean} True if assignment successful
   */
  assignRole(user, role) {
    if (!user || typeof user !== 'string') {
      throw new Error('Invalid user identifier specified');
    }
    if (!this.roles[role]) {
      throw new Error(`Role "${role}" does not exist in RBAC registry`);
    }

    if (!this.users.has(user)) {
      this.users.set(user, {
        roles: new Set(),
        customGrants: new Set(),
        customDenials: new Set()
      });
    }

    const userData = this.users.get(user);
    userData.roles.add(role);
    return true;
  }

  /**
   * Revokes a role from a user.
   * @param {string} user 
   * @param {string} role 
   * @returns {boolean}
   */
  revokeRole(user, role) {
    if (!this.users.has(user)) return false;
    const userData = this.users.get(user);
    return userData.roles.delete(role);
  }

  /**
   * Retrieves all roles assigned directly to a user.
   * @param {string} user 
   * @returns {string[]}
   */
  getUserRoles(user) {
    if (!this.users.has(user)) return [];
    return Array.from(this.users.get(user).roles);
  }

  /**
   * Resolves the entire hierarchy of roles inherited by a given role (transitively).
   * Prevents cyclic inheritance with cycle detection.
   * @param {string} role 
   * @returns {Set<string>} Set of all role keys including the role itself and its ancestors
   */
  resolveRoleInheritance(role) {
    const visited = new Set();
    const stack = [role];

    while (stack.length > 0) {
      const current = stack.pop();
      if (!visited.has(current)) {
        visited.add(current);
        const roleDef = this.roles[current];
        if (roleDef && Array.isArray(roleDef.inherits)) {
          for (const parent of roleDef.inherits) {
            if (this.roles[parent] && !visited.has(parent)) {
              stack.push(parent);
            }
          }
        }
      }
    }

    return visited;
  }

  /**
   * Calculates the combined integer bitmask for a given role (or array of roles)
   * after resolving transitive role inheritance.
   * @param {string|string[]} roleInput 
   * @returns {number} 8-bit integer permission mask
   */
  calculateRoleBitmask(roleInput) {
    const rolesToCheck = Array.isArray(roleInput) ? roleInput : [roleInput];
    const allRoles = new Set();

    for (const r of rolesToCheck) {
      const inherited = this.resolveRoleInheritance(r);
      for (const item of inherited) {
        allRoles.add(item);
      }
    }

    let mask = 0;
    for (const roleKey of allRoles) {
      const roleDef = this.roles[roleKey];
      if (roleDef && Array.isArray(roleDef.permissions)) {
        for (const perm of roleDef.permissions) {
          const bit = FintechVaultRbacEngine.PERMISSIONS[perm];
          if (bit !== undefined) {
            mask |= bit;
          }
        }
      }
    }

    return mask;
  }

  /**
   * Calculates effective bitmask for an assigned user.
   * @param {string} user 
   * @returns {number}
   */
  calculateUserBitmask(user) {
    if (!this.users.has(user)) return 0;
    const userData = this.users.get(user);
    const baseMask = this.calculateRoleBitmask(Array.from(userData.roles));

    let finalMask = baseMask;
    for (const grant of userData.customGrants) {
      const bit = FintechVaultRbacEngine.PERMISSIONS[grant];
      if (bit !== undefined) finalMask |= bit;
    }
    for (const denial of userData.customDenials) {
      const bit = FintechVaultRbacEngine.PERMISSIONS[denial];
      if (bit !== undefined) finalMask &= ~bit;
    }

    return finalMask;
  }

  /**
   * Evaluates an arbitrary bitmask against all known permission flags.
   * Returns a breakdown object containing active permissions, total score, and flags.
   * @param {number} mask 
   * @returns {object}
   */
  evaluatePolicyBitmask(mask) {
    const numericMask = Number(mask) || 0;
    const granted = [];
    const denied = [];

    for (const [permName, bitVal] of Object.entries(FintechVaultRbacEngine.PERMISSIONS)) {
      if ((numericMask & bitVal) === bitVal) {
        granted.push(permName);
      } else {
        denied.push(permName);
      }
    }

    const isSuperAdmin = (numericMask & FintechVaultRbacEngine.PERMISSIONS.SUPER_ADMIN) !== 0;
    const canFreeze = (numericMask & FintechVaultRbacEngine.PERMISSIONS.FREEZE_VAULT) !== 0;
    const canExecute = (numericMask & FintechVaultRbacEngine.PERMISSIONS.EXECUTE) !== 0;

    return {
      mask: numericMask,
      binaryString: (numericMask >>> 0).toString(2).padStart(8, '0'),
      hexString: '0x' + numericMask.toString(16).toUpperCase().padStart(2, '0'),
      granted,
      denied,
      isSuperAdmin,
      canFreeze,
      canExecute,
      permissionCount: granted.length,
      totalPossible: Object.keys(FintechVaultRbacEngine.PERMISSIONS).length
    };
  }

  /**
   * Matches an action pattern containing wildcards against a requested action.
   * Supports:
   *  - "*" (matches everything)
   *  - "vault:*" (matches "vault:read", "vault:write", "vault:freeze", etc.)
   *  - "transfers:*:approved" (glob wildcard segment matching)
   *  - exact match "vault:read"
   * @param {string} pattern 
   * @param {string} action 
   * @returns {boolean}
   */
  static matchWildcard(pattern, action) {
    if (!pattern || !action) return false;
    if (pattern === '*' || pattern === action) return true;

    // Convert pattern to regex
    // Escape regex special chars except '*'
    const escaped = pattern
      .split('*')
      .map(part => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*');

    const regex = new RegExp(`^${escaped}$`, 'i');
    return regex.test(action);
  }

  /**
   * Checks if a role has permission for a specific action/bitmask or policy rule.
   * Supports both bitmask permission string (e.g., 'READ', 'EXECUTE') or action string (e.g., 'vault:read', 'transfers:stage').
   * @param {string} role 
   * @param {string} action 
   * @returns {boolean}
   */
  checkPermission(role, action) {
    if (!role || !action || !this.roles[role]) {
      return false;
    }

    const inheritedRoles = this.resolveRoleInheritance(role);

    // 1. Check if action corresponds to a canonical bitmask permission
    const upperAction = action.toUpperCase();
    if (FintechVaultRbacEngine.PERMISSIONS[upperAction] !== undefined) {
      const bitmask = this.calculateRoleBitmask(role);
      const targetBit = FintechVaultRbacEngine.PERMISSIONS[upperAction];
      return (bitmask & targetBit) === targetBit;
    }

    // 2. Check if any inherited role has SUPER_ADMIN privilege
    const bitmask = this.calculateRoleBitmask(role);
    if ((bitmask & FintechVaultRbacEngine.PERMISSIONS.SUPER_ADMIN) !== 0) {
      return true;
    }

    // 3. Check granular policy string rules across all inherited roles
    for (const roleKey of inheritedRoles) {
      const roleDef = this.roles[roleKey];
      if (roleDef && Array.isArray(roleDef.policies)) {
        for (const policyPattern of roleDef.policies) {
          if (FintechVaultRbacEngine.matchWildcard(policyPattern, action)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  /**
   * Evaluates user access for an action taking into account all user roles and direct grants/denials.
   * @param {string} user 
   * @param {string} action 
   * @returns {boolean}
   */
  evaluateUserAccess(user, action) {
    if (!this.users.has(user)) return false;
    const userData = this.users.get(user);

    const upperAction = action.toUpperCase();
    if (userData.customDenials.has(upperAction)) {
      return false;
    }
    if (userData.customGrants.has(upperAction)) {
      return true;
    }

    for (const role of userData.roles) {
      if (this.checkPermission(role, action)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Adds a custom role to the engine.
   * @param {string} roleKey 
   * @param {object} roleDefinition 
   */
  registerRole(roleKey, roleDefinition) {
    if (!roleKey || typeof roleKey !== 'string') {
      throw new Error('Role key must be a valid string');
    }
    this.roles[roleKey] = {
      name: roleDefinition.name || roleKey,
      description: roleDefinition.description || '',
      inherits: Array.isArray(roleDefinition.inherits) ? [...roleDefinition.inherits] : [],
      permissions: Array.isArray(roleDefinition.permissions) ? [...roleDefinition.permissions] : [],
      policies: Array.isArray(roleDefinition.policies) ? [...roleDefinition.policies] : []
    };
  }

  /**
   * Updates an existing role's permissions or policies.
   * @param {string} roleKey 
   * @param {string[]} permissions 
   * @param {string[]} policies 
   */
  updateRole(roleKey, permissions, policies) {
    if (!this.roles[roleKey]) {
      throw new Error(`Role "${roleKey}" not found`);
    }
    if (permissions) {
      this.roles[roleKey].permissions = [...permissions];
    }
    if (policies) {
      this.roles[roleKey].policies = [...policies];
    }
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new FintechVaultRbacEngine();

    // Pre-populate some simulated users
    engine.assignRole('sumit.lead', 'vault_admin');
    engine.assignRole('elena.compliance', 'compliance_lead');
    engine.assignRole('marcus.settlement', 'settlement_officer');
    engine.assignRole('sophia.analyst', 'analyst');
    engine.assignRole('alex.intern', 'viewer');

    const roleSelector = document.getElementById('simulationRoleSelect');
    const userSelector = document.getElementById('simulationUserSelect');
    const testActionInput = document.getElementById('testActionInput');
    const evaluateActionBtn = document.getElementById('evaluateActionBtn');
    const evaluationBadge = document.getElementById('evaluationBadge');
    const evaluationDetail = document.getElementById('evaluationDetail');
    const bitmaskDisplay = document.getElementById('bitmaskDisplay');
    const binaryDisplay = document.getElementById('binaryDisplay');
    const matrixTbody = document.getElementById('matrixTbody');
    const roleHierarchyList = document.getElementById('roleHierarchyList');
    const policyEditorDrawer = document.getElementById('policyEditorDrawer');
    const closeDrawerBtn = document.getElementById('closeDrawerBtn');
    const editRoleSelect = document.getElementById('editRoleSelect');
    const rolePoliciesInput = document.getElementById('rolePoliciesInput');
    const saveRolePolicyBtn = document.getElementById('saveRolePolicyBtn');
    const openDrawerBtn = document.getElementById('openDrawerBtn');

    // Render Matrix Table
    function renderMatrix() {
      if (!matrixTbody) return;
      matrixTbody.innerHTML = '';

      const permKeys = Object.keys(FintechVaultRbacEngine.PERMISSIONS);
      const selectedRole = roleSelector ? roleSelector.value : 'vault_admin';

      for (const [roleKey, roleDef] of Object.entries(engine.roles)) {
        const tr = document.createElement('tr');
        if (roleKey === selectedRole) {
          tr.classList.add('active-role-row');
        }

        const roleTd = document.createElement('td');
        roleTd.innerHTML = `
          <div class="role-cell-title">${roleDef.name}</div>
          <div class="role-cell-key"><code>${roleKey}</code></div>
        `;
        tr.appendChild(roleTd);

        const inheritedRoles = engine.resolveRoleInheritance(roleKey);
        const roleBitmask = engine.calculateRoleBitmask(roleKey);

        for (const p of permKeys) {
          const td = document.createElement('td');
          td.className = 'matrix-cell';
          const pBit = FintechVaultRbacEngine.PERMISSIONS[p];
          const hasDirect = roleDef.permissions.includes(p);
          const hasInherited = (roleBitmask & pBit) === pBit;

          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.className = 'rbac-checkbox';
          checkbox.dataset.role = roleKey;
          checkbox.dataset.perm = p;
          checkbox.checked = hasInherited;

          if (hasInherited && !hasDirect) {
            checkbox.classList.add('inherited-checked');
            checkbox.title = 'Inherited from parent role';
          }

          checkbox.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            const r = e.target.dataset.role;
            const perm = e.target.dataset.perm;
            const currentPerms = new Set(engine.roles[r].permissions);

            if (isChecked) {
              currentPerms.add(perm);
            } else {
              currentPerms.delete(perm);
            }
            engine.roles[r].permissions = Array.from(currentPerms);
            renderMatrix();
            updateSimulationDisplay();
          });

          td.appendChild(checkbox);
          tr.appendChild(td);
        }

        const actionsTd = document.createElement('td');
        actionsTd.className = 'matrix-actions-cell';
        actionsTd.innerHTML = `<button type="button" class="btn-micro edit-role-btn" data-role="${roleKey}">Edit Policies</button>`;
        tr.appendChild(actionsTd);

        matrixTbody.appendChild(tr);
      }

      // Attach event listeners to edit role buttons
      document.querySelectorAll('.edit-role-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const r = btn.dataset.role;
          if (editRoleSelect) editRoleSelect.value = r;
          populateDrawer(r);
          if (policyEditorDrawer) policyEditorDrawer.classList.add('open');
        });
      });
    }

    function populateDrawer(roleKey) {
      if (!rolePoliciesInput) return;
      const roleDef = engine.roles[roleKey];
      if (roleDef) {
        rolePoliciesInput.value = roleDef.policies.join(', ');
      }
    }

    function updateSimulationDisplay() {
      const selectedRole = roleSelector ? roleSelector.value : 'vault_admin';
      const bitmask = engine.calculateRoleBitmask(selectedRole);
      const evalResult = engine.evaluatePolicyBitmask(bitmask);

      if (bitmaskDisplay) {
        bitmaskDisplay.textContent = evalResult.hexString + ` (${bitmask})`;
      }
      if (binaryDisplay) {
        binaryDisplay.textContent = evalResult.binaryString;
      }

      // Update Role Hierarchy tags
      if (roleHierarchyList) {
        roleHierarchyList.innerHTML = '';
        const ancestors = Array.from(engine.resolveRoleInheritance(selectedRole));
        ancestors.forEach((anc, idx) => {
          const tag = document.createElement('span');
          tag.className = 'hierarchy-pill ' + (idx === 0 ? 'root-role' : 'parent-role');
          tag.textContent = engine.roles[anc] ? engine.roles[anc].name : anc;
          roleHierarchyList.appendChild(tag);
        });
      }

      // Re-evaluate action test
      runActionEvaluation();
    }

    function runActionEvaluation() {
      const selectedRole = roleSelector ? roleSelector.value : 'vault_admin';
      const action = testActionInput ? testActionInput.value.trim() : 'transfers:execute';

      const allowed = engine.checkPermission(selectedRole, action);

      if (evaluationBadge) {
        evaluationBadge.className = 'eval-badge ' + (allowed ? 'eval-pass' : 'eval-deny');
        evaluationBadge.textContent = allowed ? 'ACCESS GRANTED' : 'ACCESS DENIED';
      }

      if (evaluationDetail) {
        const roleName = engine.roles[selectedRole]?.name || selectedRole;
        if (allowed) {
          evaluationDetail.innerHTML = `Role <strong>${roleName}</strong> satisfies policy guard requirements for <code>${action}</code>.`;
        } else {
          evaluationDetail.innerHTML = `Role <strong>${roleName}</strong> lacks necessary bitmask authority or policy grant for <code>${action}</code>.`;
        }
      }
    }

    // Event listeners
    if (roleSelector) {
      roleSelector.addEventListener('change', () => {
        renderMatrix();
        updateSimulationDisplay();
      });
    }

    if (userSelector) {
      userSelector.addEventListener('change', (e) => {
        const u = e.target.value;
        const uRoles = engine.getUserRoles(u);
        if (uRoles.length > 0 && roleSelector) {
          roleSelector.value = uRoles[0];
          renderMatrix();
          updateSimulationDisplay();
        }
      });
    }

    if (evaluateActionBtn) {
      evaluateActionBtn.addEventListener('click', runActionEvaluation);
    }

    if (testActionInput) {
      testActionInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') runActionEvaluation();
      });
    }

    if (openDrawerBtn && policyEditorDrawer) {
      openDrawerBtn.addEventListener('click', () => {
        const r = roleSelector ? roleSelector.value : 'vault_admin';
        if (editRoleSelect) editRoleSelect.value = r;
        populateDrawer(r);
        policyEditorDrawer.classList.add('open');
      });
    }

    if (closeDrawerBtn && policyEditorDrawer) {
      closeDrawerBtn.addEventListener('click', () => {
        policyEditorDrawer.classList.remove('open');
      });
    }

    if (editRoleSelect) {
      editRoleSelect.addEventListener('change', (e) => {
        populateDrawer(e.target.value);
      });
    }

    if (saveRolePolicyBtn && rolePoliciesInput && editRoleSelect) {
      saveRolePolicyBtn.addEventListener('click', () => {
        const r = editRoleSelect.value;
        const newPolicies = rolePoliciesInput.value
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
        engine.updateRole(r, null, newPolicies);
        if (policyEditorDrawer) policyEditorDrawer.classList.remove('open');
        renderMatrix();
        updateSimulationDisplay();
      });
    }

    // Quick action chips
    document.querySelectorAll('.action-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        if (testActionInput) {
          testActionInput.value = chip.dataset.action;
          runActionEvaluation();
        }
      });
    });

    // Initial render
    renderMatrix();
    updateSimulationDisplay();
  });
}
