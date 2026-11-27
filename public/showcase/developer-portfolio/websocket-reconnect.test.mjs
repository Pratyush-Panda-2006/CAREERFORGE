import test from 'node:test';
import assert from 'node:assert/strict';
import { DeveloperPortfolioResilientSocket } from './websocket-reconnect.js';

async function waitFor(predicate, timeoutMs = 1000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return predicate();
}

// === calculateBackoff tests ===

test('calculateBackoff computes exponential delays clamped to maxBackoffMs', () => {
  const socket = new DeveloperPortfolioResilientSocket('wss://test.local', {
    baseBackoffMs: 1000,
    maxBackoffMs: 10000,
    jitter: false
  });

  assert.equal(socket.calculateBackoff(0), 1000);
  assert.equal(socket.calculateBackoff(1), 2000);
  assert.equal(socket.calculateBackoff(2), 4000);
  assert.equal(socket.calculateBackoff(3), 8000);
  assert.equal(socket.calculateBackoff(4), 10000); // clamped at maxBackoffMs
  assert.equal(socket.calculateBackoff(5), 10000);
  assert.equal(socket.calculateBackoff(10), 10000);
});

test('calculateBackoff throws on invalid attempt', () => {
  const socket = new DeveloperPortfolioResilientSocket();

  assert.throws(() => socket.calculateBackoff(-1), RangeError);
  assert.throws(() => socket.calculateBackoff(NaN), RangeError);
  assert.throws(() => socket.calculateBackoff('invalid'), RangeError);
  assert.throws(() => socket.calculateBackoff(undefined), RangeError);
  assert.throws(() => socket.calculateBackoff(null), RangeError);
});

test('calculateBackoff with jitter stays within the jitter window', () => {
  const socket = new DeveloperPortfolioResilientSocket('wss://test.local', {
    baseBackoffMs: 1000,
    maxBackoffMs: 10000,
    jitter: true
  });

  for (let i = 0; i < 25; i += 1) {
    const result = socket.calculateBackoff(0);
    assert.ok(result >= 500 && result <= 1500, `jittered backoff out of range: ${result}`);
  }
});

test('calculateBackoff with jitter never exceeds maxBackoffMs', () => {
  const socket = new DeveloperPortfolioResilientSocket('wss://test.local', {
    baseBackoffMs: 1000,
    maxBackoffMs: 4000,
    jitter: true
  });

  for (let i = 0; i < 25; i += 1) {
    assert.ok(socket.calculateBackoff(3) <= 4000);
  }
});

test('calculateBackoff with jitter disabled is deterministic', () => {
  const socket = new DeveloperPortfolioResilientSocket('wss://test.local', {
    baseBackoffMs: 500,
    maxBackoffMs: 5000,
    jitter: false
  });

  assert.equal(socket.calculateBackoff(0), 500);
  assert.equal(socket.calculateBackoff(1), 1000);
  assert.equal(socket.calculateBackoff(2), 2000);
});

// === Buffering & queue tests ===

test('buffers messages in the queue while disconnected', (t) => {
  const socket = new DeveloperPortfolioResilientSocket();
  t.after(() => socket.disconnect());

  assert.equal(socket.status, 'DISCONNECTED');

  const delivered = socket.send('telemetry-packet');
  assert.equal(delivered, false);
  assert.equal(socket.queue.length, 1);
  assert.equal(socket.queue[0].status, 'QUEUED');
});

test('queues multiple messages while disconnected', (t) => {
  const socket = new DeveloperPortfolioResilientSocket();
  t.after(() => socket.disconnect());

  socket.send('msg1');
  socket.send('msg2');
  socket.send('msg3');

  assert.equal(socket.queue.length, 3);
  assert.equal(socket.status, 'DISCONNECTED');
});

test('flushQueue flushes buffered messages upon connecting', async (t) => {
  const socket = new DeveloperPortfolioResilientSocket();
  t.after(() => socket.disconnect());

  socket.send('queued-msg');
  assert.equal(socket.queue.length, 1);

  await socket.connect();
  assert.equal(socket.status, 'CONNECTED');
  assert.equal(socket.queue.length, 0);
  assert.equal(socket.sentMessages.length, 1);
  assert.equal(socket.sentMessages[0].status, 'DELIVERED');
  assert.equal(typeof socket.sentMessages[0].deliveredAt, 'number');
});

test('queued messages survive a reconnect and are delivered in order', async (t) => {
  const socket = new DeveloperPortfolioResilientSocket();
  t.after(() => socket.disconnect());

  socket.send('msg1');
  socket.send('msg2');
  assert.equal(socket.queue.length, 2);

  await socket.connect();
  assert.equal(socket.queue.length, 0);
  assert.equal(socket.sentMessages.length, 2);
  assert.equal(socket.sentMessages[0].payload, 'msg1');
  assert.equal(socket.sentMessages[1].payload, 'msg2');
});

test('flushQueue returns empty array when not connected', () => {
  const socket = new DeveloperPortfolioResilientSocket();

  socket.send('buffered');
  assert.deepEqual(socket.flushQueue(), []);
  assert.equal(socket.queue.length, 1);
});

// === simulateDrop / reconnection tests ===

test('transitions to RECONNECTING upon simulateDrop', (t) => {
  const socket = new DeveloperPortfolioResilientSocket();
  t.after(() => socket.disconnect());

  socket.status = 'CONNECTED';
  socket.simulateDrop();

  assert.equal(socket.status, 'RECONNECTING');
  assert.equal(socket.reconnectAttempts, 1);
});

test('simulateDrop respects maxAttempts', (t) => {
  const socket = new DeveloperPortfolioResilientSocket('wss://test.local', {
    maxAttempts: 2
  });
  t.after(() => socket.disconnect());

  socket.status = 'CONNECTED';

  socket.simulateDrop();
  assert.equal(socket.reconnectAttempts, 1);

  socket.simulateDrop();
  assert.equal(socket.reconnectAttempts, 2);

  socket.simulateDrop();
  assert.equal(socket.status, 'FAILED');
  assert.equal(socket.reconnectAttempts, 2);
});

test('simulateDrop fails immediately when maxAttempts is 1', (t) => {
  const socket = new DeveloperPortfolioResilientSocket('wss://test.local', {
    maxAttempts: 1
  });
  t.after(() => socket.disconnect());

  socket.status = 'CONNECTED';

  socket.simulateDrop();
  assert.equal(socket.reconnectAttempts, 1);

  socket.simulateDrop();
  assert.equal(socket.status, 'FAILED');
});

test('successful reconnection restores CONNECTED state and resets attempts', async (t) => {
  const socket = new DeveloperPortfolioResilientSocket('wss://test.local', {
    baseBackoffMs: 10,
    maxBackoffMs: 20,
    maxAttempts: 3
  });
  t.after(() => socket.disconnect());

  await socket.connect();
  assert.equal(socket.status, 'CONNECTED');

  socket.simulateDrop();
  assert.equal(socket.status, 'RECONNECTING');
  assert.equal(socket.reconnectAttempts, 1);

  assert.ok(
    await waitFor(() => socket.status === 'CONNECTED'),
    'socket did not return to CONNECTED in time'
  );
  assert.equal(socket.reconnectAttempts, 0);
});

test('buffered messages flush after an automatic reconnection', async (t) => {
  const socket = new DeveloperPortfolioResilientSocket('wss://test.local', {
    baseBackoffMs: 10,
    maxBackoffMs: 20,
    maxAttempts: 3
  });
  t.after(() => socket.disconnect());

  await socket.connect();
  socket.simulateDrop();
  socket.send('queued-during-outage');
  assert.equal(socket.queue.length, 1);

  assert.ok(
    await waitFor(() => socket.status === 'CONNECTED'),
    'socket did not reconnect in time'
  );
  assert.equal(socket.queue.length, 0);
  assert.equal(socket.sentMessages.length, 1);
  assert.equal(socket.sentMessages[0].payload, 'queued-during-outage');
});

// === race / cancellation tests ===

test('disconnect during CONNECTING cancels the pending connection', async (t) => {
  const socket = new DeveloperPortfolioResilientSocket();
  t.after(() => socket.disconnect());

  const connecting = socket.connect();
  socket.disconnect();

  const result = await connecting;
  assert.equal(result, false);
  assert.equal(socket.status, 'DISCONNECTED');
});

test('simulateDrop during CONNECTING does not resolve to CONNECTED', async (t) => {
  const socket = new DeveloperPortfolioResilientSocket('wss://test.local', {
    baseBackoffMs: 1000,
    maxBackoffMs: 2000,
    maxAttempts: 2
  });
  t.after(() => socket.disconnect());

  const connecting = socket.connect();
  socket.simulateDrop();

  assert.equal(await connecting, false);
  assert.equal(socket.status, 'RECONNECTING');
});

test('RECONNECTING metadata exposes a positive retry countdown', (t) => {
  const socket = new DeveloperPortfolioResilientSocket('wss://test.local', {
    baseBackoffMs: 1000,
    maxBackoffMs: 1000,
    jitter: false
  });
  t.after(() => socket.disconnect());

  let metadata = null;
  socket.onStateChange = (_status, meta) => {
    metadata = meta;
  };

  socket.status = 'CONNECTED';
  socket.simulateDrop();

  assert.ok(metadata !== null);
  assert.equal(metadata.status, 'RECONNECTING');
  assert.ok(metadata.nextRetryInMs > 0 && metadata.nextRetryInMs <= 1000);
});

// === send tests ===

test('send delivers immediately when connected', (t) => {
  const socket = new DeveloperPortfolioResilientSocket();
  t.after(() => socket.disconnect());

  socket.status = 'CONNECTED';
  const delivered = socket.send('delivered-msg');

  assert.equal(delivered, true);
  assert.equal(socket.sentMessages.length, 1);
  assert.equal(socket.sentMessages[0].payload, 'delivered-msg');
  assert.equal(socket.sentMessages[0].status, 'DELIVERED');
});

test('send serializes object payloads', (t) => {
  const socket = new DeveloperPortfolioResilientSocket();
  t.after(() => socket.disconnect());

  socket.status = 'CONNECTED';
  socket.send({ type: 'ping', value: 42 });

  assert.equal(socket.sentMessages[0].payload, '{"type":"ping","value":42}');
});

test('send throws on null message', () => {
  const socket = new DeveloperPortfolioResilientSocket();
  assert.throws(() => socket.send(null), TypeError);
});

test('send throws on undefined message', () => {
  const socket = new DeveloperPortfolioResilientSocket();
  assert.throws(() => socket.send(undefined), TypeError);
});

// === heartbeat lifecycle tests ===

test('connect starts the heartbeat loop and disconnect stops it', async (t) => {
  const socket = new DeveloperPortfolioResilientSocket('wss://test.local', {
    heartbeatIntervalMs: 1000
  });
  t.after(() => socket.disconnect());

  assert.equal(socket.heartbeatTimer, null);

  await socket.connect();
  assert.notEqual(socket.heartbeatTimer, null);

  socket.disconnect();
  assert.equal(socket.heartbeatTimer, null);
});

test('heartbeat timer is not started when interval is disabled', async (t) => {
  const socket = new DeveloperPortfolioResilientSocket('wss://test.local', {
    heartbeatIntervalMs: 0
  });
  t.after(() => socket.disconnect());

  await socket.connect();
  assert.equal(socket.heartbeatTimer, null);
});

// === onStateChange tests ===

test('onStateChange fires on connect and drop transitions', async (t) => {
  let lastStatus = null;

  const socket = new DeveloperPortfolioResilientSocket();
  t.after(() => socket.disconnect());
  socket.onStateChange = (status) => {
    lastStatus = status;
  };

  await socket.connect();
  assert.equal(lastStatus, 'CONNECTED');

  socket.simulateDrop();
  assert.equal(lastStatus, 'RECONNECTING');
});

test('onStateChange receives queue and attempt metadata', async (t) => {
  let metadata = null;

  const socket = new DeveloperPortfolioResilientSocket();
  t.after(() => socket.disconnect());
  socket.onStateChange = (_status, meta) => {
    metadata = meta;
  };

  socket.send('queued-before-connect');
  await socket.connect();

  assert.ok(metadata !== null);
  assert.equal(metadata.status, 'CONNECTED');
  assert.equal(metadata.attempts, 0);
  assert.equal(metadata.queueSize, 0);
});

// === timeline / status snapshot tests ===

test('connection timeline records lifecycle events', async (t) => {
  const socket = new DeveloperPortfolioResilientSocket();
  t.after(() => socket.disconnect());

  assert.ok(socket.getStatus().timeline.some((event) => event.type === 'init'));

  await socket.connect();
  const timeline = socket.getStatus().timeline;
  assert.ok(timeline.some((event) => event.type === 'connect'));
  assert.ok(timeline.some((event) => event.type === 'connected'));
});

test('getStatus returns the full configuration snapshot', () => {
  const socket = new DeveloperPortfolioResilientSocket('wss://example.com', {
    baseBackoffMs: 500,
    maxBackoffMs: 25000,
    maxAttempts: 10,
    jitter: true,
    heartbeatIntervalMs: 1000
  });

  const status = socket.getStatus();
  assert.equal(status.status, 'DISCONNECTED');
  assert.equal(status.baseBackoffMs, 500);
  assert.equal(status.maxBackoffMs, 25000);
  assert.equal(status.maxAttempts, 10);
  assert.equal(status.jitter, true);
  assert.equal(status.heartbeatIntervalMs, 1000);
  assert.equal(status.queueLength, 0);
  assert.equal(status.sentMessages, 0);
});
