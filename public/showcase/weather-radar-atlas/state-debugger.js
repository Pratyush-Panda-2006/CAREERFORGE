/**
 * Weather Radar Atlas - In-Browser Time-Travel State Debugger & Event Snapshot Replay Module
 * Captures immutable state snapshots of application actions, lifecycle transitions,
 * and computes recursive structural diffs for auditing and debugging.
 */

export class WeatherRadarAtlasStateDebugger {
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
   * Returns current active snapshot record.
   */
  getCurrentSnapshot() {
    if (this.currentIndex >= 0 && this.currentIndex < this.history.length) {
      return this.cloneState(this.history[this.currentIndex]);
    }
    return null;
  }

  /**
   * Returns snapshot history array.
   */
  getHistory() {
    return this.cloneState(this.history);
  }

  /**
   * Computes recursive key-level structural diff between two state snapshots.
   */
  computeDiff(s1 = {}, s2 = {}) {
    const changes = [];
    const stateA = s1 || {};
    const stateB = s2 || {};

    const allKeys = Array.from(new Set([...Object.keys(stateA), ...Object.keys(stateB)]));

    for (const key of allKeys) {
      const valA = stateA[key];
      const valB = stateB[key];

      if (!(key in stateA)) {
        changes.push({ kind: 'ADDED', key, prev: undefined, current: this.cloneState(valB) });
      } else if (!(key in stateB)) {
        changes.push({ kind: 'REMOVED', key, prev: this.cloneState(valA), current: undefined });
      } else if (JSON.stringify(valA) !== JSON.stringify(valB)) {
        changes.push({ kind: 'MODIFIED', key, prev: this.cloneState(valA), current: this.cloneState(valB) });
      }
    }

    return {
      totalChanges: changes.length,
      changes,
      timestamp: Date.now()
    };
  }

  /**
   * Serializes history log into replay JSON format.
   */
  exportReplay() {
    return JSON.stringify({
      schema: 'nsoc-state-replay-v1',
      module: 'weather-radar-atlas',
      exportedAt: Date.now(),
      snapshots: this.history
    }, null, 2);
  }

  /**
   * Deserializes and loads replay history into active timeline.
   */
  importReplay(jsonStr) {
    if (typeof jsonStr !== 'string') {
      throw new TypeError('Replay payload must be a JSON string.');
    }
    const parsed = JSON.parse(jsonStr);
    if (!parsed || !Array.isArray(parsed.snapshots)) {
      throw new Error('Malformed replay format: missing "snapshots" array.');
    }
    this.history = parsed.snapshots.map((s) => ({
      id: s.id || 'snap_' + Math.random().toString(36).slice(2, 9),
      action: this.cloneState(s.action),
      state: this.cloneState(s.state),
      timestamp: s.timestamp || Date.now()
    }));
    this.currentIndex = this.history.length - 1;
    return this.history.length;
  }

  /**
   * Resets the debugger state and clears history.
   */
  clear() {
    this.history = [];
    this.currentIndex = -1;
  }
}
