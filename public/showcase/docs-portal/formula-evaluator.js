/**
 * Docs Portal - Mathematical Expression Parser & Dynamic KPI Formula Calculator
 * Issue #1199 - Level 3 Feature
 * 
 * Production-grade mathematical tokenizer, Dijkstra's Shunting-yard RPN compiler,
 * documentation KPI variable parameter evaluator, and calculation audit trail history logger.
 */

export const DEFAULT_DOCS_VARIABLES = Object.freeze({
  total_articles: 120,               // Total documentation articles in portal
  monthly_pageviews: 85000,          // Total monthly article pageviews
  helpful_votes: 4200,               // Positive feedback ratings
  unhelpful_votes: 350,              // Negative feedback ratings
  search_queries: 28000,             // Total on-site search queries performed
  zero_result_searches: 1400,        // Queries yielding zero matched articles
  average_time_on_page_sec: 165,     // Mean dwell time per article in seconds
  escalation_rate: 0.045,            // Rate of support tickets opened from docs (4.5%)
  pi: Math.PI,
  e: Math.E
});

export const DOCS_FORMULA_PRESETS = Object.freeze([
  {
    id: 'content_helpfulness_ratio',
    name: 'Content Helpfulness Ratio (%)',
    category: 'Content Quality',
    formula: '(helpful_votes / (helpful_votes + unhelpful_votes)) * 100',
    unit: '%',
    description: 'Proportion of article readers who found the documentation helpful.'
  },
  {
    id: 'search_success_rate',
    name: 'Search Success Rate (%)',
    category: 'Search Effectiveness',
    formula: '((search_queries - zero_result_searches) / search_queries) * 100',
    unit: '%',
    description: 'Percentage of portal search queries that successfully surfaced results.'
  },
  {
    id: 'docs_deflection_efficiency',
    name: 'Documentation Deflection Efficiency',
    category: 'Support Deflection',
    formula: '(1 - escalation_rate) * 100',
    unit: '%',
    description: 'Estimated support tickets deflected through self-service documentation.'
  },
  {
    id: 'pageview_per_article_density',
    name: 'Pageview Per Article Density',
    category: 'Content Utilization',
    formula: 'monthly_pageviews / total_articles',
    unit: 'views/article',
    description: 'Mean traffic distribution and readership density per published article.'
  },
  {
    id: 'search_to_pageview_ratio',
    name: 'Search To Pageview Ratio',
    category: 'User Navigation',
    formula: '(search_queries / monthly_pageviews) * 100',
    unit: '%',
    description: 'Frequency of portal search bar usage relative to page impressions.'
  },
  {
    id: 'docs_health_score',
    name: 'Docs Health Score',
    category: 'Overall Performance',
    formula: 'round((((helpful_votes / (helpful_votes + unhelpful_votes)) * 100) + ((1 - escalation_rate) * 100)) / 2)',
    unit: 'points',
    description: 'Balanced composite index measuring overall portal documentation health.'
  }
]);

export class DocsPortalFormulaParser {
  /**
   * @param {Object} [options={}]
   * @param {'error'|'infinity'} [options.divisionByZeroGuard='error']
   * @param {number|null} [options.precision=null]
   * @param {number} [options.maxHistory=50]
   * @param {Object} [options.variables]
   */
  constructor(options = {}) {
    this.name = 'DocsPortalFormulaParser';
    this.options = {
      divisionByZeroGuard: 'error',
      precision: null,
      maxHistory: 50,
      ...options
    };

    this.defaultVariables = { ...DEFAULT_DOCS_VARIABLES };
    this.variables = { ...DEFAULT_DOCS_VARIABLES, ...(options.variables || {}) };

    this.history = [];
    this.maxHistoryLength = this.options.maxHistory || 50;
    this.listeners = new Map();

    // Mathematical operators definition
    this.operators = {
      '+': {
        precedence: 1,
        associativity: 'L',
        assoc: 'left',
        arity: 2,
        exec: (a, b) => a + b
      },
      '-': {
        precedence: 1,
        associativity: 'L',
        assoc: 'left',
        arity: 2,
        exec: (a, b) => a - b
      },
      '*': {
        precedence: 2,
        associativity: 'L',
        assoc: 'left',
        arity: 2,
        exec: (a, b) => a * b
      },
      '/': {
        precedence: 2,
        associativity: 'L',
        assoc: 'left',
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
        assoc: 'left',
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
      '^': {
        precedence: 3,
        associativity: 'R',
        assoc: 'right',
        arity: 2,
        exec: (a, b) => Math.pow(a, b)
      },
      'u+': {
        precedence: 4,
        associativity: 'R',
        assoc: 'right',
        arity: 1,
        exec: (a) => +a
      },
      'u-': {
        precedence: 4,
        associativity: 'R',
        assoc: 'right',
        arity: 1,
        exec: (a) => -a
      }
    };

    // Built-in scientific and mathematical functions
    this.functions = {
      sqrt: {
        minArgs: 1,
        maxArgs: 1,
        arity: 1,
        exec: (x) => {
          if (x < 0) throw new Error(`Square root of negative number is undefined: ${x}`);
          return Math.sqrt(x);
        }
      },
      log: {
        minArgs: 1,
        maxArgs: 1,
        arity: 1,
        exec: (x) => {
          if (x <= 0) throw new Error(`Logarithm of non-positive number is undefined: ${x}`);
          return Math.log10(x);
        }
      },
      log10: {
        minArgs: 1,
        maxArgs: 1,
        arity: 1,
        exec: (x) => {
          if (x <= 0) throw new Error(`Base-10 logarithm of non-positive number is undefined: ${x}`);
          return Math.log10(x);
        }
      },
      ln: {
        minArgs: 1,
        maxArgs: 1,
        arity: 1,
        exec: (x) => {
          if (x <= 0) throw new Error(`Natural logarithm of non-positive number is undefined: ${x}`);
          return Math.log(x);
        }
      },
      exp: {
        minArgs: 1,
        maxArgs: 1,
        arity: 1,
        exec: (x) => Math.exp(x)
      },
      abs: {
        minArgs: 1,
        maxArgs: 1,
        arity: 1,
        exec: (x) => Math.abs(x)
      },
      round: {
        minArgs: 1,
        maxArgs: 2,
        arity: 1,
        exec: (val, precision = 0) => {
          if (precision === 0 || precision === undefined) {
            return Math.round(val);
          }
          const factor = Math.pow(10, precision);
          return Math.round(val * factor) / factor;
        }
      },
      floor: {
        minArgs: 1,
        maxArgs: 1,
        arity: 1,
        exec: (x) => Math.floor(x)
      },
      ceil: {
        minArgs: 1,
        maxArgs: 1,
        arity: 1,
        exec: (x) => Math.ceil(x)
      },
      min: {
        minArgs: 1,
        maxArgs: Infinity,
        arity: 2,
        exec: (...args) => {
          if (args.length === 0) throw new Error('min() requires at least one argument');
          return Math.min(...args);
        }
      },
      max: {
        minArgs: 1,
        maxArgs: Infinity,
        arity: 2,
        exec: (...args) => {
          if (args.length === 0) throw new Error('max() requires at least one argument');
          return Math.max(...args);
        }
      },
      pow: {
        minArgs: 2,
        maxArgs: 2,
        arity: 2,
        exec: (a, b) => {
          if (a < 0 && !Number.isInteger(b)) {
            throw new Error('Fractional power of negative base is undefined');
          }
          return Math.pow(a, b);
        }
      }
    };

    // Mathematical constants
    this.constants = {
      pi: Math.PI,
      PI: Math.PI,
      e: Math.E,
      E: Math.E
    };

    this.presets = DOCS_FORMULA_PRESETS;
  }

  // ==========================================
  // EVENT EMITTER
  // ==========================================

  /**
   * Subscribe to an event.
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
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
   * Unsubscribe from an event.
   * @param {string} event - Event name
   * @param {Function} [callback] - Callback function
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
   * Emit an event to all subscribers.
   * @param {string} event - Event name
   * @param {...*} args - Arguments
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

  // ==========================================
  // TOKENIZER
  // ==========================================

  /**
   * Tokenizes mathematical expression string into tokens.
   * Handles integers, floats, scientific notation, variables, operators, parentheses, commas, and functions.
   * @param {string} expr - Expression string
   * @returns {Array<Object>} Token array
   */
  tokenize(expr) {
    if (typeof expr !== 'string') {
      throw new Error('Expression must be a string');
    }

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

      // 2. Numbers: integers, decimals, scientific notation (e.g. 1e-4, 2.5e3, 1E+6)
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
        } else if (Object.prototype.hasOwnProperty.call(this.constants, lowerIdent)) {
          tokens.push({ type: 'number', value: this.constants[lowerIdent], raw: ident });
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

        const opKey = isUnary ? (char === '-' ? 'u-' : 'u+') : char;
        const opMeta = this.operators[opKey];

        tokens.push({
          type: 'operator',
          value: opKey,
          raw: char,
          unary: isUnary,
          precedence: opMeta ? opMeta.precedence : 0,
          associativity: opMeta ? opMeta.associativity : 'L',
          assoc: opMeta ? opMeta.assoc : 'left'
        });
        i++;
        continue;
      }

      throw new Error(`Unexpected character in formula: "${char}" at index ${i}`);
    }

    return tokens;
  }

  // ==========================================
  // SYNTAX VALIDATION
  // ==========================================

  /**
   * Validates expression syntax, balanced parentheses, and token arrangements.
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

    // Check parentheses balance and depth
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

    // Check first token
    const first = tokens[0];
    if (first.type === 'operator' && !first.unary) {
      return { valid: false, error: `Expression cannot begin with operator "${first.raw || first.value}"` };
    }
    if (first.type === 'comma') {
      return { valid: false, error: 'Expression cannot begin with a comma' };
    }

    // Check last token
    const last = tokens[tokens.length - 1];
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
      if (current.type === 'comma' && next.type === 'operator' && !next.unary) {
        return { valid: false, error: 'Misplaced comma before binary operator' };
      }
    }

    return { valid: true, error: null };
  }

  // ==========================================
  // SHUNTING-YARD RPN COMPILER
  // ==========================================

  /**
   * Converts infix tokens to Reverse Polish Notation (RPN) via Shunting-yard algorithm.
   * Respects operator precedence (BODMAS/PEMDAS: ^ > * / % > + -), associativity, and functions.
   * @param {Array<Object>|string} tokensOrExpr - Tokens array or formula string
   * @returns {Array<Object>} Postfix RPN token array
   */
  toRPN(tokensOrExpr) {
    const tokens = typeof tokensOrExpr === 'string' ? this.tokenize(tokensOrExpr) : tokensOrExpr;
    if (!Array.isArray(tokens)) {
      throw new Error('toRPN expects a string expression or array of tokens');
    }

    const outputQueue = [];
    const operatorStack = [];
    const argCountStack = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.type === 'number' || token.type === 'variable') {
        outputQueue.push(token);
      } else if (token.type === 'function') {
        operatorStack.push(token);
        argCountStack.push(1);
      } else if (token.type === 'comma') {
        while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].value !== '(') {
          outputQueue.push(operatorStack.pop());
        }
        if (operatorStack.length === 0) {
          throw new Error('Misplaced comma outside of function arguments');
        }
        if (argCountStack.length > 0) {
          argCountStack[argCountStack.length - 1]++;
        }
      } else if (token.type === 'operator') {
        const op1 = this.operators[token.value];
        if (!op1) {
          throw new Error(`Unknown operator "${token.value}"`);
        }

        while (operatorStack.length > 0) {
          const top = operatorStack[operatorStack.length - 1];
          if (top.value === '(') break;

          if (top.type === 'function') {
            outputQueue.push(operatorStack.pop());
            continue;
          }

          const op2 = this.operators[top.value];
          if (
            op2 &&
            ((op1.associativity === 'L' && op1.precedence <= op2.precedence) ||
              (op1.associativity === 'R' && op1.precedence < op2.precedence))
          ) {
            outputQueue.push(operatorStack.pop());
          } else {
            break;
          }
        }
        operatorStack.push(token);
      } else if (token.value === '(') {
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

        if (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].type === 'function') {
          const fnToken = operatorStack.pop();
          const args = argCountStack.length > 0 ? argCountStack.pop() : 1;
          outputQueue.push({
            type: 'function',
            value: fnToken.value,
            raw: fnToken.raw,
            args: args
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

  // ==========================================
  // EVALUATION ENGINE
  // ==========================================

  /**
   * Evaluates mathematical formula with variable parameter injection and domain guards.
   * @param {string|Array<Object>} tokensOrExpr - Expression string or token array
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
      const contextVars = { ...this.defaultVariables, ...this.variables, ...variables };

      for (const token of rpn) {
        if (token.type === 'number') {
          evalStack.push(token.value);
        } else if (token.type === 'variable') {
          const varName = token.value;
          if (Object.prototype.hasOwnProperty.call(contextVars, varName)) {
            const num = Number(contextVars[varName]);
            if (Number.isNaN(num)) {
              throw new Error(`Variable "${varName}" is NaN`);
            }
            evalStack.push(num);
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

          const argCount = token.args !== undefined ? token.args : (fnMeta.minArgs || 1);
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

  // ==========================================
  // HISTORY AUDIT LOG
  // ==========================================

  /**
   * Records a calculation entry in the audit history.
   * @param {Object} entry
   */
  addHistory(entry) {
    this.history.unshift(entry);
    if (this.history.length > this.maxHistoryLength) {
      this.history.pop();
    }
    this.emit('historyChange', this.getHistory());
    this.emit('historyUpdate', this.getHistory());
  }

  /**
   * Retrieves calculation audit history copy.
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
    this.emit('historyChange', []);
    this.emit('historyUpdate', []);
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

  // ==========================================
  // BROWSER DOM CONTROLLER
  // ==========================================

  /**
   * Connects formula evaluation engine to the interactive DOM workbench.
   * @param {HTMLElement} container - Root DOM container
   */
  renderToDOM(container) {
    if (!container) return;

    const formulaInput = container.querySelector('#formulaInput') || container.querySelector('#formula-input');
    const evaluateBtn = container.querySelector('#evaluateBtn') || container.querySelector('#evaluate-btn');
    const clearBtn = container.querySelector('#clearBtn') || container.querySelector('#clear-btn');
    const clearHistoryBtn = container.querySelector('#clearHistoryBtn') || container.querySelector('#clear-history-btn');
    const errorBanner = container.querySelector('#errorBanner') || container.querySelector('#error-banner');
    const errorMessageText = container.querySelector('#errorMessageText');
    const syntaxBadge = container.querySelector('#syntaxBadge') || container.querySelector('#syntaxBanner');
    const syntaxBadgeText = container.querySelector('#syntaxBadgeText') || container.querySelector('#syntaxBannerText');
    
    // Result Callouts
    const resultFormatted = container.querySelector('#resultFormatted') || container.querySelector('#result-formatted');
    const resultRaw = container.querySelector('#resultRaw') || container.querySelector('#result-raw');
    const tokenCountDisplay = container.querySelector('#tokenCount') || container.querySelector('#token-count');
    const execLatencyDisplay = container.querySelector('#execLatency') || container.querySelector('#exec-latency');
    const rpnDisplay = container.querySelector('#resultRPN') || container.querySelector('#result-rpn');

    // History Table / List
    const historyBody = container.querySelector('#historyTableBody') || container.querySelector('#history-list');

    // High Contrast Toggle
    const contrastToggle = container.querySelector('#contrastToggle') || container.querySelector('#theme-toggle');

    // Preset selector
    const presetSelect = container.querySelector('#presetSelect') || container.querySelector('#preset-select');
    const presetPills = container.querySelectorAll('[data-preset-formula]');
    const snippetPills = container.querySelectorAll('[data-insert-snippet]');

    // Collect variables from inputs
    const getVariablesFromDOM = () => {
      const vars = {};
      const varKeys = Object.keys(this.defaultVariables);
      for (const key of varKeys) {
        if (key === 'pi' || key === 'e') continue;
        const numInput = container.querySelector(`#input_${key}`) || container.querySelector(`#var_${key}`);
        const sliderInput = container.querySelector(`#slider_${key}`);
        if (numInput && numInput.value !== '') {
          vars[key] = parseFloat(numInput.value);
        } else if (sliderInput && sliderInput.value !== '') {
          vars[key] = parseFloat(sliderInput.value);
        } else if (Object.prototype.hasOwnProperty.call(this.variables, key)) {
          vars[key] = this.variables[key];
        }
      }
      return vars;
    };

    // Update syntax badge in real-time
    const updateSyntaxBadge = (formula) => {
      if (!syntaxBadge) return;
      const validation = this.validateSyntax(formula);
      if (validation.valid) {
        syntaxBadge.className = 'syntax-badge syntax-valid';
        if (syntaxBadgeText) {
          syntaxBadgeText.textContent = '✓ Syntax Valid';
        } else {
          syntaxBadge.textContent = '✓ Syntax Valid';
        }
      } else {
        syntaxBadge.className = 'syntax-badge syntax-invalid';
        const msg = `⚠ ${validation.error}`;
        if (syntaxBadgeText) {
          syntaxBadgeText.textContent = msg;
        } else {
          syntaxBadge.textContent = msg;
        }
      }
    };

    // Execute evaluation and update UI
    const runEvaluation = () => {
      if (!formulaInput) return;
      const formula = formulaInput.value.trim();
      updateSyntaxBadge(formula);

      const vars = getVariablesFromDOM();
      this.variables = { ...this.defaultVariables, ...vars };

      const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();

      try {
        const tokens = this.tokenize(formula);
        const rpn = this.toRPN(tokens);
        const res = this.evaluate(formula, vars);
        const latency = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;

        if (errorBanner) {
          errorBanner.classList.add('hidden');
        }

        if (resultFormatted) {
          if (typeof res === 'number') {
            if (Number.isInteger(res)) {
              resultFormatted.textContent = res.toLocaleString();
            } else if (Math.abs(res) < 0.0001 && res !== 0) {
              resultFormatted.textContent = res.toExponential(4);
            } else {
              resultFormatted.textContent = res.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4
              });
            }
          } else {
            resultFormatted.textContent = String(res);
          }
        }

        if (resultRaw) {
          resultRaw.textContent = typeof res === 'number' ? String(res) : String(res);
        }

        if (tokenCountDisplay) {
          tokenCountDisplay.textContent = `${tokens.length} tokens (${rpn.length} RPN ops)`;
        }

        if (rpnDisplay) {
          rpnDisplay.textContent = rpn.map((t) => t.raw || t.value).join(' ');
        }

        if (execLatencyDisplay) {
          execLatencyDisplay.textContent = `${latency < 1 ? '< 1' : latency.toFixed(2)} ms`;
        }
      } catch (err) {
        const latency = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime;

        if (errorBanner) {
          errorBanner.classList.remove('hidden');
          if (errorMessageText) {
            errorMessageText.textContent = err.message;
          } else {
            errorBanner.textContent = err.message;
          }
        }

        if (resultFormatted) {
          resultFormatted.textContent = 'ERROR';
        }
        if (resultRaw) {
          resultRaw.textContent = 'NaN';
        }
        if (tokenCountDisplay) {
          tokenCountDisplay.textContent = 'Evaluation halted';
        }
        if (execLatencyDisplay) {
          execLatencyDisplay.textContent = `${latency.toFixed(2)} ms`;
        }
      }

      renderHistoryUI();
    };

    // Render Calculation History UI
    const renderHistoryUI = () => {
      if (!historyBody) return;
      const history = this.getHistory();

      if (history.length === 0) {
        historyBody.innerHTML = `
          <tr>
            <td colspan="5" class="history-empty">No calculations recorded yet. Evaluate a formula above.</td>
          </tr>
        `;
        return;
      }

      historyBody.innerHTML = history
        .slice(0, 15)
        .map((entry) => {
          const isError = entry.status === 'ERROR';
          const resultStr = isError ? (entry.error || 'Error') : (
            typeof entry.result === 'number'
              ? (Number.isInteger(entry.result) ? entry.result.toLocaleString() : entry.result.toFixed(4))
              : String(entry.result)
          );
          const timeStr = new Date(entry.timestamp).toLocaleTimeString();
          return `
            <tr class="history-row ${isError ? 'history-row-error' : ''}" data-entry-id="${entry.id}">
              <td class="history-id"><code>${entry.id.slice(0, 14)}...</code></td>
              <td class="history-time">${timeStr}</td>
              <td class="history-expr"><code title="${entry.expression}">${entry.expression}</code></td>
              <td class="history-res"><span class="badge ${isError ? 'badge-error' : 'badge-success'}">${resultStr}</span></td>
              <td class="history-actions">
                <button type="button" class="btn-replay" data-replay-id="${entry.id}" title="Replay this calculation">↺ Replay</button>
              </td>
            </tr>
          `;
        })
        .join('');

      // Wire replay buttons
      historyBody.querySelectorAll('[data-replay-id]').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const id = e.target.getAttribute('data-replay-id');
          const item = this.getCalculationById(id);
          if (item && formulaInput) {
            formulaInput.value = item.expression;
            // Restore variables
            if (item.variables) {
              for (const [vName, vVal] of Object.entries(item.variables)) {
                const slider = container.querySelector(`#slider_${vName}`);
                const num = container.querySelector(`#input_${vName}`) || container.querySelector(`#var_${vName}`);
                if (slider) slider.value = vVal;
                if (num) num.value = vVal;
              }
            }
            runEvaluation();
          }
        });
      });
    };

    // Synchronize sliders and number inputs
    const varKeys = Object.keys(this.defaultVariables);
    for (const key of varKeys) {
      if (key === 'pi' || key === 'e') continue;
      const slider = container.querySelector(`#slider_${key}`);
      const numInput = container.querySelector(`#input_${key}`) || container.querySelector(`#var_${key}`);

      if (slider && numInput) {
        slider.addEventListener('input', (e) => {
          numInput.value = e.target.value;
          runEvaluation();
        });

        numInput.addEventListener('input', (e) => {
          slider.value = e.target.value;
          runEvaluation();
        });
      }
    }

    // Formula Input live changes
    if (formulaInput) {
      formulaInput.addEventListener('input', () => {
        updateSyntaxBadge(formulaInput.value);
        runEvaluation();
      });
    }

    // Evaluate button
    if (evaluateBtn) {
      evaluateBtn.addEventListener('click', runEvaluation);
    }

    // Clear formula button
    if (clearBtn && formulaInput) {
      clearBtn.addEventListener('click', () => {
        formulaInput.value = '';
        updateSyntaxBadge('');
        runEvaluation();
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

    // Preset selection dropdown
    if (presetSelect && formulaInput) {
      presetSelect.addEventListener('change', () => {
        if (presetSelect.value) {
          formulaInput.value = presetSelect.value;
          runEvaluation();
        }
      });
    }

    // Preset pills click
    presetPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        const formula = pill.getAttribute('data-preset-formula');
        if (formula && formulaInput) {
          formulaInput.value = formula;
          if (presetSelect) presetSelect.value = formula;
          runEvaluation();
        }
      });
    });

    // Snippet insert pills click
    snippetPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        const snippet = pill.getAttribute('data-insert-snippet');
        if (snippet && formulaInput) {
          const start = formulaInput.selectionStart || formulaInput.value.length;
          const end = formulaInput.selectionEnd || formulaInput.value.length;
          const val = formulaInput.value;
          formulaInput.value = val.substring(0, start) + snippet + val.substring(end);
          formulaInput.focus();
          const nextCursor = start + snippet.length;
          formulaInput.setSelectionRange(nextCursor, nextCursor);
          runEvaluation();
        }
      });
    });

    // WCAG AAA High Contrast Toggle
    if (contrastToggle) {
      const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('docs_portal_high_contrast') : null;
      if (stored === 'true') {
        container.classList.add('wcag-high-contrast');
        document.body.classList.add('wcag-high-contrast');
        contrastToggle.setAttribute('aria-pressed', 'true');
        contrastToggle.textContent = 'High Contrast: ON';
      }

      contrastToggle.addEventListener('click', () => {
        const isHigh = container.classList.toggle('wcag-high-contrast');
        document.body.classList.toggle('wcag-high-contrast', isHigh);
        contrastToggle.setAttribute('aria-pressed', isHigh ? 'true' : 'false');
        contrastToggle.textContent = isHigh ? 'High Contrast: ON' : 'High Contrast: OFF';
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('docs_portal_high_contrast', isHigh ? 'true' : 'false');
        }
      });
    }

    // Initial evaluation
    if (formulaInput && !formulaInput.value) {
      formulaInput.value = '(helpful_votes / (helpful_votes + unhelpful_votes)) * 100';
    }
    runEvaluation();
  }
}

// In-browser auto DOM wiring
if (typeof window !== 'undefined') {
  window.DocsPortalFormulaParser = DocsPortalFormulaParser;
  window.DEFAULT_DOCS_VARIABLES = DEFAULT_DOCS_VARIABLES;
  window.DOCS_FORMULA_PRESETS = DOCS_FORMULA_PRESETS;

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      const container = document.querySelector('.docs-portal-evaluator-container') || document.body;
      const parser = new DocsPortalFormulaParser();
      parser.renderToDOM(container);
    });
  }
}

export default DocsPortalFormulaParser;
