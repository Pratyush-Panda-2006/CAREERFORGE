export class LegalSmartContractsSchemaValidator {
  #lastErrors = [];

  checkTypes(expected, actual) {
    if (expected === 'null') return actual === null;
    if (actual === null || actual === undefined) return false;
    if (expected === 'array') return Array.isArray(actual);
    if (expected === 'integer') return typeof actual === 'number' && Number.isInteger(actual);
    if (expected === 'number') return typeof actual === 'number' && !Number.isNaN(actual);
    if (expected === 'object') return typeof actual === 'object' && !Array.isArray(actual);
    return typeof actual === expected;
  }

  validate(schema, payload) {
    this.#lastErrors = [];
    if (!schema || typeof schema !== 'object') {
      this.#lastErrors.push({ path: '#', message: 'Schema must be an object' });
      return { valid: false, errors: [...this.#lastErrors] };
    }

    this.#validateNode(schema, payload, '#');
    return {
      valid: this.#lastErrors.length === 0,
      errors: [...this.#lastErrors]
    };
  }

  #validateNode(schema, value, path) {
    if (schema.type && !this.checkTypes(schema.type, value)) {
      this.#lastErrors.push({
        path,
        message: `Expected type ${schema.type}, received ${Array.isArray(value) ? 'array' : typeof value}`
      });
      return;
    }

    if (schema.enum && Array.isArray(schema.enum)) {
      if (!schema.enum.includes(value)) {
        this.#lastErrors.push({
          path,
          message: `Value must be one of [${schema.enum.join(', ')}]`
        });
      }
    }

    if (typeof value === 'number') {
      if (typeof schema.minimum === 'number' && value < schema.minimum) {
        this.#lastErrors.push({ path, message: `Value ${value} is less than minimum ${schema.minimum}` });
      }
      if (typeof schema.maximum === 'number' && value > schema.maximum) {
        this.#lastErrors.push({ path, message: `Value ${value} is greater than maximum ${schema.maximum}` });
      }
    }

    if (typeof value === 'string') {
      if (typeof schema.minLength === 'number' && value.length < schema.minLength) {
        this.#lastErrors.push({ path, message: `String length ${value.length} is less than minLength ${schema.minLength}` });
      }
      if (typeof schema.maxLength === 'number' && value.length > schema.maxLength) {
        this.#lastErrors.push({ path, message: `String length ${value.length} exceeds maxLength ${schema.maxLength}` });
      }
      if (schema.pattern) {
        const regex = new RegExp(schema.pattern);
        if (!regex.test(value)) {
          this.#lastErrors.push({ path, message: `String does not match pattern ${schema.pattern}` });
        }
      }
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      if (Array.isArray(schema.required)) {
        for (const reqKey of schema.required) {
          if (!Object.prototype.hasOwnProperty.call(value, reqKey)) {
            this.#lastErrors.push({
              path: `${path}/${reqKey}`,
              message: `Missing required property: ${reqKey}`
            });
          }
        }
      }

      if (schema.properties && typeof schema.properties === 'object') {
        for (const [propKey, propSchema] of Object.entries(schema.properties)) {
          if (Object.prototype.hasOwnProperty.call(value, propKey)) {
            this.#validateNode(propSchema, value[propKey], `${path}/${propKey}`);
          }
        }
      }
    }

    if (Array.isArray(value) && schema.items && typeof schema.items === 'object') {
      value.forEach((item, index) => {
        this.#validateNode(schema.items, item, `${path}[${index}]`);
      });
    }
  }

  formatValidationErrors() {
    if (this.#lastErrors.length === 0) return 'Validation passed: No errors detected.';
    return this.#lastErrors
      .map((err, idx) => `[Error ${idx + 1}] at ${err.path}: ${err.message}`)
      .join('\n');
  }
}

function mount() {
  const root = document.querySelector('[data-validator-lab]');
  if (!root) return;

  const get = id => root.querySelector(`#${id}`);
  const validator = new LegalSmartContractsSchemaValidator();

  const templates = {
    contract: {
      schema: {
        type: 'object',
        required: ['contractId', 'parties', 'executionTimestamp', 'status'],
        properties: {
          contractId: { type: 'string', minLength: 5 },
          parties: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name', 'role'],
              properties: {
                name: { type: 'string' },
                role: { type: 'string', enum: ['licensor', 'licensee', 'arbitrator', 'witness'] }
              }
            }
          },
          executionTimestamp: { type: 'integer', minimum: 0 },
          status: { type: 'string', enum: ['draft', 'signed', 'disputed', 'settled'] },
          gasLimit: { type: 'number', minimum: 21000 }
        }
      },
      payload: {
        contractId: 'LSC-2026-X99',
        parties: [
          { name: 'Alice Smith', role: 'licensor' },
          { name: 'Bob Jones', role: 'licensee' }
        ],
        executionTimestamp: 1774378900,
        status: 'signed',
        gasLimit: 50000
      }
    },
    oracle: {
      schema: {
        type: 'object',
        required: ['feedId', 'value', 'confidence', 'signatures'],
        properties: {
          feedId: { type: 'string', pattern: '^oracle:[a-z-]+$' },
          value: { type: 'number', minimum: 0 },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          signatures: {
            type: 'array',
            items: { type: 'string', minLength: 10 }
          }
        }
      },
      payload: {
        feedId: 'oracle:eth-usd-price',
        value: 4850.25,
        confidence: 0.995,
        signatures: ['sig_secp256k1_0xfa489bc32d847a', 'sig_secp256k1_0xbc2891d4e78f11']
      }
    }
  };

  function update() {
    let schemaObj, payloadObj;
    try {
      schemaObj = JSON.parse(get('schema-input').value);
    } catch (e) {
      get('status-badge').textContent = 'INVALID SCHEMA JSON';
      get('status-badge').className = 'badge error';
      get('report').textContent = `Schema JSON Parse Error: ${e.message}`;
      return;
    }

    try {
      payloadObj = JSON.parse(get('payload-input').value);
    } catch (e) {
      get('status-badge').textContent = 'INVALID PAYLOAD JSON';
      get('status-badge').className = 'badge error';
      get('report').textContent = `Payload JSON Parse Error: ${e.message}`;
      return;
    }

    const result = validator.validate(schemaObj, payloadObj);
    if (result.valid) {
      get('status-badge').textContent = 'VALID SCHEMA MATCH';
      get('status-badge').className = 'badge success';
      get('report').textContent = 'Payload conforms strictly to JSON Schema specification.\n0 validation errors found.';
    } else {
      get('status-badge').textContent = `${result.errors.length} MISMATCH(ES)`;
      get('status-badge').className = 'badge error';
      get('report').textContent = validator.formatValidationErrors();
    }
  }

  get('template-select').addEventListener('change', e => {
    const tmpl = templates[e.target.value];
    if (tmpl) {
      get('schema-input').value = JSON.stringify(tmpl.schema, null, 2);
      get('payload-input').value = JSON.stringify(tmpl.payload, null, 2);
      update();
    }
  });

  get('validate-btn').addEventListener('click', update);
  get('schema-input').addEventListener('input', update);
  get('payload-input').addEventListener('input', update);

  // Initial load
  const init = templates.contract;
  get('schema-input').value = JSON.stringify(init.schema, null, 2);
  get('payload-input').value = JSON.stringify(init.payload, null, 2);
  update();
}

if (typeof document !== 'undefined') mount();
