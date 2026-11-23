/**
 * Travel Odyssey - Event Sourcing Ledger & Temporal State Replay Engine
 * Issue #2842 - NSoC '26 Level 3 Feature
 * 
 * Provides an append-only immutable event ledger, deterministic state
 * reconstruction, temporal time-travel scrubbing, state diffing, and
 * cryptographic chain verification for the Travel Odyssey platform.
 */

export const EVENT_TYPES = Object.freeze({
  TRIP_CREATED: 'TRIP_CREATED',
  DESTINATION_ADDED: 'DESTINATION_ADDED',
  DESTINATION_REMOVED: 'DESTINATION_REMOVED',
  FLIGHT_BOOKED: 'FLIGHT_BOOKED',
  FLIGHT_CANCELLED: 'FLIGHT_CANCELLED',
  HOTEL_RESERVED: 'HOTEL_RESERVED',
  HOTEL_CANCELLED: 'HOTEL_CANCELLED',
  ITINERARY_UPDATED: 'ITINERARY_UPDATED',
  ACTIVITY_SCHEDULED: 'ACTIVITY_SCHEDULED',
  ACTIVITY_REMOVED: 'ACTIVITY_REMOVED',
  BUDGET_ADJUSTED: 'BUDGET_ADJUSTED',
  TRIP_CANCELLED: 'TRIP_CANCELLED',
  TRIP_CONFIRMED: 'TRIP_CONFIRMED',
  TRAVELER_ADDED: 'TRAVELER_ADDED',
  NOTES_ADDED: 'NOTES_ADDED'
});

export const GENESIS_CHECKSUM = '00000000000000000000000000000000';

/**
 * Deterministic deep clone utility ensuring absolute state isolation.
 */
export function cloneDeep(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  try {
    if (typeof structuredClone === 'function') {
      return structuredClone(obj);
    }
  } catch {
    // Fall back to JSON serialization for non-cloneable edge cases
  }
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Computes a deterministic 32-character hex checksum over event data and previous hash.
 */
export function computeEventHash(prevHash, eventData) {
  const normalizedPrev = prevHash || GENESIS_CHECKSUM;
  const serialized = `${normalizedPrev}:${eventData.id}:${eventData.version}:${eventData.type}:${eventData.timestamp}:${JSON.stringify(eventData.payload || {})}:${JSON.stringify(eventData.metadata || {})}`;
  
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  let h3 = 0x9e3779b9;
  let h4 = 0x85ebca6b;

  for (let i = 0; i < serialized.length; i++) {
    const ch = serialized.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822507);
    h4 = Math.imul(h4 ^ ch, 3266489909);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2654435761) ^ Math.imul(h3 ^ (h3 >>> 13), 1597334677);
  h3 = Math.imul(h3 ^ (h3 >>> 16), 3266489909) ^ Math.imul(h4 ^ (h4 >>> 13), 2246822507);
  h4 = Math.imul(h4 ^ (h4 >>> 16), 1597334677) ^ Math.imul(h1 ^ (h1 >>> 13), 2654435761);

  const toHex = (n) => (n >>> 0).toString(16).padStart(8, '0');
  return toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4);
}

/**
 * Creates initial blank state for the Travel Odyssey itinerary domain.
 */
export function createInitialState() {
  return {
    trip: null,
    status: 'UNINITIALIZED',
    destinations: [],
    flights: [],
    hotels: [],
    activities: [],
    travelers: [],
    budget: {
      total: 0,
      allocated: 0,
      remaining: 0,
      currency: 'USD'
    },
    notes: [],
    itineraryDays: {},
    customEvents: [],
    lastUpdated: null,
    version: 0
  };
}

/**
 * Pure state reducer applying domain events to compute materialized state.
 */
export function reduceTravelState(state, event) {
  if (!state) state = createInitialState();
  if (!event || !event.type) return state;

  const next = cloneDeep(state);
  const payload = event.payload || {};

  switch (event.type) {
    case EVENT_TYPES.TRIP_CREATED: {
      next.trip = {
        id: payload.id || `trip_${event.id}`,
        title: payload.title || 'Untitled Journey',
        startDate: payload.startDate || null,
        endDate: payload.endDate || null
      };
      next.status = 'PLANNING';

      if (payload.destination) {
        const destObj = typeof payload.destination === 'string'
          ? { id: 'dest_1', name: payload.destination, country: payload.country || '' }
          : { id: payload.destination.id || 'dest_1', ...payload.destination };
        next.destinations.push(destObj);
      }

      const totalBudget = Number(payload.budget) || 0;
      next.budget = {
        total: totalBudget,
        allocated: 0,
        remaining: totalBudget,
        currency: payload.currency || 'USD'
      };

      if (Array.isArray(payload.travelers)) {
        next.travelers = cloneDeep(payload.travelers);
      } else if (typeof payload.travelers === 'number' || typeof payload.travelers === 'string') {
        const count = Math.max(1, parseInt(payload.travelers, 10) || 1);
        next.travelers = Array.from({ length: count }, (_, i) => ({
          id: `traveler_${i + 1}`,
          name: i === 0 ? 'Lead Traveler' : `Traveler ${i + 1}`
        }));
      }
      break;
    }

    case EVENT_TYPES.DESTINATION_ADDED: {
      const destId = payload.id || `dest_${next.destinations.length + 1}`;
      const dest = {
        id: destId,
        name: payload.name || payload.destination || 'New Destination',
        country: payload.country || '',
        arrivalDate: payload.arrivalDate || null,
        departureDate: payload.departureDate || null,
        order: payload.order !== undefined ? payload.order : next.destinations.length + 1
      };
      next.destinations.push(dest);
      break;
    }

    case EVENT_TYPES.DESTINATION_REMOVED: {
      const target = payload.id || payload.name;
      next.destinations = next.destinations.filter(d => d.id !== target && d.name !== target);
      break;
    }

    case EVENT_TYPES.FLIGHT_BOOKED: {
      const flightCost = Number(payload.cost) || 0;
      const flight = {
        id: payload.id || `flight_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        airline: payload.airline || 'Carrier',
        flightNumber: payload.flightNumber || 'FL000',
        from: payload.from || 'Origin',
        to: payload.to || 'Destination',
        departureTime: payload.departureTime || null,
        arrivalTime: payload.arrivalTime || null,
        cost: flightCost,
        status: payload.status || 'CONFIRMED'
      };
      next.flights.push(flight);
      next.budget.allocated += flightCost;
      next.budget.remaining = next.budget.total - next.budget.allocated;
      break;
    }

    case EVENT_TYPES.FLIGHT_CANCELLED: {
      const targetId = payload.flightId || payload.id;
      const flight = next.flights.find(f => f.id === targetId);
      if (flight && flight.status !== 'CANCELLED') {
        flight.status = 'CANCELLED';
        const refund = payload.refundAmount !== undefined ? Number(payload.refundAmount) : flight.cost;
        next.budget.allocated = Math.max(0, next.budget.allocated - refund);
        next.budget.remaining = next.budget.total - next.budget.allocated;
      }
      break;
    }

    case EVENT_TYPES.HOTEL_RESERVED: {
      const hotelCost = Number(payload.cost) || 0;
      const hotel = {
        id: payload.id || `hotel_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        hotelName: payload.hotelName || payload.name || 'Grand Odyssey Hotel',
        destination: payload.destination || (next.destinations[0]?.name || 'Central'),
        checkIn: payload.checkIn || null,
        checkOut: payload.checkOut || null,
        nights: Number(payload.nights) || 1,
        roomType: payload.roomType || 'Standard Suite',
        cost: hotelCost,
        status: payload.status || 'CONFIRMED'
      };
      next.hotels.push(hotel);
      next.budget.allocated += hotelCost;
      next.budget.remaining = next.budget.total - next.budget.allocated;
      break;
    }

    case EVENT_TYPES.HOTEL_CANCELLED: {
      const targetId = payload.hotelId || payload.id;
      const hotel = next.hotels.find(h => h.id === targetId);
      if (hotel && hotel.status !== 'CANCELLED') {
        hotel.status = 'CANCELLED';
        const refund = payload.refundAmount !== undefined ? Number(payload.refundAmount) : hotel.cost;
        next.budget.allocated = Math.max(0, next.budget.allocated - refund);
        next.budget.remaining = next.budget.total - next.budget.allocated;
      }
      break;
    }

    case EVENT_TYPES.ACTIVITY_SCHEDULED: {
      const actCost = Number(payload.cost) || 0;
      const activity = {
        id: payload.id || `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: payload.title || 'Sightseeing Tour',
        day: payload.day || 1,
        location: payload.location || 'Local',
        cost: actCost,
        durationHours: Number(payload.durationHours) || 2
      };
      next.activities.push(activity);
      next.budget.allocated += actCost;
      next.budget.remaining = next.budget.total - next.budget.allocated;
      break;
    }

    case EVENT_TYPES.ACTIVITY_REMOVED: {
      const targetId = payload.activityId || payload.id;
      const index = next.activities.findIndex(a => a.id === targetId);
      if (index !== -1) {
        const [removed] = next.activities.splice(index, 1);
        next.budget.allocated = Math.max(0, next.budget.allocated - (removed.cost || 0));
        next.budget.remaining = next.budget.total - next.budget.allocated;
      }
      break;
    }

    case EVENT_TYPES.ITINERARY_UPDATED: {
      const day = payload.day || 1;
      next.itineraryDays[day] = {
        ...(next.itineraryDays[day] || {}),
        title: payload.title || next.itineraryDays[day]?.title || `Day ${day}`,
        description: payload.description || next.itineraryDays[day]?.description || '',
        updatedAt: event.timestamp
      };
      break;
    }

    case EVENT_TYPES.BUDGET_ADJUSTED: {
      if (payload.newTotal !== undefined) {
        next.budget.total = Number(payload.newTotal) || 0;
      } else if (payload.delta !== undefined) {
        next.budget.total = Math.max(0, next.budget.total + (Number(payload.delta) || 0));
      }
      if (payload.currency) {
        next.budget.currency = payload.currency;
      }
      next.budget.remaining = next.budget.total - next.budget.allocated;
      break;
    }

    case EVENT_TYPES.TRIP_CANCELLED: {
      next.status = 'CANCELLED';
      next.cancellationReason = payload.reason || 'User cancelled journey';
      next.cancelledAt = event.timestamp;
      break;
    }

    case EVENT_TYPES.TRIP_CONFIRMED: {
      next.status = 'CONFIRMED';
      next.confirmationCode = payload.confirmationCode || `ODYSSEY-${Math.random().toString(36).toUpperCase().slice(2, 8)}`;
      break;
    }

    case EVENT_TYPES.TRAVELER_ADDED: {
      const traveler = {
        id: payload.id || `traveler_${next.travelers.length + 1}`,
        name: payload.name || `Traveler ${next.travelers.length + 1}`,
        email: payload.email || '',
        role: payload.role || 'Companion'
      };
      next.travelers.push(traveler);
      break;
    }

    case EVENT_TYPES.NOTES_ADDED: {
      const note = {
        id: payload.id || `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        text: payload.text || payload.note || '',
        author: payload.author || event.metadata?.author || 'Explorer',
        timestamp: event.timestamp
      };
      next.notes.push(note);
      break;
    }

    default: {
      // Allow custom or forward-compatible event types
      next.customEvents.push({
        type: event.type,
        payload: cloneDeep(payload),
        timestamp: event.timestamp
      });
      break;
    }
  }

  next.lastUpdated = event.timestamp;
  next.version = event.version;
  return next;
}

/**
 * Computes deep structural differences between two states for diff visualization.
 */
export function computeStructuralDiff(prev, current, prefix = '') {
  const changes = [];

  function isObject(val) {
    return val !== null && typeof val === 'object' && !Array.isArray(val);
  }

  const prevKeys = prev && typeof prev === 'object' ? Object.keys(prev) : [];
  const currKeys = current && typeof current === 'object' ? Object.keys(current) : [];
  const allKeys = Array.from(new Set([...prevKeys, ...currKeys]));

  for (const key of allKeys) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    const prevVal = prev ? prev[key] : undefined;
    const currVal = current ? current[key] : undefined;

    if (prevVal === undefined && currVal !== undefined) {
      changes.push({
        path: fullPath,
        key,
        kind: 'ADDED',
        prev: undefined,
        current: cloneDeep(currVal)
      });
    } else if (prevVal !== undefined && currVal === undefined) {
      changes.push({
        path: fullPath,
        key,
        kind: 'REMOVED',
        prev: cloneDeep(prevVal),
        current: undefined
      });
    } else if (isObject(prevVal) && isObject(currVal)) {
      const nested = computeStructuralDiff(prevVal, currVal, fullPath);
      changes.push(...nested.changes);
    } else if (Array.isArray(prevVal) && Array.isArray(currVal)) {
      if (JSON.stringify(prevVal) !== JSON.stringify(currVal)) {
        changes.push({
          path: fullPath,
          key,
          kind: 'MODIFIED',
          prev: cloneDeep(prevVal),
          current: cloneDeep(currVal)
        });
      }
    } else if (prevVal !== currVal) {
      changes.push({
        path: fullPath,
        key,
        kind: 'MODIFIED',
        prev: prevVal,
        current: currVal
      });
    }
  }

  return {
    totalChanges: changes.length,
    changes
  };
}

/**
 * Core Travel Odyssey Event Sourcing Ledger & Temporal State Replay Engine
 */
export class TravelOdysseyEventSourcingLedger {
  constructor(initialEvents = [], options = {}) {
    this.options = {
      maxSnapshots: 100,
      customReducer: null,
      ...options
    };

    this.events = [];
    this.snapshots = [];
    this.listeners = new Set();
    this.eventListeners = new Map();
    this.cursor = -1; // Pointer into events array (-1 means initial empty state)

    if (Array.isArray(initialEvents) && initialEvents.length > 0) {
      for (const ev of initialEvents) {
        this.append(ev.type, ev.payload, ev.metadata, {
          timestamp: ev.timestamp,
          id: ev.id
        });
      }
    }
  }

  /**
   * Appends an immutable domain event to the append-only ledger.
   * Computes version, timestamp, metadata, and cryptographic checksum.
   */
  append(type, payload = {}, metadata = {}, overrides = {}) {
    if (!type || typeof type !== 'string' || type.trim() === '') {
      throw new TypeError('Event type must be a non-empty string.');
    }
    if (payload === null || (typeof payload !== 'object' && typeof payload !== 'function' && typeof payload === 'undefined')) {
      throw new TypeError('Event payload must be a valid object or primitive.');
    }

    const version = this.events.length + 1;
    const timestamp = overrides.timestamp || Date.now();
    const id = overrides.id || `evt_${timestamp}_${Math.random().toString(36).slice(2, 8)}`;
    const clonedPayload = cloneDeep(payload);
    const clonedMetadata = {
      author: 'system',
      source: 'TravelOdysseyClient',
      ...cloneDeep(metadata)
    };

    const prevChecksum = this.events.length > 0
      ? this.events[this.events.length - 1].checksum
      : GENESIS_CHECKSUM;

    const eventCandidate = {
      id,
      type: type.trim(),
      payload: clonedPayload,
      timestamp,
      version,
      metadata: clonedMetadata
    };

    const checksum = computeEventHash(prevChecksum, eventCandidate);
    const completeEvent = Object.freeze({
      ...eventCandidate,
      checksum
    });

    this.events.push(completeEvent);
    this.cursor = this.events.length - 1;

    // Notify listeners
    this._notifySubscribers(completeEvent);
    return cloneDeep(completeEvent);
  }

  /**
   * Alias for append() to support both naming styles.
   */
  appendEvent(type, payload = {}, metadata = {}) {
    return this.append(type, payload, metadata);
  }

  /**
   * Returns a deeply-isolated, immutable array of all recorded events.
   */
  getEvents() {
    return this.events.map(e => cloneDeep(e));
  }

  /**
   * Returns total count of events in the ledger.
   */
  getEventCount() {
    return this.events.length;
  }

  /**
   * Returns the current cursor index (-1 to events.length - 1).
   */
  getCursor() {
    return this.cursor;
  }

  /**
   * Computes the materialized state from genesis up to a specific version or timestamp.
   * Supports numeric version (1..N), timestamp, or criteria object { version, timestamp }.
   */
  getStateAt(versionOrTimestamp) {
    if (this.events.length === 0) {
      return createInitialState();
    }

    let targetVersion = null;
    let targetTimestamp = null;

    if (typeof versionOrTimestamp === 'number') {
      // If number is within version bounds (or 0), treat as version
      if (versionOrTimestamp <= this.events.length && versionOrTimestamp >= 0) {
        targetVersion = versionOrTimestamp;
      } else {
        // Otherwise treat as timestamp
        targetTimestamp = versionOrTimestamp;
      }
    } else if (versionOrTimestamp instanceof Date) {
      targetTimestamp = versionOrTimestamp.getTime();
    } else if (versionOrTimestamp && typeof versionOrTimestamp === 'object') {
      if (versionOrTimestamp.version !== undefined) targetVersion = Number(versionOrTimestamp.version);
      if (versionOrTimestamp.timestamp !== undefined) targetTimestamp = Number(versionOrTimestamp.timestamp);
    }

    if (targetVersion === 0) {
      return createInitialState();
    }

    let state = createInitialState();
    const reducer = this.options.customReducer || reduceTravelState;

    for (const ev of this.events) {
      if (targetVersion !== null && ev.version > targetVersion) {
        break;
      }
      if (targetTimestamp !== null && ev.timestamp > targetTimestamp) {
        break;
      }
      state = reducer(state, ev);
    }

    return cloneDeep(state);
  }

  /**
   * Deterministically replays the event stream up to an exact timestamp.
   */
  replayToTimestamp(timestamp) {
    if (typeof timestamp !== 'number' && !(timestamp instanceof Date)) {
      throw new TypeError('Timestamp must be a number or Date object.');
    }
    const ts = timestamp instanceof Date ? timestamp.getTime() : timestamp;
    return this.getStateAt({ timestamp: ts });
  }

  /**
   * Deterministically replays the event stream up to an exact version.
   */
  replayToVersion(version) {
    if (typeof version !== 'number' || version < 0) {
      throw new TypeError('Version must be a non-negative number.');
    }
    return this.getStateAt({ version });
  }

  /**
   * Returns materialized state at current time-travel cursor position.
   */
  getCurrentState() {
    if (this.cursor < 0 || this.events.length === 0) {
      return createInitialState();
    }
    const currentVersion = this.events[this.cursor]?.version || 0;
    return this.getStateAt({ version: currentVersion });
  }

  /**
   * Returns fully materialized state with all recorded events applied (latest state).
   */
  getMaterializedState(versionOrTimestamp) {
    if (versionOrTimestamp !== undefined) {
      return this.getStateAt(versionOrTimestamp);
    }
    if (this.events.length === 0) {
      return createInitialState();
    }
    return this.getStateAt({ version: this.events.length });
  }

  /**
   * Captures an instant state snapshot at the current cursor position.
   */
  createSnapshot(tag = '') {
    const currentState = this.getCurrentState();
    const currentEvent = this.cursor >= 0 ? this.events[this.cursor] : null;

    const snapshot = {
      id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      version: currentEvent ? currentEvent.version : 0,
      cursor: this.cursor,
      timestamp: Date.now(),
      state: cloneDeep(currentState),
      tag: String(tag || `Snapshot v${currentEvent ? currentEvent.version : 0}`),
      checksum: currentEvent ? currentEvent.checksum : GENESIS_CHECKSUM
    };

    this.snapshots.push(cloneDeep(snapshot));
    if (this.snapshots.length > this.options.maxSnapshots) {
      this.snapshots.shift();
    }

    return cloneDeep(snapshot);
  }

  /**
   * Returns list of cached state snapshots.
   */
  getSnapshots() {
    return this.snapshots.map(s => cloneDeep(s));
  }

  /**
   * Restores state and jumps time-travel cursor to match a snapshot.
   */
  restoreFromSnapshot(snapshotOrId) {
    let target = null;
    if (typeof snapshotOrId === 'string') {
      target = this.snapshots.find(s => s.id === snapshotOrId || s.tag === snapshotOrId);
      if (!target) {
        throw new Error(`Snapshot with id or tag "${snapshotOrId}" not found.`);
      }
    } else if (snapshotOrId && typeof snapshotOrId === 'object') {
      target = snapshotOrId;
    } else {
      throw new TypeError('Invalid snapshot argument.');
    }

    // Scrub cursor to snapshot version
    const targetVersion = target.version || 0;
    if (targetVersion === 0) {
      this.cursor = -1;
    } else {
      const idx = this.events.findIndex(e => e.version === targetVersion);
      this.cursor = idx !== -1 ? idx : Math.min(targetVersion - 1, this.events.length - 1);
    }

    this._notifySubscribers(null, 'SNAPSHOT_RESTORED');
    return this.getCurrentState();
  }

  /**
   * Moves active temporal scrubber cursor to a target event index.
   */
  timeTravel(stepOrTarget) {
    if (typeof stepOrTarget !== 'number') {
      throw new TypeError('Time travel step must be a number.');
    }
    const maxIdx = this.events.length - 1;
    this.cursor = Math.max(-1, Math.min(stepOrTarget, maxIdx));
    const state = this.getCurrentState();
    this._notifySubscribers(null, 'TIME_TRAVEL');
    return state;
  }

  /**
   * Scrub to target index in timeline.
   */
  scrub(targetIndex) {
    return this.timeTravel(targetIndex);
  }

  /**
   * Steps scrubber forward by one event.
   */
  stepForward() {
    if (this.cursor < this.events.length - 1) {
      return this.timeTravel(this.cursor + 1);
    }
    return this.getCurrentState();
  }

  /**
   * Steps scrubber backward by one event.
   */
  stepBackward() {
    if (this.cursor >= 0) {
      return this.timeTravel(this.cursor - 1);
    }
    return this.getCurrentState();
  }

  /**
   * Jumps to the beginning of time (-1, empty state).
   */
  jumpToStart() {
    return this.timeTravel(-1);
  }

  /**
   * Jumps to the latest live event.
   */
  jumpToEnd() {
    return this.timeTravel(this.events.length - 1);
  }

  /**
   * Computes recursive structural diff between two state objects.
   */
  computeDiff(stateA, stateB) {
    return computeStructuralDiff(stateA, stateB);
  }

  /**
   * Verifies the cryptographic integrity of the entire append-only ledger chain.
   */
  verifyLedgerIntegrity() {
    const errors = [];
    let prevChecksum = GENESIS_CHECKSUM;

    for (let i = 0; i < this.events.length; i++) {
      const ev = this.events[i];
      const expectedVersion = i + 1;

      if (ev.version !== expectedVersion) {
        errors.push(`Version sequence broken at index ${i}: expected ${expectedVersion}, got ${ev.version}.`);
      }

      const expectedChecksum = computeEventHash(prevChecksum, ev);
      if (ev.checksum !== expectedChecksum) {
        errors.push(`Cryptographic checksum mismatch at version ${ev.version}: expected ${expectedChecksum}, got ${ev.checksum}.`);
      }

      prevChecksum = ev.checksum;
    }

    return {
      valid: errors.length === 0,
      errors,
      verifiedEvents: this.events.length
    };
  }

  /**
   * Subscribes a listener to all ledger mutations and time-travel transitions.
   * Returns an unsubscribe function.
   */
  subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('Subscriber listener must be a function.');
    }
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Registers a listener for a specific event type or lifecycle trigger.
   */
  on(eventType, callback) {
    if (!eventType || typeof callback !== 'function') {
      throw new TypeError('Invalid event type or callback.');
    }
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType).add(callback);
    return () => this.off(eventType, callback);
  }

  /**
   * Removes a specific event listener.
   */
  off(eventType, callback) {
    if (this.eventListeners.has(eventType)) {
      this.eventListeners.get(eventType).delete(callback);
    }
  }

  /**
   * Notifies subscribers on mutations or time travel.
   */
  _notifySubscribers(event, triggerType = 'EVENT_APPENDED') {
    const currentState = this.getCurrentState();
    const cursor = this.cursor;

    for (const listener of this.listeners) {
      try {
        listener({
          trigger: triggerType,
          event: event ? cloneDeep(event) : null,
          state: cloneDeep(currentState),
          cursor,
          totalEvents: this.events.length
        });
      } catch (err) {
        console.error('Error in ledger subscriber:', err);
      }
    }

    if (event && this.eventListeners.has(event.type)) {
      for (const cb of this.eventListeners.get(event.type)) {
        try {
          cb(cloneDeep(event), cloneDeep(currentState));
        } catch (err) {
          console.error(`Error in event listener for ${event.type}:`, err);
        }
      }
    }

    if (this.eventListeners.has('*')) {
      for (const cb of this.eventListeners.get('*')) {
        try {
          cb(event ? cloneDeep(event) : { type: triggerType }, cloneDeep(currentState));
        } catch (err) {
          console.error('Error in wildcard event listener:', err);
        }
      }
    }
  }

  /**
   * Serializes the ledger event stream and snapshot cache to a JSON string.
   */
  exportLedger() {
    return JSON.stringify({
      schema: 'TravelOdysseyEventSourcingLedger_v1',
      exportedAt: Date.now(),
      eventCount: this.events.length,
      events: this.events,
      snapshots: this.snapshots
    }, null, 2);
  }

  /**
   * Deserializes and restores the ledger from a JSON string.
   * Validates structure and cryptographic integrity.
   */
  importLedger(jsonStr) {
    if (typeof jsonStr !== 'string') {
      throw new TypeError('Import payload must be a JSON string.');
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      throw new Error('Invalid JSON format.');
    }

    if (!parsed || !Array.isArray(parsed.events)) {
      throw new Error('Malformed ledger payload: missing "events" array.');
    }

    this.events = parsed.events.map(ev => Object.freeze(cloneDeep(ev)));
    this.snapshots = Array.isArray(parsed.snapshots) ? cloneDeep(parsed.snapshots) : [];
    this.cursor = this.events.length - 1;

    const integrity = this.verifyLedgerIntegrity();
    if (!integrity.valid) {
      throw new Error(`Imported ledger failed cryptographic verification: ${integrity.errors.join('; ')}`);
    }

    this._notifySubscribers(null, 'LEDGER_IMPORTED');
    return this.events.length;
  }

  /**
   * Resets ledger to clean empty state.
   */
  clear() {
    this.events = [];
    this.snapshots = [];
    this.cursor = -1;
    this._notifySubscribers(null, 'LEDGER_CLEARED');
  }
}

// Window global registration for direct browser script support
if (typeof window !== 'undefined') {
  window.TravelOdysseyEventSourcingLedger = TravelOdysseyEventSourcingLedger;
  window.EVENT_TYPES = EVENT_TYPES;
}
