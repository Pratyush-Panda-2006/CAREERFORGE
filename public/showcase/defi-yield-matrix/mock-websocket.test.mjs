import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DefiYieldMatrixSocketEmulator } from './mock-websocket.js';

test('DefiYieldMatrixSocketEmulator - multiplexes channel subscriptions and delivers packets', () => {
  const socket = new DefiYieldMatrixSocketEmulator();
  const receivedA = [];
  const receivedB = [];

  const unsubA = socket.subscribe('pool:yield', (pkt) => receivedA.push(pkt));
  const unsubB = socket.subscribe('orderbook:depth', (pkt) => receivedB.push(pkt));

  socket.publish('pool:yield', { apy: 19.2 });
  socket.publish('orderbook:depth', { bids: 42 });

  assert.strictEqual(receivedA.length, 1);
  assert.strictEqual(receivedA[0].payload.apy, 19.2);
  assert.strictEqual(receivedB.length, 1);
  assert.strictEqual(receivedB[0].payload.bids, 42);

  unsubA();
  socket.publish('pool:yield', { apy: 20.0 });
  assert.strictEqual(receivedA.length, 1); // No new message after unsubscribe
});

test('DefiYieldMatrixSocketEmulator - simulates periodic heartbeat pings accurately', () => {
  const socket = new DefiYieldMatrixSocketEmulator();

  const ping1 = socket.simulateHeartbeat();
  assert.strictEqual(ping1.type, 'ping');
  assert.strictEqual(ping1.sequence, 1);
  assert.ok(ping1.latency > 0);

  const ping2 = socket.simulateHeartbeat();
  assert.strictEqual(ping2.sequence, 2);
  assert.strictEqual(socket.getStatus().heartbeatCount, 2);
});

test('DefiYieldMatrixSocketEmulator - drops packets when disconnected during dropout simulation', async () => {
  const socket = new DefiYieldMatrixSocketEmulator();
  const received = [];
  socket.subscribe('telemetry:stream', (pkt) => received.push(pkt));

  // Trigger dropout
  const dropoutPromise = socket.simulateDropout(60);
  assert.strictEqual(socket.getStatus().status, 'disconnected');

  // Attempt to publish during disconnect
  const droppedPkt = socket.publish('telemetry:stream', { test: true });
  assert.strictEqual(droppedPkt, null);
  assert.strictEqual(socket.getStatus().droppedPackets, 1);
  assert.strictEqual(received.length, 0);

  await dropoutPromise;
  assert.strictEqual(socket.getStatus().status, 'connected');

  // After reconnect, publishing succeeds
  const okPkt = socket.publish('telemetry:stream', { recovered: true });
  assert.ok(okPkt);
  assert.strictEqual(received.length, 1);
});

test('DefiYieldMatrixSocketEmulator - maintains bounded message history log', () => {
  const socket = new DefiYieldMatrixSocketEmulator({ maxLogSize: 5 });
  socket.subscribe('log:channel', () => {});

  for (let i = 0; i < 10; i++) {
    socket.publish('log:channel', { index: i });
  }

  const log = socket.getMessageLog();
  assert.strictEqual(log.length, 5);
  assert.strictEqual(log[0].payload.index, 9);
});
