import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { VrMetaverseHubFormulaParser } from './formula-evaluator.js';

describe('VrMetaverseHubFormulaParser', () => {
  it('instantiates correctly with proper name and operators', () => {
    const parser = new VrMetaverseHubFormulaParser();
    assert.equal(parser.name, 'VrMetaverseHubFormulaParser');
    assert.ok(parser.operators['+']);
    assert.ok(parser.operators['*']);
    assert.ok(parser.operators['^']);
  });

  it('validates operator precedence according to BODMAS / PEMDAS rules', () => {
    const parser = new VrMetaverseHubFormulaParser();

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
    const parser = new VrMetaverseHubFormulaParser();

    assert.throws(
      () => parser.evaluate('42 / 0'),
      /Division by zero is undefined/
    );

    assert.throws(
      () => parser.evaluate('42 / (10 - 10)'),
      /Division by zero is undefined/
    );

    assert.throws(
      () => parser.evaluate('25 % 0'),
      /Division by zero in modulo operation/
    );
  });

  it('substitutes variable parameters dynamically in streaming KPI equations', () => {
    const parser = new VrMetaverseHubFormulaParser();
    const formula = '(render_resolution * refresh_rate) + 10';
    const variables = {
      render_resolution: 5,
      refresh_rate: 4
    };

    const result = parser.evaluate(formula, variables);
    assert.equal(result, 30);

    assert.throws(
      () => parser.evaluate('render_resolution + unassigned_var', { render_resolution: 10 }),
      /Variable "unassigned_var" is undefined/
    );
  });

  it('validates syntax errors including unclosed parentheses and dangling operators', () => {
    const parser = new VrMetaverseHubFormulaParser();

    assert.equal(parser.validateSyntax('').valid, false);
    assert.equal(parser.validateSyntax('(2 + 3').valid, false);
    assert.equal(parser.validateSyntax('2 + * 3').valid, false);
    assert.equal(parser.validateSyntax('2 +').valid, false);
    assert.equal(parser.validateSyntax('()').valid, false);
    assert.equal(parser.validateSyntax('(2 + 3) * 4').valid, true);
  });
});
