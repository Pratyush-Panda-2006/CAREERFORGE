import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AgencyStudioTiltEngine } from './tilt-engine.js';

describe('AgencyStudioTiltEngine', () => {
  it('computes zero tilt at exact center of card rectangle', () => {
    const engine = new AgencyStudioTiltEngine();
    const tilt = engine.computeTilt(150, 100, { left: 0, top: 0, width: 300, height: 200 });
    assert.equal(tilt.rotateX, 0);
    assert.equal(tilt.rotateY, 0);
  });

  it('computes maximum tilt at edges', () => {
    const engine = new AgencyStudioTiltEngine({ maxTilt: 15 });
    const tilt = engine.computeTilt(300, 200, { left: 0, top: 0, width: 300, height: 200 });
    assert.equal(tilt.rotateX, -15);
    assert.equal(tilt.rotateY, 15);
  });

  it('smoothly applies inertia easing step', () => {
    const engine = new AgencyStudioTiltEngine();
    const next = engine.applyInertia(0, 10, 0.2);
    assert.equal(next, 2.0);
  });
});
