import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AutomotiveHypercarWidgetBridge } from './widget-embed.js';

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
  const bridge = new AutomotiveHypercarWidgetBridge({ parentOrigin: 'https://host.example', host, root });
  const deliver = (event, data = {}, overrides = {}) => {
    const message = { origin: 'https://host.example', source: host.parent,
      data: { channel: 'automotive-hypercar', version: 1, event, data }, ...overrides };
    for (const listener of handlers) listener(message);
  };
  return { bridge, host, root, sent, errors, handlers, deliver };
}

test('AutomotiveHypercarWidgetBridge - rejects wildcard, opaque, credentialed and path-bearing origins', () => {
  for (const parentOrigin of ['*', 'null', 'data:text/html,hi', 'javascript:alert(1)',
    'https://name:password@host.example', 'https://host.example/path', 'https://host.example?key=x']) {
    assert.throws(() => new AutomotiveHypercarWidgetBridge({ parentOrigin }));
  }
});

test('AutomotiveHypercarWidgetBridge - sends readiness only to configured exact origin', () => {
  const { bridge, sent } = fixture();
  assert.equal(bridge.postToParent('ready', { sample: true }), true);
  assert.deepEqual(sent, [{ origin: 'https://host.example', message:
    { channel: 'automotive-hypercar', version: 1, event: 'ready', data: { sample: true } } }]);
  assert.equal(bridge.postToParent('unknown', {}), false);
  assert.equal(bridge.postToParent('ready', []), false);
});

test('AutomotiveHypercarWidgetBridge - validates theme before applying', () => {
  const { bridge, root, deliver, sent } = fixture();
  deliver('set-theme', { mode: 'dark', accent: 'url(javascript:alert(1))' });
  assert.equal(bridge.theme.mode, 'light');
  assert.deepEqual(root.dataset, {});
  assert.equal(sent.length, 0);

  deliver('set-theme', { mode: 'dark', accent: '#4c9' });
  assert.equal(root.dataset.theme, 'dark');
  assert.equal(root.style['--widget-accent'], '#4c9');
  assert.equal(sent[0].message.event, 'theme-applied');
});

test('AutomotiveHypercarWidgetBridge - onParentMessage listener isolates mutations', () => {
  const { bridge, deliver } = fixture();
  let received;
  bridge.onParentMessage((message) => { received = message; });
  deliver('set-theme', { mode: 'dark' });
  assert.equal(received.data.mode, 'dark');
});
