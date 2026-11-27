import test from 'node:test';
import assert from 'node:assert/strict';
import { VirtualMuseum3dSchemaValidator, museumTemplates } from './json-schema-validator.js';

test('VirtualMuseum3dSchemaValidator - verifies fundamental JSON data types via checkTypes', () => {
  const validator = new VirtualMuseum3dSchemaValidator();
  assert.equal(validator.checkTypes('string', 'Florentine Vase'), true);
  assert.equal(validator.checkTypes('number', 1492.5), true);
  assert.equal(validator.checkTypes('integer', 1492), true);
  assert.equal(validator.checkTypes('integer', 1492.5), false);
  assert.equal(validator.checkTypes('boolean', false), true);
  assert.equal(validator.checkTypes('array', ['sculpture', 'bronze']), true);
  assert.equal(validator.checkTypes('object', { era: 'Renaissance' }), true);
  assert.equal(validator.checkTypes('null', null), true);
  assert.equal(validator.checkTypes('string', 12345), false);
  assert.equal(validator.checkTypes('object', null), false);
});

test('VirtualMuseum3dSchemaValidator - validates conforming artifact and gallery payloads successfully', () => {
  const validator = new VirtualMuseum3dSchemaValidator();

  // Test artifact template
  const artResult = validator.validate(museumTemplates.artifact.schema, museumTemplates.artifact.payload);
  assert.equal(artResult.valid, true);
  assert.equal(artResult.errors.length, 0);

  // Test exhibition template
  const expoResult = validator.validate(museumTemplates.exhibition.schema, museumTemplates.exhibition.payload);
  assert.equal(expoResult.valid, true);
  assert.equal(expoResult.errors.length, 0);

  // Test donor template
  const donorResult = validator.validate(museumTemplates.donor.schema, museumTemplates.donor.payload);
  assert.equal(donorResult.valid, true);
  assert.equal(donorResult.errors.length, 0);
});

test('VirtualMuseum3dSchemaValidator - catches missing required properties and nested mismatches', () => {
  const validator = new VirtualMuseum3dSchemaValidator();
  const schema = {
    type: 'object',
    required: ['id', 'title', 'dimensions'],
    properties: {
      id: { type: 'string' },
      title: { type: 'string', minLength: 3 },
      dimensions: {
        type: 'object',
        required: ['height'],
        properties: {
          height: { type: 'number', minimum: 0 }
        }
      }
    }
  };

  // Missing required top-level property
  const res1 = validator.validate(schema, { id: 'art-01' });
  assert.equal(res1.valid, false);
  assert.ok(res1.errors.some(e => e.message.includes('Missing required property: "title"')));
  assert.ok(res1.errors.some(e => e.message.includes('Missing required property: "dimensions"')));

  // Nested property constraint violation
  const res2 = validator.validate(schema, {
    id: 'art-01',
    title: 'Valid Title',
    dimensions: { height: -10 }
  });
  assert.equal(res2.valid, false);
  assert.ok(res2.errors.some(e => e.message.includes('is less than minimum 0')));
});

test('VirtualMuseum3dSchemaValidator - detects enums, regex patterns, and string length boundaries', () => {
  const validator = new VirtualMuseum3dSchemaValidator();
  const schema = {
    type: 'object',
    properties: {
      id: { type: 'string', pattern: '^art-[0-9]{4}$' },
      era: { type: 'string', enum: ['Antiquity', 'Renaissance', 'Modern'] },
      summary: { type: 'string', minLength: 5, maxLength: 20 }
    }
  };

  const invalidPayload = {
    id: 'wrong-prefix-99',
    era: 'Victorian',
    summary: 'Hi'
  };

  const res = validator.validate(schema, invalidPayload);
  assert.equal(res.valid, false);
  assert.equal(res.errors.length, 3);
  assert.ok(res.errors.some(e => e.message.includes('regex pattern')));
  assert.ok(res.errors.some(e => e.message.includes('Value must be one of')));
  assert.ok(res.errors.some(e => e.message.includes('less than minLength 5')));
});

test('VirtualMuseum3dSchemaValidator - formats descriptive error diagnostics with line detection', () => {
  const validator = new VirtualMuseum3dSchemaValidator();
  const schema = {
    type: 'object',
    required: ['height'],
    properties: {
      height: { type: 'number', minimum: 10 }
    }
  };

  const rawJson = `{\n  "height": 5\n}`;
  const payload = JSON.parse(rawJson);

  validator.validate(schema, payload, rawJson);
  const formatted = validator.formatValidationErrors();

  assert.ok(formatted.includes('[#/height]'));
  assert.ok(formatted.includes('is less than minimum 10'));
  assert.ok(formatted.includes('(Line 2)'));
});
