import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VirtualMuseum3dSocketEmulator } from './mock-websocket.js';

test('VirtualMuseum3dSocketEmulator - multiplexes channel subscriptions correctly', () => {
  const socket = new VirtualMuseum3dSocketEmulator();
  let receivedCount = 0;

  const unsub1 = socket.subscribe('telemetry', (pkt) => {
    receivedCount++;
    assert.strictEqual(pkt.channel, 'telemetry');
  });

  const unsub2 = socket.subscribe('telemetry', () => {
    receivedCount++;
  });

  const delivered = socket.publish('telemetry', { sensor: 'A1', value: 42 });
  assert.strictEqual(delivered, 2);
  assert.strictEqual(receivedCount, 2);

  unsub1();
  const deliveredAfter = socket.publish('telemetry', { sensor: 'A1', value: 43 });
  assert.strictEqual(deliveredAfter, 1);
  assert.strictEqual(receivedCount, 3);
  unsub2();
});

test('VirtualMuseum3dSocketEmulator - generates heartbeat packets successfully', () => {
  const socket = new VirtualMuseum3dSocketEmulator();
  let heartbeatReceived = false;

  socket.subscribe('system.heartbeat', (pkt) => {
    heartbeatReceived = true;
    assert.strictEqual(pkt.payload.status, 'connected');
  });

  socket.simulateHeartbeat();
  assert.strictEqual(heartbeatReceived, true);
});

test('VirtualMuseum3dSocketEmulator - transitions status during simulated dropout', async () => {
  const socket = new VirtualMuseum3dSocketEmulator();
  const states = [];

  socket.onStateChange(evt => {
    if (evt.type === 'status') states.push(evt.status);
  });

  await socket.simulateDropout(100);

  assert.ok(states.includes('disconnected'));
  assert.ok(states.includes('reconnecting'));
  assert.strictEqual(socket.getStatus(), 'connected');
});
