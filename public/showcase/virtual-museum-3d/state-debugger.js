/**
 * Virtual Museum 3D - In-Browser Time-Travel State Debugger & Event Snapshot Replay
 */

export class VirtualMuseum3dStateDebugger {
  constructor(initialState = {}) {
    this.snapshots = [];
    this.currentIndex = -1;
    if (Object.keys(initialState).length > 0) {
      this.recordSnapshot('@@INIT', initialState);
    }
  }

  // Deep clone helper to ensure immutability
  static deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    return JSON.parse(JSON.stringify(obj));
  }

  recordSnapshot(action, state) {
    const cleanAction = String(action || 'ANONYMOUS_ACTION');
    const clonedState = VirtualMuseum3dStateDebugger.deepClone(state);

    const snapshot = {
      index: this.snapshots.length,
      action: cleanAction,
      state: clonedState,
      timestamp: Date.now(),
      timeFormatted: new Date().toLocaleTimeString()
    };

    this.snapshots.push(snapshot);
    this.currentIndex = this.snapshots.length - 1;
    return snapshot;
  }

  jumpToStep(index) {
    if (this.snapshots.length === 0) return null;
    const clamped = Math.max(0, Math.min(this.snapshots.length - 1, Number(index) || 0));
    this.currentIndex = clamped;
    return this.snapshots[clamped];
  }

  getCurrentSnapshot() {
    if (this.currentIndex >= 0 && this.currentIndex < this.snapshots.length) {
      return this.snapshots[this.currentIndex];
    }
    return null;
  }

  computeDiff(s1, s2) {
    const diff = {
      additions: [],
      deletions: [],
      modifications: []
    };

    const obj1 = s1 || {};
    const obj2 = s2 || {};

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    for (const key of keys2) {
      if (!(key in obj1)) {
        diff.additions.push({ key, value: obj2[key] });
      } else if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
        diff.modifications.push({ key, oldValue: obj1[key], newValue: obj2[key] });
      }
    }

    for (const key of keys1) {
      if (!(key in obj2)) {
        diff.deletions.push({ key, oldValue: obj1[key] });
      }
    }

    return diff;
  }

  exportReplay() {
    return JSON.stringify({
      version: '1.0.0',
      system: 'Virtual Museum 3DStateDebugger',
      exportedAt: new Date().toISOString(),
      count: this.snapshots.length,
      snapshots: this.snapshots
    }, null, 2);
  }

  importReplay(jsonStr) {
    const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
    if (!parsed || !Array.isArray(parsed.snapshots)) {
      throw new Error('Invalid replay JSON format');
    }
    this.snapshots = parsed.snapshots;
    this.currentIndex = this.snapshots.length > 0 ? this.snapshots.length - 1 : -1;
    return this.snapshots.length;
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const debuggerInstance = new VirtualMuseum3dStateDebugger({
      status: 'idle',
      stepCount: 0,
      domain: 'Virtual Gallery'
    });

    const stepBackBtn = document.getElementById('stepBackBtn');
    const stepForwardBtn = document.getElementById('stepForwardBtn');
    const stepIndicator = document.getElementById('stepIndicator');
    const scrubber = document.getElementById('timelineScrubber');
    const tableBody = document.getElementById('actionTableBody');
    const actionLabel = document.getElementById('activeActionLabel');
    const jsonDisplay = document.getElementById('stateJsonDisplay');
    const addSpan = document.getElementById('diffAddCount');
    const delSpan = document.getElementById('diffDelCount');
    const modSpan = document.getElementById('diffModCount');

    function renderView() {
      const total = debuggerInstance.snapshots.length;
      const curIdx = debuggerInstance.currentIndex;

      if (scrubber) {
        scrubber.max = String(Math.max(0, total - 1));
        scrubber.value = String(Math.max(0, curIdx));
      }

      if (stepIndicator) {
        stepIndicator.textContent = `Step ${total > 0 ? curIdx + 1 : 0} / ${total}`;
      }

      const current = debuggerInstance.getCurrentSnapshot();
      if (current) {
        if (actionLabel) actionLabel.textContent = `${current.action} (#${current.index + 1})`;
        if (jsonDisplay) jsonDisplay.textContent = JSON.stringify(current.state, null, 2);

        // Compute diff against previous step
        const prev = curIdx > 0 ? debuggerInstance.snapshots[curIdx - 1] : null;
        const diff = debuggerInstance.computeDiff(prev ? prev.state : {}, current.state);

        if (addSpan) addSpan.textContent = `+${diff.additions.length} additions`;
        if (delSpan) delSpan.textContent = `-${diff.deletions.length} deletions`;
        if (modSpan) modSpan.textContent = `~${diff.modifications.length} modified`;
      }

      if (tableBody) {
        tableBody.replaceChildren();
        debuggerInstance.snapshots.forEach((snap, idx) => {
          const row = document.createElement('tr');
          if (idx === curIdx) row.className = 'active-step';
          row.style.cursor = 'pointer';
          row.onclick = () => {
            debuggerInstance.jumpToStep(idx);
            renderView();
          };

          const cIdx = document.createElement('td');
          cIdx.textContent = String(idx + 1);
          const cAction = document.createElement('td');
          cAction.textContent = snap.action;
          const cTime = document.createElement('td');
          cTime.textContent = snap.timeFormatted;

          row.appendChild(cIdx);
          row.appendChild(cAction);
          row.appendChild(cTime);
          tableBody.appendChild(row);
        });
      }
    }

    stepBackBtn?.addEventListener('click', () => {
      debuggerInstance.jumpToStep(debuggerInstance.currentIndex - 1);
      renderView();
    });

    stepForwardBtn?.addEventListener('click', () => {
      debuggerInstance.jumpToStep(debuggerInstance.currentIndex + 1);
      renderView();
    });

    scrubber?.addEventListener('input', (e) => {
      debuggerInstance.jumpToStep(Number(e.target.value));
      renderView();
    });

    document.getElementById('recordAction1Btn')?.addEventListener('click', () => {
      const current = debuggerInstance.getCurrentSnapshot();
      const nextState = Object.assign({}, current ? current.state : {}, {
        activeWing: 'Renaissance', selectedExhibit: 'Mona Lisa 3D', lightingIntensity: 0.85
      });
      debuggerInstance.recordSnapshot('SELECT_EXHIBIT_WING', nextState);
      renderView();
    });

    document.getElementById('recordAction2Btn')?.addEventListener('click', () => {
      const current = debuggerInstance.getCurrentSnapshot();
      const nextState = Object.assign({}, current ? current.state : {}, {
        vrMode: true, spatialAudio: 'Dolby Atmos', fov: 110
      });
      debuggerInstance.recordSnapshot('ENABLE_VR_IMMERSION', nextState);
      renderView();
    });

    document.getElementById('exportReplayBtn')?.addEventListener('click', () => {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(debuggerInstance.exportReplay());
      const dlAnchor = document.createElement('a');
      dlAnchor.setAttribute('href', dataStr);
      dlAnchor.setAttribute('download', `virtual-museum-3d-replay-${Date.now()}.json`);
      dlAnchor.click();
    });

    renderView();
  });
}
