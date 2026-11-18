import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AerospaceOrbiterWidgetBridge } from './widget-embed.js';

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
  const bridge = new AerospaceOrbiterWidgetBridge({ parentOrigin: 'https://host.example', host, root });
  const deliver = (event, data = {}, overrides = {}) => {
    const message = { origin: 'https://host.example', source: host.parent,
      data: { channel: 'aerospace-orbiter', version: 1, event, data }, ...overrides };
    for (const listener of handlers) listener(message);
  };
  return { bridge, host, root, sent, errors, handlers, deliver };
}

test('AerospaceOrbiterWidgetBridge - rejects wildcard, opaque, credentialed and path-bearing origins', () => {
  for (const parentOrigin of ['*', 'null', 'data:text/html,hi', 'javascript:alert(1)',
    'https://name:password@host.example', 'https://host.example/path', 'https://host.example?key=x']) {
    assert.throws(() => new AerospaceOrbiterWidgetBridge({ parentOrigin }));
  }
});

test('AerospaceOrbiterWidgetBridge - sends readiness only to configured exact origin', () => {
  const { bridge, sent } = fixture();
  assert.equal(bridge.postToParent('ready', { sample: true }), true);
  assert.deepEqual(sent, [{ origin: 'https://host.example', message:
    { channel: 'aerospace-orbiter', version: 1, event: 'ready', data: { sample: true } } }]);
  assert.equal(bridge.postToParent('unknown', {}), false);
  assert.equal(bridge.postToParent('ready', []), false);
});

test('AerospaceOrbiterWidgetBridge - validates theme before applying', () => {
  const { bridge, root, deliver, sent } = fixture();
  deliver('set-theme', { mode: 'dark', accent: 'url(javascript:alert(1))' });
  assert.equal(bridge.theme.mode, 'dark');
  assert.deepEqual(root.dataset, {});
  assert.equal(sent.length, 0);

  deliver('set-theme', { mode: 'light', accent: '#0284c7' });
  assert.equal(root.dataset.theme, 'light');
  assert.equal(root.style['--widget-accent'], '#0284c7');
  assert.equal(sent[0].message.event, 'theme-applied');
});

test('AerospaceOrbiterWidgetBridge - onParentMessage listener isolates mutations', () => {
  const { bridge, deliver } = fixture();
  let received;
  bridge.onParentMessage((message) => { received = message; });
  deliver('set-theme', { mode: 'light' });
  assert.equal(received.data.mode, 'light');
});
