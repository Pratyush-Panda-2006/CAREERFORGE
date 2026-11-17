import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NonprofitImpactWidgetBridge } from './widget-embed.js';

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
  const bridge = new NonprofitImpactWidgetBridge({ parentOrigin: 'https://host.example', host, root });
  const deliver = (event, data = {}, overrides = {}) => {
    const message = { origin: 'https://host.example', source: host.parent,
      data: { channel: 'nonprofit-impact', version: 1, event, data }, ...overrides };
    for (const listener of handlers) listener(message);
  };
  return { bridge, host, root, sent, errors, handlers, deliver };
}

test('rejects wildcard, opaque, credentialed and path-bearing origins', () => {
  for (const parentOrigin of ['*', 'null', 'data:text/html,hi', 'javascript:alert(1)',
    'https://name:password@host.example', 'https://host.example/path', 'https://host.example?key=x']) {
    assert.throws(() => new NonprofitImpactWidgetBridge({ parentOrigin }));
  }
});

test('sends readiness only to the configured exact origin', () => {
  const { bridge, sent } = fixture();
  assert.equal(bridge.postToParent('ready', { sample: true }), true);
  assert.deepEqual(sent, [{ origin: 'https://host.example', message:
    { channel: 'nonprofit-impact', version: 1, event: 'ready', data: { sample: true } } }]);
  assert.equal(bridge.postToParent('unknown', {}), false);
  assert.equal(bridge.postToParent('ready', []), false);
});

test('rejects mismatched origins and same-origin windows other than the parent', () => {
  const { bridge, deliver, sent } = fixture();
  deliver('set-theme', { mode: 'dark' }, { origin: 'https://host.example.attacker.test' });
  deliver('set-theme', { mode: 'dark' }, { source: {} });
  assert.equal(bridge.theme.mode, 'light');
  assert.equal(sent.length, 0);
});

test('rejects malformed envelopes and unknown commands', () => {
  const { deliver, sent } = fixture();
  for (const data of [null, [], 'message', { channel: 'other', version: 1, event: 'request-state', data: {} },
    { channel: 'nonprofit-impact', version: 2, event: 'request-state', data: {} }]) {
    deliver('request-state', {}, { data });
  }
  deliver('execute', { script: 'alert(1)' });
  deliver('request-state', { unexpected: true });
  assert.equal(sent.length, 0);
});

test('validates the entire theme before applying it or notifying listeners', () => {
  const { bridge, root, deliver, sent } = fixture();
  deliver('set-theme', { mode: 'dark', accent: 'url(javascript:alert(1))' });
  deliver('set-theme', { mode: 'dark', arbitraryStyle: 'color:red' });
  deliver('set-theme', {});
  assert.equal(bridge.theme.mode, 'light');
  assert.deepEqual(root.dataset, {});
  assert.equal(sent.length, 0);
  deliver('set-theme', { mode: 'dark', accent: '#4c9' });
  assert.equal(root.dataset.theme, 'dark');
  assert.equal(root.style['--widget-accent'], '#4c9');
  assert.equal(sent[0].message.event, 'theme-applied');
});

test('returns current state and isolates listener mutations and exceptions', () => {
  const { bridge, deliver, sent, errors } = fixture();
  bridge.onParentMessage((message) => { message.data.mode = 'broken'; throw new Error('listener failed'); });
  let received;
  bridge.onParentMessage((message) => { received = message; });
  deliver('set-theme', { mode: 'dark' });
  assert.equal(received.data.mode, 'dark');
  assert.equal(errors.length, 1);
  deliver('request-state');
  assert.equal(sent.at(-1).message.data.theme.mode, 'dark');
  assert.equal(sent.at(-1).message.data.sample, true);
});

test('unsubscribe and destroy release listeners and prevent later sends', () => {
  const { bridge, handlers, deliver, sent } = fixture();
  let calls = 0;
  const unsubscribe = bridge.onParentMessage(() => calls++);
  unsubscribe();
  deliver('request-state');
  assert.equal(calls, 0);
  assert.equal(sent.length, 1);
  bridge.destroy();
  bridge.destroy();
  assert.equal(handlers.size, 0);
  deliver('set-theme', { mode: 'dark' });
  assert.equal(bridge.postToParent('ready'), false);
  assert.equal(bridge.setTheme({ mode: 'dark' }), false);
  assert.throws(() => bridge.onParentMessage(() => {}));
});

test('a detached or non-cloneable parent send fails without crashing', () => {
  const { bridge, host } = fixture();
  host.parent.postMessage = () => { throw new Error('DataCloneError'); };
  assert.equal(bridge.postToParent('ready', { sample: true }), false);
});
