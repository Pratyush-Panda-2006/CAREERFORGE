import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { HealthVitalityFormulaParser } from './formula-evaluator.js';

describe('HealthVitalityFormulaParser', () => {
  it('instantiates correctly with proper name and operators', () => {
    const parser = new HealthVitalityFormulaParser();
    assert.equal(parser.name, 'HealthVitalityFormulaParser');
    assert.ok(parser.operators['+']);
    assert.ok(parser.operators['*']);
    assert.ok(parser.operators['^']);
  });

  it('validates operator precedence according to BODMAS / PEMDAS rules', () => {
    const parser = new HealthVitalityFormulaParser();

    // Multiplication before addition: 2 + (3 * 4) = 14
    assert.equal(parser.evaluate('2 + 3 * 4'), 14);

    // Parentheses override: (2 + 3) * 4 = 20
    assert.equal(parser.evaluate('(2 + 3) * 4'), 20);

    // Exponentiation before multiplication: (2 ^ 3) * 2 = 16
    assert.equal(parser.evaluate('2 ^ 3 * 2'), 16);

    // Left-associative subtraction & addition: (10 - 4) + 2 = 8
    assert.equal(parser.evaluate('10 - 4 + 2'), 8);

    // Mixed nested grouping: (100 - (10 / 2)) * 2 = 190
    assert.equal(parser.evaluate('(100 - (10 / 2)) * 2'), 190);
  });

  it('guards safely against division by zero in divide and modulo operations', () => {
    const parser = new HealthVitalityFormulaParser();

    // Literal division by zero
    assert.throws(
      () => parser.evaluate('42 / 0'),
      /Division by zero is undefined/
    );

    // Dynamic division by zero expression: 42 / (10 - 10)
    assert.throws(
      () => parser.evaluate('42 / (10 - 10)'),
      /Division by zero is undefined/
    );

    // Modulo by zero
    assert.throws(
      () => parser.evaluate('25 % 0'),
      /Division by zero in modulo operation/
    );
  });

  it('substitutes variable parameters dynamically in health vitality KPI equations', () => {
    const parser = new HealthVitalityFormulaParser();
    const formula = '(heart_rate * 0.5) + (target_vo2 * 2) - (metabolic_burn / 100)';
    const variables = {
      heart_rate: 80,
      target_vo2: 40,
      metabolic_burn: 500
    };

    // (80 * 0.5) + (40 * 2) - (500 / 100) = 40 + 80 - 5 = 115
    const result = parser.evaluate(formula, variables);
    assert.equal(result, 115);

    // Missing variable throws explicit error
    assert.throws(
      () => parser.evaluate('heart_rate + uncalibrated_bias', { heart_rate: 70 }),
      /Variable "uncalibrated_bias" is undefined/
    );
  });
});
