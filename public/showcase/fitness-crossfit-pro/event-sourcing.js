/**
 * Fitness CrossFit Pro - In-Memory Event Sourcing Ledger & Temporal State Replay Engine
 * Stores state mutations as immutable append-only events, computes current snapshots,
 * and offers forward/backward time-travel replay.
 */

const GENESIS_STATE = {
  workouts: [],
  totalWorkouts: 0,
  totalExercises: 0,
  totalVolume: 0,
  currentWorkoutId: null,
  bodyWeight: 0,
  prs: [],
  lastEventId: null,
  lastTimestamp: null
};

const EVENT_TYPES = [
  'WORKOUT_STARTED',
  'WORKOUT_ENDED',
  'EXERCISE_LOGGED',
  'WEIGHT_UPDATED',
  'PR_SET'
];

function deepFreeze(value) {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) deepFreeze(value[i]);
  } else {
    const keys = Object.keys(value);
    for (let i = 0; i < keys.length; i++) deepFreeze(value[keys[i]]);
  }
  return Object.freeze(value);
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(state));
}

function copyEvent(event) {
  return Object.freeze({ ...event, payload: deepFreeze({ ...event.payload }) });
}

function findWorkout(state, workoutId) {
  return state.workouts.find(w => w.id === workoutId);
}

function applyEvent(state, event) {
  const next = cloneState(state);
  next.lastEventId = event.id;
  next.lastTimestamp = event.timestamp;

  switch (event.type) {
    case 'WORKOUT_STARTED': {
      const workout = {
        id: event.payload.workoutId || `w_${event.sequence}`,
        name: String(event.payload.name || 'Untitled WOD'),
        startedAt: event.timestamp,
        endedAt: null,
        exercises: [],
        volume: 0
      };
      next.workouts.push(workout);
      next.totalWorkouts += 1;
      next.currentWorkoutId = workout.id;
      break;
    }
    case 'WORKOUT_ENDED': {
      const targetId = event.payload.workoutId || next.currentWorkoutId;
      const workout = findWorkout(next, targetId);
      if (workout) workout.endedAt = event.timestamp;
      if (next.currentWorkoutId === targetId) next.currentWorkoutId = null;
      break;
    }
    case 'EXERCISE_LOGGED': {
      const exercise = {
        id: event.payload.exerciseId || `ex_${event.sequence}`,
        name: String(event.payload.name || 'Exercise'),
        sets: Number(event.payload.sets) || 0,
        reps: Number(event.payload.reps) || 0,
        weight: Number(event.payload.weight) || 0
      };
      exercise.volume = exercise.sets * exercise.reps * exercise.weight;
      const targetId = event.payload.workoutId || next.currentWorkoutId;
      const workout = findWorkout(next, targetId);
      if (workout) {
        workout.exercises.push(exercise);
        workout.volume += exercise.volume;
      }
      next.totalExercises += 1;
      next.totalVolume += exercise.volume;
      break;
    }
    case 'WEIGHT_UPDATED': {
      next.bodyWeight = Number(event.payload.weight) || 0;
      break;
    }
    case 'PR_SET': {
      next.prs.push({
        exercise: String(event.payload.exercise || 'Unknown'),
        weight: Number(event.payload.weight) || 0,
        achievedAt: event.timestamp
      });
      break;
    }
    default:
      break;
  }
  return next;
}

export class FitnessCrossfitProEventSourcingLedger {
  constructor(options = {}) {
    this.events = [];
    this.sequence = 0;
    this.clock = options.clock || (() => Date.now());
  }

  appendEvent(type, payload = {}) {
    const event = {
      id: `evt_${this.clock()}_${this.sequence + 1}`,
      timestamp: this.clock(),
      type: String(type || 'UNKNOWN_EVENT'),
      payload: deepFreeze(payload || {}),
      sequence: ++this.sequence
    };
    Object.freeze(event);
    this.events.push(event);
    return copyEvent(event);
  }

  replayToTimestamp(ts) {
    const cutoff = Number(ts);
    const applicable = this.events
      .filter(event => event.timestamp <= cutoff)
      .sort((a, b) => a.sequence - b.sequence);

    let state = cloneState(GENESIS_STATE);
    for (let i = 0; i < applicable.length; i++) {
      state = applyEvent(state, applicable[i]);
    }
    return state;
  }

  getMaterializedState() {
    return this.replayToTimestamp(Infinity);
  }

  getEvents() {
    return this.events.map(copyEvent);
  }

  getEventCount() {
    return this.events.length;
  }

  getEventTypes() {
    return [...EVENT_TYPES];
  }

  clear() {
    this.events = [];
    this.sequence = 0;
  }
}

// Browser UI Driver
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const ledger = new FitnessCrossfitProEventSourcingLedger();

    const typeSelect = document.getElementById('esEventType');
    const payloadName = document.getElementById('esPayloadName');
    const payloadSets = document.getElementById('esPayloadSets');
    const payloadReps = document.getElementById('esPayloadReps');
    const payloadWeight = document.getElementById('esPayloadWeight');
    const payloadWorkoutId = document.getElementById('esPayloadWorkoutId');
    const submitBtn = document.getElementById('esSubmitBtn');
    const ledgerTable = document.getElementById('esLedgerTable');
    const timelineScrub = document.getElementById('esTimelineScrub');
    const scrubVal = document.getElementById('esScrubVal');
    const btnPlay = document.getElementById('esBtnPlay');
    const btnPause = document.getElementById('esBtnPause');
    const btnStepBack = document.getElementById('esBtnStepBack');
    const btnStepForward = document.getElementById('esBtnStepForward');
    const btnReset = document.getElementById('esBtnReset');
    const currentPanel = document.getElementById('esCurrentState');
    const historicalPanel = document.getElementById('esHistoricalState');
    const statusBadge = document.getElementById('esStatusBadge');

    let playTimer = null;
    let isPlaying = false;

    function formatState(state) {
      return JSON.stringify(state, null, 2);
    }

    function renderLedger() {
      if (!ledgerTable) return;
      ledgerTable.replaceChildren();
      const events = ledger.getEvents();
      if (events.length === 0) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 6;
        cell.textContent = 'No events recorded yet. Append an event to begin.';
        cell.style.textAlign = 'center';
        cell.style.color = 'var(--es-text-muted)';
        row.appendChild(cell);
        ledgerTable.appendChild(row);
        return;
      }
      events.forEach(event => {
        const row = document.createElement('tr');
        row.className = 'es-ledger-row';

        const seqCell = document.createElement('td');
        seqCell.className = 'es-cell-mono';
        seqCell.textContent = event.sequence;
        row.appendChild(seqCell);

        const timeCell = document.createElement('td');
        timeCell.className = 'es-cell-mono';
        timeCell.textContent = new Date(event.timestamp).toLocaleTimeString();
        row.appendChild(timeCell);

        const typeCell = document.createElement('td');
        typeCell.className = 'es-chip';
        typeCell.textContent = event.type;
        row.appendChild(typeCell);

        const idCell = document.createElement('td');
        idCell.className = 'es-cell-mono';
        idCell.textContent = event.id;
        row.appendChild(idCell);

        const payloadCell = document.createElement('td');
        payloadCell.className = 'es-cell-mono';
        payloadCell.textContent = JSON.stringify(event.payload);
        row.appendChild(payloadCell);

        const lockCell = document.createElement('td');
        lockCell.textContent = '🔒';
        lockCell.style.textAlign = 'center';
        row.appendChild(lockCell);

        ledgerTable.appendChild(row);
      });
    }

    function updateTimelineRange() {
      if (!timelineScrub) return;
      const events = ledger.getEvents();
      if (events.length === 0) {
        timelineScrub.disabled = true;
        timelineScrub.min = 0;
        timelineScrub.max = 100;
        timelineScrub.value = 0;
        if (scrubVal) scrubVal.textContent = '0 ms';
        return;
      }
      timelineScrub.disabled = false;
      const first = events[0].timestamp;
      const last = events[events.length - 1].timestamp;
      timelineScrub.min = first;
      timelineScrub.max = last;
      timelineScrub.value = last;
      if (scrubVal) scrubVal.textContent = `${last} ms`;
    }

    function renderSnapshots(scrubTs) {
      const nowState = ledger.getMaterializedState();
      if (currentPanel) currentPanel.textContent = formatState(nowState);

      const histState = ledger.replayToTimestamp(scrubTs);
      if (historicalPanel) historicalPanel.textContent = formatState(histState);

      if (statusBadge) {
        const events = ledger.getEvents();
        statusBadge.textContent = `EVENTS: ${events.length} | STATE COMPUTED`;
        statusBadge.className = 'es-status es-status-valid';
      }
    }

    function advanceScrub(stepMs) {
      if (!timelineScrub) return;
      const max = Number(timelineScrub.max);
      const min = Number(timelineScrub.min);
      let val = Number(timelineScrub.value) + stepMs;
      val = Math.min(Math.max(val, min), max);
      timelineScrub.value = val;
      if (scrubVal) scrubVal.textContent = `${val} ms`;
      renderSnapshots(val);
    }

    submitBtn?.addEventListener('click', () => {
      const type = typeSelect.value;
      const payload = {};
      if (payloadName.value) payload.name = payloadName.value;
      if (payloadSets.value) payload.sets = payloadSets.value;
      if (payloadReps.value) payload.reps = payloadReps.value;
      if (payloadWeight.value) payload.weight = payloadWeight.value;
      if (payloadWorkoutId.value) payload.workoutId = payloadWorkoutId.value;

      ledger.appendEvent(type, payload);
      renderLedger();
      updateTimelineRange();
      renderSnapshots(Number(timelineScrub.value || Date.now()));
    });

    timelineScrub?.addEventListener('input', () => {
      renderSnapshots(Number(timelineScrub.value));
    });

    btnPlay?.addEventListener('click', () => {
      if (isPlaying) return;
      isPlaying = true;
      const events = ledger.getEvents();
      const max = events.length ? events[events.length - 1].timestamp : Date.now();
      playTimer = setInterval(() => {
        advanceScrub(1000);
        if (Number(timelineScrub.value) >= max) {
          clearInterval(playTimer);
          playTimer = null;
          isPlaying = false;
        }
      }, 400);
    });

    btnPause?.addEventListener('click', () => {
      if (playTimer) clearInterval(playTimer);
      playTimer = null;
      isPlaying = false;
    });

    btnStepBack?.addEventListener('click', () => advanceScrub(-1000));
    btnStepForward?.addEventListener('click', () => advanceScrub(1000));

    btnReset?.addEventListener('click', () => {
      ledger.clear();
      renderLedger();
      updateTimelineRange();
      renderSnapshots(Date.now());
    });

    renderLedger();
    updateTimelineRange();
    renderSnapshots(Date.now());
  });
}
