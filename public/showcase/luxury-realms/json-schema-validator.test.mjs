import test from 'node:test';
import assert from 'node:assert/strict';
import { LuxuryRealmsSchemaValidator, SCHEMA_TEMPLATES, indexJsonLines, lineForPath } from './json-schema-validator.js';

test('checkTypes enforces JSON Schema types and type unions', () => {
  const validator = new LuxuryRealmsSchemaValidator();

  assert.equal(validator.checkTypes('string', 'hello'), true);
  assert.equal(validator.checkTypes('number', 42.5), true);
  assert.equal(validator.checkTypes('number', Number.POSITIVE_INFINITY), false);
  assert.equal(validator.checkTypes('number', Number.NaN), false);
  assert.equal(validator.checkTypes('integer', 42), true);
  assert.equal(validator.checkTypes('integer', 42.5), false);
  assert.equal(validator.checkTypes('boolean', false), true);
  assert.equal(validator.checkTypes('array', [1, 2]), true);
  assert.equal(validator.checkTypes('object', {}), true);
  assert.equal(validator.checkTypes('object', null), false);
  assert.equal(validator.checkTypes('object', []), false);
  assert.equal(validator.checkTypes('null', null), true);
  assert.equal(validator.checkTypes('string', 123), false);
  assert.equal(validator.checkTypes(['null', 'string'], null), true);
  assert.equal(validator.checkTypes(['integer', 'string'], 'villa'), true);
  assert.equal(validator.checkTypes([], 'villa'), false);
  assert.equal(validator.checkTypes('mystery', 'villa'), false);
});

test('all valid luxury templates pass their own schemas', () => {
  const validator = new LuxuryRealmsSchemaValidator();

  for (const key of ['villa', 'jet', 'concierge']) {
    const template = SCHEMA_TEMPLATES[key];
    const result = validator.validate(template.schema, template.payload);
    assert.equal(result.valid, true, `${key}: ${validator.formatValidationErrors()}`);
    assert.deepEqual(result.errors, []);
  }
});

test('mismatch demo reports nested types, required fields, constraints, and extras', () => {
  const validator = new LuxuryRealmsSchemaValidator();
  const template = SCHEMA_TEMPLATES.mismatch;
  const result = validator.validate(template.schema, template.payload);

  assert.equal(result.valid, false);
  const has = (path, keyword) => result.errors.some((error) => error.path === path && error.keyword === keyword);

  assert.ok(has('#/listingId', 'pattern'));
  assert.ok(has('#/chalet/name', 'minLength'));
  assert.ok(has('#/chalet/altitudeM', 'minimum'));
  assert.ok(has('#/chalet/bedrooms', 'type'));
  assert.ok(has('#/chalet/signed', 'type'));
  assert.ok(has('#/chalet/staff', 'required'));
  assert.ok(has('#/nightlyRate', 'type'));
  assert.ok(has('#/amenities', 'uniqueItems'));
  assert.ok(has('#/status', 'enum'));
  assert.ok(has('#/privateHelipad', 'additionalProperties'));
  assert.equal(result.errors.length, 10);
});

test('validation collects independent constraint failures with JSON Pointer paths', () => {
  const validator = new LuxuryRealmsSchemaValidator();
  const schema = {
    type: 'object',
    required: ['profile', 'score', 'tags'],
    additionalProperties: false,
    properties: {
      profile: {
        type: 'object',
        required: ['name', 'age'],
        additionalProperties: false,
        properties: {
          name: { type: 'string', minLength: 3, pattern: '^[A-Z]' },
          age: { type: 'integer', minimum: 18, maximum: 120 }
        }
      },
      score: { type: 'number', multipleOf: 0.5 },
      tags: { type: 'array', minItems: 2, uniqueItems: true, items: { type: 'string' } }
    }
  };
  const payload = {
    profile: { name: 'a', age: 17.5 },
    score: 1.3,
    tags: ['suite', 'suite']
  };

  const result = validator.validate(schema, payload);
  assert.equal(result.valid, false);
  assert.equal(result.errors.length, 5);
  assert.deepEqual(
    result.errors.map((error) => `${error.path}:${error.keyword}`),
    [
      '#/profile/name:minLength',
      '#/profile/name:pattern',
      '#/profile/age:type',
      '#/score:multipleOf',
      '#/tags:uniqueItems'
    ]
  );
  assert.match(result.errors[2].message, /Expected "integer" but received number/);
});

test('formatValidationErrors reports pass and failure state and resets between runs', () => {
  const validator = new LuxuryRealmsSchemaValidator();
  const schema = { type: 'object', required: ['name'], properties: { name: { type: 'string', minLength: 3 } } };

  assert.equal(validator.formatValidationErrors(), 'Validation passed: no schema violations (0 errors).');

  const failed = validator.validate(schema, { name: 'A' });
  assert.equal(failed.valid, false);
  assert.equal(
    validator.formatValidationErrors(),
    '1. #/name [minLength] - String length 1 is below minLength 3.'
  );

  const passed = validator.validate(schema, { name: 'Aurelia' });
  assert.equal(passed.valid, true);
  assert.equal(validator.formatValidationErrors(), 'Validation passed: no schema violations (0 errors).');
});

test('invalid schema inputs are rejected instead of throwing', () => {
  const validator = new LuxuryRealmsSchemaValidator();

  for (const schema of [null, undefined, false, 42, 'schema', []]) {
    const result = validator.validate(schema, {});
    assert.equal(result.valid, false);
    assert.equal(result.errors[0].path, '#');
    assert.equal(result.errors[0].keyword, 'schema');
  }
});

test('payload line mapping survives spaces, commas, and escaped pointer keys', () => {
  const source = JSON.stringify({
    name: 'Amina Al-Rashid',
    stay: { island: 'Seychelles - Mahe', guests: 4 },
    extras: ['Private chef', 'Sunset yacht'],
    'penthouse/suite': true
  }, null, 2);
  const lines = indexJsonLines(source);

  assert.equal(lines.get('#'), 1);
  assert.equal(lines.get('#/name'), 2);
  assert.equal(lines.get('#/stay'), 3);
  assert.equal(lines.get('#/stay/island'), 4);
  assert.equal(lines.get('#/stay/guests'), 5);
  assert.equal(lines.get('#/extras'), 7);
  assert.equal(lines.get('#/extras/0'), 8);
  assert.equal(lines.get('#/extras/1'), 9);
  assert.equal(lines.get('#/penthouse~1suite'), 11);

  assert.equal(lineForPath('#/stay/island', lines), 4);
  assert.equal(lineForPath('#/stay/missing', lines), 3);
  assert.equal(lineForPath('#/extras/9/missing', lines), 7);
  assert.equal(lineForPath('#', lines), 1);
});

test('allOf, anyOf, oneOf, and not combinators are enforced', () => {
  const validator = new LuxuryRealmsSchemaValidator();
  const schema = {
    anyOf: [{ type: 'integer', minimum: 10 }, { type: 'string', minLength: 4 }],
    not: { const: 13 }
  };

  assert.equal(validator.validate(schema, 12).valid, true);
  assert.equal(validator.validate(schema, 13).valid, false);
  assert.equal(validator.validate(schema, 'gold').valid, true);
  assert.equal(validator.validate(schema, 'grand').valid, true);
  assert.equal(validator.validate(schema, true).valid, false);

  const allOf = { allOf: [{ type: 'number' }, { minimum: 10 }] };
  assert.equal(validator.validate(allOf, 12).valid, true);
  assert.equal(validator.validate(allOf, 5).valid, false);
  assert.equal(validator.validate(allOf, 'grand').valid, false);

  const oneOf = { oneOf: [{ type: 'number' }, { type: 'integer' }] };
  assert.equal(validator.validate(oneOf, 3.5).valid, true);
  assert.equal(validator.validate(oneOf, 3).valid, false);
  assert.equal(validator.validate(oneOf, 'villa').valid, false);
});
