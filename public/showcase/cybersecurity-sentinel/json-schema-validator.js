const typeOf = (value) => {
  if (value === null) return 'null';
  return Array.isArray(value) ? 'array' : typeof value;
};

// JSON values compare by content, and object keys may be in any order.
const sameJson = (a, b) => {
  if (a === b) return true;
  if (typeOf(a) !== typeOf(b) || typeof a !== 'object' || a === null) return false;
  const keys = Object.keys(a);
  return keys.length === Object.keys(b).length && keys.every((key) => Object.hasOwn(b, key) && sameJson(a[key], b[key]));
};

export class CybersecuritySentinelSchemaValidator {
  constructor() {
    this.errors = [];
  }

  // `expected` is a type name or a list of them.
  checkTypes(expected, actual) {
    const found = typeOf(actual);
    return [expected].flat().some((type) => (type === 'integer' ? Number.isInteger(actual) : type === found));
  }

  validate(schema, payload) {
    this.errors = [];
    this.walk(schema, payload, '$');
    return { valid: this.errors.length === 0, errors: [...this.errors] };
  }

  walk(schema, value, path) {
    const fail = (message) => this.errors.push({ path, message });
    if (typeOf(schema) !== 'object') {
      fail('schema must be an object');
      return;
    }
    if (schema.type !== undefined && !this.checkTypes(schema.type, value)) {
      fail(`expected ${[schema.type].flat().join(' or ')}, got ${typeOf(value)}`);
      return;
    }
    if (Array.isArray(schema.enum) && !schema.enum.some((option) => sameJson(option, value))) {
      fail(`must be one of ${schema.enum.map((option) => JSON.stringify(option)).join(', ')}`);
    }
    if (typeOf(value) === 'object') {
      const properties = schema.properties ?? {};
      for (const key of Array.isArray(schema.required) ? schema.required : []) {
        if (!Object.hasOwn(value, key)) fail(`missing required property "${key}"`);
      }
      for (const [key, child] of Object.entries(value)) {
        if (Object.hasOwn(properties, key)) this.walk(properties[key], child, `${path}.${key}`);
        else if (schema.additionalProperties === false) fail(`unexpected property "${key}"`);
      }
    }
    if (Array.isArray(value) && schema.items !== undefined) {
      value.forEach((item, i) => this.walk(schema.items, item, `${path}[${i}]`));
    }
  }

  formatValidationErrors() {
    return this.errors.map((error) => `${error.path}: ${error.message}`);
  }

  // Returns the parsed value, or a message that includes the line number when the browser gives one.
  parseJson(text, label = 'JSON') {
    try {
      return { value: JSON.parse(text) };
    } catch (error) {
      const line = /line (\d+)/.exec(error.message)?.[1];
      const position = /position (\d+)/.exec(error.message)?.[1];
      const found = line ?? (position === undefined ? undefined : text.slice(0, Number(position)).split('\n').length);
      return { error: `${label} syntax error${found ? ` on line ${found}` : ''}: ${error.message}` };
    }
  }
}

if (typeof document !== 'undefined') {
  const TEMPLATES = {
    'Login event': {
      schema: {
        type: 'object',
        required: ['user', 'ip', 'success'],
        additionalProperties: false,
        properties: { user: { type: 'string' }, ip: { type: 'string' }, success: { type: 'boolean' }, attempts: { type: 'integer' } },
      },
      payload: { user: 'analyst', ip: '10.0.0.12', success: false, attempts: '3' },
    },
    'Firewall rule': {
      schema: {
        type: 'object',
        required: ['action', 'ports'],
        properties: { action: { enum: ['allow', 'deny'] }, ports: { type: 'array', items: { type: 'integer' } } },
      },
      payload: { action: 'deny', ports: [22, 3389] },
    },
  };
  const $ = (id) => document.getElementById(id);
  const validator = new CybersecuritySentinelSchemaValidator();

  const check = () => {
    const schema = validator.parseJson($('schema').value, 'Schema');
    const payload = validator.parseJson($('payload').value, 'Payload');
    let problems = [schema.error, payload.error].filter(Boolean);
    if (!problems.length) {
      validator.validate(schema.value, payload.value);
      problems = validator.formatValidationErrors();
    }
    $('badge').className = problems.length ? 'fail' : 'pass';
    $('badge').textContent = problems.length ? `Fail: ${problems.length} ${problems.length === 1 ? 'problem' : 'problems'}` : 'Pass';
    $('errors').replaceChildren(...problems.map((message) => {
      const item = document.createElement('li');
      item.textContent = message;
      return item;
    }));
  };

  const load = (name) => {
    $('schema').value = JSON.stringify(TEMPLATES[name].schema, null, 2);
    $('payload').value = JSON.stringify(TEMPLATES[name].payload, null, 2);
    check();
  };

  $('template').replaceChildren(...Object.keys(TEMPLATES).map((name) => new Option(name)));
  $('template').addEventListener('change', (event) => load(event.target.value));
  $('schema').addEventListener('input', check);
  $('payload').addEventListener('input', check);
  load($('template').value);
}
