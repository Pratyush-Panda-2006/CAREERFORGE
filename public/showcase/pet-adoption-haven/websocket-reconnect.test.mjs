import test from 'node:test';
import assert from 'node:assert/strict';
import { PetAdoptionHavenResilientSocket } from './websocket-reconnect.js';

test('PetAdoptionHavenResilientSocket - calculateBackoff computes exponential delays clamped to maxBackoffMs', () => {
  const socket = new PetAdoptionHavenResilientSocket('wss://test.local', {
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

test('PetAdoptionHavenResilientSocket - calculateBackoff with jitter produces positive clamped delay', () => {
  const socket = new PetAdoptionHavenResilientSocket('wss://test.local', {
    baseBackoffMs: 1000,
    maxBackoffMs: 8000,
    jitter: true
  });

  const delay = socket.calculateBackoff(2);
  assert.ok(delay >= 4000);
  assert.ok(delay <= 4000 * 1.35);
});

test('PetAdoptionHavenResilientSocket - buffers messages in queue while disconnected', () => {
  const socket = new PetAdoptionHavenResilientSocket();
  assert.equal(socket.status, 'DISCONNECTED');

  const sent1 = socket.send('shelter: petAdopted id:102');
  const sent2 = socket.send({ event: 'fosterStatus', shelterId: 'central-haven' });

  assert.equal(sent1, false);
  assert.equal(sent2, false);
  assert.equal(socket.queue.length, 2);
  assert.equal(socket.sentMessages.length, 0);
});

test('PetAdoptionHavenResilientSocket - flushQueue flushes buffered messages upon connecting', async () => {
  const socket = new PetAdoptionHavenResilientSocket();
  socket.send('queued-event-1');
  socket.send('queued-event-2');
  assert.equal(socket.queue.length, 2);

  await socket.connect();
  assert.equal(socket.status, 'CONNECTED');
  assert.equal(socket.queue.length, 0);
  assert.equal(socket.sentMessages.length, 2);
  assert.equal(socket.sentMessages[0].payload, 'queued-event-1');
  assert.equal(socket.sentMessages[1].payload, 'queued-event-2');
});

test('PetAdoptionHavenResilientSocket - transitions to RECONNECTING upon simulateDrop and resets on disconnect', () => {
  const socket = new PetAdoptionHavenResilientSocket();
  socket.status = 'CONNECTED';
  socket.simulateDrop();

  assert.equal(socket.status, 'RECONNECTING');
  assert.equal(socket.reconnectAttempts, 1);

  socket.disconnect();
  assert.equal(socket.status, 'DISCONNECTED');
  assert.equal(socket.reconnectAttempts, 0);
});
