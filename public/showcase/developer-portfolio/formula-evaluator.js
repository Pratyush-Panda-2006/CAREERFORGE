/**
 * Developer Portfolio — Mathematical Expression Parser & Dynamic KPI Formula Calculator
 * Issue #1195
 *
 * Production-grade mathematical tokenizer, Shunting-yard RPN compiler,
 * dynamic developer metrics variable parameter injector, domain guards,
 * calculation audit history logger, and event-driven reactive engine.
 */

export const DEFAULT_DEVELOPER_VARIABLES = Object.freeze({
  total_commits: 850,
  pull_requests_merged: 65,
  code_review_score: 4.8,
  lines_of_code_shipped: 45000,
  test_coverage_rate: 0.92,
  open_source_contributions: 35,
  bug_resolution_hours: 3.5,
  uptime_sla_rate: 0.999
});

export const DEVELOPER_KPI_PRESETS = Object.freeze({
  contributor_velocity: {
    id: 'contributor_velocity',
    title: 'Contributor Velocity Index',
    formula: '(total_commits * 0.2) + (pull_requests_merged * 1.5) + (open_source_contributions * 2.0)',
    description: 'Measures overall development pace combining commits, merged PRs, and open source impact.'
  },
  code_quality: {
    id: 'code_quality',
    title: 'Code Quality Metric',
    formula: '(test_coverage_rate * 100) * (code_review_score / 5.0)',
    description: 'Evaluates codebase health through automated test coverage and peer review scores.'
  },
  engineering_productivity: {
    id: 'engineering_productivity',
    title: 'Engineering Productivity Score',
    formula: '((lines_of_code_shipped / 1000) * test_coverage_rate) / bug_resolution_hours',
    description: 'Volume of tested code shipped normalized against bug turnaround speed.'
  },
  reliability_factor: {
    id: 'reliability_factor',
    title: 'Reliability Factor',
    formula: 'uptime_sla_rate * 100',
    description: 'System availability and uptime adherence expressed as a percentage.'
  },
  pr_impact_ratio: {
    id: 'pr_impact_ratio',
    title: 'Pull Request Impact Ratio',
    formula: 'pull_requests_merged / (total_commits / 10)',
    description: 'Commit consolidation and pull request efficiency metric.'
  },
  portfolio_composite_rating: {
    id: 'portfolio_composite_rating',
    title: 'Portfolio Composite Rating',
    formula: 'round(((test_coverage_rate * 100) + (code_review_score * 20)) / 2)',
    description: 'Holistic portfolio engineering score combining coverage and peer review.'
  }
});

export class DeveloperPortfolioFormulaParser {
  /**
   * @param {Object} [options={}]
   * @param {Object} [options.variables={}] Initial variable overrides
   * @param {number} [options.maxHistorySize=100] Maximum audit history records
   * @param {number|null} [options.precision=null] Optional decimal precision rounding
   */
  constructor(options = {}) {
    this.name = 'DeveloperPortfolioFormulaParser';
    this.options = {
      maxHistorySize: 100,
      precision: null,
      ...options
    };

    this.defaultVariables = {
      ...DEFAULT_DEVELOPER_VARIABLES,
      ...(options.variables || {})
    };

    this.maxHistorySize =
      typeof this.options.maxHistorySize === 'number' && this.options.maxHistorySize > 0
        ? this.options.maxHistorySize
        : 100;

    this.history = [];
    this.listeners = new Map();

    // Mathematical constants
    this.constants = Object.freeze({
      pi: Math.PI,
      PI: Math.PI,
      e: Math.E,
      E: Math.E
    });

    // Binary and unary operators configuration
    this.operators = Object.freeze({
      '+': { precedence: 1, assoc: 'left', arity: 2, unary: false },
      '-': { precedence: 1, assoc: 'left', arity: 2, unary: false },
      '*': { precedence: 2, assoc: 'left', arity: 2, unary: false },
      '/': { precedence: 2, assoc: 'left', arity: 2, unary: false },
      '%': { precedence: 2, assoc: 'left', arity: 2, unary: false },
      '^': { precedence: 3, assoc: 'right', arity: 2, unary: false },
      'u+': { precedence: 4, assoc: 'right', arity: 1, unary: true },
      'u-': { precedence: 4, assoc: 'right', arity: 1, unary: true }
    });

    // Built-in functions with arity limits and domain guards
    this.functions = Object.freeze({
      sqrt: {
        minArgs: 1,
        maxArgs: 1,
        exec: (x) => {
          if (x < 0) throw new Error(`Square root of negative number: ${x}`);
          return Math.sqrt(x);
        }
      },
      log: {
        minArgs: 1,
        maxArgs: 1,
        exec: (x) => {
          if (x <= 0) throw new Error(`Logarithm of non-positive number: ${x}`);
          return Math.log10(x);
        }
      },
      ln: {
        minArgs: 1,
        maxArgs: 1,
        exec: (x) => {
          if (x <= 0) throw new Error(`Natural logarithm of non-positive number: ${x}`);
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
      round: {
        minArgs: 1,
        maxArgs: 2,
        exec: (x, decimals) => {
          if (decimals !== undefined) {
            const dec = Math.max(0, Math.min(12, Math.round(decimals)));
            const factor = Math.pow(10, dec);
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
      min: {
        minArgs: 1,
        maxArgs: Infinity,
        exec: (...args) => {
          if (args.length === 0) throw new Error('Function "min" requires at least 1 argument');
          return Math.min(...args);
        }
      },
      max: {
        minArgs: 1,
        maxArgs: Infinity,
        exec: (...args) => {
          if (args.length === 0) throw new Error('Function "max" requires at least 1 argument');
          return Math.max(...args);
        }
      },
      pow: {
        minArgs: 2,
        maxArgs: 2,
        exec: (base, exponent) => Math.pow(base, exponent)
      }
    });

    this.supportedFunctions = new Set(Object.keys(this.functions));
  }

  static get KPI_PRESETS() {
    return DEVELOPER_KPI_PRESETS;
  }

  // ==========================================
  // EVENT EMITTER
  // ==========================================

  /**
   * Subscribe to engine events ('evaluate', 'error', 'historyChange').
   * @param {string} event
   * @param {Function} handler
   * @returns {Function} Unsubscribe callback
   */
  on(event, handler) {
    if (typeof handler !== 'function') return () => {};
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  /**
   * Unsubscribe a handler from an event.
   * @param {string} event
   * @param {Function} handler
   */
  off(event, handler) {
    if (this.listeners.has(event)) {
      if (handler) {
        this.listeners.get(event).delete(handler);
      } else {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emit an event to registered listeners.
   * @param {string} event
   * @param  {...any} args
   */
  emit(event, ...args) {
    if (this.listeners.has(event)) {
      for (const handler of this.listeners.get(event)) {
        try {
          handler(...args);
        } catch (err) {
          console.error(`[DeveloperPortfolioFormulaParser] Error in "${event}" listener:`, err);
        }
      }
    }
  }

  // ==========================================
  // SYNTAX VALIDATION
  // ==========================================

  /**
   * Validates expression syntax for balanced parentheses, valid operators, and empty parens.
   * @param {string} expr - Expression string
   * @returns {{ valid: boolean, error: string | null }}
   */
  validateSyntax(expr) {
    if (typeof expr !== 'string' || !expr.trim()) {
      return { valid: false, error: 'Expression cannot be empty' };
    }

    const trimmed = expr.trim();

    // 1. Invalid character check
    const invalidCharMatch = trimmed.match(/[^a-zA-Z0-9_\s.+/*^%(),-]/);
    if (invalidCharMatch) {
      return {
        valid: false,
        error: `Invalid character in expression: "${invalidCharMatch[0]}"`
      };
    }

    // 2. Empty parentheses check
    if (/\(\s*\)/.test(trimmed)) {
      return { valid: false, error: 'Empty parentheses detected' };
    }

    // 3. Balanced parentheses check
    let depth = 0;
    for (let i = 0; i < trimmed.length; i++) {
      const char = trimmed[i];
      if (char === '(') {
        depth++;
      } else if (char === ')') {
        depth--;
        if (depth < 0) {
          return { valid: false, error: 'Unbalanced parentheses: unexpected closing ")"' };
        }
      }
    }
    if (depth !== 0) {
      return { valid: false, error: 'Unbalanced parentheses: missing closing ")"' };
    }

    // 4. Consecutive binary operators check (e.g. ++, */, ^^, +-, --, /%)
    if (/[+*/^%-]\s*[+*/^%]/.test(trimmed) || /[+-]\s*-/.test(trimmed)) {
      return { valid: false, error: 'Consecutive operators detected' };
    }

    // 5. Leading / trailing invalid operators
    if (/^[*^%,/]/.test(trimmed)) {
      return { valid: false, error: 'Expression cannot start with a binary operator or comma' };
    }
    if (/[+*^%,/-]$/.test(trimmed)) {
      return { valid: false, error: 'Expression cannot end with an operator or comma' };
    }

    // 6. Token-level structural validation
    try {
      const tokens = this.tokenize(trimmed);
      if (tokens.length === 0) {
        return { valid: false, error: 'Expression yielded no valid tokens' };
      }

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const next = tokens[i + 1];

        // Functions must be followed by '('
        if (token.type === 'FUNCTION') {
          if (!next || next.type !== 'LPAREN') {
            return {
              valid: false,
              error: `Function "${token.value}" must be followed by parentheses`
            };
          }
        }

        // Two consecutive binary operators
        if (
          token.type === 'OPERATOR' &&
          !token.unary &&
          next &&
          next.type === 'OPERATOR' &&
          !next.unary
        ) {
          return {
            valid: false,
            error: `Consecutive binary operators: "${token.value} ${next.value}"`
          };
        }

        // Binary operator directly before comma or closing paren
        if (
          token.type === 'OPERATOR' &&
          !token.unary &&
          next &&
          (next.type === 'COMMA' || next.type === 'RPAREN')
        ) {
          return {
            valid: false,
            error: `Operator "${token.value}" missing right-hand operand`
          };
        }

        // Comma directly before operator or closing paren
        if (
          token.type === 'COMMA' &&
          next &&
          (next.type === 'RPAREN' || (next.type === 'OPERATOR' && !next.unary))
        ) {
          return {
            valid: false,
            error: 'Misplaced comma or missing function argument'
          };
        }
      }

      return { valid: true, error: null };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }

  // ==========================================
  // TOKENIZER
  // ==========================================

  /**
   * Tokenizes mathematical expression string into structured tokens.
   * Handles integers, floats, scientific notation, variables, operators, parentheses, functions, and commas.
   * @param {string} expr
   * @returns {Array<Object>}
   */
  tokenize(expr) {
    if (typeof expr !== 'string') {
      throw new Error('Expression must be a string');
    }

    const tokens = [];
    let i = 0;
    const len = expr.length;

    while (i < len) {
      const char = expr[i];

      // Skip whitespace
      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // 1. Numbers (integers, decimals, scientific notation: 1e4, 2.5e-3, .92)
      if (/\d/.test(char) || (char === '.' && i + 1 < len && /\d/.test(expr[i + 1]))) {
        const remaining = expr.slice(i);
        const match = remaining.match(/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/);
        if (match) {
          const numStr = match[0];
          tokens.push({
            type: 'NUMBER',
            value: parseFloat(numStr),
            raw: numStr
          });
          i += numStr.length;
          continue;
        }
      }

      // 2. Identifiers (functions, constants, or variables)
      if (/[a-zA-Z_]/.test(char)) {
        const remaining = expr.slice(i);
        const match = remaining.match(/^[a-zA-Z_][a-zA-Z0-9_]*/);
        if (match) {
          const identifier = match[0];
          const lowerId = identifier.toLowerCase();

          if (this.supportedFunctions.has(lowerId)) {
            tokens.push({
              type: 'FUNCTION',
              value: lowerId,
              raw: identifier
            });
          } else if (Object.prototype.hasOwnProperty.call(this.constants, identifier)) {
            tokens.push({
              type: 'NUMBER',
              value: this.constants[identifier],
              raw: identifier
            });
          } else {
            tokens.push({
              type: 'VARIABLE',
              value: identifier,
              raw: identifier
            });
          }
          i += identifier.length;
          continue;
        }
      }

      // 3. Parentheses & Comma
      if (char === '(') {
        tokens.push({ type: 'LPAREN', value: '(' });
        i++;
        continue;
      }
      if (char === ')') {
        tokens.push({ type: 'RPAREN', value: ')' });
        i++;
        continue;
      }
      if (char === ',') {
        tokens.push({ type: 'COMMA', value: ',' });
        i++;
        continue;
      }

      // 4. Operators (+, -, *, /, ^, %)
      if (['+', '-', '*', '/', '^', '%'].includes(char)) {
        const prevToken = tokens[tokens.length - 1];
        const isUnary =
          (char === '+' || char === '-') &&
          (!prevToken ||
            prevToken.type === 'OPERATOR' ||
            prevToken.type === 'LPAREN' ||
            prevToken.type === 'COMMA');

        if (isUnary) {
          const opKey = char === '-' ? 'u-' : 'u+';
          const opDef = this.operators[opKey];
          tokens.push({
            type: 'OPERATOR',
            value: opKey,
            precedence: opDef.precedence,
            assoc: opDef.assoc,
            unary: true,
            raw: char
          });
        } else {
          const opDef = this.operators[char];
          tokens.push({
            type: 'OPERATOR',
            value: char,
            precedence: opDef.precedence,
            assoc: opDef.assoc,
            unary: false,
            raw: char
          });
        }
        i++;
        continue;
      }

      throw new Error(`Unexpected character in formula: "${char}" at index ${i}`);
    }

    return tokens;
  }

  // ==========================================
  // SHUNTING-YARD RPN COMPILER
  // ==========================================

  /**
   * Converts token stream into Reverse Polish Notation (RPN) via Shunting-yard algorithm.
   * Respects operator precedence (BODMAS/PEMDAS: ^ > * / % > + -), associativity, and functions.
   * @param {Array<Object>|string} tokensOrExpr
   * @returns {Array<Object>}
   */
  toRPN(tokensOrExpr) {
    const tokens = typeof tokensOrExpr === 'string' ? this.tokenize(tokensOrExpr) : tokensOrExpr;
    if (!Array.isArray(tokens)) {
      throw new Error('toRPN expects an array of tokens or a formula string');
    }

    const outputQueue = [];
    const opStack = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.type === 'NUMBER' || token.type === 'VARIABLE') {
        outputQueue.push(token);
      } else if (token.type === 'FUNCTION') {
        opStack.push({ ...token, argsCount: 1 });
      } else if (token.type === 'COMMA') {
        while (opStack.length > 0 && opStack[opStack.length - 1].type !== 'LPAREN') {
          outputQueue.push(opStack.pop());
        }
        if (opStack.length === 0) {
          throw new Error('Misplaced comma outside of function arguments');
        }

        const lparenIndex = opStack.length - 1;
        if (lparenIndex > 0 && opStack[lparenIndex - 1].type === 'FUNCTION') {
          opStack[lparenIndex - 1].argsCount++;
        }
      } else if (token.type === 'OPERATOR') {
        const o1 = token;

        while (opStack.length > 0) {
          const o2 = opStack[opStack.length - 1];

          if (o2.type === 'OPERATOR') {
            const higherPrec = o2.precedence > o1.precedence;
            const samePrecAndLeft = o2.precedence === o1.precedence && o1.assoc === 'left';

            if (higherPrec || samePrecAndLeft) {
              outputQueue.push(opStack.pop());
              continue;
            }
          }
          break;
        }

        opStack.push(o1);
      } else if (token.type === 'LPAREN') {
        opStack.push(token);
      } else if (token.type === 'RPAREN') {
        let foundLeftParen = false;

        while (opStack.length > 0) {
          const top = opStack.pop();
          if (top.type === 'LPAREN') {
            foundLeftParen = true;
            break;
          }
          outputQueue.push(top);
        }

        if (!foundLeftParen) {
          throw new Error('Mismatched parentheses: missing "("');
        }

        if (opStack.length > 0 && opStack[opStack.length - 1].type === 'FUNCTION') {
          outputQueue.push(opStack.pop());
        }
      }
    }

    while (opStack.length > 0) {
      const op = opStack.pop();
      if (op.type === 'LPAREN' || op.type === 'RPAREN') {
        throw new Error('Mismatched parentheses in expression');
      }
      outputQueue.push(op);
    }

    return outputQueue;
  }

  // ==========================================
  // FORMULA EVALUATOR
  // ==========================================

  /**
   * Evaluates an expression or token stream with dynamic variable injection.
   * Handles division by zero safely and logs calculation to audit history.
   * @param {string|Array<Object>} tokensOrExpr
   * @param {Record<string, number>} [variables={}]
   * @returns {number}
   */
  evaluate(tokensOrExpr, variables = {}) {
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const mergedVars = { ...this.defaultVariables, ...(variables || {}) };

    let rpn;
    let exprString = '';

    try {
      if (typeof tokensOrExpr === 'string') {
        exprString = tokensOrExpr;
        const validation = this.validateSyntax(tokensOrExpr);
        if (!validation.valid) {
          throw new Error(`Syntax Error: ${validation.error}`);
        }
        rpn = this.toRPN(this.tokenize(tokensOrExpr));
      } else if (Array.isArray(tokensOrExpr)) {
        const hasParens = tokensOrExpr.some((t) => t.type === 'LPAREN' || t.type === 'RPAREN');
        rpn = hasParens ? this.toRPN(tokensOrExpr) : tokensOrExpr;
        exprString = tokensOrExpr.map((t) => t.raw || t.value).join(' ');
      } else {
        throw new Error('Invalid input: expected string expression or token array');
      }

      const evalStack = [];

      for (let i = 0; i < rpn.length; i++) {
        const token = rpn[i];

        if (token.type === 'NUMBER') {
          evalStack.push(token.value);
        } else if (token.type === 'VARIABLE') {
          const varName = token.value;
          if (Object.prototype.hasOwnProperty.call(mergedVars, varName)) {
            const val = Number(mergedVars[varName]);
            if (Number.isNaN(val)) {
              throw new Error(`Variable "${varName}" value is not a valid number`);
            }
            evalStack.push(val);
          } else if (Object.prototype.hasOwnProperty.call(this.constants, varName)) {
            evalStack.push(this.constants[varName]);
          } else {
            throw new Error(`Undefined variable: "${varName}"`);
          }
        } else if (token.type === 'OPERATOR') {
          if (token.unary) {
            if (evalStack.length < 1) {
              throw new Error(`Unary operator "${token.value}" missing operand`);
            }
            const a = evalStack.pop();
            evalStack.push(token.value === 'u-' ? -a : +a);
          } else {
            if (evalStack.length < 2) {
              throw new Error(`Binary operator "${token.value}" requires 2 operands`);
            }
            const b = evalStack.pop();
            const a = evalStack.pop();

            switch (token.value) {
              case '+':
                evalStack.push(a + b);
                break;
              case '-':
                evalStack.push(a - b);
                break;
              case '*':
                evalStack.push(a * b);
                break;
              case '/':
                if (b === 0 || Math.abs(b) < 1e-15) {
                  throw new Error('Division by zero');
                }
                evalStack.push(a / b);
                break;
              case '%':
                if (b === 0 || Math.abs(b) < 1e-15) {
                  throw new Error('Division by zero in modulo operation');
                }
                evalStack.push(a % b);
                break;
              case '^':
                evalStack.push(Math.pow(a, b));
                break;
              default:
                throw new Error(`Unsupported operator: "${token.value}"`);
            }
          }
        } else if (token.type === 'FUNCTION') {
          const funcName = token.value.toLowerCase();
          const fnMeta = this.functions[funcName];
          if (!fnMeta) {
            throw new Error(`Unsupported function: "${funcName}"`);
          }

          const argsCount = token.argsCount || 1;
          if (argsCount < fnMeta.minArgs || argsCount > fnMeta.maxArgs) {
            throw new Error(
              `Function "${funcName}" expects between ${fnMeta.minArgs} and ${fnMeta.maxArgs} arguments, received ${argsCount}`
            );
          }

          if (evalStack.length < argsCount) {
            throw new Error(`Function "${funcName}" requires ${argsCount} argument(s) on stack`);
          }

          const args = [];
          for (let a = 0; a < argsCount; a++) {
            args.unshift(evalStack.pop());
          }

          const res = fnMeta.exec(...args);
          evalStack.push(res);
        }
      }

      if (evalStack.length !== 1) {
        throw new Error('Malformed expression: multiple values remained on evaluation stack');
      }

      const rawResult = evalStack[0];
      if (typeof rawResult !== 'number' || Number.isNaN(rawResult) || !Number.isFinite(rawResult)) {
        throw new Error('Expression evaluation resulted in a non-finite value');
      }

      let cleanResult = parseFloat(rawResult.toPrecision(12));
      if (typeof this.options.precision === 'number' && Number.isFinite(cleanResult)) {
        cleanResult = Number(cleanResult.toFixed(this.options.precision));
      }

      const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const executionTimeMs = parseFloat((endTime - startTime).toFixed(3));

      const record = {
        id: `CALC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        expression: exprString,
        variables: { ...mergedVars },
        result: cleanResult,
        rawResult,
        executionTimeMs,
        status: 'SUCCESS',
        error: null
      };

      this.addHistory(record);
      this.emit('evaluate', record);
      this.emit('calculate', record); // Alias compatibility

      return cleanResult;
    } catch (err) {
      const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const executionTimeMs = parseFloat((endTime - startTime).toFixed(3));

      const record = {
        id: `CALC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        expression: exprString,
        variables: { ...mergedVars },
        result: null,
        rawResult: null,
        executionTimeMs,
        status: 'ERROR',
        error: err.message
      };

      this.addHistory(record);
      this.emit('error', record);
      throw err;
    }
  }

  // ==========================================
  // AUDIT & UTILITY METHODS
  // ==========================================

  /**
   * Internal helper to record an entry in calculation audit history.
   * @param {Object} entry
   */
  addHistory(entry) {
    this.history.unshift(entry);
    if (this.history.length > this.maxHistorySize) {
      this.history.pop();
    }
    this.emit('historyChange', [...this.history]);
    this.emit('historyUpdate', [...this.history]); // Alias compatibility
  }

  /**
   * Returns a copy of the calculation audit log.
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
  }

  /**
   * Finds a specific calculation record by ID.
   * @param {string} id
   * @returns {Object|null}
   */
  getCalculationById(id) {
    return this.history.find((item) => item.id === id) || null;
  }

  /**
   * Formats a numerical result with locale commas and max decimal places.
   * @param {number} num
   * @param {number} [decimals=4]
   * @returns {string}
   */
  formatResult(num, decimals = 4) {
    if (typeof num !== 'number' || !Number.isFinite(num)) return 'NaN';
    return num.toLocaleString('en-US', {
      minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
      maximumFractionDigits: decimals
    });
  }
}

// In-browser interactive DOM wiring
if (typeof window !== 'undefined') {
  window.DeveloperPortfolioFormulaParser = DeveloperPortfolioFormulaParser;

  document.addEventListener('DOMContentLoaded', () => {
    const formulaInput = document.getElementById('formulaInput');
    const evaluateBtn = document.getElementById('evaluateBtn');
    const clearBtn = document.getElementById('clearBtn');
    const syntaxBadge = document.getElementById('syntaxBadge');
    const syntaxBadgeText = document.getElementById('syntaxBadgeText');
    const errorBanner = document.getElementById('errorBanner');
    const errorBannerText = document.getElementById('errorBannerText');

    const resultFormatted = document.getElementById('resultFormatted');
    const resultRaw = document.getElementById('resultRaw');
    const resultTokens = document.getElementById('resultTokens');
    const resultLatency = document.getElementById('resultLatency');
    const historyTableBody = document.getElementById('historyTableBody');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const autoCalcToggle = document.getElementById('autoCalcToggle');
    const contrastToggle = document.getElementById('contrastToggle');
    const presetSelect = document.getElementById('presetSelect');

    const varKeys = [
      'total_commits',
      'pull_requests_merged',
      'code_review_score',
      'lines_of_code_shipped',
      'test_coverage_rate',
      'open_source_contributions',
      'bug_resolution_hours',
      'uptime_sla_rate'
    ];

    if (!formulaInput) return;

    const parser = new DeveloperPortfolioFormulaParser();

    function getVariablesFromDOM() {
      const vars = {};
      for (const key of varKeys) {
        const input = document.getElementById(`var_${key}`);
        if (input) {
          vars[key] = parseFloat(input.value) || 0;
        }
      }
      return vars;
    }

    // Synchronize slider and number inputs
    varKeys.forEach((key) => {
      const slider = document.getElementById(`slider_${key}`);
      const numInput = document.getElementById(`var_${key}`);
      if (slider && numInput) {
        slider.addEventListener('input', () => {
          numInput.value = slider.value;
          if (autoCalcToggle?.checked) runEvaluation();
        });
        numInput.addEventListener('input', () => {
          slider.value = numInput.value;
          if (autoCalcToggle?.checked) runEvaluation();
        });
      }
    });

    function runEvaluation() {
      const expr = formulaInput.value.trim();

      if (errorBanner) errorBanner.classList.add('hidden');

      const syntax = parser.validateSyntax(expr);
      if (!syntax.valid) {
        if (syntaxBadge) {
          syntaxBadge.className = 'syntax-badge syntax-invalid';
          if (syntaxBadgeText) syntaxBadgeText.textContent = `⚠ ${syntax.error}`;
        }
        if (errorBanner && errorBannerText) {
          errorBanner.classList.remove('hidden');
          errorBannerText.textContent = syntax.error;
        }
        if (resultFormatted) resultFormatted.textContent = 'ERROR';
        if (resultRaw) resultRaw.textContent = '--';
        return;
      }

      if (syntaxBadge) {
        syntaxBadge.className = 'syntax-badge syntax-valid';
        if (syntaxBadgeText) syntaxBadgeText.textContent = '✓ Syntax Valid';
      }

      const vars = getVariablesFromDOM();

      try {
        const tokens = parser.tokenize(expr);
        const rpn = parser.toRPN(tokens);
        const result = parser.evaluate(expr, vars);

        if (resultFormatted) {
          resultFormatted.textContent = parser.formatResult(result, 4);
        }
        if (resultRaw) {
          resultRaw.textContent = String(result);
        }
        if (resultTokens) {
          resultTokens.textContent = `${tokens.length} tokens • RPN: ${rpn.map((t) => t.raw || t.value).join(' ')}`;
        }
        if (resultLatency) {
          const latest = parser.getHistory()[0];
          resultLatency.textContent = latest ? `${latest.executionTimeMs} ms` : '< 1 ms';
        }
      } catch (err) {
        if (errorBanner && errorBannerText) {
          errorBanner.classList.remove('hidden');
          errorBannerText.textContent = err.message;
        }
        if (resultFormatted) resultFormatted.textContent = 'ERROR';
        if (resultRaw) resultRaw.textContent = '--';
      }
    }

    function renderHistory() {
      if (!historyTableBody) return;
      const history = parser.getHistory();

      if (history.length === 0) {
        historyTableBody.innerHTML =
          '<tr><td colspan="5" class="history-empty">No calculations recorded yet.</td></tr>';
        return;
      }

      historyTableBody.innerHTML = history
        .map(
          (item) => `
        <tr class="${item.status === 'ERROR' ? 'row-error' : ''}">
          <td><span class="calc-id-badge">${item.id}</span></td>
          <td><span class="time-col">${new Date(item.timestamp).toLocaleTimeString()}</span></td>
          <td><code class="formula-code">${escapeHtml(item.expression)}</code></td>
          <td class="res-col"><strong>${item.status === 'SUCCESS' ? parser.formatResult(item.result, 4) : 'ERROR'}</strong></td>
          <td>
            <button type="button" class="btn-restore" data-formula="${encodeURIComponent(item.expression)}">Load</button>
          </td>
        </tr>
      `
        )
        .join('');

      historyTableBody.querySelectorAll('.btn-restore').forEach((btn) => {
        btn.addEventListener('click', () => {
          const formula = decodeURIComponent(btn.getAttribute('data-formula') || '');
          formulaInput.value = formula;
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

    parser.on('historyChange', () => {
      renderHistory();
    });

    // Preset selection via dropdown
    if (presetSelect) {
      presetSelect.addEventListener('change', () => {
        if (presetSelect.value) {
          formulaInput.value = presetSelect.value;
          runEvaluation();
        }
      });
    }

    // Preset pills click
    document.querySelectorAll('[data-preset-formula]').forEach((pill) => {
      pill.addEventListener('click', () => {
        const formula = pill.getAttribute('data-preset-formula');
        if (formula) {
          formulaInput.value = formula;
          if (presetSelect) {
            presetSelect.value = formula;
          }
          runEvaluation();
        }
      });
    });

    // Syntax snippet quick-insert pills
    document.querySelectorAll('[data-insert-snippet]').forEach((pill) => {
      pill.addEventListener('click', () => {
        const snippet = pill.getAttribute('data-insert-snippet');
        if (!snippet) return;

        const start = formulaInput.selectionStart || formulaInput.value.length;
        const end = formulaInput.selectionEnd || formulaInput.value.length;
        const current = formulaInput.value;

        formulaInput.value = current.slice(0, start) + snippet + current.slice(end);
        formulaInput.focus();
        const cursorOffset = snippet.endsWith('()')
          ? snippet.length - 1
          : snippet.endsWith('(,)')
          ? snippet.length - 2
          : snippet.length;
        formulaInput.setSelectionRange(start + cursorOffset, start + cursorOffset);
        runEvaluation();
      });
    });

    evaluateBtn?.addEventListener('click', runEvaluation);

    formulaInput.addEventListener('input', () => {
      if (autoCalcToggle?.checked) {
        runEvaluation();
      } else {
        const syntax = parser.validateSyntax(formulaInput.value);
        if (syntaxBadge) {
          syntaxBadge.className = `syntax-badge ${syntax.valid ? 'syntax-valid' : 'syntax-invalid'}`;
          if (syntaxBadgeText) {
            syntaxBadgeText.textContent = syntax.valid ? '✓ Syntax Valid' : `⚠ ${syntax.error}`;
          }
        }
      }
    });

    clearBtn?.addEventListener('click', () => {
      formulaInput.value = '';
      if (syntaxBadge) {
        syntaxBadge.className = 'syntax-badge';
        if (syntaxBadgeText) syntaxBadgeText.textContent = 'Ready for formula input';
      }
      if (errorBanner) errorBanner.classList.add('hidden');
      if (resultFormatted) resultFormatted.textContent = '0.00';
      if (resultRaw) resultRaw.textContent = '0';
      if (resultTokens) resultTokens.textContent = 'None';
      if (resultLatency) resultLatency.textContent = '0 ms';
    });

    clearHistoryBtn?.addEventListener('click', () => {
      parser.clearHistory();
    });

    // WCAG AAA High Contrast toggle
    contrastToggle?.addEventListener('click', () => {
      document.body.classList.toggle('wcag-high-contrast');
      const isHigh = document.body.classList.contains('wcag-high-contrast');
      contrastToggle.textContent = isHigh ? 'High Contrast: ON' : 'High Contrast: OFF';
      contrastToggle.setAttribute('aria-pressed', isHigh ? 'true' : 'false');
    });

    // Initial evaluation
    runEvaluation();
    renderHistory();
  });
}
