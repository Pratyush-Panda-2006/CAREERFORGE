import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  CulinaryBistroFormulaParser,
  DEFAULT_CULINARY_VARIABLES,
  CULINARY_KPI_PRESETS
} from './formula-evaluator.js';

describe('CulinaryBistroFormulaParser Test Suite (Issue #1203)', () => {

  // 1. Initialization and configuration
  describe('1. Default initialization and configuration', () => {
    test('instantiates with default culinary variables and configuration', () => {
      const parser = new CulinaryBistroFormulaParser();
      assert.ok(parser instanceof CulinaryBistroFormulaParser);

      const vars = parser.getVariables();
      assert.equal(vars.food_cost, 12.50);
      assert.equal(vars.menu_price, 45.00);
      assert.equal(vars.labor_hours, 1.2);
      assert.equal(vars.hourly_wage, 18.00);
      assert.equal(vars.daily_covers, 180);
      assert.equal(vars.beverage_cost, 3.20);
      assert.equal(vars.beverage_price, 14.00);
      assert.equal(vars.overhead_daily, 650.00);

      assert.equal(parser.history.length, 0);
      assert.equal(parser.maxHistory, 100);
    });

    test('accepts custom initial options and variables', () => {
      const parser = new CulinaryBistroFormulaParser({
        variables: { food_cost: 15.00, custom_metric: 88 },
        maxHistory: 30
      });
      const vars = parser.getVariables();
      assert.equal(vars.food_cost, 15.00);
      assert.equal(vars.menu_price, 45.00);
      assert.equal(vars.custom_metric, 88);
      assert.equal(parser.maxHistory, 30);
    });

    test('exposes all core API methods', () => {
      const parser = new CulinaryBistroFormulaParser();
      assert.equal(typeof parser.tokenize, 'function');
      assert.equal(typeof parser.validateSyntax, 'function');
      assert.equal(typeof parser.toRPN, 'function');
      assert.equal(typeof parser.evaluate, 'function');
      assert.equal(typeof parser.on, 'function');
      assert.equal(typeof parser.off, 'function');
      assert.equal(typeof parser.emit, 'function');
      assert.equal(typeof parser.getHistory, 'function');
      assert.equal(typeof parser.clearHistory, 'function');
      assert.equal(typeof parser.getHistoryById, 'function');
      assert.equal(typeof parser.setVariable, 'function');
      assert.equal(typeof parser.setVariables, 'function');
      assert.equal(typeof parser.getVariables, 'function');
      assert.equal(typeof parser.resetVariables, 'function');
      assert.equal(typeof parser.addFunction, 'function');
      assert.equal(typeof parser.cleanPrecision, 'function');
      assert.equal(typeof parser.formatNumber, 'function');
    });

    test('exports standard culinary KPI presets', () => {
      assert.ok(Array.isArray(CULINARY_KPI_PRESETS));
      assert.equal(CULINARY_KPI_PRESETS.length, 6);
      const ids = CULINARY_KPI_PRESETS.map(p => p.id);
      assert.ok(ids.includes('food_cost_percentage'));
      assert.ok(ids.includes('prime_cost_ratio'));
      assert.ok(ids.includes('gross_contribution_margin'));
      assert.ok(ids.includes('daily_net_profit'));
      assert.ok(ids.includes('revpash'));
      assert.ok(ids.includes('beverage_margin_ratio'));
    });
  });

  // 2. Expression tokenization
  describe('2. Expression tokenization', () => {
    test('tokenizes integer and floating point numbers', () => {
      const parser = new CulinaryBistroFormulaParser();
      const tokens = parser.tokenize('12.50 + 45');
      assert.equal(tokens.length, 3);
      assert.equal(tokens[0].type, 'number');
      assert.equal(tokens[0].value, 12.50);
      assert.equal(tokens[1].type, 'operator');
      assert.equal(tokens[1].value, '+');
      assert.equal(tokens[2].type, 'number');
      assert.equal(tokens[2].value, 45);
    });

    test('tokenizes scientific notation numbers (e and E)', () => {
      const parser = new CulinaryBistroFormulaParser();
      const tokens = parser.tokenize('1.5e-3 * 2.4E5 + 1e4');
      assert.equal(tokens.length, 5);
      assert.equal(tokens[0].value, 0.0015);
      assert.equal(tokens[2].value, 240000);
      assert.equal(tokens[4].value, 10000);
    });

    test('tokenizes culinary variables and mathematical functions', () => {
      const parser = new CulinaryBistroFormulaParser();
      const tokens = parser.tokenize('sqrt(food_cost) + abs(menu_price)');
      assert.equal(tokens[0].type, 'function');
      assert.equal(tokens[0].value, 'sqrt');
      assert.equal(tokens[1].type, 'lparen');
      assert.equal(tokens[2].type, 'variable');
      assert.equal(tokens[2].value, 'food_cost');
      assert.equal(tokens[3].type, 'rparen');
      assert.equal(tokens[4].type, 'operator');
      assert.equal(tokens[5].type, 'function');
      assert.equal(tokens[5].value, 'abs');
      assert.equal(tokens[7].type, 'variable');
      assert.equal(tokens[7].value, 'menu_price');
    });

    test('tokenizes all supported operators (+, -, *, /, ^, %)', () => {
      const parser = new CulinaryBistroFormulaParser();
      const tokens = parser.tokenize('10 + 20 - 5 * 2 / 4 ^ 2 % 3');
      const opTokens = tokens.filter(t => t.type === 'operator');
      assert.deepEqual(opTokens.map(t => t.value), ['+', '-', '*', '/', '^', '%']);
    });

    test('tokenizes parentheses and commas', () => {
      const parser = new CulinaryBistroFormulaParser();
      const tokens = parser.tokenize('min(food_cost, beverage_cost)');
      assert.equal(tokens[0].type, 'function');
      assert.equal(tokens[1].type, 'lparen');
      assert.equal(tokens[2].type, 'variable');
      assert.equal(tokens[3].type, 'comma');
      assert.equal(tokens[4].type, 'variable');
      assert.equal(tokens[5].type, 'rparen');
    });

    test('throws descriptive error on invalid characters', () => {
      const parser = new CulinaryBistroFormulaParser();
      assert.throws(() => parser.tokenize('10 $ 5'), /Invalid character '\$' at index 3/);
      assert.throws(() => parser.tokenize('10 @ 5'), /Invalid character '@'/);
      assert.throws(() => parser.tokenize('5 & 3'), /Invalid character '&'/);
    });
  });

  // 3. Syntax validation
  describe('3. Syntax validation', () => {
    test('confirms valid expressions return valid: true', () => {
      const parser = new CulinaryBistroFormulaParser();
      assert.deepEqual(parser.validateSyntax('1 + 1'), { valid: true });
      assert.deepEqual(parser.validateSyntax('(food_cost / menu_price) * 100'), { valid: true });
      assert.deepEqual(parser.validateSyntax('min(food_cost, beverage_cost) + 10'), { valid: true });
      assert.deepEqual(parser.validateSyntax('-5 + 3'), { valid: true });
    });

    test('rejects empty or whitespace expressions', () => {
      const parser = new CulinaryBistroFormulaParser();
      assert.equal(parser.validateSyntax('').valid, false);
      assert.equal(parser.validateSyntax('   ').valid, false);
      assert.match(parser.validateSyntax('').error, /empty/i);
    });

    test('detects unbalanced or misplaced parentheses', () => {
      const parser = new CulinaryBistroFormulaParser();
      assert.equal(parser.validateSyntax('(food_cost + 10').valid, false);
      assert.match(parser.validateSyntax('(food_cost + 10').error, /Unclosed parenthesis/i);

      assert.equal(parser.validateSyntax('food_cost + 10)').valid, false);
      assert.match(parser.validateSyntax('food_cost + 10)').error, /Unmatched closing parenthesis/i);
    });

    test('rejects empty parentheses ()', () => {
      const parser = new CulinaryBistroFormulaParser();
      assert.equal(parser.validateSyntax('5 + ()').valid, false);
      assert.match(parser.validateSyntax('5 + ()').error, /Empty parentheses/i);
    });

    test('rejects consecutive binary operators', () => {
      const parser = new CulinaryBistroFormulaParser();
      assert.equal(parser.validateSyntax('5 + * 3').valid, false);
      assert.match(parser.validateSyntax('5 + * 3').error, /Consecutive binary operators/i);

      assert.equal(parser.validateSyntax('10 / / 2').valid, false);
      assert.match(parser.validateSyntax('10 / / 2').error, /Consecutive binary operators/i);
    });

    test('rejects invalid leading or trailing operators', () => {
      const parser = new CulinaryBistroFormulaParser();
      assert.equal(parser.validateSyntax('* 5').valid, false);
      assert.match(parser.validateSyntax('* 5').error, /cannot start with binary operator/i);

      assert.equal(parser.validateSyntax('5 +').valid, false);
      assert.match(parser.validateSyntax('5 +').error, /cannot end with operator/i);
    });

    test('rejects functions without parentheses', () => {
      const parser = new CulinaryBistroFormulaParser();
      assert.equal(parser.validateSyntax('sqrt + 5').valid, false);
      assert.match(parser.validateSyntax('sqrt + 5').error, /must be followed by '\('/i);
    });

    test('rejects missing operators between operands', () => {
      const parser = new CulinaryBistroFormulaParser();
      assert.equal(parser.validateSyntax('5 5').valid, false);
      assert.match(parser.validateSyntax('5 5').error, /Missing operator between operands/i);
    });

    test('rejects misplaced commas', () => {
      const parser = new CulinaryBistroFormulaParser();
      assert.equal(parser.validateSyntax(', 5').valid, false);
      assert.equal(parser.validateSyntax('5 ,').valid, false);
      assert.match(parser.validateSyntax(', 5').error, /cannot start with comma/i);
    });
  });

  // 4. Operator precedence (BODMAS/PEMDAS)
  describe('4. Operator precedence (BODMAS/PEMDAS)', () => {
    test('exponentiation ^ precedes multiplication and division', () => {
      const parser = new CulinaryBistroFormulaParser();
      // 2 * 3 ^ 2 = 2 * 9 = 18 (not (2*3)^2 = 36)
      assert.equal(parser.evaluate('2 * 3 ^ 2'), 18);
      // 32 / 2 ^ 3 = 32 / 8 = 4
      assert.equal(parser.evaluate('32 / 2 ^ 3'), 4);
    });

    test('multiplication and division precede addition and subtraction', () => {
      const parser = new CulinaryBistroFormulaParser();
      // 2 + 3 * 4 = 2 + 12 = 14 (not 20)
      assert.equal(parser.evaluate('2 + 3 * 4'), 14);
      // 20 - 10 / 2 = 20 - 5 = 15
      assert.equal(parser.evaluate('20 - 10 / 2'), 15);
    });

    test('exponentiation ^ is right-associative', () => {
      const parser = new CulinaryBistroFormulaParser();
      // 2 ^ 3 ^ 2 should be 2 ^ (3 ^ 2) = 2 ^ 9 = 512, NOT (2^3)^2 = 64
      assert.equal(parser.evaluate('2 ^ 3 ^ 2'), 512);
    });

    test('parentheses override default precedence', () => {
      const parser = new CulinaryBistroFormulaParser();
      assert.equal(parser.evaluate('(2 + 3) * 4'), 20);
      assert.equal(parser.evaluate('(2 * 3) ^ 2'), 36);
    });

    test('modulo % has same precedence as multiplication and division', () => {
      const parser = new CulinaryBistroFormulaParser();
      // 10 - 7 % 4 = 10 - 3 = 7
      assert.equal(parser.evaluate('10 - 7 % 4'), 7);
      // 5 * 7 % 4 = 35 % 4 = 3
      assert.equal(parser.evaluate('5 * 7 % 4'), 3);
    });
  });

  // 5. Built-in scientific and mathematical functions
  describe('5. Built-in mathematical functions', () => {
    test('evaluates sqrt, log, ln, exp, abs, round, floor, ceil', () => {
      const parser = new CulinaryBistroFormulaParser();

      assert.equal(parser.evaluate('sqrt(16)'), 4);
      assert.equal(parser.evaluate('sqrt(0)'), 0);
      assert.equal(parser.evaluate('log(100)'), 2); // base-10 log
      assert.equal(parser.evaluate('log(1000)'), 3);
      assert.equal(parser.evaluate('ln(e)'), 1);    // natural log
      assert.equal(parser.evaluate('exp(0)'), 1);
      assert.equal(parser.evaluate('abs(-42)'), 42);
      assert.equal(parser.evaluate('abs(42)'), 42);
      assert.equal(parser.evaluate('round(3.7)'), 4);
      assert.equal(parser.evaluate('round(3.2)'), 3);
      assert.equal(parser.evaluate('floor(3.9)'), 3);
      assert.equal(parser.evaluate('ceil(3.1)'), 4);
    });

    test('evaluates 2-argument functions min, max, and pow', () => {
      const parser = new CulinaryBistroFormulaParser();
      assert.equal(parser.evaluate('min(10, 20)'), 10);
      assert.equal(parser.evaluate('min(50, 5)'), 5);
      assert.equal(parser.evaluate('max(10, 20)'), 20);
      assert.equal(parser.evaluate('max(50, 5)'), 50);
      assert.equal(parser.evaluate('pow(2, 8)'), 256);
      assert.equal(parser.evaluate('pow(3, 3)'), 27);
    });

    test('evaluates nested function calls', () => {
      const parser = new CulinaryBistroFormulaParser();
      assert.equal(parser.evaluate('sqrt(abs(-16))'), 4);
      assert.equal(parser.evaluate('max(5, sqrt(100))'), 10);
      assert.equal(parser.evaluate('round(sqrt(20))'), 4);
      assert.equal(parser.evaluate('pow(min(4, 8), 2)'), 16);
    });

    test('guards against mathematical domain errors', () => {
      const parser = new CulinaryBistroFormulaParser();
      assert.throws(() => parser.evaluate('sqrt(-4)'), /Square root of negative number/);
      assert.throws(() => parser.evaluate('log(0)'), /Logarithm of non-positive number/);
      assert.throws(() => parser.evaluate('log(-10)'), /Logarithm of non-positive number/);
      assert.throws(() => parser.evaluate('ln(0)'), /Natural logarithm of non-positive number/);
      assert.throws(() => parser.evaluate('ln(-1)'), /Natural logarithm of non-positive number/);
    });

    test('allows registering custom mathematical functions', () => {
      const parser = new CulinaryBistroFormulaParser();
      parser.addFunction('double', (x) => x * 2, 1);
      assert.equal(parser.evaluate('double(21)'), 42);

      parser.addFunction('hypot', (a, b) => Math.sqrt(a * a + b * b), 2);
      assert.equal(parser.evaluate('hypot(3, 4)'), 5);
    });
  });

  // 6. Variable substitution with culinary variables
  describe('6. Variable substitution with culinary variables', () => {
    test('substitutes default culinary variables', () => {
      const parser = new CulinaryBistroFormulaParser();
      assert.equal(parser.evaluate('food_cost'), 12.50);
      assert.equal(parser.evaluate('menu_price'), 45.00);
      assert.equal(parser.evaluate('labor_hours'), 1.2);
      assert.equal(parser.evaluate('hourly_wage'), 18.00);
      assert.equal(parser.evaluate('daily_covers'), 180);
      assert.equal(parser.evaluate('beverage_cost'), 3.20);
      assert.equal(parser.evaluate('beverage_price'), 14.00);
      assert.equal(parser.evaluate('overhead_daily'), 650.00);
    });

    test('allows ad-hoc variable overrides in evaluate()', () => {
      const parser = new CulinaryBistroFormulaParser();
      const res = parser.evaluate('food_cost * 2', { food_cost: 20.00 });
      assert.equal(res, 40.00);
      // original parser variable remains unchanged
      assert.equal(parser.getVariables().food_cost, 12.50);
    });

    test('updates variables with setVariable and setVariables', () => {
      const parser = new CulinaryBistroFormulaParser();
      parser.setVariable('food_cost', 15.00);
      assert.equal(parser.getVariables().food_cost, 15.00);

      parser.setVariables({ hourly_wage: 20.00, daily_covers: 200 });
      assert.equal(parser.getVariables().hourly_wage, 20.00);
      assert.equal(parser.getVariables().daily_covers, 200);

      parser.resetVariables();
      assert.equal(parser.getVariables().food_cost, 12.50);
      assert.equal(parser.getVariables().hourly_wage, 18.00);
      assert.equal(parser.getVariables().daily_covers, 180);
    });

    test('throws descriptive error on undefined variables', () => {
      const parser = new CulinaryBistroFormulaParser();
      assert.throws(() => parser.evaluate('unknown_bistro_param + 10'), /Undefined variable 'unknown_bistro_param'/);
    });
  });

  // 7. Edge cases: division by zero, unary minus, whitespace, precision
  describe('7. Edge cases & guards', () => {
    test('safely guards against division by zero', () => {
      const parser = new CulinaryBistroFormulaParser();
      assert.throws(() => parser.evaluate('100 / 0'), /Division by zero/i);
      assert.throws(() => parser.evaluate('100 / (5 - 5)'), /Division by zero/i);
      assert.throws(() => parser.evaluate('menu_price / (food_cost - food_cost)'), /Division by zero/i);
    });

    test('safely guards against modulo by zero', () => {
      const parser = new CulinaryBistroFormulaParser();
      assert.throws(() => parser.evaluate('100 % 0'), /Modulo by zero/i);
    });

    test('evaluates negative numbers and unary minus operations', () => {
      const parser = new CulinaryBistroFormulaParser();
      assert.equal(parser.evaluate('-5 + 3'), -2);
      assert.equal(parser.evaluate('2 * -4'), -8);
      assert.equal(parser.evaluate('-(3 + 2)'), -5);
      assert.equal(parser.evaluate('-sqrt(16)'), -4);
      assert.equal(parser.evaluate('2 ^ -2'), 0.25);
    });

    test('handles unary plus operator', () => {
      const parser = new CulinaryBistroFormulaParser();
      assert.equal(parser.evaluate('+5 + 3'), 8);
      assert.equal(parser.evaluate('2 * +4'), 8);
    });

    test('handles arbitrary whitespace variations', () => {
      const parser = new CulinaryBistroFormulaParser();
      assert.equal(parser.evaluate('   10    +    20   '), 30);
      assert.equal(parser.evaluate('\t sqrt ( \n 25 \t ) \t'), 5);
      assert.equal(parser.evaluate('min (   4  ,  9  )'), 4);
    });

    test('cleans IEEE 754 precision artifacts', () => {
      const parser = new CulinaryBistroFormulaParser();
      assert.equal(parser.evaluate('0.1 + 0.2'), 0.3);
    });
  });

  // 8. Calculation history logging and audit trail
  describe('8. Calculation history logging and audit trail', () => {
    test('logs calculations to audit trail history with unique IDs and timestamps', () => {
      const parser = new CulinaryBistroFormulaParser();
      assert.equal(parser.getHistory().length, 0);

      const res1 = parser.evaluate('10 + 20');
      assert.equal(res1, 30);
      const history1 = parser.getHistory();
      assert.equal(history1.length, 1);
      assert.ok(history1[0].id.startsWith('calc-'));
      assert.equal(history1[0].expression, '10 + 20');
      assert.equal(history1[0].result, 30);
      assert.ok(history1[0].timestamp);
      assert.ok(typeof history1[0].durationMs === 'number');

      parser.evaluate('sqrt(100)');
      const history2 = parser.getHistory();
      assert.equal(history2.length, 2);
      assert.equal(history2[0].expression, 'sqrt(100)');
      assert.equal(history2[0].result, 10);
    });

    test('finds record by calculation ID and clears history', () => {
      const parser = new CulinaryBistroFormulaParser();
      parser.evaluate('5 * 5');
      const entry = parser.getHistory()[0];
      assert.ok(entry);

      const found = parser.getHistoryById(entry.id);
      assert.deepEqual(found, entry);

      parser.clearHistory();
      assert.equal(parser.getHistory().length, 0);
      assert.equal(parser.getHistoryById(entry.id), null);
    });

    test('respects maxHistory bounds', () => {
      const parser = new CulinaryBistroFormulaParser({ maxHistory: 3 });
      parser.evaluate('1 + 1');
      parser.evaluate('2 + 2');
      parser.evaluate('3 + 3');
      parser.evaluate('4 + 4');

      const history = parser.getHistory();
      assert.equal(history.length, 3);
      assert.equal(history[0].expression, '4 + 4');
    });
  });

  // 9. Event emission
  describe('9. Event emission', () => {
    test('emits evaluate and historyChange events on calculation', () => {
      const parser = new CulinaryBistroFormulaParser();
      const evalEvents = [];
      const historyEvents = [];

      parser.on('evaluate', (data) => evalEvents.push(data));
      parser.on('historyChange', (data) => historyEvents.push(data));

      parser.evaluate('10 + 5');
      assert.equal(evalEvents.length, 1);
      assert.equal(evalEvents[0].result, 15);
      assert.equal(historyEvents.length, 1);
      assert.equal(historyEvents[0].length, 1);

      parser.clearHistory();
      assert.equal(historyEvents.length, 2);
      assert.equal(historyEvents[1].length, 0);
    });

    test('emits error event on evaluation failure', () => {
      const parser = new CulinaryBistroFormulaParser();
      const errors = [];

      parser.on('error', (err) => errors.push(err));

      assert.throws(() => parser.evaluate('10 / 0'), /Division by zero/i);
      assert.equal(errors.length, 1);
      assert.match(errors[0].message, /Division by zero/i);
    });

    test('unsubscribes listeners with off and unsubscribe handle', () => {
      const parser = new CulinaryBistroFormulaParser();
      let callCount = 0;

      const unsub = parser.on('evaluate', () => {
        callCount++;
      });

      parser.evaluate('1 + 1');
      assert.equal(callCount, 1);

      unsub();
      parser.evaluate('2 + 2');
      assert.equal(callCount, 1); // No increment after unsubscribe
    });
  });

  // 10. Evaluation of all 6 Culinary Bistro KPI Presets
  describe('10. Verification of all 6 Culinary KPI Presets', () => {
    test('Preset 1: Food Cost Percentage (%) = (food_cost / menu_price) * 100', () => {
      const parser = new CulinaryBistroFormulaParser();
      const preset = CULINARY_KPI_PRESETS.find(p => p.id === 'food_cost_percentage');
      assert.ok(preset);
      assert.equal(preset.formula, '(food_cost / menu_price) * 100');

      const result = parser.evaluate(preset.formula);
      // (12.50 / 45.00) * 100 = 27.77777777777778
      assert.ok(Math.abs(result - 27.77777777777778) < 1e-6);
    });

    test('Preset 2: Prime Cost Ratio (%) = ((food_cost + (labor_hours * hourly_wage)) / menu_price) * 100', () => {
      const parser = new CulinaryBistroFormulaParser();
      const preset = CULINARY_KPI_PRESETS.find(p => p.id === 'prime_cost_ratio');
      assert.ok(preset);
      assert.equal(preset.formula, '((food_cost + (labor_hours * hourly_wage)) / menu_price) * 100');

      const result = parser.evaluate(preset.formula);
      // labor = 1.2 * 18 = 21.6; food + labor = 12.5 + 21.6 = 34.1; (34.1 / 45) * 100 = 75.77777777777777
      assert.ok(Math.abs(result - 75.77777777777777) < 1e-6);
    });

    test('Preset 3: Gross Contribution Margin = menu_price - food_cost', () => {
      const parser = new CulinaryBistroFormulaParser();
      const preset = CULINARY_KPI_PRESETS.find(p => p.id === 'gross_contribution_margin');
      assert.ok(preset);
      assert.equal(preset.formula, 'menu_price - food_cost');

      const result = parser.evaluate(preset.formula);
      // 45.00 - 12.50 = 32.50
      assert.equal(result, 32.50);
    });

    test('Preset 4: Daily Net Profit = (daily_covers * (menu_price - food_cost + beverage_price - beverage_cost)) - overhead_daily', () => {
      const parser = new CulinaryBistroFormulaParser();
      const preset = CULINARY_KPI_PRESETS.find(p => p.id === 'daily_net_profit');
      assert.ok(preset);
      assert.equal(preset.formula, '(daily_covers * (menu_price - food_cost + beverage_price - beverage_cost)) - overhead_daily');

      const result = parser.evaluate(preset.formula);
      // food margin = 45 - 12.5 = 32.5
      // bev margin = 14 - 3.2 = 10.8
      // total margin per cover = 32.5 + 10.8 = 43.3
      // 180 * 43.3 = 7794.00
      // 7794 - 650 = 7144.00
      assert.equal(result, 7144.00);
    });

    test('Preset 5: RevPASH = (daily_covers * menu_price) / (12 * 45)', () => {
      const parser = new CulinaryBistroFormulaParser();
      const preset = CULINARY_KPI_PRESETS.find(p => p.id === 'revpash');
      assert.ok(preset);
      assert.equal(preset.formula, '(daily_covers * menu_price) / (12 * 45)');

      const result = parser.evaluate(preset.formula);
      // (180 * 45) / 540 = 8100 / 540 = 15.00
      assert.equal(result, 15.00);
    });

    test('Preset 6: Beverage Margin Ratio (%) = ((beverage_price - beverage_cost) / beverage_price) * 100', () => {
      const parser = new CulinaryBistroFormulaParser();
      const preset = CULINARY_KPI_PRESETS.find(p => p.id === 'beverage_margin_ratio');
      assert.ok(preset);
      assert.equal(preset.formula, '((beverage_price - beverage_cost) / beverage_price) * 100');

      const result = parser.evaluate(preset.formula);
      // (14.00 - 3.20) / 14.00 * 100 = 10.8 / 14 * 100 = 77.14285714285714
      assert.ok(Math.abs(result - 77.14285714285714) < 1e-6);
    });
  });
});
