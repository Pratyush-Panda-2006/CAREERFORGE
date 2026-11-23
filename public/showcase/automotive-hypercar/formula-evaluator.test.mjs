import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  AutomotiveHypercarFormulaParser,
  DEFAULT_HYPERCAR_VARIABLES,
  HYPERCAR_KPI_PRESETS
} from './formula-evaluator.js';

describe('AutomotiveHypercarFormulaParser Test Suite', () => {

  // 1. Default initialization and configuration
  describe('1. Default initialization and configuration', () => {
    test('instantiates with default options and variables', () => {
      const parser = new AutomotiveHypercarFormulaParser();
      assert.ok(parser instanceof AutomotiveHypercarFormulaParser);

      const vars = parser.getVariables();
      assert.equal(vars.engine_power_hp, 980);
      assert.equal(vars.curb_weight_kg, 1420);
      assert.equal(vars.drag_coefficient, 0.32);
      assert.equal(vars.frontal_area_m2, 2.05);
      assert.equal(vars.battery_capacity_kwh, 85.0);
      assert.equal(vars.brake_regen_efficiency, 0.72);
      assert.equal(vars.tire_friction_coeff, 1.25);
      assert.equal(vars.pi, Math.PI);
      assert.equal(vars.e, Math.E);

      assert.equal(parser.history.length, 0);
      assert.equal(parser.maxHistory, 100);
    });

    test('accepts custom initial options and variables', () => {
      const parser = new AutomotiveHypercarFormulaParser({
        variables: { engine_power_hp: 1200, custom_kpi: 77 },
        maxHistory: 20
      });
      const vars = parser.getVariables();
      assert.equal(vars.engine_power_hp, 1200);
      assert.equal(vars.curb_weight_kg, 1420);
      assert.equal(vars.custom_kpi, 77);
      assert.equal(parser.maxHistory, 20);
    });

    test('exposes all core API methods', () => {
      const parser = new AutomotiveHypercarFormulaParser();
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
      assert.equal(typeof parser.setVariables, 'function');
      assert.equal(typeof parser.getVariables, 'function');
      assert.equal(typeof parser.resetVariables, 'function');
      assert.equal(typeof parser.addFunction, 'function');
      assert.equal(typeof parser.formatResult, 'function');
      assert.equal(typeof parser.cleanPrecision, 'function');
    });

    test('exports standard hypercar KPI presets', () => {
      assert.ok(Array.isArray(HYPERCAR_KPI_PRESETS));
      assert.equal(HYPERCAR_KPI_PRESETS.length, 6);
      
      const ptw = HYPERCAR_KPI_PRESETS.find(p => p.id === 'power_to_weight');
      assert.ok(ptw);
      assert.equal(ptw.unit, 'hp/ton');

      const drag = HYPERCAR_KPI_PRESETS.find(p => p.id === 'drag_force_index');
      assert.ok(drag);
      assert.equal(drag.unit, 'N');

      const cornering = HYPERCAR_KPI_PRESETS.find(p => p.id === 'cornering_g_force');
      assert.ok(cornering);
      assert.equal(cornering.unit, 'G');

      const regen = HYPERCAR_KPI_PRESETS.find(p => p.id === 'usable_regen_energy');
      assert.ok(regen);
      assert.equal(regen.unit, 'kWh');

      const accel = HYPERCAR_KPI_PRESETS.find(p => p.id === 'acceleration_index');
      assert.ok(accel);
      assert.equal(accel.unit, 'index');

      const ke = HYPERCAR_KPI_PRESETS.find(p => p.id === 'kinetic_energy_top_speed');
      assert.ok(ke);
      assert.equal(ke.unit, 'MJ');
    });
  });

  // 2. Expression tokenization
  describe('2. Expression tokenization', () => {
    test('tokenizes integer and floating point numbers', () => {
      const parser = new AutomotiveHypercarFormulaParser();
      const tokens = parser.tokenize('980 + 1420.5');
      assert.equal(tokens.length, 3);
      assert.equal(tokens[0].type, 'number');
      assert.equal(tokens[0].value, 980);
      assert.equal(tokens[1].type, 'operator');
      assert.equal(tokens[1].value, '+');
      assert.equal(tokens[2].type, 'number');
      assert.equal(tokens[2].value, 1420.5);
    });

    test('tokenizes scientific notation numbers (e and E)', () => {
      const parser = new AutomotiveHypercarFormulaParser();
      const tokens = parser.tokenize('1.5e-3 * 2.4E5 + 1e4');
      assert.equal(tokens.length, 5);
      assert.equal(tokens[0].value, 0.0015);
      assert.equal(tokens[2].value, 240000);
      assert.equal(tokens[4].value, 10000);
    });

    test('tokenizes variables and functions', () => {
      const parser = new AutomotiveHypercarFormulaParser();
      const tokens = parser.tokenize('sqrt(engine_power_hp) + abs(drag_coefficient)');
      assert.equal(tokens[0].type, 'function');
      assert.equal(tokens[0].value, 'sqrt');
      assert.equal(tokens[1].type, 'lparen');
      assert.equal(tokens[2].type, 'variable');
      assert.equal(tokens[2].value, 'engine_power_hp');
      assert.equal(tokens[3].type, 'rparen');
      assert.equal(tokens[4].type, 'operator');
      assert.equal(tokens[5].type, 'function');
      assert.equal(tokens[5].value, 'abs');
      assert.equal(tokens[7].type, 'variable');
      assert.equal(tokens[7].value, 'drag_coefficient');
    });

    test('tokenizes all supported operators (+, -, *, /, ^, %)', () => {
      const parser = new AutomotiveHypercarFormulaParser();
      const tokens = parser.tokenize('1 + 2 - 3 * 4 / 5 ^ 6 % 7');
      const opTokens = tokens.filter(t => t.type === 'operator');
      assert.deepEqual(opTokens.map(t => t.value), ['+', '-', '*', '/', '^', '%']);
    });

    test('tokenizes parentheses and commas for multi-argument functions', () => {
      const parser = new AutomotiveHypercarFormulaParser();
      const tokens = parser.tokenize('pow(2, 3) + min(10, 20)');
      assert.equal(tokens[0].type, 'function');
      assert.equal(tokens[0].value, 'pow');
      assert.equal(tokens[1].type, 'lparen');
      assert.equal(tokens[2].type, 'number');
      assert.equal(tokens[3].type, 'comma');
      assert.equal(tokens[4].type, 'number');
      assert.equal(tokens[5].type, 'rparen');
    });

    test('throws descriptive error on invalid characters', () => {
      const parser = new AutomotiveHypercarFormulaParser();
      assert.throws(() => parser.tokenize('980 $ 1420'), /Invalid character '\$' at index 4/);
      assert.throws(() => parser.tokenize('10 @ 5'), /Invalid character '@'/);
    });
  });

  // 3. Syntax validation
  describe('3. Syntax validation', () => {
    test('confirms valid expressions return valid: true', () => {
      const parser = new AutomotiveHypercarFormulaParser();
      assert.deepEqual(parser.validateSyntax('1 + 1'), { valid: true });
      assert.deepEqual(parser.validateSyntax('sqrt(engine_power_hp * 2)'), { valid: true });
      assert.deepEqual(parser.validateSyntax('min(curb_weight_kg, 1500) + 10'), { valid: true });
      assert.deepEqual(parser.validateSyntax('-5 + 3'), { valid: true });
      assert.deepEqual(parser.validateSyntax('pow(2, 3)'), { valid: true });
    });

    test('rejects empty or whitespace expressions', () => {
      const parser = new AutomotiveHypercarFormulaParser();
      assert.equal(parser.validateSyntax('').valid, false);
      assert.equal(parser.validateSyntax('   ').valid, false);
      assert.match(parser.validateSyntax('').error, /empty/i);
    });

    test('detects unbalanced or misplaced parentheses', () => {
      const parser = new AutomotiveHypercarFormulaParser();
      assert.equal(parser.validateSyntax('(1 + 2').valid, false);
      assert.match(parser.validateSyntax('(1 + 2').error, /Unclosed parenthesis/i);

      assert.equal(parser.validateSyntax('1 + 2)').valid, false);
      assert.match(parser.validateSyntax('1 + 2)').error, /Unbalanced parentheses/i);
    });

    test('rejects empty parentheses ()', () => {
      const parser = new AutomotiveHypercarFormulaParser();
      assert.equal(parser.validateSyntax('5 + ()').valid, false);
      assert.match(parser.validateSyntax('5 + ()').error, /Empty parentheses/i);
    });

    test('rejects consecutive binary operators', () => {
      const parser = new AutomotiveHypercarFormulaParser();
      assert.equal(parser.validateSyntax('5 + * 3').valid, false);
      assert.match(parser.validateSyntax('5 + * 3').error, /Consecutive binary operators/i);

      assert.equal(parser.validateSyntax('10 / / 2').valid, false);
      assert.match(parser.validateSyntax('10 / / 2').error, /Consecutive binary operators/i);
    });

    test('rejects invalid leading or trailing operators', () => {
      const parser = new AutomotiveHypercarFormulaParser();
      assert.equal(parser.validateSyntax('* 5').valid, false);
      assert.match(parser.validateSyntax('* 5').error, /cannot start with binary operator/i);

      assert.equal(parser.validateSyntax('5 +').valid, false);
      assert.match(parser.validateSyntax('5 +').error, /cannot end with operator/i);
    });

    test('rejects functions without parentheses', () => {
      const parser = new AutomotiveHypercarFormulaParser();
      assert.equal(parser.validateSyntax('sqrt + 5').valid, false);
      assert.match(parser.validateSyntax('sqrt + 5').error, /must be followed by '\('/i);
    });

    test('rejects misplaced or trailing commas', () => {
      const parser = new AutomotiveHypercarFormulaParser();
      assert.equal(parser.validateSyntax(', 5').valid, false);
      assert.equal(parser.validateSyntax('5 ,').valid, false);
    });
  });

  // 4. Operator precedence (BODMAS/PEMDAS)
  describe('4. Operator precedence (BODMAS/PEMDAS)', () => {
    test('exponentiation ^ precedes multiplication and division', () => {
      const parser = new AutomotiveHypercarFormulaParser();
      // 2 * 3 ^ 2 = 2 * 9 = 18
      assert.equal(parser.evaluate('2 * 3 ^ 2'), 18);
      // 32 / 2 ^ 3 = 32 / 8 = 4
      assert.equal(parser.evaluate('32 / 2 ^ 3'), 4);
    });

    test('multiplication and division precede addition and subtraction', () => {
      const parser = new AutomotiveHypercarFormulaParser();
      // 2 + 3 * 4 = 2 + 12 = 14
      assert.equal(parser.evaluate('2 + 3 * 4'), 14);
      // 20 - 10 / 2 = 20 - 5 = 15
      assert.equal(parser.evaluate('20 - 10 / 2'), 15);
    });

    test('exponentiation ^ is right-associative', () => {
      const parser = new AutomotiveHypercarFormulaParser();
      // 2 ^ 3 ^ 2 = 2 ^ (3 ^ 2) = 2 ^ 9 = 512
      assert.equal(parser.evaluate('2 ^ 3 ^ 2'), 512);
    });

    test('parentheses override default precedence', () => {
      const parser = new AutomotiveHypercarFormulaParser();
      assert.equal(parser.evaluate('(2 + 3) * 4'), 20);
      assert.equal(parser.evaluate('(2 * 3) ^ 2'), 36);
    });

    test('modulo % has same precedence as multiplication and division', () => {
      const parser = new AutomotiveHypercarFormulaParser();
      // 10 - 7 % 4 = 10 - 3 = 7
      assert.equal(parser.evaluate('10 - 7 % 4'), 7);
      // 5 * 7 % 4 = 35 % 4 = 3
      assert.equal(parser.evaluate('5 * 7 % 4'), 3);
    });
  });

  // 5. Built-in scientific functions
  describe('5. Built-in scientific functions', () => {
    test('evaluates sqrt, log, ln, exp, abs, floor, ceil, round', () => {
      const parser = new AutomotiveHypercarFormulaParser();

      assert.equal(parser.evaluate('sqrt(16)'), 4);
      assert.equal(parser.evaluate('sqrt(0)'), 0);
      assert.equal(parser.evaluate('log(100)'), 2); // base-10
      assert.equal(parser.evaluate('log(1000)'), 3);
      assert.equal(parser.evaluate('ln(e)'), 1);    // natural log
      assert.equal(parser.evaluate('exp(0)'), 1);
      assert.equal(parser.evaluate('abs(-42)'), 42);
      assert.equal(parser.evaluate('abs(42)'), 42);
      assert.equal(parser.evaluate('floor(4.9)'), 4);
      assert.equal(parser.evaluate('ceil(4.1)'), 5);
      assert.equal(parser.evaluate('round(3.7)'), 4);
      assert.equal(parser.evaluate('round(3.2)'), 3);
      assert.equal(parser.evaluate('round(3.14159, 2)'), 3.14);
    });

    test('evaluates 2-argument functions min, max, pow', () => {
      const parser = new AutomotiveHypercarFormulaParser();
      assert.equal(parser.evaluate('min(10, 20)'), 10);
      assert.equal(parser.evaluate('max(10, 20)'), 20);
      assert.equal(parser.evaluate('pow(2, 3)'), 8);
      assert.equal(parser.evaluate('pow(10, 2)'), 100);
      assert.equal(parser.evaluate('pow(4, 0.5)'), 2);
    });

    test('evaluates nested function calls', () => {
      const parser = new AutomotiveHypercarFormulaParser();
      assert.equal(parser.evaluate('sqrt(abs(-16))'), 4);
      assert.equal(parser.evaluate('max(5, pow(2, 3))'), 8);
      assert.equal(parser.evaluate('round(sqrt(20))'), 4);
    });

    test('guards against mathematical domain errors', () => {
      const parser = new AutomotiveHypercarFormulaParser();
      assert.throws(() => parser.evaluate('sqrt(-4)'), /Square root of negative number/);
      assert.throws(() => parser.evaluate('log(0)'), /Logarithm of non-positive number/);
      assert.throws(() => parser.evaluate('log(-10)'), /Logarithm of non-positive number/);
      assert.throws(() => parser.evaluate('ln(0)'), /Natural logarithm of non-positive number/);
      assert.throws(() => parser.evaluate('ln(-1)'), /Natural logarithm of non-positive number/);
    });
  });

  // 6. Variable substitution with hypercar parameters
  describe('6. Variable substitution with hypercar parameters', () => {
    test('substitutes default hypercar variables', () => {
      const parser = new AutomotiveHypercarFormulaParser();
      assert.equal(parser.evaluate('engine_power_hp'), 980);
      assert.equal(parser.evaluate('curb_weight_kg'), 1420);
      assert.equal(parser.evaluate('drag_coefficient'), 0.32);
      assert.equal(parser.evaluate('frontal_area_m2'), 2.05);
      assert.equal(parser.evaluate('battery_capacity_kwh'), 85.0);
      assert.equal(parser.evaluate('brake_regen_efficiency'), 0.72);
      assert.equal(parser.evaluate('tire_friction_coeff'), 1.25);
    });

    test('updates variables with setVariable and resetVariables', () => {
      const parser = new AutomotiveHypercarFormulaParser();
      parser.setVariable('engine_power_hp', 1500);
      assert.equal(parser.getVariables().engine_power_hp, 1500);
      assert.equal(parser.evaluate('engine_power_hp'), 1500);

      parser.resetVariables();
      assert.equal(parser.getVariables().engine_power_hp, 980);
    });

    test('allows ad-hoc variable overrides in evaluate()', () => {
      const parser = new AutomotiveHypercarFormulaParser();
      const res = parser.evaluate('engine_power_hp * 2', { engine_power_hp: 1000 });
      assert.equal(res, 2000);
      // original parser variable remains unchanged
      assert.equal(parser.getVariables().engine_power_hp, 980);
    });

    test('throws descriptive error on undefined variables', () => {
      const parser = new AutomotiveHypercarFormulaParser();
      assert.throws(() => parser.evaluate('unknown_turbo_pressure + 10'), /Undefined variable 'unknown_turbo_pressure'/);
    });
  });

  // 7. Edge cases: division by zero, negative numbers, whitespace
  describe('7. Edge cases: division by zero, negative numbers, whitespace variations', () => {
    test('safely handles division by zero', () => {
      const parser = new AutomotiveHypercarFormulaParser();
      assert.throws(() => parser.evaluate('100 / 0'), /Division by zero/i);
      assert.throws(() => parser.evaluate('100 / (5 - 5)'), /Division by zero/i);
    });

    test('safely handles modulo by zero', () => {
      const parser = new AutomotiveHypercarFormulaParser();
      assert.throws(() => parser.evaluate('100 % 0'), /Modulo by zero/i);
    });

    test('evaluates negative numbers and unary minus operations', () => {
      const parser = new AutomotiveHypercarFormulaParser();
      assert.equal(parser.evaluate('-5 + 3'), -2);
      assert.equal(parser.evaluate('2 * -4'), -8);
      assert.equal(parser.evaluate('-(3 + 2)'), -5);
      assert.equal(parser.evaluate('-sqrt(16)'), -4);
      assert.equal(parser.evaluate('2 ^ -2'), 0.25);
    });

    test('handles unary plus operator', () => {
      const parser = new AutomotiveHypercarFormulaParser();
      assert.equal(parser.evaluate('+5 + 3'), 8);
      assert.equal(parser.evaluate('2 * +4'), 8);
    });

    test('handles arbitrary whitespace variations', () => {
      const parser = new AutomotiveHypercarFormulaParser();
      assert.equal(parser.evaluate('   10    +    20   '), 30);
      assert.equal(parser.evaluate('\t sqrt ( \n 25 \t ) \t'), 5);
      assert.equal(parser.evaluate('min (   4  ,  9  )'), 4);
    });

    test('cleans IEEE 754 precision artifacts', () => {
      const parser = new AutomotiveHypercarFormulaParser();
      assert.equal(parser.evaluate('0.1 + 0.2'), 0.3);
    });
  });

  // 8. Calculation history logging and event emission
  describe('8. Calculation history logging and event emission', () => {
    test('logs calculations to audit trail history with unique IDs and timestamps', () => {
      const parser = new AutomotiveHypercarFormulaParser();
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
      const parser = new AutomotiveHypercarFormulaParser();
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
      const parser = new AutomotiveHypercarFormulaParser({ maxHistory: 3 });
      parser.evaluate('1 + 1');
      parser.evaluate('2 + 2');
      parser.evaluate('3 + 3');
      parser.evaluate('4 + 4');

      const history = parser.getHistory();
      assert.equal(history.length, 3);
      assert.equal(history[0].expression, '4 + 4');
    });

    test('emits events on evaluate, error, historyChange and allows unsubscribing', () => {
      const parser = new AutomotiveHypercarFormulaParser();
      const emittedEval = [];
      const emittedHistory = [];
      const emittedErrors = [];

      const unsubEval = parser.on('evaluate', (data) => emittedEval.push(data));
      parser.on('historyChange', (history) => emittedHistory.push(history));
      parser.on('error', (err) => emittedErrors.push(err));

      parser.evaluate('10 + 5');
      assert.equal(emittedEval.length, 1);
      assert.equal(emittedEval[0].result, 15);
      assert.equal(emittedHistory.length, 1);

      unsubEval();
      parser.evaluate('20 + 5');
      assert.equal(emittedEval.length, 1); // Not called after unsubscribe
      assert.equal(emittedHistory.length, 2); // historyChange still active

      // Error event emission
      assert.throws(() => parser.evaluate('10 / 0'));
      assert.equal(emittedErrors.length, 1);
      assert.match(emittedErrors[0].error, /Division by zero/i);
    });
  });

  // 9. All 6 KPI Preset Evaluations
  describe('9. All 6 KPI Preset Evaluations with default hypercar values', () => {
    const parser = new AutomotiveHypercarFormulaParser();

    test('Preset 1: Power to Weight Ratio (hp/ton)', () => {
      const preset = HYPERCAR_KPI_PRESETS.find(p => p.id === 'power_to_weight');
      assert.ok(preset);
      assert.equal(preset.formula, '(engine_power_hp / curb_weight_kg) * 1000');

      // (980 / 1420) * 1000 ≈ 690.140845
      const res = parser.evaluate(preset.formula);
      assert.ok(Math.abs(res - 690.140845) < 0.001);
    });

    test('Preset 2: Aerodynamic Drag Force Index', () => {
      const preset = HYPERCAR_KPI_PRESETS.find(p => p.id === 'drag_force_index');
      assert.ok(preset);
      assert.equal(preset.formula, '0.5 * 1.225 * drag_coefficient * frontal_area_m2 * (100 ^ 2)');

      // 0.5 * 1.225 * 0.32 * 2.05 * 10000 = 4018
      const res = parser.evaluate(preset.formula);
      assert.equal(res, 4018);
    });

    test('Preset 3: Maximum Cornering G-Force', () => {
      const preset = HYPERCAR_KPI_PRESETS.find(p => p.id === 'cornering_g_force');
      assert.ok(preset);
      assert.equal(preset.formula, 'tire_friction_coeff * 0.98');

      // 1.25 * 0.98 = 1.225
      const res = parser.evaluate(preset.formula);
      assert.equal(res, 1.225);
    });

    test('Preset 4: Usable Regenerative Energy (kWh)', () => {
      const preset = HYPERCAR_KPI_PRESETS.find(p => p.id === 'usable_regen_energy');
      assert.ok(preset);
      assert.equal(preset.formula, 'battery_capacity_kwh * brake_regen_efficiency');

      // 85.0 * 0.72 = 61.2
      const res = parser.evaluate(preset.formula);
      assert.equal(res, 61.2);
    });

    test('Preset 5: Hypercar Acceleration Index', () => {
      const preset = HYPERCAR_KPI_PRESETS.find(p => p.id === 'acceleration_index');
      assert.ok(preset);
      assert.equal(preset.formula, '(engine_power_hp * tire_friction_coeff) / curb_weight_kg');

      // (980 * 1.25) / 1420 = 1225 / 1420 ≈ 0.862676
      const res = parser.evaluate(preset.formula);
      assert.ok(Math.abs(res - 0.862676) < 0.0001);
    });

    test('Preset 6: Kinetic Energy at Top Speed (MJ)', () => {
      const preset = HYPERCAR_KPI_PRESETS.find(p => p.id === 'kinetic_energy_top_speed');
      assert.ok(preset);
      assert.equal(preset.formula, '0.5 * curb_weight_kg * ((350 / 3.6) ^ 2) / 1000000');

      // 0.5 * 1420 * ((350 / 3.6) ^ 2) / 1000000 ≈ 6.71103395
      const res = parser.evaluate(preset.formula);
      assert.ok(Math.abs(res - 6.71103395) < 0.001);
    });
  });

});
