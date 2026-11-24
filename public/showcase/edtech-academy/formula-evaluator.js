/**
 * EdTech Academy - Mathematical Expression Parser & Dynamic KPI Formula Calculator
 * Issue #1227 - Level 3 Feature
 *
 * Production-grade safe mathematical expression tokenizer and formula evaluator for EdTech Academy.
 * Supports operator precedence (BODMAS/PEMDAS), Shunting-yard RPN compiler, variable parameter injection,
 * scientific notation, built-in functions, division-by-zero guards, event emission, calculation audit history,
 * and synchronized DOM workbench integration.
 */

export const DEFAULT_EDTECH_VARIABLES = Object.freeze({
  course_price: 199.00,                 // Base retail price per course enrollment ($)
  total_enrolled: 1250,                 // Total active enrolled student cohort count
  completion_rate: 0.68,                // Historical course completion proportion (0.0 to 1.0)
  instructor_royalty_rate: 0.30,        // Instructor royalty rev-share rate (0.0 to 1.0)
  marketing_spend: 15000.00,            // Total paid acquisition campaign budget ($)
  student_support_cost_per_head: 12.00, // Direct student support & coaching cost per student ($)
  quiz_pass_rate: 0.82,                 // Average assessment pass proportion (0.0 to 1.0)
  average_watch_hours: 14.5             // Mean video consumption duration per enrolled student (hrs)
});

export const EDTECH_KPI_PRESETS = Object.freeze([
  {
    id: 'gross_course_revenue',
    name: 'Gross Course Revenue',
    category: 'Revenue & Margin',
    formula: 'course_price * total_enrolled',
    unit: '$',
    format: 'currency',
    description: 'Total top-line gross tuition revenue generated across all course enrollments.'
  },
  {
    id: 'net_academy_margin',
    name: 'Net Academy Margin',
    category: 'Revenue & Margin',
    formula: '(course_price * total_enrolled * (1 - instructor_royalty_rate)) - marketing_spend - (total_enrolled * student_support_cost_per_head)',
    unit: '$',
    format: 'currency',
    description: 'Net retained academy operating margin after instructor royalties, marketing acquisition, and student support.'
  },
  {
    id: 'cac',
    name: 'Customer Acquisition Cost (CAC)',
    category: 'Unit Economics',
    formula: 'marketing_spend / total_enrolled',
    unit: '$/student',
    format: 'currency',
    description: 'Blended paid marketing acquisition expenditure incurred per enrolled learner.'
  },
  {
    id: 'completion_count',
    name: 'Course Completion Count',
    category: 'Student Success',
    formula: 'total_enrolled * completion_rate',
    unit: 'students',
    format: 'number',
    description: 'Projected cohort volume of students successfully completing all course milestones.'
  },
  {
    id: 'roas',
    name: 'Return on Ad Spend (ROAS)',
    category: 'Marketing Efficiency',
    formula: '(course_price * total_enrolled) / marketing_spend',
    unit: 'x',
    format: 'decimal',
    description: 'Gross course tuition revenue generated per dollar invested into marketing campaigns.'
  },
  {
    id: 'engagement_metric',
    name: 'Student Engagement Metric',
    category: 'Engagement & Quality',
    formula: 'average_watch_hours * quiz_pass_rate * 10',
    unit: 'pts',
    format: 'decimal',
    description: 'Composite pedagogy engagement index weighting lecture watch time against quiz mastery.'
  }
]);

export class EdtechAcademyFormulaParser {
  /**
   * @param {Object} [options={}]
   * @param {'error'|'infinity'} [options.divisionByZeroGuard='error']
   * @param {number|null} [options.precision=null]
   */
  constructor(options = {}) {
    this.name = 'EdtechAcademyFormulaParser';
    this.options = {
      divisionByZeroGuard: 'error',
      precision: null,
      ...options
    };

    // Default EdTech variables
    this.defaultVariables = { ...DEFAULT_EDTECH_VARIABLES };
    this.presets = [...EDTECH_KPI_PRESETS];

    // Calculation history audit log
    this.history = [];
    this.maxHistoryLength = 50;

    // Event listeners map
    this.listeners = new Map();

    // Mathematical operators with precedence, associativity, arity, and execution logic
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

    // Built-in scientific, mathematical, and statistical functions
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
        maxArgs: 1,
        exec: (x) => {
          if (x <= 0) throw new Error('Logarithm of non-positive number is undefined');
          return Math.log(x);
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
      round: { minArgs: 1, maxArgs: 1, exec: (x) => Math.round(x) },
      floor: { minArgs: 1, maxArgs: 1, exec: (x) => Math.floor(x) },
      ceil: { minArgs: 1, maxArgs: 1, exec: (x) => Math.ceil(x) },
      pow: { minArgs: 2, maxArgs: 2, exec: (base, exponent) => Math.pow(base, exponent) },
      min: {
        minArgs: 1,
        maxArgs: Infinity,
        exec: (...args) => Math.min(...args)
      },
      max: {
        minArgs: 1,
        maxArgs: Infinity,
        exec: (...args) => Math.max(...args)
      }
    };

    // Mathematical constants
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
   * Tokenizes mathematical expression string into numbers, variables, operators, functions, and parentheses.
   * Handles integers, floating points, scientific notation (e.g. 1e-4, 2.5e3, 1E+6), variables, functions, and operators.
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

      // 2. Numbers (integers, decimals, and scientific notation e.g. 1e-4, 2.5e3, 1E+6)
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

      throw new Error(`Unexpected character in formula: "${char}" at index ${i}`);
    }

    return tokens;
  }

  /**
   * Validates expression syntax, balanced parentheses, operator positions, and token sequences.
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

    // Check parentheses balance and empty parens
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

    // Check first and last token validity
    const first = tokens[0];
    const last = tokens[tokens.length - 1];

    if (first.type === 'operator' && !first.unary) {
      return { valid: false, error: `Expression cannot begin with operator "${first.raw || first.value}"` };
    }
    if (first.type === 'comma') {
      return { valid: false, error: 'Expression cannot begin with a comma' };
    }
    if (first.value === ')') {
      return { valid: false, error: 'Expression cannot begin with closing parenthesis' };
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
    if (last.value === '(') {
      return { valid: false, error: 'Unclosed opening parenthesis in formula' };
    }

    // Check adjacent token sequences
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
        return { valid: false, error: 'Function "' + current.value + '" must be followed by "("' };
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

      // Missing operator between adjacent values/variables
      if (
        (current.type === 'number' || current.type === 'variable') &&
        (next.type === 'number' || next.type === 'variable')
      ) {
        return { valid: false, error: 'Missing operator between "' + (current.raw || current.value) + '" and "' + (next.raw || next.value) + '"' };
      }

      // Number/variable followed directly by opening parenthesis without operator
      if (
        (current.type === 'number' || current.type === 'variable') &&
        next.value === '('
      ) {
        return { valid: false, error: 'Missing operator before "("' };
      }

      // Closing parenthesis followed directly by number/variable without operator
      if (
        current.value === ')' &&
        (next.type === 'number' || next.type === 'variable' || next.type === 'function')
      ) {
        return { valid: false, error: 'Missing operator after ")"' };
      }
    }

    return { valid: true, error: null };
  }

  /**
   * Converts infix token array to Reverse Polish Notation (RPN) using Dijkstra's Shunting-Yard algorithm.
   * Respects operator precedence, right/left associativity, and functions with variable arity arguments.
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
            args: argCount
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

          const argCount = token.args || 1;
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
    const syntaxBadge = container.querySelector('#syntax-badge');
    const formattedResultDisplay = container.querySelector('#kpi-formatted-result');
    const rawResultDisplay = container.querySelector('#kpi-raw-result');
    const tokenCountDisplay = container.querySelector('#kpi-token-count');
    const latencyDisplay = container.querySelector('#kpi-latency');
    const statusDisplay = container.querySelector('#calc-status');
    const historyList = container.querySelector('#history-list');
    const presetSelect = container.querySelector('#preset-select');
    const pills = container.querySelectorAll('.pill');
    const contrastToggle = container.querySelector('#contrast-toggle');

    // High Contrast Mode Toggle
    if (contrastToggle) {
      contrastToggle.addEventListener('click', () => {
        const isContrast = document.body.classList.toggle('wcag-high-contrast');
        contrastToggle.setAttribute('aria-pressed', isContrast ? 'true' : 'false');
        contrastToggle.textContent = isContrast ? 'Standard Contrast' : 'WCAG AAA High Contrast';
      });
    }

    // Helper to get variable values from synchronized controls
    const getVariables = () => {
      const vars = {};
      const inputs = container.querySelectorAll('.param-number-input');
      inputs.forEach((input) => {
        const id = input.id.replace('input-', '');
        vars[id] = parseFloat(input.value) || 0;
      });
      return vars;
    };

    // Live syntax validation indicator
    const updateSyntaxStatus = () => {
      if (!formulaInput || !syntaxBadge) return;
      const expr = formulaInput.value.trim();
      if (!expr) {
        syntaxBadge.textContent = 'Awaiting Input';
        syntaxBadge.className = 'status-badge status-neutral';
        return;
      }
      const syntax = this.validateSyntax(expr);
      if (syntax.valid) {
        syntaxBadge.textContent = 'Valid Syntax';
        syntaxBadge.className = 'status-badge status-valid';
      } else {
        syntaxBadge.textContent = 'Syntax Invalid';
        syntaxBadge.className = 'status-badge status-error';
      }
    };

    // Execution & Calculation Update
    const updateCalculations = () => {
      if (!formulaInput) return;
      const formula = formulaInput.value.trim();
      const vars = getVariables();
      updateSyntaxStatus();

      if (!formula) {
        if (formattedResultDisplay) formattedResultDisplay.textContent = '--';
        if (rawResultDisplay) rawResultDisplay.textContent = '--';
        if (tokenCountDisplay) tokenCountDisplay.textContent = '0 tokens';
        if (latencyDisplay) latencyDisplay.textContent = '0.00 ms';
        if (statusDisplay) {
          statusDisplay.textContent = 'READY';
          statusDisplay.className = 'status-badge status-neutral';
        }
        if (errorBanner) {
          errorBanner.classList.add('hidden');
          errorBanner.textContent = '';
        }
        return;
      }

      const startTime = performance.now();

      try {
        const validation = this.validateSyntax(formula);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        const tokens = this.tokenize(formula);
        const res = this.evaluate(formula, vars);
        const latency = performance.now() - startTime;

        if (errorBanner) {
          errorBanner.classList.add('hidden');
          errorBanner.textContent = '';
        }

        // Detect matching preset for formatting
        const activePreset = this.presets.find(
          (p) => p.formula.replace(/\s+/g, '') === formula.replace(/\s+/g, '')
        );

        if (formattedResultDisplay) {
          if (typeof res === 'number') {
            if (activePreset && activePreset.format === 'currency') {
              formattedResultDisplay.textContent = new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
                maximumFractionDigits: 2
              }).format(res);
            } else if (Number.isInteger(res)) {
              formattedResultDisplay.textContent = res.toLocaleString('en-US') + (activePreset ? ` ${activePreset.unit}` : '');
            } else {
              formattedResultDisplay.textContent = res.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4
              }) + (activePreset ? ` ${activePreset.unit}` : '');
            }
          } else {
            formattedResultDisplay.textContent = String(res);
          }
        }

        if (rawResultDisplay) {
          rawResultDisplay.textContent = typeof res === 'number' ? String(res) : '--';
        }

        if (tokenCountDisplay) {
          tokenCountDisplay.textContent = `${tokens.length} token${tokens.length === 1 ? '' : 's'}`;
        }

        if (latencyDisplay) {
          latencyDisplay.textContent = `${latency.toFixed(2)} ms`;
        }

        if (statusDisplay) {
          statusDisplay.textContent = 'EVALUATED (VALID)';
          statusDisplay.className = 'status-badge status-valid';
        }
      } catch (err) {
        const latency = performance.now() - startTime;
        if (errorBanner) {
          errorBanner.classList.remove('hidden');
          errorBanner.textContent = err.message;
        }
        if (formattedResultDisplay) formattedResultDisplay.textContent = 'ERROR';
        if (rawResultDisplay) rawResultDisplay.textContent = 'NaN';
        if (latencyDisplay) latencyDisplay.textContent = `${latency.toFixed(2)} ms`;
        if (statusDisplay) {
          statusDisplay.textContent = 'CALCULATION ERROR';
          statusDisplay.className = 'status-badge status-error';
        }
      }

      renderHistoryUI();
    };

    // Render Calculation History Log with Replay capability
    const renderHistoryUI = () => {
      if (!historyList) return;
      const history = this.getHistory();
      if (history.length === 0) {
        historyList.innerHTML = '<li class="history-empty">No calculations recorded in audit history.</li>';
        return;
      }

      historyList.innerHTML = history
        .slice(0, 15)
        .map(
          (entry) => `
        <li class="history-item ${entry.status === 'ERROR' ? 'history-error' : ''}">
          <div class="history-header">
            <span class="history-id">${entry.id}</span>
            <span class="history-time">${new Date(entry.timestamp).toLocaleTimeString()}</span>
          </div>
          <div class="history-expr"><code>${escapeHTML(entry.expression)}</code></div>
          <div class="history-footer">
            <span class="history-status ${entry.status === 'SUCCESS' ? 'badge-success' : 'badge-error'}">${entry.status}</span>
            <span class="history-result">${entry.status === 'SUCCESS' ? entry.result : escapeHTML(entry.error || 'Error')}</span>
            <button type="button" class="btn-replay" data-calc-id="${entry.id}" title="Replay formula and variable snapshot">Replay ↺</button>
          </div>
        </li>
      `
        )
        .join('');

      // Wire replay buttons
      historyList.querySelectorAll('.btn-replay').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-calc-id');
          const item = this.getCalculationById(id);
          if (item) {
            if (formulaInput) {
              formulaInput.value = item.expression;
            }
            if (item.variables) {
              Object.entries(item.variables).forEach(([k, v]) => {
                const slider = container.querySelector(`#slider-${k}`);
                const numInput = container.querySelector(`#input-${k}`);
                if (slider) slider.value = v;
                if (numInput) numInput.value = v;
              });
            }
            updateCalculations();
          }
        });
      });
    };

    const escapeHTML = (str) => {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };

    // Synchronize Sliders and Numeric Inputs Bidirectionally
    container.querySelectorAll('.variable-row').forEach((row) => {
      const slider = row.querySelector('.param-slider');
      const numInput = row.querySelector('.param-number-input');

      if (slider && numInput) {
        slider.addEventListener('input', (e) => {
          numInput.value = e.target.value;
          updateCalculations();
        });

        numInput.addEventListener('input', (e) => {
          slider.value = e.target.value;
          updateCalculations();
        });
      }
    });

    // Preset Dropdown Selection
    if (presetSelect && formulaInput) {
      presetSelect.addEventListener('change', () => {
        if (presetSelect.value) {
          formulaInput.value = presetSelect.value;
          updateCalculations();
        }
      });
    }

    // Helper Pills (Variables, Functions, Operators)
    pills.forEach((pill) => {
      pill.addEventListener('click', () => {
        const insertText = pill.getAttribute('data-insert');
        if (insertText && formulaInput) {
          const start = formulaInput.selectionStart ?? formulaInput.value.length;
          const end = formulaInput.selectionEnd ?? formulaInput.value.length;
          const curVal = formulaInput.value;
          formulaInput.value = curVal.slice(0, start) + insertText + curVal.slice(end);
          formulaInput.focus();
          const newPos = start + insertText.length;
          formulaInput.setSelectionRange(newPos, newPos);
          updateCalculations();
        }
      });
    });

    // Preset Selection Pills (if present)
    container.querySelectorAll('.preset-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const formula = pill.getAttribute('data-formula');
        if (formula && formulaInput) {
          formulaInput.value = formula;
          if (presetSelect) presetSelect.value = formula;
          updateCalculations();
        }
      });
    });

    // Buttons
    if (evaluateBtn) {
      evaluateBtn.addEventListener('click', updateCalculations);
    }

    if (clearFormulaBtn && formulaInput) {
      clearFormulaBtn.addEventListener('click', () => {
        formulaInput.value = '';
        if (presetSelect) presetSelect.selectedIndex = 0;
        updateCalculations();
        formulaInput.focus();
      });
    }

    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', () => {
        this.clearHistory();
        renderHistoryUI();
      });
    }

    if (formulaInput) {
      formulaInput.addEventListener('input', () => {
        updateSyntaxStatus();
        updateCalculations();
      });
    }

    // Initial run
    updateCalculations();
  }
}

// Browser DOM controller auto-initialization
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const parser = new EdtechAcademyFormulaParser();
    const container = document.querySelector('.formula-evaluator-container') || document.body;
    parser.renderToDOM(container);
  });
}
