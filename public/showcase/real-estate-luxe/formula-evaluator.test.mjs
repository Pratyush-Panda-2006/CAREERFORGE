import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  RealEstateLuxeFormulaParser,
  DEFAULT_VARIABLES,
  REAL_ESTATE_PRESETS
} from './formula-evaluator.js';

describe('RealEstateLuxeFormulaParser', () => {
  // 1. Initialization and Configuration
  describe('1. Initialization & Configuration', () => {
    it('instantiates with proper name, operators, functions, presets, and real estate variables', () => {
      const parser = new RealEstateLuxeFormulaParser();
      assert.equal(parser.name, 'RealEstateLuxeFormulaParser');

      // Operators
      assert.ok(parser.operators['+']);
      assert.ok(parser.operators['-']);
      assert.ok(parser.operators['*']);
      assert.ok(parser.operators['/']);
      assert.ok(parser.operators['^']);
      assert.ok(parser.operators['%']);
      assert.ok(parser.operators['u-']);
      assert.ok(parser.operators['u+']);

      // Functions
      assert.ok(parser.functions.sqrt);
      assert.ok(parser.functions.log);
      assert.ok(parser.functions.ln);
      assert.ok(parser.functions.log10);
      assert.ok(parser.functions.exp);
      assert.ok(parser.functions.abs);
      assert.ok(parser.functions.round);
      assert.ok(parser.functions.floor);
      assert.ok(parser.functions.ceil);
      assert.ok(parser.functions.min);
      assert.ok(parser.functions.max);
      assert.ok(parser.functions.pow);

      // Default real estate variables
      assert.equal(parser.defaultVariables.property_price, 1250000.00);
      assert.equal(parser.defaultVariables.monthly_rental_income, 6500.00);
      assert.equal(parser.defaultVariables.annual_operating_expenses, 18500.00);
      assert.equal(parser.defaultVariables.down_payment, 250000.00);
      assert.equal(parser.defaultVariables.annual_mortgage_debt, 48000.00);
      assert.equal(parser.defaultVariables.property_appreciation_rate, 0.045);
      assert.equal(parser.defaultVariables.closing_costs, 25000.00);
      assert.equal(parser.defaultVariables.vacancy_rate, 0.05);

      // Presets
      assert.equal(Object.keys(parser.presets).length, 6);
      assert.ok(parser.presets['Capitalization Rate (%)']);
      assert.ok(parser.presets['Cash-on-Cash Return (%)']);
      assert.ok(parser.presets['Net Operating Income (NOI)']);
      assert.ok(parser.presets['Gross Rent Multiplier (GRM)']);
      assert.ok(parser.presets['Debt Service Coverage Ratio (DSCR)']);
      assert.ok(parser.presets['Projected Property Equity (Year 1)']);

      // History begins empty
      assert.deepEqual(parser.getHistory(), []);
    });

    it('accepts custom constructor options for divisionByZeroGuard and precision', () => {
      const parser = new RealEstateLuxeFormulaParser({
        divisionByZeroGuard: 'infinity',
        precision: 2
      });
      assert.equal(parser.options.divisionByZeroGuard, 'infinity');
      assert.equal(parser.options.precision, 2);
    });

    it('exposes static DEFAULT_VARIABLES and PRESETS', () => {
      assert.equal(RealEstateLuxeFormulaParser.DEFAULT_VARIABLES.property_price, 1250000.00);
      assert.equal(Object.keys(RealEstateLuxeFormulaParser.PRESETS).length, 6);
    });
  });

  // 2. Tokenization
  describe('2. Expression Tokenization', () => {
    it('tokenizes integers, floating-point decimals, and scientific notation', () => {
      const parser = new RealEstateLuxeFormulaParser();
      const tokens = parser.tokenize('1250000 + 3.1415 + 1e5 + 2.5e-3 + 1.2E+4 + .75');

      assert.equal(tokens.length, 11);
      assert.equal(tokens[0].value, 1250000);
      assert.equal(tokens[2].value, 3.1415);
      assert.equal(tokens[4].value, 100000);
      assert.equal(tokens[6].value, 0.0025);
      assert.equal(tokens[8].value, 12000);
      assert.equal(tokens[10].value, 0.75);
    });

    it('tokenizes real estate variable identifiers and math functions', () => {
      const parser = new RealEstateLuxeFormulaParser();
      const tokens = parser.tokenize('sqrt(property_price) + log(monthly_rental_income) * min(down_payment, 100000)');

      assert.equal(tokens[0].type, 'function');
      assert.equal(tokens[0].value, 'sqrt');
      assert.equal(tokens[1].type, 'paren');
      assert.equal(tokens[1].value, '(');
      assert.equal(tokens[2].type, 'variable');
      assert.equal(tokens[2].value, 'property_price');
      assert.equal(tokens[3].type, 'paren');
      assert.equal(tokens[3].value, ')');
      assert.equal(tokens[4].type, 'operator');
      assert.equal(tokens[4].value, '+');
      assert.equal(tokens[5].type, 'function');
      assert.equal(tokens[5].value, 'log');
    });

    it('differentiates binary operators from unary plus/minus', () => {
      const parser = new RealEstateLuxeFormulaParser();
      const tokens = parser.tokenize('-5000 + 3 * -200 - +50');

      assert.equal(tokens[0].type, 'operator');
      assert.equal(tokens[0].value, 'u-');
      assert.equal(tokens[0].unary, true);

      assert.equal(tokens[2].type, 'operator');
      assert.equal(tokens[2].value, '+');
      assert.equal(tokens[2].unary, false);

      assert.equal(tokens[4].type, 'operator');
      assert.equal(tokens[4].value, '*');
      assert.equal(tokens[4].unary, false);

      assert.equal(tokens[5].type, 'operator');
      assert.equal(tokens[5].value, 'u-');
      assert.equal(tokens[5].unary, true);

      assert.equal(tokens[7].type, 'operator');
      assert.equal(tokens[7].value, '-');
      assert.equal(tokens[7].unary, false);

      assert.equal(tokens[8].type, 'operator');
      assert.equal(tokens[8].value, 'u+');
      assert.equal(tokens[8].unary, true);
    });

    it('tokenizes parentheses, commas, and all binary operators (+, -, *, /, ^, %)', () => {
      const parser = new RealEstateLuxeFormulaParser();
      const tokens = parser.tokenize('(a + b - c * d / e ^ f % g, h)');

      const opTypes = tokens.filter((t) => t.type === 'operator').map((t) => t.value);
      assert.deepEqual(opTypes, ['+', '-', '*', '/', '^', '%']);

      const commas = tokens.filter((t) => t.type === 'comma');
      assert.equal(commas.length, 1);
    });

    it('throws descriptive error on invalid unexpected characters', () => {
      const parser = new RealEstateLuxeFormulaParser();
      assert.throws(() => parser.tokenize('property_price $ 100'), /Unexpected character/);
      assert.throws(() => parser.tokenize('5 @ 2'), /Unexpected character/);
    });
  });

  // 3. Syntax Validation
  describe('3. Syntax Validation', () => {
    it('validates well-formed mathematical expressions', () => {
      const parser = new RealEstateLuxeFormulaParser();
      const res = parser.validateSyntax('((monthly_rental_income * 12) - annual_operating_expenses) / property_price');
      assert.equal(res.valid, true);
      assert.equal(res.error, null);
    });

    it('rejects empty or whitespace expressions', () => {
      const parser = new RealEstateLuxeFormulaParser();
      assert.equal(parser.validateSyntax('').valid, false);
      assert.equal(parser.validateSyntax('   ').valid, false);
      assert.equal(parser.validateSyntax(null).valid, false);
    });

    it('detects unclosed opening parentheses and mismatched closing parentheses', () => {
      const parser = new RealEstateLuxeFormulaParser();
      assert.equal(parser.validateSyntax('((1 + 2)').valid, false);
      assert.match(parser.validateSyntax('((1 + 2)').error, /Unclosed opening parenthesis/);

      assert.equal(parser.validateSyntax('(1 + 2))').valid, false);
      assert.match(parser.validateSyntax('(1 + 2))').error, /Mismatched closing parenthesis/);
    });

    it('detects empty parentheses pairs ()', () => {
      const parser = new RealEstateLuxeFormulaParser();
      assert.equal(parser.validateSyntax('5 + ()').valid, false);
      assert.match(parser.validateSyntax('5 + ()').error, /Empty parentheses/);
    });

    it('detects dangling binary operators at beginning and end of expressions', () => {
      const parser = new RealEstateLuxeFormulaParser();
      assert.equal(parser.validateSyntax('* 100').valid, false);
      assert.match(parser.validateSyntax('* 100').error, /cannot begin with operator/);

      assert.equal(parser.validateSyntax('100 +').valid, false);
      assert.match(parser.validateSyntax('100 +').error, /cannot end with dangling operator/);
    });

    it('detects consecutive binary operators', () => {
      const parser = new RealEstateLuxeFormulaParser();
      assert.equal(parser.validateSyntax('10 + * 5').valid, false);
      assert.match(parser.validateSyntax('10 + * 5').error, /Consecutive operators/);
    });

    it('detects operators directly after ( or before )', () => {
      const parser = new RealEstateLuxeFormulaParser();
      assert.equal(parser.validateSyntax('( * 5 )').valid, false);
      assert.match(parser.validateSyntax('( * 5 )').error, /immediately following opening parenthesis/);

      assert.equal(parser.validateSyntax('( 5 + )').valid, false);
      assert.match(parser.validateSyntax('( 5 + )').error, /before closing parenthesis/);
    });

    it('detects functions not followed by parentheses', () => {
      const parser = new RealEstateLuxeFormulaParser();
      assert.equal(parser.validateSyntax('sqrt 16').valid, false);
      assert.match(parser.validateSyntax('sqrt 16').error, /must be followed by "\("/);

      assert.equal(parser.validateSyntax('10 + sqrt').valid, false);
      assert.match(parser.validateSyntax('10 + sqrt').error, /must be followed by parentheses/);
    });

    it('detects misplaced commas in formulas', () => {
      const parser = new RealEstateLuxeFormulaParser();
      assert.equal(parser.validateSyntax(', 5').valid, false);
      assert.equal(parser.validateSyntax('5 ,').valid, false);
      assert.equal(parser.validateSyntax('min(, 5)').valid, false);
      assert.equal(parser.validateSyntax('min(5, )').valid, false);
      assert.equal(parser.validateSyntax('min(5,, 10)').valid, false);
    });
  });

  // 4. Operator Precedence & Shunting-Yard RPN
  describe('4. Operator Precedence & Shunting-Yard (RPN)', () => {
    it('observes standard BODMAS/PEMDAS multiplication and addition precedence', () => {
      const parser = new RealEstateLuxeFormulaParser();
      assert.equal(parser.evaluate('2 + 3 * 4'), 14);
      assert.equal(parser.evaluate('3 * 4 + 2'), 14);
      assert.equal(parser.evaluate('(2 + 3) * 4'), 20);
    });

    it('preserves left-associativity for subtraction and division', () => {
      const parser = new RealEstateLuxeFormulaParser();
      assert.equal(parser.evaluate('20 - 10 - 5'), 5); // (20 - 10) - 5 = 5
      assert.equal(parser.evaluate('100 / 10 / 2'), 5); // (100 / 10) / 2 = 5
    });

    it('enforces right-associativity for exponentiation (^)', () => {
      const parser = new RealEstateLuxeFormulaParser();
      // 2 ^ 3 ^ 2 should be 2 ^ (3 ^ 2) = 2 ^ 9 = 512, NOT (2 ^ 3) ^ 2 = 64
      assert.equal(parser.evaluate('2 ^ 3 ^ 2'), 512);
      assert.equal(parser.evaluate('(2 ^ 3) ^ 2'), 64);
    });

    it('evaluates unary minus with precedence over addition and multiplication', () => {
      const parser = new RealEstateLuxeFormulaParser();
      assert.equal(parser.evaluate('-5 + 10'), 5);
      assert.equal(parser.evaluate('10 + -5'), 5);
      assert.equal(parser.evaluate('4 * -3'), -12);
      assert.equal(parser.evaluate('-(3 + 2) * 4'), -20);
    });

    it('evaluates modulo operator correctly', () => {
      const parser = new RealEstateLuxeFormulaParser();
      assert.equal(parser.evaluate('17 % 5'), 2);
      assert.equal(parser.evaluate('25 % 4 * 3'), 3);
    });
  });

  // 5. Mathematical Functions
  describe('5. Mathematical Functions', () => {
    it('evaluates sqrt with non-negative domain check', () => {
      const parser = new RealEstateLuxeFormulaParser();
      assert.equal(parser.evaluate('sqrt(144)'), 12);
      assert.equal(parser.evaluate('sqrt(0)'), 0);
      assert.throws(() => parser.evaluate('sqrt(-9)'), /Square root of negative number/);
    });

    it('evaluates log (base-10 default, custom base) and ln with positive domain check', () => {
      const parser = new RealEstateLuxeFormulaParser();
      assert.equal(parser.evaluate('log(1000)'), 3);
      assert.equal(parser.evaluate('log(16, 2)'), 4);
      assert.equal(parser.evaluate('log10(100)'), 2);
      assert.equal(parser.evaluate('ln(1)'), 0);
      assert.equal(Math.round(parser.evaluate('ln(e)')), 1);

      assert.throws(() => parser.evaluate('log(0)'), /Logarithm of non-positive number/);
      assert.throws(() => parser.evaluate('log(-10)'), /Logarithm of non-positive number/);
      assert.throws(() => parser.evaluate('ln(0)'), /Natural logarithm of non-positive number/);
    });

    it('evaluates exp, abs, round, floor, ceil, and pow', () => {
      const parser = new RealEstateLuxeFormulaParser();
      assert.equal(parser.evaluate('exp(0)'), 1);
      assert.equal(parser.evaluate('abs(-15000)'), 15000);
      assert.equal(parser.evaluate('abs(15000)'), 15000);
      assert.equal(parser.evaluate('round(4.4)'), 4);
      assert.equal(parser.evaluate('round(4.6)'), 5);
      assert.equal(parser.evaluate('round(3.14159, 2)'), 3.14);
      assert.equal(parser.evaluate('floor(9.99)'), 9);
      assert.equal(parser.evaluate('ceil(9.01)'), 10);
      assert.equal(parser.evaluate('pow(3, 4)'), 81);
      assert.throws(() => parser.evaluate('pow(-4, 0.5)'), /Fractional power of negative base/);
    });

    it('evaluates variadic min and max functions', () => {
      const parser = new RealEstateLuxeFormulaParser();
      assert.equal(parser.evaluate('min(50, 20, 80, 5)'), 5);
      assert.equal(parser.evaluate('max(50, 20, 80, 5)'), 80);
      assert.equal(parser.evaluate('max(min(10, 20), 15)'), 15);
    });

    it('supports mathematical constants pi and e', () => {
      const parser = new RealEstateLuxeFormulaParser();
      assert.equal(parser.evaluate('pi'), Math.PI);
      assert.equal(parser.evaluate('e'), Math.E);
    });
  });

  // 6. Variable Parameter Substitution
  describe('6. Variable Parameter Substitution', () => {
    it('uses default real estate parameters when no overrides provided', () => {
      const parser = new RealEstateLuxeFormulaParser();
      assert.equal(parser.evaluate('property_price'), 1250000);
      assert.equal(parser.evaluate('monthly_rental_income * 12'), 78000);
    });

    it('allows overriding parameters dynamically during evaluate() call', () => {
      const parser = new RealEstateLuxeFormulaParser();
      const customPrice = parser.evaluate('property_price * 2', { property_price: 2500000 });
      assert.equal(customPrice, 5000000);

      // Verify default state remained unaltered
      assert.equal(parser.defaultVariables.property_price, 1250000);
    });

    it('throws error for undefined variables not in parameter context', () => {
      const parser = new RealEstateLuxeFormulaParser();
      assert.throws(() => parser.evaluate('property_price + unknown_factor'), /Variable "unknown_factor" is undefined/);
    });
  });

  // 7. Division-by-Zero Guards
  describe('7. Division-by-Zero Guards', () => {
    it('throws error by default on division and modulo by zero', () => {
      const parser = new RealEstateLuxeFormulaParser();
      assert.throws(() => parser.evaluate('1000 / 0'), /Division by zero is undefined/);
      assert.throws(() => parser.evaluate('1000 % 0'), /Division by zero in modulo/);
    });

    it('returns Infinity or -Infinity when divisionByZeroGuard is configured to infinity', () => {
      const parser = new RealEstateLuxeFormulaParser({ divisionByZeroGuard: 'infinity' });
      assert.equal(parser.evaluate('5000 / 0'), Infinity);
      assert.equal(parser.evaluate('-5000 / 0'), -Infinity);
      assert.ok(Number.isNaN(parser.evaluate('5000 % 0')));
    });
  });

  // 8. Calculation Audit History
  describe('8. Calculation Audit History', () => {
    it('records calculation history entries with id, timestamp, expression, result, duration', () => {
      const parser = new RealEstateLuxeFormulaParser();
      const res = parser.evaluate('property_price * 0.10');

      const history = parser.getHistory();
      assert.equal(history.length, 1);
      assert.ok(history[0].id.startsWith('calc-'));
      assert.ok(history[0].timestamp);
      assert.equal(history[0].expression, 'property_price * 0.10');
      assert.equal(history[0].result, res);
      assert.equal(history[0].status, 'SUCCESS');
      assert.equal(history[0].error, null);
      assert.equal(typeof history[0].durationMs, 'number');
    });

    it('records failed calculations in audit history with status ERROR', () => {
      const parser = new RealEstateLuxeFormulaParser();
      assert.throws(() => parser.evaluate('property_price / 0'));

      const history = parser.getHistory();
      assert.equal(history.length, 1);
      assert.equal(history[0].status, 'ERROR');
      assert.match(history[0].error, /Division by zero/);
      assert.equal(history[0].result, null);
    });

    it('allows lookup by ID and history clearing', () => {
      const parser = new RealEstateLuxeFormulaParser();
      parser.evaluate('100 + 200');
      const entryId = parser.getHistory()[0].id;

      const found = parser.getCalculationById(entryId);
      assert.ok(found);
      assert.equal(found.result, 300);

      parser.clearHistory();
      assert.equal(parser.getHistory().length, 0);
      assert.equal(parser.getCalculationById(entryId), null);
    });
  });

  // 9. Event Emitter
  describe('9. Event Emitter Interface', () => {
    it('emits evaluate and historyChange events on successful calculation', () => {
      const parser = new RealEstateLuxeFormulaParser();
      let evalEventData = null;
      let historyChangeData = null;

      parser.on('evaluate', (data) => { evalEventData = data; });
      parser.on('historyChange', (history) => { historyChangeData = history; });

      const res = parser.evaluate('50 * 20');
      assert.ok(evalEventData);
      assert.equal(evalEventData.result, res);
      assert.ok(historyChangeData);
      assert.equal(historyChangeData.length, 1);
    });

    it('emits error and historyChange events on failed calculation', () => {
      const parser = new RealEstateLuxeFormulaParser();
      let errorEventData = null;
      let historyChanged = false;

      parser.on('error', (errData) => { errorEventData = errData; });
      parser.on('historyChange', () => { historyChanged = true; });

      assert.throws(() => parser.evaluate('invalid_var + 1'));
      assert.ok(errorEventData);
      assert.equal(errorEventData.status, 'ERROR');
      assert.equal(historyChanged, true);
    });

    it('allows unsubscribing with off()', () => {
      const parser = new RealEstateLuxeFormulaParser();
      let callCount = 0;
      const callback = () => { callCount++; };

      parser.on('evaluate', callback);
      parser.evaluate('1 + 1');
      assert.equal(callCount, 1);

      parser.off('evaluate', callback);
      parser.evaluate('2 + 2');
      assert.equal(callCount, 1);
    });
  });

  // 10. All 6 Real Estate KPI Presets
  describe('10. Evaluation of All 6 Real Estate Luxe KPI Presets', () => {
    const parser = new RealEstateLuxeFormulaParser();

    it('Preset 1: Capitalization Rate (%)', () => {
      const formula = parser.presets['Capitalization Rate (%)'].formula;
      const res = parser.evaluate(formula);
      // ((6500 * 12 * (1 - 0.05) - 18500) / 1250000) * 100 = (55600 / 1250000) * 100 = 4.448%
      assert.ok(Math.abs(res - 4.448) < 1e-10);
      assert.ok(Math.abs(parser.evaluatePreset('cap_rate') - 4.448) < 1e-10);
    });

    it('Preset 2: Cash-on-Cash Return (%)', () => {
      const formula = parser.presets['Cash-on-Cash Return (%)'].formula;
      const res = parser.evaluate(formula);
      // ((55600 - 48000) / (250000 + 25000)) * 100 = (7600 / 275000) * 100 = 2.7636363636363637%
      const expected = (7600 / 275000) * 100;
      assert.ok(Math.abs(res - expected) < 1e-10);
      assert.ok(Math.abs(parser.evaluatePreset('cash_on_cash') - expected) < 1e-10);
    });

    it('Preset 3: Net Operating Income (NOI)', () => {
      const formula = parser.presets['Net Operating Income (NOI)'].formula;
      const res = parser.evaluate(formula);
      // 6500 * 12 * 0.95 - 18500 = 74100 - 18500 = 55600
      assert.equal(res, 55600);
      assert.equal(parser.evaluatePreset('noi'), 55600);
    });

    it('Preset 4: Gross Rent Multiplier (GRM)', () => {
      const formula = parser.presets['Gross Rent Multiplier (GRM)'].formula;
      const res = parser.evaluate(formula);
      // 1250000 / (6500 * 12) = 1250000 / 78000 = 16.025641025641026
      const expected = 1250000 / 78000;
      assert.ok(Math.abs(res - expected) < 1e-10);
      assert.ok(Math.abs(parser.evaluatePreset('grm') - expected) < 1e-10);
    });

    it('Preset 5: Debt Service Coverage Ratio (DSCR)', () => {
      const formula = parser.presets['Debt Service Coverage Ratio (DSCR)'].formula;
      const res = parser.evaluate(formula);
      // 55600 / 48000 = 1.1583333333333334
      const expected = 55600 / 48000;
      assert.ok(Math.abs(res - expected) < 1e-10);
      assert.ok(Math.abs(parser.evaluatePreset('dscr') - expected) < 1e-10);
    });

    it('Preset 6: Projected Property Equity (Year 1)', () => {
      const formula = parser.presets['Projected Property Equity (Year 1)'].formula;
      const res = parser.evaluate(formula);
      // 250000 + (1250000 * 0.045) = 250000 + 56250 = 306250
      assert.equal(res, 306250);
      assert.equal(parser.evaluatePreset('equity_y1'), 306250);
    });

    it('evaluates presets with custom variable overrides', () => {
      // Evaluate Cap Rate on a $2.5M property with $15,000 monthly rent
      const customCapRate = parser.evaluatePreset('Capitalization Rate (%)', {
        property_price: 2500000,
        monthly_rental_income: 15000,
        vacancy_rate: 0.05,
        annual_operating_expenses: 35000
      });
      // (15000 * 12 * 0.95 - 35000) / 2500000 * 100 = (171000 - 35000) / 2500000 * 100 = 136000 / 2500000 * 100 = 5.44%
      assert.ok(Math.abs(customCapRate - 5.44) < 1e-10);
    });
  });
});
