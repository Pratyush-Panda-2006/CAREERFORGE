import assert from 'node:assert/strict';
import test from 'node:test';
import { PetAdoptionHavenSocketEmulator } from './mock-websocket.js';

function session() {
  let time = 0;
  const socket = new PetAdoptionHavenSocketEmulator({
    clock: () => time,
    heartbeatInterval: 100,
    heartbeatTimeout: 200,
    firstBackoff: 50,
    maximumBackoff: 200,
    roundTrip: 20,
  });
  socket.connect();
  return { socket, at(ms) { time = ms; socket.simulateHeartbeat(); } };
}

test('routes adoption and foster events only to their subscribed handlers', () => {
  const { socket } = session();
  const shown = [];
  const remove = socket.subscribe('intake', value => shown.push(value));
  socket.subscribe('foster', value => shown.push(value));
  assert.equal(socket.publish('intake', 'Juniper'), true);
  remove();
  socket.publish('intake', 'Milo');
  socket.publish('foster', 'Willow');
  assert.deepEqual(shown, ['Juniper', 'Willow']);
  assert.equal(socket.sent, 3);
  assert.equal(socket.dropped, 0);
});

test('records the simulated round trip only after a reply arrives', () => {
  const { socket, at } = session();
  at(100);
  at(119);
  assert.equal(socket.latency, null);
  at(120);
  assert.equal(socket.latency, 20);
  assert.equal(socket.state, 'connected');
});

test('an old unsubscribe handle leaves later subscribers intact', () => {
  const { socket } = session();
  const unsubscribe = socket.subscribe('intake', () => {});
  unsubscribe();
  const received = [];
  socket.subscribe('intake', event => received.push(event));
  unsubscribe();
  socket.publish('intake', 'later');
  assert.deepEqual(received, ['later']);
});

test('a dropout cancels a heartbeat reply that is already in flight', () => {
  const { socket, at } = session();
  at(100);
  at(110);
  socket.simulateDropout(300);
  at(120);
  assert.equal(socket.latency, null);
  at(300);
  assert.equal(socket.state, 'reconnecting');
});

test('times out a heartbeat and retries with capped exponential backoff', () => {
  const { socket, at } = session();
  assert.equal(socket.simulateDropout(710), true);
  at(100);
  at(299);
  assert.equal(socket.state, 'connected');
  at(300);
  assert.equal(socket.state, 'reconnecting');
  at(349);
  assert.equal(socket.attempts, 0);
  at(350);
  assert.equal(socket.attempts, 1);
  at(450);
  assert.equal(socket.attempts, 2);
  at(650);
  assert.equal(socket.attempts, 3);
  at(849);
  assert.equal(socket.state, 'reconnecting');
  at(850);
  assert.equal(socket.attempts, 4);
  assert.equal(socket.state, 'connected');
  assert.equal(socket.publish('intake', 'routed after retry'), true);
});

test('a short outage can recover before the heartbeat deadline', () => {
  const { socket, at } = session();
  socket.simulateDropout(140);
  at(100);
  at(200);
  at(220);
  assert.equal(socket.state, 'connected');
  assert.equal(socket.latency, 20);
  assert.equal(socket.attempts, 0);
});

test('dropped packets are counted without reaching a subscription', () => {
  const { socket } = session();
  let received = 0;
  socket.subscribe('foster', () => received++);
  socket.simulateDropout(100);
  assert.equal(socket.publish('foster', 'unavailable'), false);
  assert.equal(socket.dropped, 1);
  assert.equal(socket.sent, 1);
  assert.equal(received, 0);
});

test('reports actual local topic counts through a correlated summary reply', () => {
  const { socket } = session();
  const replies = [];
  socket.subscribe('queue.reply', payload => replies.push(payload));
  socket.publish('intake', 'one');
  socket.publish('foster', 'two');
  const summary = socket.requestQueueSummary();
  assert.deepEqual(summary, { id: 1, intake: 1, foster: 1 });
  assert.deepEqual(replies, [summary]);
  socket.simulateDropout(200);
  assert.equal(socket.requestQueueSummary(), null);
  assert.equal(replies.length, 1);
});

test('manual disconnect cancels retries and resets latency', () => {
  const { socket, at } = session();
  socket.simulateDropout(1000);
  at(100);
  at(300);
  assert.equal(socket.state, 'reconnecting');
  socket.disconnect();
  at(1200);
  assert.equal(socket.state, 'disconnected');
  assert.equal(socket.attempts, 0);
  assert.equal(socket.latency, null);
  assert.equal(socket.simulateDropout(300), false);
  assert.equal(socket.publish('intake', 'offline'), false);
});
