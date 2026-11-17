import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BiotechGenomicsAnalyticsEngine } from './analytics-telemetry.js';

describe('BiotechGenomicsAnalyticsEngine', () => {
  it('initializes with default options', () => {
    const engine = new BiotechGenomicsAnalyticsEngine();
    assert.equal(engine.maskPII, true);
    assert.equal(engine.maxEvents, 500);
    assert.equal(engine.getEvents().length, 0);
  });

  it('sanitizes emails, phone numbers, and credentials', () => {
    const engine = new BiotechGenomicsAnalyticsEngine();
    const rawData = {
      user: 'researcher@genomics.org',
      contact: 'Call +1 (555) 234-5678 for details',
      apiKey: 'sec_live_9384920491820491823901',
      details: {
        patientId: 'PAT-90123'
      }
    };

    const sanitized = engine.sanitizeData(rawData);
    assert.equal(sanitized.user, '[REDACTED_EMAIL]');
    assert.equal(sanitized.contact, 'Call [REDACTED_PHONE] for details');
    assert.equal(sanitized.apiKey, '[REDACTED_CREDENTIAL]');
    assert.equal(sanitized.details.patientId, '[REDACTED_CREDENTIAL]');
  });

  it('tracks sanitized events and offsets', () => {
    const engine = new BiotechGenomicsAnalyticsEngine();
    const event = engine.trackEvent('crispr_sequence_analyzed', {
      targetGene: 'BRCA1',
      analystEmail: 'lead@lab.com'
    });

    assert.equal(event.name, 'crispr_sequence_analyzed');
    assert.equal(event.data.targetGene, 'BRCA1');
    assert.equal(event.data.analystEmail, '[REDACTED_EMAIL]');
    assert.ok(typeof event.timeOffsetMs === 'number');
    assert.equal(engine.getEvents().length, 1);
  });

  it('records interaction coordinates and scroll depth', () => {
    const engine = new BiotechGenomicsAnalyticsEngine();
    engine.recordInteraction(140, 280, 'BUTTON');
    engine.recordScroll(45);
    engine.recordScroll(80);
    engine.recordScroll(60); // should not reduce max

    assert.equal(engine.getHeatmapPoints().length, 1);
    assert.equal(engine.getHeatmapPoints()[0].x, 140);
    assert.equal(engine.getHeatmapPoints()[0].y, 280);
    assert.equal(engine.getScrollDepthPercentage(), 80);
  });

  it('exports an anonymized telemetry report', () => {
    const engine = new BiotechGenomicsAnalyticsEngine();
    engine.trackEvent('sequence_loaded', { count: 4 });
    engine.recordInteraction(50, 100, 'CANVAS');

    const report = engine.exportAnonymizedReport();
    assert.equal(report.totalEvents, 1);
    assert.equal(report.interactionCount, 1);
    assert.ok(typeof report.sessionDurationMs === 'number');
  });
});
