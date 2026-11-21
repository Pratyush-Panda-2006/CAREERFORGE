/**
 * Podcast Audio Stream - Node-Based Finite State Machine & Episode Production Visualizer
 * Models podcast episode creation workflow, validates event-driven transitions,
 * and generates Mermaid.js stateDiagram-v2 definitions.
 */

export class PodcastAudioStreamFsmVisualizer {
  constructor(initialState = 'EPISODE_PLANNING') {
    this.initialState = initialState;
    this.currentState = initialState;
    this.states = new Set([
      'EPISODE_PLANNING',
      'AUDIO_RECORDING',
      'POST_EDITING_MIX',
      'SHOW_NOTES_DRAFT',
      'SPONSOR_INSERTION',
      'EPISODE_PUBLISHED'
    ]);
    this.transitions = [];
    this.history = [];

    this.registerDefaultTransitions();
  }

  registerDefaultTransitions() {
    this.addTransition('EPISODE_PLANNING', 'START_RECORDING', 'AUDIO_RECORDING');
    this.addTransition('AUDIO_RECORDING', 'FINISH_TRACK_RECORD', 'POST_EDITING_MIX');
    this.addTransition('POST_EDITING_MIX', 'DRAFT_SHOW_NOTES', 'SHOW_NOTES_DRAFT');
    this.addTransition('SHOW_NOTES_DRAFT', 'ATTACH_SPONSORS', 'SPONSOR_INSERTION');
    this.addTransition('SPONSOR_INSERTION', 'DISTRIBUTE_FEED', 'EPISODE_PUBLISHED');
    this.addTransition('EPISODE_PUBLISHED', 'PLAN_NEXT_SEASON', 'EPISODE_PLANNING');
    this.addTransition('POST_EDITING_MIX', 'RE_RECORD_SEGMENT', 'AUDIO_RECORDING');
    this.addTransition('SPONSOR_INSERTION', 'REVISE_AUDIO_MIX', 'POST_EDITING_MIX');
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
    const fsm = new PodcastAudioStreamFsmVisualizer();

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
          empty.textContent = 'No events dispatched yet. Episode initialized in pre-production planning.';
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
