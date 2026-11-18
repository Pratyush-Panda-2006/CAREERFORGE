import test from 'node:test';
import assert from 'node:assert/strict';
import { FestivalHubWidgetBridge } from './widget-embed.js';

test('FestivalHubWidgetBridge - initialization & default state', () => {
  const bridge = new FestivalHubWidgetBridge();
  assert.equal(bridge.isConnected, false);
  assert.equal(bridge.prefix, 'FESTIVAL_WIDGET');
  assert.equal(bridge.isOriginAllowed('https://festival.com'), true);
});

test('FestivalHubWidgetBridge - origin restriction filtering', () => {
  const bridge = new FestivalHubWidgetBridge({
    allowedOrigins: ['https://ticketmaster-partner.com', 'https://festival-main.org']
  });
  assert.equal(bridge.isOriginAllowed('https://ticketmaster-partner.com'), true);
  assert.equal(bridge.isOriginAllowed('https://untrusted-domain.com'), false);
});

test('FestivalHubWidgetBridge - event subscription and dispatching', () => {
  const bridge = new FestivalHubWidgetBridge();
  let receivedPayload = null;
  const unsubscribe = bridge.on('STAGE_CHANGED', (payload) => {
    receivedPayload = payload;
  });

  bridge.handleIncomingMessage({
    origin: 'https://any.com',
    data: {
      type: 'FESTIVAL_WIDGET:STAGE_CHANGED',
      action: 'STAGE_CHANGED',
      payload: { stage: 'Neon Forest', artist: 'Aurora' }
    }
  });

  assert.deepEqual(receivedPayload, { stage: 'Neon Forest', artist: 'Aurora' });

  // Unsubscribe test
  unsubscribe();
  receivedPayload = null;
  bridge.handleIncomingMessage({
    origin: 'https://any.com',
    data: {
      type: 'FESTIVAL_WIDGET:STAGE_CHANGED',
      action: 'STAGE_CHANGED',
      payload: { stage: 'Main Stage', artist: 'Sol' }
    }
  });
  assert.equal(receivedPayload, null);
});

test('FestivalHubWidgetBridge - handshake ping handling', () => {
  let postedMessage = null;
  const mockTarget = {
    postMessage: (msg) => {
      postedMessage = msg;
    }
  };

  const bridge = new FestivalHubWidgetBridge({ targetWindow: mockTarget });
  bridge.handleIncomingMessage({
    origin: 'https://parent-app.com',
    data: {
      type: 'FESTIVAL_WIDGET:HANDSHAKE_PING',
      action: 'HANDSHAKE_PING'
    }
  });

  assert.equal(bridge.isConnected, true);
  assert.equal(postedMessage.type, 'FESTIVAL_WIDGET:HANDSHAKE_PONG');
  assert.equal(postedMessage.action, 'HANDSHAKE_PONG');
});

test('FestivalHubWidgetBridge - post sends formatted message', () => {
  let posted = null;
  const mockTarget = {
    postMessage: (msg, origin) => {
      posted = { msg, origin };
    }
  };
  const bridge = new FestivalHubWidgetBridge({ targetWindow: mockTarget });
  const success = bridge.post('LINEUP_PING', { test: 123 }, 'https://target.com');

  assert.equal(success, true);
  assert.equal(posted.origin, 'https://target.com');
  assert.equal(posted.msg.action, 'LINEUP_PING');
  assert.equal(posted.msg.type, 'FESTIVAL_WIDGET:LINEUP_PING');
  assert.equal(posted.msg.payload.test, 123);
});
