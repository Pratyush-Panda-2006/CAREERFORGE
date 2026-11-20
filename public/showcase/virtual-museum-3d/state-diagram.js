/**
 * Virtual Museum 3D - Node-Based Finite State Machine & Visitor Lifecycle Visualizer
 * Models 3D gallery navigation workflow states, validates event-driven transitions,
 * maintains event logs, and exports diagrams to Mermaid.js stateDiagram-v2 format.
 */

export class VirtualMuseum3dFsmVisualizer {
  constructor(initialState = 'MUSEUM_LOBBY') {
    this.initialState = initialState;
    this.currentState = initialState;
    this.states = new Set([
      'MUSEUM_LOBBY',
      'GALLERY_NAVIGATION',
      'ARTIFACT_INSPECTION_3D',
      'AUDIO_GUIDE_PLAYBACK',
      'VR_IMMERSION_MODE',
      'CURATOR_ARCHIVE_VIEW'
    ]);
    this.transitions = [];
    this.history = [];

    this.registerDefaultTransitions();
  }

  registerDefaultTransitions() {
    this.addTransition('MUSEUM_LOBBY', 'ENTER_GALLERY', 'GALLERY_NAVIGATION');
    this.addTransition('GALLERY_NAVIGATION', 'SELECT_ARTIFACT', 'ARTIFACT_INSPECTION_3D');
    this.addTransition('ARTIFACT_INSPECTION_3D', 'PLAY_GUIDE', 'AUDIO_GUIDE_PLAYBACK');
    this.addTransition('AUDIO_GUIDE_PLAYBACK', 'STOP_GUIDE', 'ARTIFACT_INSPECTION_3D');
    this.addTransition('ARTIFACT_INSPECTION_3D', 'ACTIVATE_VR', 'VR_IMMERSION_MODE');
    this.addTransition('VR_IMMERSION_MODE', 'EXIT_VR', 'ARTIFACT_INSPECTION_3D');
    this.addTransition('ARTIFACT_INSPECTION_3D', 'OPEN_CURATOR_NOTES', 'CURATOR_ARCHIVE_VIEW');
    this.addTransition('CURATOR_ARCHIVE_VIEW', 'CLOSE_ARCHIVE', 'GALLERY_NAVIGATION');
    this.addTransition('GALLERY_NAVIGATION', 'RETURN_LOBBY', 'MUSEUM_LOBBY');
  }

  /**
   * Registers a transition rule between two states given an event trigger.
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
   * Returns available events callable from the current state.
   */
  getAvailableEvents() {
    return this.transitions
      .filter(t => t.from === this.currentState)
      .map(t => t.event);
  }

  /**
   * Exports the state machine schema as Mermaid.js stateDiagram-v2 definition.
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
   * Resets machine back to default state and clears history log.
   */
  reset() {
    this.currentState = this.initialState;
    this.history = [];
  }
}

// Browser DOM initializer for interactive museum state workbench
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const fsm = new VirtualMuseum3dFsmVisualizer();

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

      if (triggersContainer) {
        triggersContainer.replaceChildren();
        const available = fsm.getAvailableEvents();
        if (available.length === 0) {
          const empty = document.createElement('p');
          empty.textContent = 'No forward transitions available from current state.';
          triggersContainer.append(empty);
        } else {
          available.forEach(evt => {
            const btn = document.createElement('button');
            btn.className = 'museum-trigger-btn';
            btn.textContent = `Explore: ${evt}`;
            btn.addEventListener('click', () => {
              fsm.dispatch(evt);
              updateView();
            });
            triggersContainer.append(btn);
          });
        }
      }

      if (historyList) {
        historyList.replaceChildren();
        fsm.history.slice(-8).reverse().forEach(entry => {
          const item = document.createElement('li');
          item.textContent = `[${entry.timestamp.split('T')[1].slice(0, 8)}] ${entry.from} -> (${entry.event}) -> ${entry.to}`;
          historyList.append(item);
        });
      }

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
