import test from 'node:test';
import assert from 'node:assert/strict';
import { CryptoExchangeProResilientSocket } from './websocket-reconnect.js';

test('CryptoExchangeProResilientSocket - calculateBackoff computes exponential delays clamped to maxBackoffMs', () => {
  const socket = new CryptoExchangeProResilientSocket('wss://test.local', {
    baseBackoffMs: 1000,
    maxBackoffMs: 10000
  });

  assert.equal(socket.calculateBackoff(0), 1000); // 1000 * 2^0
  assert.equal(socket.calculateBackoff(1), 2000); // 1000 * 2^1
  assert.equal(socket.calculateBackoff(2), 4000); // 1000 * 2^2
  assert.equal(socket.calculateBackoff(3), 8000); // 1000 * 2^3
  assert.equal(socket.calculateBackoff(4), 10000); // capped at 10000
  assert.equal(socket.calculateBackoff(10), 10000); // capped at 10000
});

test('CryptoExchangeProResilientSocket - calculateBackoff with jitter produces positive clamped delay', () => {
  const socket = new CryptoExchangeProResilientSocket('wss://test.local', {
    baseBackoffMs: 1000,
    maxBackoffMs: 8000,
    jitter: true
  });

  const delay = socket.calculateBackoff(2);
  assert.ok(delay >= 4000);
  assert.ok(delay <= 4000 * 1.35);
});

test('CryptoExchangeProResilientSocket - buffers messages in queue while disconnected', () => {
  const socket = new CryptoExchangeProResilientSocket();
  assert.equal(socket.status, 'DISCONNECTED');

  const sent1 = socket.send('order: buy BTC/USDT qty:0.25');
  const sent2 = socket.send({ op: 'cancelOrder', id: 'ord-992' });

  assert.equal(sent1, false);
  assert.equal(sent2, false);
  assert.equal(socket.queue.length, 2);
  assert.equal(socket.sentMessages.length, 0);
});

test('CryptoExchangeProResilientSocket - flushQueue flushes buffered messages upon connecting', async () => {
  const socket = new CryptoExchangeProResilientSocket();
  socket.send('queued-order-1');
  socket.send('queued-order-2');
  assert.equal(socket.queue.length, 2);

  await socket.connect();
  assert.equal(socket.status, 'CONNECTED');
  assert.equal(socket.queue.length, 0);
  assert.equal(socket.sentMessages.length, 2);
  assert.equal(socket.sentMessages[0].payload, 'queued-order-1');
  assert.equal(socket.sentMessages[1].payload, 'queued-order-2');
});

test('CryptoExchangeProResilientSocket - transitions to RECONNECTING upon simulateDrop and resets on disconnect', () => {
  const socket = new CryptoExchangeProResilientSocket();
  socket.status = 'CONNECTED';
  socket.simulateDrop();

  assert.equal(socket.status, 'RECONNECTING');
  assert.equal(socket.reconnectAttempts, 1);

  socket.disconnect();
  assert.equal(socket.status, 'DISCONNECTED');
  assert.equal(socket.reconnectAttempts, 0);
});
