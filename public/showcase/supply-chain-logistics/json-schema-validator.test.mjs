import test from 'node:test';
import assert from 'node:assert/strict';
import { SupplyChainLogisticsSchemaValidator } from './json-schema-validator.js';

test('SupplyChainLogisticsSchemaValidator - validate returns valid for conforming payloads', () => {
  const validator = new SupplyChainLogisticsSchemaValidator();
  const schema = {
    type: 'object',
    required: ['id', 'name'],
    properties: {
      id: { type: 'integer', minimum: 1 },
      name: { type: 'string', minLength: 2 }
    }
  };

  const payload = { id: 101, name: 'Alpha' };
  const res = validator.validate(schema, payload);

  assert.equal(res.valid, true);
  assert.equal(res.errors.length, 0);
});

test('SupplyChainLogisticsSchemaValidator - validate catches type mismatches and missing fields', () => {
  const validator = new SupplyChainLogisticsSchemaValidator();
  const schema = {
    type: 'object',
    required: ['role', 'active'],
    properties: {
      role: { type: 'string', enum: ['admin', 'viewer'] },
      active: { type: 'boolean' }
    }
  };

  const res1 = validator.validate(schema, { role: 'guest', active: true });
  assert.equal(res1.valid, false);

  const res2 = validator.validate(schema, { role: 'admin' });
  assert.equal(res2.valid, false);
});

test('SupplyChainLogisticsSchemaValidator - checkTypes accurately verifies fundamental JSON types', () => {
  const validator = new SupplyChainLogisticsSchemaValidator();
  assert.equal(validator.checkTypes('string', 'test'), true);
  assert.equal(validator.checkTypes('integer', 42), true);
  assert.equal(validator.checkTypes('integer', 42.5), false);
  assert.equal(validator.checkTypes('array', [1, 2]), true);
  assert.equal(validator.checkTypes('object', {}), true);
  assert.equal(validator.checkTypes('null', null), true);
});
