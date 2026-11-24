import test from 'node:test';
import assert from 'node:assert/strict';
import { RoboticsAutomataResilientSocket } from './websocket-reconnect.js';

test('RoboticsAutomataResilientSocket - calculateBackoff computes exponential delays clamped to maxBackoffMs', () => {
  const socket = new RoboticsAutomataResilientSocket('wss://test.local', {
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

test('RoboticsAutomataResilientSocket - buffers messages in queue while disconnected', () => {
  const socket = new RoboticsAutomataResilientSocket();
  assert.equal(socket.status, 'DISCONNECTED');

  const sent1 = socket.send('telemetry: packet 1');
  const sent2 = socket.send({ sensor: 'radar', value: 92 });

  assert.equal(sent1, false);
  assert.equal(sent2, false);
  assert.equal(socket.queue.length, 2);
  assert.equal(socket.sentMessages.length, 0);
});

test('RoboticsAutomataResilientSocket - flushQueue flushes buffered messages upon connecting', async () => {
  const socket = new RoboticsAutomataResilientSocket();
  socket.send('queued-msg-1');
  socket.send('queued-msg-2');
  assert.equal(socket.queue.length, 2);

  await socket.connect();
  assert.equal(socket.status, 'CONNECTED');
  assert.equal(socket.queue.length, 0);
  assert.equal(socket.sentMessages.length, 2);
  assert.equal(socket.sentMessages[0].payload, 'queued-msg-1');
  assert.equal(socket.sentMessages[1].payload, 'queued-msg-2');
});

test('RoboticsAutomataResilientSocket - transitions to RECONNECTING upon simulateDrop', () => {
  const socket = new RoboticsAutomataResilientSocket();
  socket.status = 'CONNECTED';
  socket.simulateDrop();
  assert.equal(socket.status, 'RECONNECTING');
  assert.equal(socket.reconnectAttempts, 1);
  socket.disconnect();
});
