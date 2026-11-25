import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CybersecuritySentinelEmbedBridge } from './embed-bridge.js';

describe('CybersecuritySentinelEmbedBridge', () => {
  it('validates allowed origins accurately', () => {
    const bridge = new CybersecuritySentinelEmbedBridge({ allowedOrigins: ['https://careerforge.dev'] });
    assert.equal(bridge.validateOrigin('https://careerforge.dev'), true);
    assert.equal(bridge.validateOrigin('https://malicious.site'), false);
  });

  it('creates structured envelope payload with appId and timestamp', () => {
    const bridge = new CybersecuritySentinelEmbedBridge();
    const payload = bridge.createPayload('query', { id: 101 });
    assert.equal(payload.action, 'query');
    assert.equal(payload.data.id, 101);
    assert.ok(payload.timestamp > 0);
  });

  it('serializes and safely deserializes valid matching payloads', () => {
    const bridge = new CybersecuritySentinelEmbedBridge();
    const payload = bridge.createPayload('auth', { user: 'admin' });
    const serialized = bridge.serialize(payload);
    const decoded = bridge.deserialize(serialized);
    assert.deepEqual(decoded.data, { user: 'admin' });
    assert.equal(bridge.deserialize('{ invalid json'), null);
  });
});
