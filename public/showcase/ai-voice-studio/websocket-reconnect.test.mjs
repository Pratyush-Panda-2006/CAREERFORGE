import test from 'node:test';
import assert from 'node:assert/strict';
import { AiVoiceStudioResilientSocket } from './websocket-reconnect.js';

test('AiVoiceStudioResilientSocket - calculateBackoff computes exponential delays clamped to maxBackoffMs', () => {
  const socket = new AiVoiceStudioResilientSocket('wss://test.local', {
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

test('AiVoiceStudioResilientSocket - buffers messages in queue while disconnected', () => {
  const socket = new AiVoiceStudioResilientSocket();
  assert.equal(socket.status, 'DISCONNECTED');

  const sent1 = socket.send('audio-chunk: pcm48k');
  const sent2 = socket.send({ modulation: 'pitch-shift', factor: 1.25 });

  assert.equal(sent1, false);
  assert.equal(sent2, false);
  assert.equal(socket.queue.length, 2);
  assert.equal(socket.sentMessages.length, 0);
});

test('AiVoiceStudioResilientSocket - flushQueue flushes buffered messages upon connecting', async () => {
  const socket = new AiVoiceStudioResilientSocket();
  socket.send('queued-chunk-1');
  socket.send('queued-chunk-2');
  assert.equal(socket.queue.length, 2);

  await socket.connect();
  assert.equal(socket.status, 'CONNECTED');
  assert.equal(socket.queue.length, 0);
  assert.equal(socket.sentMessages.length, 2);
  assert.equal(socket.sentMessages[0].payload, 'queued-chunk-1');
  assert.equal(socket.sentMessages[1].payload, 'queued-chunk-2');
});

test('AiVoiceStudioResilientSocket - transitions to RECONNECTING upon simulateDrop', () => {
  const socket = new AiVoiceStudioResilientSocket();
  socket.status = 'CONNECTED';
  socket.simulateDrop();

  assert.equal(socket.status, 'RECONNECTING');
  assert.equal(socket.reconnectAttempts, 1);
  socket.disconnect();
});
