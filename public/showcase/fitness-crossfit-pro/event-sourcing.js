/**
 * Fitness Crossfit Pro - Event Sourcing Ledger & Temporal State Replay Engine
 */

export class FitnessCrossfitProEventLedger {
  constructor() {
    this.events = [];
  }

  append(type, payload, timestamp = Date.now()) {
    const event = {
      id: this.events.length + 1,
      type,
      payload,
      timestamp
    };
    this.events.push(event);
    return event;
  }

  replayTo(version) {
    const stream = this.events.slice(0, version);
    return stream.reduce((state, evt) => {
      if (evt.type === 'REP_RECORDED') {
        state.totalReps = (state.totalReps || 0) + (evt.payload.reps || 0);
      } else if (evt.type === 'WEIGHT_UPDATED') {
        state.currentWeight = evt.payload.weight;
      }
      return state;
    }, { totalReps: 0, currentWeight: 0, version });
  }

  getSnapshot() {
    return this.replayTo(this.events.length);
  }
}
