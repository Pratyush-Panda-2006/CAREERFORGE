import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MilestoneCounter } from './milestone-counter.js';

describe('MilestoneCounter', () => {
  it('initializes with default target value and duration', () => {
    const counter = new MilestoneCounter(25000);
    assert.equal(counter.targetValue, 25000);
  });

  it('calculates progress accurately with easing', () => {
    const counter = new MilestoneCounter(1000);
    assert.equal(counter.calculateValueAtProgress(0), 0);
    assert.equal(counter.calculateValueAtProgress(1), 1000);
    assert.ok(counter.calculateValueAtProgress(0.5) > 500); // ease-out is front-loaded
  });

  it('formats metric numbers with proper locale separators', () => {
    const counter = new MilestoneCounter(1500000);
    assert.equal(counter.formatNumber(), '1,500,000');
    assert.ok(counter.getMilestoneMessage().includes('1,500,000 trees'));
  });
});
