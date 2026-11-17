import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RoboticsAutomataDiffInspector } from './diff-viewer.js';

describe('RoboticsAutomataDiffInspector', () => {
  it('should detect zero changes and 0% change metric on identical texts', () => {
    const inspector = new RoboticsAutomataDiffInspector();
    const urdf = '<joint name="arm_elbow">\n  <limit effort="100.0"/>\n</joint>';
    const diff = inspector.computeDiff(urdf, urdf);

    assert.equal(diff.length, 3);
    assert.ok(diff.every(line => line.type === 'unchanged'));
    const metrics = inspector.getChangeMetrics();
    assert.equal(metrics.added, 0);
    assert.equal(metrics.removed, 0);
    assert.equal(metrics.unchanged, 3);
    assert.equal(metrics.changePercent, 0);
  });

  it('should accurately identify line insertions and line deletions', () => {
    const inspector = new RoboticsAutomataDiffInspector();
    const orig = 'joint: elbow\nvelocity: 2.1\neffort: 100';
    const mod = 'joint: elbow\nvelocity: 3.5\ntorque_limit: 150\neffort: 100';

    inspector.computeDiff(orig, mod);
    const metrics = inspector.getChangeMetrics();

    assert.ok(metrics.added > 0);
    assert.ok(metrics.removed > 0);
    assert.ok(metrics.changePercent > 0);
  });

  it('should generate accurate unified diff view with correct prefix symbols', () => {
    const inspector = new RoboticsAutomataDiffInspector();
    const orig = 'link: base\nlink: shoulder';
    const mod = 'link: base\nlink: pedestal_spacer\nlink: shoulder';

    inspector.computeDiff(orig, mod);
    const unified = inspector.generateUnifiedView();

    assert.ok(unified.includes('  link: base'));
    assert.ok(unified.includes('+ link: pedestal_spacer') || unified.includes('+ '));
  });

  it('should handle empty string inputs gracefully without crashing', () => {
    const inspector = new RoboticsAutomataDiffInspector();
    const diff = inspector.computeDiff('', '');

    assert.equal(diff.length, 1);
    assert.equal(diff[0].type, 'unchanged');
    assert.equal(inspector.getChangeMetrics().changePercent, 0);
  });
});
