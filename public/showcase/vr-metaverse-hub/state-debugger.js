/**
 * VR Metaverse Hub - In-Browser Time-Travel State Debugger & Event Snapshot Replay Module
 * Issue #1133 - NSoC '26 Level 3 Feature
 */

export class VrMetaverseHubStateDebugger {
  constructor(initialState = {}) {
    this.snapshots = [];
    this.currentIndex = -1;
    this.subscribers = new Set();

    if (initialState && Object.keys(initialState).length > 0) {
      this.recordSnapshot('@@INIT', initialState);
    }
  }

  // Deep clone utility to guarantee immutability across state snapshots
  static deepClone(obj) {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      return obj.map(item => VrMetaverseHubStateDebugger.deepClone(item));
    }
    const cloned = {};
    for (const key of Object.keys(obj)) {
      cloned[key] = VrMetaverseHubStateDebugger.deepClone(obj[key]);
    }
    return cloned;
  }

  recordSnapshot(action, state) {
    const cleanAction = typeof action === 'string' ? action : (action?.type || 'UNKNOWN_ACTION');
    const clonedState = VrMetaverseHubStateDebugger.deepClone(state || {});

    // If playhead was scrubbed backward, truncate future branch on new action
    if (this.currentIndex >= 0 && this.currentIndex < this.snapshots.length - 1) {
      this.snapshots = this.snapshots.slice(0, this.currentIndex + 1);
    }

    const snapshot = {
      index: this.snapshots.length,
      action: cleanAction,
      timestamp: Date.now(),
      timeFormatted: new Date().toLocaleTimeString(),
      state: clonedState
    };

    this.snapshots.push(snapshot);
    this.currentIndex = this.snapshots.length - 1;
    this._notify();
    return snapshot;
  }

  jumpToStep(index) {
    if (this.snapshots.length === 0) return null;
    const clampedIndex = Math.max(0, Math.min(index, this.snapshots.length - 1));
    this.currentIndex = clampedIndex;
    this._notify();
    return this.snapshots[clampedIndex];
  }

  stepBack() {
    return this.jumpToStep(this.currentIndex - 1);
  }

  stepForward() {
    return this.jumpToStep(this.currentIndex + 1);
  }

  getCurrentSnapshot() {
    if (this.currentIndex < 0 || this.currentIndex >= this.snapshots.length) {
      return null;
    }
    return this.snapshots[this.currentIndex];
  }

  computeDiff(s1 = {}, s2 = {}) {
    const diff = {
      added: {},
      modified: {},
      deleted: {}
    };

    const keys1 = Object.keys(s1 || {});
    const keys2 = Object.keys(s2 || {});
    const allKeys = new Set([...keys1, ...keys2]);

    for (const key of allKeys) {
      const v1 = s1 ? s1[key] : undefined;
      const v2 = s2 ? s2[key] : undefined;

      if (v1 === undefined && v2 !== undefined) {
        diff.added[key] = v2;
      } else if (v1 !== undefined && v2 === undefined) {
        diff.deleted[key] = v1;
      } else if (JSON.stringify(v1) !== JSON.stringify(v2)) {
        diff.modified[key] = { from: v1, to: v2 };
      }
    }

    return diff;
  }

  exportReplay() {
    return JSON.stringify({
      version: '1.0.0',
      system: 'VrMetaverseHub-StateDebugger',
      exportedAt: new Date().toISOString(),
      snapshotCount: this.snapshots.length,
      snapshots: this.snapshots
    }, null, 2);
  }

  importReplay(jsonStr) {
    try {
      const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
      if (!parsed || !Array.isArray(parsed.snapshots)) {
        throw new Error('Invalid replay JSON format: missing snapshots array');
      }
      this.snapshots = parsed.snapshots.map((s, idx) => ({
        index: idx,
        action: s.action || 'REPLAY_ACTION',
        timestamp: s.timestamp || Date.now(),
        timeFormatted: s.timeFormatted || new Date().toLocaleTimeString(),
        state: VrMetaverseHubStateDebugger.deepClone(s.state || {})
      }));
      this.currentIndex = this.snapshots.length - 1;
      this._notify();
      return true;
    } catch {
      return false;
    }
  }

  subscribe(fn) {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  _notify() {
    const current = this.getCurrentSnapshot();
    for (const sub of this.subscribers) {
      try {
        sub(current, this.currentIndex, this.snapshots);
      } catch {
        // Suppress subscriber errors
      }
    }
  }
}

// Browser UI initialization
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const debuggerEngine = new VrMetaverseHubStateDebugger({
      avatar: 'CyberNomad',
      position: { x: 0, y: 1.6, z: 0 },
      room: 'Lobby',
      activeUsers: 14,
      fps: 90
    });

    const playheadInput = document.getElementById('playheadSlider');
    const stepLabel = document.getElementById('stepIndicator');
    const actionHistoryList = document.getElementById('actionHistoryList');
    const stateInspector = document.getElementById('stateInspectorView');
    const diffInspector = document.getElementById('diffInspectorView');

    function renderUI() {
      const current = debuggerEngine.getCurrentSnapshot();
      const all = debuggerEngine.snapshots;

      if (playheadInput) {
        playheadInput.max = Math.max(0, all.length - 1);
        playheadInput.value = debuggerEngine.currentIndex;
      }

      if (stepLabel) {
        stepLabel.textContent = `Step ${debuggerEngine.currentIndex + 1} of ${all.length}`;
      }

      if (stateInspector && current) {
        stateInspector.textContent = JSON.stringify(current.state, null, 2);
      }

      if (diffInspector) {
        const prev = debuggerEngine.currentIndex > 0 ? all[debuggerEngine.currentIndex - 1] : null;
        if (prev && current) {
          const diff = debuggerEngine.computeDiff(prev.state, current.state);
          diffInspector.textContent = JSON.stringify(diff, null, 2);
        } else {
          diffInspector.textContent = 'Initial root state. No previous step diff.';
        }
      }

      if (actionHistoryList) {
        actionHistoryList.replaceChildren();
        all.forEach((snap, idx) => {
          const item = document.createElement('div');
          item.className = `action-item ${idx === debuggerEngine.currentIndex ? 'active' : ''}`;
          item.innerHTML = `
            <span class="action-index">#${snap.index}</span>
            <span class="action-name">${snap.action}</span>
            <span class="action-time">${snap.timeFormatted}</span>
          `;
          item.addEventListener('click', () => {
            debuggerEngine.jumpToStep(idx);
          });
          actionHistoryList.appendChild(item);
        });
      }
    }

    debuggerEngine.subscribe(renderUI);

    document.getElementById('btnStepBack')?.addEventListener('click', () => debuggerEngine.stepBack());
    document.getElementById('btnStepForward')?.addEventListener('click', () => debuggerEngine.stepForward());

    playheadInput?.addEventListener('input', (e) => {
      debuggerEngine.jumpToStep(parseInt(e.target.value, 10));
    });

    document.getElementById('btnMoveAvatar')?.addEventListener('click', () => {
      const current = debuggerEngine.getCurrentSnapshot();
      const state = VrMetaverseHubStateDebugger.deepClone(current.state);
      state.position.x += 1.5;
      state.position.z -= 0.8;
      debuggerEngine.recordSnapshot('AVATAR_TELEPORT', state);
    });

    document.getElementById('btnSwitchRoom')?.addEventListener('click', () => {
      const current = debuggerEngine.getCurrentSnapshot();
      const state = VrMetaverseHubStateDebugger.deepClone(current.state);
      const rooms = ['Lobby', 'Neon Oasis', 'Holo Arena', 'Zenith Peak'];
      const nextRoom = rooms[(rooms.indexOf(state.room) + 1) % rooms.length];
      state.room = nextRoom;
      state.activeUsers = Math.floor(Math.random() * 50) + 10;
      debuggerEngine.recordSnapshot(`ENTER_ROOM_${nextRoom.toUpperCase().replace(/\s+/g, '_')}`, state);
    });

    document.getElementById('btnExportReplay')?.addEventListener('click', () => {
      const json = debuggerEngine.exportReplay();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vr-metaverse-replay-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });

    renderUI();
  });
}
