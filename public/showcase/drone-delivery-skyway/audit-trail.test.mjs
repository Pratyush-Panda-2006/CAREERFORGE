import test from 'node:test';
import assert from 'node:assert/strict';
import { DroneDeliverySkywayAuditChain } from './audit-trail.js';

test('DroneDeliverySkywayAuditChain - genesis block creation and valid initial integrity', () => {
  const chain = new DroneDeliverySkywayAuditChain({
    storageKey: 'test_drone_audit_chain_' + Date.now()
  });

  const integrity = chain.verifyChainIntegrity();
  assert.equal(integrity.isValid, true);
  assert.equal(chain.getChain().length, 1);
  assert.equal(chain.getChain()[0].action, 'GENESIS_INIT');
});

test('DroneDeliverySkywayAuditChain - sequential block recording and previousHash chaining', () => {
  const chain = new DroneDeliverySkywayAuditChain({
    storageKey: 'test_drone_audit_chain_' + Date.now()
  });

  const b1 = chain.recordEvent('FLIGHT_CORRIDOR_RESERVED', { corridorId: 'CORR-101' });
  const b2 = chain.recordEvent('WAYPOINT_REACHED', { waypoint: 'WP-12' });

  assert.equal(chain.getChain().length, 3);
  assert.equal(b1.index, 1);
  assert.equal(b2.index, 2);
  assert.equal(b2.previousHash, b1.hash);

  const verification = chain.verifyChainIntegrity();
  assert.equal(verification.isValid, true);
  assert.equal(verification.totalBlocks, 3);
});

test('DroneDeliverySkywayAuditChain - cryptographic tamper detection catches modified payload', () => {
  const chain = new DroneDeliverySkywayAuditChain({
    storageKey: 'test_drone_audit_chain_' + Date.now()
  });

  chain.recordEvent('FLIGHT_CORRIDOR_RESERVED', { corridorId: 'CORR-202' });
  const b2 = chain.recordEvent('WAYPOINT_REACHED', { waypoint: 'WP-15' });

  b2.payload.waypoint = 'WP-HACKED';

  const verification = chain.verifyChainIntegrity();
  assert.equal(verification.isValid, false);
  assert.equal(verification.invalidBlockIndex, 2);
  assert.equal(verification.reason, 'Hash mismatch');
});

test('DroneDeliverySkywayAuditChain - filter action returns subset of audit blocks', () => {
  const chain = new DroneDeliverySkywayAuditChain({
    storageKey: 'test_drone_audit_chain_' + Date.now()
  });

  chain.recordEvent('FLIGHT_CORRIDOR_RESERVED', { id: 1 });
  chain.recordEvent('WAYPOINT_REACHED', { id: 2 });
  chain.recordEvent('FLIGHT_CORRIDOR_RESERVED', { id: 3 });

  const filtered = chain.getChain('FLIGHT_CORRIDOR_RESERVED');
  assert.equal(filtered.length, 2);
});
