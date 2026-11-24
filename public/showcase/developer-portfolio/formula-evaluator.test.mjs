import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DeveloperPortfolioFormulaParser,
  DEFAULT_DEVELOPER_VARIABLES,
  DEVELOPER_KPI_PRESETS
} from './formula-evaluator.js';

describe('DeveloperPortfolioFormulaParser', () => {
  // 1. Initialization and configuration
  describe('1. Default initialization and configuration', () => {
    it('instantiates with expected default properties, operators, and developer metrics variables', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      assert.equal(parser.name, 'DeveloperPortfolioFormulaParser');

      // Operators
      assert.ok(parser.operators['+']);
      assert.ok(parser.operators['-']);
      assert.ok(parser.operators['*']);
      assert.ok(parser.operators['/']);
      assert.ok(parser.operators['^']);
      assert.ok(parser.operators['%']);
      assert.ok(parser.operators['u-']);
      assert.ok(parser.operators['u+']);

      // Supported functions
      assert.ok(parser.supportedFunctions.has('sqrt'));
      assert.ok(parser.supportedFunctions.has('log'));
      assert.ok(parser.supportedFunctions.has('ln'));
      assert.ok(parser.supportedFunctions.has('exp'));
      assert.ok(parser.supportedFunctions.has('abs'));
      assert.ok(parser.supportedFunctions.has('round'));
      assert.ok(parser.supportedFunctions.has('floor'));
      assert.ok(parser.supportedFunctions.has('ceil'));
      assert.ok(parser.supportedFunctions.has('min'));
      assert.ok(parser.supportedFunctions.has('max'));
      assert.ok(parser.supportedFunctions.has('pow'));

      // Default Developer Variables
      assert.equal(parser.defaultVariables.total_commits, 850);
      assert.equal(parser.defaultVariables.pull_requests_merged, 65);
      assert.equal(parser.defaultVariables.code_review_score, 4.8);
      assert.equal(parser.defaultVariables.lines_of_code_shipped, 45000);
      assert.equal(parser.defaultVariables.test_coverage_rate, 0.92);
      assert.equal(parser.defaultVariables.open_source_contributions, 35);
      assert.equal(parser.defaultVariables.bug_resolution_hours, 3.5);
      assert.equal(parser.defaultVariables.uptime_sla_rate, 0.999);

      // Audit history starts empty
      assert.deepEqual(parser.getHistory(), []);
    });

    it('accepts custom constructor options and variable overrides', () => {
      const parser = new DeveloperPortfolioFormulaParser({
        variables: { total_commits: 1200, custom_var: 10 },
        maxHistorySize: 15,
        precision: 2
      });
      assert.equal(parser.defaultVariables.total_commits, 1200);
      assert.equal(parser.defaultVariables.custom_var, 10);
      assert.equal(parser.defaultVariables.pull_requests_merged, 65);
      assert.equal(parser.maxHistorySize, 15);
      assert.equal(parser.options.precision, 2);
    });

    it('exposes KPI presets statically and through DEVELOPER_KPI_PRESETS export', () => {
      const presets = DeveloperPortfolioFormulaParser.KPI_PRESETS;
      assert.ok(presets.contributor_velocity);
      assert.ok(presets.code_quality);
      assert.ok(presets.engineering_productivity);
      assert.ok(presets.reliability_factor);
      assert.ok(presets.pr_impact_ratio);
      assert.ok(presets.portfolio_composite_rating);
      assert.equal(presets, DEVELOPER_KPI_PRESETS);
    });
  });

  // 2. Expression tokenization
  describe('2. Expression tokenization', () => {
    it('tokenizes integers, floating-point decimals, and scientific notation', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      const tokens = parser.tokenize('100 + 3.1415 + 1e4 + 2.5e-3 + .92');

      assert.equal(tokens.length, 9);
      assert.equal(tokens[0].value, 100);
      assert.equal(tokens[2].value, 3.1415);
      assert.equal(tokens[4].value, 10000);
      assert.equal(tokens[6].value, 0.0025);
      assert.equal(tokens[8].value, 0.92);
    });

    it('tokenizes developer variables, functions, and parentheses', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      const tokens = parser.tokenize('(total_commits * 0.2) + sqrt(pull_requests_merged)');

      assert.equal(tokens[0].type, 'LPAREN');
      assert.equal(tokens[1].type, 'VARIABLE');
      assert.equal(tokens[1].value, 'total_commits');
      assert.equal(tokens[2].type, 'OPERATOR');
      assert.equal(tokens[2].value, '*');
      assert.equal(tokens[3].type, 'NUMBER');
      assert.equal(tokens[3].value, 0.2);
      assert.equal(tokens[4].type, 'RPAREN');
      assert.equal(tokens[5].type, 'OPERATOR');
      assert.equal(tokens[5].value, '+');
      assert.equal(tokens[6].type, 'FUNCTION');
      assert.equal(tokens[6].value, 'sqrt');
      assert.equal(tokens[7].type, 'LPAREN');
      assert.equal(tokens[8].type, 'VARIABLE');
      assert.equal(tokens[8].value, 'pull_requests_merged');
      assert.equal(tokens[9].type, 'RPAREN');
    });

    it('differentiates binary operators from unary plus/minus operators', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      const tokens = parser.tokenize('-total_commits + (-5 * +3)');

      assert.equal(tokens[0].type, 'OPERATOR');
      assert.equal(tokens[0].value, 'u-');
      assert.equal(tokens[0].unary, true);

      assert.equal(tokens[2].type, 'OPERATOR');
      assert.equal(tokens[2].value, '+');
      assert.equal(tokens[2].unary, false);

      assert.equal(tokens[4].type, 'OPERATOR');
      assert.equal(tokens[4].value, 'u-');
      assert.equal(tokens[4].unary, true);

      assert.equal(tokens[7].type, 'OPERATOR');
      assert.equal(tokens[7].value, 'u+');
      assert.equal(tokens[7].unary, true);
    });

    it('throws descriptive error on invalid or unexpected characters', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      assert.throws(
        () => parser.tokenize('total_commits $ 2'),
        /Unexpected character in formula: "\$"/
      );
      assert.throws(
        () => parser.tokenize('code_review_score @ 5'),
        /Unexpected character in formula: "@"/
      );
    });
  });

  // 3. Syntax validation
  describe('3. Syntax validation', () => {
    it('detects empty or whitespace-only expressions', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      assert.equal(parser.validateSyntax('').valid, false);
      assert.equal(parser.validateSyntax('    ').valid, false);
      assert.match(parser.validateSyntax('').error, /Expression cannot be empty/);
    });

    it('detects unbalanced and mismatched parentheses', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      assert.equal(parser.validateSyntax('(total_commits + 50').valid, false);
      assert.match(parser.validateSyntax('(total_commits + 50').error, /missing closing "\)"/);

      assert.equal(parser.validateSyntax('total_commits + 50)').valid, false);
      assert.match(parser.validateSyntax('total_commits + 50)').error, /unexpected closing "\)"/);

      assert.equal(parser.validateSyntax('((total_commits * 2) + 1').valid, false);
      assert.match(parser.validateSyntax('((total_commits * 2) + 1').error, /missing closing "\)"/);
    });

    it('detects empty parentheses', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      assert.equal(parser.validateSyntax('total_commits + ()').valid, false);
      assert.match(parser.validateSyntax('total_commits + ()').error, /Empty parentheses detected/);

      assert.equal(parser.validateSyntax('sqrt()').valid, false);
      assert.match(parser.validateSyntax('sqrt()').error, /Empty parentheses detected/);
    });

    it('detects consecutive operators and misplaced operators', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      assert.equal(parser.validateSyntax('10 + * 5').valid, false);
      assert.match(parser.validateSyntax('10 + * 5').error, /Consecutive operators detected/);

      assert.equal(parser.validateSyntax('* 10 + 5').valid, false);
      assert.match(parser.validateSyntax('* 10 + 5').error, /Expression cannot start with a binary operator/);

      assert.equal(parser.validateSyntax('10 + 5 *').valid, false);
      assert.match(parser.validateSyntax('10 + 5 *').error, /Expression cannot end with an operator/);

      assert.equal(parser.validateSyntax('sqrt + 5').valid, false);
      assert.match(parser.validateSyntax('sqrt + 5').error, /Function "sqrt" must be followed by parentheses/);
    });

    it('validates properly formed expressions successfully', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      assert.equal(parser.validateSyntax('(total_commits * 0.2) + (pull_requests_merged * 1.5)').valid, true);
      assert.equal(parser.validateSyntax('sqrt(abs(-total_commits)) * pow(2, 3)').valid, true);
      assert.equal(parser.validateSyntax('min(10, 20, 30) + max(5, 15)').valid, true);
    });
  });

  // 4. Operator precedence (BODMAS / PEMDAS)
  describe('4. Operator precedence (BODMAS/PEMDAS: ^ > * / % > + -)', () => {
    it('executes multiplication and division before addition and subtraction', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      assert.equal(parser.evaluate('2 + 3 * 4'), 14);
      assert.equal(parser.evaluate('(2 + 3) * 4'), 20);
      assert.equal(parser.evaluate('20 - 10 / 2'), 15);
      assert.equal(parser.evaluate('(20 - 10) / 2'), 5);
    });

    it('executes exponentiation before multiplication with right-associativity', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      assert.equal(parser.evaluate('2 ^ 3 * 2'), 16);
      assert.equal(parser.evaluate('2 * 3 ^ 2'), 18);
      // Right-associative: 2 ^ 3 ^ 2 = 2 ^ (3 ^ 2) = 2 ^ 9 = 512
      assert.equal(parser.evaluate('2 ^ 3 ^ 2'), 512);
    });

    it('respects left-associativity for addition, subtraction, division, and modulo', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      assert.equal(parser.evaluate('10 - 4 + 2'), 8);
      assert.equal(parser.evaluate('100 / 10 / 2'), 5);
      assert.equal(parser.evaluate('17 % 5'), 2);
      assert.equal(parser.evaluate('10 + 17 % 5 * 3'), 16);
    });

    it('evaluates deeply nested grouping expressions correctly', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      assert.equal(parser.evaluate('(100 - (10 / 2)) * 2'), 190);
      assert.equal(parser.evaluate('((2 + 3) * (4 + 1)) ^ 2'), 625);
    });
  });

  // 5. Built-in functions
  describe('5. Built-in mathematical functions (sqrt, log, ln, exp, abs, min, max, round, floor, ceil, pow)', () => {
    it('evaluates sqrt, abs, floor, and ceil correctly', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      assert.equal(parser.evaluate('sqrt(16)'), 4);
      assert.equal(parser.evaluate('sqrt(0)'), 0);
      assert.equal(parser.evaluate('abs(-42)'), 42);
      assert.equal(parser.evaluate('abs(42)'), 42);
      assert.equal(parser.evaluate('floor(4.9)'), 4);
      assert.equal(parser.evaluate('ceil(4.1)'), 5);
    });

    it('evaluates round with 1 or 2 arguments', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      assert.equal(parser.evaluate('round(3.7)'), 4);
      assert.equal(parser.evaluate('round(3.2)'), 3);
      assert.equal(parser.evaluate('round(3.14159, 2)'), 3.14);
      assert.equal(parser.evaluate('round(3.14159, 4)'), 3.1416);
    });

    it('evaluates log, ln, and exp functions', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      assert.equal(parser.evaluate('log(1000)'), 3);
      assert.equal(parser.evaluate('exp(0)'), 1);
      assert.equal(Math.round(parser.evaluate('ln(exp(2))')), 2);
    });

    it('evaluates pow, min, and max functions', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      assert.equal(parser.evaluate('pow(2, 3)'), 8);
      assert.equal(parser.evaluate('pow(3, 4)'), 81);
      assert.equal(parser.evaluate('min(5, 12)'), 5);
      assert.equal(parser.evaluate('max(5, 12)'), 12);
      assert.equal(parser.evaluate('min(10, 20, 5, 30)'), 5);
      assert.equal(parser.evaluate('max(10, 20, 5, 30)'), 30);
    });

    it('evaluates nested functions', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      assert.equal(parser.evaluate('sqrt(pow(3, 2) + pow(4, 2))'), 5);
      assert.equal(parser.evaluate('max(sqrt(25), min(10, 2))'), 5);
    });

    it('guards against invalid domains (sqrt negative, log non-positive)', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      assert.throws(
        () => parser.evaluate('sqrt(-4)'),
        /Square root of negative number/
      );
      assert.throws(
        () => parser.evaluate('log(0)'),
        /Logarithm of non-positive number/
      );
      assert.throws(
        () => parser.evaluate('ln(-2)'),
        /Natural logarithm of non-positive number/
      );
    });
  });

  // 6. Variable substitution
  describe('6. Variable substitution with developer metrics', () => {
    it('uses default developer variables when no overrides provided', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      // total_commits = 850, pull_requests_merged = 65
      assert.equal(parser.evaluate('total_commits + pull_requests_merged'), 915);
    });

    it('substitutes custom variables and parameter overrides', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      const customVars = { total_commits: 1000, pull_requests_merged: 100 };
      assert.equal(parser.evaluate('total_commits + pull_requests_merged', customVars), 1100);

      // Ad-hoc variable injection
      assert.equal(parser.evaluate('custom_metric * 2', { custom_metric: 25 }), 50);
    });

    it('throws explicit error when variable is undefined in context', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      assert.throws(
        () => parser.evaluate('total_commits + unassigned_metric'),
        /Undefined variable: "unassigned_metric"/
      );
    });
  });

  // 7. Edge cases
  describe('7. Edge cases (division by zero, negative numbers, whitespace, scientific notation)', () => {
    it('guards safely against division by zero in divide and modulo operations', () => {
      const parser = new DeveloperPortfolioFormulaParser();

      assert.throws(
        () => parser.evaluate('total_commits / 0'),
        /Division by zero/
      );

      assert.throws(
        () => parser.evaluate('total_commits / (code_review_score - 4.8)'),
        /Division by zero/
      );

      assert.throws(
        () => parser.evaluate('100 % 0'),
        /Division by zero in modulo operation/
      );
    });

    it('evaluates negative numbers and unary negation correctly', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      assert.equal(parser.evaluate('-5 + 10'), 5);
      assert.equal(parser.evaluate('2 * -3'), -6);
      assert.equal(parser.evaluate('(-2) ^ 3'), -8);
      assert.equal(parser.evaluate('-(2 ^ 2)'), -4);
      assert.equal(parser.evaluate('(-2) ^ 2'), 4);
    });

    it('handles irregular whitespace and multiline strings cleanly', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      const formula = `
        (
          total_commits * 0.2
        )
        +
        (
          pull_requests_merged * 1.5
        )
      `;
      assert.equal(parser.evaluate(formula), 267.5);
    });

    it('handles scientific notation in arithmetic calculations', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      assert.equal(parser.evaluate('1e4 / 2e2'), 50);
      assert.equal(parser.evaluate('2.5e3 + 500'), 3000);
    });
  });

  // 8. Calculation audit history & event emission
  describe('8. Calculation audit history & event emission', () => {
    it('logs calculation entries into audit history with unique ID and timestamp', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      const res = parser.evaluate('total_commits * 2');

      const history = parser.getHistory();
      assert.equal(history.length, 1);
      assert.ok(history[0].id.startsWith('CALC-'));
      assert.ok(history[0].timestamp);
      assert.equal(history[0].expression, 'total_commits * 2');
      assert.equal(history[0].result, res);
      assert.equal(history[0].status, 'SUCCESS');
      assert.equal(history[0].error, null);

      const retrieved = parser.getCalculationById(history[0].id);
      assert.equal(retrieved.id, history[0].id);
    });

    it('caps history size at configured maxHistorySize', () => {
      const parser = new DeveloperPortfolioFormulaParser({ maxHistorySize: 3 });
      parser.evaluate('1 + 1');
      parser.evaluate('2 + 2');
      parser.evaluate('3 + 3');
      assert.equal(parser.getHistory().length, 3);

      parser.evaluate('4 + 4');
      assert.equal(parser.getHistory().length, 3);
      assert.equal(parser.getHistory()[0].result, 8);
    });

    it('clears calculation audit history correctly', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      parser.evaluate('10 + 20');
      parser.evaluate('30 + 40');
      assert.equal(parser.getHistory().length, 2);

      parser.clearHistory();
      assert.equal(parser.getHistory().length, 0);
    });

    it('emits evaluate, error, and historyChange events', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      let evaluateFired = false;
      let errorFired = false;
      let historyCount = 0;

      const unsubEval = parser.on('evaluate', (record) => {
        evaluateFired = true;
        assert.equal(record.result, 10);
      });

      parser.on('error', (record) => {
        errorFired = true;
        assert.ok(record.error.includes('Division by zero'));
      });

      parser.on('historyChange', (history) => {
        historyCount = history.length;
      });

      parser.evaluate('sqrt(100)');
      assert.equal(evaluateFired, true);
      assert.equal(historyCount, 1);

      assert.throws(() => parser.evaluate('10 / 0'));
      assert.equal(errorFired, true);
      assert.equal(historyCount, 2);

      unsubEval();
      evaluateFired = false;
      parser.evaluate('5 + 5');
      assert.equal(evaluateFired, false); // unsubscribed
    });
  });

  // 9. All 6 KPI Preset Evaluations
  describe('9. Evaluation of all 6 KPI presets', () => {
    it('evaluates Contributor Velocity Index correctly', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      const preset = DEVELOPER_KPI_PRESETS.contributor_velocity;
      // Formula: (total_commits * 0.2) + (pull_requests_merged * 1.5) + (open_source_contributions * 2.0)
      // (850 * 0.2) + (65 * 1.5) + (35 * 2.0) = 170 + 97.5 + 70 = 337.5
      const val = parser.evaluate(preset.formula);
      assert.equal(val, 337.5);
    });

    it('evaluates Code Quality Metric correctly', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      const preset = DEVELOPER_KPI_PRESETS.code_quality;
      // Formula: (test_coverage_rate * 100) * (code_review_score / 5.0)
      // (0.92 * 100) * (4.8 / 5.0) = 92 * 0.96 = 88.32
      const val = parser.evaluate(preset.formula);
      assert.equal(val, 88.32);
    });

    it('evaluates Engineering Productivity Score correctly', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      const preset = DEVELOPER_KPI_PRESETS.engineering_productivity;
      // Formula: ((lines_of_code_shipped / 1000) * test_coverage_rate) / bug_resolution_hours
      // ((45000 / 1000) * 0.92) / 3.5 = (45 * 0.92) / 3.5 = 41.4 / 3.5 = 11.82857142857143
      const val = parser.evaluate(preset.formula);
      assert.ok(Math.abs(val - (41.4 / 3.5)) < 1e-9);
    });

    it('evaluates Reliability Factor correctly', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      const preset = DEVELOPER_KPI_PRESETS.reliability_factor;
      // Formula: uptime_sla_rate * 100
      // 0.999 * 100 = 99.9
      const val = parser.evaluate(preset.formula);
      assert.equal(val, 99.9);
    });

    it('evaluates Pull Request Impact Ratio correctly', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      const preset = DEVELOPER_KPI_PRESETS.pr_impact_ratio;
      // Formula: pull_requests_merged / (total_commits / 10)
      // 65 / (850 / 10) = 65 / 85 = 0.7647058823529411
      const val = parser.evaluate(preset.formula);
      assert.ok(Math.abs(val - (65 / 85)) < 1e-9);
    });

    it('evaluates Portfolio Composite Rating correctly', () => {
      const parser = new DeveloperPortfolioFormulaParser();
      const preset = DEVELOPER_KPI_PRESETS.portfolio_composite_rating;
      // Formula: round(((test_coverage_rate * 100) + (code_review_score * 20)) / 2)
      // round(((0.92 * 100) + (4.8 * 20)) / 2) = round((92 + 96) / 2) = round(94) = 94
      const val = parser.evaluate(preset.formula);
      assert.equal(val, 94);
    });
  });
});
