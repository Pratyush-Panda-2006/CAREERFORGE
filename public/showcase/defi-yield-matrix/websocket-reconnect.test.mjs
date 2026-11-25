import test from 'node:test';
import assert from 'node:assert/strict';
import { DefiYieldMatrixResilientSocket } from './websocket-reconnect.js';

test('DefiYieldMatrixResilientSocket - calculateBackoff computes exponential delays clamped to maxBackoffMs', () => {
  const socket = new DefiYieldMatrixResilientSocket('wss://test.local', {
    baseBackoffMs: 1000,
    maxBackoffMs: 10000
  });

  assert.equal(socket.calculateBackoff(0), 1000);
  assert.equal(socket.calculateBackoff(1), 2000);
  assert.equal(socket.calculateBackoff(2), 4000);
  assert.equal(socket.calculateBackoff(3), 8000);
  assert.equal(socket.calculateBackoff(4), 10000);
});

test('DefiYieldMatrixResilientSocket - buffers messages in queue while disconnected', () => {
  const socket = new DefiYieldMatrixResilientSocket();
  assert.equal(socket.status, 'DISCONNECTED');

  const sent = socket.send('telemetry-packet');
  assert.equal(sent, false);
  assert.equal(socket.queue.length, 1);
});

test('DefiYieldMatrixResilientSocket - flushQueue flushes buffered messages upon connecting', async () => {
  const socket = new DefiYieldMatrixResilientSocket();
  socket.send('queued-msg');
  assert.equal(socket.queue.length, 1);

  await socket.connect();
  assert.equal(socket.status, 'CONNECTED');
  assert.equal(socket.queue.length, 0);
  assert.equal(socket.sentMessages.length, 1);
});

test('DefiYieldMatrixResilientSocket - transitions to RECONNECTING upon simulateDrop', () => {
  const socket = new DefiYieldMatrixResilientSocket();
  socket.status = 'CONNECTED';
  socket.simulateDrop();

  assert.equal(socket.status, 'RECONNECTING');
  assert.equal(socket.reconnectAttempts, 1);
  socket.disconnect();
});
