/**
 * Charity Microloans - Role-Based Access Control (RBAC) Permission Matrix & Policy Guard
 */

export class CharityMicroloansRbacGuard {
  constructor() {
    this.roles = {
      admin: ['read', 'write', 'delete', 'approve', 'audit'],
      manager: ['read', 'write', 'approve'],
      analyst: ['read', 'audit'],
      viewer: ['read']
    };
  }

  hasPermission(role, action) {
    const perms = this.roles[role] || [];
    return perms.includes(action);
  }

  evaluatePolicy(user, requiredAction) {
    if (!user || !user.role) return false;
    return this.hasPermission(user.role, requiredAction);
  }

  grantPermission(role, action) {
    if (!this.roles[role]) {
      this.roles[role] = [];
    }
    if (!this.roles[role].includes(action)) {
      this.roles[role].push(action);
    }
    return this.roles[role];
  }
}
