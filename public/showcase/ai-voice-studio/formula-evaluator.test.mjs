import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AiVoiceStudioFormulaParser } from './formula-evaluator.js';

describe('AiVoiceStudioFormulaParser', () => {
  it('instantiates correctly with proper name and operators', () => {
    const parser = new AiVoiceStudioFormulaParser();
    assert.equal(parser.name, 'AiVoiceStudioFormulaParser');
    assert.ok(parser.operators['+']);
    assert.ok(parser.operators['*']);
    assert.ok(parser.operators['^']);
  });

  it('validates operator precedence according to BODMAS / PEMDAS rules', () => {
    const parser = new AiVoiceStudioFormulaParser();

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
    const parser = new AiVoiceStudioFormulaParser();

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

  it('substitutes variable parameters dynamically in robotic KPI equations', () => {
    const parser = new AiVoiceStudioFormulaParser();
    const formula = '(actuator_torque * angular_velocity) / (1 - thermal_loss)';
    const variables = {
      actuator_torque: 45,
      angular_velocity: 12,
      thermal_loss: 0.1
    };

    // (45 * 12) / (1 - 0.1) = 540 / 0.9 = 600
    const result = parser.evaluate(formula, variables);
    assert.equal(result, 600);

    // Missing variable throws explicit error
    assert.throws(
      () => parser.evaluate('actuator_torque + uncalibrated_bias', { actuator_torque: 10 }),
      /Variable "uncalibrated_bias" is undefined/
    );
  });

  it('validates syntax errors including unclosed parentheses and dangling operators', () => {
    const parser = new AiVoiceStudioFormulaParser();

    assert.equal(parser.validateSyntax('').valid, false);
    assert.equal(parser.validateSyntax('(2 + 3').valid, false);
    assert.equal(parser.validateSyntax('2 + * 3').valid, false);
    assert.equal(parser.validateSyntax('2 +').valid, false);
    assert.equal(parser.validateSyntax('()').valid, false);
    assert.equal(parser.validateSyntax('(2 + 3) * 4').valid, true);
  });
});
