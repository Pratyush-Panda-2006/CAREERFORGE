import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  EdtechAcademyFormulaParser,
  DEFAULT_EDTECH_VARIABLES,
  EDTECH_KPI_PRESETS
} from './formula-evaluator.js';

describe('EdtechAcademyFormulaParser Test Suite', () => {
  // 1. Default initialization and configuration
  describe('1. Default initialization and configuration', () => {
    it('instantiates with proper name, operators, functions, and EdTech parameters', () => {
      const parser = new EdtechAcademyFormulaParser();
      assert.equal(parser.name, 'EdtechAcademyFormulaParser');

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
      assert.ok(parser.functions.pow);
      assert.ok(parser.functions.min);
      assert.ok(parser.functions.max);

      // Default EdTech variables
      assert.equal(parser.defaultVariables.course_price, 199.00);
      assert.equal(parser.defaultVariables.total_enrolled, 1250);
      assert.equal(parser.defaultVariables.completion_rate, 0.68);
      assert.equal(parser.defaultVariables.instructor_royalty_rate, 0.30);
      assert.equal(parser.defaultVariables.marketing_spend, 15000.00);
      assert.equal(parser.defaultVariables.student_support_cost_per_head, 12.00);
      assert.equal(parser.defaultVariables.quiz_pass_rate, 0.82);
      assert.equal(parser.defaultVariables.average_watch_hours, 14.5);

      // Exported constants match
      assert.deepEqual(DEFAULT_EDTECH_VARIABLES, parser.defaultVariables);
      assert.equal(EDTECH_KPI_PRESETS.length, 6);

      // Calculation history starts empty
      assert.deepEqual(parser.getHistory(), []);
    });

    it('accepts custom constructor options', () => {
      const parser = new EdtechAcademyFormulaParser({
        divisionByZeroGuard: 'infinity',
        precision: 2
      });
      assert.equal(parser.options.divisionByZeroGuard, 'infinity');
      assert.equal(parser.options.precision, 2);
    });
  });

  // 2. Expression tokenization
  describe('2. Expression tokenization', () => {
    it('tokenizes integers, floating-point decimals, and scientific notation', () => {
      const parser = new EdtechAcademyFormulaParser();
      const tokens = parser.tokenize('199 + 3.1415 + 1e-4 + 2.5e3 + 1E+6');

      assert.equal(tokens.length, 9);
      assert.equal(tokens[0].value, 199);
      assert.equal(tokens[2].value, 3.1415);
      assert.equal(tokens[4].value, 0.0001);
      assert.equal(tokens[6].value, 2500);
      assert.equal(tokens[8].value, 1000000);
    });

    it('tokenizes EdTech identifiers, constants, and built-in functions', () => {
      const parser = new EdtechAcademyFormulaParser();
      const tokens = parser.tokenize('sqrt(total_enrolled) + pow(quiz_pass_rate, 2) * min(course_price, 250)');

      assert.equal(tokens[0].type, 'function');
      assert.equal(tokens[0].value, 'sqrt');
      assert.equal(tokens[1].type, 'paren');
      assert.equal(tokens[1].value, '(');
      assert.equal(tokens[2].type, 'variable');
      assert.equal(tokens[2].value, 'total_enrolled');
      assert.equal(tokens[3].type, 'paren');
      assert.equal(tokens[3].value, ')');
      assert.equal(tokens[4].type, 'operator');
      assert.equal(tokens[4].value, '+');
      assert.equal(tokens[5].type, 'function');
      assert.equal(tokens[5].value, 'pow');
    });

    it('differentiates binary vs unary operators', () => {
      const parser = new EdtechAcademyFormulaParser();
      const tokens = parser.tokenize('-5 + 3 * -2');

      assert.equal(tokens[0].type, 'operator');
      assert.equal(tokens[0].value, 'u-');
      assert.equal(tokens[0].unary, true);

      assert.equal(tokens[2].type, 'operator');
      assert.equal(tokens[2].value, '+');
      assert.equal(tokens[2].unary, false);

      assert.equal(tokens[5].type, 'operator');
      assert.equal(tokens[5].value, 'u-');
      assert.equal(tokens[5].unary, true);
    });

    it('throws descriptive error on invalid or unexpected characters', () => {
      const parser = new EdtechAcademyFormulaParser();
      assert.throws(
        () => parser.tokenize('course_price $ 2'),
        /Unexpected character in formula: "\$"/
      );
      assert.throws(
        () => parser.tokenize('completion_rate @ 10'),
        /Unexpected character in formula: "@"/
      );
    });
  });

  // 3. Syntax validation
  describe('3. Syntax validation', () => {
    it('detects empty or whitespace-only expressions', () => {
      const parser = new EdtechAcademyFormulaParser();
      assert.equal(parser.validateSyntax('').valid, false);
      assert.equal(parser.validateSyntax('   ').valid, false);
      assert.match(parser.validateSyntax('').error, /Expression cannot be empty/);
    });

    it('detects mismatched and unbalanced parentheses', () => {
      const parser = new EdtechAcademyFormulaParser();
      assert.equal(parser.validateSyntax('(course_price + 10').valid, false);
      assert.match(parser.validateSyntax('(course_price + 10').error, /Unclosed opening parenthesis/);

      assert.equal(parser.validateSyntax('course_price + 10)').valid, false);
      assert.match(parser.validateSyntax('course_price + 10)').error, /Mismatched closing parenthesis/);

      assert.equal(parser.validateSyntax('course_price + ()').valid, false);
      assert.match(parser.validateSyntax('course_price + ()').error, /Empty parentheses pair/);
    });

    it('detects invalid consecutive binary operators and misplaced operators', () => {
      const parser = new EdtechAcademyFormulaParser();
      assert.equal(parser.validateSyntax('10 + * 5').valid, false);
      assert.match(parser.validateSyntax('10 + * 5').error, /Consecutive operators "\+\*"/);

      assert.equal(parser.validateSyntax('* 10 + 5').valid, false);
      assert.match(parser.validateSyntax('* 10 + 5').error, /Expression cannot begin with operator "\*"/);

      assert.equal(parser.validateSyntax('10 + 5 -').valid, false);
      assert.match(parser.validateSyntax('10 + 5 -').error, /Expression cannot end with dangling operator "-"/);

      assert.equal(parser.validateSyntax('sqrt 16').valid, false);
      assert.match(parser.validateSyntax('sqrt 16').error, /Function "sqrt" must be followed by "\("/);
    });

    it('detects missing operators between operands or parentheses', () => {
      const parser = new EdtechAcademyFormulaParser();
      assert.equal(parser.validateSyntax('10 20').valid, false);
      assert.match(parser.validateSyntax('10 20').error, /Missing operator between "10" and "20"/);

      assert.equal(parser.validateSyntax('10(20)').valid, false);
      assert.match(parser.validateSyntax('10(20)').error, /Missing operator before "\("/);

      assert.equal(parser.validateSyntax('(10 + 2) 5').valid, false);
      assert.match(parser.validateSyntax('(10 + 2) 5').error, /Missing operator after "\)"/);
    });

    it('validates properly formed expressions', () => {
      const parser = new EdtechAcademyFormulaParser();
      assert.equal(parser.validateSyntax('course_price * total_enrolled').valid, true);
      assert.equal(parser.validateSyntax('pow(quiz_pass_rate, 2) + 0.1').valid, true);
      assert.equal(parser.validateSyntax('min(course_price, 300) + max(average_watch_hours, 10)').valid, true);
    });
  });

  // 4. Operator precedence (BODMAS/PEMDAS)
  describe('4. Operator precedence (BODMAS/PEMDAS: ^ > * / % > + -)', () => {
    it('executes multiplication and division before addition and subtraction', () => {
      const parser = new EdtechAcademyFormulaParser();
      assert.equal(parser.evaluate('2 + 3 * 4'), 14);
      assert.equal(parser.evaluate('(2 + 3) * 4'), 20);
      assert.equal(parser.evaluate('20 - 10 / 2'), 15);
      assert.equal(parser.evaluate('(20 - 10) / 2'), 5);
    });

    it('executes exponentiation before multiplication with right-associativity', () => {
      const parser = new EdtechAcademyFormulaParser();
      assert.equal(parser.evaluate('2 ^ 3 * 2'), 16);
      assert.equal(parser.evaluate('2 * 3 ^ 2'), 18);
      // Right-associative: 2 ^ 3 ^ 2 = 2 ^ (3 ^ 2) = 2 ^ 9 = 512
      assert.equal(parser.evaluate('2 ^ 3 ^ 2'), 512);
    });

    it('respects left-associativity for addition, subtraction, and modulo', () => {
      const parser = new EdtechAcademyFormulaParser();
      assert.equal(parser.evaluate('10 - 4 + 2'), 8);
      assert.equal(parser.evaluate('100 / 10 / 2'), 5);
      assert.equal(parser.evaluate('10 + 7 % 3'), 11);
    });

    it('evaluates deeply nested grouping expressions correctly', () => {
      const parser = new EdtechAcademyFormulaParser();
      assert.equal(parser.evaluate('(100 - (10 / 2)) * 2'), 190);
      assert.equal(parser.evaluate('((2 + 3) * (4 + 1)) ^ 2'), 625);
    });
  });

  // 5. Built-in functions
  describe('5. Built-in functions (sqrt, log, ln, exp, abs, min, max, round, floor, ceil, pow)', () => {
    it('evaluates sqrt, abs, and rounding functions correctly', () => {
      const parser = new EdtechAcademyFormulaParser();
      assert.equal(parser.evaluate('sqrt(16)'), 4);
      assert.equal(parser.evaluate('sqrt(0)'), 0);
      assert.equal(parser.evaluate('abs(-42)'), 42);
      assert.equal(parser.evaluate('abs(42)'), 42);
      assert.equal(parser.evaluate('round(3.7)'), 4);
      assert.equal(parser.evaluate('round(3.2)'), 3);
      assert.equal(parser.evaluate('floor(3.9)'), 3);
      assert.equal(parser.evaluate('ceil(3.1)'), 4);
    });

    it('evaluates pow function with multiple arguments', () => {
      const parser = new EdtechAcademyFormulaParser();
      assert.equal(parser.evaluate('pow(2, 3)'), 8);
      assert.equal(parser.evaluate('pow(5, 2)'), 25);
      assert.equal(parser.evaluate('pow(10, 0)'), 1);
    });

    it('evaluates log, ln, log10, and exp functions', () => {
      const parser = new EdtechAcademyFormulaParser();
      assert.equal(parser.evaluate('exp(0)'), 1);
      assert.equal(Math.round(parser.evaluate('exp(1)') * 1000) / 1000, 2.718);
      assert.equal(parser.evaluate('log(exp(1))'), 1);
      assert.equal(parser.evaluate('ln(exp(2))'), 2);
      assert.equal(parser.evaluate('log10(1000)'), 3);
    });

    it('evaluates multi-argument min and max functions', () => {
      const parser = new EdtechAcademyFormulaParser();
      assert.equal(parser.evaluate('min(5, 12)'), 5);
      assert.equal(parser.evaluate('max(5, 12)'), 12);
      assert.equal(parser.evaluate('min(10, 20, 5, 30)'), 5);
      assert.equal(parser.evaluate('max(10, 20, 5, 30)'), 30);
    });

    it('evaluates nested mathematical functions seamlessly', () => {
      const parser = new EdtechAcademyFormulaParser();
      assert.equal(parser.evaluate('max(min(10, 20), sqrt(100))'), 10);
      assert.equal(parser.evaluate('sqrt(abs(-64))'), 8);
      assert.equal(parser.evaluate('pow(min(2, 5), 3)'), 8);
    });

    it('guards against invalid function domains (sqrt of negative, log of zero)', () => {
      const parser = new EdtechAcademyFormulaParser();
      assert.throws(
        () => parser.evaluate('sqrt(-4)'),
        /Square root of negative number is undefined/
      );
      assert.throws(
        () => parser.evaluate('log(0)'),
        /Logarithm of non-positive number is undefined/
      );
      assert.throws(
        () => parser.evaluate('ln(-10)'),
        /Natural logarithm of non-positive number is undefined/
      );
    });
  });

  // 6. Variable substitution with EdTech parameters
  describe('6. Variable substitution with EdTech parameters', () => {
    it('uses default EdTech parameters when none are specified', () => {
      const parser = new EdtechAcademyFormulaParser();
      // course_price (199) * total_enrolled (1250) = 248750
      const result = parser.evaluate('course_price * total_enrolled');
      assert.equal(result, 248750);
    });

    it('substitutes custom parameter contexts accurately', () => {
      const parser = new EdtechAcademyFormulaParser();
      const formula = 'course_price * total_enrolled';
      const result = parser.evaluate(formula, { course_price: 250, total_enrolled: 500 });
      assert.equal(result, 125000);
    });

    it('substitutes student engagement metrics with custom values', () => {
      const parser = new EdtechAcademyFormulaParser();
      const formula = 'average_watch_hours * quiz_pass_rate * 10';
      const result = parser.evaluate(formula, { average_watch_hours: 20, quiz_pass_rate: 0.90 });
      assert.equal(result, 180);
    });

    it('throws explicit error when variable is undefined in parameter context', () => {
      const parser = new EdtechAcademyFormulaParser();
      assert.throws(
        () => parser.evaluate('course_price + unknown_metric', { course_price: 199 }),
        /Variable "unknown_metric" is undefined/
      );
    });
  });

  // 7. Edge cases: division by zero, negative numbers, whitespace
  describe('7. Edge cases: division by zero, negative numbers, whitespace variations', () => {
    it('guards safely against division by zero in divide and modulo operations', () => {
      const parser = new EdtechAcademyFormulaParser();

      // Literal division by zero
      assert.throws(
        () => parser.evaluate('100 / 0'),
        /Division by zero is undefined/
      );

      // Dynamic division by zero: 100 / (total_enrolled - 1250)
      assert.throws(
        () => parser.evaluate('100 / (total_enrolled - 1250)'),
        /Division by zero is undefined/
      );

      // Modulo by zero
      assert.throws(
        () => parser.evaluate('25 % 0'),
        /Division by zero in modulo operation/
      );
    });

    it('supports infinity guard when configured', () => {
      const parser = new EdtechAcademyFormulaParser({ divisionByZeroGuard: 'infinity' });
      assert.equal(parser.evaluate('100 / 0'), Infinity);
      assert.equal(parser.evaluate('-100 / 0'), -Infinity);
      assert.ok(Number.isNaN(parser.evaluate('25 % 0')));
    });

    it('evaluates negative numbers and unary negations accurately', () => {
      const parser = new EdtechAcademyFormulaParser();
      assert.equal(parser.evaluate('-5 + 10'), 5);
      assert.equal(parser.evaluate('2 * -3'), -6);
      assert.equal(parser.evaluate('-course_price', { course_price: 199 }), -199);
      assert.equal(parser.evaluate('-(2 ^ 2)'), -4);
      assert.equal(parser.evaluate('(-2) ^ 2'), 4);
    });

    it('handles erratic whitespace, tabs, and multiline expressions cleanly', () => {
      const parser = new EdtechAcademyFormulaParser();
      const formula = `
        course_price
          *
        total_enrolled
          / 2
      `;
      assert.equal(parser.evaluate(formula), 124375);
    });

    it('handles scientific notation in arithmetic expressions correctly', () => {
      const parser = new EdtechAcademyFormulaParser();
      assert.equal(parser.evaluate('1e-4 * 10000'), 1);
      assert.equal(parser.evaluate('2.5e3 + 500'), 3000);
    });
  });

  // 8. Calculation history logging and event emission
  describe('8. Calculation history logging and event emission', () => {
    it('logs calculation entries into audit history with unique ID and timestamp', () => {
      const parser = new EdtechAcademyFormulaParser();
      const res = parser.evaluate('course_price * 2');

      const history = parser.getHistory();
      assert.equal(history.length, 1);
      assert.ok(history[0].id.startsWith('calc-'));
      assert.ok(history[0].timestamp);
      assert.equal(history[0].expression, 'course_price * 2');
      assert.equal(history[0].result, res);
      assert.equal(history[0].status, 'SUCCESS');
      assert.equal(history[0].error, null);

      const retrieved = parser.getCalculationById(history[0].id);
      assert.equal(retrieved.id, history[0].id);
    });

    it('logs error entries when calculation fails', () => {
      const parser = new EdtechAcademyFormulaParser();
      assert.throws(() => parser.evaluate('course_price / 0'));

      const history = parser.getHistory();
      assert.equal(history.length, 1);
      assert.equal(history[0].status, 'ERROR');
      assert.match(history[0].error, /Division by zero/);
      assert.equal(history[0].result, null);
    });

    it('clears calculation history properly', () => {
      const parser = new EdtechAcademyFormulaParser();
      parser.evaluate('10 + 20');
      parser.evaluate('30 + 40');
      assert.equal(parser.getHistory().length, 2);

      parser.clearHistory();
      assert.equal(parser.getHistory().length, 0);
    });

    it('emits events on evaluate, calculate, error, and historyChange', () => {
      const parser = new EdtechAcademyFormulaParser();
      let evalEvent = null;
      let calcEvent = null;
      let errEvent = null;
      let historyCount = 0;

      parser.on('evaluate', (entry) => {
        evalEvent = entry;
      });
      parser.on('calculate', (entry) => {
        calcEvent = entry;
      });
      parser.on('error', (entry) => {
        errEvent = entry;
      });
      parser.on('historyChange', (history) => {
        historyCount = history.length;
      });

      parser.evaluate('sqrt(100)');
      assert.ok(evalEvent);
      assert.ok(calcEvent);
      assert.equal(evalEvent.result, 10);
      assert.equal(calcEvent.result, 10);
      assert.equal(historyCount, 1);

      assert.throws(() => parser.evaluate('sqrt(-1)'));
      assert.ok(errEvent);
      assert.match(errEvent.error, /Square root of negative number/);
      assert.equal(historyCount, 2);

      // Test off() unregistering listener
      const dummyListener = () => {};
      parser.on('evaluate', dummyListener);
      parser.off('evaluate', dummyListener);
    });
  });

  // 9. All 6 KPI Presets Verification
  describe('9. All 6 KPI Presets Verification', () => {
    const parser = new EdtechAcademyFormulaParser();

    it('Preset 1: Gross Course Revenue (course_price * total_enrolled)', () => {
      const preset = EDTECH_KPI_PRESETS.find(p => p.id === 'gross_course_revenue');
      assert.ok(preset);
      assert.equal(preset.formula, 'course_price * total_enrolled');

      // Default: 199.00 * 1250 = 248,750
      const result = parser.evaluate(preset.formula);
      assert.equal(result, 248750);

      // Custom: 250 * 2000 = 500,000
      const customRes = parser.evaluate(preset.formula, { course_price: 250, total_enrolled: 2000 });
      assert.equal(customRes, 500000);
    });

    it('Preset 2: Net Academy Margin ((course_price * total_enrolled * (1 - instructor_royalty_rate)) - marketing_spend - (total_enrolled * student_support_cost_per_head))', () => {
      const preset = EDTECH_KPI_PRESETS.find(p => p.id === 'net_academy_margin');
      assert.ok(preset);
      assert.equal(
        preset.formula,
        '(course_price * total_enrolled * (1 - instructor_royalty_rate)) - marketing_spend - (total_enrolled * student_support_cost_per_head)'
      );

      // Default:
      // course_price * total_enrolled * (1 - 0.30) = 248750 * 0.70 = 174125
      // marketing_spend = 15000
      // total_enrolled * student_support_cost_per_head = 1250 * 12 = 15000
      // Net: 174125 - 15000 - 15000 = 144125
      const result = parser.evaluate(preset.formula);
      assert.equal(result, 144125);
    });

    it('Preset 3: Customer Acquisition Cost (CAC) (marketing_spend / total_enrolled)', () => {
      const preset = EDTECH_KPI_PRESETS.find(p => p.id === 'cac');
      assert.ok(preset);
      assert.equal(preset.formula, 'marketing_spend / total_enrolled');

      // Default: 15000 / 1250 = 12
      const result = parser.evaluate(preset.formula);
      assert.equal(result, 12);

      // Custom: 20000 / 1000 = 20
      const customRes = parser.evaluate(preset.formula, { marketing_spend: 20000, total_enrolled: 1000 });
      assert.equal(customRes, 20);
    });

    it('Preset 4: Course Completion Count (total_enrolled * completion_rate)', () => {
      const preset = EDTECH_KPI_PRESETS.find(p => p.id === 'completion_count');
      assert.ok(preset);
      assert.equal(preset.formula, 'total_enrolled * completion_rate');

      // Default: 1250 * 0.68 = 850
      const result = parser.evaluate(preset.formula);
      assert.ok(Math.abs(result - 850) < 0.0001);

      // Custom: 3000 * 0.75 = 2250
      const customRes = parser.evaluate(preset.formula, { total_enrolled: 3000, completion_rate: 0.75 });
      assert.equal(customRes, 2250);
    });

    it('Preset 5: Return on Ad Spend (ROAS) ((course_price * total_enrolled) / marketing_spend)', () => {
      const preset = EDTECH_KPI_PRESETS.find(p => p.id === 'roas');
      assert.ok(preset);
      assert.equal(preset.formula, '(course_price * total_enrolled) / marketing_spend');

      // Default: 248750 / 15000 = 16.583333333333332
      const result = parser.evaluate(preset.formula);
      assert.equal(result, 248750 / 15000);
      assert.ok(Math.abs(result - 16.5833) < 0.001);

      // Custom: (200 * 1000) / 10000 = 200000 / 10000 = 20
      const customRes = parser.evaluate(preset.formula, {
        course_price: 200,
        total_enrolled: 1000,
        marketing_spend: 10000
      });
      assert.equal(customRes, 20);
    });

    it('Preset 6: Student Engagement Metric (average_watch_hours * quiz_pass_rate * 10)', () => {
      const preset = EDTECH_KPI_PRESETS.find(p => p.id === 'engagement_metric');
      assert.ok(preset);
      assert.equal(preset.formula, 'average_watch_hours * quiz_pass_rate * 10');

      // Default: 14.5 * 0.82 * 10 = 118.9
      const result = parser.evaluate(preset.formula);
      assert.ok(Math.abs(result - 118.9) < 0.0001);

      // Custom: 20 * 0.90 * 10 = 180
      const customRes = parser.evaluate(preset.formula, { average_watch_hours: 20, quiz_pass_rate: 0.90 });
      assert.equal(customRes, 180);
    });
  });
});
