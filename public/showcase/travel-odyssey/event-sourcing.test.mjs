import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  TravelOdysseyEventSourcingLedger,
  EVENT_TYPES,
  GENESIS_CHECKSUM,
  computeEventHash,
  computeStructuralDiff,
  createInitialState
} from './event-sourcing.js';

describe('TravelOdysseyEventSourcingLedger (Issue #2842)', () => {

  describe('1. Initialization & Empty State', () => {
    it('initializes with empty ledger by default', () => {
      const ledger = new TravelOdysseyEventSourcingLedger();
      assert.equal(ledger.getEventCount(), 0);
      assert.equal(ledger.getCursor(), -1);
      assert.deepEqual(ledger.getEvents(), []);
      assert.deepEqual(ledger.getSnapshots(), []);

      const state = ledger.getCurrentState();
      assert.equal(state.status, 'UNINITIALIZED');
      assert.equal(state.version, 0);
      assert.equal(state.budget.total, 0);
      assert.equal(state.destinations.length, 0);
    });

    it('initializes with seed events when provided', () => {
      const seedEvents = [
        { type: EVENT_TYPES.TRIP_CREATED, payload: { title: 'Alpine Expedition', budget: 5000 } },
        { type: EVENT_TYPES.DESTINATION_ADDED, payload: { name: 'Zermatt', country: 'Switzerland' } }
      ];
      const ledger = new TravelOdysseyEventSourcingLedger(seedEvents);
      assert.equal(ledger.getEventCount(), 2);
      assert.equal(ledger.getCursor(), 1);
      
      const state = ledger.getCurrentState();
      assert.equal(state.trip.title, 'Alpine Expedition');
      assert.equal(state.destinations.length, 1);
      assert.equal(state.destinations[0].name, 'Zermatt');
    });
  });

  describe('2. Immutability & Event Structure', () => {
    it('assigns version, id, timestamp, metadata, and checksum to each event', () => {
      const ledger = new TravelOdysseyEventSourcingLedger();
      const event = ledger.append(EVENT_TYPES.TRIP_CREATED, {
        title: 'Nordic Aurora',
        budget: 4200
      }, { author: 'explorer_99' });

      assert.equal(event.version, 1);
      assert.ok(typeof event.id === 'string' && event.id.startsWith('evt_'));
      assert.ok(typeof event.timestamp === 'number');
      assert.equal(event.metadata.author, 'explorer_99');
      assert.equal(event.metadata.source, 'TravelOdysseyClient');
      assert.ok(typeof event.checksum === 'string' && event.checksum.length === 32);
    });

    it('enforces deep immutability on returned events and prevents ledger tampering', () => {
      const ledger = new TravelOdysseyEventSourcingLedger();
      ledger.append(EVENT_TYPES.TRIP_CREATED, { title: 'Kyoto Odyssey', budget: 3000 });

      const events = ledger.getEvents();
      assert.equal(events.length, 1);

      // Attempt mutating outer array
      events.push({ type: 'HACKED' });
      assert.equal(ledger.getEventCount(), 1);

      // Attempt mutating internal event payload
      events[0].payload.title = 'Mutated Title';
      const freshEvents = ledger.getEvents();
      assert.equal(freshEvents[0].payload.title, 'Kyoto Odyssey');
    });

    it('rejects invalid or empty event types', () => {
      const ledger = new TravelOdysseyEventSourcingLedger();
      assert.throws(() => ledger.append(''), /Event type must be a non-empty string/);
      assert.throws(() => ledger.append(null), /Event type must be a non-empty string/);
      assert.throws(() => ledger.append(123), /Event type must be a non-empty string/);
    });

    it('supports appendEvent alias matching append', () => {
      const ledger = new TravelOdysseyEventSourcingLedger();
      const ev = ledger.appendEvent(EVENT_TYPES.TRIP_CREATED, { title: 'Sahara Quest' });
      assert.equal(ev.type, EVENT_TYPES.TRIP_CREATED);
      assert.equal(ledger.getEventCount(), 1);
    });
  });

  describe('3. Cryptographic Chain & Integrity Verification', () => {
    it('builds a tamper-proof cryptographic chain across sequential events', () => {
      const ledger = new TravelOdysseyEventSourcingLedger();
      const ev1 = ledger.append(EVENT_TYPES.TRIP_CREATED, { title: 'Patagonia Hike', budget: 6000 });
      const ev2 = ledger.append(EVENT_TYPES.DESTINATION_ADDED, { name: 'El Chaltén' });
      const ev3 = ledger.append(EVENT_TYPES.FLIGHT_BOOKED, { airline: 'Aerolíneas', cost: 850 });

      // Event 1 hashes from GENESIS_CHECKSUM
      const expectedHash1 = computeEventHash(GENESIS_CHECKSUM, ev1);
      assert.equal(ev1.checksum, expectedHash1);

      // Event 2 hashes from Event 1 checksum
      const expectedHash2 = computeEventHash(ev1.checksum, ev2);
      assert.equal(ev2.checksum, expectedHash2);

      // Event 3 hashes from Event 2 checksum
      const expectedHash3 = computeEventHash(ev2.checksum, ev3);
      assert.equal(ev3.checksum, expectedHash3);

      const integrity = ledger.verifyLedgerIntegrity();
      assert.equal(integrity.valid, true);
      assert.equal(integrity.verifiedEvents, 3);
      assert.equal(integrity.errors.length, 0);
    });

    it('detects tampering if internal event or checksum is corrupted', () => {
      const ledger = new TravelOdysseyEventSourcingLedger();
      ledger.append(EVENT_TYPES.TRIP_CREATED, { title: 'Valid Trip', budget: 1000 });
      ledger.append(EVENT_TYPES.DESTINATION_ADDED, { name: 'Rome' });

      // Directly tamper with private events array to simulate storage corruption or attack
      ledger.events[1] = {
        ...ledger.events[1],
        payload: { name: 'Malicious Destination' }
      };

      const integrity = ledger.verifyLedgerIntegrity();
      assert.equal(integrity.valid, false);
      assert.ok(integrity.errors.some(e => e.includes('Cryptographic checksum mismatch')));
    });
  });

  describe('4. Deterministic State Reconstruction', () => {
    it('materializes comprehensive domain state accurately across actions', () => {
      const ledger = new TravelOdysseyEventSourcingLedger();

      // Step 1: Create Trip
      ledger.append(EVENT_TYPES.TRIP_CREATED, {
        title: 'Grand Japan Circuit',
        startDate: '2026-09-01',
        endDate: '2026-09-20',
        budget: 8000,
        currency: 'USD',
        travelers: 2
      });

      let state = ledger.getCurrentState();
      assert.equal(state.status, 'PLANNING');
      assert.equal(state.trip.title, 'Grand Japan Circuit');
      assert.equal(state.budget.total, 8000);
      assert.equal(state.budget.allocated, 0);
      assert.equal(state.budget.remaining, 8000);
      assert.equal(state.travelers.length, 2);

      // Step 2: Add Destinations
      ledger.append(EVENT_TYPES.DESTINATION_ADDED, { name: 'Tokyo', country: 'Japan' });
      ledger.append(EVENT_TYPES.DESTINATION_ADDED, { name: 'Kyoto', country: 'Japan' });
      state = ledger.getCurrentState();
      assert.equal(state.destinations.length, 2);
      assert.equal(state.destinations[0].name, 'Tokyo');
      assert.equal(state.destinations[1].name, 'Kyoto');

      // Step 3: Book Flight
      ledger.append(EVENT_TYPES.FLIGHT_BOOKED, {
        id: 'fl_001',
        airline: 'All Nippon Airways',
        flightNumber: 'NH108',
        from: 'SFO',
        to: 'HND',
        cost: 1400
      });
      state = ledger.getCurrentState();
      assert.equal(state.flights.length, 1);
      assert.equal(state.budget.allocated, 1400);
      assert.equal(state.budget.remaining, 6600);

      // Step 4: Reserve Hotel
      ledger.append(EVENT_TYPES.HOTEL_RESERVED, {
        id: 'ht_001',
        hotelName: 'Aman Tokyo',
        cost: 2200,
        nights: 4
      });
      state = ledger.getCurrentState();
      assert.equal(state.hotels.length, 1);
      assert.equal(state.budget.allocated, 3600);
      assert.equal(state.budget.remaining, 4400);

      // Step 5: Schedule Activity
      ledger.append(EVENT_TYPES.ACTIVITY_SCHEDULED, {
        id: 'act_001',
        title: 'Tsukiji Fish Market Private Tour',
        cost: 250
      });
      state = ledger.getCurrentState();
      assert.equal(state.activities.length, 1);
      assert.equal(state.budget.allocated, 3850);
      assert.equal(state.budget.remaining, 4150);

      // Step 6: Adjust Budget
      ledger.append(EVENT_TYPES.BUDGET_ADJUSTED, { delta: 1000 });
      state = ledger.getCurrentState();
      assert.equal(state.budget.total, 9000);
      assert.equal(state.budget.remaining, 5150);

      // Step 7: Cancel Flight with refund
      ledger.append(EVENT_TYPES.FLIGHT_CANCELLED, { flightId: 'fl_001' });
      state = ledger.getCurrentState();
      assert.equal(state.flights[0].status, 'CANCELLED');
      assert.equal(state.budget.allocated, 2450);
      assert.equal(state.budget.remaining, 6550);

      // Step 8: Confirm Trip
      ledger.append(EVENT_TYPES.TRIP_CONFIRMED, { confirmationCode: 'ODYSSEY-JP-2026' });
      state = ledger.getCurrentState();
      assert.equal(state.status, 'CONFIRMED');
      assert.equal(state.confirmationCode, 'ODYSSEY-JP-2026');

      // Step 9: Replay determinism
      const replay1 = ledger.getMaterializedState();
      const replay2 = ledger.getMaterializedState();
      assert.deepEqual(replay1, replay2);
    });

    it('handles cancellation and trip status transitions properly', () => {
      const ledger = new TravelOdysseyEventSourcingLedger();
      ledger.append(EVENT_TYPES.TRIP_CREATED, { title: 'Short Getaway', budget: 500 });
      ledger.append(EVENT_TYPES.TRIP_CANCELLED, { reason: 'Severe Weather Warning' });

      const state = ledger.getCurrentState();
      assert.equal(state.status, 'CANCELLED');
      assert.equal(state.cancellationReason, 'Severe Weather Warning');
    });
  });

  describe('5. Historical Rewind & Temporal Time Travel', () => {
    it('rewinds to exact state at any historical version', () => {
      const ledger = new TravelOdysseyEventSourcingLedger();
      ledger.append(EVENT_TYPES.TRIP_CREATED, { title: 'Time Machine', budget: 1000 }); // v1
      ledger.append(EVENT_TYPES.DESTINATION_ADDED, { name: 'Alexandria' });              // v2
      ledger.append(EVENT_TYPES.DESTINATION_ADDED, { name: 'Constantinople' });          // v3
      ledger.append(EVENT_TYPES.DESTINATION_ADDED, { name: 'Babylon' });                 // v4

      const stateAtV1 = ledger.getStateAt(1);
      assert.equal(stateAtV1.destinations.length, 0);

      const stateAtV2 = ledger.getStateAt(2);
      assert.equal(stateAtV2.destinations.length, 1);
      assert.equal(stateAtV2.destinations[0].name, 'Alexandria');

      const stateAtV3 = ledger.getStateAt(3);
      assert.equal(stateAtV3.destinations.length, 2);

      const stateAtV4 = ledger.getStateAt(4);
      assert.equal(stateAtV4.destinations.length, 3);

      const stateAtV0 = ledger.getStateAt(0);
      assert.equal(stateAtV0.status, 'UNINITIALIZED');
    });

    it('reconstructs state at arbitrary timestamps with replayToTimestamp', () => {
      const ledger = new TravelOdysseyEventSourcingLedger();
      const baseTime = 1700000000000;

      ledger.append(EVENT_TYPES.TRIP_CREATED, { title: 'Dated Trip', budget: 2000 }, {}, { timestamp: baseTime });
      ledger.append(EVENT_TYPES.DESTINATION_ADDED, { name: 'Reykjavik' }, {}, { timestamp: baseTime + 10000 });
      ledger.append(EVENT_TYPES.DESTINATION_ADDED, { name: 'Akureyri' }, {}, { timestamp: baseTime + 20000 });

      const midState = ledger.replayToTimestamp(baseTime + 15000);
      assert.equal(midState.destinations.length, 1);
      assert.equal(midState.destinations[0].name, 'Reykjavik');

      const fullState = ledger.replayToTimestamp(baseTime + 30000);
      assert.equal(fullState.destinations.length, 2);

      const preState = ledger.replayToTimestamp(baseTime - 1000);
      assert.equal(preState.status, 'UNINITIALIZED');
    });

    it('scrubs timeline cursor with timeTravel, stepForward, and stepBackward', () => {
      const ledger = new TravelOdysseyEventSourcingLedger();
      ledger.append(EVENT_TYPES.TRIP_CREATED, { title: 'Scrubber Test', budget: 1000 });
      ledger.append(EVENT_TYPES.DESTINATION_ADDED, { name: 'Lisbon' });
      ledger.append(EVENT_TYPES.DESTINATION_ADDED, { name: 'Porto' });

      assert.equal(ledger.getCursor(), 2);

      // Scrub back to index 0 (v1)
      ledger.scrub(0);
      assert.equal(ledger.getCursor(), 0);
      assert.equal(ledger.getCurrentState().destinations.length, 0);

      // Step forward to index 1 (v2)
      ledger.stepForward();
      assert.equal(ledger.getCursor(), 1);
      assert.equal(ledger.getCurrentState().destinations.length, 1);

      // Step backward to index 0
      ledger.stepBackward();
      assert.equal(ledger.getCursor(), 0);

      // Jump to start (-1)
      ledger.jumpToStart();
      assert.equal(ledger.getCursor(), -1);
      assert.equal(ledger.getCurrentState().status, 'UNINITIALIZED');

      // Jump to end (2)
      ledger.jumpToEnd();
      assert.equal(ledger.getCursor(), 2);
      assert.equal(ledger.getCurrentState().destinations.length, 2);
    });

    it('safely clamps out-of-range scrub indices', () => {
      const ledger = new TravelOdysseyEventSourcingLedger();
      ledger.append(EVENT_TYPES.TRIP_CREATED, { title: 'Clamp Test' });

      ledger.timeTravel(999);
      assert.equal(ledger.getCursor(), 0);

      ledger.timeTravel(-100);
      assert.equal(ledger.getCursor(), -1);
    });
  });

  describe('6. Snapshots & Snapshot Restoration', () => {
    it('creates snapshot and restores state cleanly', () => {
      const ledger = new TravelOdysseyEventSourcingLedger();
      ledger.append(EVENT_TYPES.TRIP_CREATED, { title: 'Snapshot Tour', budget: 4000 });
      ledger.append(EVENT_TYPES.DESTINATION_ADDED, { name: 'Vienna' });

      const snap1 = ledger.createSnapshot('Checkpoint Vienna');
      assert.equal(snap1.version, 2);
      assert.equal(snap1.tag, 'Checkpoint Vienna');
      assert.equal(snap1.state.destinations.length, 1);

      // Add more events
      ledger.append(EVENT_TYPES.DESTINATION_ADDED, { name: 'Salzburg' });
      ledger.append(EVENT_TYPES.DESTINATION_ADDED, { name: 'Innsbruck' });
      assert.equal(ledger.getCurrentState().destinations.length, 3);

      // Restore to snap1
      const restoredState = ledger.restoreFromSnapshot(snap1.id);
      assert.equal(ledger.getCursor(), 1);
      assert.equal(restoredState.destinations.length, 1);
      assert.equal(restoredState.destinations[0].name, 'Vienna');
    });

    it('throws error when restoring non-existent snapshot', () => {
      const ledger = new TravelOdysseyEventSourcingLedger();
      assert.throws(() => ledger.restoreFromSnapshot('non_existent_id'), /not found/);
    });
  });

  describe('7. Structural Diff Computation', () => {
    it('computes accurate differences between two states', () => {
      const stateA = {
        title: 'Rome Trip',
        budget: { total: 2000, remaining: 1500 },
        destinations: ['Rome']
      };
      const stateB = {
        title: 'Rome & Florence Trip',
        budget: { total: 2500, remaining: 1000 },
        destinations: ['Rome', 'Florence'],
        status: 'CONFIRMED'
      };

      const diff = computeStructuralDiff(stateA, stateB);
      assert.ok(diff.totalChanges >= 4);

      const titleChange = diff.changes.find(c => c.path === 'title');
      assert.equal(titleChange.kind, 'MODIFIED');
      assert.equal(titleChange.prev, 'Rome Trip');
      assert.equal(titleChange.current, 'Rome & Florence Trip');

      const statusAdd = diff.changes.find(c => c.path === 'status');
      assert.equal(statusAdd.kind, 'ADDED');
      assert.equal(statusAdd.current, 'CONFIRMED');
    });
  });

  describe('8. Subscriptions & Event Listeners', () => {
    it('notifies subscribers on append and time-travel', () => {
      const ledger = new TravelOdysseyEventSourcingLedger();
      const notifications = [];

      const unsubscribe = ledger.subscribe((data) => {
        notifications.push(data);
      });

      ledger.append(EVENT_TYPES.TRIP_CREATED, { title: 'Sub Test', budget: 1000 });
      assert.equal(notifications.length, 1);
      assert.equal(notifications[0].trigger, 'EVENT_APPENDED');
      assert.equal(notifications[0].event.type, EVENT_TYPES.TRIP_CREATED);

      ledger.timeTravel(0);
      assert.equal(notifications.length, 2);
      assert.equal(notifications[1].trigger, 'TIME_TRAVEL');

      unsubscribe();
      ledger.append(EVENT_TYPES.DESTINATION_ADDED, { name: 'Madrid' });
      assert.equal(notifications.length, 2); // No new notification after unsub
    });

    it('triggers specific on() and off() event listeners', () => {
      const ledger = new TravelOdysseyEventSourcingLedger();
      let flightBookedCalls = 0;

      const unsubscribe = ledger.on(EVENT_TYPES.FLIGHT_BOOKED, (event, state) => {
        flightBookedCalls++;
        assert.equal(event.type, EVENT_TYPES.FLIGHT_BOOKED);
        assert.ok(state);
      });

      ledger.append(EVENT_TYPES.TRIP_CREATED, { title: 'Listener Test' });
      assert.equal(flightBookedCalls, 0);

      ledger.append(EVENT_TYPES.FLIGHT_BOOKED, { airline: 'Lufthansa', cost: 500 });
      assert.equal(flightBookedCalls, 1);

      unsubscribe();
      ledger.append(EVENT_TYPES.FLIGHT_BOOKED, { airline: 'Swiss', cost: 600 });
      assert.equal(flightBookedCalls, 1);
    });
  });

  describe('9. Serialization, Export & Import', () => {
    it('exports ledger to JSON and imports it with unbroken cryptographic integrity', () => {
      const ledger1 = new TravelOdysseyEventSourcingLedger();
      ledger1.append(EVENT_TYPES.TRIP_CREATED, { title: 'Trans-Siberian', budget: 5000 });
      ledger1.append(EVENT_TYPES.DESTINATION_ADDED, { name: 'Moscow' });
      ledger1.append(EVENT_TYPES.DESTINATION_ADDED, { name: 'Vladivostok' });
      ledger1.createSnapshot('Midway');

      const jsonStr = ledger1.exportLedger();
      assert.ok(typeof jsonStr === 'string');

      const ledger2 = new TravelOdysseyEventSourcingLedger();
      const count = ledger2.importLedger(jsonStr);
      assert.equal(count, 3);
      assert.equal(ledger2.getEventCount(), 3);
      assert.equal(ledger2.getSnapshots().length, 1);

      // Verify identical state
      assert.deepEqual(ledger1.getCurrentState(), ledger2.getCurrentState());

      // Verify integrity in imported ledger
      const integrity = ledger2.verifyLedgerIntegrity();
      assert.equal(integrity.valid, true);
    });

    it('throws error when importing invalid JSON or tampered ledger data', () => {
      const ledger = new TravelOdysseyEventSourcingLedger();
      assert.throws(() => ledger.importLedger('not json'), /Invalid JSON format/);
      assert.throws(() => ledger.importLedger('{}'), /missing "events" array/);

      // Tampered checksum in JSON
      const tampered = JSON.stringify({
        events: [
          {
            id: 'evt_1',
            type: EVENT_TYPES.TRIP_CREATED,
            payload: { title: 'Fake' },
            timestamp: 1000,
            version: 1,
            metadata: {},
            checksum: 'badbadbadbadbadbadbadbadbadbadba'
          }
        ]
      });
      assert.throws(() => ledger.importLedger(tampered), /cryptographic verification/);
    });
  });

  describe('10. Custom Events & Reset', () => {
    it('accepts and records custom events without crashing', () => {
      const ledger = new TravelOdysseyEventSourcingLedger();
      ledger.append('CUSTOM_WEATHER_ALERT', { alert: 'Blizzard', severity: 'HIGH' });

      const state = ledger.getCurrentState();
      assert.equal(state.customEvents.length, 1);
      assert.equal(state.customEvents[0].type, 'CUSTOM_WEATHER_ALERT');
      assert.equal(state.customEvents[0].payload.alert, 'Blizzard');
    });

    it('clears all events and snapshots with clear()', () => {
      const ledger = new TravelOdysseyEventSourcingLedger();
      ledger.append(EVENT_TYPES.TRIP_CREATED, { title: 'Temporary' });
      ledger.createSnapshot('Temp');
      assert.equal(ledger.getEventCount(), 1);

      ledger.clear();
      assert.equal(ledger.getEventCount(), 0);
      assert.equal(ledger.getCursor(), -1);
      assert.equal(ledger.getSnapshots().length, 0);
      assert.equal(ledger.getCurrentState().status, 'UNINITIALIZED');
    });
  });

});
