import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AgencyStudioAnalyticsEngine } from './analytics-telemetry.js';

test('AgencyStudioAnalyticsEngine - serializes and tracks client interaction events', () => {
  const engine = new AgencyStudioAnalyticsEngine();
  const evt = engine.trackEvent('proposal_open', { proposalId: 'prop_99', targetLead: 'Acme Corp' });

  assert.strictEqual(evt.name, 'proposal_open');
  assert.strictEqual(evt.data.proposalId, 'prop_99');
  assert.strictEqual(evt.data.targetLead, 'Acme Corp');

  const events = engine.getEvents();
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].id, evt.id);
});

test('AgencyStudioAnalyticsEngine - scrubs sensitive PII fields and patterns', () => {
  const engine = new AgencyStudioAnalyticsEngine();
  const evt = engine.trackEvent('lead_submission', {
    contact_name: 'Morgan Blake',
    email: 'morgan@agency.design',
    auth_token: 'secret_lead_token',
    password: 'password789',
    campaign_budget: 15000,
    portfolio_viewed: 'branding-2026'
  });

  assert.strictEqual(evt.data.contact_name, 'Morgan Blake');
  assert.strictEqual(evt.data.email, '[SCRUBBED]');
  assert.strictEqual(evt.data.auth_token, '[SCRUBBED]');
  assert.strictEqual(evt.data.password, '[SCRUBBED]');
  assert.strictEqual(evt.data.campaign_budget, '[SCRUBBED]');
  assert.strictEqual(evt.data.portfolio_viewed, 'branding-2026');
});

test('AgencyStudioAnalyticsEngine - computes and formats session duration accurately', () => {
  const startTime = Date.now() - 110000; // 1 minute and 50 seconds ago
  const engine = new AgencyStudioAnalyticsEngine({ startTime });

  const durationStr = engine.computeSessionDuration();
  assert.strictEqual(durationStr, '01:50');
});

test('AgencyStudioAnalyticsEngine - calculates scroll depth percentage accurately', () => {
  const engine = new AgencyStudioAnalyticsEngine();

  const mockDoc = {
    documentElement: {
      scrollTop: 250,
      scrollHeight: 1000,
      clientHeight: 500
    }
  };

  const depth = engine.getScrollDepthPercentage(mockDoc);
  // (250 / (1000 - 500)) * 100 = 50%
  assert.strictEqual(depth, 50);
});
