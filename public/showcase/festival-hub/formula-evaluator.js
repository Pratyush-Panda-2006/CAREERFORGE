/**
 * Festival Hub - Mathematical Expression Parser & Dynamic KPI Formula Calculator
 * Safe in-browser mathematical expression tokenizer and evaluator supporting
 * operator precedence (BODMAS/PEMDAS), right-associative exponentiation,
 * standard mathematical functions, variable injection, and division-by-zero guards.
 */

export const DEFAULT_VARIABLES = {
  general_admission_price: 150.00,
  vip_ticket_price: 350.00,
  ga_attendees: 12000,
  vip_attendees: 1500,
  artist_budget: 850000.00,
  production_overhead: 350000.00,
  beverage_spend_per_head: 45.00,
  merchandise_spend_per_head: 25.00,
  sponsorship_revenue: 250000.00,
  venue_capacity: 15000
};

export const KPI_PRESETS = [
  {
    id: 'ticket_revenue',
    name: 'Total Ticket Revenue',
    formula: '(general_admission_price * ga_attendees) + (vip_ticket_price * vip_attendees)',
    category: 'Revenue',
    description: 'Gross income from GA and VIP ticket sales',
    unit: '$'
  },
  {
    id: 'concessions_merch',
    name: 'Total Concessions & Merch',
    formula: '(ga_attendees + vip_attendees) * (beverage_spend_per_head + merchandise_spend_per_head)',
    category: 'On-site Sales',
    description: 'Food, beverage, and merchandise revenue across all attendees',
    unit: '$'
  },
  {
    id: 'gross_revenue',
    name: 'Gross Festival Revenue',
    formula: '(general_admission_price * ga_attendees) + (vip_ticket_price * vip_attendees) + ((ga_attendees + vip_attendees) * (beverage_spend_per_head + merchandise_spend_per_head)) + sponsorship_revenue',
    category: 'Total Revenue',
    description: 'Combined ticket, concessions, merch, and corporate sponsorship revenue',
    unit: '$'
  },
  {
    id: 'net_profit',
    name: 'Net Festival Profit',
    formula: '((general_admission_price * ga_attendees) + (vip_ticket_price * vip_attendees) + sponsorship_revenue) - (artist_budget + production_overhead)',
    category: 'Profitability',
    description: 'Primary revenue minus artist talent costs and production overhead',
    unit: '$'
  },
  {
    id: 'capacity_utilization',
    name: 'Venue Capacity Utilization (%)',
    formula: '((ga_attendees + vip_attendees) / venue_capacity) * 100',
    category: 'Operations',
    description: 'Percentage of venue capacity occupied by attendees',
    unit: '%'
  },
  {
    id: 'artist_cost_per_attendee',
    name: 'Artist Cost Per Attendee',
    formula: 'artist_budget / (ga_attendees + vip_attendees)',
    category: 'Cost Efficiency',
    description: 'Headline and stage talent spend normalized per attendee',
    unit: '$/pax'
  }
];

export const SUPPORTED_FUNCTIONS = {
  sqrt: {
    args: 1,
    exec: (x) => {
      if (x < 0) throw new Error('Square root of negative number is undefined in real numbers');
      return Math.sqrt(x);
    }
  },
  log: {
    args: 1,
    exec: (x) => {
      if (x <= 0) throw new Error('Logarithm of non-positive number is undefined');
      return Math.log10(x);
    }
  },
  ln: {
    args: 1,
    exec: (x) => {
      if (x <= 0) throw new Error('Natural logarithm of non-positive number is undefined');
      return Math.log(x);
    }
  },
  exp: {
    args: 1,
    exec: (x) => Math.exp(x)
  },
  abs: {
    args: 1,
    exec: (x) => Math.abs(x)
  },
  min: {
    minArgs: 1,
    exec: (...args) => Math.min(...args)
  },
  max: {
    minArgs: 1,
    exec: (...args) => Math.max(...args)
  },
  round: {
    args: 1,
    exec: (x) => Math.round(x)
  },
  floor: {
    args: 1,
    exec: (x) => Math.floor(x)
  },
  ceil: {
    args: 1,
    exec: (x) => Math.ceil(x)
  },
  pow: {
    args: 2,
    exec: (base, exponent) => Math.pow(base, exponent)
  }
};

export class FestivalHubFormulaParser {
  constructor(defaultVariables = DEFAULT_VARIABLES) {
    this.name = 'FestivalHubFormulaParser';
    this.defaultVariables = { ...defaultVariables };
    this.presets = [...KPI_PRESETS];
    this.history = [];
    this.maxHistoryLength = 50;

    this.operators = {
      '+': { precedence: 1, associativity: 'L', exec: (a, b) => a + b },
      '-': { precedence: 1, associativity: 'L', exec: (a, b) => a - b },
      '*': { precedence: 2, associativity: 'L', exec: (a, b) => a * b },
      '/': {
        precedence: 2,
        associativity: 'L',
        exec: (a, b) => {
          if (b === 0) throw new Error('Division by zero is undefined');
          return a / b;
        }
      },
      '%': {
        precedence: 2,
        associativity: 'L',
        exec: (a, b) => {
          if (b === 0) throw new Error('Division by zero in modulo operation');
          return a % b;
        }
      },
      '^': { precedence: 3, associativity: 'R', exec: (a, b) => Math.pow(a, b) },
      'NEG': { precedence: 2.5, associativity: 'R', exec: (a) => -a }
    };

    this.events = {
      evaluate: [],
      error: [],
      historyChange: []
    };
  }

  /**
   * Subscribe to event emitter.
   * @param {'evaluate'|'error'|'historyChange'} event
   * @param {Function} listener
   * @returns {Function} unsubscribe
   */
  on(event, listener) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(listener);
    return () => this.off(event, listener);
  }

  /**
   * Unsubscribe from event emitter.
   * @param {'evaluate'|'error'|'historyChange'} event
   * @param {Function} listener
   */
  off(event, listener) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(fn => fn !== listener);
  }

  /**
   * Emit event to all registered listeners.
   * @param {'evaluate'|'error'|'historyChange'} event
   * @param  {...any} args
   */
  emit(event, ...args) {
    if (!this.events[event]) return;
    for (const listener of this.events[event]) {
      try {
        listener(...args);
      } catch (err) {
        console.error(`Error in event listener for ${event}:`, err);
      }
    }
  }

  /**
   * Tokenizes mathematical expression string into numbers, variables, functions, operators, commas, and parens.
   * Handles integers, floats, scientific notation (e.g. 1e5, 2.5e-3), and unary plus/minus.
   * @param {string} expr
   * @returns {Array<{ type: string, value: any, raw?: string }>}
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

      // 2. Numbers (integers, floats, scientific notation like 1e5, 2.5e-3)
      if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(sanitized[i + 1] || ''))) {
        const numMatch = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(sanitized.slice(i));
        if (numMatch) {
          const numStr = numMatch[0];
          tokens.push({ type: 'number', value: parseFloat(numStr), raw: numStr });
          i += numStr.length;
          continue;
        }
      }

      // 3. Unary minus or unary plus detection
      if (char === '-' || char === '+') {
        const prev = tokens[tokens.length - 1];
        const isUnary = !prev ||
          prev.type === 'operator' ||
          prev.type === 'unary' ||
          prev.value === '(' ||
          prev.type === 'comma';

        if (isUnary) {
          if (char === '-') {
            tokens.push({ type: 'unary', value: 'NEG' });
          }
          // Unary plus is a mathematical no-op; skip it
          i++;
          continue;
        }
      }

      // 4. Binary Operators (+, -, *, /, %, ^)
      if ('+-*/%^'.includes(char)) {
        tokens.push({ type: 'operator', value: char });
        i++;
        continue;
      }

      // 5. Parentheses
      if (char === '(' || char === ')') {
        tokens.push({ type: 'paren', value: char });
        i++;
        continue;
      }

      // 6. Comma (for multi-argument functions)
      if (char === ',') {
        tokens.push({ type: 'comma', value: ',' });
        i++;
        continue;
      }

      // 7. Identifiers (functions or variable names)
      if (/[a-zA-Z_]/.test(char)) {
        let identifier = '';
        while (i < sanitized.length && /[a-zA-Z0-9_]/.test(sanitized[i])) {
          identifier += sanitized[i];
          i++;
        }

        const lower = identifier.toLowerCase();
        if (Object.prototype.hasOwnProperty.call(SUPPORTED_FUNCTIONS, lower)) {
          tokens.push({ type: 'function', value: lower });
        } else {
          tokens.push({ type: 'variable', value: identifier });
        }
        continue;
      }

      throw new Error(`Unexpected character in formula: "${char}" at index ${i}`);
    }

    return tokens;
  }

  /**
   * Validates expression syntax, parentheses balance, operator positioning, and operand completeness.
   * @param {string} expr
   * @returns {{ valid: boolean, error?: string }}
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

    // Check parentheses balance and comma scope
    let parenDepth = 0;
    for (const token of tokens) {
      if (token.value === '(') parenDepth++;
      if (token.value === ')') parenDepth--;
      if (parenDepth < 0) {
        return { valid: false, error: 'Mismatched closing parenthesis without matching opener' };
      }
      if (token.type === 'comma' && parenDepth === 0) {
        return { valid: false, error: 'Comma operator used outside function argument list' };
      }
    }
    if (parenDepth !== 0) {
      return { valid: false, error: 'Unclosed opening parenthesis in formula' };
    }

    // Check boundary operators
    const first = tokens[0];
    const last = tokens[tokens.length - 1];

    if (first.type === 'operator') {
      return { valid: false, error: `Expression cannot begin with operator "${first.value}"` };
    }
    if (first.type === 'comma') {
      return { valid: false, error: 'Expression cannot begin with a comma' };
    }

    if (last.type === 'operator' || last.type === 'unary') {
      return { valid: false, error: `Expression cannot end with dangling operator "${last.value}"` };
    }
    if (last.type === 'comma') {
      return { valid: false, error: 'Expression cannot end with a trailing comma' };
    }
    if (last.type === 'function') {
      return { valid: false, error: `Expression cannot end with dangling function "${last.value}"` };
    }
    if (last.value === '(') {
      return { valid: false, error: 'Expression cannot end with unclosed opening parenthesis' };
    }

    // Check adjacent tokens
    for (let i = 0; i < tokens.length - 1; i++) {
      const current = tokens[i];
      const next = tokens[i + 1];

      // Consecutive binary operators: e.g. 2 + * 3
      if (current.type === 'operator' && next.type === 'operator') {
        return { valid: false, error: `Consecutive operators "${current.value}${next.value}" are not allowed` };
      }

      // Operator immediately after '(' e.g. ( * 3 )
      if (current.value === '(' && next.type === 'operator') {
        return { valid: false, error: `Operator "${next.value}" immediately following opening parenthesis` };
      }

      // Operator immediately before ')' e.g. ( 3 + )
      if (current.type === 'operator' && next.value === ')') {
        return { valid: false, error: `Dangling operator "${current.value}" before closing parenthesis` };
      }

      // Unary operator immediately before ')' e.g. ( 3 + - )
      if (current.type === 'unary' && next.value === ')') {
        return { valid: false, error: 'Dangling unary operator before closing parenthesis' };
      }

      // Empty parentheses ()
      if (current.value === '(' && next.value === ')') {
        return { valid: false, error: 'Empty parentheses pair "()" is invalid' };
      }

      // Function must be immediately followed by '('
      if (current.type === 'function' && next.value !== '(') {
        return { valid: false, error: `Function "${current.value}" must be followed by "("` };
      }

      // Comma placement checks
      if (current.value === '(' && next.type === 'comma') {
        return { valid: false, error: 'Leading comma in parameter list is invalid' };
      }
      if (current.type === 'comma' && next.value === ')') {
        return { valid: false, error: 'Trailing comma before closing parenthesis is invalid' };
      }
      if (current.type === 'comma' && next.type === 'comma') {
        return { valid: false, error: 'Consecutive commas in parameter list are invalid' };
      }

      // Missing operators between adjacent values
      const isValueCurrent = current.type === 'number' || current.type === 'variable';
      const isValueNext = next.type === 'number' || next.type === 'variable' || next.type === 'function';

      if (isValueCurrent && isValueNext) {
        return { valid: false, error: `Missing operator between "${current.value}" and "${next.value}"` };
      }
      if (isValueCurrent && next.value === '(') {
        return { valid: false, error: `Missing operator between "${current.value}" and "("` };
      }
      if (current.value === ')' && isValueNext) {
        return { valid: false, error: `Missing operator after ")" before "${next.value}"` };
      }
      if (current.value === ')' && next.value === '(') {
        return { valid: false, error: 'Missing operator between ")" and "("' };
      }
    }

    return { valid: true };
  }

  /**
   * Converts token array to Reverse Polish Notation (RPN) using Dijkstra's Shunting-Yard algorithm.
   * Respects BODMAS/PEMDAS precedence, right-associative power (^), functions, and unary operators.
   * @param {Array<object>} tokens
   * @returns {Array<object>} RPN token list
   */
  toRPN(tokens) {
    const outputQueue = [];
    const operatorStack = [];
    const argCountStack = [];

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
          throw new Error('Misplaced comma or mismatched parentheses');
        }
        if (argCountStack.length > 0) {
          argCountStack[argCountStack.length - 1]++;
        }
      } else if (token.type === 'unary') {
        // Unary prefix operator (NEG) is pushed directly without popping pending binary operators
        operatorStack.push(token);
      } else if (token.type === 'operator') {
        const op1 = token.value;
        const op1Meta = this.operators[op1];

        while (operatorStack.length > 0) {
          const top = operatorStack[operatorStack.length - 1];
          if (top.value === '(') break;

          const op2Meta = this.operators[top.value];
          if (!op2Meta) break;

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
        const prev = tokens[i - 1];
        if (prev && prev.type === 'function') {
          argCountStack.push(1);
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

        // If a function was immediately preceding this paren pair, pop it to outputQueue
        if (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].type === 'function') {
          const fnToken = operatorStack.pop();
          const argCount = argCountStack.length > 0 ? argCountStack.pop() : 1;
          outputQueue.push({ ...fnToken, args: argCount });
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
   * Evaluates mathematical formula with dynamic variable injection and function evaluation.
   * @param {string|Array<object>} input - Raw mathematical expression or token array
   * @param {Record<string, number>} [variables={}] - Optional variable overrides
   * @returns {number} Evaluated result
   */
  evaluate(input, variables = {}) {
    const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    let tokens;
    const rawExpr = typeof input === 'string' ? input : '';

    try {
      if (typeof input === 'string') {
        const syntax = this.validateSyntax(input);
        if (!syntax.valid) {
          throw new Error(`Syntax Error: ${syntax.error}`);
        }
        tokens = this.tokenize(input);
      } else if (Array.isArray(input)) {
        tokens = input;
      } else {
        throw new Error('Invalid evaluate input: expected string expression or token array');
      }

      const rpn = this.toRPN(tokens);
      const evalStack = [];
      const activeVars = { ...this.defaultVariables, ...variables };

      for (const token of rpn) {
        if (token.type === 'number') {
          evalStack.push(token.value);
        } else if (token.type === 'variable') {
          const varName = token.value;
          if (Object.prototype.hasOwnProperty.call(activeVars, varName)) {
            const num = Number(activeVars[varName]);
            if (Number.isNaN(num)) {
              throw new Error(`Variable "${varName}" is not a valid number`);
            }
            evalStack.push(num);
          } else {
            throw new Error(`Variable "${varName}" is undefined in parameter context`);
          }
        } else if (token.type === 'unary') {
          if (evalStack.length < 1) {
            throw new Error('Malformed expression: insufficient operand for unary negation');
          }
          const val = evalStack.pop();
          evalStack.push(-val);
        } else if (token.type === 'operator') {
          if (evalStack.length < 2) {
            throw new Error(`Malformed expression: insufficient operands for operator "${token.value}"`);
          }
          const b = evalStack.pop();
          const a = evalStack.pop();
          const opMeta = this.operators[token.value];
          evalStack.push(opMeta.exec(a, b));
        } else if (token.type === 'function') {
          const fnMeta = SUPPORTED_FUNCTIONS[token.value];
          if (!fnMeta) {
            throw new Error(`Unknown function "${token.value}"`);
          }
          const argCount = token.args || 1;
          if (fnMeta.args !== undefined && argCount !== fnMeta.args) {
            throw new Error(`Function "${token.value}" requires ${fnMeta.args} argument(s), but received ${argCount}`);
          }
          if (fnMeta.minArgs !== undefined && argCount < fnMeta.minArgs) {
            throw new Error(`Function "${token.value}" requires at least ${fnMeta.minArgs} argument(s)`);
          }
          if (evalStack.length < argCount) {
            throw new Error(`Insufficient operands on stack for function "${token.value}"`);
          }

          const args = [];
          for (let k = 0; k < argCount; k++) {
            args.unshift(evalStack.pop());
          }
          const res = fnMeta.exec(...args);
          if (typeof res !== 'number' || Number.isNaN(res)) {
            throw new Error(`Function "${token.value}" evaluated to invalid number`);
          }
          evalStack.push(res);
        }
      }

      if (evalStack.length !== 1) {
        throw new Error('Malformed expression: multiple unresolved values on evaluation stack');
      }

      const result = evalStack[0];
      const endTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const latencyMs = Math.round((endTime - startTime) * 100) / 100;

      // Audit History entry
      const historyEntry = {
        id: `calc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        expression: rawExpr || tokens.map(t => t.raw || t.value).join(' '),
        variables: { ...activeVars },
        result,
        latencyMs,
        tokenCount: tokens.length
      };

      this.history.unshift(historyEntry);
      if (this.history.length > this.maxHistoryLength) {
        this.history.pop();
      }

      this.emit('evaluate', historyEntry);
      this.emit('historyChange', [...this.history]);

      return result;
    } catch (err) {
      this.emit('error', { error: err.message, expression: rawExpr, variables });
      throw err;
    }
  }

  /**
   * Retrieves calculation audit history log.
   * @returns {Array<object>}
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Clears calculation audit history log.
   */
  clearHistory() {
    this.history = [];
    this.emit('historyChange', []);
  }

  /**
   * Formats a numeric result with currency, percentage, or commas.
   * @param {number} value
   * @param {string} [unit='']
   * @returns {string}
   */
  formatResult(value, unit = '') {
    if (typeof value !== 'number' || Number.isNaN(value)) return '—';

    let formatted;
    if (Math.abs(value) >= 1000) {
      formatted = value.toLocaleString('en-US', {
        minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
        maximumFractionDigits: 2
      });
    } else if (Number.isInteger(value)) {
      formatted = String(value);
    } else {
      formatted = value.toFixed(2);
    }

    if (unit === '$') return `$${formatted}`;
    if (unit === '%') return `${formatted}%`;
    if (unit) return `${formatted} ${unit}`;
    return formatted;
  }
}

// Browser DOM controller for Festival Hub KPI Workbench
export function initFestivalHubWorkbench() {
  if (typeof document === 'undefined') return;

  const parser = new FestivalHubFormulaParser();

  const formulaInput = document.getElementById('formula-input');
  const evaluateBtn = document.getElementById('evaluate-btn');
  const clearBtn = document.getElementById('clear-btn');
  const resetVarsBtn = document.getElementById('reset-vars-btn');
  const warningBanner = document.getElementById('warning-banner');
  const syntaxBadge = document.getElementById('syntax-badge');
  const resultDisplay = document.getElementById('result-display');
  const rawResultDisplay = document.getElementById('raw-result');
  const tokenCountDisplay = document.getElementById('token-count');
  const latencyDisplay = document.getElementById('eval-latency');
  const tokenStream = document.getElementById('token-stream');
  const rpnStream = document.getElementById('rpn-stream');
  const historyList = document.getElementById('history-list');
  const clearHistoryBtn = document.getElementById('clear-history-btn');
  const highContrastToggle = document.getElementById('high-contrast-toggle');
  const presetButtons = document.querySelectorAll('.preset-btn');
  const varSliders = document.querySelectorAll('.var-slider');
  const varInputs = document.querySelectorAll('.var-num-input');

  let activeUnit = '$';

  function getVariables() {
    const vars = {};
    varInputs.forEach((input) => {
      const name = input.getAttribute('data-var');
      if (name) {
        vars[name] = parseFloat(input.value) || 0;
      }
    });
    return vars;
  }

  function setVariables(vars) {
    varInputs.forEach((input) => {
      const name = input.getAttribute('data-var');
      if (name && vars[name] !== undefined) {
        input.value = vars[name];
        const slider = document.querySelector(`.var-slider[data-var="${name}"]`);
        if (slider) slider.value = vars[name];
      }
    });
  }

  function updateSyntaxStatus() {
    const expr = formulaInput?.value || '';
    if (!expr.trim()) {
      if (syntaxBadge) {
        syntaxBadge.textContent = 'Empty Formula';
        syntaxBadge.className = 'syntax-badge badge-neutral';
      }
      return;
    }

    const check = parser.validateSyntax(expr);
    if (syntaxBadge) {
      if (check.valid) {
        syntaxBadge.textContent = 'Syntax Valid';
        syntaxBadge.className = 'syntax-badge badge-valid';
      } else {
        syntaxBadge.textContent = 'Syntax Error';
        syntaxBadge.className = 'syntax-badge badge-invalid';
      }
    }
  }

  function renderHistory(history) {
    if (!historyList) return;
    if (history.length === 0) {
      historyList.innerHTML = '<div class="empty-history">No calculations recorded yet.</div>';
      return;
    }

    historyList.innerHTML = history.slice(0, 10).map((entry) => `
      <div class="history-item" data-id="${entry.id}">
        <div class="history-meta">
          <span class="history-time">${new Date(entry.timestamp).toLocaleTimeString()}</span>
          <span class="history-latency">${entry.latencyMs} ms</span>
        </div>
        <div class="history-expr" title="${entry.expression}">${entry.expression}</div>
        <div class="history-bottom">
          <span class="history-result">= ${typeof entry.result === 'number' ? entry.result.toLocaleString() : entry.result}</span>
          <button type="button" class="history-load-btn" data-expr="${encodeURIComponent(entry.expression)}" data-vars='${JSON.stringify(entry.variables)}'>Replay</button>
        </div>
      </div>
    `).join('');

    // Attach replay buttons
    historyList.querySelectorAll('.history-load-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const expr = decodeURIComponent(btn.getAttribute('data-expr') || '');
        const rawVars = btn.getAttribute('data-vars');
        if (formulaInput && expr) formulaInput.value = expr;
        if (rawVars) {
          try {
            const vars = JSON.parse(rawVars);
            setVariables(vars);
          } catch (_) {}
        }
        runEvaluation();
      });
    });
  }

  function runEvaluation() {
    if (warningBanner) {
      warningBanner.style.display = 'none';
      warningBanner.textContent = '';
    }

    const expr = formulaInput?.value || '';
    updateSyntaxStatus();

    try {
      const syntax = parser.validateSyntax(expr);
      if (!syntax.valid) {
        if (warningBanner) {
          warningBanner.style.display = 'block';
          warningBanner.textContent = `Syntax Error: ${syntax.error}`;
        }
        if (resultDisplay) resultDisplay.textContent = '—';
        if (rawResultDisplay) rawResultDisplay.textContent = '—';
        return;
      }

      const tokens = parser.tokenize(expr);
      if (tokenStream) {
        tokenStream.innerHTML = tokens.map((t) => `<span class="token-pill token-${t.type}">${t.raw || t.value}</span>`).join(' ');
      }
      if (tokenCountDisplay) {
        tokenCountDisplay.textContent = `${tokens.length}`;
      }

      const rpn = parser.toRPN(tokens);
      if (rpnStream) {
        rpnStream.innerHTML = rpn.map((t) => `<span class="rpn-pill rpn-${t.type}">${t.value}${t.args !== undefined ? `(${t.args})` : ''}</span>`).join(' ');
      }

      const vars = getVariables();
      const result = parser.evaluate(expr, vars);

      if (resultDisplay) {
        resultDisplay.textContent = parser.formatResult(result, activeUnit);
      }
      if (rawResultDisplay) {
        rawResultDisplay.textContent = Number.isInteger(result) ? String(result) : result.toFixed(4);
      }
      if (latencyDisplay && parser.history.length > 0) {
        latencyDisplay.textContent = `${parser.history[0].latencyMs} ms`;
      }
    } catch (err) {
      if (warningBanner) {
        warningBanner.style.display = 'block';
        warningBanner.textContent = `Evaluation Error: ${err.message}`;
      }
      if (resultDisplay) resultDisplay.textContent = 'Error';
      if (rawResultDisplay) rawResultDisplay.textContent = '—';
    }
  }

  // Subscribe to parser events
  parser.on('historyChange', (history) => {
    renderHistory(history);
  });

  // Formula input event
  if (formulaInput) {
    formulaInput.addEventListener('input', () => {
      updateSyntaxStatus();
      runEvaluation();
    });
  }

  // Evaluate button
  if (evaluateBtn) {
    evaluateBtn.addEventListener('click', runEvaluation);
  }

  // Clear button
  if (clearBtn && formulaInput) {
    clearBtn.addEventListener('click', () => {
      formulaInput.value = '';
      if (resultDisplay) resultDisplay.textContent = '—';
      if (rawResultDisplay) rawResultDisplay.textContent = '—';
      if (tokenStream) tokenStream.textContent = '';
      if (rpnStream) rpnStream.textContent = '';
      if (warningBanner) warningBanner.style.display = 'none';
      if (tokenCountDisplay) tokenCountDisplay.textContent = '0';
      if (latencyDisplay) latencyDisplay.textContent = '0 ms';
      updateSyntaxStatus();
    });
  }

  // Reset variables to defaults
  if (resetVarsBtn) {
    resetVarsBtn.addEventListener('click', () => {
      setVariables(DEFAULT_VARIABLES);
      runEvaluation();
    });
  }

  // Clear history
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      parser.clearHistory();
    });
  }

  // High contrast toggle
  if (highContrastToggle) {
    highContrastToggle.addEventListener('click', () => {
      document.body.classList.toggle('wcag-high-contrast');
      const isHighContrast = document.body.classList.contains('wcag-high-contrast');
      highContrastToggle.setAttribute('aria-pressed', isHighContrast ? 'true' : 'false');
      highContrastToggle.textContent = isHighContrast ? 'Standard Contrast' : 'High Contrast (AAA)';
    });
  }

  // Synchronize range sliders and number inputs
  varSliders.forEach((slider) => {
    slider.addEventListener('input', () => {
      const varName = slider.getAttribute('data-var');
      const numInput = document.querySelector(`.var-num-input[data-var="${varName}"]`);
      if (numInput) numInput.value = slider.value;
      runEvaluation();
    });
  });

  varInputs.forEach((input) => {
    input.addEventListener('input', () => {
      const varName = input.getAttribute('data-var');
      const slider = document.querySelector(`.var-slider[data-var="${varName}"]`);
      if (slider) slider.value = input.value;
      runEvaluation();
    });
  });

  // Presets click binding
  presetButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      presetButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      const formula = btn.getAttribute('data-formula');
      activeUnit = btn.getAttribute('data-unit') || '$';
      if (formulaInput && formula) {
        formulaInput.value = formula;
      }
      runEvaluation();
    });
  });

  // Initial load
  updateSyntaxStatus();
  runEvaluation();
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFestivalHubWorkbench);
  } else {
    initFestivalHubWorkbench();
  }
}
