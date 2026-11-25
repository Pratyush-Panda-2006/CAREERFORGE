import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HealthVitalityGlucosePredictor } from './glucose-predictor.js';

describe('HealthVitalityGlucosePredictor', () => {
  it('calculates glycemic load accurately from carbs and GI', () => {
    const predictor = new HealthVitalityGlucosePredictor();
    const gl = predictor.calculateGlycemicLoad(30, 60);
    assert.equal(gl, 18.0);
  });

  it('predicts postprandial glucose spike based on baseline and load', () => {
    const predictor = new HealthVitalityGlucosePredictor();
    const res = predictor.predictSpike(90, 15);
    assert.equal(res.baseline, 90);
    assert.equal(res.spikeDelta, 24.8);
    assert.equal(res.peakGlucose, 114.8);
  });

  it('categorizes glycemic load tiers according to clinical standards', () => {
    const predictor = new HealthVitalityGlucosePredictor();
    assert.equal(predictor.categorizeGL(8).category, 'Low');
    assert.equal(predictor.categorizeGL(15).category, 'Medium');
    assert.equal(predictor.categorizeGL(25).category, 'High');
  });
});
