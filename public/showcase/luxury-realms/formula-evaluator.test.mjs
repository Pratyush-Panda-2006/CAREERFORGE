import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  LuxuryRealmsFormulaParser,
  DEFAULT_LUXURY_ESTATE_VARIABLES,
  LUXURY_KPI_PRESETS
} from './formula-evaluator.js';

describe('LuxuryRealmsFormulaParser Test Suite', () => {

  // 1. Initialization and Configuration
  describe('1. Default Initialization & Configuration', () => {
    test('instantiates with exact luxury estate default variables', () => {
      const parser = new LuxuryRealmsFormulaParser();

      assert.equal(parser.defaultVariables.estate_listing_price, 8500000.00);
      assert.equal(parser.defaultVariables.concierge_service_annual, 45000.00);
      assert.equal(parser.defaultVariables.private_security_annual, 60000.00);
      assert.equal(parser.defaultVariables.estate_tax_rate, 0.018);
      assert.equal(parser.defaultVariables.seasonal_charter_yield, 420000.00);
      assert.equal(parser.defaultVariables.annual_maintenance_reserve, 85000.00);
      assert.equal(parser.defaultVariables.luxury_amenity_score, 9.4);

      assert.equal(parser.getHistory().length, 0);
      assert.equal(parser.maxHistorySize, 100);
    });

    test('supportedFunctions registry includes all required functions', () => {
      const parser = new LuxuryRealmsFormulaParser();
      const expected = ['sqrt', 'log', 'ln', 'exp', 'abs', 'min', 'max', 'round', 'floor', 'ceil', 'pow'];
      for (const fn of expected) {
        assert.ok(parser.supportedFunctions.has(fn), `Missing supported function: ${fn}`);
      }
    });

    test('accepts custom variables and maxHistory options', () => {
      const parser = new LuxuryRealmsFormulaParser({
        variables: { estate_listing_price: 12000000, custom_var: 123 },
        maxHistorySize: 20
      });

      assert.equal(parser.defaultVariables.estate_listing_price, 12000000);
      assert.equal(parser.defaultVariables.custom_var, 123);
      assert.equal(parser.defaultVariables.concierge_service_annual, 45000.00);
      assert.equal(parser.maxHistorySize, 20);
    });

    test('getVariables, setVariable, and resetVariables operate correctly', () => {
      const parser = new LuxuryRealmsFormulaParser();
      assert.equal(parser.getVariables().estate_listing_price, 8500000.00);

      parser.setVariable('estate_listing_price', 15000000);
      assert.equal(parser.getVariables().estate_listing_price, 15000000);

      parser.resetVariables();
      assert.equal(parser.getVariables().estate_listing_price, 8500000.00);
    });
  });

  // 2. Tokenization
  describe('2. Lexical Tokenization', () => {
    test('tokenizes numbers: integers, decimals, scientific notation', () => {
      const parser = new LuxuryRealmsFormulaParser();
      const tokens = parser.tokenize('8500000 0.018 1.5e-3 2e4 .75');

      assert.equal(tokens.length, 5);
      assert.equal(tokens[0].value, 8500000);
      assert.equal(tokens[1].value, 0.018);
      assert.equal(tokens[2].value, 0.0015);
      assert.equal(tokens[3].value, 20000);
      assert.equal(tokens[4].value, 0.75);
    });

    test('tokenizes variables, functions, operators, and parens', () => {
      const parser = new LuxuryRealmsFormulaParser();
      const tokens = parser.tokenize('sqrt(estate_listing_price) + pow(2, 3)');

      assert.equal(tokens[0].type, 'FUNCTION');
      assert.equal(tokens[0].value, 'sqrt');
      assert.equal(tokens[1].type, 'LPAREN');
      assert.equal(tokens[2].type, 'VARIABLE');
      assert.equal(tokens[2].value, 'estate_listing_price');
      assert.equal(tokens[3].type, 'RPAREN');
      assert.equal(tokens[4].type, 'OPERATOR');
      assert.equal(tokens[4].value, '+');
      assert.equal(tokens[5].type, 'FUNCTION');
      assert.equal(tokens[5].value, 'pow');
      assert.equal(tokens[6].type, 'LPAREN');
      assert.equal(tokens[7].type, 'NUMBER');
      assert.equal(tokens[7].value, 2);
      assert.equal(tokens[8].type, 'COMMA');
      assert.equal(tokens[9].type, 'NUMBER');
      assert.equal(tokens[9].value, 3);
      assert.equal(tokens[10].type, 'RPAREN');
    });

    test('detects unary plus and minus operators', () => {
      const parser = new LuxuryRealmsFormulaParser();
      const tokens1 = parser.tokenize('-estate_listing_price + +500');
      assert.equal(tokens1[0].type, 'OPERATOR');
      assert.equal(tokens1[0].value, 'u-');
      assert.equal(tokens1[0].unary, true);
      assert.equal(tokens1[2].type, 'OPERATOR');
      assert.equal(tokens1[2].value, '+');
      assert.equal(tokens1[2].unary, false);
      assert.equal(tokens1[3].type, 'OPERATOR');
      assert.equal(tokens1[3].value, 'u+');
      assert.equal(tokens1[3].unary, true);

      const tokens2 = parser.tokenize('10 * -5');
      assert.equal(tokens2[2].value, 'u-');
      assert.equal(tokens2[2].unary, true);

      const tokens3 = parser.tokenize('max(-10, -20)');
      assert.equal(tokens3[2].value, 'u-');
      assert.equal(tokens3[5].value, 'u-');
    });

    test('throws on unexpected illegal characters', () => {
      const parser = new LuxuryRealmsFormulaParser();
      assert.throws(() => parser.tokenize('estate_listing_price $ 5'), /Unexpected character/);
      assert.throws(() => parser.tokenize('5 @ 10'), /Unexpected character/);
    });
  });

  // 3. Syntax Validation
  describe('3. Syntax Validation (validateSyntax)', () => {
    test('returns valid for well-formed expressions', () => {
      const parser = new LuxuryRealmsFormulaParser();
      assert.equal(parser.validateSyntax('10 + 20 * 3').valid, true);
      assert.equal(parser.validateSyntax('(estate_listing_price * estate_tax_rate) + concierge_service_annual').valid, true);
      assert.equal(parser.validateSyntax('round(luxury_amenity_score * 10)').valid, true);
    });

    test('rejects empty or whitespace expressions', () => {
      const parser = new LuxuryRealmsFormulaParser();
      assert.equal(parser.validateSyntax('').valid, false);
      assert.equal(parser.validateSyntax('   ').valid, false);
      assert.equal(parser.validateSyntax(null).valid, false);
    });

    test('rejects empty parentheses', () => {
      const parser = new LuxuryRealmsFormulaParser();
      assert.equal(parser.validateSyntax('()').valid, false);
      assert.equal(parser.validateSyntax('10 + (  )').valid, false);
    });

    test('rejects unbalanced parentheses', () => {
      const parser = new LuxuryRealmsFormulaParser();
      assert.equal(parser.validateSyntax('(10 + 20').valid, false);
      assert.equal(parser.validateSyntax('10 + 20)').valid, false);
      assert.equal(parser.validateSyntax('((10 + 20) * 3').valid, false);
    });

    test('rejects consecutive binary operators', () => {
      const parser = new LuxuryRealmsFormulaParser();
      assert.equal(parser.validateSyntax('10 * * 20').valid, false);
      assert.equal(parser.validateSyntax('10 / / 20').valid, false);
      assert.equal(parser.validateSyntax('10 + * 20').valid, false);
    });

    test('rejects leading/trailing binary operators', () => {
      const parser = new LuxuryRealmsFormulaParser();
      assert.equal(parser.validateSyntax('* 10 + 20').valid, false);
      assert.equal(parser.validateSyntax('/ 5').valid, false);
      assert.equal(parser.validateSyntax('10 + 20 *').valid, false);
      assert.equal(parser.validateSyntax('10 + 20 -').valid, false);
    });

    test('rejects function without following parentheses', () => {
      const parser = new LuxuryRealmsFormulaParser();
      assert.equal(parser.validateSyntax('sqrt 16').valid, false);
      assert.equal(parser.validateSyntax('round 10 + 2').valid, false);
    });

    test('rejects misplaced commas', () => {
      const parser = new LuxuryRealmsFormulaParser();
      assert.equal(parser.validateSyntax(', 10 + 2').valid, false);
      assert.equal(parser.validateSyntax('10 + 2,').valid, false);
      assert.equal(parser.validateSyntax('pow(2,)').valid, false);
    });
  });

  // 4. Operator Precedence and Associativity (RPN Compiler)
  describe('4. Operator Precedence & Shunting-Yard RPN Compiler', () => {
    test('respects standard PEMDAS precedence (* before +)', () => {
      const parser = new LuxuryRealmsFormulaParser();
      const rpn = parser.toRPN('2 + 3 * 4');
      const values = rpn.map(t => t.value);
      assert.deepEqual(values, [2, 3, 4, '*', '+']);
      assert.equal(parser.evaluate('2 + 3 * 4'), 14);
    });

    test('respects parentheses overriding precedence', () => {
      const parser = new LuxuryRealmsFormulaParser();
      const rpn = parser.toRPN('(2 + 3) * 4');
      const values = rpn.map(t => t.value);
      assert.deepEqual(values, [2, 3, '+', 4, '*']);
      assert.equal(parser.evaluate('(2 + 3) * 4'), 20);
    });

    test('exponentiation ^ is right-associative (2 ^ 3 ^ 2 = 2 ^ 9 = 512)', () => {
      const parser = new LuxuryRealmsFormulaParser();
      const rpn = parser.toRPN('2 ^ 3 ^ 2');
      const values = rpn.map(t => t.value);
      assert.deepEqual(values, [2, 3, 2, '^', '^']);
      assert.equal(parser.evaluate('2 ^ 3 ^ 2'), 512);
    });

    test('handles unary minus with correct precedence', () => {
      const parser = new LuxuryRealmsFormulaParser();
      assert.equal(parser.evaluate('-5 + 10'), 5);
      assert.equal(parser.evaluate('2 * -3'), -6);
      assert.equal(parser.evaluate('-2 ^ 2'), 4); // (-2)^2 in unary right-assoc
    });

    test('handles modulo operator %', () => {
      const parser = new LuxuryRealmsFormulaParser();
      assert.equal(parser.evaluate('25 % 7'), 4);
      assert.equal(parser.evaluate('100 % 10'), 0);
    });
  });

  // 5. Built-in Mathematical Functions
  describe('5. Built-in Mathematical Functions', () => {
    test('evaluates sqrt, log, ln, exp, abs', () => {
      const parser = new LuxuryRealmsFormulaParser();
      assert.equal(parser.evaluate('sqrt(16)'), 4);
      assert.equal(parser.evaluate('log(1000)'), 3);
      assert.equal(parser.evaluate('ln(1)'), 0);
      assert.equal(parser.evaluate('exp(0)'), 1);
      assert.equal(parser.evaluate('abs(-42.5)'), 42.5);
    });

    test('evaluates round with 1 argument and 2 arguments', () => {
      const parser = new LuxuryRealmsFormulaParser();
      assert.equal(parser.evaluate('round(3.14159)'), 3);
      assert.equal(parser.evaluate('round(3.14159, 2)'), 3.14);
      assert.equal(parser.evaluate('round(3.14159, 4)'), 3.1416);
    });

    test('evaluates floor and ceil', () => {
      const parser = new LuxuryRealmsFormulaParser();
      assert.equal(parser.evaluate('floor(4.9)'), 4);
      assert.equal(parser.evaluate('ceil(4.1)'), 5);
    });

    test('evaluates min and max multi-argument functions', () => {
      const parser = new LuxuryRealmsFormulaParser();
      assert.equal(parser.evaluate('min(10, 5)'), 5);
      assert.equal(parser.evaluate('min(10, 5, 2, 8)'), 2);
      assert.equal(parser.evaluate('max(10, 50, 20)'), 50);
    });

    test('evaluates pow function', () => {
      const parser = new LuxuryRealmsFormulaParser();
      assert.equal(parser.evaluate('pow(2, 5)'), 32);
      assert.equal(parser.evaluate('pow(10, 3)'), 1000);
    });
  });

  // 6. Variable Substitution
  describe('6. Variable Parameter Substitution', () => {
    test('substitutes default luxury variables in expressions', () => {
      const parser = new LuxuryRealmsFormulaParser();
      assert.equal(parser.evaluate('estate_listing_price'), 8500000.00);
      assert.equal(parser.evaluate('estate_tax_rate * 100'), 1.8);
      assert.equal(parser.evaluate('concierge_service_annual + private_security_annual'), 105000);
    });

    test('overrides variables during evaluate call', () => {
      const parser = new LuxuryRealmsFormulaParser();
      const customVars = {
        estate_listing_price: 10000000,
        estate_tax_rate: 0.02
      };
      assert.equal(parser.evaluate('estate_listing_price * estate_tax_rate', customVars), 200000);
    });

    test('throws on undefined variable', () => {
      const parser = new LuxuryRealmsFormulaParser();
      assert.throws(() => parser.evaluate('unknown_asset_val * 2'), /Undefined variable: "unknown_asset_val"/);
    });

    test('throws on non-numeric variable value', () => {
      const parser = new LuxuryRealmsFormulaParser();
      assert.throws(() => parser.evaluate('estate_listing_price', { estate_listing_price: 'invalid_number' }), /not a valid number/);
    });
  });

  // 7. Domain Guards and Division-by-Zero
  describe('7. Domain Guards & Error Prevention', () => {
    test('throws on division by zero', () => {
      const parser = new LuxuryRealmsFormulaParser();
      assert.throws(() => parser.evaluate('100000 / 0'), /Division by zero/);
      assert.throws(() => parser.evaluate('estate_listing_price / (10 - 10)'), /Division by zero/);
    });

    test('throws on modulo by zero', () => {
      const parser = new LuxuryRealmsFormulaParser();
      assert.throws(() => parser.evaluate('50 % 0'), /Division by zero in modulo/);
    });

    test('throws on square root of negative number', () => {
      const parser = new LuxuryRealmsFormulaParser();
      assert.throws(() => parser.evaluate('sqrt(-16)'), /Square root of negative number/);
    });

    test('throws on logarithm of zero or negative number', () => {
      const parser = new LuxuryRealmsFormulaParser();
      assert.throws(() => parser.evaluate('log(0)'), /Logarithm of non-positive/);
      assert.throws(() => parser.evaluate('log(-10)'), /Logarithm of non-positive/);
      assert.throws(() => parser.evaluate('ln(0)'), /Natural logarithm of non-positive/);
      assert.throws(() => parser.evaluate('ln(-5)'), /Natural logarithm of non-positive/);
    });
  });

  // 8. Calculation Audit History
  describe('8. Calculation Audit Log History', () => {
    test('records evaluation in history with required metadata', () => {
      const parser = new LuxuryRealmsFormulaParser();
      const result = parser.evaluate('estate_listing_price * estate_tax_rate');

      const history = parser.getHistory();
      assert.equal(history.length, 1);
      const entry = history[0];

      assert.ok(entry.id.startsWith('LR-'));
      assert.ok(typeof entry.timestamp === 'string');
      assert.equal(entry.expression, 'estate_listing_price * estate_tax_rate');
      assert.equal(entry.result, result);
      assert.equal(entry.result, 153000);
      assert.ok(typeof entry.executionTimeMs === 'number');
      assert.ok(entry.tokenCount > 0);
    });

    test('caps history at maxHistorySize', () => {
      const parser = new LuxuryRealmsFormulaParser({ maxHistorySize: 3 });

      parser.evaluate('1 + 1');
      parser.evaluate('2 + 2');
      parser.evaluate('3 + 3');
      assert.equal(parser.getHistory().length, 3);

      parser.evaluate('4 + 4');
      assert.equal(parser.getHistory().length, 3);
      assert.equal(parser.getHistory()[0].result, 8);
    });

    test('clearHistory resets audit history', () => {
      const parser = new LuxuryRealmsFormulaParser();
      parser.evaluate('100 + 200');
      assert.equal(parser.getHistory().length, 1);

      parser.clearHistory();
      assert.equal(parser.getHistory().length, 0);
    });
  });

  // 9. Event Emitter
  describe('9. Event Emitter (on, off, emit)', () => {
    test('emits evaluate and historyChange events', () => {
      const parser = new LuxuryRealmsFormulaParser();
      let evalFired = false;
      let historyFired = false;
      let evalPayload = null;

      parser.on('evaluate', payload => {
        evalFired = true;
        evalPayload = payload;
      });

      parser.on('historyChange', history => {
        historyFired = true;
        assert.ok(Array.isArray(history));
      });

      const res = parser.evaluate('50 * 2');
      assert.equal(evalFired, true);
      assert.equal(historyFired, true);
      assert.equal(evalPayload.result, res);
      assert.equal(evalPayload.result, 100);
    });

    test('emits error event on evaluation failure', () => {
      const parser = new LuxuryRealmsFormulaParser();
      let errorFired = false;
      let errorMsg = null;

      parser.on('error', payload => {
        errorFired = true;
        errorMsg = payload.error;
      });

      assert.throws(() => parser.evaluate('100 / 0'));
      assert.equal(errorFired, true);
      assert.ok(errorMsg.includes('Division by zero'));
    });

    test('unsubscribes handler with returned callback', () => {
      const parser = new LuxuryRealmsFormulaParser();
      let count = 0;
      const unsub = parser.on('evaluate', () => { count++; });

      parser.evaluate('1 + 1');
      assert.equal(count, 1);

      unsub();
      parser.evaluate('2 + 2');
      assert.equal(count, 1);
    });
  });

  // 10. All 6 KPI Preset Evaluations
  describe('10. Comprehensive KPI Presets Evaluation', () => {
    const parser = new LuxuryRealmsFormulaParser();
    const presets = LuxuryRealmsFormulaParser.KPI_PRESETS;

    test('preset 1: Total Annual Holding Cost', () => {
      const preset = presets.total_holding_cost;
      const expected = (8500000 * 0.018) + 45000 + 60000 + 85000; // 153000 + 190000 = 343000
      const val = parser.evaluate(preset.formula);
      assert.equal(val, expected);
      assert.equal(val, 343000);
    });

    test('preset 2: Net Charter Cashflow', () => {
      const preset = presets.net_charter_cashflow;
      const expected = 420000 - 343000; // 77000
      const val = parser.evaluate(preset.formula);
      assert.equal(val, expected);
      assert.equal(val, 77000);
    });

    test('preset 3: Luxury Holding Cost Ratio (%)', () => {
      const preset = presets.holding_cost_ratio;
      const expected = (343000 / 8500000) * 100; // ~4.03529411765%
      const val = parser.evaluate(preset.formula);
      assert.ok(Math.abs(val - expected) < 1e-6);
      assert.ok(val > 4.03 && val < 4.04);
    });

    test('preset 4: Charter Yield Return (%)', () => {
      const preset = presets.charter_yield_return;
      const expected = (420000 / 8500000) * 100; // ~4.94117647059%
      const val = parser.evaluate(preset.formula);
      assert.ok(Math.abs(val - expected) < 1e-6);
      assert.ok(val > 4.94 && val < 4.95);
    });

    test('preset 5: Asset Prestige Index', () => {
      const preset = presets.asset_prestige_index;
      // round((9.4 * 10) + (420000 / 50000)) = round(94 + 8.4) = round(102.4) = 102
      const val = parser.evaluate(preset.formula);
      assert.equal(val, 102);
    });

    test('preset 6: Reserve Coverage Factor', () => {
      const preset = presets.reserve_coverage_factor;
      const expected = 85000 / (45000 + 60000); // 85000 / 105000 = ~0.8095238
      const val = parser.evaluate(preset.formula);
      assert.ok(Math.abs(val - expected) < 1e-6);
      assert.ok(val > 0.80 && val < 0.81);
    });

    test('all presets return finite, non-NaN numbers', () => {
      for (const [key, preset] of Object.entries(presets)) {
        const val = parser.evaluate(preset.formula);
        assert.ok(typeof val === 'number', `Preset ${key} must return a number`);
        assert.ok(!isNaN(val), `Preset ${key} must not be NaN`);
        assert.ok(Number.isFinite(val), `Preset ${key} must be finite`);
      }
    });
  });

  // 11. Formatting Utility
  describe('11. Utility Formatting (formatResult)', () => {
    test('formats numbers with commas and decimals', () => {
      const parser = new LuxuryRealmsFormulaParser();
      assert.equal(parser.formatResult(343000, 2), '343,000.00');
      assert.equal(parser.formatResult(1234567.8912, 4), '1,234,567.8912');
      assert.equal(parser.formatResult(NaN), 'NaN');
      assert.equal(parser.formatResult(Infinity), 'NaN');
    });
  });
});
