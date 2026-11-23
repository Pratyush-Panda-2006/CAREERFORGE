/**
 * Agency Studio - Mathematical Expression Parser & Dynamic KPI Formula Calculator
 * Safe in-browser expression tokenizer, Shunting-Yard RPN compiler, and math evaluator
 * supporting BODMAS/PEMDAS precedence, custom agency KPI parameters, functions,
 * calculation audit logging, and division-by-zero guards.
 */

export class AgencyStudioFormulaParser {
  /**
   * @param {object} [options={}]
   * @param {number} [options.historyLimit=50]
   */
  constructor(options = {}) {
    this.name = 'AgencyStudioFormulaParser';
    this.historyLimit = options.historyLimit || 50;
    this.history = [];
    this.listeners = new Map();

    // Default Agency Studio parameters
    this.defaultVariables = {
      hourly_rate: 125.0,
      billable_hours: 160,
      overhead_cost: 4500.0,
      project_retainer: 25000.0,
      team_utilization_rate: 0.85,
      client_acquisition_cost: 1200.0,
      project_margin_rate: 0.35,
      contract_value: 50000.0,
      campaign_budget: 15000.0,
      roas: 4.2
    };

    this.variables = { ...this.defaultVariables };

    // Standard Agency Studio KPI presets
    this.presets = {
      gross_revenue: {
        id: 'gross_revenue',
        name: 'Gross Agency Revenue',
        formula: 'hourly_rate * billable_hours * team_utilization_rate',
        description: 'Total revenue generated from active billable team hours and utilization rate.'
      },
      net_profit: {
        id: 'net_profit',
        name: 'Net Agency Profit',
        formula: '(hourly_rate * billable_hours * team_utilization_rate) - overhead_cost',
        description: 'Operating profit after deducting fixed monthly agency overhead costs.'
      },
      profit_margin_ratio: {
        id: 'profit_margin_ratio',
        name: 'Profit Margin Ratio (%)',
        formula: '((project_retainer - overhead_cost) / project_retainer) * 100',
        description: 'Percentage margin retained from monthly client project retainers.'
      },
      client_roi: {
        id: 'client_roi',
        name: 'Client ROI Multiplier',
        formula: '(contract_value * project_margin_rate) / client_acquisition_cost',
        description: 'Ratio of gross project margin return relative to client acquisition cost.'
      },
      campaign_yield: {
        id: 'campaign_yield',
        name: 'Campaign Yield',
        formula: 'campaign_budget * roas',
        description: 'Gross revenue yielded from targeted marketing ad spend and ROAS performance.'
      },
      effective_hourly_yield: {
        id: 'effective_hourly_yield',
        name: 'Effective Hourly Yield',
        formula: '(project_retainer - overhead_cost) / (billable_hours * team_utilization_rate)',
        description: 'Realized net hourly income yield per utilized billable consultant hour.'
      }
    };

    // Operators configuration
    this.operators = {
      '+': { precedence: 1, associativity: 'L', arity: 2, exec: (a, b) => a + b },
      '-': { precedence: 1, associativity: 'L', arity: 2, exec: (a, b) => a - b },
      '*': { precedence: 2, associativity: 'L', arity: 2, exec: (a, b) => a * b },
      '/': {
        precedence: 2,
        associativity: 'L',
        arity: 2,
        exec: (a, b) => {
          if (b === 0) throw new Error('Division by zero is undefined');
          return a / b;
        }
      },
      '%': {
        precedence: 2,
        associativity: 'L',
        arity: 2,
        exec: (a, b) => {
          if (b === 0) throw new Error('Division by zero in modulo operation');
          return a % b;
        }
      },
      '^': { precedence: 3, associativity: 'R', arity: 2, exec: (a, b) => Math.pow(a, b) },
      'u-': { precedence: 4, associativity: 'R', arity: 1, exec: (a) => -a },
      'u+': { precedence: 4, associativity: 'R', arity: 1, exec: (a) => +a }
    };

    // Supported built-in functions
    this.functions = {
      sqrt: {
        arity: 1,
        exec: (x) => {
          if (x < 0) throw new Error('Square root of negative number is undefined');
          return Math.sqrt(x);
        }
      },
      log: {
        arity: 1,
        exec: (x) => {
          if (x <= 0) throw new Error('Logarithm of non-positive number is undefined');
          return Math.log10(x);
        }
      },
      ln: {
        arity: 1,
        exec: (x) => {
          if (x <= 0) throw new Error('Natural logarithm of non-positive number is undefined');
          return Math.log(x);
        }
      },
      exp: { arity: 1, exec: (x) => Math.exp(x) },
      abs: { arity: 1, exec: (x) => Math.abs(x) },
      min: { arity: 2, exec: (a, b) => Math.min(a, b) },
      max: { arity: 2, exec: (a, b) => Math.max(a, b) },
      round: { arity: 1, exec: (x) => Math.round(x) },
      floor: { arity: 1, exec: (x) => Math.floor(x) },
      ceil: { arity: 1, exec: (x) => Math.ceil(x) },
      pow: { arity: 2, exec: (a, b) => Math.pow(a, b) }
    };
  }

  // ================= Event Emitter Pattern =================

  /**
   * Subscribe to parser events ('evaluate', 'error', 'historyChange').
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
   * Unsubscribe from parser event.
   * @param {string} event
   * @param {Function} handler
   */
  off(event, handler) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(handler);
    }
  }

  /**
   * Emit event to all registered listeners.
   * @param {string} event
   * @param  {...any} args
   */
  emit(event, ...args) {
    if (this.listeners.has(event)) {
      for (const handler of Array.from(this.listeners.get(event))) {
        try {
          handler(...args);
        } catch (err) {
          console.error(`Error in ${event} listener:`, err);
        }
      }
    }
  }

  // ================= Tokenizer =================

  /**
   * Tokenizes mathematical expression string into numbers, variables, operators, and parentheses.
   * Handles integers, floats, scientific notation, unary operators, commas, and functions.
   * @param {string} expr - Raw mathematical formula string
   * @returns {Array<{ type: string, value: any, raw?: string, position: number, unary?: boolean }>}
   */
  tokenize(expr) {
    if (typeof expr !== 'string') return [];

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

      // Numbers: integers, floats, scientific notation (e.g. 125, 0.85, .5, 1e5, 2.5e-3)
      const numMatch = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(expr.slice(i));
      if (numMatch) {
        const raw = numMatch[0];
        tokens.push({
          type: 'number',
          value: parseFloat(raw),
          raw,
          position: i
        });
        i += raw.length;
        continue;
      }

      // Identifiers: variables or function names
      const wordMatch = /^[a-zA-Z_][a-zA-Z0-9_]*/.exec(expr.slice(i));
      if (wordMatch) {
        const word = wordMatch[0];
        const lower = word.toLowerCase();

        if (Object.prototype.hasOwnProperty.call(this.functions, lower)) {
          tokens.push({
            type: 'function',
            value: lower,
            raw: word,
            position: i
          });
        } else {
          tokens.push({
            type: 'variable',
            value: word,
            raw: word,
            position: i
          });
        }
        i += word.length;
        continue;
      }

      // Comma separator for multi-argument functions
      if (char === ',') {
        tokens.push({ type: 'comma', value: ',', position: i });
        i++;
        continue;
      }

      // Parentheses
      if (char === '(' || char === ')') {
        tokens.push({ type: 'paren', value: char, position: i });
        i++;
        continue;
      }

      // Operators (+, -, *, /, %, ^) including unary plus and minus
      if ('+-*/%^'.includes(char)) {
        const prev = tokens[tokens.length - 1];
        const isUnaryPosition =
          !prev ||
          prev.type === 'operator' ||
          (prev.type === 'paren' && prev.value === '(') ||
          prev.type === 'comma';

        if (isUnaryPosition && (char === '-' || char === '+')) {
          tokens.push({
            type: 'operator',
            value: char === '-' ? 'u-' : 'u+',
            raw: char,
            unary: true,
            position: i
          });
        } else {
          tokens.push({
            type: 'operator',
            value: char,
            raw: char,
            unary: false,
            position: i
          });
        }
        i++;
        continue;
      }

      throw new Error(`Unexpected character in formula: "${char}" at index ${i}`);
    }

    return tokens;
  }

  // ================= Syntax Validation =================

  /**
   * Validates expression syntax, parenthesis balance, and operand placement.
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

    if (!tokens || tokens.length === 0) {
      return { valid: false, error: 'No valid mathematical tokens found' };
    }

    // Check parenthesis balance
    let parenDepth = 0;
    for (const token of tokens) {
      if (token.type === 'paren' && token.value === '(') parenDepth++;
      if (token.type === 'paren' && token.value === ')') parenDepth--;
      if (parenDepth < 0) {
        return { valid: false, error: 'Mismatched closing parenthesis without matching opener' };
      }
    }
    if (parenDepth !== 0) {
      return { valid: false, error: 'Unclosed opening parenthesis in formula' };
    }

    // Boundary checks: first and last token
    const first = tokens[0];
    const last = tokens[tokens.length - 1];

    if (first.type === 'operator' && !first.unary) {
      return { valid: false, error: `Expression cannot begin with binary operator "${first.value}"` };
    }
    if (first.type === 'comma') {
      return { valid: false, error: 'Expression cannot begin with a comma' };
    }
    if (last.type === 'operator') {
      return { valid: false, error: `Expression cannot end with dangling operator "${last.raw || last.value}"` };
    }
    if (last.type === 'comma') {
      return { valid: false, error: 'Expression cannot end with a dangling comma' };
    }
    if (last.type === 'function') {
      return { valid: false, error: `Dangling function "${last.value}" at end of formula` };
    }

    // Sequential adjacency checks
    for (let i = 0; i < tokens.length - 1; i++) {
      const current = tokens[i];
      const next = tokens[i + 1];

      // Empty parentheses ()
      if (current.value === '(' && next.value === ')') {
        return { valid: false, error: 'Empty parentheses pair "()" is invalid' };
      }

      // Binary operator immediately following '('
      if (current.value === '(' && next.type === 'operator' && !next.unary) {
        return { valid: false, error: `Operator "${next.value}" immediately follows opening parenthesis` };
      }

      // Operator before ')'
      if (current.type === 'operator' && next.value === ')') {
        return { valid: false, error: `Dangling operator "${current.raw || current.value}" before closing parenthesis` };
      }

      // Consecutive binary operators (e.g. 2 + * 3)
      if (current.type === 'operator' && !current.unary && next.type === 'operator' && !next.unary) {
        return { valid: false, error: `Consecutive binary operators "${current.value}${next.value}" are not allowed` };
      }

      // Function must be immediately followed by '('
      if (current.type === 'function' && next.value !== '(') {
        return { valid: false, error: `Function "${current.value}" must be followed by opening parenthesis "("` };
      }

      // Comma placement
      if (current.type === 'comma' && next.type === 'operator' && !next.unary) {
        return { valid: false, error: `Operator "${next.value}" immediately follows a comma` };
      }
      if (current.type === 'comma' && next.value === ')') {
        return { valid: false, error: 'Dangling comma before closing parenthesis' };
      }
    }

    return { valid: true };
  }

  // ================= Shunting-Yard RPN Compiler =================

  /**
   * Converts infix tokens to Reverse Polish Notation (RPN) using Dijkstra's Shunting-Yard algorithm.
   * Respects BODMAS/PEMDAS precedence, right-associativity for exponents and unary operators.
   * @param {Array<object>} tokens
   * @returns {Array<object>} Output queue in RPN order
   */
  toRPN(tokens) {
    if (!Array.isArray(tokens)) {
      throw new Error('toRPN expects an array of tokens');
    }

    const outputQueue = [];
    const operatorStack = [];

    for (const token of tokens) {
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
            break;
          }
          outputQueue.push(operatorStack.pop());
        }
        if (!foundParen) {
          throw new Error('Misplaced comma outside function arguments');
        }
      } else if (token.type === 'operator') {
        const op1Meta = this.operators[token.value];
        if (!op1Meta) {
          throw new Error(`Unrecognized operator "${token.value}"`);
        }

        while (operatorStack.length > 0) {
          const top = operatorStack[operatorStack.length - 1];
          if (top.value === '(') break;

          if (top.type === 'operator') {
            const op2Meta = this.operators[top.value];
            if (
              (op1Meta.associativity === 'L' && op1Meta.precedence <= op2Meta.precedence) ||
              (op1Meta.associativity === 'R' && op1Meta.precedence < op2Meta.precedence)
            ) {
              outputQueue.push(operatorStack.pop());
            } else {
              break;
            }
          } else {
            break;
          }
        }
        operatorStack.push(token);
      } else if (token.type === 'paren' && token.value === '(') {
        operatorStack.push(token);
      } else if (token.type === 'paren' && token.value === ')') {
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

        // If top of stack is a function, pop it into the output queue
        if (operatorStack.length > 0 && operatorStack[operatorStack.length - 1].type === 'function') {
          outputQueue.push(operatorStack.pop());
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

  // ================= Evaluation Engine =================

  /**
   * Evaluates expression or token stream with dynamic variable injection and division-by-zero guards.
   * @param {string|Array<object>} input - Formula string or token list
   * @param {Record<string, number>} [variables={}] - Variable substitutions
   * @returns {number} Computed numerical result
   */
  evaluate(input, variables = {}) {
    try {
      let tokens;
      let exprString = '';

      if (typeof input === 'string') {
        exprString = input;
        const syntax = this.validateSyntax(input);
        if (!syntax.valid) {
          throw new Error(`Syntax Error: ${syntax.error}`);
        }
        tokens = this.tokenize(input);
      } else if (Array.isArray(input)) {
        tokens = input;
        exprString = tokens.map((t) => t.raw || t.value).join(' ');
      } else {
        throw new Error('Invalid evaluate input: expected string or token array');
      }

      const rpn = this.toRPN(tokens);
      const evalStack = [];
      const mergedVariables = { ...this.variables, ...(variables || {}) };

      for (const token of rpn) {
        if (token.type === 'number') {
          evalStack.push(token.value);
        } else if (token.type === 'variable') {
          const varName = token.value;
          if (Object.prototype.hasOwnProperty.call(mergedVariables, varName)) {
            const val = Number(mergedVariables[varName]);
            if (!Number.isFinite(val)) {
              throw new Error(`Variable "${varName}" must be a finite numeric value`);
            }
            evalStack.push(val);
          } else {
            throw new Error(`Variable "${varName}" is undefined in parameter context`);
          }
        } else if (token.type === 'operator') {
          const opMeta = this.operators[token.value];
          if (!opMeta) {
            throw new Error(`Unknown operator "${token.value}" during evaluation`);
          }

          if (opMeta.arity === 1) {
            if (evalStack.length < 1) {
              throw new Error(`Malformed expression: insufficient operands for unary operator "${token.value}"`);
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
          const fnMeta = this.functions[token.value];
          if (!fnMeta) {
            throw new Error(`Unknown function "${token.value}" during evaluation`);
          }

          if (fnMeta.arity === 1) {
            if (evalStack.length < 1) {
              throw new Error(`Insufficient arguments for function "${token.value}"`);
            }
            const a = evalStack.pop();
            evalStack.push(fnMeta.exec(a));
          } else if (fnMeta.arity === 2) {
            if (evalStack.length < 2) {
              throw new Error(`Insufficient arguments for function "${token.value}"`);
            }
            const b = evalStack.pop();
            const a = evalStack.pop();
            evalStack.push(fnMeta.exec(a, b));
          }
        }
      }

      if (evalStack.length !== 1) {
        throw new Error('Malformed expression evaluation stack result');
      }

      const result = evalStack[0];
      if (!Number.isFinite(result)) {
        throw new Error('Evaluation resulted in a non-finite real number');
      }

      // Record audit history
      const record = {
        id: `kpi_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
        timestamp: new Date().toISOString(),
        expression: exprString,
        variables: { ...mergedVariables },
        result,
        formattedResult: this.formatNumber(result)
      };

      this.history.unshift(record);
      if (this.history.length > this.historyLimit) {
        this.history.pop();
      }

      this.emit('evaluate', { expression: exprString, result, record });
      this.emit('historyChange', this.getHistory());

      return result;
    } catch (err) {
      this.emit('error', err);
      throw err;
    }
  }

  // ================= Helper Methods =================

  /**
   * Evaluates one of the standard Agency Studio presets.
   * @param {string} presetId
   * @param {Record<string, number>} [customVariables]
   * @returns {number}
   */
  evaluatePreset(presetId, customVariables = {}) {
    const preset = this.presets[presetId];
    if (!preset) {
      throw new Error(`Preset "${presetId}" does not exist`);
    }
    return this.evaluate(preset.formula, customVariables);
  }

  /**
   * Retrieves calculation audit log.
   * @returns {Array<object>}
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Clears calculation history.
   */
  clearHistory() {
    this.history = [];
    this.emit('historyChange', []);
  }

  /**
   * Formats numbers cleanly for UI display.
   * @param {number} num
   * @returns {string}
   */
  formatNumber(num) {
    if (typeof num !== 'number' || !Number.isFinite(num)) return String(num);
    if (Number.isInteger(num)) {
      return num.toLocaleString('en-US');
    }
    if (Math.abs(num) >= 1e9 || (Math.abs(num) < 1e-4 && num !== 0)) {
      return num.toExponential(4);
    }
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    });
  }
}

// ================= Browser DOM Controller =================
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const parser = new AgencyStudioFormulaParser();

    // DOM Elements
    const formulaInput = document.getElementById('formula-input');
    const evaluateBtn = document.getElementById('evaluate-btn');
    const clearBtn = document.getElementById('clear-btn');
    const warningBanner = document.getElementById('warning-banner');
    const syntaxBadge = document.getElementById('syntax-badge');
    const resultDisplay = document.getElementById('result-display');
    const rawResultDisplay = document.getElementById('raw-result-display');
    const tokenCountDisplay = document.getElementById('token-count-display');
    const latencyDisplay = document.getElementById('eval-latency-display');
    const tokenStream = document.getElementById('token-stream');
    const rpnStream = document.getElementById('rpn-stream');
    const historyList = document.getElementById('history-list');
    const historyEmpty = document.getElementById('history-empty');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const presetSelect = document.getElementById('preset-select');
    const presetDesc = document.getElementById('preset-description');
    const contrastToggle = document.getElementById('high-contrast-toggle');

    const varInputs = document.querySelectorAll('.var-input');
    const varSliders = document.querySelectorAll('.var-slider');

    // High Contrast Mode Toggle
    if (contrastToggle) {
      contrastToggle.addEventListener('click', () => {
        const isPressed = contrastToggle.getAttribute('aria-pressed') === 'true';
        const nextState = !isPressed;
        contrastToggle.setAttribute('aria-pressed', String(nextState));
        document.body.classList.toggle('wcag-high-contrast', nextState);
      });
    }

    // Bidirectional Slider <-> Number Input Synchronization
    varSliders.forEach((slider) => {
      slider.addEventListener('input', (e) => {
        const varName = e.target.getAttribute('data-var');
        const numberInput = document.querySelector(`.var-input[data-var="${varName}"]`);
        if (numberInput) {
          numberInput.value = e.target.value;
        }
        runEvaluation();
      });
    });

    varInputs.forEach((input) => {
      input.addEventListener('input', (e) => {
        const varName = e.target.getAttribute('data-var');
        const slider = document.querySelector(`.var-slider[data-var="${varName}"]`);
        if (slider) {
          slider.value = e.target.value;
        }
        runEvaluation();
      });
    });

    function collectVariables() {
      const vars = {};
      varInputs.forEach((input) => {
        const name = input.getAttribute('data-var');
        if (name) {
          vars[name] = parseFloat(input.value) || 0;
        }
      });
      return vars;
    }

    function updateSyntaxValidation() {
      const expr = formulaInput?.value || '';
      const syntax = parser.validateSyntax(expr);
      if (syntaxBadge) {
        if (syntax.valid) {
          syntaxBadge.textContent = 'Valid Syntax';
          syntaxBadge.className = 'syntax-badge valid';
        } else {
          syntaxBadge.textContent = 'Invalid Syntax';
          syntaxBadge.className = 'syntax-badge invalid';
        }
      }
      return syntax;
    }

    function renderHistory(history) {
      if (!historyList) return;
      if (!history || history.length === 0) {
        historyList.innerHTML = '';
        if (historyEmpty) historyEmpty.style.display = 'block';
        return;
      }

      if (historyEmpty) historyEmpty.style.display = 'none';
      historyList.innerHTML = history
        .map(
          (entry) => `
        <div class="history-item" data-id="${entry.id}">
          <div class="history-meta">
            <span class="history-time">${new Date(entry.timestamp).toLocaleTimeString()}</span>
            <span class="history-val">${entry.formattedResult}</span>
          </div>
          <div class="history-expr">${escapeHtml(entry.expression)}</div>
          <button type="button" class="history-replay-btn" data-expr="${encodeURIComponent(entry.expression)}">Load Expression</button>
        </div>
      `
        )
        .join('');

      // Add click listeners to history reload buttons
      historyList.querySelectorAll('.history-replay-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const rawExpr = decodeURIComponent(e.target.getAttribute('data-expr') || '');
          if (formulaInput && rawExpr) {
            formulaInput.value = rawExpr;
            runEvaluation();
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

    function runEvaluation() {
      const syntax = updateSyntaxValidation();

      if (warningBanner) {
        warningBanner.style.display = 'none';
        warningBanner.textContent = '';
      }

      const expr = formulaInput?.value || '';
      if (!syntax.valid) {
        if (warningBanner) {
          warningBanner.style.display = 'block';
          warningBanner.textContent = `Syntax Error: ${syntax.error}`;
        }
        if (resultDisplay) resultDisplay.textContent = '--';
        if (rawResultDisplay) rawResultDisplay.textContent = '--';
        return;
      }

      const startTime = performance.now();
      try {
        const tokens = parser.tokenize(expr);
        if (tokenCountDisplay) {
          tokenCountDisplay.textContent = `${tokens.length} token${tokens.length === 1 ? '' : 's'}`;
        }
        if (tokenStream) {
          tokenStream.textContent = tokens.map((t) => `[${t.type}:${t.value}]`).join(' ');
        }

        const rpn = parser.toRPN(tokens);
        if (rpnStream) {
          rpnStream.textContent = rpn.map((t) => String(t.value)).join(' ');
        }

        const vars = collectVariables();
        const result = parser.evaluate(expr, vars);
        const endTime = performance.now();

        if (latencyDisplay) {
          latencyDisplay.textContent = `${(endTime - startTime).toFixed(2)} ms`;
        }
        if (rawResultDisplay) {
          rawResultDisplay.textContent = String(result);
        }
        if (resultDisplay) {
          resultDisplay.textContent = parser.formatNumber(result);
        }
      } catch (err) {
        if (warningBanner) {
          warningBanner.style.display = 'block';
          warningBanner.textContent = `Evaluation Error: ${err.message}`;
        }
        if (resultDisplay) resultDisplay.textContent = '--';
        if (rawResultDisplay) rawResultDisplay.textContent = '--';
      }
    }

    // Event Listeners for controls
    if (formulaInput) {
      formulaInput.addEventListener('input', () => {
        updateSyntaxValidation();
        runEvaluation();
      });
    }

    if (evaluateBtn) {
      evaluateBtn.addEventListener('click', runEvaluation);
    }

    if (clearBtn && formulaInput) {
      clearBtn.addEventListener('click', () => {
        formulaInput.value = '';
        if (resultDisplay) resultDisplay.textContent = '0';
        if (rawResultDisplay) rawResultDisplay.textContent = '0';
        if (tokenCountDisplay) tokenCountDisplay.textContent = '0 tokens';
        if (latencyDisplay) latencyDisplay.textContent = '0.00 ms';
        if (tokenStream) tokenStream.textContent = '';
        if (rpnStream) rpnStream.textContent = '';
        if (warningBanner) warningBanner.style.display = 'none';
        updateSyntaxValidation();
      });
    }

    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', () => {
        parser.clearHistory();
      });
    }

    // Preset dropdown selection
    if (presetSelect) {
      presetSelect.addEventListener('change', (e) => {
        const presetKey = e.target.value;
        const preset = parser.presets[presetKey];
        if (preset && formulaInput) {
          formulaInput.value = preset.formula;
          if (presetDesc) {
            presetDesc.textContent = `${preset.name}: ${preset.description}`;
          }
          runEvaluation();
        }
      });
    }

    // Subscribe to history changes from the parser
    parser.on('historyChange', (history) => {
      renderHistory(history);
    });

    // Initial run
    updateSyntaxValidation();
    runEvaluation();
  });
}
