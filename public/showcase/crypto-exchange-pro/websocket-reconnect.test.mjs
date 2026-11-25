import test from 'node:test';
import assert from 'node:assert/strict';
import { CryptoExchangeProResilientSocket } from './websocket-reconnect.js';

test('CryptoExchangeProResilientSocket - calculateBackoff computes exponential delays clamped to maxBackoffMs', () => {
  const socket = new CryptoExchangeProResilientSocket('wss://test.local', {
    baseBackoffMs: 1000,
    maxBackoffMs: 10000
  });

  assert.equal(socket.calculateBackoff(0), 1000);
  assert.equal(socket.calculateBackoff(1), 2000);
  assert.equal(socket.calculateBackoff(2), 4000);
  assert.equal(socket.calculateBackoff(3), 8000);
  assert.equal(socket.calculateBackoff(4), 10000);
});

test('CryptoExchangeProResilientSocket - buffers messages in queue while disconnected', () => {
  const socket = new CryptoExchangeProResilientSocket();
  assert.equal(socket.status, 'DISCONNECTED');

  const sent = socket.send('telemetry-packet');
  assert.equal(sent, false);
  assert.equal(socket.queue.length, 1);
});

test('CryptoExchangeProResilientSocket - flushQueue flushes buffered messages upon connecting', async () => {
  const socket = new CryptoExchangeProResilientSocket();
  socket.send('queued-msg');
  assert.equal(socket.queue.length, 1);

  await socket.connect();
  assert.equal(socket.status, 'CONNECTED');
  assert.equal(socket.queue.length, 0);
  assert.equal(socket.sentMessages.length, 1);
});

test('CryptoExchangeProResilientSocket - transitions to RECONNECTING upon simulateDrop', () => {
  const socket = new CryptoExchangeProResilientSocket();
  socket.status = 'CONNECTED';
  socket.simulateDrop();

  assert.equal(socket.status, 'RECONNECTING');
  assert.equal(socket.reconnectAttempts, 1);
  socket.disconnect();
});
