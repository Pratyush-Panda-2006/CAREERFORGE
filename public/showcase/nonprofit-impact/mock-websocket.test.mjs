import test from 'node:test';
import assert from 'node:assert/strict';
import { NonprofitImpactSocketEmulator as Socket } from './mock-websocket.js';

class Clock {
  time = 0; next = 1; timers = new Map();
  now = () => this.time;
  setTimeout = (fn, delay) => { const id = this.next++; this.timers.set(id, { fn, at: this.time + delay }); return id; };
  clearTimeout = (id) => { this.timers.delete(id); };
  tick(milliseconds) {
    const end = this.time + milliseconds; let steps = 0;
    while (true) {
      const next = [...this.timers.entries()].filter(([, value]) => value.at <= end).sort((a, b) => a[1].at - b[1].at || a[0] - b[0])[0];
      if (!next) break;
      assert.ok(++steps < 10000, 'Timer loop must remain bounded');
      this.time = next[1].at; this.timers.delete(next[0]); next[1].fn();
    }
    this.time = end;
  }
}
function setup(options = {}) {
  const clock = new Clock(); const events = [];
  const socket = new Socket({ clock, random: () => .5, onEvent: event => events.push(event), ...options });
  return { clock, events, socket };
}
function reconciles(socket) {
  const s = socket.getStats(); assert.equal(s.sent, s.delivered + s.dropped + s.pending);
}

test('multiplexed subscribers receive independent payload copies after simulated latency', () => {
  const { socket, clock } = setup(); const received = [];
  socket.subscribe('impact', value => { value.count = 99; });
  socket.subscribe('impact', (value, packet) => received.push([value, packet]));
  socket.subscribe('supplies', () => assert.fail('Wrong channel'));
  assert.equal(socket.connect(), 'connected'); assert.equal(socket.connect(), 'connected');
  const payload = { count: 24 }; const result = socket.publish('impact', payload); payload.count = 0;
  assert.equal(result.accepted, true); assert.equal(received.length, 0); clock.tick(59); assert.equal(received.length, 0); clock.tick(1);
  assert.deepEqual(received, [[{ count: 24 }, { id: 1, channel: 'impact' }]]);
  assert.equal(socket.getStats().lastLatencyMs, 60); reconciles(socket); socket.dispose();
});

test('unsubscribe is idempotent and stale closures cannot remove replacement subscribers', () => {
  const { socket, clock } = setup(); let calls = 0;
  const old = socket.subscribe('impact', () => assert.fail('Old handler')); old();
  const fresh = socket.subscribe('impact', () => calls++); old();
  socket.connect(); socket.publish('impact', null); clock.tick(60); assert.equal(calls, 1);
  fresh(); fresh(); socket.publish('impact', true); clock.tick(60); assert.equal(calls, 1);
  assert.equal(socket.getStats().subscriptions, 0); reconciles(socket); socket.dispose();
});

test('one throwing subscriber cannot prevent delivery to the remaining handlers', () => {
  const { socket, clock } = setup(); let calls = 0;
  socket.subscribe('impact', () => { throw new Error('consumer failure'); }); socket.subscribe('impact', () => calls++);
  socket.connect(); socket.publish('impact', { count: 1 }); clock.tick(60);
  assert.equal(calls, 1); assert.equal(socket.getStats().handlerErrors, 1); assert.equal(socket.getStats().delivered, 1); reconciles(socket); socket.dispose();
});

test('malformed, cyclic, accessor, deep, sparse and oversized payloads never consume a packet', () => {
  const { socket } = setup(); socket.connect();
  const cycle = {}; cycle.self = cycle; let getterCalls = 0;
  const getter = { get count() { getterCalls++; return 1; } }; let deep = 1; for (let i = 0; i < 14; i++) deep = { next: deep };
  const oddArray = [1, 2]; delete oddArray[1]; oddArray.extra = 4;
  for (const payload of [undefined, NaN, Infinity, 1n, () => {}, new Date(), cycle, getter, deep, Array(3), oddArray, Array(129).fill(1), 'a'.repeat(4097), { text: 'é'.repeat(2049) }, Object.fromEntries(Array.from({ length: 129 }, (_, i) => ['k' + i, 1]))]) assert.throws(() => socket.publish('impact', payload));
  assert.equal(getterCalls, 0); assert.equal(socket.getStats().sent, 0); reconciles(socket); socket.dispose();
});

test('serialization uses validated data, never a hidden toJSON hook or object prototype mutation', () => {
  const { socket, clock } = setup(); let calls = 0; let received;
  const data = JSON.parse('{"__proto__":{"demo":true},"count":2}');
  Object.defineProperty(data, 'toJSON', { get() { calls++; throw new Error('Do not execute'); } });
  socket.subscribe('impact', payload => { received = payload; }); socket.connect(); socket.publish('impact', data); clock.tick(60);
  assert.equal(calls, 0); assert.equal(Object.hasOwn(received, '__proto__'), true); assert.equal({}.demo, undefined);
  assert.equal(received.count, 2); socket.dispose();
});

test('offline and full-loss packets are counted as drops; zero loss recovers', () => {
  const { socket, clock } = setup(); assert.equal(socket.publish('impact', 1).reason, 'offline');
  socket.connect(); socket.setDropRate(1); assert.equal(socket.publish('impact', 2).accepted, false);
  socket.setDropRate(0); assert.equal(socket.publish('impact', 3).accepted, true); clock.tick(60);
  assert.equal(socket.getStats().dropped, 2); assert.equal(socket.getStats().delivered, 1); reconciles(socket); socket.dispose();
});

test('a link lost during flight drops the packet rather than delivering it later', () => {
  const { socket, clock } = setup(); let received = 0; socket.subscribe('impact', () => received++); socket.connect();
  socket.publish('impact', 1); socket.simulateDropout(3000); clock.tick(60);
  assert.equal(received, 0); assert.equal(socket.getStats().pending, 0); assert.equal(socket.getStats().dropped, 1);
  clock.tick(5000); assert.equal(received, 0); reconciles(socket); socket.dispose();
});

test('automatic and manual heartbeat acknowledgements are bounded to one in-flight ping', () => {
  const { socket, clock } = setup(); socket.connect(); clock.tick(500);
  assert.equal(socket.getStats().pings, 1); assert.equal(socket.simulateHeartbeat(), false); clock.tick(60);
  assert.equal(socket.getStats().acknowledgements, 1); assert.equal(socket.simulateHeartbeat(), true); clock.tick(60);
  assert.equal(socket.getStats().acknowledgements, 2); socket.dispose(); assert.equal(clock.timers.size, 0);
});

test('heartbeat timeout triggers capped exponential backoff and automatic recovery', () => {
  const { socket, clock, events } = setup(); socket.connect(); socket.simulateDropout(4000);
  clock.tick(1499); assert.equal(socket.getStats().state, 'connected'); clock.tick(1);
  assert.equal(socket.getStats().state, 'reconnecting'); assert.equal(socket.getStats().heartbeatTimeouts, 1);
  clock.tick(250); clock.tick(500); clock.tick(1000);
  assert.deepEqual(events.filter(x => x.type === 'retry').map(x => x.delayMs), [250, 500, 1000, 2000]);
  clock.tick(1999); assert.equal(socket.getStats().state, 'reconnecting'); clock.tick(1);
  assert.equal(socket.getStats().state, 'connected'); assert.equal(socket.getStats().reconnectAttempts, 4);
  socket.publish('impact', { recovered: true }); clock.tick(60); assert.equal(socket.getStats().delivered, 1); reconciles(socket); socket.dispose();
});

test('overlapping short dropouts cannot shorten a longer existing outage', () => {
  const { socket, clock } = setup(); socket.connect(); assert.equal(socket.simulateDropout(4000), 4000);
  clock.tick(100); assert.equal(socket.simulateDropout(100), 4000); assert.equal(socket.simulateDropout(5000), 5100);
  clock.tick(3899); assert.equal(socket.getStats().state, 'reconnecting'); socket.dispose();
});

test('manual disconnect cancels in-flight packets and every retry without resurrection', () => {
  const { socket, clock } = setup(); socket.connect(); socket.publish('impact', 1); socket.disconnect();
  assert.equal(socket.getStats().dropped, 1); assert.equal(clock.timers.size, 0); clock.tick(10000);
  assert.equal(socket.getStats().state, 'disconnected'); assert.equal(socket.getStats().delivered, 0);
  socket.connect(); socket.simulateDropout(3000); clock.tick(1500); assert.equal(socket.getStats().state, 'reconnecting');
  socket.disconnect(); clock.tick(10000); assert.equal(socket.getStats().state, 'disconnected'); assert.equal(clock.timers.size, 0); reconciles(socket); socket.dispose();
});

test('dispose releases handlers and timers and rejects later operations', () => {
  const { socket, clock } = setup(); socket.subscribe('impact', () => {}); socket.connect(); socket.publish('impact', 1); socket.dispose(); socket.dispose();
  assert.equal(clock.timers.size, 0); assert.equal(socket.getStats().subscriptions, 0); clock.tick(100000);
  for (const operation of [() => socket.connect(), () => socket.publish('impact', 1), () => socket.subscribe('impact', () => {}), () => socket.simulateHeartbeat(), () => socket.simulateDropout(10)]) assert.throws(operation, /disposed/);
  reconciles(socket);
});

test('bounded in-flight capacity rejects overflow and reconciles every packet', () => {
  const { socket, clock } = setup({ maxPending: 2 }); socket.connect(); socket.publish('impact', 1); socket.publish('impact', 2);
  assert.equal(socket.publish('impact', 3).reason, 'in-flight limit'); assert.equal(socket.getStats().pending, 2); reconciles(socket);
  clock.tick(60); assert.equal(socket.getStats().delivered, 2); assert.equal(socket.getStats().dropped, 1); reconciles(socket); socket.dispose();
});

test('topic and handler limits are explicit and invalid settings leave counters intact', () => {
  const { socket } = setup();
  for (const channel of ['', '../impact', 'UPPER', 'a'.repeat(33), null]) assert.throws(() => socket.subscribe(channel, () => {}));
  for (let i = 0; i < 16; i++) socket.subscribe('topic-' + i, () => {});
  assert.throws(() => socket.subscribe('extra', () => {}), /16 topics/);
  for (let i = 0; i < 16; i++) socket.subscribe('topic-0', () => {});
  assert.throws(() => socket.subscribe('topic-0', () => {}), /32 handlers/);
  for (const rate of [-1, 1.1, NaN, '0']) assert.throws(() => socket.setDropRate(rate));
  for (const latency of [-1, Infinity, 2001]) assert.throws(() => socket.setLatency(latency));
  for (const duration of [0, -1, 60001, NaN]) assert.throws(() => socket.simulateDropout(duration));
  assert.equal(socket.getStats().sent, 0); socket.dispose();
});

test('invalid injected randomness fails before a packet is recorded and heartbeat timers stay bounded', () => {
  const bad = setup({ random: () => NaN }); bad.socket.connect(); assert.throws(() => bad.socket.publish('impact', 1)); assert.equal(bad.socket.getStats().sent, 0); bad.socket.dispose();
  const { socket, clock } = setup(); socket.connect(); clock.tick(60000);
  assert.equal(socket.getStats().pings, 120); assert.equal(socket.getStats().acknowledgements, 119); assert.ok(clock.timers.size <= 2);
  const view = socket.getStats(); view.sent = 999; assert.equal(socket.getStats().sent, 0); socket.dispose();
});
