import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SmartIotNexusSocketEmulator } from './mock-websocket.js';

test('SmartIotNexusSocketEmulator - multiplexes channel subscriptions and delivers packets', () => {
  const socket = new SmartIotNexusSocketEmulator();
  const receivedA = [];
  const receivedB = [];

  const unsubA = socket.subscribe('telemetry:temp', (pkt) => receivedA.push(pkt));
  const unsubB = socket.subscribe('telemetry:pressure', (pkt) => receivedB.push(pkt));

  socket.publish('telemetry:temp', { celsius: 24.5 });
  socket.publish('telemetry:pressure', { bar: 1.013 });

  assert.strictEqual(receivedA.length, 1);
  assert.strictEqual(receivedA[0].payload.celsius, 24.5);
  assert.strictEqual(receivedB.length, 1);
  assert.strictEqual(receivedB[0].payload.bar, 1.013);

  unsubA();
  socket.publish('telemetry:temp', { celsius: 25.0 });
  assert.strictEqual(receivedA.length, 1);
});

test('SmartIotNexusSocketEmulator - simulates periodic heartbeat pings accurately', () => {
  const socket = new SmartIotNexusSocketEmulator();

  const ping1 = socket.simulateHeartbeat();
  assert.strictEqual(ping1.type, 'ping');
  assert.strictEqual(ping1.sequence, 1);
  assert.ok(ping1.latency > 0);

  const ping2 = socket.simulateHeartbeat();
  assert.strictEqual(ping2.sequence, 2);
  assert.strictEqual(socket.getStatus().heartbeatCount, 2);
});

test('SmartIotNexusSocketEmulator - drops packets when disconnected during dropout simulation', async () => {
  const socket = new SmartIotNexusSocketEmulator();
  const received = [];
  socket.subscribe('sensor:live', (pkt) => received.push(pkt));

  const dropoutPromise = socket.simulateDropout(60);
  assert.strictEqual(socket.getStatus().status, 'disconnected');

  const droppedPkt = socket.publish('sensor:live', { ping: true });
  assert.strictEqual(droppedPkt, null);
  assert.strictEqual(socket.getStatus().droppedPackets, 1);
  assert.strictEqual(received.length, 0);

  await dropoutPromise;
  assert.strictEqual(socket.getStatus().status, 'connected');

  const okPkt = socket.publish('sensor:live', { recovered: true });
  assert.ok(okPkt);
  assert.strictEqual(received.length, 1);
});

test('SmartIotNexusSocketEmulator - maintains bounded message history log', () => {
  const socket = new SmartIotNexusSocketEmulator({ maxLogSize: 5 });
  socket.subscribe('iot:log', () => {});

  for (let i = 0; i < 10; i++) {
    socket.publish('iot:log', { index: i });
  }

  const log = socket.getMessageLog();
  assert.strictEqual(log.length, 5);
  assert.strictEqual(log[0].payload.index, 9);
});
