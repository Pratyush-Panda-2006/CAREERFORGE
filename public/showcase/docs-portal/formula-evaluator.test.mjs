import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DocsPortalFormulaParser,
  DEFAULT_DOCS_VARIABLES,
  DOCS_FORMULA_PRESETS
} from './formula-evaluator.js';

describe('DocsPortalFormulaParser', () => {
  // 1. Initialization and Configuration
  describe('1. Default initialization and configuration', () => {
    it('instantiates with proper name, operators, functions, and documentation parameters', () => {
      const parser = new DocsPortalFormulaParser();
      assert.equal(parser.name, 'DocsPortalFormulaParser');

      // Operators
      assert.ok(parser.operators['+']);
      assert.ok(parser.operators['-']);
      assert.ok(parser.operators['*']);
      assert.ok(parser.operators['/']);
      assert.ok(parser.operators['^']);
      assert.ok(parser.operators['%']);
      assert.ok(parser.operators['u+']);
      assert.ok(parser.operators['u-']);

      // Functions
      assert.ok(parser.functions.sqrt);
      assert.ok(parser.functions.log);
      assert.ok(parser.functions.ln);
      assert.ok(parser.functions.exp);
      assert.ok(parser.functions.abs);
      assert.ok(parser.functions.round);
      assert.ok(parser.functions.floor);
      assert.ok(parser.functions.ceil);
      assert.ok(parser.functions.min);
      assert.ok(parser.functions.max);
      assert.ok(parser.functions.pow);

      // Default documentation variables
      assert.equal(parser.defaultVariables.total_articles, 120);
      assert.equal(parser.defaultVariables.monthly_pageviews, 85000);
      assert.equal(parser.defaultVariables.helpful_votes, 4200);
      assert.equal(parser.defaultVariables.unhelpful_votes, 350);
      assert.equal(parser.defaultVariables.search_queries, 28000);
      assert.equal(parser.defaultVariables.zero_result_searches, 1400);
      assert.equal(parser.defaultVariables.average_time_on_page_sec, 165);
      assert.equal(parser.defaultVariables.escalation_rate, 0.045);

      // Constants
      assert.equal(parser.constants.pi, Math.PI);
      assert.equal(parser.constants.e, Math.E);

      // Presets
      assert.equal(parser.presets.length, 6);
      assert.deepEqual(parser.getHistory(), []);
    });

    it('accepts custom constructor options', () => {
      const parser = new DocsPortalFormulaParser({
        divisionByZeroGuard: 'infinity',
        precision: 2,
        variables: { total_articles: 200 }
      });
      assert.equal(parser.options.divisionByZeroGuard, 'infinity');
      assert.equal(parser.options.precision, 2);
      assert.equal(parser.variables.total_articles, 200);
    });
  });

  // 2. Expression Tokenization
  describe('2. Expression tokenization', () => {
    it('tokenizes integers, floating-point decimals, and scientific notation', () => {
      const parser = new DocsPortalFormulaParser();
      const tokens = parser.tokenize('42 + 3.1415 + 1e-4 + 2.5e3 + 1E+6');

      assert.equal(tokens.length, 9);
      assert.equal(tokens[0].value, 42);
      assert.equal(tokens[2].value, 3.1415);
      assert.equal(tokens[4].value, 0.0001);
      assert.equal(tokens[6].value, 2500);
      assert.equal(tokens[8].value, 1000000);
    });

    it('tokenizes documentation variables, functions, and parentheses', () => {
      const parser = new DocsPortalFormulaParser();
      const tokens = parser.tokenize('sqrt(total_articles) + log(monthly_pageviews) * min(helpful_votes, 5000)');

      assert.equal(tokens[0].type, 'function');
      assert.equal(tokens[0].value, 'sqrt');
      assert.equal(tokens[1].type, 'paren');
      assert.equal(tokens[1].value, '(');
      assert.equal(tokens[2].type, 'variable');
      assert.equal(tokens[2].value, 'total_articles');
      assert.equal(tokens[3].type, 'paren');
      assert.equal(tokens[3].value, ')');
      assert.equal(tokens[4].type, 'operator');
      assert.equal(tokens[4].value, '+');
      assert.equal(tokens[5].type, 'function');
      assert.equal(tokens[5].value, 'log');
    });

    it('differentiates binary vs unary operators', () => {
      const parser = new DocsPortalFormulaParser();
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

    it('handles unary plus and expressions after opening parens or commas', () => {
      const parser = new DocsPortalFormulaParser();
      const tokens = parser.tokenize('(+10, -20)');

      assert.equal(tokens[1].type, 'operator');
      assert.equal(tokens[1].value, 'u+');
      assert.equal(tokens[1].unary, true);

      assert.equal(tokens[4].type, 'operator');
      assert.equal(tokens[4].value, 'u-');
      assert.equal(tokens[4].unary, true);
    });

    it('throws descriptive error on invalid or unexpected characters', () => {
      const parser = new DocsPortalFormulaParser();
      assert.throws(
        () => parser.tokenize('total_articles $ 2'),
        /Unexpected character in formula: "\$"/
      );
      assert.throws(
        () => parser.tokenize('helpful_votes @ 10'),
        /Unexpected character in formula: "@"/
      );
    });
  });

  // 3. Syntax Validation
  describe('3. Syntax validation', () => {
    it('detects empty or whitespace-only expressions', () => {
      const parser = new DocsPortalFormulaParser();
      assert.equal(parser.validateSyntax('').valid, false);
      assert.equal(parser.validateSyntax('   ').valid, false);
      assert.match(parser.validateSyntax('').error, /Expression cannot be empty/);
    });

    it('detects mismatched and unbalanced parentheses', () => {
      const parser = new DocsPortalFormulaParser();
      assert.equal(parser.validateSyntax('(total_articles + 10').valid, false);
      assert.match(parser.validateSyntax('(total_articles + 10').error, /Unclosed opening parenthesis/);

      assert.equal(parser.validateSyntax('total_articles + 10)').valid, false);
      assert.match(parser.validateSyntax('total_articles + 10)').error, /Mismatched closing parenthesis/);

      assert.equal(parser.validateSyntax('total_articles + ()').valid, false);
      assert.match(parser.validateSyntax('total_articles + ()').error, /Empty parentheses pair/);
    });

    it('detects invalid consecutive binary operators and misplaced operators', () => {
      const parser = new DocsPortalFormulaParser();
      assert.equal(parser.validateSyntax('10 + * 5').valid, false);
      assert.match(parser.validateSyntax('10 + * 5').error, /Consecutive operators/);

      assert.equal(parser.validateSyntax('* 10 + 5').valid, false);
      assert.match(parser.validateSyntax('* 10 + 5').error, /Expression cannot begin with operator "\*"/);

      assert.equal(parser.validateSyntax('10 + 5 -').valid, false);
      assert.match(parser.validateSyntax('10 + 5 -').error, /Expression cannot end with dangling operator "-"/);

      assert.equal(parser.validateSyntax('sqrt 16').valid, false);
      assert.match(parser.validateSyntax('sqrt 16').error, /Function "sqrt" must be followed by "\("/);
    });

    it('detects misplaced commas in expressions', () => {
      const parser = new DocsPortalFormulaParser();
      assert.equal(parser.validateSyntax(', 10 + 5').valid, false);
      assert.match(parser.validateSyntax(', 10 + 5').error, /Expression cannot begin with a comma/);

      assert.equal(parser.validateSyntax('10 + 5,').valid, false);
      assert.match(parser.validateSyntax('10 + 5,').error, /Expression cannot end with a comma/);

      assert.equal(parser.validateSyntax('min(10,, 20)').valid, false);
      assert.match(parser.validateSyntax('min(10,, 20)').error, /Consecutive commas are not allowed/);

      assert.equal(parser.validateSyntax('min(, 20)').valid, false);
      assert.match(parser.validateSyntax('min(, 20)').error, /Comma immediately following opening parenthesis/);
    });

    it('validates properly formed expressions successfully', () => {
      const parser = new DocsPortalFormulaParser();
      assert.equal(parser.validateSyntax('(helpful_votes / (helpful_votes + unhelpful_votes)) * 100').valid, true);
      assert.equal(parser.validateSyntax('pow(2, 3) + sqrt(16)').valid, true);
      assert.equal(parser.validateSyntax('min(total_articles, 200) + max(helpful_votes, 1000)').valid, true);
      assert.equal(parser.validateSyntax('-5 + +3 * -2').valid, true);
    });
  });

  // 4. Operator Precedence (BODMAS/PEMDAS)
  describe('4. Operator precedence (BODMAS/PEMDAS: ^ > * / % > + -)', () => {
    it('executes multiplication and division before addition and subtraction', () => {
      const parser = new DocsPortalFormulaParser();
      assert.equal(parser.evaluate('2 + 3 * 4'), 14);
      assert.equal(parser.evaluate('(2 + 3) * 4'), 20);
      assert.equal(parser.evaluate('20 - 10 / 2'), 15);
      assert.equal(parser.evaluate('(20 - 10) / 2'), 5);
    });

    it('executes exponentiation before multiplication with right-associativity', () => {
      const parser = new DocsPortalFormulaParser();
      assert.equal(parser.evaluate('2 ^ 3 * 2'), 16);
      assert.equal(parser.evaluate('2 * 3 ^ 2'), 18);
      // Right-associative: 2 ^ 3 ^ 2 = 2 ^ (3 ^ 2) = 2 ^ 9 = 512
      assert.equal(parser.evaluate('2 ^ 3 ^ 2'), 512);
    });

    it('respects left-associativity for addition, subtraction, and modulo', () => {
      const parser = new DocsPortalFormulaParser();
      assert.equal(parser.evaluate('10 - 4 + 2'), 8);
      assert.equal(parser.evaluate('100 / 10 / 2'), 5);
      assert.equal(parser.evaluate('10 + 7 % 3'), 11);
    });

    it('evaluates deeply nested grouping expressions correctly', () => {
      const parser = new DocsPortalFormulaParser();
      assert.equal(parser.evaluate('(100 - (10 / 2)) * 2'), 190);
      assert.equal(parser.evaluate('((2 + 3) * (4 + 1)) ^ 2'), 625);
    });
  });

  // 5. Built-in Functions
  describe('5. Built-in scientific and mathematical functions', () => {
    it('evaluates sqrt, abs, and round correctly', () => {
      const parser = new DocsPortalFormulaParser();
      assert.equal(parser.evaluate('sqrt(16)'), 4);
      assert.equal(parser.evaluate('sqrt(0)'), 0);
      assert.equal(parser.evaluate('abs(-42)'), 42);
      assert.equal(parser.evaluate('abs(42)'), 42);
      assert.equal(parser.evaluate('round(3.7)'), 4);
      assert.equal(parser.evaluate('round(3.2)'), 3);
      assert.equal(parser.evaluate('round(3.14159, 2)'), 3.14);
      assert.equal(parser.evaluate('floor(3.9)'), 3);
      assert.equal(parser.evaluate('ceil(3.1)'), 4);
    });

    it('evaluates log, log10, ln, and exp functions', () => {
      const parser = new DocsPortalFormulaParser();
      assert.equal(parser.evaluate('exp(0)'), 1);
      assert.equal(Math.round(parser.evaluate('exp(1)') * 1000) / 1000, 2.718);
      assert.equal(parser.evaluate('log(100)'), 2);
      assert.equal(parser.evaluate('log10(1000)'), 3);
      assert.equal(parser.evaluate('ln(e)'), 1);
    });

    it('evaluates min, max, and pow functions', () => {
      const parser = new DocsPortalFormulaParser();
      assert.equal(parser.evaluate('min(5, 12)'), 5);
      assert.equal(parser.evaluate('max(5, 12)'), 12);
      assert.equal(parser.evaluate('min(10, 20, 5, 30)'), 5);
      assert.equal(parser.evaluate('max(10, 20, 5, 30)'), 30);
      assert.equal(parser.evaluate('pow(2, 3)'), 8);
      assert.equal(parser.evaluate('pow(10, 2)'), 100);
    });

    it('evaluates nested functions seamlessly', () => {
      const parser = new DocsPortalFormulaParser();
      assert.equal(parser.evaluate('max(min(10, 20), sqrt(100))'), 10);
      assert.equal(parser.evaluate('round(sqrt(pow(3, 2) + pow(4, 2)))'), 5);
    });

    it('guards against invalid domains (sqrt of negative, log of zero)', () => {
      const parser = new DocsPortalFormulaParser();
      assert.throws(
        () => parser.evaluate('sqrt(-4)'),
        /Square root of negative number is undefined/
      );
      assert.throws(
        () => parser.evaluate('log(0)'),
        /Logarithm of non-positive number is undefined/
      );
      assert.throws(
        () => parser.evaluate('ln(0)'),
        /Natural logarithm of non-positive number is undefined/
      );
    });
  });

  // 6. Variable Substitution
  describe('6. Variable substitution with documentation parameters', () => {
    it('uses default documentation parameters when none are specified', () => {
      const parser = new DocsPortalFormulaParser();
      // default monthly_pageviews = 85000, total_articles = 120
      // 85000 / 120 = 708.3333333333334
      const result = parser.evaluate('monthly_pageviews / total_articles');
      assert.ok(Math.abs(result - 708.3333) < 0.001);
    });

    it('substitutes custom parameter contexts accurately', () => {
      const parser = new DocsPortalFormulaParser();
      const formula = '(helpful_votes / (helpful_votes + unhelpful_votes)) * 100';
      const result = parser.evaluate(formula, { helpful_votes: 900, unhelpful_votes: 100 });
      assert.equal(result, 90);
    });

    it('resolves constants pi and e', () => {
      const parser = new DocsPortalFormulaParser();
      assert.equal(parser.evaluate('pi * 2'), Math.PI * 2);
      assert.equal(parser.evaluate('ln(e)'), 1);
    });

    it('throws explicit error when variable is undefined in parameter context', () => {
      const parser = new DocsPortalFormulaParser();
      assert.throws(
        () => parser.evaluate('total_articles + unknown_metric', { total_articles: 100 }),
        /Variable "unknown_metric" is undefined/
      );
    });
  });

  // 7. Division by Zero and Edge Cases
  describe('7. Edge cases: division by zero, negative numbers, whitespace variations', () => {
    it('guards safely against division by zero in divide and modulo operations', () => {
      const parser = new DocsPortalFormulaParser();

      assert.throws(
        () => parser.evaluate('42 / 0'),
        /Division by zero is undefined/
      );
      assert.throws(
        () => parser.evaluate('42 / (10 - 10)'),
        /Division by zero is undefined/
      );
      assert.throws(
        () => parser.evaluate('25 % 0'),
        /Division by zero in modulo operation/
      );
    });

    it('supports infinity guard when configured', () => {
      const parser = new DocsPortalFormulaParser({ divisionByZeroGuard: 'infinity' });
      assert.equal(parser.evaluate('42 / 0'), Infinity);
      assert.equal(parser.evaluate('-42 / 0'), -Infinity);
      assert.ok(Number.isNaN(parser.evaluate('25 % 0')));
    });

    it('evaluates negative numbers and unary negations accurately', () => {
      const parser = new DocsPortalFormulaParser();
      assert.equal(parser.evaluate('-5 + 10'), 5);
      assert.equal(parser.evaluate('2 * -3'), -6);
      assert.equal(parser.evaluate('-total_articles', { total_articles: 120 }), -120);
      assert.equal(parser.evaluate('-(2 ^ 2)'), -4);
      assert.equal(parser.evaluate('(-2) ^ 2'), 4);
    });

    it('handles erratic whitespace, tabs, and multiline expressions cleanly', () => {
      const parser = new DocsPortalFormulaParser();
      const formula = `
        monthly_pageviews
          /
        total_articles
      `;
      assert.ok(Math.abs(parser.evaluate(formula) - 708.3333) < 0.001);
    });
  });

  // 8. Calculation History and Event Emission
  describe('8. Calculation history logging and event emission', () => {
    it('logs calculation entries into audit history with unique ID and timestamp', () => {
      const parser = new DocsPortalFormulaParser();
      const res = parser.evaluate('total_articles * 2');

      const history = parser.getHistory();
      assert.equal(history.length, 1);
      assert.ok(history[0].id.startsWith('calc-'));
      assert.ok(history[0].timestamp);
      assert.equal(history[0].expression, 'total_articles * 2');
      assert.equal(history[0].result, res);
      assert.equal(history[0].status, 'SUCCESS');
      assert.equal(history[0].error, null);

      const retrieved = parser.getCalculationById(history[0].id);
      assert.equal(retrieved.id, history[0].id);
    });

    it('logs error entries when calculation fails', () => {
      const parser = new DocsPortalFormulaParser();
      assert.throws(() => parser.evaluate('total_articles / 0'));

      const history = parser.getHistory();
      assert.equal(history.length, 1);
      assert.equal(history[0].status, 'ERROR');
      assert.match(history[0].error, /Division by zero/);
      assert.equal(history[0].result, null);
    });

    it('clears calculation history properly', () => {
      const parser = new DocsPortalFormulaParser();
      parser.evaluate('10 + 20');
      parser.evaluate('30 + 40');
      assert.equal(parser.getHistory().length, 2);

      parser.clearHistory();
      assert.equal(parser.getHistory().length, 0);
    });

    it('emits evaluate, error, historyChange, and historyUpdate events', () => {
      const parser = new DocsPortalFormulaParser();
      let evalEvent = null;
      let errEvent = null;
      let historyChangePayload = null;

      parser.on('evaluate', (entry) => {
        evalEvent = entry;
      });
      parser.on('error', (entry) => {
        errEvent = entry;
      });
      parser.on('historyChange', (history) => {
        historyChangePayload = history;
      });

      parser.evaluate('sqrt(100)');
      assert.ok(evalEvent);
      assert.equal(evalEvent.result, 10);
      assert.ok(historyChangePayload);
      assert.equal(historyChangePayload.length, 1);

      assert.throws(() => parser.evaluate('sqrt(-1)'));
      assert.ok(errEvent);
      assert.match(errEvent.error, /Square root of negative number/);
      assert.equal(historyChangePayload.length, 2);

      // Test off() unregistering listener
      const dummyListener = () => {};
      parser.on('evaluate', dummyListener);
      parser.off('evaluate', dummyListener);
    });
  });

  // 9. All 6 KPI Presets Evaluation
  describe('9. Evaluation of all 6 documentation KPI presets', () => {
    it('Preset 1: Content Helpfulness Ratio (%)', () => {
      const parser = new DocsPortalFormulaParser();
      const preset = parser.presets.find((p) => p.id === 'content_helpfulness_ratio');
      assert.ok(preset);
      assert.equal(preset.formula, '(helpful_votes / (helpful_votes + unhelpful_votes)) * 100');

      // With defaults: (4200 / (4200 + 350)) * 100 = (4200 / 4550) * 100 = 92.3076923076923...
      const resultDefault = parser.evaluate(preset.formula);
      assert.ok(Math.abs(resultDefault - 92.3077) < 0.001);

      // Custom variables
      const resultCustom = parser.evaluate(preset.formula, { helpful_votes: 800, unhelpful_votes: 200 });
      assert.equal(resultCustom, 80);
    });

    it('Preset 2: Search Success Rate (%)', () => {
      const parser = new DocsPortalFormulaParser();
      const preset = parser.presets.find((p) => p.id === 'search_success_rate');
      assert.ok(preset);
      assert.equal(preset.formula, '((search_queries - zero_result_searches) / search_queries) * 100');

      // With defaults: ((28000 - 1400) / 28000) * 100 = (26600 / 28000) * 100 = 95
      const resultDefault = parser.evaluate(preset.formula);
      assert.equal(resultDefault, 95);

      // Custom variables
      const resultCustom = parser.evaluate(preset.formula, { search_queries: 10000, zero_result_searches: 500 });
      assert.equal(resultCustom, 95);
    });

    it('Preset 3: Documentation Deflection Efficiency', () => {
      const parser = new DocsPortalFormulaParser();
      const preset = parser.presets.find((p) => p.id === 'docs_deflection_efficiency');
      assert.ok(preset);
      assert.equal(preset.formula, '(1 - escalation_rate) * 100');

      // With defaults: (1 - 0.045) * 100 = 0.955 * 100 = 95.5
      const resultDefault = parser.evaluate(preset.formula);
      assert.equal(resultDefault, 95.5);

      // Custom variables
      const resultCustom = parser.evaluate(preset.formula, { escalation_rate: 0.1 });
      assert.equal(resultCustom, 90);
    });

    it('Preset 4: Pageview Per Article Density', () => {
      const parser = new DocsPortalFormulaParser();
      const preset = parser.presets.find((p) => p.id === 'pageview_per_article_density');
      assert.ok(preset);
      assert.equal(preset.formula, 'monthly_pageviews / total_articles');

      // With defaults: 85000 / 120 = 708.3333333333334
      const resultDefault = parser.evaluate(preset.formula);
      assert.ok(Math.abs(resultDefault - 708.3333) < 0.001);

      // Custom variables
      const resultCustom = parser.evaluate(preset.formula, { monthly_pageviews: 50000, total_articles: 100 });
      assert.equal(resultCustom, 500);
    });

    it('Preset 5: Search To Pageview Ratio', () => {
      const parser = new DocsPortalFormulaParser();
      const preset = parser.presets.find((p) => p.id === 'search_to_pageview_ratio');
      assert.ok(preset);
      assert.equal(preset.formula, '(search_queries / monthly_pageviews) * 100');

      // With defaults: (28000 / 85000) * 100 = 32.94117647058824
      const resultDefault = parser.evaluate(preset.formula);
      assert.ok(Math.abs(resultDefault - 32.9412) < 0.001);

      // Custom variables
      const resultCustom = parser.evaluate(preset.formula, { search_queries: 25000, monthly_pageviews: 100000 });
      assert.equal(resultCustom, 25);
    });

    it('Preset 6: Docs Health Score', () => {
      const parser = new DocsPortalFormulaParser();
      const preset = parser.presets.find((p) => p.id === 'docs_health_score');
      assert.ok(preset);
      assert.equal(
        preset.formula,
        'round((((helpful_votes / (helpful_votes + unhelpful_votes)) * 100) + ((1 - escalation_rate) * 100)) / 2)'
      );

      // With defaults:
      // helpfulness ratio = 92.307692...
      // deflection efficiency = 95.5
      // sum = 187.807692...
      // / 2 = 93.903846...
      // round(...) = 94
      const resultDefault = parser.evaluate(preset.formula);
      assert.equal(resultDefault, 94);

      // Custom variables
      const resultCustom = parser.evaluate(preset.formula, {
        helpful_votes: 900,
        unhelpful_votes: 100, // 90%
        escalation_rate: 0.2   // 80%
      });
      // (90 + 80) / 2 = 85
      assert.equal(resultCustom, 85);
    });
  });
});
