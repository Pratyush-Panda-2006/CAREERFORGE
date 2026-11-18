import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VirtualMuseum3dWidgetBridge } from './widget-embed.js';

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
  const bridge = new VirtualMuseum3dWidgetBridge({ parentOrigin: 'https://host.example', host, root });
  const deliver = (event, data = {}, overrides = {}) => {
    const message = { origin: 'https://host.example', source: host.parent,
      data: { channel: 'virtual-museum-3d', version: 1, event, data }, ...overrides };
    for (const listener of handlers) listener(message);
  };
  return { bridge, host, root, sent, errors, handlers, deliver };
}

test('VirtualMuseum3dWidgetBridge - rejects invalid parent origins', () => {
  for (const parentOrigin of ['*', 'null', 'javascript:alert(1)', 'https://host.example/path']) {
    assert.throws(() => new VirtualMuseum3dWidgetBridge({ parentOrigin }));
  }
});

test('VirtualMuseum3dWidgetBridge - sends readiness to exact origin', () => {
  const { bridge, sent } = fixture();
  assert.equal(bridge.postToParent('ready', { sample: true }), true);
  assert.deepEqual(sent, [{ origin: 'https://host.example', message:
    { channel: 'virtual-museum-3d', version: 1, event: 'ready', data: { sample: true } } }]);
  assert.equal(bridge.postToParent('unknown', {}), false);
});

test('VirtualMuseum3dWidgetBridge - validates theme updates safely', () => {
  const { bridge, root, deliver, sent } = fixture();
  deliver('set-theme', { mode: 'dark', accent: 'url(javascript:alert(1))' });
  assert.equal(bridge.theme.mode, 'dark');
  assert.deepEqual(root.dataset, {});
  assert.equal(sent.length, 0);

  deliver('set-theme', { mode: 'light', accent: '#10b981' });
  assert.equal(root.dataset.theme, 'light');
  assert.equal(root.style['--widget-accent'], '#10b981');
  assert.equal(sent[0].message.event, 'theme-applied');
});

test('VirtualMuseum3dWidgetBridge - onParentMessage listener isolates mutations', () => {
  const { bridge, deliver } = fixture();
  let received;
  bridge.onParentMessage((message) => { received = message; });
  deliver('set-theme', { mode: 'light' });
  assert.equal(received.data.mode, 'light');
});
