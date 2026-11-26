/**
 * Luxury Realms - JSON payload schema validator and lint inspector.
 *
 * Validates nested JSON values against the commonly used JSON Schema
 * constraints, reports JSON Pointer paths for every violation, and mounts a
 * browser-only split-pane inspector. The engine has no DOM or network
 * dependencies so it can be exercised directly with node:test.
 */

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

function escapePointerSegment(segment) {
  return String(segment).replaceAll('~', '~0').replaceAll('/', '~1');
}

function actualType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number';
  return typeof value;
}

function formatExpectedType(type) {
  if (Array.isArray(type)) return type.map((entry) => `"${entry}"`).join(' or ');
  return `"${type}"`;
}

function jsonEqual(left, right) {
  if (left === right) return true;
  if (typeof left !== typeof right || left === null || right === null) return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((value, index) => jsonEqual(value, right[index]));
  }
  if (typeof left === 'object') {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length) return false;
    return leftKeys.every((key) => hasOwn(right, key) && jsonEqual(left[key], right[key]));
  }
  return false;
}

function pushError(errors, path, keyword, message) {
  errors.push({ path, keyword, message });
}

function compilePattern(pattern) {
  try {
    return new RegExp(pattern);
  } catch {
    return null;
  }
}

export class LuxuryRealmsSchemaValidator {
  #lastErrors = [];

  checkTypes(expected, actual) {
    if (Array.isArray(expected)) {
      return expected.length > 0 && expected.some((type) => this.checkTypes(type, actual));
    }

    switch (expected) {
      case 'null':
        return actual === null;
      case 'array':
        return Array.isArray(actual);
      case 'object':
        return actual !== null && typeof actual === 'object' && !Array.isArray(actual);
      case 'integer':
        return typeof actual === 'number' && Number.isInteger(actual);
      case 'number':
        return typeof actual === 'number' && Number.isFinite(actual);
      case 'boolean':
        return typeof actual === 'boolean';
      case 'string':
        return typeof actual === 'string';
      default:
        return false;
    }
  }

  validate(schema, payload) {
    this.#lastErrors = [];
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
      pushError(this.#lastErrors, '#', 'schema', 'Schema must be a JSON object.');
      return this.#result();
    }

    this.#validateNode(schema, payload, '#', this.#lastErrors);
    return this.#result();
  }

  formatValidationErrors() {
    if (this.#lastErrors.length === 0) {
      return 'Validation passed: no schema violations (0 errors).';
    }

    return this.#lastErrors
      .map((error, index) => `${index + 1}. ${error.path} [${error.keyword}] - ${error.message}`)
      .join('\n');
  }

  #result() {
    return {
      valid: this.#lastErrors.length === 0,
      errors: this.#lastErrors.map((error) => ({ ...error }))
    };
  }

  #validateNode(schema, value, path, errors) {
    if (schema === true) return;
    if (schema === false) {
      pushError(errors, path, 'schema', 'Schema "false" rejects every value.');
      return;
    }
    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
      pushError(errors, path, 'schema', 'Schema node must be an object or boolean.');
      return;
    }

    if (hasOwn(schema, 'type') && !this.checkTypes(schema.type, value)) {
      pushError(
        errors,
        path,
        'type',
        `Expected ${formatExpectedType(schema.type)} but received ${actualType(value)}.`
      );
      return;
    }

    if (Array.isArray(schema.enum) && !schema.enum.some((candidate) => jsonEqual(candidate, value))) {
      pushError(errors, path, 'enum', `Value must be one of ${schema.enum.map((entry) => JSON.stringify(entry)).join(', ')}.`);
    }

    if (hasOwn(schema, 'const') && !jsonEqual(schema.const, value)) {
      pushError(errors, path, 'const', `Value must equal ${JSON.stringify(schema.const)}.`);
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      if (typeof schema.minimum === 'number' && value < schema.minimum) {
        pushError(errors, path, 'minimum', `Value ${value} is below the minimum of ${schema.minimum}.`);
      }
      if (typeof schema.maximum === 'number' && value > schema.maximum) {
        pushError(errors, path, 'maximum', `Value ${value} exceeds the maximum of ${schema.maximum}.`);
      }
      if (typeof schema.exclusiveMinimum === 'number' && value <= schema.exclusiveMinimum) {
        pushError(errors, path, 'exclusiveMinimum', `Value ${value} must be greater than ${schema.exclusiveMinimum}.`);
      }
      if (typeof schema.exclusiveMaximum === 'number' && value >= schema.exclusiveMaximum) {
        pushError(errors, path, 'exclusiveMaximum', `Value ${value} must be less than ${schema.exclusiveMaximum}.`);
      }
      if (typeof schema.multipleOf === 'number' && schema.multipleOf > 0) {
        const quotient = value / schema.multipleOf;
        if (Math.abs(quotient - Math.round(quotient)) > 1e-9) {
          pushError(errors, path, 'multipleOf', `Value ${value} is not a multiple of ${schema.multipleOf}.`);
        }
      }
    }

    if (typeof value === 'string') {
      const length = [...value].length;
      if (typeof schema.minLength === 'number' && length < schema.minLength) {
        pushError(errors, path, 'minLength', `String length ${length} is below minLength ${schema.minLength}.`);
      }
      if (typeof schema.maxLength === 'number' && length > schema.maxLength) {
        pushError(errors, path, 'maxLength', `String length ${length} exceeds maxLength ${schema.maxLength}.`);
      }
      if (typeof schema.pattern === 'string') {
        const regex = compilePattern(schema.pattern);
        if (!regex) {
          pushError(errors, path, 'pattern', `Schema pattern ${JSON.stringify(schema.pattern)} is not a valid regular expression.`);
        } else if (!regex.test(value)) {
          pushError(errors, path, 'pattern', `String does not match pattern ${JSON.stringify(schema.pattern)}.`);
        }
      }
    }

    if (Array.isArray(value)) {
      if (typeof schema.minItems === 'number' && value.length < schema.minItems) {
        pushError(errors, path, 'minItems', `Array has ${value.length} item(s); minItems is ${schema.minItems}.`);
      }
      if (typeof schema.maxItems === 'number' && value.length > schema.maxItems) {
        pushError(errors, path, 'maxItems', `Array has ${value.length} item(s); maxItems is ${schema.maxItems}.`);
      }
      if (schema.uniqueItems === true) {
        for (let right = 1; right < value.length; right += 1) {
          for (let left = 0; left < right; left += 1) {
            if (jsonEqual(value[left], value[right])) {
              pushError(errors, path, 'uniqueItems', `Array items at indexes ${left} and ${right} are duplicates.`);
              right = value.length;
              break;
            }
          }
        }
      }
      if (schema.items !== undefined) {
        if (Array.isArray(schema.items)) {
          value.forEach((item, index) => {
            if (index < schema.items.length) {
              this.#validateNode(schema.items[index], item, `${path}/${index}`, errors);
            } else if (schema.additionalItems === false) {
              pushError(errors, `${path}/${index}`, 'additionalItems', 'Additional array item is not allowed.');
            } else if (schema.additionalItems && typeof schema.additionalItems === 'object') {
              this.#validateNode(schema.additionalItems, item, `${path}/${index}`, errors);
            }
          });
        } else {
          value.forEach((item, index) => {
            this.#validateNode(schema.items, item, `${path}/${index}`, errors);
          });
        }
      }
    }

    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const keys = Object.keys(value);
      if (typeof schema.minProperties === 'number' && keys.length < schema.minProperties) {
        pushError(errors, path, 'minProperties', `Object has ${keys.length} propert(ies); minProperties is ${schema.minProperties}.`);
      }
      if (typeof schema.maxProperties === 'number' && keys.length > schema.maxProperties) {
        pushError(errors, path, 'maxProperties', `Object has ${keys.length} propert(ies); maxProperties is ${schema.maxProperties}.`);
      }

      if (Array.isArray(schema.required)) {
        for (const key of schema.required) {
          if (!hasOwn(value, key)) {
            pushError(
              errors,
              `${path}/${escapePointerSegment(key)}`,
              'required',
              `Missing required property ${JSON.stringify(key)}.`
            );
          }
        }
      }

      const properties = schema.properties && typeof schema.properties === 'object' && !Array.isArray(schema.properties)
        ? schema.properties
        : {};

      for (const [key, childSchema] of Object.entries(properties)) {
        if (hasOwn(value, key)) {
          this.#validateNode(childSchema, value[key], `${path}/${escapePointerSegment(key)}`, errors);
        }
      }

      const patternMatchedKeys = new Set();
      if (schema.patternProperties && typeof schema.patternProperties === 'object' && !Array.isArray(schema.patternProperties)) {
        for (const [pattern, childSchema] of Object.entries(schema.patternProperties)) {
          const regex = compilePattern(pattern);
          if (!regex) {
            pushError(errors, path, 'patternProperties', `Schema patternProperties key ${JSON.stringify(pattern)} is not a valid regular expression.`);
            continue;
          }
          for (const key of keys) {
            if (regex.test(key)) {
              patternMatchedKeys.add(key);
              this.#validateNode(childSchema, value[key], `${path}/${escapePointerSegment(key)}`, errors);
            }
          }
        }
      }

      if (schema.additionalProperties !== undefined) {
        const extras = keys.filter((key) => !hasOwn(properties, key) && !patternMatchedKeys.has(key));
        if (schema.additionalProperties === false) {
          for (const key of extras) {
            pushError(
              errors,
              `${path}/${escapePointerSegment(key)}`,
              'additionalProperties',
              `Unexpected property ${JSON.stringify(key)} is not allowed by this schema.`
            );
          }
        } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
          for (const key of extras) {
            this.#validateNode(schema.additionalProperties, value[key], `${path}/${escapePointerSegment(key)}`, errors);
          }
        }
      }
    }

    if (Array.isArray(schema.allOf)) {
      for (const childSchema of schema.allOf) {
        this.#validateNode(childSchema, value, path, errors);
      }
    }

    if (Array.isArray(schema.anyOf) && schema.anyOf.length > 0) {
      const branches = schema.anyOf.map((childSchema) => {
        const branchErrors = [];
        this.#validateNode(childSchema, value, path, branchErrors);
        return branchErrors;
      });
      if (!branches.some((branchErrors) => branchErrors.length === 0)) {
        pushError(errors, path, 'anyOf', 'Value does not match any schema in "anyOf".');
      }
    }

    if (Array.isArray(schema.oneOf) && schema.oneOf.length > 0) {
      let matches = 0;
      for (const childSchema of schema.oneOf) {
        const branchErrors = [];
        this.#validateNode(childSchema, value, path, branchErrors);
        if (branchErrors.length === 0) matches += 1;
      }
      if (matches === 0) {
        pushError(errors, path, 'oneOf', 'Value does not match any schema in "oneOf".');
      } else if (matches > 1) {
        pushError(errors, path, 'oneOf', `Value matches ${matches} schemas in "oneOf"; exactly one is required.`);
      }
    }

    if (schema.not && typeof schema.not === 'object') {
      const branchErrors = [];
      this.#validateNode(schema.not, value, path, branchErrors);
      if (branchErrors.length === 0) {
        pushError(errors, path, 'not', 'Value must not match the schema in "not".');
      }
    }
  }
}

/**
 * Curated luxury payload templates. Keeping them beside the engine means the
 * sample data is covered by the same validation tests as any pasted payload.
 */
export const SCHEMA_TEMPLATES = {
  villa: {
    label: 'Villa Booking - Valid',
    schema: {
      type: 'object',
      required: ['reservationId', 'guest', 'stay', 'extras'],
      additionalProperties: false,
      properties: {
        reservationId: { type: 'string', pattern: '^LR-\\d{4}-\\d{4}$' },
        guest: {
          type: 'object',
          required: ['fullName', 'email', 'tier'],
          additionalProperties: false,
          properties: {
            fullName: { type: 'string', minLength: 2, maxLength: 80 },
            email: { type: 'string', pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$' },
            tier: { type: 'string', enum: ['signature', 'sovereign', 'legend'] }
          }
        },
        stay: {
          type: 'object',
          required: ['island', 'villa', 'checkIn', 'checkOut', 'guests', 'nightlyRate'],
          additionalProperties: false,
          properties: {
            island: { type: 'string', minLength: 2 },
            villa: { type: 'string', pattern: '^V-\\d{2,3}$' },
            checkIn: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            checkOut: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            guests: { type: 'integer', minimum: 1, maximum: 12 },
            nightlyRate: { type: 'number', minimum: 5000, maximum: 250000 }
          }
        },
        extras: {
          type: 'array',
          minItems: 0,
          maxItems: 8,
          uniqueItems: true,
          items: { type: 'string', minLength: 2 }
        }
      }
    },
    payload: {
      reservationId: 'LR-2026-0417',
      guest: {
        fullName: 'Amina Al-Rashid',
        email: 'amina@sovereign.example',
        tier: 'sovereign'
      },
      stay: {
        island: 'Seychelles - Mahe',
        villa: 'V-014',
        checkIn: '2026-12-20',
        checkOut: '2026-12-30',
        guests: 4,
        nightlyRate: 48500
      },
      extras: ['Private chef', 'Helicopter transfer', 'Sunset yacht']
    }
  },
  jet: {
    label: 'Jet Manifest - Valid',
    schema: {
      type: 'object',
      required: ['flight', 'aircraft', 'passengers', 'wheelsUp', 'manifestSigned'],
      additionalProperties: false,
      properties: {
        flight: { type: 'string', pattern: '^LRJ-\\d{3}$' },
        aircraft: {
          type: 'object',
          required: ['tail', 'model', 'rangeNm'],
          additionalProperties: false,
          properties: {
            tail: { type: 'string', pattern: '^N\\d{3}[A-Z]{2}$' },
            model: {
              type: 'string',
              enum: ['Gulfstream G700', 'Bombardier Global 7500', 'Dassault Falcon 10X']
            },
            rangeNm: { type: 'integer', minimum: 5000 }
          }
        },
        wheelsUp: { type: 'integer', minimum: 0 },
        passengers: {
          type: 'array',
          minItems: 1,
          maxItems: 14,
          items: {
            type: 'object',
            required: ['fullName', 'passport', 'seat'],
            additionalProperties: false,
            properties: {
              fullName: { type: 'string', minLength: 3 },
              passport: { type: 'string', pattern: '^[A-Z0-9]{6,12}$' },
              seat: { type: 'string', pattern: '^\\d{1,2}[A-L]$' },
              vip: { type: 'boolean' }
            }
          }
        },
        catering: { type: 'string', enum: ['kosher', 'vegan', 'pescatarian', 'none'] },
        manifestSigned: { type: 'boolean', const: true }
      }
    },
    payload: {
      flight: 'LRJ-208',
      aircraft: {
        tail: 'N701GD',
        model: 'Gulfstream G700',
        rangeNm: 7500
      },
      wheelsUp: 1774371600,
      passengers: [
        { fullName: 'Noah Sinclair', passport: 'X4821993', seat: '1A', vip: true },
        { fullName: 'Elena Voss', passport: 'DE7712045', seat: '2B', vip: false }
      ],
      catering: 'pescatarian',
      manifestSigned: true
    }
  },
  concierge: {
    label: 'Concierge Request - Valid',
    schema: {
      type: 'object',
      required: ['requestId', 'priority', 'contact', 'items', 'budget'],
      additionalProperties: false,
      properties: {
        requestId: { type: 'string', pattern: '^REQ-\\d{4}$' },
        priority: { type: 'string', enum: ['low', 'normal', 'urgent', 'sovereign'] },
        contact: {
          type: 'object',
          required: ['name', 'channel', 'handle'],
          additionalProperties: false,
          properties: {
            name: { type: 'string', minLength: 2 },
            channel: { type: 'string', enum: ['whatsapp', 'signal', 'email'] },
            handle: { type: 'string', minLength: 3 }
          }
        },
        items: {
          type: 'array',
          minItems: 1,
          maxItems: 6,
          items: {
            type: 'object',
            required: ['label', 'quantity'],
            additionalProperties: false,
            properties: {
              label: { type: 'string', minLength: 2 },
              quantity: { type: 'integer', minimum: 1, maximum: 20 }
            }
          }
        },
        budget: {
          type: 'object',
          required: ['currency', 'amount'],
          additionalProperties: false,
          properties: {
            currency: { type: 'string', enum: ['USD', 'EUR', 'CHF', 'AED'] },
            amount: { type: 'number', minimum: 100, maximum: 1000000 }
          }
        },
        notes: { type: 'string', maxLength: 280 }
      }
    },
    payload: {
      requestId: 'REQ-0912',
      priority: 'sovereign',
      contact: { name: 'Isabella Moreau', channel: 'signal', handle: 'isabella.moreau' },
      items: [
        { label: 'Michelin chef', quantity: 1 },
        { label: 'Orchid arrangement', quantity: 4 }
      ],
      budget: { currency: 'CHF', amount: 18000 },
      notes: 'Discreet arrival; no press at the marina.'
    }
  },
  mismatch: {
    label: 'Chalet Listing - Mismatch Demo',
    schema: {
      type: 'object',
      required: ['listingId', 'chalet', 'nightlyRate', 'amenities', 'status'],
      additionalProperties: false,
      properties: {
        listingId: { type: 'string', pattern: '^CH-\\d{4}$' },
        chalet: {
          type: 'object',
          required: ['name', 'altitudeM', 'bedrooms', 'signed', 'staff'],
          additionalProperties: false,
          properties: {
            name: { type: 'string', minLength: 3 },
            altitudeM: { type: 'integer', minimum: 1200, maximum: 4800 },
            bedrooms: { type: 'integer', minimum: 1, maximum: 12 },
            signed: { type: 'boolean' },
            staff: { type: 'integer', minimum: 1 }
          }
        },
        nightlyRate: { type: 'number', minimum: 2500 },
        amenities: {
          type: 'array',
          minItems: 2,
          uniqueItems: true,
          items: { type: 'string', minLength: 2 }
        },
        status: { type: 'string', enum: ['draft', 'listed', 'reserved'] }
      }
    },
    payload: {
      listingId: 'CH-77',
      chalet: {
        name: 'A',
        altitudeM: 980,
        bedrooms: '5',
        signed: 'yes'
      },
      nightlyRate: '3200',
      amenities: ['spa', 'spa'],
      status: 'launched',
      privateHelipad: true
    }
  }
};

function parseErrorDetails(error, source) {
  const message = error instanceof Error ? error.message : String(error);
  const lineMatch = message.match(/line (\d+) column (\d+)/i);
  if (lineMatch) {
    return { line: Number(lineMatch[1]), column: Number(lineMatch[2]), message };
  }

  const positionMatch = message.match(/position (\d+)/i);
  if (positionMatch) {
    const position = Number(positionMatch[1]);
    const before = source.slice(0, position);
    const line = before.split('\n').length;
    const column = position - before.lastIndexOf('\n');
    return { line, column, message };
  }

  return { line: 1, column: 1, message };
}

/**
 * Builds a JSON Pointer -> line lookup for the current payload source. The
 * payload has already been parsed successfully, so this scanner only needs to
 * walk valid JSON while counting newlines.
 */
export function indexJsonLines(source) {
  const lines = new Map();
  let index = 0;
  let line = 1;

  const skipWhitespace = () => {
    while (index < source.length) {
      const char = source[index];
      if (char === '\n') {
        line += 1;
        index += 1;
      } else if (char === ' ' || char === '\r' || char === '\t') {
        index += 1;
      } else {
        break;
      }
    }
  };

  const readString = () => {
    let value = '';
    index += 1;
    while (index < source.length) {
      const char = source[index];
      if (char === '"') {
        index += 1;
        return value;
      }
      if (char === '\\') {
        index += 1;
        const escaped = source[index];
        if (escaped === 'u') {
          value += String.fromCharCode(Number.parseInt(source.slice(index + 1, index + 5), 16));
          index += 5;
        } else {
          const escapes = { '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t' };
          value += escapes[escaped] ?? escaped;
          index += 1;
        }
        continue;
      }
      value += char;
      index += 1;
    }
    return value;
  };

  const parseValue = (path) => {
    skipWhitespace();
    if (index >= source.length) return;
    lines.set(path, line);
    const char = source[index];
    if (char === '{') {
      parseObject(path);
    } else if (char === '[') {
      parseArray(path);
    } else if (char === '"') {
      readString();
    } else {
      while (index < source.length && !/[\s,\]}]/.test(source[index])) index += 1;
    }
  };

  const parseObject = (path) => {
    index += 1;
    skipWhitespace();
    if (source[index] === '}') {
      index += 1;
      return;
    }
    while (index < source.length) {
      skipWhitespace();
      if (source[index] !== '"') return;
      const key = readString();
      skipWhitespace();
      if (source[index] === ':') index += 1;
      parseValue(`${path}/${escapePointerSegment(key)}`);
      skipWhitespace();
      if (source[index] === ',') {
        index += 1;
        continue;
      }
      if (source[index] === '}') index += 1;
      return;
    }
  };

  const parseArray = (path) => {
    index += 1;
    skipWhitespace();
    if (source[index] === ']') {
      index += 1;
      return;
    }
    let itemIndex = 0;
    while (index < source.length) {
      parseValue(`${path}/${itemIndex}`);
      itemIndex += 1;
      skipWhitespace();
      if (source[index] === ',') {
        index += 1;
        continue;
      }
      if (source[index] === ']') index += 1;
      return;
    }
  };

  parseValue('#');
  return lines;
}

export function lineForPath(path, lineIndex) {
  let pointer = path;
  while (pointer && pointer !== '#') {
    if (lineIndex.has(pointer)) return lineIndex.get(pointer);
    const slash = pointer.lastIndexOf('/');
    if (slash <= 0) break;
    pointer = pointer.slice(0, slash);
  }
  return lineIndex.get('#') ?? 1;
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function mount() {
  const root = document.querySelector('[data-schema-lab]');
  if (!root) return;

  const get = (id) => root.querySelector(`#${id}`);
  const validator = new LuxuryRealmsSchemaValidator();

  const setBadge = (state, text) => {
    const badge = get('status-badge');
    badge.className = `pill pill--${state}`;
    badge.textContent = text;
  };

  const setMeta = (id, text) => {
    const lines = text.length === 0 ? 0 : text.split('\n').length;
    get(id).textContent = `${lines} line${lines === 1 ? '' : 's'} - ${text.length} chars`;
  };

  const updateMeta = () => {
    setMeta('schema-meta', get('schema-input').value);
    setMeta('payload-meta', get('payload-input').value);
  };

  const setSummary = (count, summary, report) => {
    get('error-count').textContent = String(count);
    get('error-label').textContent = count === 1 ? 'violation' : 'violations';
    get('report-summary').textContent = summary;
    get('raw-report').textContent = report;
  };

  const callout = ({ line, keyword, path, message }) => {
    const item = createElement('li', 'error-callout');
    const lineLabel = createElement('span', 'callout-line', `LINE ${line}`);
    const body = createElement('div', 'callout-body');
    const meta = createElement('div', 'callout-meta');
    meta.append(
      createElement('code', 'callout-path', path),
      createElement('span', 'keyword-chip', keyword)
    );
    body.append(meta, createElement('p', 'callout-message', message));
    item.append(lineLabel, body);
    return item;
  };

  const renderPass = () => {
    const report = validator.formatValidationErrors();
    setBadge('pass', 'VALIDATION PASSED');
    setSummary(0, 'Payload conforms to the selected schema. No nested violations found.', report);
    const list = get('error-list');
    const item = createElement('li', 'empty-state');
    item.append(
      createElement('span', 'empty-badge', 'PASS'),
      createElement('p', '', 'No schema violations. Every required field, type, range, and enum is compliant.')
    );
    list.replaceChildren(item);
  };

  const renderViolations = (errors, payloadSource) => {
    const report = validator.formatValidationErrors();
    const lineIndex = indexJsonLines(payloadSource);
    setBadge('fail', `${errors.length} ${errors.length === 1 ? 'VIOLATION' : 'VIOLATIONS'}`);
    setSummary(
      errors.length,
      `${errors.length} nested schema violation${errors.length === 1 ? '' : 's'} detected. Review the line callouts below.`,
      report
    );
    const list = get('error-list');
    list.replaceChildren(
      ...errors.map((error) => callout({
        line: lineForPath(error.path, lineIndex),
        keyword: error.keyword,
        path: error.path,
        message: error.message
      }))
    );
  };

  const renderParseError = (label, error, source) => {
    const details = parseErrorDetails(error, source);
    const report = `${label} JSON parse error at line ${details.line}, column ${details.column}: ${details.message}`;
    setBadge('fail', `${label.toUpperCase()} JSON ERROR`);
    setSummary(1, `${label} JSON could not be parsed. Fix the syntax error before schema checks can run.`, report);
    const list = get('error-list');
    list.replaceChildren(callout({
      line: details.line,
      keyword: 'syntax',
      path: `${label} source`,
      message: `Column ${details.column}: ${details.message}`
    }));
  };

  const update = () => {
    updateMeta();
    const schemaSource = get('schema-input').value;
    const payloadSource = get('payload-input').value;

    let schema;
    try {
      schema = JSON.parse(schemaSource);
    } catch (error) {
      renderParseError('Schema', error, schemaSource);
      return;
    }

    let payload;
    try {
      payload = JSON.parse(payloadSource);
    } catch (error) {
      renderParseError('Payload', error, payloadSource);
      return;
    }

    const result = validator.validate(schema, payload);
    if (result.valid) {
      renderPass();
    } else {
      renderViolations(result.errors, payloadSource);
    }
  };

  const loadTemplate = (key) => {
    const template = SCHEMA_TEMPLATES[key] ?? SCHEMA_TEMPLATES.villa;
    get('schema-input').value = JSON.stringify(template.schema, null, 2);
    get('payload-input').value = JSON.stringify(template.payload, null, 2);
    update();
  };

  get('template-select').addEventListener('change', (event) => loadTemplate(event.target.value));
  get('validate-btn').addEventListener('click', update);
  get('schema-input').addEventListener('input', update);
  get('payload-input').addEventListener('input', update);

  loadTemplate(get('template-select').value || 'villa');
}

if (typeof document !== 'undefined') mount();
