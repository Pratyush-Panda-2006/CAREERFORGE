import test from 'node:test';
import assert from 'node:assert/strict';
import { VrMetaverseHubRpcStreamHub } from './rpc-stream-hub.js';

test('VrMetaverseHubRpcStreamHub - establishes simulated connection and handles disconnect', async () => {
  const hub = new VrMetaverseHubRpcStreamHub({ latencyMs: 10 });
  assert.strictEqual(hub.connected, false);

  const openEvent = await hub.connect('wss://test.hub/ws');
  assert.strictEqual(hub.connected, true);
  assert.strictEqual(openEvent.status, 'CONNECTED');

  const closeEvent = hub.disconnect();
  assert.strictEqual(hub.connected, false);
  assert.strictEqual(closeEvent.status, 'DISCONNECTED');
});

test('VrMetaverseHubRpcStreamHub - sends RPC and correlates request/response by ID', async () => {
  const hub = new VrMetaverseHubRpcStreamHub({ latencyMs: 10 });
  await hub.connect();

  const pingResult = await hub.sendRpc('ping');
  assert.strictEqual(pingResult.pong, true);
  assert.ok(pingResult.timestamp > 0);

  const roomResult = await hub.sendRpc('getRoomState', { roomId: 'Cyber_Arena' });
  assert.strictEqual(roomResult.room, 'Cyber_Arena');
  assert.ok(Array.isArray(roomResult.avatars));

  const log = hub.getLog();
  assert.ok(log.some(l => l.direction === 'RPC_REQUEST' && l.data.method === 'ping'));
  assert.ok(log.some(l => l.direction === 'RPC_RESPONSE' && l.data.result?.pong === true));
});

test('VrMetaverseHubRpcStreamHub - rejects RPC calls when disconnected', async () => {
  const hub = new VrMetaverseHubRpcStreamHub();
  await assert.rejects(
    () => hub.sendRpc('ping'),
    /Cannot send RPC: Hub is disconnected/
  );
});

test('VrMetaverseHubRpcStreamHub - dispatches broadcast messages to PubSub subscribers', async () => {
  const hub = new VrMetaverseHubRpcStreamHub();
  await hub.connect();

  let receivedPayload = null;
  let receivedTopic = null;

  const unsubscribe = hub.subscribeTopic('avatar:move', (payload, topic) => {
    receivedPayload = payload;
    receivedTopic = topic;
  });

  const success = hub.broadcastMessage('avatar:move', { x: 12, y: 0, z: -5 });
  assert.strictEqual(success, true);
  assert.strictEqual(receivedTopic, 'avatar:move');
  assert.deepStrictEqual(receivedPayload, { x: 12, y: 0, z: -5 });

  // Unsubscribe and verify no more triggers
  unsubscribe();
  receivedPayload = null;
  hub.broadcastMessage('avatar:move', { x: 99, y: 0, z: 99 });
  assert.strictEqual(receivedPayload, null);
});
