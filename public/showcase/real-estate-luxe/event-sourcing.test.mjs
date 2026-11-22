import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RealEstateLuxeEventSourcingLedger,
  EVENT_TYPES,
  computeEventChecksum,
  createInitialState,
  deepClone,
  deepFreeze
} from './event-sourcing.js';

test('Ledger Initialization - starts with empty events and clean default state', () => {
  const ledger = new RealEstateLuxeEventSourcingLedger({ storageKey: null });

  assert.equal(ledger.length, 0);
  assert.equal(ledger.getEvents().length, 0);
  assert.equal(ledger.cursorIndex, 0);

  const state = ledger.getMaterializedState();
  assert.equal(state.version, 0);
  assert.equal(state.property.status, 'UNLISTED');
  assert.equal(state.property.listPrice, 0);
  assert.equal(state.escrow.opened, false);
  assert.equal(state.closing.isClosed, false);
});

test('Event Append & Immutability - appending events increments version and freezes payload', () => {
  const ledger = new RealEstateLuxeEventSourcingLedger({ storageKey: null });

  const inputPayload = {
    title: 'Bel-Air Promontory Estate',
    listPrice: 28500000,
    specs: { bedrooms: 7, bathrooms: 11, sqft: 16500 }
  };

  const evt = ledger.append(EVENT_TYPES.PROPERTY_LISTED, inputPayload, { actor: 'Senior Broker' });

  assert.equal(ledger.length, 1);
  assert.equal(evt.version, 1);
  assert.equal(evt.type, EVENT_TYPES.PROPERTY_LISTED);
  assert.equal(evt.payload.listPrice, 28500000);
  assert.ok(evt.id.startsWith('evt_1_'));
  assert.ok(evt.checksum.length === 64);

  // Input object mutation isolation check
  inputPayload.listPrice = 1000;
  inputPayload.specs.bedrooms = 99;

  const storedEvents = ledger.getEvents();
  assert.equal(storedEvents[0].payload.listPrice, 28500000, 'Ledger event must remain unaffected by later input object mutation');
  assert.equal(storedEvents[0].payload.specs.bedrooms, 7);

  // Returned getEvents list mutation isolation check
  storedEvents.push({ type: 'HACKED' });
  assert.equal(ledger.getEvents().length, 1, 'Pushing to returned events list must not alter ledger');
});

test('Deterministic State Reconstruction - sequential lifecycle events fold into correct materialized state', () => {
  const ledger = new RealEstateLuxeEventSourcingLedger({ storageKey: null });

  // 1. List Property
  ledger.append(EVENT_TYPES.PROPERTY_LISTED, {
    propertyId: 'ESTATE-90210',
    title: 'The Bellagio Villa',
    address: '10480 Bellagio Rd, Bel Air',
    listPrice: 32000000,
    bedrooms: 8,
    bathrooms: 12,
    sqft: 18000,
    sellerName: 'Ambassador Holdings LLC',
    agent: 'Victoria Vance'
  });

  // 2. Adjust Price
  ledger.append(EVENT_TYPES.PRICE_ADJUSTED, {
    newPrice: 29900000,
    reason: 'Autumn Market Realignment'
  });

  // 3. Submit Offer
  ledger.append(EVENT_TYPES.OFFER_SUBMITTED, {
    offerId: 'OFF-7701',
    buyerName: 'Geneva Sovereign Capital',
    offerAmount: 29000000,
    terms: 'All-Cash wire, 10-day expedited escrow'
  });

  // 4. Accept Offer
  ledger.append(EVENT_TYPES.OFFER_ACCEPTED, {
    acceptedPrice: 29000000
  });

  // 5. Deposit Escrow
  ledger.append(EVENT_TYPES.ESCROW_DEPOSITED, {
    amount: 1500000,
    escrowHolder: 'First American Title & Escrow Co.'
  });

  // 6. Complete Inspection
  ledger.append(EVENT_TYPES.INSPECTION_COMPLETED, {
    passed: true,
    inspector: 'California Architectural Audit Group',
    rating: 'A+ Exceptional'
  });

  // 7. Clear Contingencies
  ledger.append(EVENT_TYPES.CONTINGENCY_CLEARED, {
    contingencyName: 'Structural & Geological Survey',
    verifiedBy: 'Lead Escrow Officer'
  });
  ledger.append(EVENT_TYPES.CONTINGENCY_CLEARED, {
    contingencyName: 'Foreign Investment Regulatory Clearance',
    verifiedBy: 'International Legal Counsel'
  });

  // 8. Title Transferred
  ledger.append(EVENT_TYPES.TITLE_TRANSFERRED, {
    titleCompany: 'Fidelity National Title Insurance',
    deedBookNumber: 'DEED-LA-2026-00918',
    notary: 'State Notary Commission #48190'
  });

  // 9. Close Sale
  ledger.append(EVENT_TYPES.SALE_CLOSED, {
    finalSalePrice: 29000000,
    settlementAgent: 'Beverly Hills Settlement Lawyers',
    keysDelivered: true
  });

  assert.equal(ledger.length, 10);
  const state = ledger.getMaterializedState();

  assert.equal(state.version, 10);
  assert.equal(state.property.status, 'CLOSED');
  assert.equal(state.property.listPrice, 29000000);
  assert.equal(state.property.originalPrice, 32000000);
  assert.equal(state.priceHistory.length, 2);
  assert.equal(state.escrow.opened, true);
  assert.equal(state.escrow.amountDeposited, 1500000);
  assert.equal(state.inspection.completed, true);
  assert.equal(state.inspection.passed, true);
  assert.equal(state.contingencies.length, 2);
  assert.equal(state.title.transferred, true);
  assert.equal(state.closing.isClosed, true);
  assert.equal(state.closing.finalSalePrice, 29000000);
  assert.equal(state.closing.keysDelivered, true);
});

test('Cryptographic Audit Chaining & Tamper Detection - verifies hash chain integrity and flags corruptions', () => {
  const ledger = new RealEstateLuxeEventSourcingLedger({ storageKey: null });

  ledger.append(EVENT_TYPES.PROPERTY_LISTED, { listPrice: 15000000, title: 'Pacific Palisades Retreat' });
  ledger.append(EVENT_TYPES.PRICE_ADJUSTED, { newPrice: 14500000, reason: 'Spring incentive' });
  ledger.append(EVENT_TYPES.OFFER_SUBMITTED, { offerAmount: 14200000, buyerName: 'Elena Rostova' });

  // Initial check must be fully valid
  const checkInitial = ledger.verifyLedgerIntegrity();
  assert.equal(checkInitial.isValid, true);
  assert.equal(checkInitial.totalEvents, 3);

  // Directly tamper with private events array to simulate storage corruption or malicious injection
  const tamperedPayload = { ...ledger.events[1].payload, newPrice: 5000000 };
  ledger.events[1] = {
    ...ledger.events[1],
    payload: tamperedPayload
  };

  const checkTampered = ledger.verifyLedgerIntegrity();
  assert.equal(checkTampered.isValid, false);
  assert.equal(checkTampered.corruptedIndex, 1);
  assert.ok(checkTampered.reason.includes('Checksum signature mismatch'));
});

test('Historical Rewind & Time Travel - getStateAt accurately re-creates past states without side-effects', () => {
  const ledger = new RealEstateLuxeEventSourcingLedger({ storageKey: null });

  ledger.append(EVENT_TYPES.PROPERTY_LISTED, { listPrice: 20000000 }); // v1
  ledger.append(EVENT_TYPES.PRICE_ADJUSTED, { newPrice: 19000000 }); // v2
  ledger.append(EVENT_TYPES.OFFER_SUBMITTED, { offerAmount: 18500000, buyerName: 'Sterling Family' }); // v3
  ledger.append(EVENT_TYPES.OFFER_ACCEPTED, { acceptedPrice: 18500000 }); // v4
  ledger.append(EVENT_TYPES.ESCROW_DEPOSITED, { amount: 1000000 }); // v5

  // State at v0 (genesis)
  const stateV0 = ledger.getStateAt(0);
  assert.equal(stateV0.version, 0);
  assert.equal(stateV0.property.status, 'UNLISTED');

  // State at v1 (initial list)
  const stateV1 = ledger.getStateAt(1);
  assert.equal(stateV1.version, 1);
  assert.equal(stateV1.property.status, 'LISTED');
  assert.equal(stateV1.property.listPrice, 20000000);
  assert.equal(stateV1.escrow.opened, false);

  // State at v2 (after price drop)
  const stateV2 = ledger.getStateAt(2);
  assert.equal(stateV2.version, 2);
  assert.equal(stateV2.property.listPrice, 19000000);

  // State at v3 (offer pending)
  const stateV3 = ledger.getStateAt(3);
  assert.equal(stateV3.version, 3);
  assert.equal(stateV3.property.status, 'OFFER_PENDING');
  assert.equal(stateV3.activeOffer.amount, 18500000);

  // State at v5 (current)
  const stateV5 = ledger.getStateAt(5);
  assert.equal(stateV5.version, 5);
  assert.equal(stateV5.escrow.opened, true);
  assert.equal(stateV5.property.status, 'IN_ESCROW');

  // Verify calling getStateAt did not move or mutate current live state
  const liveState = ledger.getMaterializedState();
  assert.equal(liveState.version, 5);
});

test('Replay to Timestamp - historical temporal query by timestamp', () => {
  const ledger = new RealEstateLuxeEventSourcingLedger({ storageKey: null });

  const t0 = 1700000000000;
  ledger.append(EVENT_TYPES.PROPERTY_LISTED, { listPrice: 10000000 }, { timestamp: t0 });
  ledger.append(EVENT_TYPES.PRICE_ADJUSTED, { newPrice: 9500000 }, { timestamp: t0 + 10000 });
  ledger.append(EVENT_TYPES.OFFER_SUBMITTED, { offerAmount: 9200000 }, { timestamp: t0 + 20000 });

  // Query prior to price drop
  const stateBeforeDrop = ledger.replayToTimestamp(t0 + 5000);
  assert.equal(stateBeforeDrop.version, 1);
  assert.equal(stateBeforeDrop.property.listPrice, 10000000);

  // Query after price drop but before offer
  const stateAfterDrop = ledger.replayToTimestamp(t0 + 15000);
  assert.equal(stateAfterDrop.version, 2);
  assert.equal(stateAfterDrop.property.listPrice, 9500000);
  assert.equal(stateAfterDrop.offers.length, 0);

  // Query after offer
  const stateFinal = ledger.replayToTimestamp(t0 + 25000);
  assert.equal(stateFinal.version, 3);
  assert.equal(stateFinal.offers.length, 1);
});

test('Scrubber & Time-Travel Navigation - step controls move cursor properly', () => {
  const ledger = new RealEstateLuxeEventSourcingLedger({ storageKey: null });

  ledger.append(EVENT_TYPES.PROPERTY_LISTED, { listPrice: 12000000 });
  ledger.append(EVENT_TYPES.PRICE_ADJUSTED, { newPrice: 11000000 });
  ledger.append(EVENT_TYPES.OFFER_SUBMITTED, { offerAmount: 10800000 });

  assert.equal(ledger.cursorIndex, 3);

  // Scrub to index 1
  const s1 = ledger.scrub(1);
  assert.equal(ledger.cursorIndex, 1);
  assert.equal(s1.version, 1);
  assert.equal(s1.property.listPrice, 12000000);

  // Step forward
  const s2 = ledger.stepForward();
  assert.equal(ledger.cursorIndex, 2);
  assert.equal(s2.version, 2);
  assert.equal(s2.property.listPrice, 11000000);

  // Step backward
  const sBack = ledger.stepBackward();
  assert.equal(ledger.cursorIndex, 1);
  assert.equal(sBack.version, 1);

  // Jump to start & end
  const sStart = ledger.jumpToStart();
  assert.equal(ledger.cursorIndex, 0);
  assert.equal(sStart.version, 0);

  const sEnd = ledger.jumpToEnd();
  assert.equal(ledger.cursorIndex, 3);
  assert.equal(sEnd.version, 3);

  // Relative time travel call
  ledger.timeTravel(-1, { relative: true });
  assert.equal(ledger.cursorIndex, 2);
});

test('Snapshot Acceleration & Restore - captures state and fast-forwards', () => {
  const ledger = new RealEstateLuxeEventSourcingLedger({ storageKey: null });

  ledger.append(EVENT_TYPES.PROPERTY_LISTED, { listPrice: 50000000, title: 'Malibu Cliffside Sanctuary' });
  ledger.append(EVENT_TYPES.PRICE_ADJUSTED, { newPrice: 48000000 });

  // Take snapshot at v2
  const snap = ledger.createSnapshot('Pre-Offer Milestone');
  assert.equal(snap.version, 2);
  assert.equal(snap.state.property.listPrice, 48000000);
  assert.equal(ledger.getSnapshots().length, 1);

  // Append further events after snapshot
  ledger.append(EVENT_TYPES.OFFER_SUBMITTED, { offerAmount: 47000000, buyerName: 'Tech Mogul' });
  ledger.append(EVENT_TYPES.OFFER_ACCEPTED, { acceptedPrice: 47000000 });

  assert.equal(ledger.length, 4);

  // Querying v4 utilizes snapshot v2 + folds 2 events
  const stateV4 = ledger.getStateAt(4);
  assert.equal(stateV4.version, 4);
  assert.equal(stateV4.property.status, 'UNDER_OFFER');

  // Restoring snapshot moves cursor to snapshot version
  const restoredState = ledger.restoreFromSnapshot(snap.id);
  assert.equal(ledger.cursorIndex, 2);
  assert.equal(restoredState.version, 2);
  assert.equal(restoredState.property.listPrice, 48000000);
});

test('Subscription & Event Listeners - triggers callbacks on append and time-travel', () => {
  const ledger = new RealEstateLuxeEventSourcingLedger({ storageKey: null });

  let appendDispatches = 0;
  let timeTravelDispatches = 0;
  let customOfferDispatches = 0;

  const unsubscribeAll = ledger.subscribe((event) => {
    if (event.eventName === 'append') appendDispatches++;
    if (event.eventName === 'time_travel') timeTravelDispatches++;
  });

  const unsubscribeOffer = ledger.on(EVENT_TYPES.OFFER_SUBMITTED, (data) => {
    customOfferDispatches++;
    assert.equal(data.event.type, EVENT_TYPES.OFFER_SUBMITTED);
  });

  ledger.append(EVENT_TYPES.PROPERTY_LISTED, { listPrice: 1000000 });
  ledger.append(EVENT_TYPES.OFFER_SUBMITTED, { offerAmount: 950000 });

  assert.equal(appendDispatches, 2);
  assert.equal(customOfferDispatches, 1);

  ledger.scrub(1);
  assert.equal(timeTravelDispatches, 1);

  // Clean unsubscribe
  unsubscribeAll();
  unsubscribeOffer();

  ledger.append(EVENT_TYPES.PRICE_ADJUSTED, { newPrice: 900000 });
  assert.equal(appendDispatches, 2, 'Unsubscribed listener must not be called');
});

test('Diff Engine - computes field level differences between states', () => {
  const ledger = new RealEstateLuxeEventSourcingLedger({ storageKey: null });

  ledger.append(EVENT_TYPES.PROPERTY_LISTED, { listPrice: 15000000 });
  ledger.append(EVENT_TYPES.PRICE_ADJUSTED, { newPrice: 14000000 });

  const state1 = ledger.getStateAt(1);
  const state2 = ledger.getStateAt(2);

  const diff = ledger.computeDiff(state1, state2);
  assert.ok(diff.changes.length > 0);

  const priceDiff = diff.changes.find(c => c.path === 'property.listPrice');
  assert.ok(priceDiff, 'Expected price difference to be tracked');
  assert.equal(priceDiff.oldValue, 15000000);
  assert.equal(priceDiff.newValue, 14000000);
});

test('JSON Export and Import - round-trip serialization maintains event log and integrity', () => {
  const ledger = new RealEstateLuxeEventSourcingLedger({ storageKey: null });

  ledger.append(EVENT_TYPES.PROPERTY_LISTED, { listPrice: 22000000, title: 'Aspen Alpine Villa' });
  ledger.append(EVENT_TYPES.OFFER_SUBMITTED, { offerAmount: 21500000, buyerName: 'Highland Trust' });
  ledger.createSnapshot('Initial Offer Stage');

  const jsonDump = ledger.exportJSON();
  assert.ok(typeof jsonDump === 'string');

  const secondaryLedger = new RealEstateLuxeEventSourcingLedger({ storageKey: null });
  secondaryLedger.importJSON(jsonDump);

  assert.equal(secondaryLedger.length, 2);
  assert.equal(secondaryLedger.getSnapshots().length, 1);
  assert.equal(secondaryLedger.verifyLedgerIntegrity().isValid, true);

  const importedState = secondaryLedger.getMaterializedState();
  assert.equal(importedState.property.listPrice, 22000000);
  assert.equal(importedState.activeOffer.buyer, 'Highland Trust');
});

test('Edge Cases - handles invalid inputs, out-of-range scrub, and empty clear gracefully', () => {
  const ledger = new RealEstateLuxeEventSourcingLedger({ storageKey: null });

  // Invalid event types throw
  assert.throws(() => {
    ledger.append('');
  }, TypeError);

  assert.throws(() => {
    ledger.append(null);
  }, TypeError);

  // Out of range scrub clamps safely
  const sLow = ledger.scrub(-10);
  assert.equal(ledger.cursorIndex, 0);
  assert.equal(sLow.version, 0);

  const sHigh = ledger.scrub(999);
  assert.equal(ledger.cursorIndex, 0); // Still 0 since ledger length is 0

  // Restoring non-existent snapshot throws
  assert.throws(() => {
    ledger.restoreFromSnapshot('non_existent_id');
  }, Error);

  // Clear resets ledger
  ledger.append(EVENT_TYPES.PROPERTY_LISTED, { listPrice: 5000000 });
  assert.equal(ledger.length, 1);
  ledger.clear();
  assert.equal(ledger.length, 0);
  assert.equal(ledger.cursorIndex, 0);
  assert.equal(ledger.getMaterializedState().version, 0);
});
