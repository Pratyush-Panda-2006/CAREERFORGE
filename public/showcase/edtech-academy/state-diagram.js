/**
 * Edtech Academy - Node-Based Finite State Machine & Curriculum Workflow Visualizer
 * Models student learning journey lifecycle, validates event-driven transitions,
 * and generates Mermaid.js stateDiagram-v2 definitions.
 */

export class EdtechAcademyFsmVisualizer {
  constructor(initialState = 'COURSE_ENROLLED') {
    this.initialState = initialState;
    this.currentState = initialState;
    this.states = new Set([
      'COURSE_ENROLLED',
      'LESSON_PROGRESS',
      'QUIZ_ASSESSMENT',
      'PROJECT_SUBMISSION',
      'PEER_REVIEW',
      'CERTIFICATE_ISSUED'
    ]);
    this.transitions = [];
    this.history = [];

    this.registerDefaultTransitions();
  }

  registerDefaultTransitions() {
    this.addTransition('COURSE_ENROLLED', 'START_LESSON', 'LESSON_PROGRESS');
    this.addTransition('LESSON_PROGRESS', 'TAKE_QUIZ', 'QUIZ_ASSESSMENT');
    this.addTransition('QUIZ_ASSESSMENT', 'SUBMIT_PROJECT', 'PROJECT_SUBMISSION');
    this.addTransition('PROJECT_SUBMISSION', 'REQUEST_PEER_REVIEW', 'PEER_REVIEW');
    this.addTransition('PEER_REVIEW', 'APPROVE_GRADUATION', 'CERTIFICATE_ISSUED');
    this.addTransition('CERTIFICATE_ISSUED', 'ARCHIVE_COURSE', 'COURSE_ENROLLED');
    this.addTransition('QUIZ_ASSESSMENT', 'RETAKE_LESSON', 'LESSON_PROGRESS');
    this.addTransition('PROJECT_SUBMISSION', 'REVISE_SUBMISSION', 'LESSON_PROGRESS');
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
        error: `Cannot dispatch event "${event}" from state "${this.currentState}"`
      };
    }

    const previousState = this.currentState;
    this.currentState = match.to;
    this.history.push({
      timestamp: new Date().toISOString(),
      from: previousState,
      event,
      to: match.to
    });

    return {
      success: true,
      from: previousState,
      event,
      to: match.to,
      currentState: this.currentState
    };
  }

  /**
   * Returns list of allowed event triggers for current active state.
   * @returns {string[]} Allowed event triggers
   */
  getAvailableEvents() {
    return this.transitions
      .filter((t) => t.from === this.currentState)
      .map((t) => t.event);
  }

  /**
   * Generates a standard Mermaid.js stateDiagram-v2 definition representing state topology.
   * @returns {string} Mermaid.js graph code
   */
  exportMermaid() {
    let mermaid = 'stateDiagram-v2\n';
    mermaid += `    [*] --> ${this.initialState}\n`;
    for (const t of this.transitions) {
      mermaid += `    ${t.from} --> ${t.to} : ${t.event}\n`;
    }
    return mermaid;
  }

  /**
   * Resets the finite state machine to initial configuration.
   */
  reset() {
    this.currentState = this.initialState;
    this.history = [];
  }
}

// Browser DOM UI controller
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const fsm = new EdtechAcademyFsmVisualizer();

    const stateBadge = document.getElementById('current-state-badge');
    const resetBtn = document.getElementById('reset-fsm-btn');
    const eventButtonsBox = document.getElementById('event-buttons');
    const mermaidCodeBox = document.getElementById('mermaid-code');
    const historyListBox = document.getElementById('history-log');
    const copyMermaidBtn = document.getElementById('copy-mermaid-btn');
    const nodeElements = document.querySelectorAll('.fsm-node');

    function refreshUI() {
      if (stateBadge) stateBadge.textContent = fsm.currentState;

      nodeElements.forEach((node) => {
        if (node.getAttribute('data-state') === fsm.currentState) {
          node.classList.add('active');
        } else {
          node.classList.remove('active');
        }
      });

      if (eventButtonsBox) {
        eventButtonsBox.textContent = '';
        const events = fsm.getAvailableEvents();
        if (events.length === 0) {
          const empty = document.createElement('span');
          empty.className = 'history-empty';
          empty.textContent = 'Terminal state reached or no actions available.';
          eventButtonsBox.appendChild(empty);
        } else {
          events.forEach((ev) => {
            const btn = document.createElement('button');
            btn.className = 'event-btn';
            btn.textContent = ev;
            btn.addEventListener('click', () => {
              fsm.dispatch(ev);
              refreshUI();
            });
            eventButtonsBox.appendChild(btn);
          });
        }
      }

      if (mermaidCodeBox) {
        mermaidCodeBox.textContent = fsm.exportMermaid();
      }

      if (historyListBox) {
        historyListBox.textContent = '';
        if (fsm.history.length === 0) {
          const empty = document.createElement('div');
          empty.className = 'history-empty';
          empty.textContent = 'No events dispatched yet. Student initialized at enrollment.';
          historyListBox.appendChild(empty);
        } else {
          fsm.history.forEach((h) => {
            const entry = document.createElement('div');
            entry.className = 'history-entry';
            entry.textContent = `[${h.timestamp.slice(11, 19)}] ${h.from} ➔ ${h.to} via (${h.event})`;
            historyListBox.appendChild(entry);
          });
        }
      }
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        fsm.reset();
        refreshUI();
      });
    }

    if (copyMermaidBtn && mermaidCodeBox) {
      copyMermaidBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(fsm.exportMermaid()).then(() => {
          const original = copyMermaidBtn.textContent;
          copyMermaidBtn.textContent = 'Copied!';
          setTimeout(() => {
            copyMermaidBtn.textContent = original;
          }, 1500);
        });
      });
    }

    refreshUI();
  });
}
