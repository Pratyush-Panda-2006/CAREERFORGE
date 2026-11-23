/**
 * E-Commerce Store - Mathematical Expression Parser & Dynamic KPI Formula Calculator
 * Safe in-browser mathematical expression tokenizer and evaluator supporting
 * operator precedence (BODMAS/PEMDAS), Shunting-Yard RPN compilation,
 * variable parameter injection, dynamic KPI presets, and division-by-zero guards.
 */

export const DEFAULT_ECOMMERCE_VARIABLES = {
  product_price: 49.99,
  discount_rate: 0.15,
  tax_rate: 0.08,
  shipping_fee: 5.99,
  quantity: 3,
  customer_acquisition_cost: 18.50,
  average_order_value: 85.00,
  conversion_rate: 0.035,
  gross_margin_rate: 0.42,
  churn_rate: 0.05
};

export const ECOMMERCE_KPI_PRESETS = {
  order_total: {
    id: 'order_total',
    name: 'Order Total',
    formula: '(product_price * quantity * (1 - discount_rate) * (1 + tax_rate)) + shipping_fee',
    description: 'Calculates the final checkout total including discounts, sales tax, and shipping fee.'
  },
  clv: {
    id: 'clv',
    name: 'Customer Lifetime Value (CLV)',
    formula: '(average_order_value * gross_margin_rate) / churn_rate',
    description: 'Projects the net gross profit contribution per customer across their entire relationship.'
  },
  breakeven_roas: {
    id: 'breakeven_roas',
    name: 'Break-Even ROAS',
    formula: 'average_order_value / customer_acquisition_cost',
    description: 'Calculates the target Return On Ad Spend required to break even against acquisition costs.'
  },
  gross_profit: {
    id: 'gross_profit',
    name: 'Gross Profit',
    formula: '(product_price * quantity * (1 - discount_rate)) * gross_margin_rate',
    description: 'Measures net product revenue after discounts multiplied by the gross margin percentage.'
  },
  revenue_per_visitor: {
    id: 'revenue_per_visitor',
    name: 'Revenue Per Visitor',
    formula: 'conversion_rate * average_order_value',
    description: 'Estimates expected top-line revenue earned from each unique store visit.'
  },
  discount_savings: {
    id: 'discount_savings',
    name: 'Discount Savings',
    formula: 'product_price * quantity * discount_rate',
    description: 'Calculates the total monetary discount deduction granted across ordered quantities.'
  }
};

export class EcommerceStoreFormulaParser {
  constructor(initialVariables = {}) {
    this.name = 'EcommerceStoreFormulaParser';
    this.defaultVariables = { ...DEFAULT_ECOMMERCE_VARIABLES };
    this.variables = { ...this.defaultVariables, ...initialVariables };
    this.presets = { ...ECOMMERCE_KPI_PRESETS };
    this.history = [];
    this.listeners = {};

    this.operators = {
      '+': { precedence: 2, associativity: 'L', unary: false, exec: (a, b) => a + b },
      '-': { precedence: 2, associativity: 'L', unary: false, exec: (a, b) => a - b },
      '*': { precedence: 3, associativity: 'L', unary: false, exec: (a, b) => a * b },
      '/': {
        precedence: 3,
        associativity: 'L',
        unary: false,
        exec: (a, b) => {
          if (b === 0) throw new Error('Division by zero is undefined');
          return a / b;
        }
      },
      '%': {
        precedence: 3,
        associativity: 'L',
        unary: false,
        exec: (a, b) => {
          if (b === 0) throw new Error('Division by zero in modulo operation');
          return a % b;
        }
      },
      '^': { precedence: 4, associativity: 'R', unary: false, exec: (a, b) => Math.pow(a, b) },
      'u-': { precedence: 5, associativity: 'R', unary: true, exec: (a) => -a },
      'u+': { precedence: 5, associativity: 'R', unary: true, exec: (a) => +a }
    };

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
        exec: (x, base) => {
          if (x <= 0) throw new Error('Logarithm of non-positive number is undefined');
          if (base !== undefined) {
            if (base <= 0 || base === 1) throw new Error('Logarithm base must be positive and not equal to 1');
            return Math.log(x) / Math.log(base);
          }
          return Math.log10(x);
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
      exp: {
        minArgs: 1,
        maxArgs: 1,
        exec: (x) => Math.exp(x)
      },
      abs: {
        minArgs: 1,
        maxArgs: 1,
        exec: (x) => Math.abs(x)
      },
      min: {
        minArgs: 1,
        maxArgs: 99,
        exec: (...args) => {
          if (args.length === 0) throw new Error('Function "min" requires at least 1 argument');
          return Math.min(...args);
        }
      },
      max: {
        minArgs: 1,
        maxArgs: 99,
        exec: (...args) => {
          if (args.length === 0) throw new Error('Function "max" requires at least 1 argument');
          return Math.max(...args);
        }
      },
      round: {
        minArgs: 1,
        maxArgs: 2,
        exec: (x, decimals) => {
          if (decimals !== undefined) {
            const factor = Math.pow(10, Math.floor(decimals));
            return Math.round(x * factor) / factor;
          }
          return Math.round(x);
        }
      },
      floor: {
        minArgs: 1,
        maxArgs: 1,
        exec: (x) => Math.floor(x)
      },
      ceil: {
        minArgs: 1,
        maxArgs: 1,
        exec: (x) => Math.ceil(x)
      },
      pow: {
        minArgs: 2,
        maxArgs: 2,
        exec: (base, exponent) => Math.pow(base, exponent)
      }
    };
  }

  // --- Event Emitter ---
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
  }

  emit(event, ...args) {
    if (!this.listeners[event]) return;
    for (const callback of [...this.listeners[event]]) {
      try {
        callback(...args);
      } catch (err) {
        console.error(`Error in event listener for ${event}:`, err);
      }
    }
  }

  // --- Variable State Management ---
  setVariable(name, value) {
    this.variables[name] = Number(value);
  }

  setVariables(vars) {
    Object.assign(this.variables, vars);
  }

  getVariable(name) {
    return this.variables[name];
  }

  getVariables() {
    return { ...this.variables };
  }

  resetVariables() {
    this.variables = { ...this.defaultVariables };
    return this.getVariables();
  }

  // --- Presets ---
  getPresets() {
    return { ...this.presets };
  }

  getPreset(key) {
    return this.presets[key] || null;
  }

  // --- Tokenizer ---
  /**
   * Tokenizes mathematical expression string into numbers, variables, functions, operators, and delimiters.
   * @param {string} expr - Raw mathematical string
   * @returns {Array<{ type: string, value: string|number, raw?: string }>}
   */
  tokenize(expr) {
    if (!expr || typeof expr !== 'string') return [];

    const tokens = [];
    let i = 0;
    const sanitized = expr.trim();
    const numRegex = /^([0-9]+(\.[0-9]*)?|\.[0-9]+)([eE][+-]?[0-9]+)?/;
    const identRegex = /^[a-zA-Z_][a-zA-Z0-9_]*/;

    while (i < sanitized.length) {
      const char = sanitized[i];

      // Whitespace
      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // Numbers (integers, floats, scientific notation like 1e-3, 2.5E4)
      if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(sanitized[i + 1] || ''))) {
        const remaining = sanitized.slice(i);
        const match = remaining.match(numRegex);
        if (match) {
          const numStr = match[0];
          tokens.push({ type: 'number', value: parseFloat(numStr), raw: numStr });
          i += numStr.length;
          continue;
        }
      }

      // Identifiers: Functions or Variables
      if (/[a-zA-Z_]/.test(char)) {
        const remaining = sanitized.slice(i);
        const match = remaining.match(identRegex);
        if (match) {
          const ident = match[0];
          const lower = ident.toLowerCase();
          if (this.functions[lower]) {
            tokens.push({ type: 'function', value: lower });
          } else {
            tokens.push({ type: 'variable', value: ident });
          }
          i += ident.length;
          continue;
        }
      }

      // Comma
      if (char === ',') {
        tokens.push({ type: 'comma', value: ',' });
        i++;
        continue;
      }

      // Parentheses
      if (char === '(' || char === ')') {
        tokens.push({ type: 'paren', value: char });
        i++;
        continue;
      }

      // Operators (+, -, *, /, %, ^)
      if ('+-*/%^'.includes(char)) {
        const prevToken = tokens[tokens.length - 1];
        // Detect unary plus/minus
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
            unary: true
          });
        } else {
          tokens.push({
            type: 'operator',
            value: char,
            unary: false
          });
        }
        i++;
        continue;
      }

      throw new Error(`Unexpected character in formula: "${char}" at index ${i}`);
    }

    return tokens;
  }

  // --- Syntax Validation ---
  /**
   * Validates expression syntax, operator placement, parentheses balance, and function signatures.
   * @param {string} expr - Expression string
   * @returns {{ valid: boolean, isValid: boolean, error: string | null }}
   */
  validateSyntax(expr) {
    if (!expr || typeof expr !== 'string' || expr.trim().length === 0) {
      return { valid: false, isValid: false, error: 'Expression cannot be empty' };
    }

    let tokens;
    try {
      tokens = this.tokenize(expr);
    } catch (err) {
      return { valid: false, isValid: false, error: err.message };
    }

    if (tokens.length === 0) {
      return { valid: false, isValid: false, error: 'No valid mathematical tokens found' };
    }

    // Check parentheses balance and empty parens
    let parenDepth = 0;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token.value === '(') {
        parenDepth++;
        if (i + 1 < tokens.length && tokens[i + 1].value === ')') {
          return { valid: false, isValid: false, error: 'Empty parentheses pair "()" is invalid' };
        }
      }
      if (token.value === ')') {
        parenDepth--;
        if (parenDepth < 0) {
          return { valid: false, isValid: false, error: 'Mismatched closing parenthesis without matching opener' };
        }
      }
    }
    if (parenDepth !== 0) {
      return { valid: false, isValid: false, error: 'Unclosed opening parenthesis in formula' };
    }

    // Check first token
    const first = tokens[0];
    if (first.type === 'operator' && !first.value.startsWith('u')) {
      return { valid: false, isValid: false, error: `Expression cannot begin with operator "${first.value}"` };
    }
    if (first.type === 'comma') {
      return { valid: false, isValid: false, error: 'Expression cannot begin with a comma' };
    }

    // Check last token
    const last = tokens[tokens.length - 1];
    if (last.type === 'operator') {
      return { valid: false, isValid: false, error: `Expression cannot end with dangling operator "${last.value}"` };
    }
    if (last.type === 'comma') {
      return { valid: false, isValid: false, error: 'Expression cannot end with a dangling comma' };
    }
    if (last.type === 'function') {
      return { valid: false, isValid: false, error: `Function "${last.value}" must be followed by parentheses` };
    }

    // Check adjacent tokens
    for (let i = 0; i < tokens.length - 1; i++) {
      const cur = tokens[i];
      const next = tokens[i + 1];

      // Functions must be followed immediately by '('
      if (cur.type === 'function' && next.value !== '(') {
        return { valid: false, isValid: false, error: `Function "${cur.value}" must be followed by "("` };
      }

      // Consecutive operators
      if (cur.type === 'operator' && next.type === 'operator') {
        if (next.unary) {
          if (cur.unary) {
            return {
              valid: false,
              isValid: false,
              error: `Consecutive unary operators "${cur.value}${next.value}" are not allowed`
            };
          }
        } else {
          return {
            valid: false,
            isValid: false,
            error: `Consecutive operators "${cur.value}${next.value}" are not allowed`
          };
        }
      }

      // Operator following opening parenthesis
      if (cur.value === '(' && next.type === 'operator' && !next.unary) {
        return {
          valid: false,
          isValid: false,
          error: `Operator "${next.value}" immediately following opening parenthesis`
        };
      }

      // Dangling operator before closing parenthesis
      if (cur.type === 'operator' && next.value === ')') {
        return {
          valid: false,
          isValid: false,
          error: `Dangling operator "${cur.value}" before closing parenthesis`
        };
      }

      // Adjacent operands without operator: number followed by number, variable, or function
      if (
        (cur.type === 'number' || cur.type === 'variable') &&
        (next.type === 'number' || next.type === 'variable' || next.type === 'function')
      ) {
        return {
          valid: false,
          isValid: false,
          error: `Missing operator between adjacent operands "${cur.value}" and "${next.value}"`
        };
      }

      // Closing paren followed by operand
      if (cur.value === ')' && (next.type === 'number' || next.type === 'variable' || next.type === 'function' || next.value === '(')) {
        return {
          valid: false,
          isValid: false,
          error: `Missing operator after closing parenthesis before "${next.value}"`
        };
      }

      // Comma checks
      if (cur.type === 'comma' && next.type === 'comma') {
        return { valid: false, isValid: false, error: 'Consecutive commas are not allowed' };
      }
      if (cur.value === '(' && next.type === 'comma') {
        return { valid: false, isValid: false, error: 'Comma immediately following opening parenthesis' };
      }
      if (cur.type === 'comma' && next.value === ')') {
        return { valid: false, isValid: false, error: 'Dangling comma before closing parenthesis' };
      }
    }

    return { valid: true, isValid: true, error: null };
  }

  // --- Shunting-Yard RPN Compiler ---
  /**
   * Converts infix token stream to Reverse Polish Notation (RPN).
   * @param {Array<object>} tokens
   * @returns {Array<object>}
   */
  toRPN(tokens) {
    const outputQueue = [];
    const operatorStack = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.type === 'number' || token.type === 'variable') {
        outputQueue.push(token);
      } else if (token.type === 'function') {
        operatorStack.push(token);
      } else if (token.type === 'comma') {
        let foundParen = false;
        while (operatorStack.length > 0) {
          const top = operatorStack[operatorStack.length - 1];
          if (top.value === '(') {
            foundParen = true;
            if (top.isFunctionParen) {
              top.argCount = (top.argCount || 1) + 1;
            }
            break;
          }
          outputQueue.push(operatorStack.pop());
        }
        if (!foundParen) {
          throw new Error('Misplaced comma outside of function arguments');
        }
      } else if (token.type === 'operator') {
        const op1 = token.value;
        const op1Meta = this.operators[op1];
        if (!op1Meta) {
          throw new Error(`Unknown operator "${op1}"`);
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
            (op1Meta.associativity === 'L' && op1Meta.precedence <= op2Meta.precedence) ||
            (op1Meta.associativity === 'R' && op1Meta.precedence < op2Meta.precedence)
          ) {
            outputQueue.push(operatorStack.pop());
          } else {
            break;
          }
        }
        operatorStack.push(token);
      } else if (token.value === '(') {
        const prev = i > 0 ? tokens[i - 1] : null;
        const isFunc = prev && prev.type === 'function';
        const next = i + 1 < tokens.length ? tokens[i + 1] : null;
        const parenToken = {
          type: 'paren',
          value: '(',
          isFunctionParen: isFunc,
          argCount: isFunc ? (next && next.value === ')' ? 0 : 1) : 0
        };
        operatorStack.push(parenToken);
      } else if (token.value === ')') {
        let foundOpener = false;
        let parenToken = null;

        while (operatorStack.length > 0) {
          const popped = operatorStack.pop();
          if (popped.value === '(') {
            foundOpener = true;
            parenToken = popped;
            break;
          }
          outputQueue.push(popped);
        }

        if (!foundOpener) {
          throw new Error('Mismatched parentheses in formula');
        }

        // If matching paren was for a function call, pop the function
        if (parenToken && parenToken.isFunctionParen) {
          if (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].type === 'function') {
            const funcToken = operatorStack.pop();
            funcToken.argCount = parenToken.argCount;
            outputQueue.push(funcToken);
          }
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

  // --- Expression Evaluator ---
  /**
   * Evaluates token stream or expression string with variable substitution and error boundaries.
   * @param {string|Array<object>} input - Expression string or token array
   * @param {Record<string, number>} [customVariables={}] - Variable substitutions
   * @returns {number} Computed numerical result
   */
  evaluate(input, customVariables = {}) {
    const startTime = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();

    const context = {
      ...this.defaultVariables,
      ...this.variables,
      ...customVariables
    };

    let tokens;
    let formulaStr = '';
    if (typeof input === 'string') {
      formulaStr = input.trim();
      const syntax = this.validateSyntax(formulaStr);
      if (!syntax.isValid) {
        const err = new Error(`Syntax Error: ${syntax.error}`);
        this.emit('error', {
          error: err.message,
          expression: formulaStr,
          variables: context,
          timestamp: Date.now()
        });
        throw err;
      }
      tokens = this.tokenize(formulaStr);
    } else if (Array.isArray(input)) {
      tokens = input;
      formulaStr = tokens.map((t) => (t.raw !== undefined ? t.raw : t.value)).join(' ');
    } else {
      const err = new Error('Invalid evaluate input: expected string or token array');
      this.emit('error', { error: err.message, timestamp: Date.now() });
      throw err;
    }

    try {
      const rpn = this.toRPN(tokens);
      const evalStack = [];

      for (const token of rpn) {
        if (token.type === 'number') {
          evalStack.push(token.value);
        } else if (token.type === 'variable') {
          const varName = token.value;
          if (Object.prototype.hasOwnProperty.call(context, varName)) {
            const val = Number(context[varName]);
            if (isNaN(val)) {
              throw new Error(`Variable "${varName}" evaluates to NaN`);
            }
            evalStack.push(val);
          } else {
            throw new Error(`Variable "${varName}" is undefined in parameter context`);
          }
        } else if (token.type === 'operator') {
          const opMeta = this.operators[token.value];
          if (!opMeta) throw new Error(`Unknown operator "${token.value}"`);

          if (opMeta.unary) {
            if (evalStack.length < 1) {
              throw new Error(`Insufficient operands for unary operator "${token.value}"`);
            }
            const a = evalStack.pop();
            evalStack.push(opMeta.exec(a));
          } else {
            if (evalStack.length < 2) {
              throw new Error(`Malformed expression: insufficient operands for operator "${token.value}"`);
            }
            const b = evalStack.pop();
            const a = evalStack.pop();
            evalStack.push(opMeta.exec(a, b));
          }
        } else if (token.type === 'function') {
          const funcMeta = this.functions[token.value];
          if (!funcMeta) throw new Error(`Unknown function "${token.value}"`);

          const argCount = token.argCount !== undefined ? token.argCount : funcMeta.minArgs || 1;
          if (argCount < funcMeta.minArgs || (funcMeta.maxArgs && argCount > funcMeta.maxArgs)) {
            throw new Error(`Function "${token.value}" expects between ${funcMeta.minArgs} and ${funcMeta.maxArgs || 'any'} arguments, but received ${argCount}`);
          }
          if (evalStack.length < argCount) {
            throw new Error(`Insufficient operands on stack for function "${token.value}"`);
          }

          const args = [];
          for (let i = 0; i < argCount; i++) {
            args.unshift(evalStack.pop());
          }
          evalStack.push(funcMeta.exec(...args));
        }
      }

      if (evalStack.length !== 1) {
        throw new Error('Malformed expression: multiple values remained on evaluation stack');
      }

      let result = evalStack[0];
      if (typeof result !== 'number' || isNaN(result)) {
        throw new Error('Evaluation resulted in an invalid number');
      }

      // Stabilize floating-point rounding artifacts
      if (Number.isFinite(result)) {
        result = Math.round(result * 1e12) / 1e12;
      }

      const endTime = typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
      const latencyMs = Math.max(0.01, endTime - startTime);

      const historyEntry = {
        id: `calc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        expression: formulaStr,
        variables: { ...context },
        rawValue: result,
        formattedValue: this.formatNumber(result),
        tokenCount: tokens.length,
        latencyMs: parseFloat(latencyMs.toFixed(3)),
        timestamp: Date.now()
      };

      this.addToHistory(historyEntry);

      this.emit('evaluate', {
        result,
        historyEntry,
        tokens,
        latencyMs: historyEntry.latencyMs
      });

      return result;
    } catch (err) {
      this.emit('error', {
        error: err.message,
        expression: formulaStr,
        variables: context,
        timestamp: Date.now()
      });
      throw err;
    }
  }

  // --- Calculation History Audit Log ---
  addToHistory(entry) {
    this.history.unshift(entry);
    if (this.history.length > 50) this.history.pop();
    this.emit('historyChange', this.getHistory());
  }

  getHistory() {
    return [...this.history];
  }

  getHistoryItem(id) {
    return this.history.find((h) => h.id === id) || null;
  }

  clearHistory() {
    this.history = [];
    this.emit('historyChange', []);
  }

  replayHistory(id) {
    const item = this.getHistoryItem(id);
    if (!item) throw new Error(`History item "${id}" not found`);
    return this.evaluate(item.expression, item.variables);
  }

  // --- Formatting Helpers ---
  formatNumber(value, options = {}) {
    if (typeof value !== 'number' || isNaN(value)) return 'N/A';
    if (!Number.isFinite(value)) return value > 0 ? 'Infinity' : '-Infinity';
    const decimals = options.decimals !== undefined ? options.decimals : 2;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: decimals
    }).format(value);
  }

  formatCurrency(value) {
    if (typeof value !== 'number' || isNaN(value)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  // --- Browser DOM Integration ---
  renderToDOM(container) {
    if (!container) return;

    const formulaInput = container.querySelector('#formula-input');
    const evaluateBtn = container.querySelector('#evaluate-btn');
    const clearBtn = container.querySelector('#clear-btn');
    const resetVarsBtn = container.querySelector('#reset-vars-btn');
    const clearHistoryBtn = container.querySelector('#clear-history-btn');
    const syntaxBadge = container.querySelector('#syntax-badge');
    const errorBanner = container.querySelector('#error-banner');
    const formattedResultElem = container.querySelector('#result-formatted');
    const rawResultElem = container.querySelector('#result-raw');
    const tokenCountElem = container.querySelector('#result-tokens');
    const latencyElem = container.querySelector('#result-latency');
    const historyListElem = container.querySelector('#history-list');
    const presetPills = container.querySelectorAll('.preset-btn');
    const tokenPills = container.querySelectorAll('.token-pill');
    const contrastToggle = container.querySelector('#high-contrast-toggle');

    // High Contrast Toggle
    if (contrastToggle) {
      contrastToggle.addEventListener('click', () => {
        const isHighContrast = document.body.classList.toggle('wcag-high-contrast');
        contrastToggle.setAttribute('aria-pressed', isHighContrast ? 'true' : 'false');
        contrastToggle.textContent = isHighContrast ? 'High Contrast: On' : 'High Contrast: Off';
      });
    }

    // Collect variables from inputs
    const getVariablesFromUI = () => {
      const vars = {};
      const numInputs = container.querySelectorAll('.var-number-input');
      numInputs.forEach((input) => {
        const key = input.dataset.variable;
        if (key) vars[key] = parseFloat(input.value) || 0;
      });
      return vars;
    };

    // Synchronize sliders and number inputs
    const syncVariables = (key, value) => {
      this.setVariable(key, value);
      const slider = container.querySelector(`.var-slider[data-variable="${key}"]`);
      const numInput = container.querySelector(`.var-number-input[data-variable="${key}"]`);
      if (slider && parseFloat(slider.value) !== value) slider.value = value;
      if (numInput && parseFloat(numInput.value) !== value) numInput.value = value;
    };

    container.querySelectorAll('.var-slider').forEach((slider) => {
      slider.addEventListener('input', (e) => {
        const key = e.target.dataset.variable;
        const val = parseFloat(e.target.value);
        syncVariables(key, val);
        runCalculation();
      });
    });

    container.querySelectorAll('.var-number-input').forEach((input) => {
      input.addEventListener('input', (e) => {
        const key = e.target.dataset.variable;
        const val = parseFloat(e.target.value);
        if (!isNaN(val)) {
          syncVariables(key, val);
          runCalculation();
        }
      });
    });

    // Reset variables
    if (resetVarsBtn) {
      resetVarsBtn.addEventListener('click', () => {
        const defaults = this.resetVariables();
        Object.keys(defaults).forEach((key) => {
          syncVariables(key, defaults[key]);
        });
        runCalculation();
      });
    }

    // Validate Syntax Live Badge
    const updateValidationUI = (expr) => {
      const validation = this.validateSyntax(expr);
      if (syntaxBadge) {
        if (validation.isValid) {
          syntaxBadge.className = 'syntax-badge valid';
          syntaxBadge.textContent = 'Syntax Valid';
        } else {
          syntaxBadge.className = 'syntax-badge invalid';
          syntaxBadge.textContent = `Invalid: ${validation.error}`;
        }
      }
      return validation;
    };

    // Render Calculation History Table
    const renderHistoryTable = (history) => {
      if (!historyListElem) return;
      if (!history || history.length === 0) {
        historyListElem.innerHTML = '<div class="history-empty">No calculations recorded in audit history.</div>';
        return;
      }

      historyListElem.innerHTML = history
        .map(
          (h) => `
        <div class="history-row" data-id="${h.id}">
          <div class="history-col-time">${new Date(h.timestamp).toLocaleTimeString()}</div>
          <div class="history-col-expr" title="${h.expression}">${h.expression}</div>
          <div class="history-col-val">${h.formattedValue}</div>
          <div class="history-col-latency">${h.latencyMs} ms</div>
          <div class="history-col-act">
            <button type="button" class="history-replay-btn" data-id="${h.id}" title="Replay this calculation">Load</button>
          </div>
        </div>
      `
        )
        .join('');

      historyListElem.querySelectorAll('.history-replay-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const id = e.target.dataset.id;
          const item = this.getHistoryItem(id);
          if (item) {
            if (formulaInput) formulaInput.value = item.expression;
            if (item.variables) {
              Object.keys(item.variables).forEach((k) => {
                syncVariables(k, item.variables[k]);
              });
            }
            runCalculation();
          }
        });
      });
    };

    this.on('historyChange', (history) => {
      renderHistoryTable(history);
    });

    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', () => {
        this.clearHistory();
      });
    }

    // Main calculation runner
    const runCalculation = () => {
      if (!formulaInput) return;
      const formula = formulaInput.value;
      const vars = getVariablesFromUI();
      const validation = updateValidationUI(formula);

      if (!validation.isValid) {
        if (errorBanner) {
          errorBanner.classList.remove('hidden');
          errorBanner.textContent = `Syntax Error: ${validation.error}`;
        }
        if (formattedResultElem) formattedResultElem.textContent = 'Error';
        if (rawResultElem) rawResultElem.textContent = '--';
        if (tokenCountElem) tokenCountElem.textContent = '0 Tokens';
        if (latencyElem) latencyElem.textContent = '0.00 ms';
        return;
      }

      try {
        const raw = this.evaluate(formula, vars);
        const tokens = this.tokenize(formula);
        const latestHistory = this.history[0];

        if (errorBanner) {
          errorBanner.classList.add('hidden');
          errorBanner.textContent = '';
        }

        if (formattedResultElem) {
          // Check if preset is currency
          formattedResultElem.textContent = this.formatNumber(raw);
        }
        if (rawResultElem) {
          rawResultElem.textContent = raw.toString();
        }
        if (tokenCountElem) {
          tokenCountElem.textContent = `${tokens.length} Tokens`;
        }
        if (latencyElem && latestHistory) {
          latencyElem.textContent = `${latestHistory.latencyMs} ms`;
        }
      } catch (err) {
        if (errorBanner) {
          errorBanner.classList.remove('hidden');
          errorBanner.textContent = `Evaluation Error: ${err.message}`;
        }
        if (formattedResultElem) formattedResultElem.textContent = 'Error';
        if (rawResultElem) rawResultElem.textContent = '--';
        if (tokenCountElem) tokenCountElem.textContent = 'Halted';
        if (latencyElem) latencyElem.textContent = '--';
      }
    };

    if (evaluateBtn) {
      evaluateBtn.addEventListener('click', runCalculation);
    }

    if (clearBtn && formulaInput) {
      clearBtn.addEventListener('click', () => {
        formulaInput.value = '';
        updateValidationUI('');
        if (formattedResultElem) formattedResultElem.textContent = '--';
        if (rawResultElem) rawResultElem.textContent = '--';
      });
    }

    if (formulaInput) {
      formulaInput.addEventListener('input', () => {
        updateValidationUI(formulaInput.value);
        runCalculation();
      });
    }

    // Preset loading buttons
    presetPills.forEach((btn) => {
      btn.addEventListener('click', () => {
        const presetKey = btn.dataset.preset;
        const preset = this.getPreset(presetKey);
        if (preset && formulaInput) {
          formulaInput.value = preset.formula;
          presetPills.forEach((p) => p.classList.remove('active'));
          btn.classList.add('active');
          const descElem = container.querySelector('#preset-description');
          if (descElem) descElem.textContent = `${preset.name}: ${preset.description}`;
          runCalculation();
        }
      });
    });

    // Helper token insertion pills
    tokenPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        const text = pill.dataset.insert;
        if (!text || !formulaInput) return;
        const start = formulaInput.selectionStart || formulaInput.value.length;
        const end = formulaInput.selectionEnd || formulaInput.value.length;
        formulaInput.value = formulaInput.value.substring(0, start) + text + formulaInput.value.substring(end);
        formulaInput.focus();
        formulaInput.setSelectionRange(start + text.length, start + text.length);
        runCalculation();
      });
    });

    // Initial load
    updateValidationUI(formulaInput ? formulaInput.value : '');
    runCalculation();
  }
}

// Auto-instantiate in browser context when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const container = document.querySelector('.evaluator-container');
    if (container) {
      const parser = new EcommerceStoreFormulaParser();
      parser.renderToDOM(container);
    }
  });
}
