/**
 * Culinary Bistro — Mathematical Expression Parser & Dynamic KPI Formula Calculator
 * Issue #1203 - High-Precision Production Grade Math Engine
 * 
 * Modular implementation featuring Shunting-yard RPN compiler, safe tokenizer,
 * dynamic culinary parameter injection, audit logging, and responsive UI workbench.
 */

export const DEFAULT_CULINARY_VARIABLES = Object.freeze({
  food_cost: 12.50,
  menu_price: 45.00,
  labor_hours: 1.2,
  hourly_wage: 18.00,
  daily_covers: 180,
  beverage_cost: 3.20,
  beverage_price: 14.00,
  overhead_daily: 650.00
});

export const CULINARY_KPI_PRESETS = Object.freeze([
  {
    id: 'food_cost_percentage',
    name: 'Food Cost Percentage (%)',
    category: 'Cost Control',
    formula: '(food_cost / menu_price) * 100',
    unit: '%',
    target: '< 30%',
    description: 'Proportion of dish price allocated to raw food ingredients.'
  },
  {
    id: 'prime_cost_ratio',
    name: 'Prime Cost Ratio (%)',
    category: 'Cost Control',
    formula: '((food_cost + (labor_hours * hourly_wage)) / menu_price) * 100',
    unit: '%',
    target: '55% - 65%',
    description: 'Total prime cost ratio (food cost + preparation labor) against menu price.'
  },
  {
    id: 'gross_contribution_margin',
    name: 'Gross Contribution Margin',
    category: 'Profitability',
    formula: 'menu_price - food_cost',
    unit: '$',
    target: '> $30.00',
    description: 'Dollar contribution margin per plate sold toward overhead and operating profit.'
  },
  {
    id: 'daily_net_profit',
    name: 'Daily Net Profit',
    category: 'Profitability',
    formula: '(daily_covers * (menu_price - food_cost + beverage_price - beverage_cost)) - overhead_daily',
    unit: '$',
    target: 'Maximized',
    description: 'Projected net daily operating profit combining food and beverage margins across covers.'
  },
  {
    id: 'revpash',
    name: 'RevPASH (Revenue Per Available Seat Hour)',
    category: 'Capacity Utilization',
    formula: '(daily_covers * menu_price) / (12 * 45)',
    unit: '$/seat-hr',
    target: '> $12.00',
    description: 'Hourly revenue generated per available bistro seat (12 service hours, 45 bistro seats).'
  },
  {
    id: 'beverage_margin_ratio',
    name: 'Beverage Margin Ratio (%)',
    category: 'Beverage Program',
    formula: '((beverage_price - beverage_cost) / beverage_price) * 100',
    unit: '%',
    target: '> 75%',
    description: 'Gross profit margin generated from wine cellar and cocktail service.'
  }
]);

export const BUILTIN_FUNCTIONS = Object.freeze({
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
  exp: { arity: 1, fn: (x) => Math.exp(x) },
  abs: { arity: 1, fn: (x) => Math.abs(x) },
  round: { arity: 1, fn: (x) => Math.round(x) },
  floor: { arity: 1, fn: (x) => Math.floor(x) },
  ceil: { arity: 1, fn: (x) => Math.ceil(x) },
  pow: {
    arity: 2,
    fn: (base, exp) => {
      const res = Math.pow(base, exp);
      if (!Number.isFinite(res)) {
        throw new Error(`Exponentiation resulted in non-finite value: pow(${base}, ${exp})`);
      }
      return res;
    }
  },
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

export class CulinaryBistroFormulaParser {
  /**
   * @param {Object} [options={}]
   * @param {Object} [options.variables] Custom initial variable overrides
   * @param {number} [options.maxHistory=100] Maximum stored calculation audit records
   * @param {Object} [options.customFunctions] Extra user-defined functions
   */
  constructor(options = {}) {
    this.options = { ...options };
    this.variables = { ...DEFAULT_CULINARY_VARIABLES, ...options.variables };
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
  // EVENT EMITTER
  // ==========================================

  /**
   * Attach an event listener
   * @param {string} event
   * @param {Function} listener
   * @returns {Function} Unsubscribe function
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
   * Detach an event listener
   * @param {string} event
   * @param {Function} listener
   */
  off(event, listener) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(listener);
    }
  }

  /**
   * Emit an event to all subscribers
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
  // VARIABLES & FUNCTIONS MANAGEMENT
  // ==========================================

  /**
   * Set or update a culinary variable
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
   * Retrieve active variables snapshot
   * @returns {Object}
   */
  getVariables() {
    return { ...this.variables };
  }

  /**
   * Reset all variables to standard bistro defaults
   */
  resetVariables() {
    this.variables = { ...DEFAULT_CULINARY_VARIABLES };
    this.emit('variablesReset', { ...this.variables });
    return this;
  }

  /**
   * Register a custom mathematical or culinary function
   * @param {string} name
   * @param {Function} fn
   * @param {number} [arity=1]
   */
  addFunction(name, fn, arity = 1) {
    if (typeof name !== 'string' || !name.trim()) {
      throw new TypeError('Function name must be a non-empty string');
    }
    if (typeof fn !== 'function') {
      throw new TypeError(`Function implementation for '${name}' must be callable`);
    }
    this.customFunctions.set(name.trim().toLowerCase(), { fn, arity });
    return this;
  }

  // ==========================================
  // TOKENIZER
  // ==========================================

  /**
   * Tokenize mathematical expression into structured tokens
   * Handles integers, floats, scientific notation, identifiers, operators,
   * unary signs, parentheses, and commas.
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

      // 1. Whitespace
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
        // Unary if at start of expression, or previous token was operator, '(', or ','
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
   * Validate expression syntax before evaluation
   * Checks balanced parentheses, consecutive operators, missing operands, empty parens, misplaced commas.
   * 
   * @param {string} expr
   * @returns {{ valid: boolean, error?: string }}
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

    // Check first token
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

    // Check last token
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
      return { valid: false, error: `Function '${last.value}' must be followed by '('` };
    }

    // Sequential structure checks
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

      // Check consecutive binary operators (e.g. 5 + * 3 or 10 / / 2)
      if (cur.type === 'operator' && !cur.unary) {
        if (next && next.type === 'operator' && !next.unary) {
          return {
            valid: false,
            error: `Consecutive binary operators '${cur.raw}' and '${next.raw}' are not allowed`
          };
        }
      }

      // Check missing operator between operands: e.g. 5 5, (2+3) 4
      if ((cur.type === 'number' || cur.type === 'variable' || cur.type === 'rparen') &&
          next && (next.type === 'number' || next.type === 'variable' || next.type === 'function' || next.type === 'lparen')) {
        return { valid: false, error: 'Missing operator between operands' };
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
   * Respects operator precedence: unary (+/-) > ^ > * / % > + -
   * Correctly handles right-associativity of ^ and unary signs, and function commas.
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
   * Evaluate mathematical expression or compiled RPN with dynamic culinary parameter injection.
   * Domain guards: division by zero, non-positive logs, negative square root, non-finite results.
   * 
   * @param {string|Array<Object>} tokensOrExpr
   * @param {Object} [overrideVariables={}]
   * @returns {number} Evaluated result
   */
  evaluate(tokensOrExpr, overrideVariables = {}) {
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    let rpn;
    let originalExpr = '';

    try {
      if (typeof tokensOrExpr === 'string') {
        originalExpr = tokensOrExpr.trim();
        const validation = this.validateSyntax(originalExpr);
        if (!validation.valid) {
          throw new Error(`Syntax error: ${validation.error}`);
        }
        const tokens = this.tokenize(originalExpr);
        rpn = this.toRPN(tokens);
      } else if (Array.isArray(tokensOrExpr)) {
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
            if (varName.toLowerCase() === 'pi') resolvedVal = Math.PI;
            else if (varName.toLowerCase() === 'e') resolvedVal = Math.E;
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

      // Audit log entry
      const calcId = `calc-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const historyEntry = {
        id: calcId,
        expression: originalExpr,
        rpn: rpn.map(t => t.raw || t.value).join(' '),
        variables: { ...vars },
        result: cleanResult,
        rawResult,
        formattedResult: this.formatNumber(cleanResult),
        timestamp: new Date().toISOString(),
        durationMs: Number(durationMs.toFixed(3))
      };

      this.history.unshift(historyEntry);
      if (this.history.length > this.maxHistory) {
        this.history.pop();
      }

      this.emit('evaluate', historyEntry);
      this.emit('calculated', historyEntry);
      this.emit('historyChange', this.getHistory());

      return cleanResult;
    } catch (err) {
      this.emit('error', err);
      throw err;
    }
  }

  /**
   * Eliminate IEEE 754 precision artifacts while preserving up to 14 significant digits
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
   * Format number for display
   * @param {number} val
   * @returns {string}
   */
  formatNumber(val) {
    if (typeof val !== 'number' || !Number.isFinite(val)) return String(val);
    return val.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    });
  }

  /**
   * Reconstruct readable expression string from tokens
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
   * Retrieve immutable calculation history copy
   * @returns {Array<Object>}
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Find audit record by calculation ID
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
    this.emit('historyChange', []);
    return this;
  }
}

// =========================================================================
// BROWSER INTERACTIVE WORKBENCH MOUNTING
// =========================================================================

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    const formulaInput = document.getElementById('formula-input');
    if (!formulaInput) return;

    const parser = new CulinaryBistroFormulaParser();

    // Attach to window for external accessibility or console debugging
    window.culinaryBistroParser = parser;

    // DOM Controls
    const evalBtn = document.getElementById('eval-btn');
    const clearBtn = document.getElementById('clear-btn');
    const presetSelect = document.getElementById('preset-select');
    const presetDescription = document.getElementById('preset-description');
    const resultDisplay = document.getElementById('result-display');
    const rawResultDisplay = document.getElementById('raw-result-display');
    const tokenCountDisplay = document.getElementById('token-count-display');
    const evalLatencyDisplay = document.getElementById('eval-latency-display');
    const tokenStream = document.getElementById('token-stream');
    const rpnStream = document.getElementById('rpn-stream');
    const syntaxBadge = document.getElementById('syntax-badge');
    const errorBanner = document.getElementById('error-banner');
    const errorText = document.getElementById('error-text');
    const historyList = document.getElementById('history-list');
    const historyEmpty = document.getElementById('history-empty');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const contrastToggle = document.getElementById('contrast-toggle') || document.getElementById('high-contrast-toggle');
    const resetVarsBtn = document.getElementById('reset-vars-btn');

    // 8 Culinary Variable Controls
    const culinaryVarKeys = [
      'food_cost',
      'menu_price',
      'labor_hours',
      'hourly_wage',
      'daily_covers',
      'beverage_cost',
      'beverage_price',
      'overhead_daily'
    ];

    // High Contrast Mode Toggle
    if (contrastToggle) {
      contrastToggle.addEventListener('click', () => {
        document.body.classList.toggle('wcag-high-contrast');
        document.body.classList.toggle('high-contrast');
        const isHigh = document.body.classList.contains('wcag-high-contrast');
        contrastToggle.setAttribute('aria-pressed', isHigh ? 'true' : 'false');
      });
    }

    // Populate Preset Selector
    if (presetSelect) {
      presetSelect.innerHTML = '<option value="">-- Choose Culinary KPI Preset --</option>';
      CULINARY_KPI_PRESETS.forEach(preset => {
        const opt = document.createElement('option');
        opt.value = preset.id;
        opt.textContent = `${preset.name} (${preset.category})`;
        presetSelect.appendChild(opt);
      });

      presetSelect.addEventListener('change', (e) => {
        const presetId = e.target.value;
        const preset = CULINARY_KPI_PRESETS.find(p => p.id === presetId);
        if (preset) {
          formulaInput.value = preset.formula;
          if (presetDescription) {
            presetDescription.textContent = `${preset.name} [Target: ${preset.target}]: ${preset.description}`;
          }
          updateSyntax();
          runEvaluation();
        }
      });
    }

    // Quick-select preset pills
    document.querySelectorAll('.preset-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const presetId = btn.getAttribute('data-preset-id');
        const preset = CULINARY_KPI_PRESETS.find(p => p.id === presetId);
        if (preset) {
          formulaInput.value = preset.formula;
          if (presetSelect) presetSelect.value = preset.id;
          if (presetDescription) {
            presetDescription.textContent = `${preset.name} [Target: ${preset.target}]: ${preset.description}`;
          }
          updateSyntax();
          runEvaluation();
        }
      });
    });

    // Synchronize variable inputs and sliders
    function syncVariableUI() {
      const vars = parser.getVariables();
      culinaryVarKeys.forEach(key => {
        const sEl = document.querySelector(`.var-slider[data-var="${key}"]`);
        const iEl = document.querySelector(`.var-input[data-var="${key}"]`);
        const val = vars[key];
        if (sEl && val !== undefined) sEl.value = val;
        if (iEl && val !== undefined) iEl.value = val;
      });
    }

    culinaryVarKeys.forEach(key => {
      const sEl = document.querySelector(`.var-slider[data-var="${key}"]`);
      const iEl = document.querySelector(`.var-input[data-var="${key}"]`);

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
      syncVariableUI();
      runEvaluation();
    });

    // Operator and function insert pills
    document.querySelectorAll('.syntax-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        const insertText = pill.getAttribute('data-insert') || pill.textContent.trim();
        insertAtCursor(formulaInput, insertText);
        formulaInput.focus();
        updateSyntax();
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

    // Syntax validation
    function updateSyntax() {
      const expr = formulaInput.value.trim();
      if (!expr) {
        if (syntaxBadge) {
          syntaxBadge.textContent = 'Empty Expression';
          syntaxBadge.className = 'syntax-badge empty';
        }
        hideError();
        return { valid: false, error: 'Empty' };
      }
      const validation = parser.validateSyntax(expr);
      if (syntaxBadge) {
        if (validation.valid) {
          syntaxBadge.textContent = 'Valid Syntax ✓';
          syntaxBadge.className = 'syntax-badge valid';
          hideError();
        } else {
          syntaxBadge.textContent = 'Syntax Error ⚠';
          syntaxBadge.className = 'syntax-badge invalid';
          showError(validation.error);
        }
      }
      return validation;
    }

    formulaInput.addEventListener('input', updateSyntax);

    function showError(msg) {
      if (errorBanner) {
        errorBanner.style.display = 'flex';
        if (errorText) errorText.textContent = msg;
      }
    }

    function hideError() {
      if (errorBanner) {
        errorBanner.style.display = 'none';
      }
    }

    // Run evaluation
    function runEvaluation() {
      const expr = formulaInput.value.trim();
      if (!expr) {
        if (resultDisplay) resultDisplay.textContent = '--';
        if (rawResultDisplay) rawResultDisplay.textContent = '--';
        if (tokenCountDisplay) tokenCountDisplay.textContent = '0 tokens';
        if (evalLatencyDisplay) evalLatencyDisplay.textContent = '0.00 ms';
        if (tokenStream) tokenStream.textContent = '';
        if (rpnStream) rpnStream.textContent = '';
        return;
      }

      const syntax = updateSyntax();
      if (!syntax.valid) {
        showError(syntax.error);
        if (resultDisplay) resultDisplay.textContent = '--';
        if (rawResultDisplay) rawResultDisplay.textContent = '--';
        return;
      }

      try {
        const tokens = parser.tokenize(expr);
        if (tokenCountDisplay) {
          tokenCountDisplay.textContent = `${tokens.length} token${tokens.length === 1 ? '' : 's'}`;
        }
        if (tokenStream) {
          tokenStream.textContent = tokens.map(t => `[${t.type}:${t.value}]`).join(' ');
        }

        const rpn = parser.toRPN(tokens);
        if (rpnStream) {
          rpnStream.textContent = rpn.map(t => t.raw || t.value).join(' ');
        }

        const res = parser.evaluate(expr);
        hideError();

        if (resultDisplay) {
          resultDisplay.textContent = parser.formatNumber(res);
          resultDisplay.classList.add('glow');
          setTimeout(() => resultDisplay.classList.remove('glow'), 400);
        }

        if (rawResultDisplay) {
          rawResultDisplay.textContent = String(res);
        }

        const latest = parser.getHistory()[0];
        if (evalLatencyDisplay && latest) {
          evalLatencyDisplay.textContent = `${latest.durationMs} ms`;
        }
      } catch (err) {
        showError(err.message);
        if (resultDisplay) resultDisplay.textContent = '--';
        if (rawResultDisplay) rawResultDisplay.textContent = '--';
      }
    }

    evalBtn?.addEventListener('click', runEvaluation);

    clearBtn?.addEventListener('click', () => {
      formulaInput.value = '';
      if (resultDisplay) resultDisplay.textContent = '--';
      if (rawResultDisplay) rawResultDisplay.textContent = '--';
      if (tokenCountDisplay) tokenCountDisplay.textContent = '0 tokens';
      if (evalLatencyDisplay) evalLatencyDisplay.textContent = '0.00 ms';
      if (tokenStream) tokenStream.textContent = '';
      if (rpnStream) rpnStream.textContent = '';
      hideError();
      updateSyntax();
    });

    // History rendering
    function renderHistory(history) {
      if (!historyList) return;
      if (!history || history.length === 0) {
        if (historyEmpty) historyEmpty.style.display = 'block';
        historyList.innerHTML = '';
        return;
      }

      if (historyEmpty) historyEmpty.style.display = 'none';

      historyList.innerHTML = history.slice(0, 15).map(item => `
        <div class="history-item" data-id="${item.id}">
          <div class="history-meta">
            <span class="history-id">${item.id}</span>
            <span class="history-time">${new Date(item.timestamp).toLocaleTimeString()}</span>
            <span class="history-duration">${item.durationMs} ms</span>
          </div>
          <div class="history-expr"><code>${escapeHtml(item.expression)}</code></div>
          <div class="history-result-row">
            <span class="history-val">= ${item.formattedResult}</span>
            <button type="button" class="history-replay-btn" data-expr="${encodeURIComponent(item.expression)}">Load Expression</button>
          </div>
        </div>
      `).join('');

      historyList.querySelectorAll('.history-replay-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const raw = decodeURIComponent(e.target.getAttribute('data-expr') || '');
          if (raw) {
            formulaInput.value = raw;
            updateSyntax();
            runEvaluation();
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        });
      });
    }

    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    clearHistoryBtn?.addEventListener('click', () => {
      parser.clearHistory();
    });

    parser.on('historyChange', (history) => {
      renderHistory(history);
    });

    // Initial setup
    syncVariableUI();
    const defaultPreset = CULINARY_KPI_PRESETS[0];
    if (presetSelect) presetSelect.value = defaultPreset.id;
    if (presetDescription) {
      presetDescription.textContent = `${defaultPreset.name} [Target: ${defaultPreset.target}]: ${defaultPreset.description}`;
    }
    formulaInput.value = defaultPreset.formula;
    updateSyntax();
    runEvaluation();
  });
}

// Window attachment for browser global consumption
if (typeof window !== 'undefined') {
  window.CulinaryBistroFormulaParser = CulinaryBistroFormulaParser;
  window.DEFAULT_CULINARY_VARIABLES = DEFAULT_CULINARY_VARIABLES;
  window.CULINARY_KPI_PRESETS = CULINARY_KPI_PRESETS;
}

export default CulinaryBistroFormulaParser;
