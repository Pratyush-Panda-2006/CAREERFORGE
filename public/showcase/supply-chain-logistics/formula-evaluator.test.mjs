import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SupplyChainLogisticsFormulaParser } from './formula-evaluator.js';

const parser = new SupplyChainLogisticsFormulaParser();
const value = (expr, variables) => parser.evaluate(parser.tokenize(expr), variables);

test('multiplication, parentheses and left-associative subtraction/division', () => {
  assert.equal(value('2 + 3 * 4'), 14);
  assert.equal(value('(2 + 3) * 4'), 20);
  assert.equal(value('10 - 3 - 2'), 5);
  assert.equal(value('24 / 3 / 2'), 4);
});

test('unary operators and right-associative exponentiation have mathematical precedence', () => {
  for (const [expr, expected] of [['-2^2', -4], ['(-2)^2', 4], ['2^3^2', 512], ['2^-2', 0.25], ['1--2', 3], ['+-+3', -3]]) {
    assert.equal(value(expr), expected, expr);
  }
});

test('decimal, scientific and whitespace-separated numbers', () => {
  assert.equal(value('\t.5 + 1.25e2\n'), 125.5);
  assert.equal(value('2E-3 * 1000'), 2);
  assert.equal(value('1. + 2'), 3);
  assert.equal(Object.is(value('-0'), -0), false);
});

test('substitutes case-sensitive variable bindings without modifying them', () => {
  const variables = { on_time: 940, shipments: 1000, Shipments: 10 };
  assert.equal(value('on_time / shipments * 100', variables), 94);
  assert.equal(value('shipments / Shipments', variables), 100);
  assert.deepEqual(variables, { on_time: 940, shipments: 1000, Shipments: 10 });
  assert.equal(value('_offset + 2', { _offset: -5 }), -3);
});

test('unknown, inherited and nonnumeric variables fail without coercion', () => {
  assert.throws(() => value('missing'), /Unknown variable/);
  assert.throws(() => value('constructor'), /Unknown variable/);
  assert.throws(() => value('x', Object.create({ x: 5 })), /Unknown variable/);
  for (const x of ['5', null, Infinity, NaN, () => 5]) assert.throws(() => value('x', { x }), /finite numeric/);
  assert.equal(value('__proto__', Object.assign(Object.create(null), { ['__proto__']: 7 })), 7);
});

test('variable accessors are rejected rather than invoked', () => {
  let invoked = false;
  const variables = Object.defineProperty({}, 'x', { get() { invoked = true; return 42; } });
  assert.throws(() => value('x', variables), /finite numeric/);
  assert.equal(invoked, false);
});

test('zero divisors, non-real powers and intermediate overflow are rejected', () => {
  for (const expr of ['5/0', '5/-0', '5/(2-2)']) assert.throws(() => value(expr), /Division by zero/);
  for (const expr of ['1e308 * 10', '2^1024', '(-1)^.5', '0^-1', '(1e308*10)*0']) assert.throws(() => value(expr), /finite real-number/);
  assert.throws(() => value('1e309'), /too large/);
});

test('malformed expressions never silently return partial results', () => {
  for (const expr of ['', ' ', '1 2', '2(3)', '()', '(1+2', '1+2)', '2+', '*2', '1..2', '2**3', 'x(2)', '1e']) {
    assert.equal(parser.validateSyntax(expr), false, expr);
    assert.throws(() => value(expr), undefined, expr);
  }
});

test('syntax checks do not require values or evaluate denominators', () => {
  assert.equal(parser.validateSyntax('on_time / shipments * 100'), true);
  assert.equal(parser.validateSyntax('1/0'), true);
  assert.equal(parser.validateSyntax('2^-3'), true);
});

test('assignment, member access, strings and JavaScript payloads are unsupported', () => {
  for (const expr of ['x=2', 'globalThis.alert(1)', 'constructor.constructor("return 1")()', '1;2', '`1`', '[1]', 'Math.max(1,2)', '1/*x*/+2']) {
    assert.equal(parser.validateSyntax(expr), false, expr);
    assert.throws(() => value(expr), undefined, expr);
  }
});

test('length, token count and recursion budgets fail predictably', () => {
  assert.throws(() => value('1'.repeat(2049)), /2048 characters/);
  assert.throws(() => value(Array(258).fill('1').join('+')), /512 tokens/);
  assert.throws(() => value('('.repeat(66) + '1' + ')'.repeat(66)), /nesting/);
  assert.throws(() => value('-'.repeat(66) + '1'), /nesting/);
  assert.throws(() => value(Array(67).fill('1').join('^')), /nesting/);
  assert.equal(value(Array(100).fill('1').join('+')), 100);
});

test('public methods validate token arrays and binding containers', () => {
  for (const tokens of [null, [], [undefined], [{ type: 'number', value: '5', position: 0 }], [{ type: 'symbol', value: 'eval', position: 0 }]]) {
    assert.throws(() => parser.evaluate(tokens));
  }
  for (const variables of [null, [], 'x']) assert.throws(() => value('x', variables), /object of numeric/);
  assert.throws(() => parser.tokenize(123), /must be text/);
});

test('token positions preserve offsets for useful errors', () => {
  assert.deepEqual(parser.tokenize(' x + .5').map(({ type, value, position }) => [type, value, position]), [
    ['identifier', 'x', 1], ['symbol', '+', 3], ['number', 0.5, 5],
  ]);
  assert.throws(() => value('1 + @'), /character 5/);
});

test('arithmetic agrees with an independent direct-arithmetic baseline over varied inputs', () => {
  for (let a = -12; a <= 12; a++) for (let b = 1; b <= 12; b++) {
    assert.equal(value('(a + 3) * b - a / b', { a, b }), (a + 3) * b - a / b);
  }
});
