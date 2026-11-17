import test from 'node:test';
import assert from 'node:assert/strict';
import { EcommerceStoreWidgetBridge } from './widget-embed.js';

test('EcommerceStoreWidgetBridge - initialization & default state', () => {
  const bridge = new EcommerceStoreWidgetBridge();
  assert.equal(bridge.isConnected, false);
  assert.equal(bridge.prefix, 'ECOMMERCE_WIDGET');
  assert.equal(bridge.isOriginAllowed('https://example.com'), true);
});

test('EcommerceStoreWidgetBridge - origin restriction filtering', () => {
  const bridge = new EcommerceStoreWidgetBridge({
    allowedOrigins: ['https://trusted-store.com', 'https://partner-portal.com']
  });
  assert.equal(bridge.isOriginAllowed('https://trusted-store.com'), true);
  assert.equal(bridge.isOriginAllowed('https://malicious-site.com'), false);
});

test('EcommerceStoreWidgetBridge - event subscription and dispatching', () => {
  const bridge = new EcommerceStoreWidgetBridge();
  let receivedPayload = null;
  const unsubscribe = bridge.on('CART_UPDATED', (payload) => {
    receivedPayload = payload;
  });

  bridge.handleIncomingMessage({
    origin: 'https://any.com',
    data: {
      type: 'ECOMMERCE_WIDGET:CART_UPDATED',
      action: 'CART_UPDATED',
      payload: { cartId: 'C-99', items: 3 }
    }
  });

  assert.deepEqual(receivedPayload, { cartId: 'C-99', items: 3 });

  // Test unsubscribe
  unsubscribe();
  receivedPayload = null;
  bridge.handleIncomingMessage({
    origin: 'https://any.com',
    data: {
      type: 'ECOMMERCE_WIDGET:CART_UPDATED',
      action: 'CART_UPDATED',
      payload: { cartId: 'C-100', items: 4 }
    }
  });
  assert.equal(receivedPayload, null);
});

test('EcommerceStoreWidgetBridge - handshake ping handling', () => {
  let postedMessage = null;
  const mockTarget = {
    postMessage: (msg) => {
      postedMessage = msg;
    }
  };

  const bridge = new EcommerceStoreWidgetBridge({ targetWindow: mockTarget });
  bridge.handleIncomingMessage({
    origin: 'https://parent-app.com',
    data: {
      type: 'ECOMMERCE_WIDGET:HANDSHAKE_PING',
      action: 'HANDSHAKE_PING'
    }
  });

  assert.equal(bridge.isConnected, true);
  assert.equal(postedMessage.type, 'ECOMMERCE_WIDGET:HANDSHAKE_PONG');
  assert.equal(postedMessage.action, 'HANDSHAKE_PONG');
});

test('EcommerceStoreWidgetBridge - post sends formatted message', () => {
  let posted = null;
  const mockTarget = {
    postMessage: (msg, origin) => {
      posted = { msg, origin };
    }
  };
  const bridge = new EcommerceStoreWidgetBridge({ targetWindow: mockTarget });
  const success = bridge.post('TEST_ACTION', { foo: 'bar' }, 'https://target.com');

  assert.equal(success, true);
  assert.equal(posted.origin, 'https://target.com');
  assert.equal(posted.msg.action, 'TEST_ACTION');
  assert.equal(posted.msg.type, 'ECOMMERCE_WIDGET:TEST_ACTION');
  assert.equal(posted.msg.payload.foo, 'bar');
});
