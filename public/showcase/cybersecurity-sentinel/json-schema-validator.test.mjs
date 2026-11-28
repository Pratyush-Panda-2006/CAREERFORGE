import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CybersecuritySentinelSchemaValidator } from './json-schema-validator.js';

const schema = {
  type: 'object',
  required: ['user', 'ports'],
  additionalProperties: false,
  properties: { user: { type: 'string' }, ports: { type: 'array', items: { type: 'integer' } } },
};

test('tells JSON types apart', () => {
  const validator = new CybersecuritySentinelSchemaValidator();
  assert.equal(validator.checkTypes('array', []), true);
  assert.equal(validator.checkTypes('object', []), false);
  assert.equal(validator.checkTypes('object', null), false);
  assert.equal(validator.checkTypes('integer', 1.5), false);
  assert.equal(validator.checkTypes(['string', 'null'], null), true);
});

test('accepts a matching payload', () => {
  const result = new CybersecuritySentinelSchemaValidator().validate(schema, { user: 'a', ports: [22] });
  assert.deepEqual(result, { valid: true, errors: [] });
});

test('reports every problem with its path', () => {
  const validator = new CybersecuritySentinelSchemaValidator();
  assert.equal(validator.validate(schema, { ports: [22, 'ssh'], extra: 1 }).valid, false);
  assert.deepEqual(validator.formatValidationErrors(), [
    '$: missing required property "user"',
    '$.ports[1]: expected integer, got string',
    '$: unexpected property "extra"',
  ]);
});

test('built-in object names are not treated as known or present properties', () => {
  const validator = new CybersecuritySentinelSchemaValidator();
  assert.equal(validator.validate({ required: ['toString'] }, {}).valid, false);
  assert.equal(validator.validate({ additionalProperties: false, properties: {} }, { constructor: 1 }).valid, false);
});

test('enum compares objects by content', () => {
  const validator = new CybersecuritySentinelSchemaValidator();
  const rule = { enum: [{ a: 1, b: [2] }] };
  assert.equal(validator.validate(rule, { b: [2], a: 1 }).valid, true);
  assert.equal(validator.validate(rule, { a: 1 }).valid, false);
});

test('rejects a schema that is not an object', () => {
  const result = new CybersecuritySentinelSchemaValidator().validate(null, {});
  assert.equal(result.errors[0].message, 'schema must be an object');
});

test('parses JSON and names the input that is broken', () => {
  const validator = new CybersecuritySentinelSchemaValidator();
  assert.deepEqual(validator.parseJson('[1]'), { value: [1] });
  assert.match(validator.parseJson('{\n"a": 1,\n}', 'Payload').error, /^Payload syntax error( on line 3)?:/);
});
