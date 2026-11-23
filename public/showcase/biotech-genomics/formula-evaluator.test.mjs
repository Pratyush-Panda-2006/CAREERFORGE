import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BiotechGenomicsFormulaParser } from './formula-evaluator.js';

describe('BiotechGenomicsFormulaParser', () => {
  // 1. Default initialization and configuration
  describe('1. Default initialization and configuration', () => {
    it('instantiates with proper name, operators, functions, and biotech parameters', () => {
      const parser = new BiotechGenomicsFormulaParser();
      assert.equal(parser.name, 'BiotechGenomicsFormulaParser');

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

      // Default Biotech genomic variables
      assert.equal(parser.defaultVariables.seq_depth, 30);
      assert.equal(parser.defaultVariables.gc_content, 0.45);
      assert.equal(parser.defaultVariables.read_length, 150);
      assert.equal(parser.defaultVariables.q_score, 30);
      assert.equal(parser.defaultVariables.coverage, 0.98);
      assert.equal(parser.defaultVariables.error_rate, 0.001);

      // Calculation history starts empty
      assert.deepEqual(parser.getHistory(), []);
    });

    it('accepts custom constructor options', () => {
      const parser = new BiotechGenomicsFormulaParser({
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
      const parser = new BiotechGenomicsFormulaParser();
      const tokens = parser.tokenize('42 + 3.1415 + 1e-4 + 2.5e3 + 1E+6');

      assert.equal(tokens.length, 9);
      assert.equal(tokens[0].value, 42);
      assert.equal(tokens[2].value, 3.1415);
      assert.equal(tokens[4].value, 0.0001);
      assert.equal(tokens[6].value, 2500);
      assert.equal(tokens[8].value, 1000000);
    });

    it('tokenizes biotech identifiers and built-in functions', () => {
      const parser = new BiotechGenomicsFormulaParser();
      const tokens = parser.tokenize('sqrt(seq_depth) + log(gc_content) * min(read_length, 100)');

      assert.equal(tokens[0].type, 'function');
      assert.equal(tokens[0].value, 'sqrt');
      assert.equal(tokens[1].type, 'paren');
      assert.equal(tokens[1].value, '(');
      assert.equal(tokens[2].type, 'variable');
      assert.equal(tokens[2].value, 'seq_depth');
      assert.equal(tokens[3].type, 'paren');
      assert.equal(tokens[3].value, ')');
      assert.equal(tokens[4].type, 'operator');
      assert.equal(tokens[4].value, '+');
      assert.equal(tokens[5].type, 'function');
      assert.equal(tokens[5].value, 'log');
    });

    it('differentiates binary vs unary operators', () => {
      const parser = new BiotechGenomicsFormulaParser();
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
      const parser = new BiotechGenomicsFormulaParser();
      assert.throws(
        () => parser.tokenize('seq_depth $ 2'),
        /Unexpected character in formula: "\$"/
      );
      assert.throws(
        () => parser.tokenize('gc_content @ 10'),
        /Unexpected character in formula: "@"/
      );
    });
  });

  // 3. Syntax validation
  describe('3. Syntax validation', () => {
    it('detects empty or whitespace-only expressions', () => {
      const parser = new BiotechGenomicsFormulaParser();
      assert.equal(parser.validateSyntax('').valid, false);
      assert.equal(parser.validateSyntax('   ').valid, false);
      assert.match(parser.validateSyntax('').error, /Expression cannot be empty/);
    });

    it('detects mismatched and unbalanced parentheses', () => {
      const parser = new BiotechGenomicsFormulaParser();
      assert.equal(parser.validateSyntax('(seq_depth + 10').valid, false);
      assert.match(parser.validateSyntax('(seq_depth + 10').error, /Unclosed opening parenthesis/);

      assert.equal(parser.validateSyntax('seq_depth + 10)').valid, false);
      assert.match(parser.validateSyntax('seq_depth + 10)').error, /Mismatched closing parenthesis/);

      assert.equal(parser.validateSyntax('seq_depth + ()').valid, false);
      assert.match(parser.validateSyntax('seq_depth + ()').error, /Empty parentheses pair/);
    });

    it('detects invalid consecutive binary operators and misplaced operators', () => {
      const parser = new BiotechGenomicsFormulaParser();
      assert.equal(parser.validateSyntax('10 + * 5').valid, false);
      assert.match(parser.validateSyntax('10 + * 5').error, /Consecutive operators "\+\*"/);

      assert.equal(parser.validateSyntax('* 10 + 5').valid, false);
      assert.match(parser.validateSyntax('* 10 + 5').error, /Expression cannot begin with operator "\*"/);

      assert.equal(parser.validateSyntax('10 + 5 -').valid, false);
      assert.match(parser.validateSyntax('10 + 5 -').error, /Expression cannot end with dangling operator "-"/);

      assert.equal(parser.validateSyntax('sqrt 16').valid, false);
      assert.match(parser.validateSyntax('sqrt 16').error, /Function "sqrt" must be followed by "\("/);
    });

    it('validates properly formed expressions', () => {
      const parser = new BiotechGenomicsFormulaParser();
      assert.equal(parser.validateSyntax('sqrt(seq_depth) * (gc_content + 0.1)').valid, true);
      assert.equal(parser.validateSyntax('10 ^ (-q_score / 10)').valid, true);
      assert.equal(parser.validateSyntax('min(seq_depth, 100) + max(read_length, 50)').valid, true);
    });
  });

  // 4. Operator precedence (BODMAS/PEMDAS)
  describe('4. Operator precedence (BODMAS/PEMDAS: ^ > * / % > + -)', () => {
    it('executes multiplication and division before addition and subtraction', () => {
      const parser = new BiotechGenomicsFormulaParser();
      assert.equal(parser.evaluate('2 + 3 * 4'), 14);
      assert.equal(parser.evaluate('(2 + 3) * 4'), 20);
      assert.equal(parser.evaluate('20 - 10 / 2'), 15);
      assert.equal(parser.evaluate('(20 - 10) / 2'), 5);
    });

    it('executes exponentiation before multiplication with right-associativity', () => {
      const parser = new BiotechGenomicsFormulaParser();
      assert.equal(parser.evaluate('2 ^ 3 * 2'), 16);
      assert.equal(parser.evaluate('2 * 3 ^ 2'), 18);
      // Right-associative: 2 ^ 3 ^ 2 = 2 ^ (3 ^ 2) = 2 ^ 9 = 512
      assert.equal(parser.evaluate('2 ^ 3 ^ 2'), 512);
    });

    it('respects left-associativity for addition, subtraction, and modulo', () => {
      const parser = new BiotechGenomicsFormulaParser();
      assert.equal(parser.evaluate('10 - 4 + 2'), 8);
      assert.equal(parser.evaluate('100 / 10 / 2'), 5);
      assert.equal(parser.evaluate('10 + 7 % 3'), 11);
    });

    it('evaluates deeply nested grouping expressions correctly', () => {
      const parser = new BiotechGenomicsFormulaParser();
      assert.equal(parser.evaluate('(100 - (10 / 2)) * 2'), 190);
      assert.equal(parser.evaluate('((2 + 3) * (4 + 1)) ^ 2'), 625);
    });
  });

  // 5. Built-in scientific functions
  describe('5. Built-in scientific functions (sqrt, log, exp, abs, min, max, round)', () => {
    it('evaluates sqrt, abs, and round correctly', () => {
      const parser = new BiotechGenomicsFormulaParser();
      assert.equal(parser.evaluate('sqrt(16)'), 4);
      assert.equal(parser.evaluate('sqrt(0)'), 0);
      assert.equal(parser.evaluate('abs(-42)'), 42);
      assert.equal(parser.evaluate('abs(42)'), 42);
      assert.equal(parser.evaluate('round(3.7)'), 4);
      assert.equal(parser.evaluate('round(3.2)'), 3);
      assert.equal(parser.evaluate('floor(3.9)'), 3);
      assert.equal(parser.evaluate('ceil(3.1)'), 4);
    });

    it('evaluates log, ln, log10, and exp functions', () => {
      const parser = new BiotechGenomicsFormulaParser();
      assert.equal(parser.evaluate('exp(0)'), 1);
      assert.equal(Math.round(parser.evaluate('exp(1)') * 1000) / 1000, 2.718);
      assert.equal(parser.evaluate('log(exp(1))'), 1);
      assert.equal(parser.evaluate('ln(exp(2))'), 2);
      assert.equal(parser.evaluate('log10(1000)'), 3);
    });

    it('evaluates multi-argument min and max functions', () => {
      const parser = new BiotechGenomicsFormulaParser();
      assert.equal(parser.evaluate('min(5, 12)'), 5);
      assert.equal(parser.evaluate('max(5, 12)'), 12);
      assert.equal(parser.evaluate('min(10, 20, 5, 30)'), 5);
      assert.equal(parser.evaluate('max(10, 20, 5, 30)'), 30);
    });

    it('evaluates nested scientific functions seamlessly', () => {
      const parser = new BiotechGenomicsFormulaParser();
      assert.equal(parser.evaluate('max(min(10, 20), sqrt(100))'), 10);
      assert.equal(parser.evaluate('sqrt(abs(-64))'), 8);
    });

    it('guards against invalid domains (sqrt of negative, log of zero)', () => {
      const parser = new BiotechGenomicsFormulaParser();
      assert.throws(
        () => parser.evaluate('sqrt(-4)'),
        /Square root of negative number is undefined/
      );
      assert.throws(
        () => parser.evaluate('log(0)'),
        /Logarithm of non-positive number is undefined/
      );
    });
  });

  // 6. Variable substitution with biotech parameters
  describe('6. Variable substitution with biotech parameters', () => {
    it('uses default biotech parameters when none are specified', () => {
      const parser = new BiotechGenomicsFormulaParser();
      // default seq_depth = 30, read_length = 150
      // 30 * 150 / 1000 = 4.5
      const result = parser.evaluate('seq_depth * read_length / 1000');
      assert.equal(result, 4.5);
    });

    it('substitutes custom parameter contexts accurately', () => {
      const parser = new BiotechGenomicsFormulaParser();
      const formula = '10 ^ (-q_score / 10)';
      // When q_score = 40: 10 ^ (-4) = 0.0001
      const res40 = parser.evaluate(formula, { q_score: 40 });
      assert.equal(res40, 0.0001);

      // Lander-Waterman probability of unsequenced base: exp(-coverage)
      const resCov = parser.evaluate('1 - exp(-coverage)', { coverage: 2 });
      assert.ok(resCov > 0.86 && resCov < 0.87);
    });

    it('evaluates GC-bias adjusted depth formula', () => {
      const parser = new BiotechGenomicsFormulaParser();
      const formula = 'seq_depth * (1 - abs(gc_content - 0.5))';
      const result = parser.evaluate(formula, { seq_depth: 100, gc_content: 0.4 });
      // 100 * (1 - abs(0.4 - 0.5)) = 100 * (1 - 0.1) = 90
      assert.equal(result, 90);
    });

    it('throws explicit error when variable is undefined in parameter context', () => {
      const parser = new BiotechGenomicsFormulaParser();
      assert.throws(
        () => parser.evaluate('seq_depth + unknown_biomarker', { seq_depth: 50 }),
        /Variable "unknown_biomarker" is undefined/
      );
    });
  });

  // 7. Edge cases
  describe('7. Edge cases: division by zero, negative numbers, whitespace variations', () => {
    it('guards safely against division by zero in divide and modulo operations', () => {
      const parser = new BiotechGenomicsFormulaParser();

      // Literal division by zero
      assert.throws(
        () => parser.evaluate('42 / 0'),
        /Division by zero is undefined/
      );

      // Dynamic division by zero: 42 / (10 - 10)
      assert.throws(
        () => parser.evaluate('42 / (10 - 10)'),
        /Division by zero is undefined/
      );

      // Modulo by zero
      assert.throws(
        () => parser.evaluate('25 % 0'),
        /Division by zero in modulo operation/
      );
    });

    it('supports infinity guard when configured', () => {
      const parser = new BiotechGenomicsFormulaParser({ divisionByZeroGuard: 'infinity' });
      assert.equal(parser.evaluate('42 / 0'), Infinity);
      assert.equal(parser.evaluate('-42 / 0'), -Infinity);
      assert.ok(Number.isNaN(parser.evaluate('25 % 0')));
    });

    it('evaluates negative numbers and unary negations accurately', () => {
      const parser = new BiotechGenomicsFormulaParser();
      assert.equal(parser.evaluate('-5 + 10'), 5);
      assert.equal(parser.evaluate('2 * -3'), -6);
      assert.equal(parser.evaluate('-seq_depth', { seq_depth: 30 }), -30);
      assert.equal(parser.evaluate('-(2 ^ 2)'), -4);
      assert.equal(parser.evaluate('(-2) ^ 2'), 4);
    });

    it('handles erratic whitespace, tabs, and multiline expressions cleanly', () => {
      const parser = new BiotechGenomicsFormulaParser();
      const formula = `
        seq_depth
          *
        read_length
          / 1000
      `;
      assert.equal(parser.evaluate(formula), 4.5);
    });

    it('handles scientific notation in arithmetic expressions correctly', () => {
      const parser = new BiotechGenomicsFormulaParser();
      assert.equal(parser.evaluate('1e-4 * 10000'), 1);
      assert.equal(parser.evaluate('2.5e3 + 500'), 3000);
    });
  });

  // 8. Calculation history logging and event emission
  describe('8. Calculation history logging and event emission', () => {
    it('logs calculation entries into audit history with unique ID and timestamp', () => {
      const parser = new BiotechGenomicsFormulaParser();
      const res = parser.evaluate('seq_depth * 2');

      const history = parser.getHistory();
      assert.equal(history.length, 1);
      assert.ok(history[0].id.startsWith('calc-'));
      assert.ok(history[0].timestamp);
      assert.equal(history[0].expression, 'seq_depth * 2');
      assert.equal(history[0].result, res);
      assert.equal(history[0].status, 'SUCCESS');
      assert.equal(history[0].error, null);

      const retrieved = parser.getCalculationById(history[0].id);
      assert.equal(retrieved.id, history[0].id);
    });

    it('logs error entries when calculation fails', () => {
      const parser = new BiotechGenomicsFormulaParser();
      assert.throws(() => parser.evaluate('seq_depth / 0'));

      const history = parser.getHistory();
      assert.equal(history.length, 1);
      assert.equal(history[0].status, 'ERROR');
      assert.match(history[0].error, /Division by zero/);
      assert.equal(history[0].result, null);
    });

    it('clears calculation history properly', () => {
      const parser = new BiotechGenomicsFormulaParser();
      parser.evaluate('10 + 20');
      parser.evaluate('30 + 40');
      assert.equal(parser.getHistory().length, 2);

      parser.clearHistory();
      assert.equal(parser.getHistory().length, 0);
    });

    it('emits events on calculation, error, and history update', () => {
      const parser = new BiotechGenomicsFormulaParser();
      let calcEvent = null;
      let errEvent = null;
      let historyCount = 0;

      parser.on('calculate', (entry) => {
        calcEvent = entry;
      });
      parser.on('error', (entry) => {
        errEvent = entry;
      });
      parser.on('historyUpdate', (history) => {
        historyCount = history.length;
      });

      parser.evaluate('sqrt(100)');
      assert.ok(calcEvent);
      assert.equal(calcEvent.result, 10);
      assert.equal(historyCount, 1);

      assert.throws(() => parser.evaluate('sqrt(-1)'));
      assert.ok(errEvent);
      assert.match(errEvent.error, /Square root of negative number/);
      assert.equal(historyCount, 2);

      // Test off() unregistering listener
      const dummyListener = () => {};
      parser.on('calculate', dummyListener);
      parser.off('calculate', dummyListener);
    });
  });
});
