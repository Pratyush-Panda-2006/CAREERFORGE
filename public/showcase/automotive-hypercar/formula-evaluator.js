/**
 * Automotive Hypercar - Mathematical Expression Parser & Dynamic KPI Formula Calculator
 * Issue #1239 - NSoC '26 Feature Implementation
 *
 * Production-grade mathematical tokenizer, Shunting-yard RPN compiler,
 * hypercar dynamic variable injection evaluator, and calculation audit trail history logger.
 */

export const DEFAULT_HYPERCAR_VARIABLES = Object.freeze({
  engine_power_hp: 980,
  curb_weight_kg: 1420,
  drag_coefficient: 0.32,
  frontal_area_m2: 2.05,
  battery_capacity_kwh: 85.0,
  brake_regen_efficiency: 0.72,
  tire_friction_coeff: 1.25,
  pi: Math.PI,
  e: Math.E
});

export const HYPERCAR_KPI_PRESETS = Object.freeze([
  {
    id: 'power_to_weight',
    name: 'Power to Weight Ratio',
    category: 'Powertrain Performance',
    formula: '(engine_power_hp / curb_weight_kg) * 1000',
    unit: 'hp/ton',
    description: 'Power-to-weight ratio normalized per metric ton of vehicle curb weight.'
  },
  {
    id: 'drag_force_index',
    name: 'Aerodynamic Drag Force Index',
    category: 'Aerodynamics',
    formula: '0.5 * 1.225 * drag_coefficient * frontal_area_m2 * (100 ^ 2)',
    unit: 'N',
    description: 'Dynamic aerodynamic drag force resistance encountered at 100 m/s airspeed.'
  },
  {
    id: 'cornering_g_force',
    name: 'Maximum Cornering G-Force',
    category: 'Chassis & Cornering',
    formula: 'tire_friction_coeff * 0.98',
    unit: 'G',
    description: 'Peak lateral cornering acceleration threshold prior to mechanical tire breakaway.'
  },
  {
    id: 'usable_regen_energy',
    name: 'Usable Regenerative Energy',
    category: 'Powertrain & Battery',
    formula: 'battery_capacity_kwh * brake_regen_efficiency',
    unit: 'kWh',
    description: 'Effective recapture energy capacity recovered during deceleration under KERS.'
  },
  {
    id: 'acceleration_index',
    name: 'Hypercar Acceleration Index',
    category: 'Dynamic Telemetry',
    formula: '(engine_power_hp * tire_friction_coeff) / curb_weight_kg',
    unit: 'index',
    description: 'Traction-adjusted power-to-mass dynamic launch acceleration index.'
  },
  {
    id: 'kinetic_energy_top_speed',
    name: 'Kinetic Energy at Top Speed',
    category: 'Kinematics',
    formula: '0.5 * curb_weight_kg * ((350 / 3.6) ^ 2) / 1000000',
    unit: 'MJ',
    description: 'Total kinetic energy dissipated or contained at vehicle top velocity (350 km/h).'
  }
]);

const BUILTIN_FUNCTIONS = Object.freeze({
  sqrt: {
    arity: 1,
    fn: (x) => {
      if (x < 0) throw new Error(`Square root of negative number: ${x}`);
      return Math.sqrt(x);
    }
  },
  log: {
    arity: 1,
    fn: (x) => {
      if (x <= 0) throw new Error(`Logarithm of non-positive number: ${x}`);
      return Math.log10(x);
    }
  },
  ln: {
    arity: 1,
    fn: (x) => {
      if (x <= 0) throw new Error(`Natural logarithm of non-positive number: ${x}`);
      return Math.log(x);
    }
  },
  exp: {
    arity: 1,
    fn: (x) => Math.exp(x)
  },
  abs: {
    arity: 1,
    fn: (x) => Math.abs(x)
  },
  round: {
    arity: 1,
    fn: (x, decimals) => {
      if (decimals !== undefined) {
        const p = Math.max(0, Math.min(12, Math.round(decimals)));
        const factor = Math.pow(10, p);
        return Math.round(x * factor) / factor;
      }
      return Math.round(x);
    }
  },
  floor: {
    arity: 1,
    fn: (x) => Math.floor(x)
  },
  ceil: {
    arity: 1,
    fn: (x) => Math.ceil(x)
  },
  min: {
    arity: 2,
    fn: (a, b) => Math.min(a, b)
  },
  max: {
    arity: 2,
    fn: (a, b) => Math.max(a, b)
  },
  pow: {
    arity: 2,
    fn: (base, exp) => {
      const res = Math.pow(base, exp);
      if (!Number.isFinite(res)) {
        throw new Error(`Exponentiation resulted in non-finite value: pow(${base}, ${exp})`);
      }
      return res;
    }
  }
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

export class AutomotiveHypercarFormulaParser {
  /**
   * @param {Object} [options]
   * @param {Object} [options.variables] Initial custom variable overrides
   * @param {number} [options.maxHistory=100] Maximum stored audit records
   * @param {Object} [options.customFunctions] Extra user-defined functions
   */
  constructor(options = {}) {
    this.options = { ...options };
    this.variables = { ...DEFAULT_HYPERCAR_VARIABLES, ...options.variables };
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
   * Subscribe to an event ('evaluate', 'error', 'historyChange').
   * @param {string} event
   * @param {Function} listener
   * @returns {Function} Unsubscribe callback
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
   * Retrieve active variables copy
   * @returns {Object}
   */
  getVariables() {
    return { ...this.variables };
  }

  /**
   * Reset all variables to default hypercar parameters
   */
  resetVariables() {
    this.variables = { ...DEFAULT_HYPERCAR_VARIABLES };
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
   * Tokenize mathematical expression into structured tokens.
   * Handles integers, floating decimals, scientific notation, identifiers,
   * binary operators (+, -, *, /, ^, %), unary plus/minus, parentheses, and commas.
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

      // 2. Numbers: integers, decimals, scientific notation (e.g. 1.5e-3, 2.4E5, .5, 100)
      if (/\d/.test(char) || (char === '.' && i + 1 < len && /\d/.test(expr[i + 1]))) {
        const remaining = expr.slice(i);
        const numMatch = remaining.match(/^((?:[0-9]+(?:\.[0-9]*)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?)/);
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
      }

      // 3. Identifiers: function names or variables
      if (/[a-zA-Z_]/.test(char)) {
        const remaining = expr.slice(i);
        const idMatch = remaining.match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
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
      }

      // 4. Operators (+, -, *, /, ^, %)
      if (char === '+' || char === '-') {
        // Disambiguate unary vs binary:
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
   * Validate expression syntax before compilation or evaluation.
   * Checks balanced parentheses, consecutive binary operators, empty parentheses,
   * trailing/leading operators, uncalled functions, and misplaced commas.
   * 
   * @param {string} expr
   * @returns {{ valid: boolean, error?: string }}
   */
  validateSyntax(expr) {
    if (typeof expr !== 'string' || !expr.trim()) {
      return { valid: false, error: 'Expression cannot be empty' };
    }

    const trimmed = expr.trim();

    // 1. Check for empty parentheses directly
    if (/\(\s*\)/.test(trimmed)) {
      return { valid: false, error: 'Empty parentheses are not allowed' };
    }

    let tokens;
    try {
      tokens = this.tokenize(trimmed);
    } catch (err) {
      return { valid: false, error: err.message };
    }

    if (tokens.length === 0) {
      return { valid: false, error: 'Expression contains no operational tokens' };
    }

    // 2. First token checks
    const first = tokens[0];
    if (first.type === 'operator' && !first.unary) {
      return { valid: false, error: `Expression cannot start with binary operator '${first.raw}'` };
    }
    if (first.type === 'rparen') {
      return { valid: false, error: 'Expression cannot start with closing parenthesis ")"' };
    }
    if (first.type === 'comma') {
      return { valid: false, error: 'Expression cannot start with comma ","' };
    }

    // 3. Last token checks
    const last = tokens[tokens.length - 1];
    if (last.type === 'operator') {
      return { valid: false, error: `Expression cannot end with operator '${last.raw}'` };
    }
    if (last.type === 'lparen') {
      return { valid: false, error: 'Expression cannot end with unclosed opening parenthesis "("' };
    }
    if (last.type === 'comma') {
      return { valid: false, error: 'Expression cannot end with comma ","' };
    }
    if (last.type === 'function') {
      return { valid: false, error: `Function '${last.value}' must be followed by '(' and arguments` };
    }

    // 4. Sequential structural validation
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
          return { valid: false, error: 'Unbalanced parentheses: unexpected closing ")"' };
        }
      }

      if (cur.type === 'function') {
        if (!next || next.type !== 'lparen') {
          return { valid: false, error: `Function '${cur.value}' must be followed by '('` };
        }
      }

      // Check consecutive binary operators (e.g. 5 + * 3 or 10 / / 2)
      if (cur.type === 'operator' && !cur.unary) {
        if (next && next.type === 'operator' && !next.unary) {
          return {
            valid: false,
            error: `Consecutive binary operators '${cur.raw}' and '${next.raw}' are not allowed`
          };
        }
        if (next && (next.type === 'rparen' || next.type === 'comma')) {
          return {
            valid: false,
            error: `Operator '${cur.raw}' missing right-hand operand`
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
   * Convert infix tokens into Reverse Polish Notation (RPN) using Dijkstra's Shunting-yard algorithm.
   * Respects operator precedence: ^ (power) > * / % > + -
   * Correctly handles right-associativity of ^ and unary minus/plus.
   * Supports multi-argument functions via argument counting.
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
        opStack.push({ ...token, argsCount: 1 });
      } else if (token.type === 'comma') {
        // Pop operators to output until left parenthesis
        while (opStack.length > 0 && opStack[opStack.length - 1].type !== 'lparen') {
          output.push(opStack.pop());
        }
        if (opStack.length === 0) {
          throw new Error('Misplaced comma outside function arguments');
        }
        // Increment arguments count on function preceding left parenthesis
        const lparenIndex = opStack.length - 1;
        if (lparenIndex > 0 && opStack[lparenIndex - 1].type === 'function') {
          opStack[lparenIndex - 1].argsCount++;
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
   * Evaluate mathematical expression or compiled RPN with dynamic hypercar variable injection.
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
    let tokens = [];

    try {
      if (typeof tokensOrExpr === 'string') {
        originalExpr = tokensOrExpr.trim();
        const validation = this.validateSyntax(originalExpr);
        if (!validation.valid) {
          throw new Error(`Syntax error: ${validation.error}`);
        }
        tokens = this.tokenize(originalExpr);
        rpn = this.toRPN(tokens);
      } else if (Array.isArray(tokensOrExpr)) {
        tokens = tokensOrExpr;
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
                if (b === 0 || Math.abs(b) < 1e-15) {
                  throw new Error('Division by zero: denominator evaluated to zero');
                }
                stack.push(a / b);
                break;
              case '%':
                if (b === 0 || Math.abs(b) < 1e-15) {
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

          const arity = token.argsCount || token.arity || fnDef.arity || 1;
          if (stack.length < arity) {
            throw new Error(`Function '${fnName}' requires ${arity} argument(s), got ${stack.length}`);
          }

          const args = [];
          for (let k = 0; k < arity; k++) {
            args.unshift(stack.pop());
          }

          const fnResult = fnDef.fn(...args);
          if (!Number.isFinite(fnResult)) {
            throw new Error(`Function '${fnName}' evaluated to non-finite value: ${fnResult}`);
          }
          stack.push(fnResult);
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
      const calcId = `calc-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
      const historyEntry = {
        id: calcId,
        expression: originalExpr,
        rpn: rpn.map(t => t.raw || t.value).join(' '),
        tokensCount: tokens.length,
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
      this.emit('historyChange', [...this.history]);

      return cleanResult;
    } catch (err) {
      this.emit('error', {
        error: err.message,
        expression: originalExpr,
        variables: { ...this.variables, ...overrideVariables }
      });
      throw err;
    }
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

  /**
   * Format numerical result with commas and decimal limit
   * @param {number} num
   * @param {number} [decimals=4]
   * @returns {string}
   */
  formatResult(num, decimals = 4) {
    if (typeof num !== 'number' || !Number.isFinite(num)) return 'NaN';
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals
    });
  }

  // ==========================================
  // AUDIT LOG HISTORY MANAGEMENT
  // ==========================================

  /**
   * Retrieve immutable calculation history copy
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
    this.emit('historyChange', []);
    return this;
  }

  /**
   * Preset list getter
   */
  static get KPI_PRESETS() {
    return HYPERCAR_KPI_PRESETS;
  }

  getPresets() {
    return HYPERCAR_KPI_PRESETS;
  }
}

// =========================================================================
// BROWSER INTERACTIVE DASHBOARD MOUNTING
// =========================================================================

if (typeof window !== 'undefined') {
  window.AutomotiveHypercarFormulaParser = AutomotiveHypercarFormulaParser;
  window.DEFAULT_HYPERCAR_VARIABLES = DEFAULT_HYPERCAR_VARIABLES;
  window.HYPERCAR_KPI_PRESETS = HYPERCAR_KPI_PRESETS;

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      const formulaInput = document.getElementById('formula-input');
      if (!formulaInput) return; // Exit if not on formula evaluator page

      const parser = new AutomotiveHypercarFormulaParser();

      // DOM Element references
      const evalBtn = document.getElementById('eval-btn');
      const validateBtn = document.getElementById('validate-btn');
      const clearBtn = document.getElementById('clear-btn');
      const presetSelect = document.getElementById('preset-select');
      const resultFormatted = document.getElementById('result-formatted');
      const resultRaw = document.getElementById('result-raw');
      const resultTokenCount = document.getElementById('result-token-count');
      const resultLatency = document.getElementById('result-latency');
      const resultRpn = document.getElementById('result-rpn');
      const errorBanner = document.getElementById('error-banner');
      const errorText = document.getElementById('error-text');
      const syntaxBadge = document.getElementById('syntax-badge');
      const historyTableBody = document.getElementById('history-table-body');
      const clearHistoryBtn = document.getElementById('clear-history-btn');
      const contrastToggle = document.getElementById('contrast-toggle');
      const resetVarsBtn = document.getElementById('reset-vars-btn');

      // Hypercar variable definitions for sliders & inputs
      const varDefinitions = [
        { key: 'engine_power_hp', sliderId: 'slider-engine-power-hp', inputId: 'input-engine-power-hp' },
        { key: 'curb_weight_kg', sliderId: 'slider-curb-weight-kg', inputId: 'input-curb-weight-kg' },
        { key: 'drag_coefficient', sliderId: 'slider-drag-coefficient', inputId: 'input-drag-coefficient' },
        { key: 'frontal_area_m2', sliderId: 'slider-frontal-area-m2', inputId: 'input-frontal-area-m2' },
        { key: 'battery_capacity_kwh', sliderId: 'slider-battery-capacity-kwh', inputId: 'input-battery-capacity-kwh' },
        { key: 'brake_regen_efficiency', sliderId: 'slider-brake-regen-efficiency', inputId: 'input-brake-regen-efficiency' },
        { key: 'tire_friction_coeff', sliderId: 'slider-tire-friction-coeff', inputId: 'input-tire-friction-coeff' }
      ];

      // Retrieve current variable values from DOM inputs
      function getVariablesFromDOM() {
        const vars = {};
        for (const def of varDefinitions) {
          const inputEl = document.getElementById(def.inputId);
          if (inputEl) {
            vars[def.key] = parseFloat(inputEl.value) || 0;
          }
        }
        return vars;
      }

      // Synchronize range slider and number input pairs
      varDefinitions.forEach(def => {
        const sliderEl = document.getElementById(def.sliderId);
        const inputEl = document.getElementById(def.inputId);

        if (sliderEl && inputEl) {
          sliderEl.addEventListener('input', () => {
            inputEl.value = sliderEl.value;
            parser.setVariable(def.key, parseFloat(sliderEl.value) || 0);
            runEvaluation();
          });

          inputEl.addEventListener('input', () => {
            sliderEl.value = inputEl.value;
            parser.setVariable(def.key, parseFloat(inputEl.value) || 0);
            runEvaluation();
          });
        }
      });

      // Reset variables button
      resetVarsBtn?.addEventListener('click', () => {
        parser.resetVariables();
        varDefinitions.forEach(def => {
          const defaultVal = DEFAULT_HYPERCAR_VARIABLES[def.key];
          const sliderEl = document.getElementById(def.sliderId);
          const inputEl = document.getElementById(def.inputId);
          if (sliderEl) sliderEl.value = defaultVal;
          if (inputEl) inputEl.value = defaultVal;
        });
        runEvaluation();
      });

      // Populate preset dropdown
      if (presetSelect) {
        presetSelect.innerHTML = '<option value="">-- Select KPI Preset Formula --</option>';
        HYPERCAR_KPI_PRESETS.forEach(preset => {
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

      // Preset pills click handling
      document.querySelectorAll('[data-preset-formula]').forEach(btn => {
        btn.addEventListener('click', () => {
          const formula = btn.getAttribute('data-preset-formula');
          if (formula) {
            formulaInput.value = formula;
            runEvaluation();
          }
        });
      });

      // Syntax snippet injectors
      document.querySelectorAll('[data-insert]').forEach(btn => {
        btn.addEventListener('click', () => {
          const insertText = btn.getAttribute('data-insert');
          if (!insertText) return;

          const start = formulaInput.selectionStart || formulaInput.value.length;
          const end = formulaInput.selectionEnd || formulaInput.value.length;
          const current = formulaInput.value;

          formulaInput.value = current.slice(0, start) + insertText + current.slice(end);
          formulaInput.focus();
          const offset = insertText.endsWith('()') ? insertText.length - 1 : insertText.length;
          formulaInput.setSelectionRange(start + offset, start + offset);
          updateSyntaxStatus();
        });
      });

      // Update syntax badge indicator
      function updateSyntaxStatus() {
        const expr = formulaInput.value.trim();
        if (!expr) {
          if (syntaxBadge) {
            syntaxBadge.className = 'syntax-badge empty';
            syntaxBadge.textContent = 'Empty';
          }
          return;
        }

        const validation = parser.validateSyntax(expr);
        if (syntaxBadge) {
          if (validation.valid) {
            syntaxBadge.className = 'syntax-badge valid';
            syntaxBadge.textContent = '✓ Syntax Valid';
          } else {
            syntaxBadge.className = 'syntax-badge invalid';
            syntaxBadge.textContent = `⚠ ${validation.error}`;
          }
        }
      }

      // Execute evaluation and update DOM displays
      function runEvaluation() {
        const expr = formulaInput.value.trim();

        // Clear error banner
        if (errorBanner) errorBanner.style.display = 'none';

        if (!expr) {
          updateSyntaxStatus();
          return;
        }

        const validation = parser.validateSyntax(expr);
        updateSyntaxStatus();

        if (!validation.valid) {
          if (errorBanner && errorText) {
            errorText.textContent = validation.error;
            errorBanner.style.display = 'flex';
          }
          return;
        }

        const activeVars = getVariablesFromDOM();

        try {
          const tokens = parser.tokenize(expr);
          const rpn = parser.toRPN(tokens);
          const result = parser.evaluate(expr, activeVars);

          if (resultFormatted) {
            resultFormatted.textContent = parser.formatResult(result, 6);
          }
          if (resultRaw) {
            resultRaw.textContent = String(result);
          }
          if (resultTokenCount) {
            resultTokenCount.textContent = `${tokens.length} tokens`;
          }
          if (resultRpn) {
            resultRpn.textContent = rpn.map(t => t.raw || t.value).join(' ');
          }
          if (resultLatency) {
            const latest = parser.getHistory()[0];
            resultLatency.textContent = latest ? `${latest.durationMs} ms` : '< 0.5 ms';
          }
        } catch (err) {
          if (errorBanner && errorText) {
            errorText.textContent = err.message;
            errorBanner.style.display = 'flex';
          }
          if (resultFormatted) resultFormatted.textContent = 'ERROR';
        }
      }

      // Render calculation history log
      function renderHistory() {
        if (!historyTableBody) return;
        const history = parser.getHistory();

        if (history.length === 0) {
          historyTableBody.innerHTML = `
            <tr>
              <td colspan="5" class="history-empty-cell">No calculation history recorded yet.</td>
            </tr>
          `;
          return;
        }

        historyTableBody.innerHTML = history
          .map(item => `
            <tr>
              <td><span class="calc-badge">${escapeHtml(item.id)}</span></td>
              <td><span class="calc-time">${new Date(item.timestamp).toLocaleTimeString()}</span></td>
              <td><code class="calc-expr">${escapeHtml(item.expression)}</code></td>
              <td><strong class="calc-result">${parser.formatResult(item.result, 4)}</strong></td>
              <td>
                <button type="button" class="btn-restore" data-restore="${encodeURIComponent(item.expression)}" title="Load this formula into editor">
                  Load
                </button>
              </td>
            </tr>
          `)
          .join('');

        historyTableBody.querySelectorAll('.btn-restore').forEach(btn => {
          btn.addEventListener('click', () => {
            const rawFormula = decodeURIComponent(btn.getAttribute('data-restore') || '');
            formulaInput.value = rawFormula;
            runEvaluation();
          });
        });
      }

      function escapeHtml(str) {
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      }

      // Listen for history changes from parser
      parser.on('historyChange', () => {
        renderHistory();
      });

      // Clear history button
      clearHistoryBtn?.addEventListener('click', () => {
        parser.clearHistory();
      });

      // Action buttons
      evalBtn?.addEventListener('click', runEvaluation);
      validateBtn?.addEventListener('click', () => {
        const expr = formulaInput.value.trim();
        const res = parser.validateSyntax(expr);
        updateSyntaxStatus();
        if (!res.valid) {
          if (errorBanner && errorText) {
            errorText.textContent = res.error;
            errorBanner.style.display = 'flex';
          }
        } else {
          if (errorBanner) errorBanner.style.display = 'none';
        }
      });

      clearBtn?.addEventListener('click', () => {
        formulaInput.value = '';
        updateSyntaxStatus();
        if (errorBanner) errorBanner.style.display = 'none';
        if (resultFormatted) resultFormatted.textContent = '0.00';
        if (resultRaw) resultRaw.textContent = '0';
        if (resultTokenCount) resultTokenCount.textContent = '0 tokens';
        if (resultRpn) resultRpn.textContent = 'None';
        if (resultLatency) resultLatency.textContent = '0 ms';
      });

      formulaInput.addEventListener('input', () => {
        updateSyntaxStatus();
      });

      // WCAG AAA High-contrast toggle
      contrastToggle?.addEventListener('click', () => {
        document.body.classList.toggle('wcag-high-contrast');
        const isHigh = document.body.classList.contains('wcag-high-contrast');
        contrastToggle.setAttribute('aria-pressed', isHigh ? 'true' : 'false');
        contrastToggle.textContent = isHigh ? 'High Contrast: ON (AAA)' : 'High Contrast (AAA)';
      });

      // Initial run with default preset formula
      formulaInput.value = HYPERCAR_KPI_PRESETS[0].formula;
      runEvaluation();
      renderHistory();
    });
  }
}
