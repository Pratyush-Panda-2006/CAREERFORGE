export class SupplyChainLogisticsSchemaValidator {
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
    return this.#lastErrors.map(e => `[${e.path}] ${e.message}`).join('\n');
  }
}

function mount() {
  const root = document.querySelector('[data-schema-lab]');
  if (!root) return;

  const validator = new SupplyChainLogisticsSchemaValidator();
  const schemaInput = root.querySelector('#schema-input');
  const payloadInput = root.querySelector('#payload-input');
  const reportEl = root.querySelector('#validation-report');
  const statusBadge = root.querySelector('#validation-status');

  function validate() {
    try {
      const schema = JSON.parse(schemaInput.value);
      const payload = JSON.parse(payloadInput.value);

      const result = validator.validate(schema, payload);
      if (result.valid) {
        statusBadge.textContent = 'PASS';
        statusBadge.className = 'status-pill status-pass';
        reportEl.textContent = 'Payload strictly matches the JSON schema specification.';
      } else {
        statusBadge.textContent = 'FAIL';
        statusBadge.className = 'status-pill status-fail';
        reportEl.textContent = validator.formatValidationErrors();
      }
    } catch (e) {
      statusBadge.textContent = 'SYNTAX ERROR';
      statusBadge.className = 'status-pill status-error';
      reportEl.textContent = `JSON Parse Error: ${e.message}`;
    }
  }

  schemaInput.addEventListener('input', validate);
  payloadInput.addEventListener('input', validate);
  validate();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
}
