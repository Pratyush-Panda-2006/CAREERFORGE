import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EcommerceStoreRadarChart } from './radar-chart.js';

describe('EcommerceStoreRadarChart', () => {
  it('computes polar to cartesian coordinates correctly', () => {
    const chart = new EcommerceStoreRadarChart();
    const top = chart.polarToCartesian(0, 100);
    assert.equal(top.x, 200);
    assert.equal(top.y, 100);
  });

  it('generates correct polygon points array matching metrics count', () => {
    const chart = new EcommerceStoreRadarChart();
    const pts = chart.getPolygonPoints();
    assert.equal(pts.length, 6);
    pts.forEach(p => {
      assert.ok(typeof p.x === 'number');
      assert.ok(typeof p.y === 'number');
    });
  });

  it('calculates non-zero geometric polygon area via shoelace algorithm', () => {
    const chart = new EcommerceStoreRadarChart();
    const pts = chart.getPolygonPoints();
    const area = chart.calculateArea(pts);
    assert.ok(area > 0);
  });
});
