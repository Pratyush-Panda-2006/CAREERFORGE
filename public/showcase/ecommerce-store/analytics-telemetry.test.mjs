import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EcommerceStoreAnalyticsEngine } from './analytics-telemetry.js';

test('EcommerceStoreAnalyticsEngine - tracks events and prepends to history', () => {
  const engine = new EcommerceStoreAnalyticsEngine();
  const evt = engine.trackEvent('cart_item_added', { sku: 'SHOE-99', qty: 1 });

  assert.strictEqual(evt.name, 'cart_item_added');
  assert.strictEqual(engine.events.length, 1);
  assert.strictEqual(engine.getEvents()[0].name, 'cart_item_added');
});

test('EcommerceStoreAnalyticsEngine - automatically scrubs sensitive PII fields', () => {
  const engine = new EcommerceStoreAnalyticsEngine();
  const evt = engine.trackEvent('checkout_submitted', {
    userEmail: 'customer@example.com',
    card_number: '4111222233334444',
    itemCount: 3
  });

  assert.strictEqual(evt.data.userEmail, '[SCRUBBED]');
  assert.strictEqual(evt.data.card_number, '[SCRUBBED]');
  assert.strictEqual(evt.data.itemCount, 3);
});

test('EcommerceStoreAnalyticsEngine - computes formatted session duration string', () => {
  const start = Date.now() - 65000;
  const engine = new EcommerceStoreAnalyticsEngine({ startTime: start });
  const duration = engine.computeSessionDuration(start + 65000);

  assert.strictEqual(duration, '01:05');
});

test('EcommerceStoreAnalyticsEngine - clears events and exports valid JSON payload', () => {
  const engine = new EcommerceStoreAnalyticsEngine();
  engine.trackEvent('search_query', { query: 'running shoes' });

  const jsonStr = engine.exportTelemetryJson();
  const parsed = JSON.parse(jsonStr);
  assert.strictEqual(parsed.eventCount, 1);
  assert.strictEqual(parsed.events[0].name, 'search_query');

  engine.clearEvents();
  assert.strictEqual(engine.getEvents().length, 0);
});
