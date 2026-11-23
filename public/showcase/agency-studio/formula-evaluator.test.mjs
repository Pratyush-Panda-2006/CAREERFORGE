import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AgencyStudioFormulaParser } from './formula-evaluator.js';

describe('AgencyStudioFormulaParser', () => {
  // ================= 1. Initialization =================
  describe('Initialization', () => {
    it('instantiates correctly with proper name, operators, functions, and presets', () => {
      const parser = new AgencyStudioFormulaParser();
      assert.equal(parser.name, 'AgencyStudioFormulaParser');

      // Check operators
      assert.ok(parser.operators['+']);
      assert.ok(parser.operators['-']);
      assert.ok(parser.operators['*']);
      assert.ok(parser.operators['/']);
      assert.ok(parser.operators['%']);
      assert.ok(parser.operators['^']);

      // Check functions
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

      // Check default variables
      assert.equal(parser.defaultVariables.hourly_rate, 125.0);
      assert.equal(parser.defaultVariables.billable_hours, 160);
      assert.equal(parser.defaultVariables.overhead_cost, 4500.0);
      assert.equal(parser.defaultVariables.project_retainer, 25000.0);
      assert.equal(parser.defaultVariables.team_utilization_rate, 0.85);
      assert.equal(parser.defaultVariables.client_acquisition_cost, 1200.0);
      assert.equal(parser.defaultVariables.project_margin_rate, 0.35);
      assert.equal(parser.defaultVariables.contract_value, 50000.0);
      assert.equal(parser.defaultVariables.campaign_budget, 15000.0);
      assert.equal(parser.defaultVariables.roas, 4.2);

      // Check presets
      assert.ok(parser.presets.gross_revenue);
      assert.ok(parser.presets.net_profit);
      assert.ok(parser.presets.profit_margin_ratio);
      assert.ok(parser.presets.client_roi);
      assert.ok(parser.presets.campaign_yield);
      assert.ok(parser.presets.effective_hourly_yield);

      // History starts empty
      assert.deepEqual(parser.getHistory(), []);
    });
  });

  // ================= 2. Tokenization =================
  describe('Tokenization', () => {
    it('tokenizes integers, floating-point numbers, and scientific notation', () => {
      const parser = new AgencyStudioFormulaParser();

      const tokens = parser.tokenize('125 + 0.85 * .5 - 1e4 / 2.5e-3');
      assert.equal(tokens[0].value, 125);
      assert.equal(tokens[0].type, 'number');
      assert.equal(tokens[2].value, 0.85);
      assert.equal(tokens[4].value, 0.5);
      assert.equal(tokens[6].value, 10000);
      assert.equal(tokens[8].value, 0.0025);
    });

    it('tokenizes variables, functions, commas, and parentheses', () => {
      const parser = new AgencyStudioFormulaParser();

      const tokens = parser.tokenize('max(hourly_rate, 150) * sqrt(billable_hours)');
      assert.equal(tokens[0].type, 'function');
      assert.equal(tokens[0].value, 'max');
      assert.equal(tokens[1].type, 'paren');
      assert.equal(tokens[1].value, '(');
      assert.equal(tokens[2].type, 'variable');
      assert.equal(tokens[2].value, 'hourly_rate');
      assert.equal(tokens[3].type, 'comma');
      assert.equal(tokens[4].type, 'number');
      assert.equal(tokens[4].value, 150);
      assert.equal(tokens[5].type, 'paren');
      assert.equal(tokens[5].value, ')');
      assert.equal(tokens[6].type, 'operator');
      assert.equal(tokens[6].value, '*');
      assert.equal(tokens[7].type, 'function');
      assert.equal(tokens[7].value, 'sqrt');
    });

    it('identifies unary minus and unary plus operators accurately', () => {
      const parser = new AgencyStudioFormulaParser();

      const tokens = parser.tokenize('-10 + -2 * +5');
      assert.equal(tokens[0].value, 'u-');
      assert.equal(tokens[0].unary, true);
      assert.equal(tokens[3].value, 'u-');
      assert.equal(tokens[3].unary, true);
      assert.equal(tokens[6].value, 'u+');
      assert.equal(tokens[6].unary, true);
    });

    it('throws error for unexpected characters', () => {
      const parser = new AgencyStudioFormulaParser();
      assert.throws(() => parser.tokenize('100 $ 20'), /Unexpected character.*"\$"/);
      assert.throws(() => parser.tokenize('50 @ 2'), /Unexpected character.*"@"/);
    });
  });

  // ================= 3. Syntax Validation =================
  describe('Syntax Validation', () => {
    it('validates correct expressions successfully', () => {
      const parser = new AgencyStudioFormulaParser();

      assert.equal(parser.validateSyntax('hourly_rate * billable_hours').valid, true);
      assert.equal(parser.validateSyntax('(2 + 3) * (4 - 1)').valid, true);
      assert.equal(parser.validateSyntax('sqrt(16) + abs(-5)').valid, true);
      assert.equal(parser.validateSyntax('pow(2, 3) + min(10, 20)').valid, true);
      assert.equal(parser.validateSyntax('-hourly_rate * 2').valid, true);
      assert.equal(parser.validateSyntax('10 * -5').valid, true);
    });

    it('detects empty or invalid expressions', () => {
      const parser = new AgencyStudioFormulaParser();

      assert.equal(parser.validateSyntax('').valid, false);
      assert.equal(parser.validateSyntax('   ').valid, false);
      assert.equal(parser.validateSyntax(null).valid, false);
    });

    it('detects unclosed and mismatched parentheses', () => {
      const parser = new AgencyStudioFormulaParser();

      assert.equal(parser.validateSyntax('(2 + 3').valid, false);
      assert.equal(parser.validateSyntax('2 + 3)').valid, false);
      assert.equal(parser.validateSyntax('((2 + 3) * 4').valid, false);
    });

    it('detects empty parentheses and misplaced operators', () => {
      const parser = new AgencyStudioFormulaParser();

      assert.equal(parser.validateSyntax('()').valid, false);
      assert.equal(parser.validateSyntax('2 + ()').valid, false);
      assert.equal(parser.validateSyntax('2 + * 3').valid, false);
      assert.equal(parser.validateSyntax('2 * / 3').valid, false);
      assert.equal(parser.validateSyntax('2 +').valid, false);
      assert.equal(parser.validateSyntax('* 2').valid, false);
      assert.equal(parser.validateSyntax('( * 2 )').valid, false);
      assert.equal(parser.validateSyntax('sqrt 16').valid, false);
    });
  });

  // ================= 4. Operator Precedence & Associativity =================
  describe('Operator Precedence & Associativity', () => {
    it('respects standard BODMAS / PEMDAS precedence rules', () => {
      const parser = new AgencyStudioFormulaParser();

      // Multiplication before addition: 2 + (3 * 4) = 14
      assert.equal(parser.evaluate('2 + 3 * 4'), 14);

      // Parentheses override: (2 + 3) * 4 = 20
      assert.equal(parser.evaluate('(2 + 3) * 4'), 20);

      // Exponentiation before multiplication: (2 ^ 3) * 2 = 16
      assert.equal(parser.evaluate('2 ^ 3 * 2'), 16);

      // Modulo has same precedence as multiplication and division
      assert.equal(parser.evaluate('10 + 20 % 6 * 2'), 14); // 20 % 6 = 2, 2 * 2 = 4, 10 + 4 = 14

      // Left-associative subtraction & addition: (10 - 4) + 2 = 8
      assert.equal(parser.evaluate('10 - 4 + 2'), 8);

      // Left-associative division: (24 / 4) / 2 = 3
      assert.equal(parser.evaluate('24 / 4 / 2'), 3);
    });

    it('implements right-associative exponentiation', () => {
      const parser = new AgencyStudioFormulaParser();

      // 2 ^ 3 ^ 2 should be 2 ^ (3 ^ 2) = 2 ^ 9 = 512
      assert.equal(parser.evaluate('2 ^ 3 ^ 2'), 512);

      // With explicit grouping: (2 ^ 3) ^ 2 = 8 ^ 2 = 64
      assert.equal(parser.evaluate('(2 ^ 3) ^ 2'), 64);
    });

    it('evaluates unary minus and plus operations properly', () => {
      const parser = new AgencyStudioFormulaParser();

      assert.equal(parser.evaluate('-5 + 10'), 5);
      assert.equal(parser.evaluate('10 * -2'), -20);
      assert.equal(parser.evaluate('-(5 + 5)'), -10);
      assert.equal(parser.evaluate('1 - -2'), 3);
      assert.equal(parser.evaluate('+5 + +3'), 8);
    });
  });

  // ================= 5. Built-in Mathematical Functions =================
  describe('Built-in Functions', () => {
    it('evaluates single-argument functions correctly', () => {
      const parser = new AgencyStudioFormulaParser();

      assert.equal(parser.evaluate('sqrt(16)'), 4);
      assert.equal(parser.evaluate('abs(-42)'), 42);
      assert.equal(parser.evaluate('round(3.6)'), 4);
      assert.equal(parser.evaluate('floor(3.9)'), 3);
      assert.equal(parser.evaluate('ceil(3.1)'), 4);
      assert.equal(parser.evaluate('exp(0)'), 1);
      assert.equal(parser.evaluate('log(100)'), 2);
      assert.equal(Math.round(parser.evaluate('ln(exp(1))')), 1);
    });

    it('evaluates two-argument functions correctly', () => {
      const parser = new AgencyStudioFormulaParser();

      assert.equal(parser.evaluate('min(15, 8)'), 8);
      assert.equal(parser.evaluate('max(15, 8)'), 15);
      assert.equal(parser.evaluate('pow(2, 5)'), 32);
    });

    it('evaluates nested functions and complex combinations', () => {
      const parser = new AgencyStudioFormulaParser();

      // Pythagorean hypotenuse: sqrt(3^2 + 4^2) = 5
      assert.equal(parser.evaluate('sqrt(pow(3, 2) + pow(4, 2))'), 5);

      // max(sqrt(64), min(10, 20)) = max(8, 10) = 10
      assert.equal(parser.evaluate('max(sqrt(64), min(10, 20))'), 10);
    });
  });

  // ================= 6. Variable Substitution =================
  describe('Variable Substitution', () => {
    it('uses default Agency Studio variables when not overridden', () => {
      const parser = new AgencyStudioFormulaParser();

      // hourly_rate is 125, billable_hours is 160
      assert.equal(parser.evaluate('hourly_rate * 2'), 250);
      assert.equal(parser.evaluate('billable_hours / 2'), 80);
    });

    it('accepts custom variable overrides', () => {
      const parser = new AgencyStudioFormulaParser();

      const result = parser.evaluate('hourly_rate * billable_hours', {
        hourly_rate: 200,
        billable_hours: 50
      });
      assert.equal(result, 10000);
    });

    it('throws error for undefined variables', () => {
      const parser = new AgencyStudioFormulaParser();

      assert.throws(
        () => parser.evaluate('hourly_rate + undefined_variable'),
        /Variable "undefined_variable" is undefined/
      );
    });

    it('throws error for non-numeric variable values', () => {
      const parser = new AgencyStudioFormulaParser();

      assert.throws(
        () => parser.evaluate('hourly_rate', { hourly_rate: 'invalid_number' }),
        /must be a finite numeric value/
      );
    });
  });

  // ================= 7. Division-by-Zero and Domain Guards =================
  describe('Division-by-Zero and Domain Guards', () => {
    it('guards against literal division and modulo by zero', () => {
      const parser = new AgencyStudioFormulaParser();

      assert.throws(() => parser.evaluate('42 / 0'), /Division by zero is undefined/);
      assert.throws(() => parser.evaluate('25 % 0'), /Division by zero in modulo operation/);
    });

    it('guards against dynamic zero denominators', () => {
      const parser = new AgencyStudioFormulaParser();

      assert.throws(
        () => parser.evaluate('100 / (billable_hours - 160)'),
        /Division by zero is undefined/
      );
    });

    it('guards against invalid mathematical domain operations', () => {
      const parser = new AgencyStudioFormulaParser();

      assert.throws(() => parser.evaluate('sqrt(-9)'), /Square root of negative number is undefined/);
      assert.throws(() => parser.evaluate('log(0)'), /Logarithm of non-positive number is undefined/);
      assert.throws(() => parser.evaluate('log(-5)'), /Logarithm of non-positive number is undefined/);
      assert.throws(() => parser.evaluate('ln(0)'), /Natural logarithm of non-positive number is undefined/);
    });
  });

  // ================= 8. Calculation Audit History =================
  describe('Calculation Audit History', () => {
    it('records calculation history entries with IDs and timestamps', () => {
      const parser = new AgencyStudioFormulaParser();

      assert.equal(parser.getHistory().length, 0);

      parser.evaluate('hourly_rate * 2');
      const history = parser.getHistory();

      assert.equal(history.length, 1);
      assert.ok(history[0].id.startsWith('kpi_'));
      assert.ok(history[0].timestamp);
      assert.equal(history[0].expression, 'hourly_rate * 2');
      assert.equal(history[0].result, 250);
      assert.equal(history[0].formattedResult, '250');
    });

    it('clears history log on clearHistory()', () => {
      const parser = new AgencyStudioFormulaParser();

      parser.evaluate('10 + 20');
      parser.evaluate('30 + 40');
      assert.equal(parser.getHistory().length, 2);

      parser.clearHistory();
      assert.equal(parser.getHistory().length, 0);
    });

    it('respects history limit configuration', () => {
      const parser = new AgencyStudioFormulaParser({ historyLimit: 3 });

      parser.evaluate('1 + 1');
      parser.evaluate('2 + 2');
      parser.evaluate('3 + 3');
      parser.evaluate('4 + 4');

      const history = parser.getHistory();
      assert.equal(history.length, 3);
      assert.equal(history[0].result, 8); // Most recent first
    });
  });

  // ================= 9. Event Emitter Pattern =================
  describe('Event Emitter Pattern', () => {
    it('emits evaluate event with computation payload', () => {
      const parser = new AgencyStudioFormulaParser();
      let eventPayload = null;

      parser.on('evaluate', (data) => {
        eventPayload = data;
      });

      parser.evaluate('5 * 6');
      assert.ok(eventPayload);
      assert.equal(eventPayload.result, 30);
      assert.equal(eventPayload.expression, '5 * 6');
    });

    it('emits error event on evaluation failure', () => {
      const parser = new AgencyStudioFormulaParser();
      let errorEmitted = null;

      parser.on('error', (err) => {
        errorEmitted = err;
      });

      assert.throws(() => parser.evaluate('100 / 0'));
      assert.ok(errorEmitted);
      assert.match(errorEmitted.message, /Division by zero/);
    });

    it('emits historyChange and allows unsubscription', () => {
      const parser = new AgencyStudioFormulaParser();
      let callCount = 0;

      const unsubscribe = parser.on('historyChange', () => {
        callCount++;
      });

      parser.evaluate('2 + 2');
      assert.equal(callCount, 1);

      unsubscribe();
      parser.evaluate('3 + 3');
      assert.equal(callCount, 1); // Not incremented after unsubscribe
    });
  });

  // ================= 10. Agency Studio Preset Evaluations =================
  describe('Agency Studio Presets', () => {
    it('evaluates Gross Agency Revenue preset to 17,000.00', () => {
      const parser = new AgencyStudioFormulaParser();
      // hourly_rate(125) * billable_hours(160) * team_utilization_rate(0.85)
      const res = parser.evaluatePreset('gross_revenue');
      assert.equal(res, 17000.0);
    });

    it('evaluates Net Agency Profit preset to 12,500.00', () => {
      const parser = new AgencyStudioFormulaParser();
      // (125 * 160 * 0.85) - overhead_cost(4500) = 17000 - 4500 = 12500
      const res = parser.evaluatePreset('net_profit');
      assert.equal(res, 12500.0);
    });

    it('evaluates Profit Margin Ratio (%) preset to 82.00%', () => {
      const parser = new AgencyStudioFormulaParser();
      // ((project_retainer(25000) - overhead_cost(4500)) / 25000) * 100 = (20500 / 25000) * 100 = 82
      const res = parser.evaluatePreset('profit_margin_ratio');
      assert.equal(res, 82.0);
    });

    it('evaluates Client ROI Multiplier preset correctly', () => {
      const parser = new AgencyStudioFormulaParser();
      // (contract_value(50000) * project_margin_rate(0.35)) / client_acquisition_cost(1200) = 17500 / 1200 = 14.5833...
      const res = parser.evaluatePreset('client_roi');
      assert.equal(res, (50000 * 0.35) / 1200);
    });

    it('evaluates Campaign Yield preset to 63,000.00', () => {
      const parser = new AgencyStudioFormulaParser();
      // campaign_budget(15000) * roas(4.2) = 63000
      const res = parser.evaluatePreset('campaign_yield');
      assert.equal(res, 63000.0);
    });

    it('evaluates Effective Hourly Yield preset correctly', () => {
      const parser = new AgencyStudioFormulaParser();
      // (project_retainer(25000) - overhead_cost(4500)) / (billable_hours(160) * team_utilization_rate(0.85))
      // = 20500 / 136 = 150.735294...
      const res = parser.evaluatePreset('effective_hourly_yield');
      assert.equal(res, 20500 / (160 * 0.85));
    });
  });
});
