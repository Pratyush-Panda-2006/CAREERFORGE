export const ACTIONS = Object.freeze([
  'catalog:read', 'orders:read', 'orders:write', 'inventory:read',
  'inventory:write', 'policy:manage', 'roles:assign',
]);
const ALL = (1 << ACTIONS.length) - 1;
const nameOf = value => {
  if (typeof value !== 'string' || !/^[a-z][a-z0-9_-]{0,39}$/.test(value)
    || ['constructor', 'prototype', '__proto__'].includes(value)) throw new TypeError('Use a 1–40 character lowercase identifier.');
  return value;
};
function strings(value, limit) {
  if (!Array.isArray(value) || value.length > limit) throw new TypeError('Policy list exceeds its limit.');
  const result = [];
  for (let i = 0; i < value.length; i++) {
    const field = Object.getOwnPropertyDescriptor(value, String(i));
    if (!field || !('value' in field) || typeof field.value !== 'string') throw new TypeError('Policy lists must contain plain strings.');
    result.push(field.value);
  }
  if (new Set(result).size !== result.length) throw new TypeError('Duplicate policy entry.');
  return result;
}
function policy(value) {
  if (!value || Object.getPrototypeOf(value) !== Object.prototype) throw new TypeError('Use a plain policy object.');
  const fields = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(fields).length !== 2 || !fields.parents || !fields.permissions
    || !('value' in fields.parents) || !('value' in fields.permissions)) throw new TypeError('Policy requires only parents and permissions.');
  return { parents: strings(fields.parents.value, 3).map(nameOf), permissions: strings(fields.permissions.value, ACTIONS.length) };
}
function maskFor(patterns) {
  let mask = 0;
  for (const pattern of patterns) {
    if (pattern !== '*' && !/^[a-z]+:(?:[a-z]+|\*)$/.test(pattern)) throw new TypeError('Use an exact action, namespace:* or *.');
    const matches = ACTIONS.map((action, bit) => ({ action, bit })).filter(({ action }) =>
      pattern === '*' || action === pattern || (pattern.endsWith(':*') && action.startsWith(pattern.slice(0, -1))));
    if (!matches.length) throw new TypeError('Unknown action or namespace.');
    for (const { bit } of matches) mask |= 1 << bit;
  }
  return mask;
}

/** Local policy simulator. A trusted caller must supply the actor identity. */
export class EcommerceStoreRbacEngine {
  #roles = new Map([
    ['customer', { parents: [], permissions: ['catalog:read'] }],
    ['clerk', { parents: ['customer'], permissions: ['orders:*', 'inventory:read'] }],
    ['manager', { parents: ['clerk'], permissions: ['inventory:*'] }],
    ['owner', { parents: [], permissions: ['*'] }],
  ]);
  #users = new Map([['owner-demo', 'owner'], ['clerk-demo', 'clerk'], ['shopper-demo', 'customer']]);

  #masks(roles = this.#roles) {
    const resolved = new Map(), visiting = new Set();
    const resolve = role => {
      if (!roles.has(role)) throw new TypeError('Unknown parent role.');
      if (visiting.has(role)) throw new TypeError('Role inheritance must be acyclic.');
      if (resolved.has(role)) return resolved.get(role);
      visiting.add(role);
      const rule = roles.get(role);
      let mask = maskFor(rule.permissions);
      for (const parent of rule.parents) mask |= resolve(parent);
      visiting.delete(role); resolved.set(role, mask);
      return mask;
    };
    for (const role of roles.keys()) resolve(role);
    return resolved;
  }
  #authorize(actor, action) {
    nameOf(actor);
    if (!this.checkPermission(this.#users.get(actor), action)) throw new Error('Denied: actor lacks ' + action + '.');
  }
  assignRole(user, role, actor) {
    this.#authorize(actor, 'roles:assign');
    nameOf(user); nameOf(role);
    if (!this.#roles.has(role)) throw new TypeError('Unknown role.');
    if (user === 'owner-demo') throw new Error('The bootstrap owner is fixed in this demo.');
    if (!this.#users.has(user) && this.#users.size >= 32) throw new RangeError('At most 32 demo users.');
    this.#users.set(user, role);
    return this.snapshot();
  }
  updateRole(role, value, actor) {
    // Authorize against the old policy before accepting any proposed grants.
    this.#authorize(actor, 'policy:manage');
    nameOf(role);
    if (!this.#roles.has(role)) throw new TypeError('Unknown role.');
    if (role === 'owner') throw new Error('The bootstrap owner policy is fixed.');
    const next = new Map(this.#roles);
    next.set(role, policy(value));
    this.#masks(next); // Validate the entire proposed graph before committing.
    this.#roles = next;
    return this.snapshot();
  }
  checkPermission(role, action) {
    if (typeof role !== 'string' || typeof action !== 'string' || !this.#roles.has(role)) return false;
    const bit = ACTIONS.indexOf(action);
    return bit >= 0 && (this.#masks().get(role) & (1 << bit)) !== 0;
  }
  /** All requested bits must be granted; the default role is customer. Zero requests no permissions. */
  evaluatePolicyBitmask(mask, role = 'customer') {
    if (!Number.isInteger(mask) || mask < 0 || mask > ALL) throw new TypeError('Mask must be an integer from 0 to ' + ALL + '.');
    return this.#roles.has(role) && (this.#masks().get(role) & mask) === mask;
  }
  snapshot() {
    const masks = this.#masks();
    return {
      roles: [...this.#roles].map(([name, rule]) => ({ name, parents: [...rule.parents], permissions: [...rule.permissions], mask: masks.get(name), directMask: maskFor(rule.permissions) })),
      users: [...this.#users].map(([user, role]) => ({ user, role })),
    };
  }
}

if (typeof document !== 'undefined') {
  let engine = new EcommerceStoreRbacEngine();
  const get = id => document.getElementById(id);
  const actor = () => get('actor').value;
  const notice = (text, error = false) => { get('notice').textContent = text; get('notice').setAttribute('role', error ? 'alert' : 'status'); };
  const attempt = fn => { try { fn(); render(); notice('Policy updated. All other grants were preserved.'); } catch (error) { render(); notice(error.message, true); } };
  const selectedRole = () => engine.snapshot().users.find(x => x.user === get('subject').value)?.role;
  function evaluate() {
    const role = selectedRole(), allowed = engine.checkPermission(role, get('action').value);
    get('access').textContent = (allowed ? 'ALLOWED' : 'DENIED') + ' · ' + (role || 'unknown role');
    get('access').className = allowed ? 'allow' : 'deny';
  }
  function render() {
    const snapshot = engine.snapshot(), body = get('matrix-body');
    const focused = body.contains(document.activeElement) ? document.activeElement.getAttribute('aria-label') : null;
    body.replaceChildren();
    for (const [bit, action] of ACTIONS.entries()) {
      const row = document.createElement('tr'), heading = document.createElement('th');
      heading.scope = 'row'; heading.textContent = action; row.append(heading);
      for (const role of snapshot.roles) {
        const cell = document.createElement('td'), label = document.createElement('label'), check = document.createElement('input'), detail = document.createElement('small');
        const inherited = Boolean(role.mask & (1 << bit)) && !(role.directMask & (1 << bit));
        check.type = 'checkbox'; check.checked = Boolean(role.mask & (1 << bit));
        check.disabled = inherited || role.name === 'owner';
        check.setAttribute('aria-label', role.name + ' ' + action);
        detail.textContent = inherited ? 'inherited' : role.name === 'owner' ? 'fixed' : 'direct';
        check.addEventListener('change', () => attempt(() => {
          const permissions = ACTIONS.filter((_, index) => role.directMask & (1 << index));
          const next = check.checked ? [...new Set([...permissions, action])] : permissions.filter(x => x !== action);
          engine.updateRole(role.name, { parents: role.parents, permissions: next }, actor());
        }));
        label.append(check, detail); cell.append(label); row.append(cell);
      }
      body.append(row);
    }
    get('role-summary').textContent = snapshot.roles.map(r => r.name + ' ← ' + (r.parents.join(', ') || 'no parents') + ' · mask ' + r.mask).join('\n');
    evaluate();
    if (focused) {
      const replacement = [...body.querySelectorAll('input')].find(input => input.getAttribute('aria-label') === focused);
      (replacement && !replacement.disabled ? replacement : body.closest('.table-scroll')).focus();
    }
  }
  get('assign').addEventListener('submit', event => {
    event.preventDefault(); attempt(() => engine.assignRole(get('subject').value, get('new-role').value, actor()));
  });
  for (const id of ['subject', 'action']) get(id).addEventListener('change', evaluate);
  get('mask-form').addEventListener('submit', event => {
    event.preventDefault();
    try {
      const raw = get('mask').value.trim();
      if (!/^\d+$/.test(raw)) throw new TypeError('Enter a whole-number mask from 0 to 127.');
      const allowed = engine.evaluatePolicyBitmask(Number(raw), selectedRole());
      notice((allowed ? 'ALLOWED' : 'DENIED') + ': all requested mask bits ' + raw + ' for ' + selectedRole() + '.');
    } catch (error) { notice(error.message, true); }
  });
  get('edit-policy').addEventListener('click', () => {
    const r = engine.snapshot().roles.find(x => x.name === get('edit-role').value);
    get('policy-json').value = JSON.stringify({ parents: r.parents, permissions: r.permissions }, null, 2);
    get('policy-error').textContent = ''; get('policy-dialog').showModal();
  });
  get('policy-form').addEventListener('submit', event => {
    event.preventDefault();
    try {
      const raw = get('policy-json').value;
      if (raw.length > 2048) throw new RangeError('Policy JSON is limited to 2 KB.');
      engine.updateRole(get('edit-role').value, JSON.parse(raw), actor());
      get('policy-dialog').close(); render(); notice('Policy saved. Effective inherited grants recalculated.');
    } catch (error) { get('policy-error').textContent = error.message; }
  });
  get('cancel-policy').addEventListener('click', () => get('policy-dialog').close());
  get('reset').addEventListener('click', () => { engine = new EcommerceStoreRbacEngine(); get('actor').value = 'owner-demo'; render(); notice('Default in-memory policies restored.'); });
  render();
}
