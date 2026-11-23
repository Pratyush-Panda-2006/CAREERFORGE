import test from 'node:test';
import assert from 'node:assert/strict';
import { CryptoExchangeProFormulaParser } from './formula-evaluator.js';

test('CryptoExchangeProFormulaParser - default initialization and configuration', () => {
  const parser = new CryptoExchangeProFormulaParser();

  assert.equal(parser.defaultVariables.order_size, 1.5);
  assert.equal(parser.defaultVariables.bid_price, 64250.00);
  assert.equal(parser.defaultVariables.ask_price, 64255.50);
  assert.equal(parser.defaultVariables.slippage_rate, 0.0015);
  assert.equal(parser.defaultVariables.leverage_ratio, 10);
  assert.equal(parser.defaultVariables.liquidation_threshold, 0.85);
  assert.equal(parser.defaultVariables.maker_fee, 0.0002);

  assert.equal(parser.getHistory().length, 0);
  assert.ok(parser.supportedFunctions.has('sqrt'));
  assert.ok(parser.supportedFunctions.has('log'));
  assert.ok(parser.supportedFunctions.has('ln'));
  assert.ok(parser.supportedFunctions.has('min'));
  assert.ok(parser.supportedFunctions.has('max'));
  assert.ok(parser.supportedFunctions.has('round'));
});

test('CryptoExchangeProFormulaParser - expression tokenization (numbers, identifiers, operators, parens)', () => {
  const parser = new CryptoExchangeProFormulaParser();

  // Test integers, decimals, scientific notation
  const tokens1 = parser.tokenize('42 3.1415 1.5e-3 2e4 .75');
  assert.equal(tokens1.length, 5);
  assert.equal(tokens1[0].value, 42);
  assert.equal(tokens1[1].value, 3.1415);
  assert.equal(tokens1[2].value, 0.0015);
  assert.equal(tokens1[3].value, 20000);
  assert.equal(tokens1[4].value, 0.75);

  // Test identifiers, operators, parentheses
  const tokens2 = parser.tokenize('(order_size * bid_price) / leverage_ratio');
  assert.equal(tokens2[0].type, 'LPAREN');
  assert.equal(tokens2[1].type, 'VARIABLE');
  assert.equal(tokens2[1].value, 'order_size');
  assert.equal(tokens2[2].type, 'OPERATOR');
  assert.equal(tokens2[2].value, '*');
  assert.equal(tokens2[3].type, 'VARIABLE');
  assert.equal(tokens2[3].value, 'bid_price');
  assert.equal(tokens2[4].type, 'RPAREN');
  assert.equal(tokens2[5].type, 'OPERATOR');
  assert.equal(tokens2[5].value, '/');
  assert.equal(tokens2[6].type, 'VARIABLE');
  assert.equal(tokens2[6].value, 'leverage_ratio');

  // Test functions and commas
  const tokens3 = parser.tokenize('min(order_size, 2.5)');
  assert.equal(tokens3[0].type, 'FUNCTION');
  assert.equal(tokens3[0].value, 'min');
  assert.equal(tokens3[1].type, 'LPAREN');
  assert.equal(tokens3[2].type, 'VARIABLE');
  assert.equal(tokens3[3].type, 'COMMA');
  assert.equal(tokens3[4].type, 'NUMBER');
  assert.equal(tokens3[5].type, 'RPAREN');

  // Test unary minus detection
  const tokens4 = parser.tokenize('-5 + (-order_size * 2)');
  assert.equal(tokens4[0].type, 'OPERATOR');
  assert.equal(tokens4[0].value, 'u-');
  assert.equal(tokens4[0].unary, true);
  assert.equal(tokens4[3].type, 'LPAREN');
  assert.equal(tokens4[4].type, 'OPERATOR');
  assert.equal(tokens4[4].value, 'u-');
  assert.equal(tokens4[4].unary, true);
});

test('CryptoExchangeProFormulaParser - syntax validation rules', () => {
  const parser = new CryptoExchangeProFormulaParser();

  // Valid expressions
  assert.equal(parser.validateSyntax('(order_size * bid_price) / leverage_ratio').valid, true);
  assert.equal(parser.validateSyntax('sqrt(16) + abs(-4)').valid, true);
  assert.equal(parser.validateSyntax('min(10, 20)').valid, true);
  assert.equal(parser.validateSyntax('-order_size * -2').valid, true);

  // Empty expressions
  assert.equal(parser.validateSyntax('').valid, false);
  assert.equal(parser.validateSyntax('   ').valid, false);

  // Unbalanced parentheses
  assert.equal(parser.validateSyntax('(5 + 3').valid, false);
  assert.equal(parser.validateSyntax('5 + 3)').valid, false);
  assert.equal(parser.validateSyntax('((5 + 3) * 2').valid, false);

  // Empty parentheses
  assert.equal(parser.validateSyntax('5 + ()').valid, false);
  assert.equal(parser.validateSyntax('sqrt()').valid, false);

  // Consecutive binary operators
  assert.equal(parser.validateSyntax('5 ++ 3').valid, false);
  assert.equal(parser.validateSyntax('5 */ 2').valid, false);
  assert.equal(parser.validateSyntax('5 ^^ 2').valid, false);

  // Invalid characters
  assert.equal(parser.validateSyntax('5 $ 3').valid, false);
  assert.equal(parser.validateSyntax('order @ price').valid, false);

  // Leading / trailing invalid operators
  assert.equal(parser.validateSyntax('* 5 + 3').valid, false);
  assert.equal(parser.validateSyntax('5 + 3 /').valid, false);
  assert.equal(parser.validateSyntax(', 5 + 3').valid, false);

  // Function without parentheses
  assert.equal(parser.validateSyntax('sqrt + 5').valid, false);
});

test('CryptoExchangeProFormulaParser - operator precedence (BODMAS/PEMDAS)', () => {
  const parser = new CryptoExchangeProFormulaParser();

  // Multiplication precedes addition: 2 + 3 * 4 = 14
  assert.equal(parser.evaluate('2 + 3 * 4'), 14);

  // Parentheses override precedence: (2 + 3) * 4 = 20
  assert.equal(parser.evaluate('(2 + 3) * 4'), 20);

  // Power precedes multiplication: 2 ^ 3 * 4 = 8 * 4 = 32
  assert.equal(parser.evaluate('2 ^ 3 * 4'), 32);

  // Power precedes multiplication: 2 * 3 ^ 2 = 2 * 9 = 18
  assert.equal(parser.evaluate('2 * 3 ^ 2'), 18);

  // Left-associative subtraction and addition: 10 - 4 + 2 = (10 - 4) + 2 = 8
  assert.equal(parser.evaluate('10 - 4 + 2'), 8);

  // Left-associative division: 24 / 4 / 2 = (24 / 4) / 2 = 3
  assert.equal(parser.evaluate('24 / 4 / 2'), 3);

  // Right-associative exponentiation: 2 ^ 3 ^ 2 = 2 ^ (3 ^ 2) = 2 ^ 9 = 512
  assert.equal(parser.evaluate('2 ^ 3 ^ 2'), 512);

  // Modulo operator: 17 % 5 = 2, and 10 + 17 % 5 * 3 = 10 + 2 * 3 = 16
  assert.equal(parser.evaluate('17 % 5'), 2);
  assert.equal(parser.evaluate('10 + 17 % 5 * 3'), 16);
});

test('CryptoExchangeProFormulaParser - built-in scientific functions', () => {
  const parser = new CryptoExchangeProFormulaParser();

  // sqrt
  assert.equal(parser.evaluate('sqrt(16)'), 4);
  assert.equal(parser.evaluate('sqrt(100)'), 10);

  // log (base 10)
  assert.equal(parser.evaluate('log(1000)'), 3);

  // ln and exp
  assert.equal(parser.evaluate('exp(0)'), 1);
  assert.equal(Math.round(parser.evaluate('ln(exp(2))')), 2);

  // abs
  assert.equal(parser.evaluate('abs(-42.5)'), 42.5);
  assert.equal(parser.evaluate('abs(15)'), 15);

  // round (single and two arguments)
  assert.equal(parser.evaluate('round(3.7)'), 4);
  assert.equal(parser.evaluate('round(3.14159, 2)'), 3.14);
  assert.equal(parser.evaluate('round(3.14159, 4)'), 3.1416);

  // floor & ceil
  assert.equal(parser.evaluate('floor(4.9)'), 4);
  assert.equal(parser.evaluate('ceil(4.1)'), 5);

  // min and max
  assert.equal(parser.evaluate('min(10, 20)'), 10);
  assert.equal(parser.evaluate('max(10, 20)'), 20);

  // Nested functions
  assert.equal(parser.evaluate('sqrt(abs(-64))'), 8);
  assert.equal(parser.evaluate('max(sqrt(25), min(10, 2))'), 5);
});

test('CryptoExchangeProFormulaParser - variable substitution with crypto trading parameters', () => {
  const parser = new CryptoExchangeProFormulaParser();

  // Default parameters: order_size: 1.5, bid_price: 64250, leverage_ratio: 10
  // Position Notional: 1.5 * 64250 = 96375
  assert.equal(parser.evaluate('order_size * bid_price'), 96375);

  // Initial Margin: (1.5 * 64250) / 10 = 9637.5
  assert.equal(parser.evaluate('(order_size * bid_price) / leverage_ratio'), 9637.5);

  // Slippage Impact: 1.5 * 64250 * 0.0015 = 144.5625
  assert.equal(parser.evaluate('order_size * bid_price * slippage_rate'), 144.5625);

  // Custom variable injection
  const customVars = { order_size: 2.0, bid_price: 50000, leverage_ratio: 20 };
  assert.equal(parser.evaluate('(order_size * bid_price) / leverage_ratio', customVars), 5000);

  // Custom ad-hoc variables
  assert.equal(parser.evaluate('alpha + beta * 2', { alpha: 10, beta: 5 }), 20);

  // Undefined variable throws descriptive error
  assert.throws(() => {
    parser.evaluate('order_size * unknown_var');
  }, /Undefined variable: "unknown_var"/);
});

test('CryptoExchangeProFormulaParser - edge cases (division by zero, negative numbers, whitespace)', () => {
  const parser = new CryptoExchangeProFormulaParser();

  // Division by zero throws
  assert.throws(() => {
    parser.evaluate('100 / 0');
  }, /Division by zero/);

  assert.throws(() => {
    parser.evaluate('order_size / (leverage_ratio - 10)');
  }, /Division by zero/);

  // Modulo by zero throws
  assert.throws(() => {
    parser.evaluate('100 % 0');
  }, /Division by zero in modulo operation/);

  // Square root of negative number throws
  assert.throws(() => {
    parser.evaluate('sqrt(-16)');
  }, /Square root of negative number/);

  // Log of zero or negative throws
  assert.throws(() => {
    parser.evaluate('log(0)');
  }, /Logarithm of non-positive number/);

  assert.throws(() => {
    parser.evaluate('ln(-5)');
  }, /Natural logarithm of non-positive number/);

  // Negative numbers and unary expressions
  assert.equal(parser.evaluate('-5 + 10'), 5);
  assert.equal(parser.evaluate('3 * -2'), -6);
  assert.equal(parser.evaluate('(-2) ^ 3'), -8);
  assert.equal(parser.evaluate('-(-5)'), 5);

  // Whitespace variations
  assert.equal(parser.evaluate('  (  order_size    *  bid_price )   /   leverage_ratio  '), 9637.5);

  // Scientific notation evaluation
  assert.equal(parser.evaluate('1e4 / 2e2'), 50);
});

test('CryptoExchangeProFormulaParser - calculation history logging and event emission', () => {
  const parser = new CryptoExchangeProFormulaParser();

  let evaluatedEventFired = false;
  let historyChangedCount = 0;
  let latestRecord = null;

  const unsubEvaluate = parser.on('evaluate', record => {
    evaluatedEventFired = true;
    latestRecord = record;
  });

  parser.on('historyChange', () => {
    historyChangedCount++;
  });

  // Perform calculation
  const res = parser.evaluate('(order_size * bid_price) / leverage_ratio');
  assert.equal(res, 9637.5);

  assert.equal(evaluatedEventFired, true);
  assert.equal(historyChangedCount, 1);
  assert.ok(latestRecord.id.startsWith('CALC-'));
  assert.equal(latestRecord.result, 9637.5);
  assert.ok(typeof latestRecord.timestamp === 'string');
  assert.ok(typeof latestRecord.executionTimeMs === 'number');

  // Verify history list
  const history = parser.getHistory();
  assert.equal(history.length, 1);
  assert.equal(history[0].id, latestRecord.id);

  // Unsubscribe listener
  unsubEvaluate();
  parser.evaluate('10 + 20');
  // Evaluate handler should not update latestRecord to new calculation
  assert.notEqual(latestRecord.result, 30);

  // Clear history
  parser.clearHistory();
  assert.equal(parser.getHistory().length, 0);
  assert.equal(historyChangedCount, 3); // initial eval + 2nd eval + clear
});

test('CryptoExchangeProFormulaParser - error event emission on evaluation failure', () => {
  const parser = new CryptoExchangeProFormulaParser();

  let errorEventFired = false;
  let errorPayload = null;

  parser.on('error', payload => {
    errorEventFired = true;
    errorPayload = payload;
  });

  assert.throws(() => {
    parser.evaluate('50 / 0');
  });

  assert.equal(errorEventFired, true);
  assert.ok(errorPayload.error.includes('Division by zero'));
});

test('CryptoExchangeProFormulaParser - Shunting-yard RPN compiler output structure', () => {
  const parser = new CryptoExchangeProFormulaParser();

  // (a + b) * c => a b + c *
  const rpn1 = parser.toRPN('(order_size + 2) * bid_price');
  const values1 = rpn1.map(t => t.value);
  assert.deepEqual(values1, ['order_size', 2, '+', 'bid_price', '*']);

  // a + b * c => a b c * +
  const rpn2 = parser.toRPN('order_size + 2 * bid_price');
  const values2 = rpn2.map(t => t.value);
  assert.deepEqual(values2, ['order_size', 2, 'bid_price', '*', '+']);

  // max(a, b) => a b max
  const rpn3 = parser.toRPN('max(order_size, 5)');
  assert.equal(rpn3[rpn3.length - 1].value, 'max');
  assert.equal(rpn3[rpn3.length - 1].argsCount, 2);
});

test('CryptoExchangeProFormulaParser - evaluates standard KPI_PRESETS successfully', () => {
  const parser = new CryptoExchangeProFormulaParser();
  const presets = CryptoExchangeProFormulaParser.KPI_PRESETS;

  for (const [key, preset] of Object.entries(presets)) {
    const val = parser.evaluate(preset.formula);
    assert.ok(typeof val === 'number', `Preset ${key} returned number`);
    assert.ok(!isNaN(val), `Preset ${key} is not NaN`);
    assert.ok(Number.isFinite(val), `Preset ${key} is finite`);
  }
});

test('CryptoExchangeProFormulaParser - maxHistorySize capping and formatResult utility', () => {
  const parser = new CryptoExchangeProFormulaParser({ maxHistorySize: 3 });

  parser.evaluate('1 + 1');
  parser.evaluate('2 + 2');
  parser.evaluate('3 + 3');
  assert.equal(parser.getHistory().length, 3);

  parser.evaluate('4 + 4');
  assert.equal(parser.getHistory().length, 3);
  assert.equal(parser.getHistory()[0].result, 8);

  // formatResult formatting checks
  assert.equal(parser.formatResult(1234.56, 2), '1,234.56');
  assert.equal(parser.formatResult(1234.56789, 4), '1,234.5679');
  assert.equal(parser.formatResult(NaN), 'NaN');
});

