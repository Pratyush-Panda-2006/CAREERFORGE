/**
 * Culinary Bistro - In-Browser Time-Travel State Debugger & Event Snapshot Replay Module
 * Captures immutable state snapshots of dining table reservations, menu item cart mutations,
 * pricing modifiers, and computes recursive structural diffs for instant replay and audit.
 */

export class CulinaryBistroStateDebugger {
  constructor(initialState = {}) {
    this.history = [];
    this.currentIndex = -1;
    this.maxSnapshots = 150;

    if (Object.keys(initialState).length > 0) {
      this.recordSnapshot({ type: '@@INIT' }, initialState);
    }
  }

  /**
   * Deep clones any serializable JavaScript state structure.
   */
  cloneState(state) {
    if (state === null || typeof state !== 'object') {
      return state;
    }
    try {
      if (typeof structuredClone === 'function') {
        return structuredClone(state);
      }
      return JSON.parse(JSON.stringify(state));
    } catch {
      return JSON.parse(JSON.stringify(state));
    }
  }

  /**
   * Records a snapshot of action and current application state.
   */
  recordSnapshot(action, state) {
    if (!action || typeof action !== 'object' || !action.type) {
      throw new Error('Action must be an object with a valid "type" property.');
    }

    // If we scrubbed backward and recorded new action, discard forward timeline
    if (this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    const snapshot = {
      id: 'snap_' + Math.random().toString(36).slice(2, 9),
      action: this.cloneState(action),
      state: this.cloneState(state || {}),
      timestamp: Date.now()
    };

    this.history.push(snapshot);
    if (this.history.length > this.maxSnapshots) {
      this.history.shift();
    }
    this.currentIndex = this.history.length - 1;

    return snapshot;
  }

  /**
   * Jumps timeline directly to a given snapshot step index.
   */
  jumpToStep(index) {
    if (this.history.length === 0) return null;
    const clamped = Math.max(0, Math.min(index, this.history.length - 1));
    this.currentIndex = clamped;
    return this.getCurrentState();
  }

  /**
   * Steps one frame forward in history.
   */
  stepForward() {
    if (this.currentIndex < this.history.length - 1) {
      return this.jumpToStep(this.currentIndex + 1);
    }
    return this.getCurrentState();
  }

  /**
   * Steps one frame backward in history.
   */
  stepBackward() {
    if (this.currentIndex > 0) {
      return this.jumpToStep(this.currentIndex - 1);
    }
    return this.getCurrentState();
  }

  /**
   * Returns current active state.
   */
  getCurrentState() {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return this.cloneState(this.history[this.currentIndex].state);
    }
    return null;
  }

  /**
   * Returns complete history array.
   */
  getHistory() {
    return this.history.map((s) => ({
      id: s.id,
      action: this.cloneState(s.action),
      state: this.cloneState(s.state),
      timestamp: s.timestamp
    }));
  }

  /**
   * Computes a structural diff comparing previous state s1 with current state s2.
   */
  computeDiff(s1, s2) {
    const diff = {
      changes: [],
      timestamp: Date.now()
    };

    const obj1 = s1 || {};
    const obj2 = s2 || {};

    const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

    for (const key of allKeys) {
      const val1 = obj1[key];
      const val2 = obj2[key];

      if (!(key in obj1)) {
        diff.changes.push({ key, type: 'ADDED', oldValue: undefined, newValue: this.cloneState(val2) });
      } else if (!(key in obj2)) {
        diff.changes.push({ key, type: 'REMOVED', oldValue: this.cloneState(val1), newValue: undefined });
      } else if (JSON.stringify(val1) !== JSON.stringify(val2)) {
        diff.changes.push({ key, type: 'MODIFIED', oldValue: this.cloneState(val1), newValue: this.cloneState(val2) });
      }
    }

    return diff;
  }

  /**
   * Serializes recorded history into exportable JSON string.
   */
  exportReplay() {
    return JSON.stringify({
      version: '1.0.0',
      exportedAt: Date.now(),
      totalSnapshots: this.history.length,
      history: this.getHistory()
    }, null, 2);
  }

  /**
   * Imports an external replay history JSON payload.
   */
  importReplay(jsonString) {
    try {
      const parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      if (!parsed || !Array.isArray(parsed.history)) {
        throw new Error('Invalid replay format: missing history array.');
      }

      this.history = parsed.history.map((s) => ({
        id: s.id || ('snap_' + Math.random().toString(36).slice(2, 9)),
        action: this.cloneState(s.action || { type: 'UNKNOWN' }),
        state: this.cloneState(s.state || {}),
        timestamp: s.timestamp || Date.now()
      }));

      this.currentIndex = this.history.length - 1;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clears all snapshot history.
   */
  clear() {
    this.history = [];
    this.currentIndex = -1;
  }
}
