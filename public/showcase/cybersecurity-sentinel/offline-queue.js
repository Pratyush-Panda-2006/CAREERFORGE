/**
 * Cybersecurity Sentinel - Resilient Offline Data Persistence & Conflict-Free Queue Engine
 */

export class CybersecuritySentinelOfflineQueue {
  constructor() {
    this.queue = [];
    this.lamportClock = 0;
  }

  enqueue(actionType, payload = {}) {
    this.lamportClock++;
    const item = {
      id: `act_${this.lamportClock}_${Math.random().toString(36).substring(2, 7)}`,
      action: actionType,
      payload,
      clock: this.lamportClock,
      timestamp: Date.now()
    };
    this.queue.push(item);
    return item;
  }

  resolveConflicts() {
    return [...this.queue].sort((a, b) => {
      if (a.clock !== b.clock) return a.clock - b.clock;
      return a.timestamp - b.timestamp;
    });
  }

  clearQueue() {
    const processed = [...this.queue];
    this.queue = [];
    return processed;
  }

  toJSON() {
    return JSON.stringify(this.queue);
  }
}
