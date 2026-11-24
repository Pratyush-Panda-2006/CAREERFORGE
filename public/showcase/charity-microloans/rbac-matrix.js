/**
 * Charity Microloans - Role-Based Access Control (RBAC) Permission Matrix & Policy Guard
 * Issue #2896 - NSoC '26 Level 3 Feature
 * Calculates bitmask permissions, validates user role inheritance, and evaluates dynamic access grants.
 */

const PERMISSIONS = {
  VIEW_LOANS: 1 << 0,        // 0000 0001
  DISBURSE_LOANS: 1 << 1,    // 0000 0010
  RECORD_REPAYMENTS: 1 << 2, // 0000 0100
  MANAGE_BORROWERS: 1 << 3,  // 0000 1000
  APPROVE_LOANS: 1 << 4,     // 0001 0000
  REVOKE_ACCESS: 1 << 5,     // 0010 0000
  MANAGE_ROLES: 1 << 6,      // 0100 0000
  AUDIT_LOGS: 1 << 7,        // 1000 0000
  ALL: 0xFF
};

const PERMISSION_LABELS = {
  [PERMISSIONS.VIEW_LOANS]: 'View Loans',
  [PERMISSIONS.DISBURSE_LOANS]: 'Disburse Loans',
  [PERMISSIONS.RECORD_REPAYMENTS]: 'Record Repayments',
  [PERMISSIONS.MANAGE_BORROWERS]: 'Manage Borrowers',
  [PERMISSIONS.APPROVE_LOANS]: 'Approve Loans',
  [PERMISSIONS.REVOKE_ACCESS]: 'Revoke Access',
  [PERMISSIONS.MANAGE_ROLES]: 'Manage Roles',
  [PERMISSIONS.AUDIT_LOGS]: 'Audit Logs'
};

const ACTION_BIT = {
  'VIEW_LOANS': PERMISSIONS.VIEW_LOANS,
  'DISBURSE_LOANS': PERMISSIONS.DISBURSE_LOANS,
  'RECORD_REPAYMENTS': PERMISSIONS.RECORD_REPAYMENTS,
  'MANAGE_BORROWERS': PERMISSIONS.MANAGE_BORROWERS,
  'APPROVE_LOANS': PERMISSIONS.APPROVE_LOANS,
  'REVOKE_ACCESS': PERMISSIONS.REVOKE_ACCESS,
  'MANAGE_ROLES': PERMISSIONS.MANAGE_ROLES,
  'AUDIT_LOGS': PERMISSIONS.AUDIT_LOGS
};

const BASE_ROLES = {
  DONOR: {
    mask: PERMISSIONS.VIEW_LOANS,
    inherits: []
  },
  BORROWER: {
    mask: PERMISSIONS.VIEW_LOANS | PERMISSIONS.RECORD_REPAYMENTS,
    inherits: []
  },
  LOAN_OFFICER: {
    mask: PERMISSIONS.VIEW_LOANS | PERMISSIONS.DISBURSE_LOANS |
          PERMISSIONS.RECORD_REPAYMENTS | PERMISSIONS.MANAGE_BORROWERS,
    inherits: []
  },
  MANAGER: {
    mask: PERMISSIONS.APPROVE_LOANS | PERMISSIONS.MANAGE_ROLES,
    inherits: ['LOAN_OFFICER']
  },
  ADMIN: {
    mask: PERMISSIONS.ALL,
    inherits: []
  }
};

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

export class CharityMicroloansRbacEngine {
  constructor(options = {}) {
    this.roles = clone(BASE_ROLES);
    this.userRoles = new Map();
    this.customPolicies = new Map();
    this.allowWildcard = options.allowWildcard !== false;
  }

  assignRole(user, role) {
    const userId = String(user);
    const roleId = String(role);
    if (!(roleId in this.roles)) {
      throw new Error(`Unknown role: ${roleId}`);
    }
    this.userRoles.set(userId, roleId);
    return { user: userId, role: roleId };
  }

  getUserRole(user) {
    return this.userRoles.get(String(user));
  }

  getEffectiveMask(role) {
    const roleId = String(role);
    const roleDef = this.roles[roleId];
    if (!roleDef) return 0;

    let mask = roleDef.mask;
    const visited = new Set();
    const stack = [...(roleDef.inherits || [])];

    while (stack.length > 0) {
      const parent = stack.pop();
      if (visited.has(parent)) continue;
      visited.add(parent);
      if (this.roles[parent]) {
        mask |= this.roles[parent].mask;
        for (const p of (this.roles[parent].inherits || [])) {
          if (!visited.has(p)) stack.push(p);
        }
      }
    }
    return mask;
  }

  checkPermission(role, action) {
    const roleId = String(role);
    const actionId = String(action);

    if (this.allowWildcard && actionId === '*') {
      return true;
    }

    const mask = this.getEffectiveMask(roleId);
    const bit = ACTION_BIT[actionId];
    if (bit === undefined) return false;

    return (mask & bit) !== 0;
  }

  evaluatePolicyBitmask(mask) {
    const m = Number(mask);
    const granted = [];
    const permissionBits = Object.keys(PERMISSIONS).filter(k => k !== 'ALL');

    for (const name of permissionBits) {
      const bit = PERMISSIONS[name];
      if ((m & bit) !== 0) {
        granted.push({ permission: name, label: PERMISSION_LABELS[bit], bit });
      }
    }

    return {
      mask: m,
      hex: '0x' + (m >>> 0).toString(16).padStart(8, '0'),
      binary: (m >>> 0).toString(2).padStart(32, '0'),
      granted,
      count: granted.length,
      isAdmin: (m & PERMISSIONS.ALL) === PERMISSIONS.ALL
    };
  }

  addCustomPolicy(policyId, mask) {
    this.customPolicies.set(String(policyId), Number(mask));
  }

  checkPolicy(policyId, action) {
    const mask = this.customPolicies.get(String(policyId));
    if (mask === undefined) return false;
    const bit = ACTION_BIT[String(action)];
    if (bit === undefined) return false;
    return (mask & bit) !== 0;
  }

  getRoleMask(role) {
    return this.getEffectiveMask(String(role));
  }

  getPermissions() {
    return Object.keys(PERMISSIONS).filter(k => k !== 'ALL').map(name => ({
      name,
      label: PERMISSION_LABELS[PERMISSIONS[name]],
      bit: PERMISSIONS[name]
    }));
  }

  getRoles() {
    return Object.keys(this.roles).map(roleId => ({
      role: roleId,
      mask: this.getEffectiveMask(roleId),
      inherits: this.roles[roleId].inherits || []
    }));
  }

  getUsers() {
    return Array.from(this.userRoles.entries()).map(([user, role]) => ({ user, role }));
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const engine = new CharityMicroloansRbacEngine();

    const roleSelect = document.getElementById('rbacRoleSelect');
    const actionSelect = document.getElementById('rbacActionSelect');
    const checkBtn = document.getElementById('rbacCheckBtn');
    const accessBadge = document.getElementById('rbacAccessBadge');
    const matrixBody = document.getElementById('rbacMatrixBody');
    const roleRows = document.getElementById('rbacRoleRows');
    const assignUserInput = document.getElementById('rbacAssignUser');
    const assignRoleSelect = document.getElementById('rbacAssignRole');
    const assignBtn = document.getElementById('rbacAssignBtn');
    const usersList = document.getElementById('rbacUsersList');
    const maskInput = document.getElementById('rbacMaskInput');
    const evalMaskBtn = document.getElementById('rbacEvalMaskBtn');
    const maskResult = document.getElementById('rbacMaskResult');
    const policyIdInput = document.getElementById('rbacPolicyId');
    const policyMaskInput = document.getElementById('rbacPolicyMask');
    const addPolicyBtn = document.getElementById('rbacAddPolicyBtn');
    const policyActionSelect = document.getElementById('rbacPolicyAction');
    const checkPolicyBtn = document.getElementById('rbacCheckPolicyBtn');
    const policyResult = document.getElementById('rbacPolicyResult');

    function renderRoles() {
      if (!roleRows) return;
      roleRows.replaceChildren();
      for (const { role, mask, inherits } of engine.getRoles()) {
        const tr = document.createElement('tr');
        tr.className = 'rbac-row';

        const nameCell = document.createElement('td');
        nameCell.className = 'rbac-cell-name';
        nameCell.textContent = role;
        tr.appendChild(nameCell);

        const maskCell = document.createElement('td');
        maskCell.className = 'rbac-cell-mono';
        maskCell.textContent = '0x' + (mask >>> 0).toString(16).padStart(8, '0');
        tr.appendChild(maskCell);

        const inheritCell = document.createElement('td');
        inheritCell.className = 'rbac-cell-mono';
        inheritCell.textContent = inherits.length ? inherits.join(', ') : '—';
        tr.appendChild(inheritCell);

        const permsCell = document.createElement('td');
        permsCell.className = 'rbac-cell-perms';
        const evaluation = engine.evaluatePolicyBitmask(mask);
        evaluation.granted.forEach(p => {
          const pill = document.createElement('span');
          pill.className = 'rbac-pill rbac-pill-grant';
          pill.textContent = p.label;
          permsCell.appendChild(pill);
        });
        tr.appendChild(permsCell);

        roleRows.appendChild(tr);
      }
    }

    function renderMatrix() {
      if (!matrixBody) return;
      matrixBody.replaceChildren();
      const roles = engine.getRoles();
      const permissions = engine.getPermissions();

      // Header row
      const thead = document.createElement('thead');
      const htr = document.createElement('tr');
      const empty = document.createElement('th');
      empty.textContent = 'Role \\ Permission';
      htr.appendChild(empty);
      for (const p of permissions) {
        const th = document.createElement('th');
        th.className = 'rbac-matrix-header';
        th.textContent = p.label;
        th.title = p.name;
        htr.appendChild(th);
      }
      thead.appendChild(htr);
      matrixBody.appendChild(thead);

      const tbody = document.createElement('tbody');
      for (const { role, mask } of roles) {
        const tr = document.createElement('tr');
        tr.className = 'rbac-row';

        const nameCell = document.createElement('td');
        nameCell.className = 'rbac-cell-name';
        nameCell.textContent = role;
        tr.appendChild(nameCell);

        for (const p of permissions) {
          const td = document.createElement('td');
          const allowed = (mask & p.bit) !== 0;
          td.className = `rbac-matrix-cell ${allowed ? 'rbac-cell-grant' : 'rbac-cell-deny'}`;
          td.textContent = allowed ? '✔' : '✘';
          td.title = `${role} → ${p.name}: ${allowed ? 'GRANTED' : 'DENIED'}`;
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
      matrixBody.appendChild(tbody);
    }

    function renderUsers() {
      if (!usersList) return;
      usersList.replaceChildren();
      for (const { user, role } of engine.getUsers()) {
        const item = document.createElement('div');
        item.className = 'rbac-user-item';
        const name = document.createElement('span');
        name.className = 'rbac-user-name';
        name.textContent = user;
        const roleSpan = document.createElement('span');
        roleSpan.className = 'rbac-pill rbac-pill-role';
        roleSpan.textContent = role;
        item.appendChild(name);
        item.appendChild(roleSpan);
        usersList.appendChild(item);
      }
    }

    function renderAll() {
      renderRoles();
      renderMatrix();
      renderUsers();
    }

    checkBtn?.addEventListener('click', () => {
      const role = roleSelect.value;
      const action = actionSelect.value;
      const allowed = engine.checkPermission(role, action);
      if (accessBadge) {
        accessBadge.textContent = allowed ? 'ACCESS GRANTED' : 'ACCESS DENIED';
        accessBadge.className = `rbac-badge ${allowed ? 'rbac-badge-grant' : 'rbac-badge-deny'}`;
      }
    });

    assignBtn?.addEventListener('click', () => {
      const user = assignUserInput.value.trim();
      const role = assignRoleSelect.value;
      if (!user) return;
      try {
        engine.assignRole(user, role);
        assignUserInput.value = '';
        renderAll();
      } catch {
        // ignore unknown role
      }
    });

    evalMaskBtn?.addEventListener('click', () => {
      const mask = maskInput.value.trim();
      if (mask === '') return;
      try {
        const result = engine.evaluatePolicyBitmask(mask);
        if (maskResult) {
          const hex = '0x' + (result.mask >>> 0).toString(16).padStart(8, '0');
          maskResult.innerHTML = `
            <div><strong>Mask:</strong> ${hex}</div>
            <div><strong>Binary:</strong> <code class="rbac-mono">${result.binary}</code></div>
            <div><strong>Granted:</strong> ${result.granted.length} permissions</div>
            <div><strong>Admin:</strong> ${result.isAdmin ? 'YES' : 'NO'}</div>
            ${result.granted.map(p => `<span class="rbac-pill rbac-pill-grant">${p.label}</span>`).join(' ')}
          `;
        }
      } catch {
        maskResult.textContent = 'Invalid mask';
      }
    });

    addPolicyBtn?.addEventListener('click', () => {
      const id = policyIdInput.value.trim();
      const mask = policyMaskInput.value.trim();
      if (!id || mask === '') return;
      try {
        engine.addCustomPolicy(id, mask);
        policyIdInput.value = '';
        policyMaskInput.value = '';
      } catch {
        // ignore
      }
    });

    checkPolicyBtn?.addEventListener('click', () => {
      const id = policyIdInput.value.trim();
      const action = policyActionSelect.value;
      if (!id) return;
      const allowed = engine.checkPolicy(id, action);
      if (policyResult) {
        policyResult.textContent = allowed ? 'POLICY GRANTED' : 'POLICY DENIED';
        policyResult.className = `rbac-badge ${allowed ? 'rbac-badge-grant' : 'rbac-badge-deny'}`;
      }
    });

    // Populate selects
    function populateSelects() {
      const roles = engine.getRoles();
      [roleSelect, assignRoleSelect].forEach(el => {
        if (!el) return;
        el.replaceChildren();
        for (const { role } of roles) {
          const o = document.createElement('option');
          o.value = role;
          o.textContent = role;
          el.appendChild(o);
        }
      });

      const actions = engine.getPermissions();
      [actionSelect, policyActionSelect].forEach(el => {
        if (!el) return;
        el.replaceChildren();
        const all = document.createElement('option');
        all.value = '*';
        all.textContent = '* (All Actions)';
        el.appendChild(all);
        for (const p of actions) {
          const o = document.createElement('option');
          o.value = p.name;
          o.textContent = p.name;
          el.appendChild(o);
        }
      });
    }

    populateSelects();
    renderAll();
  });
}
