import test from 'node:test';
import assert from 'node:assert/strict';
import { LegalSmartContractsSchemaValidator } from './json-schema-validator.js';

test('validates basic types correctly', () => {
  const validator = new LegalSmartContractsSchemaValidator();
  assert.equal(validator.checkTypes('string', 'hello'), true);
  assert.equal(validator.checkTypes('number', 42.5), true);
  assert.equal(validator.checkTypes('integer', 42), true);
  assert.equal(validator.checkTypes('integer', 42.5), false);
  assert.equal(validator.checkTypes('boolean', true), true);
  assert.equal(validator.checkTypes('array', [1, 2]), true);
  assert.equal(validator.checkTypes('object', { a: 1 }), true);
  assert.equal(validator.checkTypes('null', null), true);
  assert.equal(validator.checkTypes('string', 123), false);
});

test('validates object with required fields and nested properties', () => {
  const validator = new LegalSmartContractsSchemaValidator();
  const schema = {
    type: 'object',
    required: ['id', 'status'],
    properties: {
      id: { type: 'string', minLength: 3 },
      status: { type: 'string', enum: ['active', 'paused'] },
      fee: { type: 'number', minimum: 0 }
    }
  };

  const validPayload = { id: 'sc-101', status: 'active', fee: 15.5 };
  const res1 = validator.validate(schema, validPayload);
  assert.equal(res1.valid, true);
  assert.equal(res1.errors.length, 0);

  const missingReq = { id: 'sc-101' };
  const res2 = validator.validate(schema, missingReq);
  assert.equal(res2.valid, false);
  assert.ok(res2.errors.some(e => e.message.includes('Missing required property: status')));

  const invalidEnum = { id: 'sc-101', status: 'deleted' };
  const res3 = validator.validate(schema, invalidEnum);
  assert.equal(res3.valid, false);
  assert.ok(res3.errors.some(e => e.message.includes('Value must be one of')));
});

test('validates array items and nested objects', () => {
  const validator = new LegalSmartContractsSchemaValidator();
  const schema = {
    type: 'array',
    items: {
      type: 'object',
      required: ['hash'],
      properties: {
        hash: { type: 'string', pattern: '^0x[a-f0-9]+$' }
      }
    }
  };

  const good = [{ hash: '0x123abc' }, { hash: '0xdeadbeef' }];
  assert.equal(validator.validate(schema, good).valid, true);

  const bad = [{ hash: '0x123abc' }, { hash: 'not-a-hex-hash' }];
  const badRes = validator.validate(schema, bad);
  assert.equal(badRes.valid, false);
  assert.ok(badRes.errors.length > 0);
});

test('formatValidationErrors outputs descriptive diagnostics', () => {
  const validator = new LegalSmartContractsSchemaValidator();
  const schema = { type: 'number', minimum: 10 };
  validator.validate(schema, 5);
  const formatted = validator.formatValidationErrors();
  assert.ok(formatted.includes('is less than minimum 10'));
});
