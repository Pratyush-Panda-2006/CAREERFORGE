/**
 * Cybersecurity Sentinel - Node-Based Finite State Machine & Workflow Visualizer
 * Models security incident lifecycle postures, validates event-driven transitions,
 * and generates Mermaid.js stateDiagram-v2 definitions.
 */

export class CybersecuritySentinelFsmVisualizer {
  constructor(initialState = 'MONITORING_SECURE') {
    this.initialState = initialState;
    this.currentState = initialState;
    this.states = new Set([
      'MONITORING_SECURE',
      'ANOMALY_DETECTED',
      'THREAT_ANALYSIS',
      'QUARANTINE_ISOLATION',
      'INCIDENT_REMEDIATION',
      'FORENSIC_AUDIT'
    ]);
    this.transitions = [];
    this.history = [];

    this.registerDefaultTransitions();
  }

  registerDefaultTransitions() {
    this.addTransition('MONITORING_SECURE', 'FLAG_ANOMALY', 'ANOMALY_DETECTED');
    this.addTransition('ANOMALY_DETECTED', 'CORRELATE_THREAT', 'THREAT_ANALYSIS');
    this.addTransition('THREAT_ANALYSIS', 'TRIGGER_CONTAINMENT', 'QUARANTINE_ISOLATION');
    this.addTransition('QUARANTINE_ISOLATION', 'APPLY_REMEDIATION', 'INCIDENT_REMEDIATION');
    this.addTransition('INCIDENT_REMEDIATION', 'START_AUDIT', 'FORENSIC_AUDIT');
    this.addTransition('FORENSIC_AUDIT', 'CLEAR_POSTURE', 'MONITORING_SECURE');
    this.addTransition('ANOMALY_DETECTED', 'DISMISS_FALSE_POSITIVE', 'MONITORING_SECURE');
    this.addTransition('THREAT_ANALYSIS', 'DOWNGRADE_RISK', 'MONITORING_SECURE');
  }

  /**
   * Registers a transition rule between two states given an event trigger.
   * @param {string} from - Source state
   * @param {string} event - Action trigger
   * @param {string} to - Destination state
   */
  addTransition(from, event, to) {
    if (!from || !event || !to) {
      throw new Error('Invalid transition definition: from, event, and to must be specified');
    }
    this.states.add(from);
    this.states.add(to);
    this.transitions.push({ from, event, to });
  }

  /**
   * Dispatches an event from the active state, transitioning if allowed.
   * @param {string} event - Event to dispatch
   * @returns {{ success: boolean, error?: string, from?: string, event?: string, to?: string, currentState?: string }}
   */
  dispatch(event) {
    const match = this.transitions.find((t) => t.from === this.currentState && t.event === event);
    if (!match) {
      return {
        success: false,
        error: `Cannot dispatch event "${event}" from state "${this.currentState}"`,
        currentState: this.currentState
      };
    }

    const previousState = this.currentState;
    this.currentState = match.to;
    this.history.push({
      timestamp: new Date().toISOString(),
      from: previousState,
      event,
      to: this.currentState
    });

    return {
      success: true,
      from: previousState,
      event,
      to: this.currentState
    };
  }

  /**
   * Returns available events callable from the current state.
   * @returns {string[]}
   */
  getAvailableEvents() {
    return this.transitions
      .filter((t) => t.from === this.currentState)
      .map((t) => t.event);
  }

  /**
   * Exports the state machine schema as Mermaid.js stateDiagram-v2 definition.
   * @returns {string} Mermaid.js diagram source
   */
  exportMermaid() {
    const lines = ['stateDiagram-v2'];
    lines.push(`  [*] --> ${this.initialState}`);

    this.transitions.forEach((t) => {
      lines.push(`  ${t.from} --> ${t.to} : ${t.event}`);
    });

    return lines.join('\n');
  }

  /**
   * Resets machine back to default state and clears history log.
   */
  reset() {
    this.currentState = this.initialState;
    this.history = [];
  }
}

// Browser DOM UI controller
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const fsm = new CybersecuritySentinelFsmVisualizer();

    const stateBadge = document.getElementById('current-state-badge');
    const nodes = document.querySelectorAll('.fsm-node');
    const eventContainer = document.getElementById('event-buttons');
    const historyContainer = document.getElementById('history-log');
    const mermaidCode = document.getElementById('mermaid-code');
    const resetBtn = document.getElementById('reset-fsm-btn');
    const copyBtn = document.getElementById('copy-mermaid-btn');

    function updateView() {
      if (stateBadge) stateBadge.textContent = fsm.currentState;

      nodes.forEach((node) => {
        const nodeState = node.getAttribute('data-state');
        if (nodeState === fsm.currentState) {
          node.classList.add('active');
        } else {
          node.classList.remove('active');
        }
      });

      if (eventContainer) {
        eventContainer.textContent = '';
        const events = fsm.getAvailableEvents();
        if (events.length === 0) {
          const empty = document.createElement('span');
          empty.textContent = 'No outbound transitions available';
          empty.style.color = '#94a3b8';
          empty.style.fontSize = '0.82rem';
          eventContainer.appendChild(empty);
        } else {
          events.forEach((evt) => {
            const btn = document.createElement('button');
            btn.className = 'event-btn';
            btn.textContent = `▶ ${evt}`;
            btn.addEventListener('click', () => {
              fsm.dispatch(evt);
              updateView();
            });
            eventContainer.appendChild(btn);
          });
        }
      }

      if (mermaidCode) {
        mermaidCode.textContent = fsm.exportMermaid();
      }

      if (historyContainer) {
        if (fsm.history.length === 0) {
          historyContainer.textContent = '';
          const empty = document.createElement('div');
          empty.className = 'history-empty';
          empty.textContent = 'No events dispatched yet. Machine initialized at baseline.';
          historyContainer.appendChild(empty);
        } else {
          historyContainer.textContent = '';
          fsm.history.slice().reverse().forEach((h) => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.textContent = `[${h.timestamp.slice(11, 19)}] ${h.from} ➔ ${h.to} via (${h.event})`;
            historyContainer.appendChild(item);
          });
        }
      }
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        fsm.reset();
        updateView();
      });
    }

    if (copyBtn && mermaidCode) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(mermaidCode.textContent).then(() => {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => {
            copyBtn.textContent = 'Copy Mermaid';
          }, 1500);
        });
      });
    }

    updateView();
  });
}
