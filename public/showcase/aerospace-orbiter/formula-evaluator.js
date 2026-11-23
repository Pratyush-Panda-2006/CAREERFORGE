/**
 * Aerospace Orbiter - Mathematical Expression Parser & Dynamic KPI Formula Calculator
 * Issue #1260 - NSoC '26 Level 3 Feature
 * 
 * Production-grade, safe mathematical tokenizer, Shunting-yard RPN compiler,
 * aerospace trajectory variable injection evaluator, and audit trail history logger.
 */

export const DEFAULT_ORBITAL_VARIABLES = Object.freeze({
  orbital_altitude: 408,     // ISS mean altitude (km)
  escape_velocity: 11.186,   // Earth escape velocity at surface (km/s)
  delta_v: 3.2,              // Orbital transfer maneuver delta-v (km/s)
  thrust_to_weight: 1.45,    // Vehicle thrust-to-weight ratio (TWR)
  specific_impulse: 311,     // Vacuum specific impulse (s)
  apogee: 420,               // Orbital apogee altitude (km)
  perigee: 400,              // Orbital perigee altitude (km)
  pi: Math.PI,
  e: Math.E,
  g0: 9.80665,               // Earth standard gravitational acceleration (m/s^2)
  mu: 398600.4418,           // Earth standard gravitational parameter (km^3/s^2)
  earth_radius: 6371         // Volumetric mean Earth radius (km)
});

export const AEROSPACE_FORMULA_PRESETS = Object.freeze([
  {
    id: 'vis_viva',
    name: 'Vis-Viva Orbital Velocity',
    category: 'Orbital Mechanics',
    formula: 'sqrt(398600.4418 / (6371 + orbital_altitude))',
    unit: 'km/s',
    description: 'Instantaneous orbital speed for a circular orbit at specified altitude.'
  },
  {
    id: 'escape_velocity',
    name: 'Local Escape Velocity',
    category: 'Orbital Mechanics',
    formula: 'sqrt(2 * 398600.4418 / (6371 + orbital_altitude))',
    unit: 'km/s',
    description: 'Speed required to break free from planetary gravitational attraction without propulsion.'
  },
  {
    id: 'orbital_period',
    name: 'Orbital Period',
    category: 'Orbital Mechanics',
    formula: '2 * pi * sqrt(((6371 + orbital_altitude) ^ 3) / 398600.4418)',
    unit: 'seconds',
    description: 'Time taken for one complete revolution around Earth.'
  },
  {
    id: 'semi_major_axis',
    name: 'Semi-Major Axis (a)',
    category: 'Orbital Geometry',
    formula: '((apogee + 6371) + (perigee + 6371)) / 2',
    unit: 'km',
    description: 'Half of the major axis of an elliptical orbit measured from planet barycenter.'
  },
  {
    id: 'orbital_eccentricity',
    name: 'Orbital Eccentricity (e)',
    category: 'Orbital Geometry',
    formula: 'abs(apogee - perigee) / ((apogee + 6371) + (perigee + 6371))',
    unit: 'ratio',
    description: 'Measure of orbital elongation and deviation from circularity (0 = circular).'
  },
  {
    id: 'tsiolkovsky_exhaust_speed',
    name: 'Effective Exhaust Velocity',
    category: 'Propulsion',
    formula: 'specific_impulse * g0',
    unit: 'm/s',
    description: 'Effective rocket engine exhaust gas ejection velocity.'
  },
  {
    id: 'thrust_acceleration',
    name: 'Engine Thrust Acceleration',
    category: 'Propulsion',
    formula: 'thrust_to_weight * g0',
    unit: 'm/s²',
    description: 'Vehicle acceleration produced under active propulsion.'
  },
  {
    id: 'apogee_perigee_ratio',
    name: 'Apogee to Perigee Ratio',
    category: 'Trajectory Optimization',
    formula: 'apogee / perigee',
    unit: 'ratio',
    description: 'Ratio between orbital extremes.'
  }
]);

const BUILTIN_FUNCTIONS = Object.freeze({
  sqrt: { arity: 1, fn: (x) => {
    if (x < 0) throw new Error(`Square root of negative number: ${x}`);
    return Math.sqrt(x);
  }},
  log: { arity: 1, fn: (x) => {
    if (x <= 0) throw new Error(`Logarithm of non-positive number: ${x}`);
    return Math.log10(x);
  }},
  ln: { arity: 1, fn: (x) => {
    if (x <= 0) throw new Error(`Natural logarithm of non-positive number: ${x}`);
    return Math.log(x);
  }},
  exp: { arity: 1, fn: (x) => Math.exp(x) },
  abs: { arity: 1, fn: (x) => Math.abs(x) },
  round: { arity: 1, fn: (x) => Math.round(x) },
  floor: { arity: 1, fn: (x) => Math.floor(x) },
  ceil: { arity: 1, fn: (x) => Math.ceil(x) },
  min: { arity: 2, fn: (a, b) => Math.min(a, b) },
  max: { arity: 2, fn: (a, b) => Math.max(a, b) },
  sin: { arity: 1, fn: (x) => Math.sin(x) },
  cos: { arity: 1, fn: (x) => Math.cos(x) },
  tan: { arity: 1, fn: (x) => Math.tan(x) }
});

const OPERATOR_CONFIG = Object.freeze({
  '+': { precedence: 1, assoc: 'left', unary: false },
  '-': { precedence: 1, assoc: 'left', unary: false },
  '*': { precedence: 2, assoc: 'left', unary: false },
  '/': { precedence: 2, assoc: 'left', unary: false },
  '%': { precedence: 2, assoc: 'left', unary: false },
  '^': { precedence: 3, assoc: 'right', unary: false },
  'u+': { precedence: 4, assoc: 'right', unary: true },
  'u-': { precedence: 4, assoc: 'right', unary: true }
});

export class AerospaceOrbiterFormulaParser {
  /**
   * @param {Object} [options]
   * @param {Object} [options.variables] Custom initial variable overrides
   * @param {number} [options.maxHistory=100] Maximum stored audit records
   * @param {Object} [options.customFunctions] Extra user-defined functions
   */
  constructor(options = {}) {
    this.options = { ...options };
    this.variables = { ...DEFAULT_ORBITAL_VARIABLES, ...options.variables };
    this.maxHistory = typeof options.maxHistory === 'number' && options.maxHistory > 0 ? options.maxHistory : 100;
    this.history = [];
    this.listeners = new Map();
    this.customFunctions = new Map();

    if (options.customFunctions && typeof options.customFunctions === 'object') {
      for (const [name, fnDef] of Object.entries(options.customFunctions)) {
        if (typeof fnDef === 'function') {
          this.addFunction(name, fnDef, 1);
        } else if (fnDef && typeof fnDef.fn === 'function') {
          this.addFunction(name, fnDef.fn, fnDef.arity || 1);
        }
      }
    }
  }

  // ==========================================
  // EVENT EMITTER IMPLEMENTATION
  // ==========================================

  /**
   * Attach event listener
   * @param {string} event
   * @param {Function} listener
   * @returns {Function} Unsubscribe handle
   */
  on(event, listener) {
    if (typeof listener !== 'function') {
      throw new TypeError(`Event listener for '${event}' must be a function`);
    }
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(listener);
    return () => this.off(event, listener);
  }

  /**
   * Remove event listener
   * @param {string} event
   * @param {Function} listener
   */
  off(event, listener) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(listener);
    }
  }

  /**
   * Emit event to listeners
   * @param {string} event
   * @param  {...any} args
   */
  emit(event, ...args) {
    if (this.listeners.has(event)) {
      for (const listener of this.listeners.get(event)) {
        try {
          listener(...args);
        } catch (err) {
          console.error(`Error in '${event}' event listener:`, err);
        }
      }
    }
  }

  // ==========================================
  // VARIABLE & FUNCTION MANAGEMENT
  // ==========================================

  /**
   * Set or update a variable
   * @param {string} name
   * @param {number} value
   */
  setVariable(name, value) {
    if (typeof name !== 'string' || !name.trim()) {
      throw new TypeError('Variable name must be a non-empty string');
    }
    const num = Number(value);
    if (!Number.isFinite(num)) {
      throw new TypeError(`Variable '${name}' must be a finite numerical value`);
    }
    const cleanKey = name.trim();
    this.variables[cleanKey] = num;
    this.emit('variableChange', { name: cleanKey, value: num });
    return this;
  }

  /**
   * Batch update variables
   * @param {Object} vars
   */
  setVariables(vars) {
    if (!vars || typeof vars !== 'object') {
      throw new TypeError('Variables must be an object');
    }
    for (const [k, v] of Object.entries(vars)) {
      this.setVariable(k, v);
    }
    return this;
  }

  /**
   * Retrieve copy of active variables
   * @returns {Object}
   */
  getVariables() {
    return { ...this.variables };
  }

  /**
   * Reset all variables to default aerospace trajectory parameters
   */
  resetVariables() {
    this.variables = { ...DEFAULT_ORBITAL_VARIABLES };
    this.emit('variablesReset', { ...this.variables });
    return this;
  }

  /**
   * Register a custom scientific function
   * @param {string} name
   * @param {Function} fn
   * @param {number} [arity=1]
   */
  addFunction(name, fn, arity = 1) {
    if (typeof name !== 'string' || !name.trim()) {
      throw new TypeError('Function name must be a non-empty string');
    }
    if (typeof fn !== 'function') {
      throw new TypeError(`Implementation for function '${name}' must be a callable function`);
    }
    this.customFunctions.set(name.trim().toLowerCase(), { fn, arity });
    return this;
  }

  // ==========================================
  // TOKENIZER
  // ==========================================

  /**
   * Tokenize mathematical expression into structured tokens
   * Handles integers, floating decimals, scientific notation, identifiers,
   * operators (+, -, *, /, ^, %), parentheses, and commas.
   * Disambiguates unary vs binary +/- operators.
   * 
   * @param {string} expr
   * @returns {Array<Object>} tokens
   */
  tokenize(expr) {
    if (typeof expr !== 'string') {
      throw new TypeError('Expression must be a string');
    }

    const tokens = [];
    let i = 0;
    const len = expr.length;

    while (i < len) {
      const char = expr[i];

      // 1. Skip whitespace
      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // 2. Numbers (integers, floating decimals, scientific notation: 1.5e-3, 2.4E5, .5, 100)
      const numMatch = expr.slice(i).match(/^((?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?)/);
      if (numMatch) {
        const raw = numMatch[1];
        const val = parseFloat(raw);
        if (!Number.isFinite(val)) {
          throw new Error(`Invalid numerical literal '${raw}' at index ${i}`);
        }
        tokens.push({
          type: 'number',
          value: val,
          raw,
          position: i
        });
        i += raw.length;
        continue;
      }

      // 3. Identifiers: function names or variables
      const idMatch = expr.slice(i).match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
      if (idMatch) {
        const raw = idMatch[0];
        const lower = raw.toLowerCase();
        const isFunction = BUILTIN_FUNCTIONS[lower] !== undefined || this.customFunctions.has(lower);

        if (isFunction) {
          const fnMeta = BUILTIN_FUNCTIONS[lower] || this.customFunctions.get(lower);
          tokens.push({
            type: 'function',
            value: lower,
            raw,
            arity: fnMeta.arity,
            position: i
          });
        } else {
          tokens.push({
            type: 'variable',
            value: raw,
            raw,
            position: i
          });
        }
        i += raw.length;
        continue;
      }

      // 4. Operators (+, -, *, /, ^, %)
      if (char === '+' || char === '-') {
        // Disambiguate unary vs binary
        // Unary if at start of expression, or previous token was an operator, '(', or ','
        const prevToken = tokens.length > 0 ? tokens[tokens.length - 1] : null;
        const isUnary = !prevToken ||
          prevToken.type === 'operator' ||
          prevToken.type === 'lparen' ||
          prevToken.type === 'comma';

        const opKey = isUnary ? (char === '-' ? 'u-' : 'u+') : char;
        const opMeta = OPERATOR_CONFIG[opKey];

        tokens.push({
          type: 'operator',
          value: opKey,
          raw: char,
          unary: isUnary,
          precedence: opMeta.precedence,
          assoc: opMeta.assoc,
          position: i
        });
        i++;
        continue;
      }

      if (char === '*' || char === '/' || char === '%' || char === '^') {
        const opMeta = OPERATOR_CONFIG[char];
        tokens.push({
          type: 'operator',
          value: char,
          raw: char,
          unary: false,
          precedence: opMeta.precedence,
          assoc: opMeta.assoc,
          position: i
        });
        i++;
        continue;
      }

      // 5. Parentheses & Comma
      if (char === '(') {
        tokens.push({ type: 'lparen', value: '(', raw: '(', position: i });
        i++;
        continue;
      }

      if (char === ')') {
        tokens.push({ type: 'rparen', value: ')', raw: ')', position: i });
        i++;
        continue;
      }

      if (char === ',') {
        tokens.push({ type: 'comma', value: ',', raw: ',', position: i });
        i++;
        continue;
      }

      // 6. Unknown / Invalid character
      throw new Error(`Invalid character '${char}' at index ${i}`);
    }

    return tokens;
  }

  // ==========================================
  // SYNTAX VALIDATION
  // ==========================================

  /**
   * Validate expression syntax before compilation or evaluation
   * Checks balanced parentheses, consecutive binary operators, empty parentheses,
   * trailing/leading operators, uncalled functions, and misplaced commas.
   * 
   * @param {string} expr
   * @returns {{ valid: boolean, error?: string, details?: Object }}
   */
  validateSyntax(expr) {
    if (typeof expr !== 'string' || !expr.trim()) {
      return { valid: false, error: 'Expression is empty' };
    }

    let tokens;
    try {
      tokens = this.tokenize(expr);
    } catch (err) {
      return { valid: false, error: err.message };
    }

    if (tokens.length === 0) {
      return { valid: false, error: 'Expression contains no operational tokens' };
    }

    // 1. Initial token check
    const first = tokens[0];
    if (first.type === 'operator' && !first.unary) {
      return { valid: false, error: `Expression cannot start with binary operator '${first.raw}'` };
    }
    if (first.type === 'rparen') {
      return { valid: false, error: "Expression cannot start with closing parenthesis ')'" };
    }
    if (first.type === 'comma') {
      return { valid: false, error: "Expression cannot start with comma ','" };
    }

    // 2. Final token check
    const last = tokens[tokens.length - 1];
    if (last.type === 'operator') {
      return { valid: false, error: `Expression cannot end with operator '${last.raw}'` };
    }
    if (last.type === 'lparen') {
      return { valid: false, error: "Expression cannot end with unclosed opening parenthesis '('" };
    }
    if (last.type === 'comma') {
      return { valid: false, error: "Expression cannot end with comma ','" };
    }
    if (last.type === 'function') {
      return { valid: false, error: `Function '${last.value}' must be followed by '(' and arguments` };
    }

    // 3. Sequential structural validation
    let parenDepth = 0;
    for (let j = 0; j < tokens.length; j++) {
      const cur = tokens[j];
      const next = j + 1 < tokens.length ? tokens[j + 1] : null;

      if (cur.type === 'lparen') {
        parenDepth++;
        if (next && next.type === 'rparen') {
          return { valid: false, error: 'Empty parentheses are not allowed' };
        }
      } else if (cur.type === 'rparen') {
        parenDepth--;
        if (parenDepth < 0) {
          return { valid: false, error: 'Unmatched closing parenthesis' };
        }
      }

      if (cur.type === 'function') {
        if (!next || next.type !== 'lparen') {
          return { valid: false, error: `Function '${cur.value}' must be followed by '('` };
        }
      }

      // Check consecutive binary operators (e.g. 5 + * 3 or 4 / / 2)
      if (cur.type === 'operator' && !cur.unary) {
        if (next && next.type === 'operator' && !next.unary) {
          return {
            valid: false,
            error: `Consecutive binary operators '${cur.raw}' and '${next.raw}' are not allowed`
          };
        }
      }

      // Check comma positioning
      if (cur.type === 'comma') {
        if (!next || next.type === 'rparen' || (next.type === 'operator' && !next.unary)) {
          return { valid: false, error: 'Misplaced or trailing comma' };
        }
      }
    }

    if (parenDepth > 0) {
      return { valid: false, error: `Unclosed parenthesis (${parenDepth} missing ')')` };
    }

    return { valid: true };
  }

  // ==========================================
  // SHUNTING-YARD RPN COMPILER
  // ==========================================

  /**
   * Convert infix tokens into Reverse Polish Notation (RPN) using Dijkstra's Shunting-yard algorithm
   * Respects operator precedence: ^ (power) > * / % > + -
   * Correctly handles right-associativity of ^ and unary minus/plus.
   * 
   * @param {Array<Object>|string} tokensOrExpr
   * @returns {Array<Object>} RPN token array
   */
  toRPN(tokensOrExpr) {
    let tokens = tokensOrExpr;
    if (typeof tokens === 'string') {
      const validation = this.validateSyntax(tokens);
      if (!validation.valid) {
        throw new Error(`Syntax error: ${validation.error}`);
      }
      tokens = this.tokenize(tokens);
    }

    if (!Array.isArray(tokens)) {
      throw new TypeError('Tokens must be an array or expression string');
    }

    const output = [];
    const opStack = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.type === 'number' || token.type === 'variable') {
        output.push(token);
      } else if (token.type === 'function') {
        opStack.push(token);
      } else if (token.type === 'comma') {
        // Pop operators to output until left parenthesis
        while (opStack.length > 0 && opStack[opStack.length - 1].type !== 'lparen') {
          output.push(opStack.pop());
        }
        if (opStack.length === 0) {
          throw new Error('Misplaced comma outside of function arguments');
        }
      } else if (token.type === 'operator') {
        const o1 = token;
        while (opStack.length > 0) {
          const o2 = opStack[opStack.length - 1];
          if (o2.type === 'function') {
            output.push(opStack.pop());
            continue;
          }
          if (o2.type === 'operator') {
            const p1 = o1.precedence;
            const p2 = o2.precedence;
            if ((o1.assoc === 'left' && p1 <= p2) || (o1.assoc === 'right' && p1 < p2)) {
              output.push(opStack.pop());
              continue;
            }
          }
          break;
        }
        opStack.push(o1);
      } else if (token.type === 'lparen') {
        opStack.push(token);
      } else if (token.type === 'rparen') {
        while (opStack.length > 0 && opStack[opStack.length - 1].type !== 'lparen') {
          output.push(opStack.pop());
        }
        if (opStack.length === 0) {
          throw new Error('Mismatched parentheses: missing opening parenthesis');
        }
        opStack.pop(); // Remove '('

        // If top of stack is function, pop it to output
        if (opStack.length > 0 && opStack[opStack.length - 1].type === 'function') {
          output.push(opStack.pop());
        }
      }
    }

    while (opStack.length > 0) {
      const op = opStack.pop();
      if (op.type === 'lparen' || op.type === 'rparen') {
        throw new Error('Mismatched parentheses in expression');
      }
      output.push(op);
    }

    return output;
  }

  // ==========================================
  // EVALUATION ENGINE
  // ==========================================

  /**
   * Evaluate mathematical expression or compiled RPN with aerospace variable injection.
   * Handles division by zero, non-positive logarithms, negative square roots, and edge cases safely.
   * 
   * @param {string|Array<Object>} tokensOrExpr
   * @param {Object} [overrideVariables]
   * @returns {number} Clean numerical result
   */
  evaluate(tokensOrExpr, overrideVariables = {}) {
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    let rpn;
    let originalExpr = '';

    if (typeof tokensOrExpr === 'string') {
      originalExpr = tokensOrExpr.trim();
      const validation = this.validateSyntax(originalExpr);
      if (!validation.valid) {
        throw new Error(`Syntax error: ${validation.error}`);
      }
      const tokens = this.tokenize(originalExpr);
      rpn = this.toRPN(tokens);
    } else if (Array.isArray(tokensOrExpr)) {
      // Check if tokens are already RPN (no parentheses) or infix tokens
      const hasParens = tokensOrExpr.some(t => t.type === 'lparen' || t.type === 'rparen');
      if (hasParens) {
        rpn = this.toRPN(tokensOrExpr);
      } else {
        rpn = tokensOrExpr;
      }
      originalExpr = this.tokensToExpression(tokensOrExpr);
    } else {
      throw new TypeError('Expression must be a string or token array');
    }

    const vars = { ...this.variables, ...overrideVariables };
    const stack = [];

    for (let i = 0; i < rpn.length; i++) {
      const token = rpn[i];

      if (token.type === 'number') {
        stack.push(Number(token.value));
      } else if (token.type === 'variable') {
        const varName = token.value;
        let resolvedVal = vars[varName];
        if (resolvedVal === undefined && vars[varName.toLowerCase()] !== undefined) {
          resolvedVal = vars[varName.toLowerCase()];
        }

        if (resolvedVal === undefined) {
          throw new Error(`Undefined variable '${varName}'. Provide it in parameters.`);
        }

        const numVal = Number(resolvedVal);
        if (!Number.isFinite(numVal)) {
          throw new Error(`Variable '${varName}' evaluated to non-finite value: ${resolvedVal}`);
        }
        stack.push(numVal);
      } else if (token.type === 'operator') {
        if (token.unary) {
          if (stack.length < 1) {
            throw new Error(`Missing operand for unary operator '${token.raw}'`);
          }
          const val = stack.pop();
          if (token.value === 'u-') {
            stack.push(-val);
          } else {
            stack.push(+val);
          }
        } else {
          if (stack.length < 2) {
            throw new Error(`Missing operands for binary operator '${token.raw}'`);
          }
          const b = stack.pop();
          const a = stack.pop();

          switch (token.value) {
            case '+':
              stack.push(a + b);
              break;
            case '-':
              stack.push(a - b);
              break;
            case '*':
              stack.push(a * b);
              break;
            case '/':
              if (b === 0) {
                throw new Error('Division by zero: denominator evaluated to zero');
              }
              stack.push(a / b);
              break;
            case '%':
              if (b === 0) {
                throw new Error('Modulo by zero: divisor evaluated to zero');
              }
              stack.push(a % b);
              break;
            case '^': {
              const res = Math.pow(a, b);
              if (!Number.isFinite(res)) {
                throw new Error(`Exponentiation resulted in non-finite value: ${a} ^ ${b}`);
              }
              stack.push(res);
              break;
            }
            default:
              throw new Error(`Unsupported operator '${token.value}'`);
          }
        }
      } else if (token.type === 'function') {
        const fnName = token.value.toLowerCase();
        const fnDef = BUILTIN_FUNCTIONS[fnName] || this.customFunctions.get(fnName);

        if (!fnDef) {
          throw new Error(`Unknown scientific function '${fnName}'`);
        }

        const arity = token.arity || fnDef.arity || 1;
        if (stack.length < arity) {
          throw new Error(`Function '${fnName}' requires ${arity} argument(s), got ${stack.length}`);
        }

        if (arity === 2) {
          const b = stack.pop();
          const a = stack.pop();
          stack.push(fnDef.fn(a, b));
        } else {
          const a = stack.pop();
          stack.push(fnDef.fn(a));
        }
      }
    }

    if (stack.length !== 1) {
      throw new Error(`Evaluation failed: unexpected ${stack.length} values remaining on execution stack`);
    }

    const rawResult = stack[0];
    if (!Number.isFinite(rawResult)) {
      throw new Error(`Calculation resulted in non-finite value: ${rawResult}`);
    }

    const cleanResult = this.cleanPrecision(rawResult);
    const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const durationMs = Math.max(0, endTime - startTime);

    // Audit log history recording
    const calcId = `calc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const historyEntry = {
      id: calcId,
      expression: originalExpr,
      rpn: rpn.map(t => t.raw || t.value).join(' '),
      variables: { ...vars },
      result: cleanResult,
      rawResult,
      timestamp: new Date().toISOString(),
      durationMs: Number(durationMs.toFixed(3))
    };

    this.history.unshift(historyEntry);
    if (this.history.length > this.maxHistory) {
      this.history.pop();
    }

    this.emit('evaluate', historyEntry);
    this.emit('calculated', historyEntry);

    return cleanResult;
  }

  /**
   * Eliminate IEEE 754 floating point precision artifacts while preserving up to 14 significant digits
   * @param {number} val
   * @returns {number}
   */
  cleanPrecision(val) {
    if (typeof val !== 'number' || !Number.isFinite(val)) return val;
    if (Math.abs(val - Math.round(val)) < 1e-12) {
      return Math.round(val);
    }
    const str = val.toPrecision(14);
    return parseFloat(str);
  }

  /**
   * Helper to reconstruct readable expression string from tokens
   * @param {Array<Object>} tokens
   * @returns {string}
   */
  tokensToExpression(tokens) {
    if (!Array.isArray(tokens)) return '';
    return tokens.map(t => t.raw || t.value).join(' ');
  }

  // ==========================================
  // AUDIT LOG HISTORY MANAGEMENT
  // ==========================================

  /**
   * Retrieve immutable calculation history
   * @returns {Array<Object>}
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Lookup calculation entry by unique calculation ID
   * @param {string} id
   * @returns {Object|null}
   */
  getHistoryById(id) {
    return this.history.find(e => e.id === id) || null;
  }

  /**
   * Clear calculation history log
   */
  clearHistory() {
    this.history = [];
    this.emit('historyClear');
    return this;
  }
}

// =========================================================================
// BROWSER INTERACTIVE DASHBOARD MOUNTING
// =========================================================================

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    // Only mount if formula evaluator dashboard elements exist in DOM
    const formulaInput = document.getElementById('formula-input');
    if (!formulaInput) return;

    const parser = new AerospaceOrbiterFormulaParser();

    // DOM Elements
    const evalBtn = document.getElementById('eval-btn');
    const clearBtn = document.getElementById('clear-btn');
    const validateBtn = document.getElementById('validate-btn');
    const presetSelect = document.getElementById('preset-select');
    const resultVal = document.getElementById('result-value');
    const resultExprEcho = document.getElementById('result-expr-echo');
    const latencyVal = document.getElementById('latency-value');
    const rpnDisplay = document.getElementById('rpn-display');
    const errorBanner = document.getElementById('error-banner');
    const errorText = document.getElementById('error-text');
    const syntaxStatus = document.getElementById('syntax-status');
    const historyFeed = document.getElementById('history-feed');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const contrastToggle = document.getElementById('contrast-toggle');
    const resetVarsBtn = document.getElementById('reset-vars-btn');

    // Orbital Variables Input Elements
    const varControls = [
      { key: 'orbital_altitude', slider: 'slider-orbital-altitude', input: 'input-orbital-altitude' },
      { key: 'escape_velocity', slider: 'slider-escape-velocity', input: 'input-escape-velocity' },
      { key: 'delta_v', slider: 'slider-delta-v', input: 'input-delta-v' },
      { key: 'thrust_to_weight', slider: 'slider-thrust-to-weight', input: 'input-thrust-to-weight' },
      { key: 'specific_impulse', slider: 'slider-specific-impulse', input: 'input-specific-impulse' },
      { key: 'apogee', slider: 'slider-apogee', input: 'input-apogee' },
      { key: 'perigee', slider: 'slider-perigee', input: 'input-perigee' }
    ];

    // High contrast toggle
    contrastToggle?.addEventListener('click', () => {
      document.body.classList.toggle('high-contrast');
      const isHigh = document.body.classList.contains('high-contrast');
      contrastToggle.setAttribute('aria-pressed', isHigh ? 'true' : 'false');
    });

    // Populate Preset Selector
    if (presetSelect) {
      presetSelect.innerHTML = '<option value="">-- Select Standard Aerospace KPI Formula --</option>';
      AEROSPACE_FORMULA_PRESETS.forEach(preset => {
        const opt = document.createElement('option');
        opt.value = preset.formula;
        opt.textContent = `${preset.name} (${preset.category})`;
        presetSelect.appendChild(opt);
      });

      presetSelect.addEventListener('change', (e) => {
        if (e.target.value) {
          formulaInput.value = e.target.value;
          runEvaluation();
        }
      });
    }

    // Sync variables inputs & sliders
    function syncVariableControls() {
      const currentVars = parser.getVariables();
      varControls.forEach(({ key, slider, input }) => {
        const sEl = document.getElementById(slider);
        const iEl = document.getElementById(input);
        const val = currentVars[key];
        if (sEl && val !== undefined) sEl.value = val;
        if (iEl && val !== undefined) iEl.value = val;
      });
    }

    varControls.forEach(({ key, slider, input }) => {
      const sEl = document.getElementById(slider);
      const iEl = document.getElementById(input);

      sEl?.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (iEl) iEl.value = val;
        parser.setVariable(key, val);
        runEvaluation();
      });

      iEl?.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val)) {
          if (sEl) sEl.value = val;
          parser.setVariable(key, val);
          runEvaluation();
        }
      });
    });

    resetVarsBtn?.addEventListener('click', () => {
      parser.resetVariables();
      syncVariableControls();
      runEvaluation();
    });

    // Syntax Helper Pills click handler
    document.querySelectorAll('.syntax-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const insertText = pill.getAttribute('data-insert') || pill.textContent.trim();
        insertAtCursor(formulaInput, insertText);
        formulaInput.focus();
        validateExpressionSyntax();
      });
    });

    function insertAtCursor(input, textToInsert) {
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const original = input.value;
      input.value = original.slice(0, start) + textToInsert + original.slice(end);
      const newPos = start + textToInsert.length;
      input.setSelectionRange(newPos, newPos);
    }

    // Syntax Validation Indicator
    function validateExpressionSyntax() {
      const expr = formulaInput.value.trim();
      if (!expr) {
        if (syntaxStatus) {
          syntaxStatus.textContent = 'Empty Expression';
          syntaxStatus.className = 'syntax-status empty';
        }
        hideError();
        return false;
      }
      const validation = parser.validateSyntax(expr);
      if (syntaxStatus) {
        if (validation.valid) {
          syntaxStatus.textContent = 'Syntax Valid ✓';
          syntaxStatus.className = 'syntax-status valid';
          hideError();
        } else {
          syntaxStatus.textContent = 'Syntax Error ⚠';
          syntaxStatus.className = 'syntax-status invalid';
          showError(validation.error);
        }
      }
      return validation.valid;
    }

    formulaInput?.addEventListener('input', validateExpressionSyntax);

    function showError(msg) {
      if (errorBanner && errorText) {
        errorText.textContent = msg;
        errorBanner.style.display = 'flex';
      }
    }

    function hideError() {
      if (errorBanner) {
        errorBanner.style.display = 'none';
      }
    }

    // Run Evaluation
    function runEvaluation() {
      const expr = formulaInput.value.trim();
      if (!expr) {
        showError('Please enter a mathematical expression or pick a preset formula.');
        return;
      }

      try {
        const res = parser.evaluate(expr);
        hideError();

        if (resultVal) {
          resultVal.textContent = res.toLocaleString(undefined, { maximumFractionDigits: 6 });
          resultVal.classList.add('glow');
          setTimeout(() => resultVal.classList.remove('glow'), 400);
        }

        if (resultExprEcho) {
          resultExprEcho.textContent = expr;
        }

        const latestHistory = parser.getHistory()[0];
        if (latencyVal && latestHistory) {
          latencyVal.textContent = `${latestHistory.durationMs} ms`;
        }

        if (rpnDisplay && latestHistory) {
          rpnDisplay.textContent = latestHistory.rpn;
        }

        renderHistory();
      } catch (err) {
        showError(err.message);
        if (resultVal) resultVal.textContent = '---';
      }
    }

    evalBtn?.addEventListener('click', runEvaluation);
    validateBtn?.addEventListener('click', () => {
      const valid = validateExpressionSyntax();
      if (valid) {
        hideError();
      }
    });

    clearBtn?.addEventListener('click', () => {
      formulaInput.value = '';
      if (resultVal) resultVal.textContent = '---';
      if (resultExprEcho) resultExprEcho.textContent = 'Awaiting expression...';
      if (rpnDisplay) rpnDisplay.textContent = '---';
      hideError();
      validateExpressionSyntax();
    });

    // Render Calculation History Feed
    function renderHistory() {
      if (!historyFeed) return;
      const history = parser.getHistory();
      if (history.length === 0) {
        historyFeed.innerHTML = '<div class="history-empty">No calculations performed yet.</div>';
        return;
      }

      historyFeed.innerHTML = history.slice(0, 10).map(item => `
        <div class="history-item" data-id="${item.id}">
          <div class="history-item-header">
            <span class="history-id">${item.id}</span>
            <span class="history-time">${new Date(item.timestamp).toLocaleTimeString()}</span>
          </div>
          <div class="history-item-body">
            <code class="history-expr">${escapeHtml(item.expression)}</code>
            <div class="history-res">= ${item.result}</div>
          </div>
          <div class="history-actions">
            <button class="btn-history-rerun" data-expr="${escapeHtml(item.expression)}" title="Load into input">Re-evaluate</button>
          </div>
        </div>
      `).join('');

      historyFeed.querySelectorAll('.btn-history-rerun').forEach(btn => {
        btn.addEventListener('click', () => {
          formulaInput.value = btn.getAttribute('data-expr');
          runEvaluation();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      });
    }

    function escapeHtml(str) {
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    clearHistoryBtn?.addEventListener('click', () => {
      parser.clearHistory();
      renderHistory();
    });

    // Initial load
    syncVariableControls();
    formulaInput.value = 'sqrt(398600.4418 / (6371 + orbital_altitude))';
    validateExpressionSyntax();
    runEvaluation();
  });
}
