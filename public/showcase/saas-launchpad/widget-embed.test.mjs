import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SaasLaunchpadWidgetBridge } from './widget-embed.js';

function fixture() {
  const sent = [];
  const errors = [];
  const handlers = new Set();
  const root = { dataset: {}, style: { setProperty(key, value) { this[key] = value; } } };
  const host = {
    parent: { postMessage: (message, origin) => sent.push({ message, origin }) },
    addEventListener: (_, listener) => handlers.add(listener),
    removeEventListener: (_, listener) => handlers.delete(listener),
    reportError: (error) => errors.push(error),
  };
  const bridge = new SaasLaunchpadWidgetBridge({ parentOrigin: 'https://saas-dashboard.example', host, root });
  const deliver = (event, data = {}, overrides = {}) => {
    const message = { origin: 'https://saas-dashboard.example', source: host.parent,
      data: { channel: 'saas-launchpad', version: 1, event, data }, ...overrides };
    for (const listener of handlers) listener(message);
  };
  return { bridge, host, root, sent, errors, handlers, deliver };
}

test('rejects wildcard, credentialed and path-bearing origins', () => {
  for (const parentOrigin of ['*', 'null', 'data:text/html,hi',
    'https://user:pass@host.example', 'https://host.example/path', 'https://host.example?query=1']) {
    assert.throws(() => new SaasLaunchpadWidgetBridge({ parentOrigin }));
  }
});

test('sends readiness to the configured parent origin', () => {
  const { bridge, sent } = fixture();
  assert.equal(bridge.postToParent('ready', { widget: 'pricing' }), true);
  assert.deepEqual(sent, [{ origin: 'https://saas-dashboard.example', message:
    { channel: 'saas-launchpad', version: 1, event: 'ready', data: { widget: 'pricing' } } }]);
  assert.equal(bridge.postToParent('unsupported_event', {}), false);
});

test('rejects messages from untrusted origins or incorrect sources', () => {
  const { bridge, deliver, sent } = fixture();
  deliver('set-theme', { mode: 'light' }, { origin: 'https://malicious-saas.fake' });
  deliver('set-theme', { mode: 'light' }, { source: {} });
  assert.equal(bridge.theme.mode, 'dark');
  assert.equal(sent.length, 0);
});

test('validates and applies theme updates dynamically', () => {
  const { bridge, root, deliver, sent } = fixture();
  deliver('set-theme', { mode: 'light', accent: '#4f46e5' });
  assert.equal(bridge.theme.mode, 'light');
  assert.equal(bridge.theme.accent, '#4f46e5');
  assert.equal(root.dataset.theme, 'light');
  assert.equal(root.style['--widget-accent'], '#4f46e5');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].message.event, 'theme-applied');
});

test('subscribes listeners to validated parent events', () => {
  const { bridge, deliver } = fixture();
  let received = null;
  bridge.onParentMessage((msg) => {
    received = msg;
  });

  deliver('request-state', {});
  assert.ok(received);
  assert.equal(received.event, 'request-state');
});
