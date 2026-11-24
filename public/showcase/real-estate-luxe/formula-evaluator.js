/**
 * Real Estate Luxe - Mathematical Expression Parser & Dynamic KPI Formula Calculator
 * Production-grade safe mathematical expression tokenizer, Shunting-Yard RPN compiler,
 * and luxury real estate dynamic KPI evaluation engine.
 *
 * Implements Issue #1207 for Real Estate Luxe.
 */

export const DEFAULT_VARIABLES = Object.freeze({
  property_price: 1250000.00,
  monthly_rental_income: 6500.00,
  annual_operating_expenses: 18500.00,
  down_payment: 250000.00,
  annual_mortgage_debt: 48000.00,
  property_appreciation_rate: 0.045,
  closing_costs: 25000.00,
  vacancy_rate: 0.05
});

export const REAL_ESTATE_PRESETS = Object.freeze({
  'Capitalization Rate (%)': {
    name: 'Capitalization Rate (%)',
    id: 'cap_rate',
    formula: '((monthly_rental_income * 12 * (1 - vacancy_rate) - annual_operating_expenses) / property_price) * 100',
    description: 'Measures expected annual return on property asset value independent of financing.',
    unit: '%',
    category: 'Yield & Return'
  },
  'Cash-on-Cash Return (%)': {
    name: 'Cash-on-Cash Return (%)',
    id: 'cash_on_cash',
    formula: '((monthly_rental_income * 12 * (1 - vacancy_rate) - annual_operating_expenses - annual_mortgage_debt) / (down_payment + closing_costs)) * 100',
    description: 'Pre-tax cash flow return relative to total initial cash invested.',
    unit: '%',
    category: 'Yield & Return'
  },
  'Net Operating Income (NOI)': {
    name: 'Net Operating Income (NOI)',
    id: 'noi',
    formula: 'monthly_rental_income * 12 * (1 - vacancy_rate) - annual_operating_expenses',
    description: 'Effective gross rental revenue minus essential annual operating expenditures.',
    unit: '$',
    category: 'Cash Flow'
  },
  'Gross Rent Multiplier (GRM)': {
    name: 'Gross Rent Multiplier (GRM)',
    id: 'grm',
    formula: 'property_price / (monthly_rental_income * 12)',
    description: 'Ratio of luxury property acquisition price to annual gross scheduled rent.',
    unit: 'x',
    category: 'Valuation'
  },
  'Debt Service Coverage Ratio (DSCR)': {
    name: 'Debt Service Coverage Ratio (DSCR)',
    id: 'dscr',
    formula: '(monthly_rental_income * 12 * (1 - vacancy_rate) - annual_operating_expenses) / annual_mortgage_debt',
    description: 'Ability of property operating income to service annual mortgage debt payments.',
    unit: 'x',
    category: 'Risk & Leverage'
  },
  'Projected Property Equity (Year 1)': {
    name: 'Projected Property Equity (Year 1)',
    id: 'equity_y1',
    formula: 'down_payment + (property_price * property_appreciation_rate)',
    description: 'Initial equity investment plus projected first-year capital asset appreciation.',
    unit: '$',
    category: 'Wealth & Equity'
  }
});

export class RealEstateLuxeFormulaParser {
  static get DEFAULT_VARIABLES() {
    return DEFAULT_VARIABLES;
  }

  static get PRESETS() {
    return REAL_ESTATE_PRESETS;
  }

  /**
   * @param {Object} [options={}]
   * @param {'error'|'infinity'} [options.divisionByZeroGuard='error']
   * @param {number|null} [options.precision=null]
   */
  constructor(options = {}) {
    this.name = 'RealEstateLuxeFormulaParser';
    this.options = {
      divisionByZeroGuard: 'error',
      precision: null,
      ...options
    };

    // Default real estate variables
    this.defaultVariables = { ...DEFAULT_VARIABLES };

    // KPI presets
    this.presets = { ...REAL_ESTATE_PRESETS };

    // Calculation history audit log
    this.history = [];
    this.maxHistoryLength = 50;

    // Event listeners map
    this.listeners = new Map();

    // Mathematical operators with precedence and associativity
    this.operators = {
      '+': { precedence: 1, associativity: 'L', arity: 2, exec: (a, b) => a + b },
      '-': { precedence: 1, associativity: 'L', arity: 2, exec: (a, b) => a - b },
      '*': { precedence: 2, associativity: 'L', arity: 2, exec: (a, b) => a * b },
      '/': {
        precedence: 2,
        associativity: 'L',
        arity: 2,
        exec: (a, b) => {
          if (b === 0) {
            if (this.options.divisionByZeroGuard === 'infinity') {
              return a > 0 ? Infinity : (a < 0 ? -Infinity : NaN);
            }
            throw new Error('Division by zero is undefined');
          }
          return a / b;
        }
      },
      '%': {
        precedence: 2,
        associativity: 'L',
        arity: 2,
        exec: (a, b) => {
          if (b === 0) {
            if (this.options.divisionByZeroGuard === 'infinity') {
              return NaN;
            }
            throw new Error('Division by zero in modulo operation');
          }
          return a % b;
        }
      },
      '^': { precedence: 3, associativity: 'R', arity: 2, exec: (a, b) => Math.pow(a, b) },
      'u-': { precedence: 4, associativity: 'R', arity: 1, exec: (a) => -a },
      'u+': { precedence: 4, associativity: 'R', arity: 1, exec: (a) => +a }
    };

    // Built-in functions
    this.functions = {
      sqrt: {
        minArgs: 1,
        maxArgs: 1,
        exec: (x) => {
          if (x < 0) throw new Error('Square root of negative number is undefined');
          return Math.sqrt(x);
        }
      },
      log: {
        minArgs: 1,
        maxArgs: 2,
        exec: (x, base = 10) => {
          if (x <= 0) throw new Error('Logarithm of non-positive number is undefined');
          return base === 10 ? Math.log10(x) : Math.log(x) / Math.log(base);
        }
      },
      ln: {
        minArgs: 1,
        maxArgs: 1,
        exec: (x) => {
          if (x <= 0) throw new Error('Natural logarithm of non-positive number is undefined');
          return Math.log(x);
        }
      },
      log10: {
        minArgs: 1,
        maxArgs: 1,
        exec: (x) => {
          if (x <= 0) throw new Error('Base-10 logarithm of non-positive number is undefined');
          return Math.log10(x);
        }
      },
      exp: { minArgs: 1, maxArgs: 1, exec: (x) => Math.exp(x) },
      abs: { minArgs: 1, maxArgs: 1, exec: (x) => Math.abs(x) },
      min: {
        minArgs: 1,
        maxArgs: Infinity,
        exec: (...args) => {
          if (args.length === 0) throw new Error('min() requires at least one argument');
          return Math.min(...args);
        }
      },
      max: {
        minArgs: 1,
        maxArgs: Infinity,
        exec: (...args) => {
          if (args.length === 0) throw new Error('max() requires at least one argument');
          return Math.max(...args);
        }
      },
      round: {
        minArgs: 1,
        maxArgs: 2,
        exec: (x, decimals) => {
          if (decimals !== undefined) {
            const factor = Math.pow(10, decimals);
            return Math.round(x * factor) / factor;
          }
          return Math.round(x);
        }
      },
      floor: { minArgs: 1, maxArgs: 1, exec: (x) => Math.floor(x) },
      ceil: { minArgs: 1, maxArgs: 1, exec: (x) => Math.ceil(x) },
      pow: {
        minArgs: 2,
        maxArgs: 2,
        exec: (base, exp) => {
          if (base < 0 && !Number.isInteger(exp)) {
            throw new Error('Fractional power of negative base results in complex number');
          }
          return Math.pow(base, exp);
        }
      }
    };

    // Constants
    this.constants = {
      pi: Math.PI,
      PI: Math.PI,
      e: Math.E,
      E: Math.E
    };
  }

  /**
   * Subscribe to event.
   * @param {string} event
   * @param {Function} callback
   * @returns {this}
   */
  on(event, callback) {
    if (typeof callback !== 'function') return this;
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return this;
  }

  /**
   * Unsubscribe from event.
   * @param {string} event
   * @param {Function} [callback]
   * @returns {this}
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      if (callback) {
        this.listeners.get(event).delete(callback);
      } else {
        this.listeners.delete(event);
      }
    }
    return this;
  }

  /**
   * Emit an event to registered listeners.
   * @param {string} event
   * @param {...*} args
   * @returns {boolean}
   */
  emit(event, ...args) {
    if (!this.listeners.has(event)) return false;
    for (const callback of this.listeners.get(event)) {
      try {
        callback(...args);
      } catch (err) {
        console.error(`Error in event listener for "${event}":`, err);
      }
    }
    return true;
  }

  /**
   * Tokenizes mathematical expression string into numbers, variables, operators, functions, commas, and parentheses.
   * Handles integers, floats, scientific notation (e.g. 1e5, 2.5e-3), variables, and unary plus/minus.
   * @param {string} expr - Raw mathematical expression
   * @returns {Array<{ type: string, value: string|number, raw?: string, unary?: boolean }>}
   */
  tokenize(expr) {
    if (!expr || typeof expr !== 'string') return [];

    const tokens = [];
    let i = 0;
    const sanitized = expr.trim();

    while (i < sanitized.length) {
      const char = sanitized[i];

      // 1. Whitespace
      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // 2. Numbers (integers, decimals, and scientific notation e.g. 1e5, 2.5e-3, 1E+6)
      if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(sanitized[i + 1] || ''))) {
        const remaining = sanitized.slice(i);
        const match = remaining.match(/^([0-9]+(?:\.[0-9]+)?|\.[0-9]+)(?:[eE][+-]?[0-9]+)?/);
        if (match) {
          const numStr = match[0];
          tokens.push({
            type: 'number',
            value: parseFloat(numStr),
            raw: numStr
          });
          i += numStr.length;
          continue;
        }
      }

      // 3. Identifiers: Functions, Constants, or Variables
      if (/[a-zA-Z_]/.test(char)) {
        let ident = '';
        while (i < sanitized.length && /[a-zA-Z0-9_]/.test(sanitized[i])) {
          ident += sanitized[i];
          i++;
        }

        const lowerIdent = ident.toLowerCase();
        if (Object.prototype.hasOwnProperty.call(this.functions, lowerIdent)) {
          tokens.push({ type: 'function', value: lowerIdent, raw: ident });
        } else if (Object.prototype.hasOwnProperty.call(this.constants, ident)) {
          tokens.push({ type: 'number', value: this.constants[ident], raw: ident });
        } else {
          tokens.push({ type: 'variable', value: ident, raw: ident });
        }
        continue;
      }

      // 4. Commas (function argument separator)
      if (char === ',') {
        tokens.push({ type: 'comma', value: ',', raw: ',' });
        i++;
        continue;
      }

      // 5. Parentheses
      if (char === '(' || char === ')') {
        tokens.push({ type: 'paren', value: char, raw: char });
        i++;
        continue;
      }

      // 6. Operators (+, -, *, /, ^, %)
      if ('+-*/%^'.includes(char)) {
        const prevToken = tokens[tokens.length - 1];
        const isUnary =
          (char === '-' || char === '+') &&
          (!prevToken ||
            prevToken.type === 'operator' ||
            prevToken.type === 'comma' ||
            (prevToken.type === 'paren' && prevToken.value === '('));

        if (isUnary) {
          tokens.push({
            type: 'operator',
            value: char === '-' ? 'u-' : 'u+',
            raw: char,
            unary: true
          });
        } else {
          tokens.push({
            type: 'operator',
            value: char,
            raw: char,
            unary: false
          });
        }
        i++;
        continue;
      }

      throw new Error(`Unexpected character in formula: "${char}" at position ${i}`);
    }

    return tokens;
  }

  /**
   * Validates expression syntax, balanced parentheses, operator placement, and function structure.
   * @param {string} expr - Expression string
   * @returns {{ valid: boolean, error: string|null }}
   */
  validateSyntax(expr) {
    if (!expr || typeof expr !== 'string' || expr.trim().length === 0) {
      return { valid: false, error: 'Expression cannot be empty' };
    }

    let tokens;
    try {
      tokens = this.tokenize(expr);
    } catch (err) {
      return { valid: false, error: err.message };
    }

    if (tokens.length === 0) {
      return { valid: false, error: 'No valid mathematical tokens found' };
    }

    // Check parentheses balance and nesting
    let parenDepth = 0;
    for (const token of tokens) {
      if (token.value === '(') parenDepth++;
      if (token.value === ')') parenDepth--;
      if (parenDepth < 0) {
        return { valid: false, error: 'Mismatched closing parenthesis without matching opener' };
      }
    }
    if (parenDepth !== 0) {
      return { valid: false, error: 'Unclosed opening parenthesis in formula' };
    }

    // Check boundary tokens
    const first = tokens[0];
    const last = tokens[tokens.length - 1];

    if (first.type === 'operator' && !first.unary) {
      return { valid: false, error: `Expression cannot begin with operator "${first.raw || first.value}"` };
    }
    if (first.type === 'comma') {
      return { valid: false, error: 'Expression cannot begin with a comma' };
    }

    if (last.type === 'operator') {
      return { valid: false, error: `Expression cannot end with dangling operator "${last.raw || last.value}"` };
    }
    if (last.type === 'comma') {
      return { valid: false, error: 'Expression cannot end with a comma' };
    }
    if (last.type === 'function') {
      return { valid: false, error: `Function "${last.value}" must be followed by parentheses` };
    }

    // Check adjacent tokens
    for (let i = 0; i < tokens.length - 1; i++) {
      const current = tokens[i];
      const next = tokens[i + 1];

      // Two binary operators in a row
      if (current.type === 'operator' && next.type === 'operator' && !next.unary) {
        return {
          valid: false,
          error: `Consecutive operators "${current.raw || current.value}${next.raw || next.value}" are not allowed`
        };
      }

      // Binary operator directly after '('
      if (current.value === '(' && next.type === 'operator' && !next.unary) {
        return {
          valid: false,
          error: `Operator "${next.raw || next.value}" immediately following opening parenthesis`
        };
      }

      // Operator directly before ')'
      if (current.type === 'operator' && next.value === ')') {
        return {
          valid: false,
          error: `Dangling operator "${current.raw || current.value}" before closing parenthesis`
        };
      }

      // Empty parentheses ()
      if (current.value === '(' && next.value === ')') {
        return { valid: false, error: 'Empty parentheses pair "()" is invalid' };
      }

      // Function must be followed immediately by '('
      if (current.type === 'function' && next.value !== '(') {
        return { valid: false, error: `Function "${current.value}" must be followed by "("` };
      }

      // Comma placement checks
      if (current.type === 'comma' && next.type === 'comma') {
        return { valid: false, error: 'Consecutive commas are not allowed' };
      }
      if (current.value === '(' && next.type === 'comma') {
        return { valid: false, error: 'Comma immediately following opening parenthesis is invalid' };
      }
      if (current.type === 'comma' && next.value === ')') {
        return { valid: false, error: 'Dangling comma before closing parenthesis is invalid' };
      }
    }

    return { valid: true, error: null };
  }

  /**
   * Converts infix token array to Reverse Polish Notation (RPN) using Dijkstra's Shunting-Yard algorithm.
   * Respects operator precedence (BODMAS/PEMDAS), right-associative power (^), unary operators, and functions.
   * @param {Array<Object>} tokens - Infix token array
   * @returns {Array<Object>} RPN token array
   */
  toRPN(tokens) {
    if (!Array.isArray(tokens)) {
      throw new Error('toRPN expects an array of tokens');
    }

    const outputQueue = [];
    const operatorStack = [];
    const functionArgCountStack = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.type === 'number' || token.type === 'variable') {
        outputQueue.push(token);
      } else if (token.type === 'function') {
        operatorStack.push(token);
      } else if (token.type === 'comma') {
        while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].value !== '(') {
          outputQueue.push(operatorStack.pop());
        }
        if (operatorStack.length === 0) {
          throw new Error('Misplaced comma outside of function arguments');
        }
        if (functionArgCountStack.length > 0) {
          functionArgCountStack[functionArgCountStack.length - 1]++;
        }
      } else if (token.type === 'operator') {
        const op1Meta = this.operators[token.value];
        if (!op1Meta) {
          throw new Error(`Unknown operator "${token.value}"`);
        }

        while (operatorStack.length > 0) {
          const top = operatorStack[operatorStack.length - 1];
          if (top.value === '(') break;

          if (top.type === 'function') {
            outputQueue.push(operatorStack.pop());
            continue;
          }

          const op2Meta = this.operators[top.value];
          if (
            op2Meta &&
            ((op1Meta.associativity === 'L' && op1Meta.precedence <= op2Meta.precedence) ||
              (op1Meta.associativity === 'R' && op1Meta.precedence < op2Meta.precedence))
          ) {
            outputQueue.push(operatorStack.pop());
          } else {
            break;
          }
        }
        operatorStack.push(token);
      } else if (token.value === '(') {
        const prev = tokens[i - 1];
        if (prev && prev.type === 'function') {
          functionArgCountStack.push(1);
        }
        operatorStack.push(token);
      } else if (token.value === ')') {
        let foundOpener = false;
        while (operatorStack.length > 0) {
          const popped = operatorStack.pop();
          if (popped.value === '(') {
            foundOpener = true;
            break;
          }
          outputQueue.push(popped);
        }

        if (!foundOpener) {
          throw new Error('Mismatched parentheses in formula');
        }

        // If a function sits on top of operator stack, pop it into output
        if (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].type === 'function') {
          const fnToken = operatorStack.pop();
          const argCount = functionArgCountStack.length > 0 ? functionArgCountStack.pop() : 1;
          outputQueue.push({
            type: 'function',
            value: fnToken.value,
            args: argCount,
            raw: fnToken.raw
          });
        }
      }
    }

    while (operatorStack.length > 0) {
      const remaining = operatorStack.pop();
      if (remaining.value === '(' || remaining.value === ')') {
        throw new Error('Mismatched parentheses detected in operator stack');
      }
      outputQueue.push(remaining);
    }

    return outputQueue;
  }

  /**
   * Evaluates an expression or token stream with dynamic variable parameter injection.
   * Handles division by zero safely and logs calculation to audit history.
   * @param {string|Array<Object>} tokensOrExpr - Formula string or parsed tokens
   * @param {Record<string, number>} [variables={}] - Variable substitutions
   * @returns {number} Computed numerical result
   */
  evaluate(tokensOrExpr, variables = {}) {
    const calcId = `calc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const timestamp = new Date().toISOString();
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

    let tokens;
    let exprStr = '';

    try {
      if (typeof tokensOrExpr === 'string') {
        exprStr = tokensOrExpr;
        const syntax = this.validateSyntax(tokensOrExpr);
        if (!syntax.valid) {
          throw new Error(`Syntax Error: ${syntax.error}`);
        }
        tokens = this.tokenize(tokensOrExpr);
      } else if (Array.isArray(tokensOrExpr)) {
        tokens = tokensOrExpr;
        exprStr = tokens.map((t) => t.raw || t.value).join(' ');
      } else {
        throw new Error('Invalid evaluate input: expected string or token array');
      }

      const rpn = this.toRPN(tokens);
      const evalStack = [];
      const contextVars = { ...this.defaultVariables, ...variables };

      for (const token of rpn) {
        if (token.type === 'number') {
          evalStack.push(token.value);
        } else if (token.type === 'variable') {
          const varName = token.value;
          if (Object.prototype.hasOwnProperty.call(contextVars, varName)) {
            evalStack.push(Number(contextVars[varName]));
          } else if (Object.prototype.hasOwnProperty.call(this.constants, varName)) {
            evalStack.push(this.constants[varName]);
          } else {
            throw new Error(`Variable "${varName}" is undefined in parameter context`);
          }
        } else if (token.type === 'operator') {
          const opMeta = this.operators[token.value];
          if (!opMeta) {
            throw new Error(`Unsupported operator "${token.value}"`);
          }

          if (opMeta.arity === 1) {
            if (evalStack.length < 1) {
              throw new Error(`Insufficient operands for unary operator "${token.value}"`);
            }
            const a = evalStack.pop();
            evalStack.push(opMeta.exec(a));
          } else {
            if (evalStack.length < 2) {
              throw new Error(`Insufficient operands for operator "${token.value}"`);
            }
            const b = evalStack.pop();
            const a = evalStack.pop();
            evalStack.push(opMeta.exec(a, b));
          }
        } else if (token.type === 'function') {
          const fnMeta = this.functions[token.value];
          if (!fnMeta) {
            throw new Error(`Unsupported function "${token.value}"`);
          }

          const argCount = token.args !== undefined ? token.args : 1;
          if (argCount < fnMeta.minArgs || argCount > fnMeta.maxArgs) {
            throw new Error(
              `Function "${token.value}" expects between ${fnMeta.minArgs} and ${fnMeta.maxArgs} arguments, received ${argCount}`
            );
          }

          if (evalStack.length < argCount) {
            throw new Error(`Insufficient arguments for function "${token.value}"`);
          }

          const args = [];
          for (let j = 0; j < argCount; j++) {
            args.unshift(evalStack.pop());
          }

          evalStack.push(fnMeta.exec(...args));
        }
      }

      if (evalStack.length !== 1) {
        throw new Error('Malformed expression: multiple values remained on evaluation stack');
      }

      let finalResult = evalStack[0];
      if (typeof this.options.precision === 'number' && Number.isFinite(finalResult)) {
        finalResult = Number(finalResult.toFixed(this.options.precision));
      }

      const durationMs =
        (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;

      const historyEntry = {
        id: calcId,
        timestamp,
        expression: exprStr,
        variables: { ...contextVars },
        result: finalResult,
        status: 'SUCCESS',
        error: null,
        durationMs: Math.round(durationMs * 100) / 100
      };

      this.addHistory(historyEntry);
      this.emit('evaluate', historyEntry);
      this.emit('calculate', historyEntry);

      return finalResult;
    } catch (err) {
      const durationMs =
        (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;

      const historyEntry = {
        id: calcId,
        timestamp,
        expression: exprStr,
        variables: { ...variables },
        result: null,
        status: 'ERROR',
        error: err.message,
        durationMs: Math.round(durationMs * 100) / 100
      };

      this.addHistory(historyEntry);
      this.emit('error', historyEntry);
      throw err;
    }
  }

  /**
   * Internal helper to record an entry in the calculation audit log.
   * @param {Object} entry
   */
  addHistory(entry) {
    this.history.unshift(entry);
    if (this.history.length > this.maxHistoryLength) {
      this.history.pop();
    }
    this.emit('historyChange', this.history);
    this.emit('historyUpdate', this.history);
  }

  /**
   * Returns a copy of the calculation audit history.
   * @returns {Array<Object>}
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Clears the calculation audit history.
   */
  clearHistory() {
    this.history = [];
    this.emit('historyChange', this.history);
    this.emit('historyUpdate', this.history);
    this.emit('clear');
  }

  /**
   * Finds a specific calculation audit record by ID.
   * @param {string} id
   * @returns {Object|null}
   */
  getCalculationById(id) {
    return this.history.find((item) => item.id === id) || null;
  }

  /**
   * Evaluates a preset formula by preset name or ID with optional custom variable overrides.
   * @param {string} presetNameOrId
   * @param {Record<string, number>} [variables={}]
   * @returns {number}
   */
  evaluatePreset(presetNameOrId, variables = {}) {
    const preset =
      this.presets[presetNameOrId] ||
      Object.values(this.presets).find((p) => p.id === presetNameOrId);
    if (!preset) {
      throw new Error(`Unknown preset: "${presetNameOrId}"`);
    }
    return this.evaluate(preset.formula, variables);
  }

  /**
   * Connects formula evaluation engine to the interactive DOM workbench.
   * @param {HTMLElement} container
   */
  renderToDOM(container) {
    if (!container) return;

    const formulaInput = container.querySelector('#formula-input');
    const evaluateBtn = container.querySelector('#evaluate-btn');
    const clearFormulaBtn = container.querySelector('#clear-formula-btn');
    const clearHistoryBtn = container.querySelector('#clear-history-btn');
    const errorBanner = container.querySelector('#error-banner');
    const resultDisplay = container.querySelector('#kpi-result') || container.querySelector('#formatted-result');
    const rawValueDisplay = container.querySelector('#raw-value');
    const tokensDisplay = container.querySelector('#token-count') || container.querySelector('#rpn-tokens');
    const latencyDisplay = container.querySelector('#calc-latency');
    const statusDisplay = container.querySelector('#calc-status') || container.querySelector('#syntax-badge');
    const historyList = container.querySelector('#history-list');
    const presetSelect = container.querySelector('#preset-select');
    const presetPills = container.querySelectorAll('.preset-pill');
    const syntaxPills = container.querySelectorAll('.syntax-pill');

    const variableKeys = Object.keys(this.defaultVariables);

    const getVariables = () => {
      const vars = {};
      variableKeys.forEach((key) => {
        const inputEl = container.querySelector(`#input-${key}`);
        const sliderEl = container.querySelector(`#slider-${key}`);
        if (inputEl && !isNaN(parseFloat(inputEl.value))) {
          vars[key] = parseFloat(inputEl.value);
        } else if (sliderEl && !isNaN(parseFloat(sliderEl.value))) {
          vars[key] = parseFloat(sliderEl.value);
        } else {
          vars[key] = this.defaultVariables[key];
        }
      });
      return vars;
    };

    const formatCurrency = (val) => {
      return '$' + Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const updateVariableDisplays = (key, value) => {
      const valDisplay = container.querySelector(`#val-${key}`);
      if (!valDisplay) return;

      if (['property_price', 'monthly_rental_income', 'annual_operating_expenses', 'down_payment', 'annual_mortgage_debt', 'closing_costs'].includes(key)) {
        valDisplay.textContent = formatCurrency(value);
      } else if (['property_appreciation_rate', 'vacancy_rate'].includes(key)) {
        valDisplay.textContent = (value * 100).toFixed(1) + '%';
      } else {
        valDisplay.textContent = String(value);
      }
    };

    const updateCalculations = () => {
      if (!formulaInput) return;
      const formula = formulaInput.value.trim();
      const vars = getVariables();
      const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

      if (!formula) {
        if (statusDisplay) {
          statusDisplay.textContent = 'AWAITING FORMULA';
          statusDisplay.className = 'status-badge status-idle';
        }
        if (resultDisplay) resultDisplay.textContent = '--';
        if (rawValueDisplay) rawValueDisplay.textContent = '--';
        if (tokensDisplay) tokensDisplay.textContent = '0 tokens';
        if (latencyDisplay) latencyDisplay.textContent = '0.00 ms';
        if (errorBanner) {
          errorBanner.classList.add('hidden');
          errorBanner.textContent = '';
        }
        return;
      }

      try {
        const validation = this.validateSyntax(formula);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        const tokens = this.tokenize(formula);
        const res = this.evaluate(formula, vars);
        const latency = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;

        if (errorBanner) {
          errorBanner.classList.add('hidden');
          errorBanner.textContent = '';
        }

        if (resultDisplay) {
          if (typeof res === 'number') {
            // Detect if result is percentage, currency, or unitless ratio
            if (formula.includes('property_price / (monthly_rental_income * 12)') || formula.includes('annual_mortgage_debt')) {
              resultDisplay.textContent = res.toFixed(3) + 'x';
            } else if (formula.includes('* 100')) {
              resultDisplay.textContent = res.toFixed(2) + '%';
            } else if (res > 1000) {
              resultDisplay.textContent = formatCurrency(res);
            } else {
              resultDisplay.textContent = res.toLocaleString('en-US', { maximumFractionDigits: 4 });
            }
          } else {
            resultDisplay.textContent = String(res);
          }
        }

        if (rawValueDisplay) {
          rawValueDisplay.textContent = typeof res === 'number' ? res.toString() : String(res);
        }

        if (statusDisplay) {
          statusDisplay.textContent = 'VALID • EVALUATED';
          statusDisplay.className = 'status-badge status-valid';
        }

        if (tokensDisplay) {
          tokensDisplay.textContent = `${tokens.length} tokens`;
        }

        if (latencyDisplay) {
          latencyDisplay.textContent = `${latency.toFixed(2)} ms`;
        }
      } catch (err) {
        const latency = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;

        if (errorBanner) {
          errorBanner.classList.remove('hidden');
          errorBanner.textContent = err.message;
        }

        if (resultDisplay) {
          resultDisplay.textContent = 'ERROR';
        }

        if (rawValueDisplay) {
          rawValueDisplay.textContent = 'NaN';
        }

        if (statusDisplay) {
          statusDisplay.textContent = 'SYNTAX / DOMAIN ERROR';
          statusDisplay.className = 'status-badge status-error';
        }

        if (tokensDisplay) {
          tokensDisplay.textContent = 'Halted';
        }

        if (latencyDisplay) {
          latencyDisplay.textContent = `${latency.toFixed(2)} ms`;
        }
      }

      renderHistoryUI();
    };

    const renderHistoryUI = () => {
      if (!historyList) return;
      const history = this.getHistory();
      if (history.length === 0) {
        historyList.innerHTML = '<li class="history-empty">No calculations recorded in audit trail yet.</li>';
        return;
      }

      historyList.innerHTML = history
        .slice(0, 10)
        .map(
          (entry) => `
        <li class="history-item ${entry.status === 'ERROR' ? 'history-error' : ''}" data-id="${entry.id}">
          <div class="history-item-top">
            <span class="history-id">${entry.id}</span>
            <span class="history-time">${new Date(entry.timestamp).toLocaleTimeString()}</span>
            <span class="history-duration">${entry.durationMs}ms</span>
          </div>
          <div class="history-expr"><code>${entry.expression}</code></div>
          <div class="history-item-bottom">
            <span class="history-badge ${entry.status === 'SUCCESS' ? 'badge-success' : 'badge-error'}">${entry.status}</span>
            <span class="history-result">${entry.status === 'SUCCESS' ? entry.result : entry.error}</span>
            <button type="button" class="btn-replay" data-replay-id="${entry.id}" title="Replay this calculation">↺ Replay</button>
          </div>
        </li>
      `
        )
        .join('');

      // Attach replay listeners
      historyList.querySelectorAll('.btn-replay').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const targetId = btn.getAttribute('data-replay-id');
          const entry = this.getCalculationById(targetId);
          if (entry && formulaInput) {
            formulaInput.value = entry.expression;
            if (entry.variables) {
              variableKeys.forEach((key) => {
                if (entry.variables[key] !== undefined) {
                  const val = entry.variables[key];
                  const slider = container.querySelector(`#slider-${key}`);
                  const input = container.querySelector(`#input-${key}`);
                  if (slider) slider.value = val;
                  if (input) input.value = val;
                  updateVariableDisplays(key, val);
                }
              });
            }
            updateCalculations();
          }
        });
      });
    };

    // Synchronize sliders and number inputs for all variables
    variableKeys.forEach((key) => {
      const slider = container.querySelector(`#slider-${key}`);
      const input = container.querySelector(`#input-${key}`);
      const defaultValue = this.defaultVariables[key];

      if (slider) slider.value = defaultValue;
      if (input) input.value = defaultValue;
      updateVariableDisplays(key, defaultValue);

      if (slider) {
        slider.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          if (input) input.value = val;
          updateVariableDisplays(key, val);
          updateCalculations();
        });
      }

      if (input) {
        input.addEventListener('input', (e) => {
          const val = parseFloat(e.target.value);
          if (!isNaN(val)) {
            if (slider) slider.value = val;
            updateVariableDisplays(key, val);
            updateCalculations();
          }
        });
      }
    });

    // Preset dropdown selection
    if (presetSelect && formulaInput) {
      presetSelect.addEventListener('change', () => {
        if (presetSelect.value) {
          formulaInput.value = presetSelect.value;
          updateCalculations();
        }
      });
    }

    // Preset selection pills
    presetPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        const formula = pill.getAttribute('data-formula');
        if (formula && formulaInput) {
          formulaInput.value = formula;
          if (presetSelect) presetSelect.value = formula;
          updateCalculations();
        }
      });
    });

    // Syntax insertion pills
    syntaxPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        const insertText = pill.getAttribute('data-insert');
        if (insertText && formulaInput) {
          const start = formulaInput.selectionStart || formulaInput.value.length;
          const end = formulaInput.selectionEnd || formulaInput.value.length;
          const currentVal = formulaInput.value;
          formulaInput.value = currentVal.substring(0, start) + insertText + currentVal.substring(end);
          formulaInput.focus();
          const newPos = start + insertText.length;
          formulaInput.setSelectionRange(newPos, newPos);
          updateCalculations();
        }
      });
    });

    // Evaluate button
    if (evaluateBtn) {
      evaluateBtn.addEventListener('click', updateCalculations);
    }

    // Live formula typing
    if (formulaInput) {
      formulaInput.addEventListener('input', updateCalculations);
    }

    // Clear formula button
    if (clearFormulaBtn && formulaInput) {
      clearFormulaBtn.addEventListener('click', () => {
        formulaInput.value = '';
        if (presetSelect) presetSelect.selectedIndex = 0;
        updateCalculations();
        formulaInput.focus();
      });
    }

    // Clear history button
    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', () => {
        this.clearHistory();
        renderHistoryUI();
      });
    }

    // Initial evaluation
    updateCalculations();
  }
}

// Auto-mount in browser environments
if (typeof document !== 'undefined') {
  const mount = () => {
    const container = document.querySelector('.formula-evaluator-container') || document.body;
    if (container.querySelector('#formula-input')) {
      const parser = new RealEstateLuxeFormulaParser();
      parser.renderToDOM(container);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
}

export default RealEstateLuxeFormulaParser;
