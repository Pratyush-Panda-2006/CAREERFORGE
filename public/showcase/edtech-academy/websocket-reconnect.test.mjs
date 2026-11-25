import test from 'node:test';
import assert from 'node:assert/strict';
import { EdtechAcademyResilientSocket } from './websocket-reconnect.js';

test('EdtechAcademyResilientSocket - calculateBackoff computes exponential delays clamped to maxBackoffMs', () => {
  const socket = new EdtechAcademyResilientSocket('wss://test.local', {
    baseBackoffMs: 1000,
    maxBackoffMs: 10000
  });

  assert.equal(socket.calculateBackoff(0), 1000);
  assert.equal(socket.calculateBackoff(1), 2000);
  assert.equal(socket.calculateBackoff(2), 4000);
  assert.equal(socket.calculateBackoff(3), 8000);
  assert.equal(socket.calculateBackoff(4), 10000);
  assert.equal(socket.calculateBackoff(10), 10000);
});

test('EdtechAcademyResilientSocket - calculateBackoff throws RangeError on invalid attempt', () => {
  const socket = new EdtechAcademyResilientSocket();
  assert.throws(() => socket.calculateBackoff(-1), RangeError);
  assert.throws(() => socket.calculateBackoff('invalid'), RangeError);
});

test('EdtechAcademyResilientSocket - buffers messages in queue while disconnected', () => {
  const socket = new EdtechAcademyResilientSocket();
  assert.equal(socket.status, 'DISCONNECTED');

  const sent1 = socket.send('student-quiz: answer B');
  const sent2 = socket.send({ studentId: 42, questionId: 7, selectedOption: 'A' });

  assert.equal(sent1, false);
  assert.equal(sent2, false);
  assert.equal(socket.queue.length, 2);
  assert.equal(socket.sentMessages.length, 0);
});

test('EdtechAcademyResilientSocket - send throws TypeError on null or undefined message', () => {
  const socket = new EdtechAcademyResilientSocket();
  assert.throws(() => socket.send(null), TypeError);
  assert.throws(() => socket.send(undefined), TypeError);
});

test('EdtechAcademyResilientSocket - flushQueue flushes buffered messages upon connecting', async () => {
  const socket = new EdtechAcademyResilientSocket();
  socket.send('queued-answer-1');
  socket.send('queued-answer-2');
  assert.equal(socket.queue.length, 2);

  await socket.connect();
  assert.equal(socket.status, 'CONNECTED');
  assert.equal(socket.queue.length, 0);
  assert.equal(socket.sentMessages.length, 2);
  assert.equal(socket.sentMessages[0].payload, 'queued-answer-1');
  assert.equal(socket.sentMessages[1].payload, 'queued-answer-2');
  assert.equal(socket.sentMessages[0].status, 'DELIVERED');
});

test('EdtechAcademyResilientSocket - transitions to RECONNECTING upon simulateDrop', () => {
  const socket = new EdtechAcademyResilientSocket();
  socket.status = 'CONNECTED';
  socket.simulateDrop();

  assert.equal(socket.status, 'RECONNECTING');
  assert.equal(socket.reconnectAttempts, 1);
  socket.disconnect();
  assert.equal(socket.status, 'DISCONNECTED');
  assert.equal(socket.reconnectAttempts, 0);
});
