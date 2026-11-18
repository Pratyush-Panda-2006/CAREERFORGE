import test from 'node:test';
import assert from 'node:assert/strict';
import { RoboticsAutomataSocketEmulator } from './mock-websocket.js';

test('RoboticsAutomataSocketEmulator: initializes with default connected state', () => {
  const emulator = new RoboticsAutomataSocketEmulator();
  assert.equal(emulator.status, 'CONNECTED');
  assert.equal(emulator.dropoutActive, false);
  assert.equal(emulator.deliveredPackets, 0);
  assert.equal(emulator.droppedPackets, 0);
  assert.equal(emulator.getPacketDropRate(), 0);
});

test('RoboticsAutomataSocketEmulator: handles channel subscription and pub/sub message delivery', () => {
  const emulator = new RoboticsAutomataSocketEmulator();
  const received = [];

  const unsubscribe = emulator.subscribe('telemetry:arm', (payload) => {
    received.push(payload);
  });

  const sent = emulator.publish('telemetry:arm', { jointAngle: 45.2, torque: 12.8 });
  assert.equal(sent, true);
  assert.equal(received.length, 1);
  assert.equal(received[0].jointAngle, 45.2);
  assert.equal(emulator.deliveredPackets, 1);

  // Unsubscribe
  unsubscribe();
  emulator.publish('telemetry:arm', { jointAngle: 90.0 });
  assert.equal(received.length, 1);
});

test('RoboticsAutomataSocketEmulator: sends heartbeat acknowledged message', () => {
  const emulator = new RoboticsAutomataSocketEmulator();
  const hb = emulator.simulateHeartbeat();

  assert.equal(hb.type, 'HEARTBEAT_ACK');
  assert.equal(hb.status, 'CONNECTED');
  assert.ok(emulator.lastHeartbeat > 0);
  const log = emulator.getLog();
  assert.equal(log[0].channel, 'system:heartbeat');
});

test('RoboticsAutomataSocketEmulator: simulates network dropout and dropped packet counting', async () => {
  const emulator = new RoboticsAutomataSocketEmulator();

  const promise = emulator.simulateDropout(50);
  assert.equal(emulator.status, 'RECONNECTING');
  assert.equal(emulator.dropoutActive, true);

  // Publishing during dropout should drop packet
  const delivered = emulator.publish('telemetry:arm', { data: 123 });
  assert.equal(delivered, false);
  assert.equal(emulator.droppedPackets, 1);
  assert.equal(emulator.getPacketDropRate(), 100);

  // Wait for reconnect
  await promise;
  assert.equal(emulator.status, 'CONNECTED');
  assert.equal(emulator.dropoutActive, false);

  // Reconnected publish
  const deliveredAfter = emulator.publish('telemetry:arm', { data: 456 });
  assert.equal(deliveredAfter, true);
  assert.equal(emulator.deliveredPackets, 1);
  assert.equal(emulator.getPacketDropRate(), 50);
});
