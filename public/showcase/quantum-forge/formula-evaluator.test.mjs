/**
 * Quantum Forge - Mathematical Expression Parser & Dynamic KPI Calculator Test Suite
 * Issue #1264 - NSoC '26 Level 3 Feature
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  QuantumForgeFormulaParser,
  DEFAULT_QUANTUM_VARIABLES,
  QUANTUM_FORMULA_PRESETS
} from './formula-evaluator.js';

describe('QuantumForgeFormulaParser', () => {
  // 1. Default initialization and configuration
  describe('1. Default initialization and configuration', () => {
    it('instantiates correctly with proper name and configurations', () => {
      const parser = new QuantumForgeFormulaParser();
      assert.equal(parser.name, 'QuantumForgeFormulaParser');
      assert.ok(parser.operators['+']);
      assert.ok(parser.operators['-']);
      assert.ok(parser.operators['*']);
      assert.ok(parser.operators['/']);
      assert.ok(parser.operators['%']);
      assert.ok(parser.operators['^']);
    });

    it('exposes standard scientific functions', () => {
      const parser = new QuantumForgeFormulaParser();
      assert.equal(typeof parser.functions.sqrt, 'function');
      assert.equal(typeof parser.functions.log, 'function');
      assert.equal(typeof parser.functions.ln, 'function');
      assert.equal(typeof parser.functions.exp, 'function');
      assert.equal(typeof parser.functions.abs, 'function');
      assert.equal(typeof parser.functions.min, 'function');
      assert.equal(typeof parser.functions.max, 'function');
      assert.equal(typeof parser.functions.round, 'function');
    });

    it('initializes default quantum variables and presets', () => {
      const parser = new QuantumForgeFormulaParser();
      assert.equal(parser.defaultVariables.qubit_fidelity, DEFAULT_QUANTUM_VARIABLES.qubit_fidelity);
      assert.equal(parser.defaultVariables.gate_error, DEFAULT_QUANTUM_VARIABLES.gate_error);
      assert.equal(parser.defaultVariables.coherence_time_t1, DEFAULT_QUANTUM_VARIABLES.coherence_time_t1);
      assert.equal(parser.defaultVariables.decoherence_t2, DEFAULT_QUANTUM_VARIABLES.decoherence_t2);
      assert.equal(parser.defaultVariables.circuit_depth, DEFAULT_QUANTUM_VARIABLES.circuit_depth);
      assert.equal(parser.defaultVariables.entanglement_entropy, DEFAULT_QUANTUM_VARIABLES.entanglement_entropy);
      assert.ok(Array.isArray(QUANTUM_FORMULA_PRESETS));
      assert.ok(QUANTUM_FORMULA_PRESETS.length >= 4);
    });
  });

  // 2. Expression tokenization (numbers, identifiers, operators, functions, parens)
  describe('2. Expression tokenization', () => {
    it('tokenizes integers, floating-point decimals, and operators', () => {
      const parser = new QuantumForgeFormulaParser();
      const tokens = parser.tokenize('42 + 3.14159 * 10');

      assert.equal(tokens.length, 5);
      assert.deepEqual(tokens[0], { type: 'number', value: 42, raw: '42' });
      assert.equal(tokens[1].type, 'operator');
      assert.equal(tokens[1].value, '+');
      assert.deepEqual(tokens[2], { type: 'number', value: 3.14159, raw: '3.14159' });
      assert.equal(tokens[3].type, 'operator');
      assert.equal(tokens[3].value, '*');
      assert.deepEqual(tokens[4], { type: 'number', value: 10, raw: '10' });
    });

    it('tokenizes scientific notation numbers (e.g. 1e-4, 2.5E+3)', () => {
      const parser = new QuantumForgeFormulaParser();
      const tokens = parser.tokenize('1e-4 + 2.5E+3 - 6.022e23 * 1.5e-6');

      assert.equal(tokens[0].value, 0.0001);
      assert.equal(tokens[2].value, 2500);
      assert.equal(tokens[4].value, 6.022e23);
      assert.equal(tokens[6].value, 1.5e-6);
    });

    it('distinguishes scientific functions and quantum variables', () => {
      const parser = new QuantumForgeFormulaParser();
      const tokens = parser.tokenize('sqrt(qubit_fidelity) + exp(-entanglement_entropy)');

      assert.equal(tokens[0].type, 'function');
      assert.equal(tokens[0].value, 'sqrt');
      assert.equal(tokens[1].type, 'paren');
      assert.equal(tokens[1].value, '(');
      assert.equal(tokens[2].type, 'variable');
      assert.equal(tokens[2].value, 'qubit_fidelity');
      assert.equal(tokens[3].type, 'paren');
      assert.equal(tokens[3].value, ')');
      assert.equal(tokens[4].type, 'operator');
      assert.equal(tokens[5].type, 'function');
      assert.equal(tokens[5].value, 'exp');
    });

    it('handles commas for multi-argument function tokens', () => {
      const parser = new QuantumForgeFormulaParser();
      const tokens = parser.tokenize('min(decoherence_t2, coherence_time_t1)');

      assert.equal(tokens[0].type, 'function');
      assert.equal(tokens[0].value, 'min');
      assert.equal(tokens[2].type, 'variable');
      assert.equal(tokens[3].type, 'comma');
      assert.equal(tokens[3].value, ',');
      assert.equal(tokens[4].type, 'variable');
    });
  });

  // 3. Syntax validation (balanced parens, missing operands, invalid tokens)
  describe('3. Syntax validation', () => {
    it('validates correct mathematical expressions', () => {
      const parser = new QuantumForgeFormulaParser();
      const res = parser.validateSyntax('(qubit_fidelity ^ circuit_depth) + 1');
      assert.equal(res.valid, true);
      assert.equal(res.isValid, true);
      assert.equal(res.error, null);
    });

    it('detects empty or whitespace expressions', () => {
      const parser = new QuantumForgeFormulaParser();
      assert.equal(parser.validateSyntax('').valid, false);
      assert.equal(parser.validateSyntax('   ').valid, false);
      assert.equal(parser.validateSyntax(null).valid, false);
    });

    it('detects unbalanced parentheses (missing opener or unclosed)', () => {
      const parser = new QuantumForgeFormulaParser();
      const unclosed = parser.validateSyntax('(qubit_fidelity * 2');
      assert.equal(unclosed.valid, false);
      assert.match(unclosed.error, /unclosed/i);

      const extraCloser = parser.validateSyntax('qubit_fidelity * 2)');
      assert.equal(extraCloser.valid, false);
      assert.match(extraCloser.error, /mismatched/i);
    });

    it('detects consecutive operators and dangling operators', () => {
      const parser = new QuantumForgeFormulaParser();
      assert.equal(parser.validateSyntax('2 + * 3').valid, false);
      assert.equal(parser.validateSyntax('2 * * 3').valid, false);
      assert.equal(parser.validateSyntax('qubit_fidelity +').valid, false);
      assert.equal(parser.validateSyntax('* qubit_fidelity').valid, false);
    });

    it('detects empty parentheses and unparenthesized functions', () => {
      const parser = new QuantumForgeFormulaParser();
      assert.equal(parser.validateSyntax('2 + ()').valid, false);
      assert.equal(parser.validateSyntax('sqrt 16').valid, false);
    });

    it('detects invalid characters', () => {
      const parser = new QuantumForgeFormulaParser();
      assert.equal(parser.validateSyntax('qubit_fidelity $ 2').valid, false);
      assert.equal(parser.validateSyntax('gate_error @ 0.5').valid, false);
    });
  });

  // 4. Operator precedence (BODMAS/PEMDAS: ^ > * / > + -)
  describe('4. Operator precedence (BODMAS/PEMDAS)', () => {
    it('evaluates multiplication and division before addition and subtraction', () => {
      const parser = new QuantumForgeFormulaParser();
      // 2 + (3 * 4) = 14
      assert.equal(parser.evaluate('2 + 3 * 4'), 14);
      // (10 - (6 / 2)) = 7
      assert.equal(parser.evaluate('10 - 6 / 2'), 7);
      // 10 + (7 % 4) = 13
      assert.equal(parser.evaluate('10 + 7 % 4'), 13);
    });

    it('evaluates exponentiation before multiplication and addition', () => {
      const parser = new QuantumForgeFormulaParser();
      // (2 ^ 3) * 2 = 16
      assert.equal(parser.evaluate('2 ^ 3 * 2'), 16);
      // 2 + (3 ^ 2) = 11
      assert.equal(parser.evaluate('2 + 3 ^ 2'), 11);
    });

    it('supports right-associative exponentiation', () => {
      const parser = new QuantumForgeFormulaParser();
      // 2 ^ (3 ^ 2) = 2 ^ 9 = 512 (not (2 ^ 3) ^ 2 = 64)
      assert.equal(parser.evaluate('2 ^ 3 ^ 2'), 512);
    });

    it('respects parentheses overriding default precedence', () => {
      const parser = new QuantumForgeFormulaParser();
      assert.equal(parser.evaluate('(2 + 3) * 4'), 20);
      assert.equal(parser.evaluate('(100 - (10 / 2)) * 2'), 190);
      assert.equal(parser.evaluate('(2 ^ 3) ^ 2'), 64);
    });
  });

  // 5. Built-in scientific functions (sqrt, log, exp, abs, round, etc.)
  describe('5. Built-in scientific functions', () => {
    it('computes sqrt, exp, ln, and abs correctly', () => {
      const parser = new QuantumForgeFormulaParser();
      assert.equal(parser.evaluate('sqrt(16)'), 4);
      assert.equal(parser.evaluate('sqrt(0)'), 0);
      assert.equal(parser.evaluate('exp(0)'), 1);
      assert.equal(Math.round(parser.evaluate('ln(exp(2))')), 2);
      assert.equal(parser.evaluate('abs(-42)'), 42);
      assert.equal(parser.evaluate('abs(42)'), 42);
    });

    it('computes log with default base 10 and explicit base', () => {
      const parser = new QuantumForgeFormulaParser();
      assert.equal(parser.evaluate('log(100)'), 2);
      assert.equal(parser.evaluate('log(1000)'), 3);
      assert.equal(parser.evaluate('log(8, 2)'), 3);
    });

    it('computes min, max, and round with single and multi-arguments', () => {
      const parser = new QuantumForgeFormulaParser();
      assert.equal(parser.evaluate('min(15, 3, 24, 7)'), 3);
      assert.equal(parser.evaluate('max(15, 3, 24, 7)'), 24);
      assert.equal(parser.evaluate('round(3.14159)'), 3);
      assert.equal(parser.evaluate('round(3.14159, 2)'), 3.14);
      assert.equal(parser.evaluate('round(3.14159, 4)'), 3.1416);
    });

    it('evaluates nested function expressions and compositions', () => {
      const parser = new QuantumForgeFormulaParser();
      // sqrt(min(16, 25)) = sqrt(16) = 4
      assert.equal(parser.evaluate('sqrt(min(16, 25))'), 4);
      // abs(min(-10, -20)) = abs(-20) = 20
      assert.equal(parser.evaluate('abs(min(-10, -20))'), 20);
    });

    it('guards against mathematical domain errors in functions', () => {
      const parser = new QuantumForgeFormulaParser();
      assert.throws(() => parser.evaluate('sqrt(-4)'), /negative number/i);
      assert.throws(() => parser.evaluate('log(0)'), /non-positive/i);
      assert.throws(() => parser.evaluate('ln(-1)'), /non-positive/i);
    });
  });

  // 6. Variable substitution with quantum parameters
  describe('6. Variable substitution with quantum parameters', () => {
    it('uses default quantum parameters when variables are omitted', () => {
      const parser = new QuantumForgeFormulaParser();
      // decoherence_t2 / coherence_time_t1 = 85.0 / 120.0 = 0.708333...
      const ratio = parser.evaluate('decoherence_t2 / coherence_time_t1');
      assert.ok(Math.abs(ratio - (85 / 120)) < 1e-9);

      // qubit_fidelity ^ 2 = 0.9995 ^ 2
      const fid2 = parser.evaluate('qubit_fidelity ^ 2');
      assert.ok(Math.abs(fid2 - Math.pow(0.9995, 2)) < 1e-9);
    });

    it('substitutes custom parameter overrides dynamically', () => {
      const parser = new QuantumForgeFormulaParser();
      const customVars = {
        qubit_fidelity: 0.99,
        circuit_depth: 10
      };
      // 0.99 ^ 10 = ~0.904382
      const result = parser.evaluate('qubit_fidelity ^ circuit_depth', customVars);
      assert.ok(Math.abs(result - Math.pow(0.99, 10)) < 1e-9);
    });

    it('evaluates complex composite quantum KPI formulas', () => {
      const parser = new QuantumForgeFormulaParser();
      const formula = '1 - (1 - gate_error) ^ circuit_depth';
      const result = parser.evaluate(formula, { gate_error: 0.01, circuit_depth: 5 });
      // 1 - (0.99 ^ 5) = 1 - 0.9509900499 = 0.0490099501
      assert.ok(Math.abs(result - 0.04900995) < 1e-6);
    });

    it('throws descriptive error when an unknown variable is referenced', () => {
      const parser = new QuantumForgeFormulaParser();
      assert.throws(
        () => parser.evaluate('qubit_fidelity + superconducting_flux_bias', { qubit_fidelity: 0.99 }),
        /Variable "superconducting_flux_bias" is undefined/
      );
    });
  });

  // 7. Edge cases: division by zero, negative numbers, whitespace variations
  describe('7. Edge cases and error guards', () => {
    it('safely guards against literal and dynamic division by zero', () => {
      const parser = new QuantumForgeFormulaParser();
      assert.throws(
        () => parser.evaluate('42 / 0'),
        /Division by zero is undefined/
      );

      assert.throws(
        () => parser.evaluate('100 / (circuit_depth - 64)', { circuit_depth: 64 }),
        /Division by zero is undefined/
      );

      assert.throws(
        () => parser.evaluate('25 % 0'),
        /Division by zero in modulo operation/
      );
    });

    it('evaluates unary negative numbers and negative expressions correctly', () => {
      const parser = new QuantumForgeFormulaParser();
      assert.equal(parser.evaluate('-5 + 10'), 5);
      assert.equal(parser.evaluate('3 * -2'), -6);
      assert.equal(parser.evaluate('10 - -4'), 14);
      assert.equal(parser.evaluate('-(2 + 3)'), -5);
      assert.equal(parser.evaluate('-qubit_fidelity', { qubit_fidelity: 0.99 }), -0.99);
    });

    it('evaluates expressions with varied whitespace and tabs', () => {
      const parser = new QuantumForgeFormulaParser();
      assert.equal(parser.evaluate('   2   +   3  *  4   '), 14);
      assert.equal(parser.evaluate('\t( 10 - 2 )\n * 5 '), 40);
      assert.equal(parser.evaluate('sqrt (   16  )'), 4);
    });

    it('computes operations with scientific notation literals', () => {
      const parser = new QuantumForgeFormulaParser();
      assert.equal(parser.evaluate('1e-4 * 1000'), 0.1);
      assert.equal(parser.evaluate('2.5e+3 / 100'), 25);
    });
  });

  // 8. Calculation history logging and event emission
  describe('8. Calculation history logging and event emission', () => {
    it('logs calculation entries to history with unique IDs and timestamps', () => {
      const parser = new QuantumForgeFormulaParser();
      assert.equal(parser.getHistory().length, 0);

      const r1 = parser.evaluate('qubit_fidelity ^ 2', { qubit_fidelity: 0.98 });
      const r2 = parser.evaluate('decoherence_t2 / 10', { decoherence_t2: 90 });

      const history = parser.getHistory();
      assert.equal(history.length, 2);
      assert.ok(history[0].id.startsWith('calc_'));
      assert.ok(history[0].timestamp > 0);
      assert.equal(history[0].result, r2);
      assert.equal(history[1].result, r1);

      // Verify getCalculationById
      const found = parser.getCalculationById(history[0].id);
      assert.ok(found);
      assert.equal(found.id, history[0].id);
      assert.equal(found.result, r2);

      // Verify clearHistory
      parser.clearHistory();
      assert.equal(parser.getHistory().length, 0);
    });

    it('emits evaluate, historyAdded, and clearHistory events', () => {
      const parser = new QuantumForgeFormulaParser();
      let evaluateEventCount = 0;
      let historyAddedEventCount = 0;
      let clearHistoryCalled = false;

      const unsubEval = parser.on('evaluate', (data) => {
        evaluateEventCount++;
        assert.ok(data.id);
        assert.ok(data.result);
      });

      const unsubHistory = parser.on('historyAdded', (record) => {
        historyAddedEventCount++;
        assert.ok(record.result);
      });

      parser.on('clearHistory', () => {
        clearHistoryCalled = true;
      });

      const r1 = parser.evaluate('4 * 4');
      assert.equal(r1, 16);
      assert.equal(evaluateEventCount, 1);
      assert.equal(historyAddedEventCount, 1);

      parser.clearHistory();
      assert.equal(clearHistoryCalled, true);

      // Test off / unsubscribe
      unsubEval();
      unsubHistory();
      parser.evaluate('5 * 5');
      assert.equal(evaluateEventCount, 1);
      assert.equal(historyAddedEventCount, 1);
    });

    it('emits syntaxError event when invalid syntax is evaluated', () => {
      const parser = new QuantumForgeFormulaParser();
      let errorEventCaptured = false;

      parser.on('syntaxError', (data) => {
        errorEventCaptured = true;
        assert.equal(data.expression, '4 + * 5');
        assert.ok(data.error);
      });

      assert.throws(() => parser.evaluate('4 + * 5'));
      assert.equal(errorEventCaptured, true);
    });
  });
});
