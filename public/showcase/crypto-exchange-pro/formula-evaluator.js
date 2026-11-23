/**
 * CryptoExchangeProFormulaParser
 * Production-grade mathematical expression tokenizer, Shunting-yard compiler,
 * and dynamic quantitative KPI formula evaluator for Crypto Exchange Pro.
 */

export class CryptoExchangeProFormulaParser {
  /**
   * Initializes the formula parser with default crypto KPI variables and configuration.
   * @param {Object} options
   */
  constructor(options = {}) {
    // Default quantitative crypto trading parameters
    this.defaultVariables = {
      order_size: 1.5,
      bid_price: 64250.00,
      ask_price: 64255.50,
      slippage_rate: 0.0015,
      leverage_ratio: 10,
      liquidation_threshold: 0.85,
      maker_fee: 0.0002,
      ...(options.defaultVariables || {})
    };

    // Supported scientific and statistical functions
    this.supportedFunctions = new Set([
      'sqrt',
      'log',
      'ln',
      'exp',
      'abs',
      'min',
      'max',
      'round',
      'floor',
      'ceil'
    ]);

    // Operator definitions with precedence and associativity
    this.operators = {
      '+': { precedence: 1, assoc: 'left', unary: false },
      '-': { precedence: 1, assoc: 'left', unary: false },
      '*': { precedence: 2, assoc: 'left', unary: false },
      '/': { precedence: 2, assoc: 'left', unary: false },
      '%': { precedence: 2, assoc: 'left', unary: false },
      '^': { precedence: 3, assoc: 'right', unary: false },
      'u+': { precedence: 4, assoc: 'right', unary: true },
      'u-': { precedence: 4, assoc: 'right', unary: true }
    };

    // Calculation audit log history
    this.history = [];
    this.maxHistorySize = options.maxHistorySize || 100;

    // Event listener registry
    this.listeners = new Map();
  }

  // ==========================================
  // EVENT EMITTER IMPLEMENTATION
  // ==========================================

  /**
   * Subscribe to an engine event ('evaluate', 'error', 'historyChange').
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
      this.listeners.get(event).delete(handler);
    }
  }

  /**
   * Emit an event to all registered listeners.
   * @param {string} event
   * @param  {...any} args
   */
  emit(event, ...args) {
    if (this.listeners.has(event)) {
      for (const handler of this.listeners.get(event)) {
        try {
          handler(...args);
        } catch (err) {
          console.error(`[CryptoExchangeProFormulaParser] Error in "${event}" listener:`, err);
        }
      }
    }
  }

  // ==========================================
  // SYNTAX VALIDATION
  // ==========================================

  /**
   * Validates mathematical expression syntax prior to evaluation.
   * Checks for balanced parentheses, consecutive operators, invalid characters, and empty expressions.
   * @param {string} expr
   * @returns {{ valid: boolean, error: string | null }}
   */
  validateSyntax(expr) {
    if (typeof expr !== 'string' || !expr.trim()) {
      return { valid: false, error: 'Expression cannot be empty' };
    }

    const trimmed = expr.trim();

    // 1. Invalid character check (only alphanumeric, _, ., +, -, *, /, ^, %, (, ), ,, and whitespace)
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

    // 4. Consecutive operators check (e.g. ++, */, ^^, +-, --)
    if (/[+*/^%-]\s*[+*/^%]/.test(trimmed) || /[+-]\s*-/.test(trimmed)) {
      return { valid: false, error: 'Consecutive operators detected' };
    }

    // 5. Leading / trailing invalid operator check
    if (/^[*^%,/]/.test(trimmed)) {
      return { valid: false, error: 'Expression cannot start with a binary operator or comma' };
    }
    if (/[+*^%,/-]$/.test(trimmed)) {
      return { valid: false, error: 'Expression cannot end with an operator or comma' };
    }

    // 5. Token-level structural validation
    try {
      const tokens = this.tokenize(trimmed);
      if (tokens.length === 0) {
        return { valid: false, error: 'Expression yielded no valid tokens' };
      }

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const next = tokens[i + 1];

        // Functions must be followed immediately by '('
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
   * Handles integers, decimals, scientific notation, variables, operators, parentheses, functions, and commas.
   * @param {string} expr
   * @returns {Array<{ type: string, value: any, raw?: string, precedence?: number, assoc?: string, unary?: boolean }>}
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

      // 1. Numbers (integers, decimals, scientific notation: 1.5e-4, 2e+3, .5)
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

      // 2. Identifiers (functions or variables)
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
        // Detect unary operators:
        // A '+' or '-' is unary if it is at the start of expression or preceded by an operator, '(', or ','
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

      throw new Error(`Unexpected character at position ${i}: "${char}"`);
    }

    return tokens;
  }

  // ==========================================
  // SHUNTING-YARD RPN COMPILER
  // ==========================================

  /**
   * Converts token stream into Reverse Polish Notation (RPN) via Shunting-yard algorithm.
   * Respects operator precedence (BODMAS/PEMDAS: ^ > * / % > + -), associativity, and multi-argument functions.
   * @param {Array|string} tokensOrExpr
   * @returns {Array} Array of RPN tokens
   */
  toRPN(tokensOrExpr) {
    const tokens = typeof tokensOrExpr === 'string' ? this.tokenize(tokensOrExpr) : tokensOrExpr;
    const outputQueue = [];
    const opStack = [];

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      if (token.type === 'NUMBER' || token.type === 'VARIABLE') {
        outputQueue.push(token);
      } else if (token.type === 'FUNCTION') {
        opStack.push({ ...token, argsCount: 1 });
      } else if (token.type === 'COMMA') {
        // Pop operators to output until we hit matching '('
        while (opStack.length > 0 && opStack[opStack.length - 1].type !== 'LPAREN') {
          outputQueue.push(opStack.pop());
        }
        if (opStack.length === 0) {
          throw new Error('Misplaced comma outside function argument list');
        }

        // Increment the arguments count on the function preceding this '('
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

        // If function sits on top of stack, pop it into output queue
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
   * Evaluates an expression or RPN token stream with quantitative variable injection.
   * Handles division by zero, non-finite guards, and returns clean numerical results.
   * @param {string|Array} tokensOrExpr
   * @param {Object} [variables={}]
   * @returns {number}
   */
  evaluate(tokensOrExpr, variables = {}) {
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const mergedVars = { ...this.defaultVariables, ...(variables || {}) };

    try {
      let rpn;
      let exprString = '';

      if (typeof tokensOrExpr === 'string') {
        exprString = tokensOrExpr;
        const validation = this.validateSyntax(tokensOrExpr);
        if (!validation.valid) {
          throw new Error(`Syntax Error: ${validation.error}`);
        }
        rpn = this.toRPN(this.tokenize(tokensOrExpr));
      } else if (Array.isArray(tokensOrExpr)) {
        // Determine if already RPN or infix tokens
        const hasParens = tokensOrExpr.some(t => t.type === 'LPAREN' || t.type === 'RPAREN');
        rpn = hasParens ? this.toRPN(tokensOrExpr) : tokensOrExpr;
        exprString = tokensOrExpr.map(t => t.raw || t.value).join(' ');
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
            if (isNaN(val)) {
              throw new Error(`Variable "${varName}" value is not a valid number`);
            }
            evalStack.push(val);
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
          const argsCount = token.argsCount || 1;

          if (evalStack.length < argsCount) {
            throw new Error(`Function "${funcName}" requires ${argsCount} argument(s)`);
          }

          const args = [];
          for (let a = 0; a < argsCount; a++) {
            args.unshift(evalStack.pop());
          }

          let res;
          switch (funcName) {
            case 'sqrt':
              if (args[0] < 0) {
                throw new Error(`Square root of negative number: ${args[0]}`);
              }
              res = Math.sqrt(args[0]);
              break;
            case 'log':
              if (args[0] <= 0) {
                throw new Error(`Logarithm of non-positive number: ${args[0]}`);
              }
              res = Math.log10(args[0]);
              break;
            case 'ln':
              if (args[0] <= 0) {
                throw new Error(`Natural logarithm of non-positive number: ${args[0]}`);
              }
              res = Math.log(args[0]);
              break;
            case 'exp':
              res = Math.exp(args[0]);
              break;
            case 'abs':
              res = Math.abs(args[0]);
              break;
            case 'round':
              if (args.length >= 2) {
                const precision = Math.max(0, Math.min(10, Math.round(args[1])));
                const factor = Math.pow(10, precision);
                res = Math.round(args[0] * factor) / factor;
              } else {
                res = Math.round(args[0]);
              }
              break;
            case 'floor':
              res = Math.floor(args[0]);
              break;
            case 'ceil':
              res = Math.ceil(args[0]);
              break;
            case 'min':
              res = Math.min(...args);
              break;
            case 'max':
              res = Math.max(...args);
              break;
            default:
              throw new Error(`Unsupported function: "${funcName}"`);
          }
          evalStack.push(res);
        }
      }

      if (evalStack.length !== 1) {
        throw new Error('Malformed expression: invalid operand/operator count');
      }

      const rawResult = evalStack[0];
      if (typeof rawResult !== 'number' || isNaN(rawResult) || !Number.isFinite(rawResult)) {
        throw new Error('Expression evaluation resulted in a non-finite value');
      }

      // Floating-point precision stabilization for financial/quant clean numbers
      const cleanResult = parseFloat(rawResult.toPrecision(12));

      const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const executionTimeMs = parseFloat((endTime - startTime).toFixed(3));

      // Create history record
      const record = {
        id: `CALC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        timestamp: new Date().toISOString(),
        expression: exprString,
        variables: { ...mergedVars },
        result: cleanResult,
        rawResult,
        executionTimeMs
      };

      this.history.unshift(record);
      if (this.history.length > this.maxHistorySize) {
        this.history.pop();
      }

      this.emit('evaluate', record);
      this.emit('historyChange', [...this.history]);

      return cleanResult;
    } catch (err) {
      this.emit('error', {
        error: err.message,
        expression: typeof tokensOrExpr === 'string' ? tokensOrExpr : '',
        variables: mergedVars
      });
      throw err;
    }
  }

  // ==========================================
  // AUDIT & UTILITY METHODS
  // ==========================================

  /**
   * Retrieves a copy of the calculation audit log.
   * @returns {Array<Object>}
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Clears the calculation audit log.
   */
  clearHistory() {
    this.history = [];
    this.emit('historyChange', []);
  }

  /**
   * Formats a number with commas and specified decimal places.
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

  /**
   * Standard quantitative crypto KPI formulas dictionary.
   */
  static get KPI_PRESETS() {
    return {
      initial_margin: {
        title: 'Initial Position Margin',
        formula: '(order_size * bid_price) / leverage_ratio',
        desc: 'Margin collateral required to initiate a leveraged perpetual contract.'
      },
      liquidation_price: {
        title: 'Estimated Liquidation Price',
        formula: 'bid_price * (1 - (1 / leverage_ratio) + liquidation_threshold * 0.01)',
        desc: 'Price threshold where maintenance margin triggers automated liquidation.'
      },
      slippage_impact: {
        title: 'Market Impact & Slippage Cost',
        formula: 'order_size * bid_price * slippage_rate',
        desc: 'Capital loss incurred from orderbook depth execution slippage.'
      },
      maker_fee_total: {
        title: 'Maker Protocol Fee',
        formula: 'order_size * bid_price * maker_fee',
        desc: 'Exchange trading fee assessed on passive limit fills.'
      },
      bid_ask_spread: {
        title: 'Orderbook Bid-Ask Spread',
        formula: 'abs(ask_price - bid_price)',
        desc: 'Direct liquidity gap between highest buyer and lowest seller.'
      },
      position_notional: {
        title: 'Position Notional Value',
        formula: 'order_size * bid_price',
        desc: 'Gross underlying asset value of perpetual contract position.'
      },
      expected_pnl: {
        title: 'Projected Net PnL',
        formula: '(ask_price - bid_price) * order_size - (order_size * bid_price * maker_fee)',
        desc: 'Net realized profit after spread capture and exchange fee deduction.'
      },
      volatility_weight: {
        title: 'Volatility Scaled Weight',
        formula: 'round(sqrt(order_size * 100) * log(bid_price), 2)',
        desc: 'Dynamic risk weighting scaled by square root of size and logarithmic price.'
      }
    };
  }
}

// In-browser interactive DOM wiring
if (typeof window !== 'undefined') {
  window.CryptoExchangeProFormulaParser = CryptoExchangeProFormulaParser;

  document.addEventListener('DOMContentLoaded', () => {
    const formulaInput = document.getElementById('formulaInput');
    const evaluateBtn = document.getElementById('evaluateBtn');
    const clearBtn = document.getElementById('clearBtn');
    const syntaxBanner = document.getElementById('syntaxBanner');
    const syntaxBannerText = document.getElementById('syntaxBannerText');
    const errorWarningBanner = document.getElementById('errorWarningBanner');
    const errorMessageText = document.getElementById('errorMessageText');

    const resultFormatted = document.getElementById('resultFormatted');
    const resultRaw = document.getElementById('resultRaw');
    const resultRPN = document.getElementById('resultRPN');
    const resultExecTime = document.getElementById('resultExecTime');
    const historyTableBody = document.getElementById('historyTableBody');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');
    const autoCalcToggle = document.getElementById('autoCalcToggle');
    const contrastToggle = document.getElementById('contrastToggle');

    // Variable slider and number inputs
    const varKeys = [
      'order_size',
      'bid_price',
      'ask_price',
      'slippage_rate',
      'leverage_ratio',
      'liquidation_threshold',
      'maker_fee'
    ];

    if (!formulaInput) return; // Exit if elements not present on this page

    const parser = new CryptoExchangeProFormulaParser();

    // Collect current variable inputs from DOM
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

    // Synchronize slider and number input
    varKeys.forEach(key => {
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

    // Run evaluation and update DOM
    function runEvaluation() {
      const expr = formulaInput.value.trim();

      // Clear error states
      if (errorWarningBanner) errorWarningBanner.classList.add('hidden');

      const syntax = parser.validateSyntax(expr);
      if (!syntax.valid) {
        if (syntaxBanner) {
          syntaxBanner.className = 'syntax-banner syntax-invalid';
          if (syntaxBannerText) syntaxBannerText.textContent = `⚠ ${syntax.error}`;
        }
        if (errorWarningBanner && errorMessageText) {
          errorWarningBanner.classList.remove('hidden');
          errorMessageText.textContent = syntax.error;
        }
        return;
      }

      if (syntaxBanner) {
        syntaxBanner.className = 'syntax-banner syntax-valid';
        if (syntaxBannerText) syntaxBannerText.textContent = '✓ Syntax Valid';
      }

      const vars = getVariablesFromDOM();

      try {
        const tokens = parser.tokenize(expr);
        const rpn = parser.toRPN(tokens);
        const result = parser.evaluate(expr, vars);

        if (resultFormatted) {
          resultFormatted.textContent = parser.formatResult(result, 6);
        }
        if (resultRaw) {
          resultRaw.textContent = String(result);
        }
        if (resultRPN) {
          resultRPN.textContent = rpn.map(t => t.raw || t.value).join(' ');
        }
        if (resultExecTime) {
          const latest = parser.getHistory()[0];
          resultExecTime.textContent = latest ? `${latest.executionTimeMs} ms` : '< 1 ms';
        }
      } catch (err) {
        if (errorWarningBanner && errorMessageText) {
          errorWarningBanner.classList.remove('hidden');
          errorMessageText.textContent = err.message;
        }
        if (resultFormatted) resultFormatted.textContent = 'ERROR';
      }
    }

    // Render calculation history feed
    function renderHistory() {
      if (!historyTableBody) return;
      const history = parser.getHistory();

      if (history.length === 0) {
        historyTableBody.innerHTML = `<tr><td colspan="5" class="history-empty">No calculations recorded yet.</td></tr>`;
        return;
      }

      historyTableBody.innerHTML = history
        .map(
          item => `
        <tr>
          <td><span class="calc-id-badge">${item.id}</span></td>
          <td><span class="time-col">${new Date(item.timestamp).toLocaleTimeString()}</span></td>
          <td><code class="formula-code">${escapeHtml(item.expression)}</code></td>
          <td class="res-col"><strong>${parser.formatResult(item.result, 4)}</strong></td>
          <td>
            <button type="button" class="btn-restore" data-formula="${encodeURIComponent(item.expression)}">Load</button>
          </td>
        </tr>
      `
        )
        .join('');

      historyTableBody.querySelectorAll('.btn-restore').forEach(btn => {
        btn.addEventListener('click', () => {
          const formula = decodeURIComponent(btn.getAttribute('data-formula') || '');
          formulaInput.value = formula;
          runEvaluation();
        });
      });
    }

    function escapeHtml(str) {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    // Subscribe to parser history changes
    parser.on('historyChange', () => {
      renderHistory();
    });

    // Preset pills click handling
    document.querySelectorAll('[data-preset-formula]').forEach(pill => {
      pill.addEventListener('click', () => {
        const formula = pill.getAttribute('data-preset-formula');
        if (formula) {
          formulaInput.value = formula;
          runEvaluation();
        }
      });
    });

    // Syntax snippet pills insertion
    document.querySelectorAll('[data-insert-snippet]').forEach(pill => {
      pill.addEventListener('click', () => {
        const snippet = pill.getAttribute('data-insert-snippet');
        if (!snippet) return;

        const start = formulaInput.selectionStart || formulaInput.value.length;
        const end = formulaInput.selectionEnd || formulaInput.value.length;
        const current = formulaInput.value;

        formulaInput.value = current.slice(0, start) + snippet + current.slice(end);
        formulaInput.focus();
        const cursorOffset = snippet.endsWith('()') ? snippet.length - 1 : snippet.length;
        formulaInput.setSelectionRange(start + cursorOffset, start + cursorOffset);
        runEvaluation();
      });
    });

    // Evaluate button click
    evaluateBtn?.addEventListener('click', runEvaluation);

    // Live validation on formula input typing
    formulaInput.addEventListener('input', () => {
      if (autoCalcToggle?.checked) {
        runEvaluation();
      } else {
        const syntax = parser.validateSyntax(formulaInput.value);
        if (syntaxBanner) {
          syntaxBanner.className = `syntax-banner ${syntax.valid ? 'syntax-valid' : 'syntax-invalid'}`;
          if (syntaxBannerText) {
            syntaxBannerText.textContent = syntax.valid ? '✓ Syntax Valid' : `⚠ ${syntax.error}`;
          }
        }
      }
    });

    // Clear button
    clearBtn?.addEventListener('click', () => {
      formulaInput.value = '';
      if (syntaxBanner) {
        syntaxBanner.className = 'syntax-banner';
        if (syntaxBannerText) syntaxBannerText.textContent = 'Ready for formula input';
      }
      if (errorWarningBanner) errorWarningBanner.classList.add('hidden');
      if (resultFormatted) resultFormatted.textContent = '0.00';
      if (resultRaw) resultRaw.textContent = '0';
      if (resultRPN) resultRPN.textContent = 'None';
      if (resultExecTime) resultExecTime.textContent = '0 ms';
    });

    // Clear history
    clearHistoryBtn?.addEventListener('click', () => {
      parser.clearHistory();
    });

    // WCAG AAA High Contrast mode toggle
    contrastToggle?.addEventListener('click', () => {
      document.body.classList.toggle('high-contrast');
      const isHigh = document.body.classList.contains('high-contrast');
      contrastToggle.textContent = isHigh ? 'High Contrast: ON' : 'High Contrast: OFF';
      contrastToggle.setAttribute('aria-pressed', isHigh ? 'true' : 'false');
    });

    // Initial run
    runEvaluation();
    renderHistory();
  });
}
