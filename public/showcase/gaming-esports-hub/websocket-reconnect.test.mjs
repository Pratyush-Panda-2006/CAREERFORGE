import test from 'node:test';
import assert from 'node:assert/strict';
import { GamingEsportsHubResilientSocket } from './websocket-reconnect.js';

test('GamingEsportsHubResilientSocket - calculateBackoff computes exponential delays clamped to maxBackoffMs', () => {
  const socket = new GamingEsportsHubResilientSocket('wss://test.local', {
    baseBackoffMs: 1000,
    maxBackoffMs: 10000
  });

  assert.equal(socket.calculateBackoff(0), 1000);
  assert.equal(socket.calculateBackoff(1), 2000);
  assert.equal(socket.calculateBackoff(2), 4000);
  assert.equal(socket.calculateBackoff(3), 8000);
  assert.equal(socket.calculateBackoff(4), 10000);
});

test('GamingEsportsHubResilientSocket - buffers messages in queue while disconnected', () => {
  const socket = new GamingEsportsHubResilientSocket();
  assert.equal(socket.status, 'DISCONNECTED');

  const sent = socket.send('telemetry-packet');
  assert.equal(sent, false);
  assert.equal(socket.queue.length, 1);
});

test('GamingEsportsHubResilientSocket - flushQueue flushes buffered messages upon connecting', async () => {
  const socket = new GamingEsportsHubResilientSocket();
  socket.send('queued-msg');
  assert.equal(socket.queue.length, 1);

  await socket.connect();
  assert.equal(socket.status, 'CONNECTED');
  assert.equal(socket.queue.length, 0);
  assert.equal(socket.sentMessages.length, 1);
});

test('GamingEsportsHubResilientSocket - transitions to RECONNECTING upon simulateDrop', () => {
  const socket = new GamingEsportsHubResilientSocket();
  socket.status = 'CONNECTED';
  socket.simulateDrop();

  assert.equal(socket.status, 'RECONNECTING');
  assert.equal(socket.reconnectAttempts, 1);
  socket.disconnect();
});
