import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TravelImmunizationEngine } from './immunization-matrix.js';

describe('TravelImmunizationEngine', () => {
  const engine = new TravelImmunizationEngine();

  it('should load all destination profiles correctly', () => {
    const destinations = engine.getAllDestinations();
    assert.ok(destinations.length >= 5);
    const subSaharan = engine.getDestination('sub-saharan-africa');
    assert.ok(subSaharan);
    assert.equal(subSaharan.riskLevel, 'high');
    assert.ok(subSaharan.mandatoryVaccines.some(v => v.name.includes('Yellow Fever')));
  });

  it('should identify mandatory Yellow Fever requirements for Amazon Basin', () => {
    const amazon = engine.getDestination('amazon-basin');
    assert.ok(amazon);
    assert.ok(amazon.mandatoryVaccines.length > 0);
    assert.ok(amazon.malariaGuidance.risk.includes('High'));
  });

  it('should calculate urgent warning when departure lead time is shorter than minimum', () => {
    // Departure in 7 days (1 week), minimum for Sub-Saharan Africa is 6 weeks
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const assessment = engine.calculateLeadTimeAssessment('sub-saharan-africa', nextWeek);
    assert.equal(assessment.hasDate, true);
    assert.equal(assessment.status, 'critical_shortage');
    assert.ok(assessment.message.includes('URGENT'));
  });

  it('should calculate ample time when departure date allows sufficient preparation', () => {
    // Departure in 90 days (~12.8 weeks)
    const today = new Date();
    const futureDate = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const assessment = engine.calculateLeadTimeAssessment('himalayas', futureDate);
    assert.equal(assessment.hasDate, true);
    assert.equal(assessment.status, 'ample_time');
    assert.ok(assessment.message.includes('PLENTY OF TIME'));
  });

  it('should generate formatted expedition advisory text brief for clipboard export', () => {
    const brief = engine.generateAdvisoryBrief('sub-saharan-africa');
    assert.ok(brief.includes('EXPEDITION MEDICAL & IMMUNIZATION ADVISORY BRIEF'));
    assert.ok(brief.includes('The Nairobi Hospital'));
    assert.ok(brief.includes('Malarone'));
  });
});
