import test from 'node:test';
import assert from 'node:assert/strict';
import { SupplyChainLogisticsRpcStreamHub } from './rpc-stream-hub.js';

test('SupplyChainLogisticsRpcStreamHub - establishes simulated connection and handles disconnect', async () => {
  const hub = new SupplyChainLogisticsRpcStreamHub({ latencyMs: 10 });
  assert.strictEqual(hub.connected, false);

  const openEvent = await hub.connect('wss://fleet.test/ws');
  assert.strictEqual(hub.connected, true);
  assert.strictEqual(openEvent.status, 'CONNECTED');

  const closeEvent = hub.disconnect();
  assert.strictEqual(hub.connected, false);
  assert.strictEqual(closeEvent.status, 'DISCONNECTED');
});

test('SupplyChainLogisticsRpcStreamHub - sends RPC and correlates request/response by ID', async () => {
  const hub = new SupplyChainLogisticsRpcStreamHub({ latencyMs: 10 });
  await hub.connect();

  const pingResult = await hub.sendRpc('ping');
  assert.strictEqual(pingResult.pong, true);
  assert.ok(pingResult.timestamp > 0);

  const fleetResult = await hub.sendRpc('getFleetStatus', { region: 'EMEA' });
  assert.strictEqual(fleetResult.networkHealth, 'OPTIMAL');
  assert.ok(fleetResult.activeTrucks > 0);

  const log = hub.getLog();
  assert.ok(log.some(l => l.direction === 'RPC_REQUEST' && l.data.method === 'ping'));
  assert.ok(log.some(l => l.direction === 'RPC_RESPONSE' && l.data.result?.pong === true));
});

test('SupplyChainLogisticsRpcStreamHub - rejects RPC calls when disconnected', async () => {
  const hub = new SupplyChainLogisticsRpcStreamHub();
  await assert.rejects(
    () => hub.sendRpc('ping'),
    /Cannot send RPC: Hub is disconnected/
  );
});

test('SupplyChainLogisticsRpcStreamHub - dispatches broadcast messages to PubSub subscribers', async () => {
  const hub = new SupplyChainLogisticsRpcStreamHub();
  await hub.connect();

  let receivedPayload = null;
  let receivedTopic = null;

  const unsubscribe = hub.subscribeTopic('truck:gps', (payload, topic) => {
    receivedPayload = payload;
    receivedTopic = topic;
  });

  const success = hub.broadcastMessage('truck:gps', { lat: 51.5074, lng: -0.1278 });
  assert.strictEqual(success, true);
  assert.strictEqual(receivedTopic, 'truck:gps');
  assert.deepStrictEqual(receivedPayload, { lat: 51.5074, lng: -0.1278 });

  // Unsubscribe and verify no more triggers
  unsubscribe();
  receivedPayload = null;
  hub.broadcastMessage('truck:gps', { lat: 40.7128, lng: -74.006 });
  assert.strictEqual(receivedPayload, null);
});
