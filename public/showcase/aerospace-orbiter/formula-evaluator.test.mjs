import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  AerospaceOrbiterFormulaParser,
  DEFAULT_ORBITAL_VARIABLES,
  AEROSPACE_FORMULA_PRESETS
} from './formula-evaluator.js';

describe('AerospaceOrbiterFormulaParser Test Suite', () => {

  // 1. Default initialization and configuration
  describe('1. Default initialization and configuration', () => {
    test('instantiates with default options and variables', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      assert.ok(parser instanceof AerospaceOrbiterFormulaParser);

      const vars = parser.getVariables();
      assert.equal(vars.orbital_altitude, DEFAULT_ORBITAL_VARIABLES.orbital_altitude);
      assert.equal(vars.escape_velocity, DEFAULT_ORBITAL_VARIABLES.escape_velocity);
      assert.equal(vars.delta_v, DEFAULT_ORBITAL_VARIABLES.delta_v);
      assert.equal(vars.thrust_to_weight, DEFAULT_ORBITAL_VARIABLES.thrust_to_weight);
      assert.equal(vars.specific_impulse, DEFAULT_ORBITAL_VARIABLES.specific_impulse);
      assert.equal(vars.apogee, DEFAULT_ORBITAL_VARIABLES.apogee);
      assert.equal(vars.perigee, DEFAULT_ORBITAL_VARIABLES.perigee);

      assert.equal(parser.history.length, 0);
      assert.equal(parser.maxHistory, 100);
    });

    test('accepts custom initial options and variables', () => {
      const parser = new AerospaceOrbiterFormulaParser({
        variables: { orbital_altitude: 550, custom_kpi: 42 },
        maxHistory: 25
      });
      const vars = parser.getVariables();
      assert.equal(vars.orbital_altitude, 550);
      assert.equal(vars.custom_kpi, 42);
      assert.equal(parser.maxHistory, 25);
    });

    test('exposes all core API methods', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      assert.equal(typeof parser.tokenize, 'function');
      assert.equal(typeof parser.validateSyntax, 'function');
      assert.equal(typeof parser.toRPN, 'function');
      assert.equal(typeof parser.evaluate, 'function');
      assert.equal(typeof parser.on, 'function');
      assert.equal(typeof parser.off, 'function');
      assert.equal(typeof parser.emit, 'function');
      assert.equal(typeof parser.getHistory, 'function');
      assert.equal(typeof parser.clearHistory, 'function');
      assert.equal(typeof parser.getHistoryById, 'function');
      assert.equal(typeof parser.setVariable, 'function');
      assert.equal(typeof parser.resetVariables, 'function');
    });

    test('exports standard aerospace formula presets', () => {
      assert.ok(Array.isArray(AEROSPACE_FORMULA_PRESETS));
      assert.ok(AEROSPACE_FORMULA_PRESETS.length >= 6);
      const visViva = AEROSPACE_FORMULA_PRESETS.find(p => p.id === 'vis_viva');
      assert.ok(visViva);
      assert.equal(visViva.unit, 'km/s');
    });
  });

  // 2. Expression tokenization
  describe('2. Expression tokenization', () => {
    test('tokenizes integer and floating point numbers', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      const tokens = parser.tokenize('42 + 3.14159');
      assert.equal(tokens.length, 3);
      assert.equal(tokens[0].type, 'number');
      assert.equal(tokens[0].value, 42);
      assert.equal(tokens[1].type, 'operator');
      assert.equal(tokens[1].value, '+');
      assert.equal(tokens[2].type, 'number');
      assert.equal(tokens[2].value, 3.14159);
    });

    test('tokenizes scientific notation numbers (e and E)', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      const tokens = parser.tokenize('1.5e-3 * 2.4E5 + 1e4');
      assert.equal(tokens.length, 5);
      assert.equal(tokens[0].value, 0.0015);
      assert.equal(tokens[2].value, 240000);
      assert.equal(tokens[4].value, 10000);
    });

    test('tokenizes variables and scientific functions', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      const tokens = parser.tokenize('sqrt(orbital_altitude) + abs(delta_v)');
      assert.equal(tokens[0].type, 'function');
      assert.equal(tokens[0].value, 'sqrt');
      assert.equal(tokens[1].type, 'lparen');
      assert.equal(tokens[2].type, 'variable');
      assert.equal(tokens[2].value, 'orbital_altitude');
      assert.equal(tokens[3].type, 'rparen');
      assert.equal(tokens[4].type, 'operator');
      assert.equal(tokens[5].type, 'function');
      assert.equal(tokens[5].value, 'abs');
      assert.equal(tokens[7].type, 'variable');
      assert.equal(tokens[7].value, 'delta_v');
    });

    test('tokenizes all supported operators (+, -, *, /, ^, %)', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      const tokens = parser.tokenize('1 + 2 - 3 * 4 / 5 ^ 6 % 7');
      const opTokens = tokens.filter(t => t.type === 'operator');
      assert.deepEqual(opTokens.map(t => t.value), ['+', '-', '*', '/', '^', '%']);
    });

    test('tokenizes parentheses and commas', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      const tokens = parser.tokenize('min(10, 20)');
      assert.equal(tokens[0].type, 'function');
      assert.equal(tokens[1].type, 'lparen');
      assert.equal(tokens[2].type, 'number');
      assert.equal(tokens[3].type, 'comma');
      assert.equal(tokens[4].type, 'number');
      assert.equal(tokens[5].type, 'rparen');
    });

    test('throws descriptive error on invalid characters', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      assert.throws(() => parser.tokenize('10 $ 5'), /Invalid character '\$' at index 3/);
      assert.throws(() => parser.tokenize('10 @ 5'), /Invalid character '@'/);
    });
  });

  // 3. Syntax validation
  describe('3. Syntax validation', () => {
    test('confirms valid expressions return valid: true', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      assert.deepEqual(parser.validateSyntax('1 + 1'), { valid: true });
      assert.deepEqual(parser.validateSyntax('sqrt(orbital_altitude * 2)'), { valid: true });
      assert.deepEqual(parser.validateSyntax('min(apogee, perigee) + 10'), { valid: true });
      assert.deepEqual(parser.validateSyntax('-5 + 3'), { valid: true });
    });

    test('rejects empty or whitespace expressions', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      assert.equal(parser.validateSyntax('').valid, false);
      assert.equal(parser.validateSyntax('   ').valid, false);
      assert.match(parser.validateSyntax('').error, /empty/i);
    });

    test('detects unbalanced or misplaced parentheses', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      assert.equal(parser.validateSyntax('(1 + 2').valid, false);
      assert.match(parser.validateSyntax('(1 + 2').error, /Unclosed parenthesis/i);

      assert.equal(parser.validateSyntax('1 + 2)').valid, false);
      assert.match(parser.validateSyntax('1 + 2)').error, /Unmatched closing parenthesis/i);
    });

    test('rejects empty parentheses ()', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      assert.equal(parser.validateSyntax('5 + ()').valid, false);
      assert.match(parser.validateSyntax('5 + ()').error, /Empty parentheses/i);
    });

    test('rejects consecutive binary operators', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      assert.equal(parser.validateSyntax('5 + * 3').valid, false);
      assert.match(parser.validateSyntax('5 + * 3').error, /Consecutive binary operators/i);

      assert.equal(parser.validateSyntax('10 / / 2').valid, false);
      assert.match(parser.validateSyntax('10 / / 2').error, /Consecutive binary operators/i);
    });

    test('rejects invalid leading or trailing operators', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      assert.equal(parser.validateSyntax('* 5').valid, false);
      assert.match(parser.validateSyntax('* 5').error, /cannot start with binary operator/i);

      assert.equal(parser.validateSyntax('5 +').valid, false);
      assert.match(parser.validateSyntax('5 +').error, /cannot end with operator/i);
    });

    test('rejects functions without parentheses', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      assert.equal(parser.validateSyntax('sqrt + 5').valid, false);
      assert.match(parser.validateSyntax('sqrt + 5').error, /must be followed by '\('/i);
    });
  });

  // 4. Operator precedence (BODMAS/PEMDAS)
  describe('4. Operator precedence (BODMAS/PEMDAS)', () => {
    test('exponentiation ^ precedes multiplication and division', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      // 2 * 3 ^ 2 = 2 * 9 = 18 (not (2*3)^2 = 36)
      assert.equal(parser.evaluate('2 * 3 ^ 2'), 18);
      // 32 / 2 ^ 3 = 32 / 8 = 4
      assert.equal(parser.evaluate('32 / 2 ^ 3'), 4);
    });

    test('multiplication and division precede addition and subtraction', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      // 2 + 3 * 4 = 2 + 12 = 14 (not 20)
      assert.equal(parser.evaluate('2 + 3 * 4'), 14);
      // 20 - 10 / 2 = 20 - 5 = 15
      assert.equal(parser.evaluate('20 - 10 / 2'), 15);
    });

    test('exponentiation ^ is right-associative', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      // 2 ^ 3 ^ 2 should be 2 ^ (3 ^ 2) = 2 ^ 9 = 512, NOT (2^3)^2 = 64
      assert.equal(parser.evaluate('2 ^ 3 ^ 2'), 512);
    });

    test('parentheses override default precedence', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      assert.equal(parser.evaluate('(2 + 3) * 4'), 20);
      assert.equal(parser.evaluate('(2 * 3) ^ 2'), 36);
    });

    test('modulo % has same precedence as multiplication and division', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      // 10 - 7 % 4 = 10 - 3 = 7
      assert.equal(parser.evaluate('10 - 7 % 4'), 7);
      // 5 * 7 % 4 = 35 % 4 = 3
      assert.equal(parser.evaluate('5 * 7 % 4'), 3);
    });
  });

  // 5. Built-in scientific functions
  describe('5. Built-in scientific functions', () => {
    test('evaluates sqrt, log, ln, exp, abs, round', () => {
      const parser = new AerospaceOrbiterFormulaParser();

      assert.equal(parser.evaluate('sqrt(16)'), 4);
      assert.equal(parser.evaluate('sqrt(0)'), 0);
      assert.equal(parser.evaluate('log(100)'), 2); // base-10 log
      assert.equal(parser.evaluate('log(1000)'), 3);
      assert.equal(parser.evaluate('ln(e)'), 1);    // natural log
      assert.equal(parser.evaluate('exp(0)'), 1);
      assert.equal(parser.evaluate('abs(-42)'), 42);
      assert.equal(parser.evaluate('abs(42)'), 42);
      assert.equal(parser.evaluate('round(3.7)'), 4);
      assert.equal(parser.evaluate('round(3.2)'), 3);
    });

    test('evaluates 2-argument functions min and max', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      assert.equal(parser.evaluate('min(10, 20)'), 10);
      assert.equal(parser.evaluate('min(50, 5)'), 5);
      assert.equal(parser.evaluate('max(10, 20)'), 20);
      assert.equal(parser.evaluate('max(50, 5)'), 50);
    });

    test('evaluates nested function calls', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      assert.equal(parser.evaluate('sqrt(abs(-16))'), 4);
      assert.equal(parser.evaluate('max(5, sqrt(100))'), 10);
      assert.equal(parser.evaluate('round(sqrt(20))'), 4);
    });

    test('guards against mathematical domain errors', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      assert.throws(() => parser.evaluate('sqrt(-4)'), /Square root of negative number/);
      assert.throws(() => parser.evaluate('log(0)'), /Logarithm of non-positive number/);
      assert.throws(() => parser.evaluate('log(-10)'), /Logarithm of non-positive number/);
      assert.throws(() => parser.evaluate('ln(0)'), /Natural logarithm of non-positive number/);
      assert.throws(() => parser.evaluate('ln(-1)'), /Natural logarithm of non-positive number/);
    });
  });

  // 6. Variable substitution with aerospace parameters
  describe('6. Variable substitution with aerospace parameters', () => {
    test('substitutes default aerospace trajectory variables', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      assert.equal(parser.evaluate('orbital_altitude'), 408);
      assert.equal(parser.evaluate('escape_velocity'), 11.186);
      assert.equal(parser.evaluate('delta_v'), 3.2);
      assert.equal(parser.evaluate('thrust_to_weight'), 1.45);
      assert.equal(parser.evaluate('specific_impulse'), 311);
      assert.equal(parser.evaluate('apogee'), 420);
      assert.equal(parser.evaluate('perigee'), 400);
    });

    test('calculates semi-major axis from apogee and perigee', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      // (apogee + perigee) / 2 = (420 + 400) / 2 = 410
      const semiMajor = parser.evaluate('(apogee + perigee) / 2');
      assert.equal(semiMajor, 410);
    });

    test('calculates vis-viva orbital velocity using Earth gravitational parameter', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      // sqrt(398600.4418 / (6371 + 408))
      const velocity = parser.evaluate('sqrt(398600.4418 / (6371 + orbital_altitude))');
      assert.ok(velocity > 7.6 && velocity < 7.7);
    });

    test('allows ad-hoc variable overrides in evaluate()', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      const res = parser.evaluate('orbital_altitude * 2', { orbital_altitude: 500 });
      assert.equal(res, 1000);
      // original parser variable remains unchanged
      assert.equal(parser.getVariables().orbital_altitude, 408);
    });

    test('throws descriptive error on undefined variables', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      assert.throws(() => parser.evaluate('unknown_telemetry_var + 10'), /Undefined variable 'unknown_telemetry_var'/);
    });
  });

  // 7. Edge cases: division by zero, negative numbers, whitespace
  describe('7. Edge cases: division by zero, negative numbers, whitespace variations', () => {
    test('safely handles division by zero', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      assert.throws(() => parser.evaluate('100 / 0'), /Division by zero/i);
      assert.throws(() => parser.evaluate('100 / (5 - 5)'), /Division by zero/i);
    });

    test('safely handles modulo by zero', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      assert.throws(() => parser.evaluate('100 % 0'), /Modulo by zero/i);
    });

    test('evaluates negative numbers and unary minus operations', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      assert.equal(parser.evaluate('-5 + 3'), -2);
      assert.equal(parser.evaluate('2 * -4'), -8);
      assert.equal(parser.evaluate('-(3 + 2)'), -5);
      assert.equal(parser.evaluate('-sqrt(16)'), -4);
      assert.equal(parser.evaluate('2 ^ -2'), 0.25);
    });

    test('handles unary plus operator', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      assert.equal(parser.evaluate('+5 + 3'), 8);
      assert.equal(parser.evaluate('2 * +4'), 8);
    });

    test('handles arbitrary whitespace variations', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      assert.equal(parser.evaluate('   10    +    20   '), 30);
      assert.equal(parser.evaluate('\t sqrt ( \n 25 \t ) \t'), 5);
      assert.equal(parser.evaluate('min (   4  ,  9  )'), 4);
    });

    test('cleans IEEE 754 precision artifacts', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      assert.equal(parser.evaluate('0.1 + 0.2'), 0.3);
    });
  });

  // 8. Calculation history logging and event emission
  describe('8. Calculation history logging and event emission', () => {
    test('logs calculations to audit trail history with unique IDs and timestamps', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      assert.equal(parser.getHistory().length, 0);

      const res1 = parser.evaluate('10 + 20');
      assert.equal(res1, 30);
      const history1 = parser.getHistory();
      assert.equal(history1.length, 1);
      assert.ok(history1[0].id.startsWith('calc-'));
      assert.equal(history1[0].expression, '10 + 20');
      assert.equal(history1[0].result, 30);
      assert.ok(history1[0].timestamp);
      assert.ok(typeof history1[0].durationMs === 'number');

      parser.evaluate('sqrt(100)');
      const history2 = parser.getHistory();
      assert.equal(history2.length, 2);
      assert.equal(history2[0].expression, 'sqrt(100)');
      assert.equal(history2[0].result, 10);
    });

    test('finds record by calculation ID and clears history', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      parser.evaluate('5 * 5');
      const entry = parser.getHistory()[0];
      assert.ok(entry);

      const found = parser.getHistoryById(entry.id);
      assert.deepEqual(found, entry);

      parser.clearHistory();
      assert.equal(parser.getHistory().length, 0);
      assert.equal(parser.getHistoryById(entry.id), null);
    });

    test('respects maxHistory bounds', () => {
      const parser = new AerospaceOrbiterFormulaParser({ maxHistory: 3 });
      parser.evaluate('1 + 1');
      parser.evaluate('2 + 2');
      parser.evaluate('3 + 3');
      parser.evaluate('4 + 4');

      const history = parser.getHistory();
      assert.equal(history.length, 3);
      assert.equal(history[0].expression, '4 + 4');
    });

    test('emits events on calculation and allows unsubscribing', () => {
      const parser = new AerospaceOrbiterFormulaParser();
      const emitted = [];

      const unsub = parser.on('evaluate', (data) => {
        emitted.push(data);
      });

      parser.evaluate('10 + 5');
      assert.equal(emitted.length, 1);
      assert.equal(emitted[0].result, 15);

      unsub();
      parser.evaluate('20 + 5');
      assert.equal(emitted.length, 1); // No new events received after unbind
    });
  });
});
