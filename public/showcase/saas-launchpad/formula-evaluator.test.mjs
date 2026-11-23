import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  SaasLaunchpadFormulaParser,
  DEFAULT_SAAS_VARIABLES,
  SAAS_FORMULA_PRESETS
} from './formula-evaluator.js';

describe('SaasLaunchpadFormulaParser Test Suite (Issue #1190)', () => {

  // 1. Default initialization and configuration
  describe('1. Default initialization and configuration', () => {
    test('instantiates with proper default options, variables, and presets', () => {
      assert.ok(DEFAULT_SAAS_VARIABLES);
      assert.ok(Array.isArray(SAAS_FORMULA_PRESETS));
      const parser = new SaasLaunchpadFormulaParser();
      assert.ok(parser instanceof SaasLaunchpadFormulaParser);
      assert.equal(parser.name, 'SaasLaunchpadFormulaParser');

      const vars = parser.getVariables();
      assert.equal(vars.monthly_recurring_revenue, 15000.00);
      assert.equal(vars.churn_rate, 0.04);
      assert.equal(vars.customer_acquisition_cost, 250.00);
      assert.equal(vars.average_revenue_per_user, 75.00);
      assert.equal(vars.gross_margin_rate, 0.80);
      assert.equal(vars.active_subscribers, 200);
      assert.equal(vars.expansion_revenue, 1200.00);
      assert.equal(vars.operating_expenses, 8000.00);

      assert.equal(parser.history.length, 0);
      assert.equal(parser.maxHistory, 100);
    });

    test('accepts custom initial options and variables', () => {
      const parser = new SaasLaunchpadFormulaParser({
        variables: {
          monthly_recurring_revenue: 25000,
          custom_kpi: 42
        },
        maxHistory: 20,
        divisionByZeroGuard: 'infinity',
        precision: 2
      });

      const vars = parser.getVariables();
      assert.equal(vars.monthly_recurring_revenue, 25000);
      assert.equal(vars.custom_kpi, 42);
      assert.equal(vars.churn_rate, 0.04); // Default retained
      assert.equal(parser.maxHistory, 20);
      assert.equal(parser.options.divisionByZeroGuard, 'infinity');
      assert.equal(parser.options.precision, 2);
    });

    test('getVariable, setVariable, setVariables, and resetVariables work as expected', () => {
      const parser = new SaasLaunchpadFormulaParser();
      assert.equal(parser.getVariable('churn_rate'), 0.04);

      parser.setVariable('churn_rate', 0.02);
      assert.equal(parser.getVariable('churn_rate'), 0.02);

      assert.throws(() => parser.setVariable('churn_rate', 'invalid_num'), /must be a finite number/);

      parser.setVariables({
        monthly_recurring_revenue: 30000,
        expansion_revenue: 2500
      });
      assert.equal(parser.getVariable('monthly_recurring_revenue'), 30000);
      assert.equal(parser.getVariable('expansion_revenue'), 2500);

      parser.resetVariables();
      assert.equal(parser.getVariable('churn_rate'), 0.04);
      assert.equal(parser.getVariable('monthly_recurring_revenue'), 15000.00);
    });

    test('exports and retrieves all 6 standard SaaS KPI presets', () => {
      const parser = new SaasLaunchpadFormulaParser();
      const presets = parser.getPresets();
      assert.equal(presets.length, 6);

      const expectedIds = ['ltv', 'ltv_cac_ratio', 'net_mrr_growth', 'net_monthly_profit', 'cac_payback_period', 'arr'];
      for (const id of expectedIds) {
        const found = parser.getPreset(id);
        assert.ok(found, `Preset ${id} should exist`);
        assert.ok(found.formula.length > 0);
      }

      assert.equal(parser.getPreset('non_existent'), null);
    });
  });

  // 2. Expression tokenization
  describe('2. Expression tokenization', () => {
    test('tokenizes integers, floating-point decimals, and scientific notation', () => {
      const parser = new SaasLaunchpadFormulaParser();
      const tokens = parser.tokenize('100 + 45.67 * .85 - 1e4 + 2.5e-3 / 1.2E+2');

      const numbers = tokens.filter((t) => t.type === 'number');
      assert.equal(numbers.length, 6);
      assert.equal(numbers[0].value, 100);
      assert.equal(numbers[1].value, 45.67);
      assert.equal(numbers[2].value, 0.85);
      assert.equal(numbers[3].value, 10000);
      assert.equal(numbers[4].value, 0.0025);
      assert.equal(numbers[5].value, 120);
    });

    test('tokenizes variables and identifiers', () => {
      const parser = new SaasLaunchpadFormulaParser();
      const tokens = parser.tokenize('monthly_recurring_revenue + expansion_revenue');

      assert.equal(tokens.length, 3);
      assert.equal(tokens[0].type, 'variable');
      assert.equal(tokens[0].value, 'monthly_recurring_revenue');
      assert.equal(tokens[1].type, 'operator');
      assert.equal(tokens[1].value, '+');
      assert.equal(tokens[2].type, 'variable');
      assert.equal(tokens[2].value, 'expansion_revenue');
    });

    test('distinguishes unary plus and minus from binary operators', () => {
      const parser = new SaasLaunchpadFormulaParser();

      // Leading unary
      const t1 = parser.tokenize('-5 + +3');
      assert.equal(t1[0].type, 'operator');
      assert.equal(t1[0].value, 'u-');
      assert.equal(t1[0].unary, true);
      assert.equal(t1[2].type, 'operator');
      assert.equal(t1[2].value, '+');
      assert.equal(t1[2].unary, false);
      assert.equal(t1[3].type, 'operator');
      assert.equal(t1[3].value, 'u+');
      assert.equal(t1[3].unary, true);

      // Unary following binary operator
      const t2 = parser.tokenize('2 * -3');
      assert.equal(t2[1].value, '*');
      assert.equal(t2[1].unary, false);
      assert.equal(t2[2].value, 'u-');
      assert.equal(t2[2].unary, true);

      // Unary inside parentheses
      const t3 = parser.tokenize('(-churn_rate)');
      assert.equal(t3[1].value, 'u-');
      assert.equal(t3[1].unary, true);
    });

    test('tokenizes functions and arguments with commas', () => {
      const parser = new SaasLaunchpadFormulaParser();
      const tokens = parser.tokenize('pow(min(10, 20), 2) + sqrt(16)');

      const fns = tokens.filter((t) => t.type === 'function');
      assert.equal(fns.length, 3);
      assert.equal(fns[0].value, 'pow');
      assert.equal(fns[1].value, 'min');
      assert.equal(fns[2].value, 'sqrt');

      const commas = tokens.filter((t) => t.type === 'comma');
      assert.equal(commas.length, 2);
    });

    test('throws on unexpected invalid characters', () => {
      const parser = new SaasLaunchpadFormulaParser();
      assert.throws(() => parser.tokenize('100 + $50'), /Unexpected character.*"\$"/);
      assert.throws(() => parser.tokenize('foo @ bar'), /Unexpected character.*"@"/);
      assert.throws(() => parser.tokenize('10 & 20'), /Unexpected character.*"&"/);
    });
  });

  // 3. Syntax validation
  describe('3. Syntax validation', () => {
    test('validates correct mathematical expressions successfully', () => {
      const parser = new SaasLaunchpadFormulaParser();
      assert.equal(parser.validateSyntax('2 + 3 * 4').valid, true);
      assert.equal(parser.validateSyntax('(average_revenue_per_user * gross_margin_rate) / churn_rate').valid, true);
      assert.equal(parser.validateSyntax('sqrt(100) + pow(2, 3)').valid, true);
      assert.equal(parser.validateSyntax('-5 * (-churn_rate + 2)').valid, true);
    });

    test('detects empty and whitespace-only expressions', () => {
      const parser = new SaasLaunchpadFormulaParser();
      const res1 = parser.validateSyntax('');
      assert.equal(res1.valid, false);
      assert.match(res1.error, /cannot be empty/);

      const res2 = parser.validateSyntax('   ');
      assert.equal(res2.valid, false);
      assert.match(res2.error, /cannot be empty/);
    });

    test('detects unbalanced or mismatched parentheses', () => {
      const parser = new SaasLaunchpadFormulaParser();
      const r1 = parser.validateSyntax('(2 + 3');
      assert.equal(r1.valid, false);
      assert.match(r1.error, /Unclosed opening parenthesis/);

      const r2 = parser.validateSyntax('2 + 3)');
      assert.equal(r2.valid, false);
      assert.match(r2.error, /Mismatched closing parenthesis/);

      const r3 = parser.validateSyntax(') 2 + 3 (');
      assert.equal(r3.valid, false);
      assert.match(r3.error, /Mismatched closing parenthesis/);
    });

    test('detects empty parentheses', () => {
      const parser = new SaasLaunchpadFormulaParser();
      const res = parser.validateSyntax('2 + () + 3');
      assert.equal(res.valid, false);
      assert.match(res.error, /Empty parentheses/);
    });

    test('detects consecutive binary operators', () => {
      const parser = new SaasLaunchpadFormulaParser();
      const r1 = parser.validateSyntax('5 + * 3');
      assert.equal(r1.valid, false);
      assert.match(r1.error, /Consecutive operators/);

      const r2 = parser.validateSyntax('10 / / 2');
      assert.equal(r2.valid, false);
      assert.match(r2.error, /Consecutive operators/);
    });

    test('detects missing leading or trailing operands', () => {
      const parser = new SaasLaunchpadFormulaParser();
      const r1 = parser.validateSyntax('* 5 + 3');
      assert.equal(r1.valid, false);
      assert.match(r1.error, /cannot begin with binary operator/);

      const r2 = parser.validateSyntax('5 + 3 -');
      assert.equal(r2.valid, false);
      assert.match(r2.error, /cannot end with dangling operator/);
    });

    test('detects function syntax errors', () => {
      const parser = new SaasLaunchpadFormulaParser();
      const res = parser.validateSyntax('sqrt 16 + 2');
      assert.equal(res.valid, false);
      assert.match(res.error, /must be followed by "\("/);
    });

    test('detects comma placement errors', () => {
      const parser = new SaasLaunchpadFormulaParser();
      assert.equal(parser.validateSyntax(', 5 + 2').valid, false);
      assert.equal(parser.validateSyntax('5 + 2,').valid, false);
      assert.equal(parser.validateSyntax('min(5,,6)').valid, false);
    });
  });

  // 4. Operator precedence and Shunting-Yard RPN
  describe('4. Operator precedence and Shunting-Yard RPN', () => {
    test('enforces multiplication and division over addition and subtraction', () => {
      const parser = new SaasLaunchpadFormulaParser();
      assert.equal(parser.evaluate('2 + 3 * 4'), 14);
      assert.equal(parser.evaluate('20 - 10 / 2'), 15);
      assert.equal(parser.evaluate('100 - 20 * 3 + 10 / 2'), 45);
    });

    test('enforces left-associativity of addition, subtraction, multiplication, and division', () => {
      const parser = new SaasLaunchpadFormulaParser();
      assert.equal(parser.evaluate('10 - 3 - 2'), 5); // (10 - 3) - 2 = 5
      assert.equal(parser.evaluate('100 / 10 / 2'), 5); // (100 / 10) / 2 = 5
    });

    test('enforces power operator (^) higher precedence than multiplication and right-associativity', () => {
      const parser = new SaasLaunchpadFormulaParser();
      assert.equal(parser.evaluate('2 * 3 ^ 2'), 18); // 2 * (3^2) = 18
      assert.equal(parser.evaluate('32 / 2 ^ 3'), 4);  // 32 / 8 = 4
      assert.equal(parser.evaluate('2 ^ 3 ^ 2'), 512); // 2 ^ (3^2) = 2^9 = 512
    });

    test('enforces parentheses to override standard precedence', () => {
      const parser = new SaasLaunchpadFormulaParser();
      assert.equal(parser.evaluate('(2 + 3) * 4'), 20);
      assert.equal(parser.evaluate('(2 * 3) ^ 2'), 36);
      assert.equal(parser.evaluate('100 / (10 / 2)'), 20);
    });

    test('evaluates modulo operator with multiplicative precedence', () => {
      const parser = new SaasLaunchpadFormulaParser();
      assert.equal(parser.evaluate('10 - 7 % 4'), 7); // 7 % 4 = 3, 10 - 3 = 7
      assert.equal(parser.evaluate('5 * 7 % 4'), 3);  // 35 % 4 = 3
    });

    test('evaluates unary operators correctly', () => {
      const parser = new SaasLaunchpadFormulaParser();
      assert.equal(parser.evaluate('-5 + 10'), 5);
      assert.equal(parser.evaluate('2 * -3'), -6);
      assert.equal(parser.evaluate('-(2 + 3)'), -5);
      assert.equal(parser.evaluate('+5 + -3'), 2);
      assert.equal(parser.evaluate('2 ^ -1'), 0.5);
    });
  });

  // 5. Mathematical built-in functions
  describe('5. Mathematical built-in functions', () => {
    test('evaluates sqrt, abs, round, floor, ceil', () => {
      const parser = new SaasLaunchpadFormulaParser();
      assert.equal(parser.evaluate('sqrt(16)'), 4);
      assert.equal(parser.evaluate('sqrt(0)'), 0);
      assert.equal(parser.evaluate('abs(-42)'), 42);
      assert.equal(parser.evaluate('round(4.6)'), 5);
      assert.equal(parser.evaluate('round(4.4)'), 4);
      assert.equal(parser.evaluate('round(3.14159, 2)'), 3.14);
      assert.equal(parser.evaluate('floor(4.9)'), 4);
      assert.equal(parser.evaluate('ceil(4.1)'), 5);
    });

    test('evaluates logarithms (log, log10, ln) and exponential (exp)', () => {
      const parser = new SaasLaunchpadFormulaParser();
      assert.equal(parser.evaluate('log(100)'), 2);
      assert.equal(parser.evaluate('log10(1000)'), 3);
      assert.equal(parser.evaluate('ln(e)'), 1);
      assert.equal(parser.evaluate('exp(0)'), 1);
      assert.equal(parser.evaluate('round(exp(1), 4)'), 2.7183);
    });

    test('evaluates multi-argument functions min, max, pow', () => {
      const parser = new SaasLaunchpadFormulaParser();
      assert.equal(parser.evaluate('min(10, 5, 20)'), 5);
      assert.equal(parser.evaluate('max(10, 5, 20)'), 20);
      assert.equal(parser.evaluate('pow(2, 3)'), 8);
      assert.equal(parser.evaluate('pow(10, -2)'), 0.01);
    });

    test('evaluates nested composite functions', () => {
      const parser = new SaasLaunchpadFormulaParser();
      assert.equal(parser.evaluate('sqrt(pow(3, 2) + pow(4, 2))'), 5); // sqrt(9 + 16) = 5
      assert.equal(parser.evaluate('max(sqrt(16), abs(-10))'), 10);
    });
  });

  // 6. Variable parameter injection & substitution
  describe('6. Variable parameter injection & substitution', () => {
    test('substitutes default SaaS parameters accurately', () => {
      const parser = new SaasLaunchpadFormulaParser();
      const res = parser.evaluate('monthly_recurring_revenue + expansion_revenue');
      assert.equal(res, 16200.00);
    });

    test('supports custom variable injection at evaluation time without mutating instance defaults', () => {
      const parser = new SaasLaunchpadFormulaParser();
      const customRes = parser.evaluate('monthly_recurring_revenue * 2', {
        monthly_recurring_revenue: 20000
      });
      assert.equal(customRes, 40000);

      // Verify instance defaults are unchanged
      assert.equal(parser.getVariable('monthly_recurring_revenue'), 15000.00);
    });

    test('throws when encountering undefined variables', () => {
      const parser = new SaasLaunchpadFormulaParser();
      assert.throws(
        () => parser.evaluate('monthly_recurring_revenue + mystery_metric'),
        /Variable "mystery_metric" is undefined/
      );
    });

    test('supports mathematical constants pi and e', () => {
      const parser = new SaasLaunchpadFormulaParser();
      assert.equal(parser.evaluate('round(pi, 2)'), 3.14);
      assert.equal(parser.evaluate('round(e, 2)'), 2.72);
    });
  });

  // 7. Division-by-zero guards and domain error handling
  describe('7. Division-by-zero guards and domain error handling', () => {
    test('throws on division by zero by default', () => {
      const parser = new SaasLaunchpadFormulaParser();
      assert.throws(() => parser.evaluate('100 / 0'), /Division by zero is undefined/);
      assert.throws(() => parser.evaluate('10 % 0'), /Division by zero in modulo operation/);
    });

    test('throws on zero churn_rate in LTV preset calculation', () => {
      const parser = new SaasLaunchpadFormulaParser();
      const ltvPreset = parser.getPreset('ltv');
      assert.throws(
        () => parser.evaluate(ltvPreset.formula, { churn_rate: 0 }),
        /Division by zero is undefined/
      );
    });

    test('handles divisionByZeroGuard: infinity option', () => {
      const parser = new SaasLaunchpadFormulaParser({ divisionByZeroGuard: 'infinity' });
      assert.equal(parser.evaluate('100 / 0'), Infinity);
      assert.equal(parser.evaluate('-100 / 0'), -Infinity);
      assert.ok(Number.isNaN(parser.evaluate('10 % 0')));
    });

    test('throws domain error on negative sqrt and non-positive logarithm', () => {
      const parser = new SaasLaunchpadFormulaParser();
      assert.throws(() => parser.evaluate('sqrt(-9)'), /Domain error.*Square root/);
      assert.throws(() => parser.evaluate('log(0)'), /Domain error.*Logarithm/);
      assert.throws(() => parser.evaluate('ln(-1)'), /Domain error.*Natural logarithm/);
      assert.throws(() => parser.evaluate('pow(-4, 0.5)'), /Domain error.*complex number/);
    });
  });

  // 8. Calculation audit history log
  describe('8. Calculation audit history log', () => {
    test('logs calculation entries with unique IDs, timestamps, and duration', () => {
      const parser = new SaasLaunchpadFormulaParser();
      assert.equal(parser.getHistory().length, 0);

      const res = parser.evaluate('monthly_recurring_revenue * 12');
      assert.equal(res, 180000.00);

      const history = parser.getHistory();
      assert.equal(history.length, 1);
      assert.ok(history[0].id.startsWith('calc-'));
      assert.equal(history[0].expression, 'monthly_recurring_revenue * 12');
      assert.equal(history[0].result, 180000.00);
      assert.ok(history[0].timestamp);
      assert.ok(typeof history[0].durationMs === 'number');
      assert.equal(history[0].status, 'SUCCESS');
    });

    test('retrieves record by ID and replays history correctly', () => {
      const parser = new SaasLaunchpadFormulaParser();
      parser.evaluate('2 + 3');
      const entry = parser.getHistory()[0];

      const found = parser.getHistoryById(entry.id);
      assert.deepEqual(found, entry);

      const replayed = parser.replayHistory(entry.id);
      assert.deepEqual(replayed, entry);

      assert.equal(parser.getHistoryById('non-existent'), null);
    });

    test('clears calculation history log', () => {
      const parser = new SaasLaunchpadFormulaParser();
      parser.evaluate('10 + 20');
      parser.evaluate('30 + 40');
      assert.equal(parser.getHistory().length, 2);

      parser.clearHistory();
      assert.equal(parser.getHistory().length, 0);
    });

    test('respects maxHistory bounds', () => {
      const parser = new SaasLaunchpadFormulaParser({ maxHistory: 3 });
      parser.evaluate('1 + 1');
      parser.evaluate('2 + 2');
      parser.evaluate('3 + 3');
      parser.evaluate('4 + 4');

      const history = parser.getHistory();
      assert.equal(history.length, 3);
      assert.equal(history[0].expression, '4 + 4');
    });
  });

  // 9. Event emitter (evaluate, error, historyChange)
  describe('9. Event emitter (evaluate, error, historyChange)', () => {
    test('emits "evaluate" and "historyChange" events on successful evaluation', () => {
      const parser = new SaasLaunchpadFormulaParser();
      const evaluatedEvents = [];
      const historyChangeEvents = [];

      parser.on('evaluate', (data) => evaluatedEvents.push(data));
      parser.on('historyChange', (history) => historyChangeEvents.push(history));

      parser.evaluate('15000 + 1200');

      assert.equal(evaluatedEvents.length, 1);
      assert.equal(evaluatedEvents[0].result, 16200);
      assert.equal(historyChangeEvents.length, 1);
      assert.equal(historyChangeEvents[0].length, 1);
    });

    test('emits "error" event on calculation failure', () => {
      const parser = new SaasLaunchpadFormulaParser();
      const errorEvents = [];

      parser.on('error', (errData) => errorEvents.push(errData));

      assert.throws(() => parser.evaluate('100 / 0'));
      assert.equal(errorEvents.length, 1);
      assert.equal(errorEvents[0].status, 'ERROR');
      assert.match(errorEvents[0].error, /Division by zero/);
    });

    test('unsubscribes listeners cleanly via returned unsubscribe function and off()', () => {
      const parser = new SaasLaunchpadFormulaParser();
      let callCount = 0;

      const unsub = parser.on('evaluate', () => {
        callCount++;
      });

      parser.evaluate('1 + 1');
      assert.equal(callCount, 1);

      unsub();
      parser.evaluate('2 + 2');
      assert.equal(callCount, 1); // No additional call after unsubscribe

      // Test off()
      const handler = () => { callCount += 10; };
      parser.on('evaluate', handler);
      parser.evaluate('3 + 3');
      assert.equal(callCount, 11);

      parser.off('evaluate', handler);
      parser.evaluate('4 + 4');
      assert.equal(callCount, 11);
    });
  });

  // 10. All 6 KPI Presets Evaluations
  describe('10. All 6 KPI Presets Evaluations', () => {
    const parser = new SaasLaunchpadFormulaParser();

    test('Preset 1: Customer Lifetime Value (LTV)', () => {
      const preset = parser.getPreset('ltv');
      assert.ok(preset);
      assert.equal(preset.formula, '(average_revenue_per_user * gross_margin_rate) / churn_rate');

      // (75.00 * 0.80) / 0.04 = 60.00 / 0.04 = 1500.00
      const result = parser.evaluate(preset.formula);
      assert.equal(result, 1500.00);
    });

    test('Preset 2: LTV to CAC Ratio', () => {
      const preset = parser.getPreset('ltv_cac_ratio');
      assert.ok(preset);
      assert.equal(preset.formula, '((average_revenue_per_user * gross_margin_rate) / churn_rate) / customer_acquisition_cost');

      // 1500.00 / 250.00 = 6.0
      const result = parser.evaluate(preset.formula);
      assert.equal(result, 6.0);
    });

    test('Preset 3: Net MRR Growth', () => {
      const preset = parser.getPreset('net_mrr_growth');
      assert.ok(preset);
      assert.equal(preset.formula, 'monthly_recurring_revenue + expansion_revenue - (monthly_recurring_revenue * churn_rate)');

      // 15000 + 1200 - (15000 * 0.04) = 16200 - 600 = 15600.00
      const result = parser.evaluate(preset.formula);
      assert.equal(result, 15600.00);
    });

    test('Preset 4: Net Monthly Profit', () => {
      const preset = parser.getPreset('net_monthly_profit');
      assert.ok(preset);
      assert.equal(preset.formula, '(monthly_recurring_revenue + expansion_revenue) - operating_expenses');

      // (15000 + 1200) - 8000 = 16200 - 8000 = 8200.00
      const result = parser.evaluate(preset.formula);
      assert.equal(result, 8200.00);
    });

    test('Preset 5: CAC Payback Period', () => {
      const preset = parser.getPreset('cac_payback_period');
      assert.ok(preset);
      assert.equal(preset.formula, 'customer_acquisition_cost / (average_revenue_per_user * gross_margin_rate)');

      // 250.00 / (75.00 * 0.80) = 250 / 60 = 4.166666666666667
      const result = parser.evaluate(preset.formula);
      assert.ok(Math.abs(result - (250 / 60)) < 1e-9);
    });

    test('Preset 6: Annual Run Rate (ARR)', () => {
      const preset = parser.getPreset('arr');
      assert.ok(preset);
      assert.equal(preset.formula, '(monthly_recurring_revenue + expansion_revenue) * 12');

      // (15000 + 1200) * 12 = 16200 * 12 = 194400.00
      const result = parser.evaluate(preset.formula);
      assert.equal(result, 194400.00);
    });

    test('Evaluates presets under adjusted SaaS parameters', () => {
      // Test adjusted parameters: higher ARPU ($100), lower churn (2%), higher CAC ($300)
      const modifiedVars = {
        average_revenue_per_user: 100.00,
        gross_margin_rate: 0.85,
        churn_rate: 0.02,
        customer_acquisition_cost: 300.00
      };

      // Adjusted LTV: (100 * 0.85) / 0.02 = 85 / 0.02 = 4250.00
      const ltvPreset = parser.getPreset('ltv');
      assert.equal(parser.evaluate(ltvPreset.formula, modifiedVars), 4250.00);

      // Adjusted LTV:CAC Ratio: 4250 / 300 = 14.166666666666666
      const ltvCacPreset = parser.getPreset('ltv_cac_ratio');
      const ratio = parser.evaluate(ltvCacPreset.formula, modifiedVars);
      assert.ok(Math.abs(ratio - (4250 / 300)) < 1e-9);

      // Adjusted CAC payback: 300 / (100 * 0.85) = 300 / 85 = 3.5294117647058822
      const paybackPreset = parser.getPreset('cac_payback_period');
      const payback = parser.evaluate(paybackPreset.formula, modifiedVars);
      assert.ok(Math.abs(payback - (300 / 85)) < 1e-9);
    });
  });
});
