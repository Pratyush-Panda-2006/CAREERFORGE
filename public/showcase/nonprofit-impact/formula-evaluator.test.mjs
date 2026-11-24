import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NonprofitImpactFormulaParser } from './formula-evaluator.js';

describe('NonprofitImpactFormulaParser', () => {
  // ================= 1. Initialization and Configuration =================
  describe('Initialization and Configuration', () => {
    it('instantiates correctly with proper name, operators, functions, and presets', () => {
      const parser = new NonprofitImpactFormulaParser();
      assert.equal(parser.name, 'NonprofitImpactFormulaParser');

      // Operators
      assert.ok(parser.operators['+']);
      assert.ok(parser.operators['-']);
      assert.ok(parser.operators['*']);
      assert.ok(parser.operators['/']);
      assert.ok(parser.operators['%']);
      assert.ok(parser.operators['^']);
      assert.ok(parser.operators['u-']);
      assert.ok(parser.operators['u+']);

      // Functions
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

      // Default Non-profit philanthropy variables
      assert.equal(parser.defaultVariables.total_donations, 250000.0);
      assert.equal(parser.defaultVariables.program_expenses, 210000.0);
      assert.equal(parser.defaultVariables.fundraising_expenses, 25000.0);
      assert.equal(parser.defaultVariables.administrative_expenses, 15000.0);
      assert.equal(parser.defaultVariables.beneficiaries_served, 4500);
      assert.equal(parser.defaultVariables.volunteer_hours, 1200);
      assert.equal(parser.defaultVariables.volunteer_value_per_hour, 28.5);

      // Presets
      assert.ok(parser.presets.program_efficiency);
      assert.ok(parser.presets.fundraising_efficiency);
      assert.ok(parser.presets.cost_per_beneficiary);
      assert.ok(parser.presets.social_return_value);
      assert.ok(parser.presets.overhead_burden);
      assert.ok(parser.presets.sroi);

      // Audit history starts empty
      assert.deepEqual(parser.getHistory(), []);
    });

    it('accepts custom constructor options', () => {
      const parser = new NonprofitImpactFormulaParser({
        historyLimit: 25,
        divisionByZeroGuard: 'infinity',
        precision: 2
      });
      assert.equal(parser.historyLimit, 25);
      assert.equal(parser.options.divisionByZeroGuard, 'infinity');
      assert.equal(parser.options.precision, 2);
    });
  });

  // ================= 2. Expression Tokenization =================
  describe('Expression Tokenization', () => {
    it('tokenizes integers, floating-point numbers, and scientific notation', () => {
      const parser = new NonprofitImpactFormulaParser();
      const tokens = parser.tokenize('250000 + 28.50 * .5 - 1e4 / 2.5e-3');

      assert.equal(tokens[0].value, 250000);
      assert.equal(tokens[0].type, 'number');
      assert.equal(tokens[2].value, 28.5);
      assert.equal(tokens[4].value, 0.5);
      assert.equal(tokens[6].value, 10000);
      assert.equal(tokens[8].value, 0.0025);
    });

    it('tokenizes non-profit variables, functions, commas, and parentheses', () => {
      const parser = new NonprofitImpactFormulaParser();
      const tokens = parser.tokenize('max(total_donations, 300000) * sqrt(volunteer_hours)');

      assert.equal(tokens[0].type, 'function');
      assert.equal(tokens[0].value, 'max');
      assert.equal(tokens[1].type, 'paren');
      assert.equal(tokens[1].value, '(');
      assert.equal(tokens[2].type, 'variable');
      assert.equal(tokens[2].value, 'total_donations');
      assert.equal(tokens[3].type, 'comma');
      assert.equal(tokens[4].type, 'number');
      assert.equal(tokens[4].value, 300000);
      assert.equal(tokens[5].type, 'paren');
      assert.equal(tokens[5].value, ')');
      assert.equal(tokens[6].type, 'operator');
      assert.equal(tokens[6].value, '*');
      assert.equal(tokens[7].type, 'function');
      assert.equal(tokens[7].value, 'sqrt');
    });

    it('identifies unary minus and unary plus operators accurately', () => {
      const parser = new NonprofitImpactFormulaParser();
      const tokens = parser.tokenize('-10 + -2 * +5');

      assert.equal(tokens[0].value, 'u-');
      assert.equal(tokens[0].unary, true);
      assert.equal(tokens[3].value, 'u-');
      assert.equal(tokens[3].unary, true);
      assert.equal(tokens[6].value, 'u+');
      assert.equal(tokens[6].unary, true);
    });

    it('throws error for unexpected characters', () => {
      const parser = new NonprofitImpactFormulaParser();
      assert.throws(() => parser.tokenize('250000 $ 20'), /Unexpected character.*"\$"/);
      assert.throws(() => parser.tokenize('1000 @ 5'), /Unexpected character.*"@"/);
    });
  });

  // ================= 3. Syntax Validation =================
  describe('Syntax Validation', () => {
    it('validates syntactically correct expressions successfully', () => {
      const parser = new NonprofitImpactFormulaParser();

      assert.equal(parser.validateSyntax('program_expenses / total_donations * 100').valid, true);
      assert.equal(parser.validateSyntax('(program_expenses + 5000) * (2 - 1)').valid, true);
      assert.equal(parser.validateSyntax('sqrt(1600) + abs(-50)').valid, true);
      assert.equal(parser.validateSyntax('pow(2, 4) + min(10, 20)').valid, true);
      assert.equal(parser.validateSyntax('-program_expenses * 2').valid, true);
      assert.equal(parser.validateSyntax('10 * -5').valid, true);
    });

    it('detects empty or whitespace-only expressions', () => {
      const parser = new NonprofitImpactFormulaParser();

      assert.equal(parser.validateSyntax('').valid, false);
      assert.equal(parser.validateSyntax('   ').valid, false);
      assert.equal(parser.validateSyntax(null).valid, false);
    });

    it('detects unclosed and mismatched parentheses', () => {
      const parser = new NonprofitImpactFormulaParser();

      assert.equal(parser.validateSyntax('(2 + 3').valid, false);
      assert.equal(parser.validateSyntax('2 + 3)').valid, false);
      assert.equal(parser.validateSyntax('((2 + 3) * 4').valid, false);
    });

    it('detects empty parentheses and misplaced operators', () => {
      const parser = new NonprofitImpactFormulaParser();

      assert.equal(parser.validateSyntax('()').valid, false);
      assert.equal(parser.validateSyntax('2 + ()').valid, false);
      assert.equal(parser.validateSyntax('2 + * 3').valid, false);
      assert.equal(parser.validateSyntax('2 * / 3').valid, false);
      assert.equal(parser.validateSyntax('2 +').valid, false);
      assert.equal(parser.validateSyntax('* 2').valid, false);
      assert.equal(parser.validateSyntax('( * 2 )').valid, false);
      assert.equal(parser.validateSyntax('( 2 + )').valid, false);
      assert.equal(parser.validateSyntax('sqrt 16').valid, false);
    });
  });

  // ================= 4. Operator Precedence & Associativity =================
  describe('Operator Precedence & Associativity', () => {
    it('respects standard BODMAS / PEMDAS precedence rules', () => {
      const parser = new NonprofitImpactFormulaParser();

      // Multiplication before addition: 2 + (3 * 4) = 14
      assert.equal(parser.evaluate('2 + 3 * 4'), 14);

      // Parentheses override: (2 + 3) * 4 = 20
      assert.equal(parser.evaluate('(2 + 3) * 4'), 20);

      // Exponentiation before multiplication: (2 ^ 3) * 2 = 16
      assert.equal(parser.evaluate('2 ^ 3 * 2'), 16);

      // Modulo has same precedence as multiplication and division
      assert.equal(parser.evaluate('10 + 20 % 6 * 2'), 14);

      // Left-associative subtraction & addition: (10 - 4) + 2 = 8
      assert.equal(parser.evaluate('10 - 4 + 2'), 8);

      // Left-associative division: (24 / 4) / 2 = 3
      assert.equal(parser.evaluate('24 / 4 / 2'), 3);
    });

    it('implements right-associative exponentiation', () => {
      const parser = new NonprofitImpactFormulaParser();

      // 2 ^ 3 ^ 2 = 2 ^ (3 ^ 2) = 2 ^ 9 = 512
      assert.equal(parser.evaluate('2 ^ 3 ^ 2'), 512);

      // Grouped left exponentiation: (2 ^ 3) ^ 2 = 64
      assert.equal(parser.evaluate('(2 ^ 3) ^ 2'), 64);
    });

    it('evaluates unary minus and plus operations properly', () => {
      const parser = new NonprofitImpactFormulaParser();

      assert.equal(parser.evaluate('-5 + 10'), 5);
      assert.equal(parser.evaluate('10 * -2'), -20);
      assert.equal(parser.evaluate('-(5 + 5)'), -10);
      assert.equal(parser.evaluate('1 - -2'), 3);
      assert.equal(parser.evaluate('+5 + +3'), 8);
    });
  });

  // ================= 5. Built-in Mathematical Functions =================
  describe('Built-in Mathematical Functions', () => {
    it('evaluates single-argument functions correctly', () => {
      const parser = new NonprofitImpactFormulaParser();

      assert.equal(parser.evaluate('sqrt(25)'), 5);
      assert.equal(parser.evaluate('abs(-42)'), 42);
      assert.equal(parser.evaluate('round(3.6)'), 4);
      assert.equal(parser.evaluate('floor(3.9)'), 3);
      assert.equal(parser.evaluate('ceil(3.1)'), 4);
      assert.equal(parser.evaluate('exp(0)'), 1);
      assert.equal(parser.evaluate('log(100)'), 2);
      assert.equal(Math.round(parser.evaluate('ln(exp(1))')), 1);
    });

    it('evaluates two-argument functions correctly', () => {
      const parser = new NonprofitImpactFormulaParser();

      assert.equal(parser.evaluate('min(15, 8)'), 8);
      assert.equal(parser.evaluate('max(15, 8)'), 15);
      assert.equal(parser.evaluate('pow(2, 5)'), 32);
    });

    it('evaluates nested functions and complex combinations', () => {
      const parser = new NonprofitImpactFormulaParser();

      // Pythagorean: sqrt(3^2 + 4^2) = 5
      assert.equal(parser.evaluate('sqrt(pow(3, 2) + pow(4, 2))'), 5);

      // max(sqrt(64), min(10, 20)) = 10
      assert.equal(parser.evaluate('max(sqrt(64), min(10, 20))'), 10);
    });
  });

  // ================= 6. Variable Substitution =================
  describe('Variable Substitution', () => {
    it('uses default Nonprofit Impact variables when not overridden', () => {
      const parser = new NonprofitImpactFormulaParser();

      // total_donations is 250000, program_expenses is 210000
      assert.equal(parser.evaluate('total_donations - program_expenses'), 40000);
      assert.equal(parser.evaluate('volunteer_hours * 2'), 2400);
    });

    it('accepts custom variable overrides', () => {
      const parser = new NonprofitImpactFormulaParser();

      const result = parser.evaluate('program_expenses / beneficiaries_served', {
        program_expenses: 100000,
        beneficiaries_served: 2000
      });
      assert.equal(result, 50);
    });

    it('throws error for undefined variables', () => {
      const parser = new NonprofitImpactFormulaParser();

      assert.throws(
        () => parser.evaluate('total_donations + undefined_grant'),
        /Variable "undefined_grant" is undefined/
      );
    });

    it('throws error for non-numeric variable values', () => {
      const parser = new NonprofitImpactFormulaParser();

      assert.throws(
        () => parser.evaluate('total_donations', { total_donations: 'invalid_val' }),
        /must be a finite numeric value/
      );
    });
  });

  // ================= 7. Division-by-Zero and Domain Guards =================
  describe('Division-by-Zero and Domain Guards', () => {
    it('guards against literal division and modulo by zero', () => {
      const parser = new NonprofitImpactFormulaParser();

      assert.throws(() => parser.evaluate('42 / 0'), /Division by zero is undefined/);
      assert.throws(() => parser.evaluate('25 % 0'), /Division by zero in modulo operation/);
    });

    it('guards against dynamic zero denominators', () => {
      const parser = new NonprofitImpactFormulaParser();

      assert.throws(
        () => parser.evaluate('100 / (total_donations - 250000)'),
        /Division by zero is undefined/
      );
    });

    it('guards against invalid mathematical domain operations', () => {
      const parser = new NonprofitImpactFormulaParser();

      assert.throws(() => parser.evaluate('sqrt(-9)'), /Square root of negative number is undefined/);
      assert.throws(() => parser.evaluate('log(0)'), /Logarithm of non-positive number is undefined/);
      assert.throws(() => parser.evaluate('log(-5)'), /Logarithm of non-positive number is undefined/);
      assert.throws(() => parser.evaluate('ln(0)'), /Natural logarithm of non-positive number is undefined/);
    });

    it('supports infinity guard when configured', () => {
      const parser = new NonprofitImpactFormulaParser({ divisionByZeroGuard: 'infinity' });

      assert.equal(parser.evaluate('100 / 0'), Infinity);
      assert.equal(parser.evaluate('-100 / 0'), -Infinity);
      assert.ok(Number.isNaN(parser.evaluate('100 % 0')));
    });
  });

  // ================= 8. Calculation Audit History =================
  describe('Calculation Audit History', () => {
    it('records calculation history entries with IDs and timestamps', () => {
      const parser = new NonprofitImpactFormulaParser();

      assert.equal(parser.getHistory().length, 0);

      parser.evaluate('total_donations / 2');
      const history = parser.getHistory();

      assert.equal(history.length, 1);
      assert.ok(history[0].id.startsWith('kpi_'));
      assert.ok(history[0].timestamp);
      assert.equal(history[0].expression, 'total_donations / 2');
      assert.equal(history[0].result, 125000);
      assert.equal(history[0].formattedResult, '125,000');
    });

    it('clears history log on clearHistory()', () => {
      const parser = new NonprofitImpactFormulaParser();

      parser.evaluate('10 + 20');
      parser.evaluate('30 + 40');
      assert.equal(parser.getHistory().length, 2);

      parser.clearHistory();
      assert.equal(parser.getHistory().length, 0);
    });

    it('finds calculation record by id', () => {
      const parser = new NonprofitImpactFormulaParser();
      parser.evaluate('total_donations * 2');
      const record = parser.getHistory()[0];

      const found = parser.getCalculationById(record.id);
      assert.ok(found);
      assert.equal(found.id, record.id);
      assert.equal(found.result, 500000);

      assert.equal(parser.getCalculationById('non_existent_id'), null);
    });

    it('respects history limit configuration', () => {
      const parser = new NonprofitImpactFormulaParser({ historyLimit: 3 });

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
      const parser = new NonprofitImpactFormulaParser();
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
      const parser = new NonprofitImpactFormulaParser();
      let errorEmitted = null;

      parser.on('error', (err) => {
        errorEmitted = err;
      });

      assert.throws(() => parser.evaluate('100 / 0'));
      assert.ok(errorEmitted);
      assert.match(errorEmitted.message, /Division by zero/);
    });

    it('emits historyChange and allows unsubscription', () => {
      const parser = new NonprofitImpactFormulaParser();
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

  // ================= 10. All 6 Nonprofit Preset Evaluations =================
  describe('Nonprofit Impact Presets', () => {
    it('evaluates Program Efficiency Ratio (%) preset to 84.00%', () => {
      const parser = new NonprofitImpactFormulaParser();
      // (program_expenses(210000) / total_donations(250000)) * 100 = 84.0%
      const res = parser.evaluatePreset('program_efficiency');
      assert.equal(res, 84.0);
    });

    it('evaluates Fundraising Efficiency Ratio (%) preset to 10.00%', () => {
      const parser = new NonprofitImpactFormulaParser();
      // (fundraising_expenses(25000) / total_donations(250000)) * 100 = 10.0%
      const res = parser.evaluatePreset('fundraising_efficiency');
      assert.equal(res, 10.0);
    });

    it('evaluates Cost Per Beneficiary Served preset to 46.67', () => {
      const parser = new NonprofitImpactFormulaParser();
      // program_expenses(210000) / beneficiaries_served(4500) = 46.666666666666664
      const res = parser.evaluatePreset('cost_per_beneficiary');
      assert.equal(res, 210000.0 / 4500);
      assert.equal(parser.formatNumber(res), '46.6667');
    });

    it('evaluates Total Social Return Value preset to 284,200.00', () => {
      const parser = new NonprofitImpactFormulaParser();
      // total_donations(250000) + (volunteer_hours(1200) * volunteer_value_per_hour(28.50))
      // = 250000 + 34200 = 284200.0
      const res = parser.evaluatePreset('social_return_value');
      assert.equal(res, 284200.0);
      assert.equal(parser.formatNumber(res), '284,200');
    });

    it('evaluates Overhead Burden Ratio (%) preset to 16.00%', () => {
      const parser = new NonprofitImpactFormulaParser();
      // ((administrative_expenses(15000) + fundraising_expenses(25000)) / total_donations(250000)) * 100
      // = (40000 / 250000) * 100 = 16.0%
      const res = parser.evaluatePreset('overhead_burden');
      assert.equal(res, 16.0);
    });

    it('evaluates Social Return on Investment (SROI) preset to 0.9768', () => {
      const parser = new NonprofitImpactFormulaParser();
      // (program_expenses(210000) + (volunteer_hours(1200) * volunteer_value_per_hour(28.50))) / total_donations(250000)
      // = (210000 + 34200) / 250000 = 244200 / 250000 = 0.9768
      const res = parser.evaluatePreset('sroi');
      assert.equal(res, (210000 + 34200) / 250000);
      assert.equal(res, 0.9768);
    });

    it('evaluates presets with custom variable overrides', () => {
      const parser = new NonprofitImpactFormulaParser();

      // Custom override: double total donations
      const res = parser.evaluatePreset('program_efficiency', {
        total_donations: 500000.0
      });
      // (210000 / 500000) * 100 = 42.0%
      assert.equal(res, 42.0);
    });
  });
});
