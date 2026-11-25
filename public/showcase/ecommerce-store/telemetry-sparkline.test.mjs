import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EcommerceStoreTelemetrySparkline } from './telemetry-sparkline.js';

describe('EcommerceStoreTelemetrySparkline', () => {
  it('normalizes data array to fit within width and height bounds', () => {
    const sp = new EcommerceStoreTelemetrySparkline({ width: 200, height: 100, padding: 10 });
    const pts = sp.normalize([10, 50, 100]);
    assert.equal(pts.length, 3);
    assert.equal(pts[0].y, 90);
    assert.equal(pts[2].y, 10);
  });

  it('generates valid SVG polyline coordinate string', () => {
    const sp = new EcommerceStoreTelemetrySparkline();
    const str = sp.generatePolyline([10, 20, 30]);
    assert.ok(str.includes(','));
    assert.equal(str.split(' ').length, 3);
  });

  it('renders SVG polyline markup safely', () => {
    const sp = new EcommerceStoreTelemetrySparkline();
    const svg = sp.renderSVG([5, 15, 25]);
    assert.ok(svg.startsWith('<svg'));
    assert.ok(svg.includes('polyline'));
  });
});
