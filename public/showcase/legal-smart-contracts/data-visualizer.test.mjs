import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { LegalSmartContractsRadarChart } from './data-visualizer.js';

describe('LegalSmartContractsRadarChart', () => {
  it('initializes with default metrics', () => {
    const chart = new LegalSmartContractsRadarChart();
    assert.equal(chart.centerX, 230);
    assert.equal(chart.maxRadius, 170);
    assert.equal(chart.metrics.length, 6);
  });

  it('accurately maps polar coordinates to Cartesian space', () => {
    const chart = new LegalSmartContractsRadarChart({ centerX: 200, centerY: 200, maxRadius: 100 });
    const top = chart.polarToCartesian(100, 0);
    assert.equal(Math.round(top.x), 200);
    assert.equal(Math.round(top.y), 100);
  });

  it('generates valid SVG polygon point strings', () => {
    const chart = new LegalSmartContractsRadarChart();
    const str = chart.generatePolygonPoints();
    assert.ok(typeof str === 'string');
    assert.equal(str.split(' ').length, 6);
  });

  it('computes enclosed area with Shoelace formula', () => {
    const chart = new LegalSmartContractsRadarChart();
    const area = chart.computeEnclosedArea();
    assert.ok(area > 0);
  });

  it('updates and clamps metrics', () => {
    const chart = new LegalSmartContractsRadarChart();
    assert.ok(chart.updateMetric(chart.metrics[0].key, 0.45));
    assert.equal(chart.metrics[0].value, 0.45);
    chart.updateMetric(chart.metrics[0].key, 2.0);
    assert.equal(chart.metrics[0].value, 1.0);
  });
});
