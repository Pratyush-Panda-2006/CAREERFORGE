/**
 * Legal Smart Contracts - In-Browser Time-Travel State Debugger
 */

export class LegalSmartContractsStateDebugger {
  constructor(initialState = {}) {
    this.history = [];
    this.currentIndex = -1;
    this.maxSnapshots = 150;
    if (Object.keys(initialState).length > 0) {
      this.recordSnapshot({ type: '@@INIT' }, initialState);
    }
  }

  cloneState(state) {
    if (state === null || typeof state !== 'object') return state;
    try { return structuredClone(state); } catch { return JSON.parse(JSON.stringify(state)); }
  }

  recordSnapshot(action, state) {
    if (!action || typeof action !== 'object' || !action.type) {
      throw new Error('Action must be an object with a valid "type" property.');
    }
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }
    const snap = {
      id: 'snap_' + Math.random().toString(36).slice(2, 9),
      action: this.cloneState(action),
      state: this.cloneState(state || {}),
      timestamp: Date.now()
    };
    this.history.push(snap);
    if (this.history.length > this.maxSnapshots) this.history.shift();
    this.currentIndex = this.history.length - 1;
    return snap;
  }

  jumpToStep(index) {
    if (this.history.length === 0) return null;
    this.currentIndex = Math.max(0, Math.min(index, this.history.length - 1));
    return this.getCurrentState();
  }

  stepForward() {
    if (this.currentIndex < this.history.length - 1) return this.jumpToStep(this.currentIndex + 1);
    return this.getCurrentState();
  }

  stepBackward() {
    if (this.currentIndex > 0) return this.jumpToStep(this.currentIndex - 1);
    return this.getCurrentState();
  }

  getCurrentState() {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return this.cloneState(this.history[this.currentIndex].state);
    }
    return null;
  }

  getHistory() {
    return this.cloneState(this.history);
  }

  computeDiff(s1 = {}, s2 = {}) {
    const changes = [];
    const allKeys = Array.from(new Set([...Object.keys(s1 || {}), ...Object.keys(s2 || {})]));
    for (const key of allKeys) {
      const vA = s1[key], vB = s2[key];
      if (!(key in (s1 || {}))) changes.push({ kind: 'ADDED', key, current: this.cloneState(vB) });
      else if (!(key in (s2 || {}))) changes.push({ kind: 'REMOVED', key, prev: this.cloneState(vA) });
      else if (JSON.stringify(vA) !== JSON.stringify(vB)) changes.push({ kind: 'MODIFIED', key, prev: this.cloneState(vA), current: this.cloneState(vB) });
    }
    return { totalChanges: changes.length, changes, timestamp: Date.now() };
  }

  exportReplay() {
    return JSON.stringify({ schema: 'nsoc-state-replay-v1', module: 'legal-smart-contracts', exportedAt: Date.now(), snapshots: this.history }, null, 2);
  }

  importReplay(jsonStr) {
    const parsed = JSON.parse(jsonStr);
    this.history = parsed.snapshots.map(s => ({ ...s, action: this.cloneState(s.action), state: this.cloneState(s.state) }));
    this.currentIndex = this.history.length - 1;
    return this.history.length;
  }
}
