import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TravelOdysseyAuditChain, computeAuditHash } from './audit-trail.js';

describe('TravelOdysseyAuditChain', () => {
  it('computes deterministic hashes from input strings', () => {
    const hash1 = computeAuditHash('itinerary-booking-1');
    const hash2 = computeAuditHash('itinerary-booking-1');
    const hash3 = computeAuditHash('itinerary-booking-2');

    assert.equal(typeof hash1, 'string');
    assert.equal(hash1, hash2);
    assert.notEqual(hash1, hash3);
  });

  it('initializes with a valid genesis itinerary block', () => {
    const chain = new TravelOdysseyAuditChain({ storageKey: 'test_travel_audit_chain_1' });
    const blocks = chain.getChain();

    assert.equal(blocks.length, 1);
    assert.equal(blocks[0].index, 0);
    assert.equal(blocks[0].action, 'GENESIS_ITINERARY_ROOT');
    assert.ok(blocks[0].hash.length > 0);

    const verification = chain.verifyChainIntegrity();
    assert.equal(verification.isValid, true);
    assert.equal(verification.blockCount, 1);
  });

  it('records travel bookings and chains hashes sequentially', () => {
    const chain = new TravelOdysseyAuditChain({ storageKey: 'test_travel_audit_chain_2' });
    const block1 = chain.recordEvent('FLIGHT_RESERVATION', { flightNo: 'TO-101', seats: ['3B'] });
    const block2 = chain.recordEvent('HOTEL_CHECKIN', { hotel: 'Grand Odyssey Resort' });

    const blocks = chain.getChain();
    assert.equal(blocks.length, 3);
    assert.equal(block1.index, 1);
    assert.equal(block2.index, 2);
    assert.equal(block1.previousHash, blocks[0].hash);
    assert.equal(block2.previousHash, block1.hash);

    const integrity = chain.verifyChainIntegrity();
    assert.equal(integrity.isValid, true);
    assert.equal(integrity.blockCount, 3);
  });

  it('detects tampering when booking details or hash is corrupted', () => {
    const chain = new TravelOdysseyAuditChain({ storageKey: 'test_travel_audit_chain_3' });
    chain.recordEvent('PASSPORT_VERIFIED', { verified: true });
    chain.recordEvent('SEAT_UPGRADE', { seat: '1A' });

    assert.equal(chain.verifyChainIntegrity().isValid, true);

    // Tamper with intermediate block
    chain.chain[1].payload = { verified: false, forged: true };
    const checkTampered = chain.verifyChainIntegrity();
    assert.equal(checkTampered.isValid, false);
    assert.equal(checkTampered.brokenBlockIndex, 1);
  });

  it('exports formatted audit trail JSON', () => {
    const chain = new TravelOdysseyAuditChain({ storageKey: 'test_travel_audit_chain_4' });
    chain.recordEvent('TOUR_GUIDE_ASSIGNED', { guide: 'Alex' });

    const logJson = chain.exportAuditLog();
    const parsed = JSON.parse(logJson);
    assert.ok(parsed.exportedAt);
    assert.equal(parsed.integrity.isValid, true);
    assert.equal(parsed.chain.length, 2);
  });
});
