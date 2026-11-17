import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CryptoExchangeProAnalyticsEngine } from './analytics-telemetry.js';

test('CryptoExchangeProAnalyticsEngine - serializes and tracks interaction events accurately', () => {
  const engine = new CryptoExchangeProAnalyticsEngine();
  const evt = engine.trackEvent('trade_executed', { pair: 'ETH/USDT', volume: 2.5 });

  assert.strictEqual(evt.name, 'trade_executed');
  assert.strictEqual(evt.data.pair, 'ETH/USDT');
  assert.strictEqual(evt.data.volume, 2.5);

  const events = engine.getEvents();
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].id, evt.id);
});

test('CryptoExchangeProAnalyticsEngine - scrubs sensitive PII fields and patterns', () => {
  const engine = new CryptoExchangeProAnalyticsEngine();
  const evt = engine.trackEvent('user_login', {
    user_id: 'trader_84',
    email: 'trader@crypto.test',
    auth_token: 'secret_jwt_xyz',
    private_key: '0x1234567890abcdef',
    safe_param: 'market_view'
  });

  assert.strictEqual(evt.data.user_id, 'trader_84');
  assert.strictEqual(evt.data.email, '[SCRUBBED]');
  assert.strictEqual(evt.data.auth_token, '[SCRUBBED]');
  assert.strictEqual(evt.data.private_key, '[SCRUBBED]');
  assert.strictEqual(evt.data.safe_param, 'market_view');
});

test('CryptoExchangeProAnalyticsEngine - computes and formats session duration accurately', () => {
  const startTime = Date.now() - 125000; // 2 minutes and 5 seconds ago
  const engine = new CryptoExchangeProAnalyticsEngine({ startTime });

  const durationStr = engine.computeSessionDuration();
  assert.strictEqual(durationStr, '02:05');
});

test('CryptoExchangeProAnalyticsEngine - calculates scroll depth percentage accurately', () => {
  const engine = new CryptoExchangeProAnalyticsEngine();

  const mockDoc = {
    documentElement: {
      scrollTop: 300,
      scrollHeight: 1000,
      clientHeight: 400
    }
  };

  const depth = engine.getScrollDepthPercentage(mockDoc);
  // (300 / (1000 - 400)) * 100 = 50%
  assert.strictEqual(depth, 50);
});
