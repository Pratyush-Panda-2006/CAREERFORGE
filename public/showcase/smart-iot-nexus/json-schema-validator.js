/**
 * SmartIotNexusSchemaValidator
 * Autonomous client-side JSON Schema Validator & Structural Linter for Smart IoT Nexus.
 * Performs recursive type validation, required key checks, numerical bounds, string constraints,
 * enums, array items, and structured error diagnostics with line detection.
 */

export class SmartIotNexusSchemaValidator {
  #lastErrors = [];

  constructor() {
    this.#lastErrors = [];
  }

  /**
   * Verifies actual JSON type against expected schema type.
   * @param {string} expected
   * @param {*} actual
   * @returns {boolean}
   */
  checkTypes(expected, actual) {
    if (expected === 'null') return actual === null;
    if (actual === null || actual === undefined) return false;
    if (expected === 'array') return Array.isArray(actual);
    if (expected === 'integer') return typeof actual === 'number' && Number.isInteger(actual);
    if (expected === 'number') return typeof actual === 'number' && !Number.isNaN(actual);
    if (expected === 'object') return typeof actual === 'object' && !Array.isArray(actual);
    if (expected === 'boolean') return typeof actual === 'boolean';
    if (expected === 'string') return typeof actual === 'string';
    return typeof actual === expected;
  }

  /**
   * Validates a JSON payload against a JSON schema definition.
   * @param {object} schema
   * @param {*} payload
   * @param {string} [rawPayloadStr=''] - Optional raw JSON string for line-number detection
   * @returns {{ valid: boolean, errors: Array<{ path: string, message: string, line?: number }> }}
   */
  validate(schema, payload, rawPayloadStr = '') {
    this.#lastErrors = [];

    if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
      this.#lastErrors.push({ path: '#', message: 'Schema must be a valid JSON object' });
      return { valid: false, errors: [...this.#lastErrors] };
    }

    this.#validateNode(schema, payload, '#', rawPayloadStr);

    return {
      valid: this.#lastErrors.length === 0,
      errors: [...this.#lastErrors]
    };
  }

  /**
   * Recursively validates subnodes against schema rules.
   */
  #validateNode(schema, value, path, rawPayloadStr) {
    // 1. Type validation
    if (schema.type && !this.checkTypes(schema.type, value)) {
      const actualType = value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
      this.#addError(path, `Expected type ${schema.type}, received ${actualType}`, rawPayloadStr);
      return;
    }

    // 2. Enum validation
    if (schema.enum && Array.isArray(schema.enum)) {
      if (!schema.enum.includes(value)) {
        this.#addError(path, `Value must be one of [${schema.enum.join(', ')}]`, rawPayloadStr);
      }
    }

    // 3. Number constraints
    if (typeof value === 'number') {
      if (typeof schema.minimum === 'number' && value < schema.minimum) {
        this.#addError(path, `Value ${value} is less than minimum ${schema.minimum}`, rawPayloadStr);
      }
      if (typeof schema.maximum === 'number' && value > schema.maximum) {
        this.#addError(path, `Value ${value} is greater than maximum ${schema.maximum}`, rawPayloadStr);
      }
    }

    // 4. String constraints
    if (typeof value === 'string') {
      if (typeof schema.minLength === 'number' && value.length < schema.minLength) {
        this.#addError(path, `String length (${value.length}) is less than minLength ${schema.minLength}`, rawPayloadStr);
      }
      if (typeof schema.maxLength === 'number' && value.length > schema.maxLength) {
        this.#addError(path, `String length (${value.length}) exceeds maxLength ${schema.maxLength}`, rawPayloadStr);
      }
      if (schema.pattern) {
        try {
          const regex = new RegExp(schema.pattern);
          if (!regex.test(value)) {
            this.#addError(path, `String does not match required regex pattern: ${schema.pattern}`, rawPayloadStr);
          }
        } catch {
          // Ignore invalid regex patterns in schema
        }
      }
    }

    // 5. Object constraints (required & properties)
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      if (Array.isArray(schema.required)) {
        for (const reqKey of schema.required) {
          if (!Object.prototype.hasOwnProperty.call(value, reqKey)) {
            this.#addError(`${path}/${reqKey}`, `Missing required property: "${reqKey}"`, rawPayloadStr, reqKey);
          }
        }
      }

      if (schema.properties && typeof schema.properties === 'object') {
        for (const [propKey, propSchema] of Object.entries(schema.properties)) {
          if (Object.prototype.hasOwnProperty.call(value, propKey)) {
            this.#validateNode(propSchema, value[propKey], `${path}/${propKey}`, rawPayloadStr);
          }
        }
      }
    }

    // 6. Array items constraints
    if (Array.isArray(value) && schema.items && typeof schema.items === 'object') {
      value.forEach((item, index) => {
        this.#validateNode(schema.items, item, `${path}[${index}]`, rawPayloadStr);
      });
    }
  }

  /**
   * Helper to detect line number in raw payload text.
   */
  #addError(path, message, rawPayloadStr, keyToSearch = null) {
    let line = null;
    if (rawPayloadStr && typeof rawPayloadStr === 'string') {
      const searchKey = keyToSearch || path.split('/').pop()?.replace(/\[\d+\]/, '') || '';
      if (searchKey && searchKey !== '#') {
        const lines = rawPayloadStr.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(`"${searchKey}"`)) {
            line = i + 1;
            break;
          }
        }
      }
    }

    this.#lastErrors.push({
      path,
      message,
      ...(line ? { line } : {})
    });
  }

  /**
   * Formats accumulated validation errors into human-readable diagnostics report.
   * @returns {string}
   */
  formatValidationErrors() {
    if (this.#lastErrors.length === 0) {
      return 'Validation passed: No schema violations detected. Payload is fully compliant.';
    }
    return this.#lastErrors
      .map(e => `[${e.path}]${e.line ? ` (Line ${e.line})` : ''}: ${e.message}`)
      .join('\n');
  }

  /**
   * Returns copy of recent errors.
   */
  getErrors() {
    return [...this.#lastErrors];
  }
}

// Pre-configured schema templates for Smart IoT Nexus
export const iotTemplates = {
  sensor: {
    schema: {
      type: 'object',
      required: ['sensorId', 'timestamp', 'metric', 'value', 'unit', 'batteryLevel'],
      properties: {
        sensorId: { type: 'string', pattern: '^sensor-[0-9]{3,4}$' },
        timestamp: { type: 'integer' },
        metric: { type: 'string', enum: ['temperature', 'humidity', 'pressure', 'co2'] },
        value: { type: 'number', minimum: -50, maximum: 200 },
        unit: { type: 'string' },
        batteryLevel: { type: 'number', minimum: 0, maximum: 100 }
      }
    },
    payload: {
      sensorId: 'sensor-1042',
      timestamp: 1764350400,
      metric: 'temperature',
      value: 23.4,
      unit: 'celsius',
      batteryLevel: 94.5
    }
  },

  actuator: {
    schema: {
      type: 'object',
      required: ['deviceId', 'command', 'priority', 'parameters'],
      properties: {
        deviceId: { type: 'string' },
        command: { type: 'string', enum: ['open_valve', 'close_valve', 'set_dimmer', 'reboot'] },
        priority: { type: 'string', enum: ['low', 'normal', 'critical'] },
        parameters: {
          type: 'object',
          required: ['targetLevel'],
          properties: {
            targetLevel: { type: 'number', minimum: 0, maximum: 100 }
          }
        }
      }
    },
    payload: {
      deviceId: 'actuator-north-07',
      command: 'set_dimmer',
      priority: 'normal',
      parameters: {
        targetLevel: 75.0
      }
    }
  },

  gateway: {
    schema: {
      type: 'object',
      required: ['gatewayId', 'uptimeSeconds', 'connectedNodes', 'firmwareVersion', 'status'],
      properties: {
        gatewayId: { type: 'string' },
        uptimeSeconds: { type: 'integer', minimum: 0 },
        connectedNodes: { type: 'integer', minimum: 1 },
        firmwareVersion: { type: 'string', minLength: 3 },
        status: { type: 'string', enum: ['ONLINE', 'DEGRADED', 'MAINTENANCE'] }
      }
    },
    payload: {
      gatewayId: 'gw-edge-hub-01',
      uptimeSeconds: 864000,
      connectedNodes: 48,
      firmwareVersion: 'v3.4.1',
      status: 'ONLINE'
    }
  },

  mismatch: {
    schema: {
      type: 'object',
      required: ['sensorId', 'timestamp', 'metric', 'value', 'unit', 'batteryLevel'],
      properties: {
        sensorId: { type: 'string', pattern: '^sensor-[0-9]{3,4}$' },
        timestamp: { type: 'integer' },
        metric: { type: 'string', enum: ['temperature', 'humidity', 'pressure', 'co2'] },
        value: { type: 'number', minimum: -50, maximum: 200 },
        unit: { type: 'string' },
        batteryLevel: { type: 'number', minimum: 0, maximum: 100 }
      }
    },
    payload: {
      sensorId: 'invalid_sensor_name',
      timestamp: '2026-11-28T17:28:00Z',
      metric: 'radiation-unregistered',
      value: 9999.0,
      batteryLevel: -15.0
    }
  }
};

// Browser DOM controller
function mount() {
  const root = document.querySelector('[data-schema-lab]');
  if (!root) return;

  const validator = new SmartIotNexusSchemaValidator();
  const templateSelect = root.querySelector('#template-select');
  const schemaInput = root.querySelector('#schema-input');
  const payloadInput = root.querySelector('#payload-input');
  const validateBtn = root.querySelector('#validate-btn');
  const statusBadge = root.querySelector('#validation-status');
  const errorBadge = root.querySelector('#error-summary-badge');
  const reportOutput = root.querySelector('#validation-report');
  const calloutsContainer = root.querySelector('#error-callouts-container');

  function loadTemplate(key) {
    const tpl = iotTemplates[key];
    if (tpl) {
      schemaInput.value = JSON.stringify(tpl.schema, null, 2);
      payloadInput.value = JSON.stringify(tpl.payload, null, 2);
      runValidation();
    }
  }

  function runValidation() {
    calloutsContainer.innerHTML = '';
    try {
      const schema = JSON.parse(schemaInput.value);
      const payload = JSON.parse(payloadInput.value);

      const result = validator.validate(schema, payload, payloadInput.value);

      if (result.valid) {
        statusBadge.textContent = 'PASS';
        statusBadge.className = 'status-pill status-pass';
        errorBadge.textContent = '0 Violations';
        reportOutput.textContent = 'Payload strictly matches the JSON schema specification.';
      } else {
        statusBadge.textContent = 'FAIL';
        statusBadge.className = 'status-pill status-fail';
        errorBadge.textContent = `${result.errors.length} Violations`;
        reportOutput.textContent = validator.formatValidationErrors();

        // Render error line callouts
        result.errors.forEach(err => {
          const callout = document.createElement('div');
          callout.className = 'error-callout';
          callout.innerHTML = `
            ${err.line ? `<span class="error-line-badge">Line ${err.line}</span>` : ''}
            <span class="error-path">${err.path}</span>
            <span class="error-msg">${err.message}</span>
          `;
          calloutsContainer.appendChild(callout);
        });
      }
    } catch (e) {
      statusBadge.textContent = 'SYNTAX ERROR';
      statusBadge.className = 'status-pill status-error';
      errorBadge.textContent = 'Parse Failure';
      reportOutput.textContent = `JSON Parse Error: ${e.message}`;
    }
  }

  if (templateSelect) {
    templateSelect.addEventListener('change', (e) => loadTemplate(e.target.value));
  }

  if (validateBtn) {
    validateBtn.addEventListener('click', runValidation);
  }

  schemaInput.addEventListener('input', runValidation);
  payloadInput.addEventListener('input', runValidation);

  // Initial load
  loadTemplate('sensor');
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
}
