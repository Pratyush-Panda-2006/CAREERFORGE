/**
 * SaaS Launchpad - In-Browser Time-Travel State Debugger & Event Snapshot Replayer
 * Captures immutable state snapshots across workflow actions, enables scrubbing
 * through execution history, calculates JSON diffs, and supports replay export/import.
 */

export class SaasLaunchpadStateDebugger {
  constructor(initialState = {}) {
    this.history = [];
    this.currentIndex = -1;

    // Record initial genesis snapshot
    this.recordSnapshot('@@INIT_STATE', initialState);
  }

  deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => this.deepClone(item));
    const copy = {};
    for (const key of Object.keys(obj)) {
      copy[key] = this.deepClone(obj[key]);
    }
    return copy;
  }

  recordSnapshot(action, state) {
    // If we branched from a historical index, truncate subsequent redo states
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.currentIndex + 1);
    }

    const snapshot = {
      id: `snap_${Date.now()}_${this.history.length}`,
      index: this.history.length,
      action: typeof action === 'string' ? action : 'UNKNOWN_ACTION',
      state: this.deepClone(state),
      timestamp: Date.now()
    };

    this.history.push(snapshot);
    this.currentIndex = this.history.length - 1;
    return snapshot;
  }

  jumpToStep(index) {
    if (typeof index !== 'number' || isNaN(index)) {
      return null;
    }
    const clampedIndex = Math.max(0, Math.min(this.history.length - 1, index));
    this.currentIndex = clampedIndex;
    return this.deepClone(this.history[clampedIndex].state);
  }

  stepBackward() {
    if (this.currentIndex > 0) {
      return this.jumpToStep(this.currentIndex - 1);
    }
    return this.getCurrentState();
  }

  stepForward() {
    if (this.currentIndex < this.history.length - 1) {
      return this.jumpToStep(this.currentIndex + 1);
    }
    return this.getCurrentState();
  }

  getCurrentState() {
    if (this.currentIndex < 0 || !this.history[this.currentIndex]) {
      return null;
    }
    return this.deepClone(this.history[this.currentIndex].state);
  }

  getCurrentSnapshot() {
    if (this.currentIndex < 0 || !this.history[this.currentIndex]) {
      return null;
    }
    return this.history[this.currentIndex];
  }

  /**
   * Computes a structured key-level diff between two states.
   */
  computeDiff(s1 = {}, s2 = {}) {
    const keys = Array.from(new Set([...Object.keys(s1 || {}), ...Object.keys(s2 || {})]));
    const diffs = [];

    for (const key of keys) {
      const v1 = s1 ? s1[key] : undefined;
      const v2 = s2 ? s2[key] : undefined;

      if (v1 === undefined && v2 !== undefined) {
        diffs.push({ key, type: 'added', oldVal: null, newVal: v2 });
      } else if (v1 !== undefined && v2 === undefined) {
        diffs.push({ key, type: 'deleted', oldVal: v1, newVal: null });
      } else if (JSON.stringify(v1) !== JSON.stringify(v2)) {
        diffs.push({ key, type: 'modified', oldVal: v1, newVal: v2 });
      } else {
        diffs.push({ key, type: 'unchanged', oldVal: v1, newVal: v2 });
      }
    }

    return diffs;
  }

  exportReplay() {
    return JSON.stringify({
      app: 'SaaS Launchpad Time-Travel Replay',
      version: '2.1.0',
      exportedAt: new Date().toISOString(),
      stepCount: this.history.length,
      history: this.history
    }, null, 2);
  }

  importReplay(jsonString) {
    try {
      const parsed = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      if (!parsed || !Array.isArray(parsed.history) || parsed.history.length === 0) {
        return { success: false, reason: 'Invalid replay schema: missing history array' };
      }

      this.history = parsed.history.map((h, i) => ({
        id: h.id || `snap_imported_${i}`,
        index: i,
        action: h.action || 'IMPORTED_ACTION',
        state: this.deepClone(h.state || {}),
        timestamp: h.timestamp || Date.now()
      }));

      this.currentIndex = this.history.length - 1;
      return { success: true, count: this.history.length };
    } catch (err) {
      return { success: false, reason: err.message };
    }
  }
}
