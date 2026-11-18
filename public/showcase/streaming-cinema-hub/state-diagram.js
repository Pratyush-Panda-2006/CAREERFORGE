/**
 * Streaming Cinema Hub - Node-Based Finite State Machine & Playback Lifecycle Visualizer
 * Models video playback pipeline states, validates guarded event transitions,
 * records transition histories, and serializes graph schemas to Mermaid.js stateDiagram-v2.
 */

export class StreamingCinemaHubFsmVisualizer {
  constructor(initialState = 'IDLE_BROWSE') {
    this.initialState = initialState;
    this.currentState = initialState;
    this.states = new Set([
      'IDLE_BROWSE',
      'PREVIEW_BUFFERING',
      'PLAYING_4K_STREAM',
      'PLAYBACK_PAUSED',
      'DOWNLOAD_OFFLINE',
      'STREAM_ERROR'
    ]);
    this.transitions = [];
    this.history = [];

    this.registerDefaultTransitions();
  }

  registerDefaultTransitions() {
    this.addTransition('IDLE_BROWSE', 'SELECT_TITLE', 'PREVIEW_BUFFERING');
    this.addTransition('PREVIEW_BUFFERING', 'BUFFER_COMPLETE', 'PLAYING_4K_STREAM');
    this.addTransition('PREVIEW_BUFFERING', 'NETWORK_TIMEOUT', 'STREAM_ERROR');
    this.addTransition('PLAYING_4K_STREAM', 'PAUSE', 'PLAYBACK_PAUSED');
    this.addTransition('PLAYBACK_PAUSED', 'RESUME', 'PLAYING_4K_STREAM');
    this.addTransition('PLAYING_4K_STREAM', 'CACHE_OFFLINE', 'DOWNLOAD_OFFLINE');
    this.addTransition('DOWNLOAD_OFFLINE', 'FINISH_DOWNLOAD', 'PLAYBACK_PAUSED');
    this.addTransition('PLAYING_4K_STREAM', 'STOP', 'IDLE_BROWSE');
    this.addTransition('PLAYBACK_PAUSED', 'STOP', 'IDLE_BROWSE');
    this.addTransition('STREAM_ERROR', 'RETRY', 'PREVIEW_BUFFERING');
  }

  /**
   * Adds a valid transition between two states with an associated event trigger.
   */
  addTransition(from, event, to) {
    if (!from || !event || !to) {
      throw new Error('Invalid transition definition: from, event, and to must be defined');
    }
    this.states.add(from);
    this.states.add(to);
    this.transitions.push({ from, event, to });
  }

  /**
   * Dispatches an event from the current state and triggers transition if valid.
   */
  dispatch(event) {
    const match = this.transitions.find(t => t.from === this.currentState && t.event === event);
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
   * Returns list of available events that can be legally dispatched from current state.
   */
  getAvailableEvents() {
    return this.transitions
      .filter(t => t.from === this.currentState)
      .map(t => t.event);
  }

  /**
   * Exports FSM topology into Mermaid.js stateDiagram-v2 format.
   */
  exportMermaid() {
    const lines = ['stateDiagram-v2'];
    lines.push(`  [*] --> ${this.initialState}`);

    this.transitions.forEach(t => {
      lines.push(`  ${t.from} --> ${t.to} : ${t.event}`);
    });

    return lines.join('\n');
  }

  /**
   * Resets machine back to initial state and purges history log.
   */
  reset() {
    this.currentState = this.initialState;
    this.history = [];
  }
}

// Browser DOM initializer for interactive state machine visualizer
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const fsm = new StreamingCinemaHubFsmVisualizer();

    const currentStateElem = document.getElementById('current-state-badge');
    const nodesContainer = document.getElementById('nodes-container');
    const triggersContainer = document.getElementById('event-triggers');
    const historyList = document.getElementById('history-log');
    const mermaidExport = document.getElementById('mermaid-output');
    const resetBtn = document.getElementById('reset-fsm-btn');

    function updateView() {
      if (currentStateElem) {
        currentStateElem.textContent = fsm.currentState;
      }

      // Render state node badges
      if (nodesContainer) {
        nodesContainer.replaceChildren();
        Array.from(fsm.states).forEach(state => {
          const card = document.createElement('div');
          card.className = `state-node-card ${state === fsm.currentState ? 'active' : ''}`;

          const dot = document.createElement('span');
          dot.className = 'state-dot';

          const label = document.createElement('span');
          label.textContent = state;

          card.append(dot, label);
          nodesContainer.append(card);
        });
      }

      // Render contextual action triggers
      if (triggersContainer) {
        triggersContainer.replaceChildren();
        const available = fsm.getAvailableEvents();
        if (available.length === 0) {
          const empty = document.createElement('p');
          empty.textContent = 'No forward transitions available from this state.';
          triggersContainer.append(empty);
        } else {
          available.forEach(evt => {
            const btn = document.createElement('button');
            btn.className = 'cinema-trigger-btn';
            btn.textContent = `Dispatch: ${evt}`;
            btn.addEventListener('click', () => {
              fsm.dispatch(evt);
              updateView();
            });
            triggersContainer.append(btn);
          });
        }
      }

      // Render history log
      if (historyList) {
        historyList.replaceChildren();
        fsm.history.slice(-8).reverse().forEach(entry => {
          const item = document.createElement('li');
          item.textContent = `[${entry.timestamp.split('T')[1].slice(0, 8)}] ${entry.from} -> (${entry.event}) -> ${entry.to}`;
          historyList.append(item);
        });
      }

      // Export Mermaid
      if (mermaidExport) {
        mermaidExport.textContent = fsm.exportMermaid();
      }
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        fsm.reset();
        updateView();
      });
    }

    updateView();
  });
}
