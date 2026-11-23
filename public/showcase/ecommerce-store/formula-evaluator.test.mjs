import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  EcommerceStoreFormulaParser,
  DEFAULT_ECOMMERCE_VARIABLES,
  ECOMMERCE_KPI_PRESETS
} from './formula-evaluator.js';

describe('EcommerceStoreFormulaParser', () => {
  describe('Initialization & Configuration', () => {
    it('instantiates correctly with proper name, operators, and functions', () => {
      const parser = new EcommerceStoreFormulaParser();
      assert.equal(parser.name, 'EcommerceStoreFormulaParser');
      assert.ok(parser.operators['+']);
      assert.ok(parser.operators['-']);
      assert.ok(parser.operators['*']);
      assert.ok(parser.operators['/']);
      assert.ok(parser.operators['%']);
      assert.ok(parser.operators['^']);
      assert.ok(parser.operators['u-']);
      assert.ok(parser.operators['u+']);

      assert.ok(parser.functions['sqrt']);
      assert.ok(parser.functions['log']);
      assert.ok(parser.functions['ln']);
      assert.ok(parser.functions['exp']);
      assert.ok(parser.functions['abs']);
      assert.ok(parser.functions['min']);
      assert.ok(parser.functions['max']);
      assert.ok(parser.functions['round']);
      assert.ok(parser.functions['floor']);
      assert.ok(parser.functions['ceil']);
      assert.ok(parser.functions['pow']);
    });

    it('initializes with default E-Commerce variables matching specification', () => {
      const parser = new EcommerceStoreFormulaParser();
      const vars = parser.getVariables();

      assert.equal(vars.product_price, 49.99);
      assert.equal(vars.discount_rate, 0.15);
      assert.equal(vars.tax_rate, 0.08);
      assert.equal(vars.shipping_fee, 5.99);
      assert.equal(vars.quantity, 3);
      assert.equal(vars.customer_acquisition_cost, 18.50);
      assert.equal(vars.average_order_value, 85.00);
      assert.equal(vars.conversion_rate, 0.035);
      assert.equal(vars.gross_margin_rate, 0.42);
      assert.equal(vars.churn_rate, 0.05);
    });

    it('contains all 6 required E-Commerce KPI presets with valid formulas', () => {
      const parser = new EcommerceStoreFormulaParser();
      const presets = parser.getPresets();

      const requiredKeys = [
        'order_total',
        'clv',
        'breakeven_roas',
        'gross_profit',
        'revenue_per_visitor',
        'discount_savings'
      ];

      for (const key of requiredKeys) {
        assert.ok(presets[key], `Preset "${key}" must exist`);
        assert.ok(typeof presets[key].formula === 'string' && presets[key].formula.length > 0);
        const validation = parser.validateSyntax(presets[key].formula);
        assert.equal(validation.isValid, true, `Preset "${key}" formula syntax must be valid`);
      }
    });

    it('manages variable updates and resets', () => {
      const parser = new EcommerceStoreFormulaParser();
      parser.setVariable('product_price', 99.99);
      assert.equal(parser.getVariable('product_price'), 99.99);

      parser.setVariables({ quantity: 5, tax_rate: 0.1 });
      assert.equal(parser.getVariable('quantity'), 5);
      assert.equal(parser.getVariable('tax_rate'), 0.1);

      parser.resetVariables();
      assert.equal(parser.getVariable('product_price'), 49.99);
      assert.equal(parser.getVariable('quantity'), 3);
    });
  });

  describe('Tokenization Engine', () => {
    it('tokenizes integers, floating-point numbers, and scientific notation', () => {
      const parser = new EcommerceStoreFormulaParser();
      const tokens = parser.tokenize('42 3.1415 .75 1e3 2.5e-2 1.2E+4');

      assert.equal(tokens.length, 6);
      assert.equal(tokens[0].value, 42);
      assert.equal(tokens[1].value, 3.1415);
      assert.equal(tokens[2].value, 0.75);
      assert.equal(tokens[3].value, 1000);
      assert.equal(tokens[4].value, 0.025);
      assert.equal(tokens[5].value, 12000);
    });

    it('tokenizes variables, functions, parentheses, and commas', () => {
      const parser = new EcommerceStoreFormulaParser();
      const tokens = parser.tokenize('pow(product_price, 2) + min(quantity, 10)');

      const types = tokens.map((t) => t.type);
      assert.deepEqual(types, [
        'function',
        'paren',
        'variable',
        'comma',
        'number',
        'paren',
        'operator',
        'function',
        'paren',
        'variable',
        'comma',
        'number',
        'paren'
      ]);
    });

    it('detects unary minus and unary plus operators properly', () => {
      const parser = new EcommerceStoreFormulaParser();

      const tokens1 = parser.tokenize('-5 + +3');
      assert.equal(tokens1[0].value, 'u-');
      assert.equal(tokens1[0].unary, true);
      assert.equal(tokens1[2].value, '+');
      assert.equal(tokens1[3].value, 'u+');

      const tokens2 = parser.tokenize('3 * -2');
      assert.equal(tokens2[1].value, '*');
      assert.equal(tokens2[1].unary, false);
      assert.equal(tokens2[2].value, 'u-');
      assert.equal(tokens2[2].unary, true);

      const tokens3 = parser.tokenize('-(x + 2)');
      assert.equal(tokens3[0].value, 'u-');
      assert.equal(tokens3[1].value, '(');
    });

    it('throws on unexpected illegal characters with index', () => {
      const parser = new EcommerceStoreFormulaParser();
      assert.throws(() => parser.tokenize('100 @ 2'), /Unexpected character in formula: "@" at index 4/);
      assert.throws(() => parser.tokenize('price $ 5'), /Unexpected character in formula: "\$"/);
    });
  });

  describe('Syntax Validation', () => {
    it('validates correct expressions successfully', () => {
      const parser = new EcommerceStoreFormulaParser();
      assert.equal(parser.validateSyntax('2 + 3 * 4').isValid, true);
      assert.equal(parser.validateSyntax('(product_price * quantity * (1 - discount_rate))').isValid, true);
      assert.equal(parser.validateSyntax('pow(2, 3) + sqrt(16)').isValid, true);
    });

    it('rejects empty or whitespace-only expressions', () => {
      const parser = new EcommerceStoreFormulaParser();
      assert.equal(parser.validateSyntax('').isValid, false);
      assert.equal(parser.validateSyntax('   ').isValid, false);
      assert.match(parser.validateSyntax('').error, /cannot be empty/);
    });

    it('rejects mismatched and unclosed parentheses', () => {
      const parser = new EcommerceStoreFormulaParser();
      const res1 = parser.validateSyntax('(2 + 3');
      assert.equal(res1.isValid, false);
      assert.match(res1.error, /Unclosed opening parenthesis/);

      const res2 = parser.validateSyntax('2 + 3)');
      assert.equal(res2.isValid, false);
      assert.match(res2.error, /Mismatched closing parenthesis/);

      const res3 = parser.validateSyntax('()');
      assert.equal(res3.isValid, false);
      assert.match(res3.error, /Empty parentheses/);
    });

    it('rejects invalid consecutive operators and dangling operators', () => {
      const parser = new EcommerceStoreFormulaParser();

      assert.equal(parser.validateSyntax('2 * * 3').isValid, false);
      assert.equal(parser.validateSyntax('5 +').isValid, false);
      assert.match(parser.validateSyntax('5 +').error, /dangling operator/i);

      assert.equal(parser.validateSyntax('* 5').isValid, false);
      assert.match(parser.validateSyntax('* 5').error, /cannot begin with operator/i);

      assert.equal(parser.validateSyntax('( * 5 )').isValid, false);
      assert.match(parser.validateSyntax('( * 5 )').error, /immediately following opening parenthesis/i);

      assert.equal(parser.validateSyntax('( 5 + )').isValid, false);
      assert.match(parser.validateSyntax('( 5 + )').error, /Dangling operator/i);
    });

    it('rejects malformed commas and misplaced function calls', () => {
      const parser = new EcommerceStoreFormulaParser();

      assert.equal(parser.validateSyntax(', 5 + 2').isValid, false);
      assert.equal(parser.validateSyntax('5 + 2,').isValid, false);
      assert.equal(parser.validateSyntax('min(5,, 2)').isValid, false);
      assert.equal(parser.validateSyntax('sqrt').isValid, false);
    });
  });

  describe('Operator Precedence & BODMAS / PEMDAS', () => {
    it('executes multiplication and division before addition and subtraction', () => {
      const parser = new EcommerceStoreFormulaParser();
      assert.equal(parser.evaluate('2 + 3 * 4'), 14);
      assert.equal(parser.evaluate('10 - 6 / 2'), 7);
      assert.equal(parser.evaluate('20 - 4 * 3 + 2'), 10);
    });

    it('respects grouping parentheses over standard precedence', () => {
      const parser = new EcommerceStoreFormulaParser();
      assert.equal(parser.evaluate('(2 + 3) * 4'), 20);
      assert.equal(parser.evaluate('10 / (2 + 3)'), 2);
      assert.equal(parser.evaluate('(100 - (10 / 2)) * 2'), 190);
    });

    it('handles exponentiation (^) with right-associativity and proper precedence', () => {
      const parser = new EcommerceStoreFormulaParser();
      // 2 ^ 3 * 2 = 8 * 2 = 16
      assert.equal(parser.evaluate('2 ^ 3 * 2'), 16);
      // 2 ^ (3 ^ 2) = 2 ^ 9 = 512
      assert.equal(parser.evaluate('2 ^ 3 ^ 2'), 512);
      // (2 ^ 3) ^ 2 = 8 ^ 2 = 64
      assert.equal(parser.evaluate('(2 ^ 3) ^ 2'), 64);
    });

    it('handles left-associative operators (+, -, *, /, %)', () => {
      const parser = new EcommerceStoreFormulaParser();
      // (10 - 4) + 2 = 8, not 10 - 6 = 4
      assert.equal(parser.evaluate('10 - 4 + 2'), 8);
      // (100 / 5) * 2 = 40, not 100 / 10 = 10
      assert.equal(parser.evaluate('100 / 5 * 2'), 40);
      // (17 % 5) * 3 = 2 * 3 = 6
      assert.equal(parser.evaluate('17 % 5 * 3'), 6);
    });

    it('evaluates unary minus and plus correctly', () => {
      const parser = new EcommerceStoreFormulaParser();
      assert.equal(parser.evaluate('-5 + 3'), -2);
      assert.equal(parser.evaluate('3 * -2'), -6);
      assert.equal(parser.evaluate('-(4 + 6) * 2'), -20);
      assert.equal(parser.evaluate('+10 - -5'), 15);
    });
  });

  describe('Mathematical Functions Suite', () => {
    it('computes sqrt, abs, and exponential functions accurately', () => {
      const parser = new EcommerceStoreFormulaParser();
      assert.equal(parser.evaluate('sqrt(16)'), 4);
      assert.equal(parser.evaluate('sqrt(0)'), 0);
      assert.equal(parser.evaluate('abs(-42)'), 42);
      assert.equal(parser.evaluate('abs(42)'), 42);
      assert.equal(parser.evaluate('exp(0)'), 1);
    });

    it('computes log (base 10) and ln (natural log)', () => {
      const parser = new EcommerceStoreFormulaParser();
      assert.equal(parser.evaluate('log(100)'), 2);
      assert.equal(parser.evaluate('log(1000)'), 3);
      assert.equal(parser.evaluate('round(ln(exp(3)))'), 3);
    });

    it('computes min and max with multiple arguments', () => {
      const parser = new EcommerceStoreFormulaParser();
      assert.equal(parser.evaluate('min(10, 5)'), 5);
      assert.equal(parser.evaluate('min(8, 2, 9, 1, 14)'), 1);
      assert.equal(parser.evaluate('max(10, 5)'), 10);
      assert.equal(parser.evaluate('max(8, 2, 9, 1, 14)'), 14);
    });

    it('computes round, floor, ceil, and pow', () => {
      const parser = new EcommerceStoreFormulaParser();
      assert.equal(parser.evaluate('round(4.6)'), 5);
      assert.equal(parser.evaluate('round(4.2)'), 4);
      assert.equal(parser.evaluate('round(4.556, 2)'), 4.56);
      assert.equal(parser.evaluate('floor(4.9)'), 4);
      assert.equal(parser.evaluate('floor(-4.1)'), -5);
      assert.equal(parser.evaluate('ceil(4.1)'), 5);
      assert.equal(parser.evaluate('ceil(-4.9)'), -4);
      assert.equal(parser.evaluate('pow(2, 4)'), 16);
      assert.equal(parser.evaluate('pow(5, -1)'), 0.2);
    });

    it('evaluates nested function calls correctly', () => {
      const parser = new EcommerceStoreFormulaParser();
      // pow(sqrt(16), min(3, 5)) = pow(4, 3) = 64
      assert.equal(parser.evaluate('pow(sqrt(16), min(3, 5))'), 64);
      // round(sqrt(20), 2) = 4.47
      assert.equal(parser.evaluate('round(sqrt(20), 2)'), 4.47);
    });

    it('guards against mathematical domain errors in functions', () => {
      const parser = new EcommerceStoreFormulaParser();
      assert.throws(() => parser.evaluate('sqrt(-4)'), /Square root of negative number is undefined/);
      assert.throws(() => parser.evaluate('log(0)'), /Logarithm of non-positive number is undefined/);
      assert.throws(() => parser.evaluate('log(-10)'), /Logarithm of non-positive number is undefined/);
      assert.throws(() => parser.evaluate('ln(0)'), /Natural logarithm of non-positive number is undefined/);
      assert.throws(() => parser.evaluate('ln(-1)'), /Natural logarithm of non-positive number is undefined/);
    });
  });

  describe('Variable Substitution & Division-by-Zero Guards', () => {
    it('uses default e-commerce variables automatically', () => {
      const parser = new EcommerceStoreFormulaParser();
      // product_price (49.99) * quantity (3) = 149.97
      assert.equal(parser.evaluate('product_price * quantity'), 149.97);
    });

    it('allows overriding variables via evaluation parameter', () => {
      const parser = new EcommerceStoreFormulaParser();
      const customVars = { product_price: 100, quantity: 2 };
      assert.equal(parser.evaluate('product_price * quantity', customVars), 200);
    });

    it('throws descriptive error on undefined variables', () => {
      const parser = new EcommerceStoreFormulaParser();
      assert.throws(
        () => parser.evaluate('product_price + undefined_tax_param'),
        /Variable "undefined_tax_param" is undefined in parameter context/
      );
    });

    it('strictly guards against division by zero in division and modulo operations', () => {
      const parser = new EcommerceStoreFormulaParser();
      assert.throws(() => parser.evaluate('42 / 0'), /Division by zero is undefined/);
      assert.throws(() => parser.evaluate('42 / (10 - 10)'), /Division by zero is undefined/);
      assert.throws(() => parser.evaluate('25 % 0'), /Division by zero in modulo operation/);
      assert.throws(() => parser.evaluate('25 % (5 - 5)'), /Division by zero in modulo operation/);
    });
  });

  describe('Calculation Audit History & Replay', () => {
    it('records calculation history entries with unique IDs and timestamps', () => {
      const parser = new EcommerceStoreFormulaParser();
      parser.clearHistory();

      parser.evaluate('2 + 2');
      parser.evaluate('10 * 10');

      const history = parser.getHistory();
      assert.equal(history.length, 2);
      assert.ok(history[0].id.startsWith('calc_'));
      assert.ok(history[0].timestamp > 0);
      assert.equal(history[0].rawValue, 100);
      assert.equal(history[1].rawValue, 4);
    });

    it('clears history correctly', () => {
      const parser = new EcommerceStoreFormulaParser();
      parser.evaluate('5 * 5');
      assert.ok(parser.getHistory().length > 0);

      parser.clearHistory();
      assert.equal(parser.getHistory().length, 0);
    });

    it('replays a past calculation successfully using its unique ID', () => {
      const parser = new EcommerceStoreFormulaParser();
      parser.clearHistory();

      parser.evaluate('product_price * 2', { product_price: 30 });
      const history = parser.getHistory();
      const targetId = history[0].id;

      const replayedVal = parser.replayHistory(targetId);
      assert.equal(replayedVal, 60);
    });
  });

  describe('Event Emitter Pattern', () => {
    it('emits evaluate event with computation details', () => {
      const parser = new EcommerceStoreFormulaParser();
      let eventPayload = null;

      const unsubscribe = parser.on('evaluate', (data) => {
        eventPayload = data;
      });

      parser.evaluate('10 + 20');
      assert.ok(eventPayload);
      assert.equal(eventPayload.result, 30);
      assert.ok(eventPayload.historyEntry);
      assert.ok(eventPayload.tokens.length > 0);

      unsubscribe();
      eventPayload = null;
      parser.evaluate('5 + 5');
      assert.equal(eventPayload, null, 'Listener should not fire after unsubscribe');
    });

    it('emits error event on evaluation failure', () => {
      const parser = new EcommerceStoreFormulaParser();
      let errorPayload = null;

      parser.on('error', (err) => {
        errorPayload = err;
      });

      assert.throws(() => parser.evaluate('10 / 0'));
      assert.ok(errorPayload);
      assert.match(errorPayload.error, /Division by zero/);
    });

    it('emits historyChange event when history changes', () => {
      const parser = new EcommerceStoreFormulaParser();
      let changePayload = null;

      parser.on('historyChange', (history) => {
        changePayload = history;
      });

      parser.evaluate('7 * 3');
      assert.ok(Array.isArray(changePayload));
      assert.ok(changePayload.length > 0);
    });
  });

  describe('E-Commerce KPI Presets Evaluation', () => {
    const parser = new EcommerceStoreFormulaParser();

    it('evaluates Order Total preset accurately', () => {
      const formula = parser.getPreset('order_total').formula;
      // Formula: (product_price * quantity * (1 - discount_rate) * (1 + tax_rate)) + shipping_fee
      // (49.99 * 3 * 0.85 * 1.08) + 5.99 = 127.4745 * 1.08 + 5.99 = 137.67246 + 5.99 = 143.66246
      const result = parser.evaluate(formula);
      assert.equal(result, 143.66246);
    });

    it('evaluates Customer Lifetime Value (CLV) preset accurately', () => {
      const formula = parser.getPreset('clv').formula;
      // Formula: (average_order_value * gross_margin_rate) / churn_rate
      // (85.00 * 0.42) / 0.05 = 35.7 / 0.05 = 714
      const result = parser.evaluate(formula);
      assert.equal(result, 714);
    });

    it('evaluates Break-Even ROAS preset accurately', () => {
      const formula = parser.getPreset('breakeven_roas').formula;
      // Formula: average_order_value / customer_acquisition_cost
      // 85.00 / 18.50 = 4.594594594594595
      const result = parser.evaluate(formula);
      assert.equal(Math.round(result * 100) / 100, 4.59);
    });

    it('evaluates Gross Profit preset accurately', () => {
      const formula = parser.getPreset('gross_profit').formula;
      // Formula: (product_price * quantity * (1 - discount_rate)) * gross_margin_rate
      // (49.99 * 3 * 0.85) * 0.42 = 127.4745 * 0.42 = 53.53929
      const result = parser.evaluate(formula);
      assert.equal(result, 53.53929);
    });

    it('evaluates Revenue Per Visitor preset accurately', () => {
      const formula = parser.getPreset('revenue_per_visitor').formula;
      // Formula: conversion_rate * average_order_value
      // 0.035 * 85.00 = 2.975
      const result = parser.evaluate(formula);
      assert.equal(result, 2.975);
    });

    it('evaluates Discount Savings preset accurately', () => {
      const formula = parser.getPreset('discount_savings').formula;
      // Formula: product_price * quantity * discount_rate
      // 49.99 * 3 * 0.15 = 22.4955
      const result = parser.evaluate(formula);
      assert.equal(result, 22.4955);
    });
  });

  describe('Formatting Helpers', () => {
    it('formats numbers and currency reliably', () => {
      const parser = new EcommerceStoreFormulaParser();
      assert.equal(parser.formatNumber(1234.5678, { decimals: 2 }), '1,234.57');
      assert.equal(parser.formatNumber(100), '100');
      assert.equal(parser.formatCurrency(143.662), '$143.66');
      assert.equal(parser.formatCurrency(0), '$0.00');
    });
  });
});
