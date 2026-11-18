import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SmartIotNexusFormulaParser } from './formula-evaluator.js';

test('SmartIotNexusFormulaParser - enforces BODMAS/PEMDAS operator precedence', () => {
  const parser = new SmartIotNexusFormulaParser();

  // Multiplication before addition: 2 + (3 * 4) = 14
  assert.strictEqual(parser.evaluate('2 + 3 * 4'), 14);

  // Parentheses override: (2 + 3) * 4 = 20
  assert.strictEqual(parser.evaluate('(2 + 3) * 4'), 20);

  // Exponentiation before multiplication: (2 ^ 3) * 2 = 16
  assert.strictEqual(parser.evaluate('2 ^ 3 * 2'), 16);

  // Left-associative subtraction & addition: (10 - 4) + 2 = 8
  assert.strictEqual(parser.evaluate('10 - 4 + 2'), 8);

  // Combined mixed expression: (100 - (10 / 2)) * 2 = 190
  assert.strictEqual(parser.evaluate('(100 - (10 / 2)) * 2'), 190);
});

test('SmartIotNexusFormulaParser - enforces division-by-zero guards', () => {
  const parser = new SmartIotNexusFormulaParser();

  // Division by literal 0
  assert.throws(
    () => parser.evaluate('42 / 0'),
    /Division by zero is undefined/
  );

  // Division by zero expression: 42 / (5 - 5)
  assert.throws(
    () => parser.evaluate('42 / (5 - 5)'),
    /Division by zero is undefined/
  );

  // Modulo by zero guard
  assert.throws(
    () => parser.evaluate('10 % 0'),
    /Division by zero in modulo operation/
  );
});

test('SmartIotNexusFormulaParser - substitutes variable parameters dynamically', () => {
  const parser = new SmartIotNexusFormulaParser();

  const formula = '(voltage * current) - resistance_loss';
  const variables = {
    voltage: 24,
    current: 1.5,
    resistance_loss: 4
  };

  // (24 * 1.5) - 4 = 36 - 4 = 32
  const result = parser.evaluate(formula, variables);
  assert.strictEqual(result, 32);

  // Complex IoT KPI formula: efficiency = (active_nodes / total_nodes) * 100
  const kpiFormula = '(active_nodes / total_nodes) * 100';
  const kpiVars = { active_nodes: 48, total_nodes: 50 };
  assert.strictEqual(parser.evaluate(kpiFormula, kpiVars), 96);

  // Missing variable should throw clear error
  assert.throws(
    () => parser.evaluate('voltage + missing_var', { voltage: 5 }),
    /Variable "missing_var" is undefined/
  );
});

test('SmartIotNexusFormulaParser - validates syntax and flags malformed expressions', () => {
  const parser = new SmartIotNexusFormulaParser();

  // Unbalanced parentheses
  const unclosed = parser.validateSyntax('(2 + 3 * 4');
  assert.strictEqual(unclosed.valid, false);
  assert.match(unclosed.error, /Unclosed opening parenthesis/);

  // Mismatched closing parenthesis
  const mismatched = parser.validateSyntax('2 + 3) * 4');
  assert.strictEqual(mismatched.valid, false);
  assert.match(mismatched.error, /Mismatched closing parenthesis/);

  // Consecutive operators
  const consecutive = parser.validateSyntax('5 * / 2');
  assert.strictEqual(consecutive.valid, false);
  assert.match(consecutive.error, /Consecutive operators/);

  // Dangling operator at end
  const dangling = parser.validateSyntax('10 + 20 *');
  assert.strictEqual(dangling.valid, false);
  assert.match(dangling.error, /Expression cannot end with dangling operator/);

  // Valid expression
  assert.strictEqual(parser.validateSyntax('12.5 + 4 * (2 - 1)').valid, true);
});
