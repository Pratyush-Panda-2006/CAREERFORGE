/**
 * Quantum Forge - Mathematical Expression Parser & Dynamic KPI Formula Calculator
 * Issue #1264 - NSoC '26 Level 3 Feature
 * 
 * Production-grade, safe, self-contained mathematical expression tokenizer,
 * Shunting-Yard RPN compiler, and quantum computing KPI evaluator.
 */

export const DEFAULT_QUANTUM_VARIABLES = {
  qubit_fidelity: 0.9995,
  gate_error: 0.0005,
  coherence_time_t1: 120.0,
  decoherence_t2: 85.0,
  circuit_depth: 64,
  entanglement_entropy: 0.6931
};

export const QUANTUM_FORMULA_PRESETS = [
  {
    id: 'circuit-fidelity',
    name: 'Circuit Fidelity Retention',
    formula: 'qubit_fidelity ^ circuit_depth',
    description: 'Cumulative state fidelity across the full quantum circuit depth'
  },
  {
    id: 'error-accumulation',
    name: 'Gate Error Accumulation',
    formula: '1 - (1 - gate_error) ^ circuit_depth',
    description: 'Probability of at least one physical gate error occurring during execution'
  },
  {
    id: 'coherence-ratio',
    name: 'Decoherence Ratio (T2 / T1)',
    formula: 'decoherence_t2 / coherence_time_t1',
    description: 'Phase dephasing time relative to longitudinal relaxation time'
  },
  {
    id: 'entanglement-purity',
    name: 'Entanglement Purity Index',
    formula: 'exp(-entanglement_entropy)',
    description: 'Subsystem purity derived from von Neumann bipartite entanglement entropy'
  },
  {
    id: 'decoherence-factor',
    name: 'Decoherence Attenuation Factor',
    formula: 'exp(-(circuit_depth / coherence_time_t1))',
    description: 'State amplitude decay envelope scaled by qubit lifetime'
  },
  {
    id: 'quantum-capacity',
    name: 'Quantum Volume Capacity Score',
    formula: 'round((coherence_time_t1 * (qubit_fidelity ^ 2)) / (circuit_depth * gate_error))',
    description: 'Composite figure of merit balancing coherence against depth and noise'
  }
];

const KNOWN_FUNCTIONS = new Set([
  'sqrt',
  'log',
  'ln',
  'exp',
  'abs',
  'min',
  'max',
  'round',
  'ceil',
  'floor',
  'sin',
  'cos',
  'tan',
  'pow'
]);

export class QuantumForgeFormulaParser {
  constructor(options = {}) {
    this.name = 'QuantumForgeFormulaParser';
    this.events = new Map();
    this.history = [];
    this.defaultVariables = { ...DEFAULT_QUANTUM_VARIABLES, ...(options.defaultVariables || {}) };

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
      '^': { precedence: 3, associativity: 'R', exec: (a, b) => Math.pow(a, b) }
    };

    this.functions = {
      sqrt: (x) => {
        if (x < 0) throw new Error('Square root of negative number is undefined');
        return Math.sqrt(x);
      },
      log: (x, base) => {
        if (x <= 0) throw new Error('Logarithm of non-positive number is undefined');
        if (base !== undefined) {
          if (base <= 0 || base === 1) throw new Error('Logarithm base must be positive and not equal to 1');
          return Math.log(x) / Math.log(base);
        }
        return Math.log10(x);
      },
      ln: (x) => {
        if (x <= 0) throw new Error('Natural logarithm of non-positive number is undefined');
        return Math.log(x);
      },
      exp: (x) => Math.exp(x),
      abs: (x) => Math.abs(x),
      min: (...args) => {
        if (args.length === 0) throw new Error('min() requires at least one argument');
        return Math.min(...args);
      },
      max: (...args) => {
        if (args.length === 0) throw new Error('max() requires at least one argument');
        return Math.max(...args);
      },
      round: (x, decimals) => {
        if (decimals !== undefined) {
          const factor = Math.pow(10, decimals);
          return Math.round(x * factor) / factor;
        }
        return Math.round(x);
      },
      ceil: (x) => Math.ceil(x),
      floor: (x) => Math.floor(x),
      pow: (base, exponent) => Math.pow(base, exponent),
      sin: (x) => Math.sin(x),
      cos: (x) => Math.cos(x),
      tan: (x) => Math.tan(x)
    };
  }

  // --- Event Emitter Pattern ---
  on(event, handler) {
    if (typeof handler !== 'function') throw new TypeError('Event handler must be a function');
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    if (!this.events.has(event)) return false;
    return this.events.get(event).delete(handler);
  }

  emit(event, ...args) {
    if (!this.events.has(event)) return false;
    const listeners = this.events.get(event);
    for (const listener of listeners) {
      try {
        listener(...args);
      } catch (err) {
        // Safe logging in browser / node
        if (typeof console !== 'undefined' && console.error) {
          console.error(`[QuantumForgeFormulaParser] Event listener error for "${event}":`, err);
        }
      }
    }
    return true;
  }

  // --- Tokenizer ---
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

      // 2. Numbers (integers, floating point, scientific notation e.g. 1e-4, 2.5E+3)
      if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(sanitized[i + 1] || ''))) {
        let numStr = '';
        while (i < sanitized.length && /[0-9.]/.test(sanitized[i])) {
          numStr += sanitized[i];
          i++;
        }

        // Scientific exponent e/E
        if (i < sanitized.length && (sanitized[i] === 'e' || sanitized[i] === 'E')) {
          const next = sanitized[i + 1];
          const nextNext = sanitized[i + 2];
          if (
            /[0-9]/.test(next || '') ||
            ((next === '+' || next === '-') && /[0-9]/.test(nextNext || ''))
          ) {
            numStr += sanitized[i]; // 'e' or 'E'
            i++;
            if (sanitized[i] === '+' || sanitized[i] === '-') {
              numStr += sanitized[i];
              i++;
            }
            while (i < sanitized.length && /[0-9]/.test(sanitized[i])) {
              numStr += sanitized[i];
              i++;
            }
          }
        }

        const parsedVal = parseFloat(numStr);
        if (Number.isNaN(parsedVal)) {
          throw new Error(`Invalid numeric literal: "${numStr}" at index ${i}`);
        }
        tokens.push({ type: 'number', value: parsedVal, raw: numStr });
        continue;
      }

      // 3. Identifiers: Functions (sqrt, log, ln, exp, etc.) or Variables (qubit_fidelity, etc.)
      if (/[a-zA-Z_]/.test(char)) {
        let idStr = '';
        while (i < sanitized.length && /[a-zA-Z0-9_]/.test(sanitized[i])) {
          idStr += sanitized[i];
          i++;
        }

        const lowerId = idStr.toLowerCase();
        if (KNOWN_FUNCTIONS.has(lowerId)) {
          tokens.push({ type: 'function', value: lowerId });
        } else {
          tokens.push({ type: 'variable', value: idStr });
        }
        continue;
      }

      // 4. Commas for multi-argument functions
      if (char === ',') {
        tokens.push({ type: 'comma', value: ',' });
        i++;
        continue;
      }

      // 5. Parentheses
      if (char === '(' || char === ')') {
        tokens.push({ type: 'paren', value: char });
        i++;
        continue;
      }

      // 6. Operators (+, -, *, /, %, ^)
      if ('+-*/%^'.includes(char)) {
        const prevToken = tokens[tokens.length - 1];
        const isUnaryContext =
          !prevToken ||
          prevToken.type === 'operator' ||
          (prevToken.type === 'paren' && prevToken.value === '(') ||
          prevToken.type === 'comma';

        if ((char === '-' || char === '+') && isUnaryContext) {
          if (char === '-') {
            tokens.push({ type: 'operator', value: '-', isUnary: true });
          }
          // Unary '+' is treated as positive identity (no-op)
          i++;
          continue;
        }

        tokens.push({ type: 'operator', value: char, isUnary: false });
        i++;
        continue;
      }

      throw new Error(`Unexpected character in formula: "${char}" at index ${i}`);
    }

    this.emit('tokenize', { expression: expr, tokens });
    return tokens;
  }

  // --- Syntax Validation ---
  validateSyntax(expr) {
    if (expr === null || expr === undefined || typeof expr !== 'string' || expr.trim().length === 0) {
      return { valid: false, isValid: false, error: 'Expression cannot be empty', errors: ['Expression cannot be empty'] };
    }

    let tokens;
    try {
      tokens = this.tokenize(expr);
    } catch (err) {
      return { valid: false, isValid: false, error: err.message, errors: [err.message] };
    }

    if (tokens.length === 0) {
      return { valid: false, isValid: false, error: 'No valid mathematical tokens found', errors: ['No valid mathematical tokens found'] };
    }

    // Check balanced parentheses
    let parenDepth = 0;
    for (const token of tokens) {
      if (token.type === 'paren' && token.value === '(') parenDepth++;
      if (token.type === 'paren' && token.value === ')') parenDepth--;
      if (parenDepth < 0) {
        return {
          valid: false,
          isValid: false,
          error: 'Mismatched closing parenthesis without matching opener',
          errors: ['Mismatched closing parenthesis without matching opener']
        };
      }
    }
    if (parenDepth !== 0) {
      return {
        valid: false,
        isValid: false,
        error: 'Unclosed opening parenthesis in formula',
        errors: ['Unclosed opening parenthesis in formula']
      };
    }

    // Operator boundary checks
    const first = tokens[0];
    const last = tokens[tokens.length - 1];

    if (first.type === 'operator' && !first.isUnary) {
      return {
        valid: false,
        isValid: false,
        error: `Expression cannot begin with operator "${first.value}"`,
        errors: [`Expression cannot begin with operator "${first.value}"`]
      };
    }
    if (last.type === 'operator') {
      return {
        valid: false,
        isValid: false,
        error: `Expression cannot end with dangling operator "${last.value}"`,
        errors: [`Expression cannot end with dangling operator "${last.value}"`]
      };
    }
    if (last.type === 'function') {
      return {
        valid: false,
        isValid: false,
        error: `Expression cannot end with function identifier "${last.value}"`,
        errors: [`Expression cannot end with function identifier "${last.value}"`]
      };
    }

    // Adjacent token syntax rules
    for (let i = 0; i < tokens.length - 1; i++) {
      const current = tokens[i];
      const next = tokens[i + 1];

      // Consecutive binary operators (e.g. 2 + * 3)
      if (current.type === 'operator' && next.type === 'operator' && !next.isUnary) {
        return {
          valid: false,
          isValid: false,
          error: `Consecutive operators "${current.value}${next.value}" are not allowed`,
          errors: [`Consecutive operators "${current.value}${next.value}" are not allowed`]
        };
      }

      // Functions must be followed by '('
      if (current.type === 'function' && (next.type !== 'paren' || next.value !== '(')) {
        return {
          valid: false,
          isValid: false,
          error: `Function "${current.value}" must be followed by "("`,
          errors: [`Function "${current.value}" must be followed by "("`]
        };
      }

      // Operator directly after '('
      if (current.type === 'paren' && current.value === '(' && next.type === 'operator' && !next.isUnary) {
        return {
          valid: false,
          isValid: false,
          error: `Operator "${next.value}" immediately following opening parenthesis`,
          errors: [`Operator "${next.value}" immediately following opening parenthesis`]
        };
      }

      // Operator directly before ')'
      if (current.type === 'operator' && next.type === 'paren' && next.value === ')') {
        return {
          valid: false,
          isValid: false,
          error: `Dangling operator "${current.value}" before closing parenthesis`,
          errors: [`Dangling operator "${current.value}" before closing parenthesis`]
        };
      }

      // Empty parentheses ()
      if (current.type === 'paren' && current.value === '(' && next.type === 'paren' && next.value === ')') {
        return {
          valid: false,
          isValid: false,
          error: 'Empty parentheses pair "()" is invalid',
          errors: ['Empty parentheses pair "()" is invalid']
        };
      }

      // Missing operator between numbers/variables (e.g. "2 3" or "2 qubit_fidelity")
      if (
        (current.type === 'number' || current.type === 'variable') &&
        (next.type === 'number' || next.type === 'variable')
      ) {
        return {
          valid: false,
          isValid: false,
          error: `Missing operator between "${current.value}" and "${next.value}"`,
          errors: [`Missing operator between "${current.value}" and "${next.value}"`]
        };
      }
    }

    return { valid: true, isValid: true, error: null, errors: [] };
  }

  // --- Shunting-Yard Infix to RPN Compiler ---
  toRPN(tokensOrExpr) {
    let tokens;
    if (typeof tokensOrExpr === 'string') {
      const syntax = this.validateSyntax(tokensOrExpr);
      if (!syntax.valid) {
        throw new Error(`Syntax Error: ${syntax.error}`);
      }
      tokens = this.tokenize(tokensOrExpr);
    } else if (Array.isArray(tokensOrExpr)) {
      tokens = tokensOrExpr;
    } else {
      throw new Error('Invalid toRPN input: expected string expression or token array');
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
          throw new Error('Misplaced comma outside function argument list');
        }
        if (argCountStack.length > 0) {
          argCountStack[argCountStack.length - 1]++;
        }
      } else if (token.type === 'operator') {
        const op1 = token;
        const op1Meta = op1.isUnary
          ? { precedence: 4, associativity: 'R' }
          : this.operators[op1.value];

        while (operatorStack.length > 0) {
          const top = operatorStack[operatorStack.length - 1];
          if (top.type === 'paren' && top.value === '(') break;

          const topMeta = top.type === 'function'
            ? { precedence: 5, associativity: 'R' }
            : top.isUnary
              ? { precedence: 4, associativity: 'R' }
              : this.operators[top.value];

          if (
            (op1Meta.associativity === 'L' && op1Meta.precedence <= topMeta.precedence) ||
            (op1Meta.associativity === 'R' && op1Meta.precedence < topMeta.precedence)
          ) {
            outputQueue.push(operatorStack.pop());
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
          if (popped.type === 'paren' && popped.value === '(') {
            foundOpener = true;
            break;
          }
          outputQueue.push(popped);
        }
        if (!foundOpener) {
          throw new Error('Mismatched parentheses in formula');
        }

        // Check if top of operator stack is a function call
        if (
          operatorStack.length > 0 &&
          operatorStack[operatorStack.length - 1].type === 'function'
        ) {
          const fnToken = operatorStack.pop();
          const argCount = argCountStack.pop() || 1;
          outputQueue.push({ ...fnToken, argCount });
        }
      }
    }

    while (operatorStack.length > 0) {
      const remaining = operatorStack.pop();
      if (remaining.type === 'paren') {
        throw new Error('Mismatched parentheses detected in operator stack');
      }
      outputQueue.push(remaining);
    }

    return outputQueue;
  }

  // --- Dynamic Evaluation ---
  evaluate(input, variables = {}) {
    let tokens;
    let rawExpr = '';

    if (typeof input === 'string') {
      rawExpr = input;
      const syntax = this.validateSyntax(input);
      if (!syntax.valid) {
        this.emit('syntaxError', { expression: input, error: syntax.error });
        throw new Error(`Syntax Error: ${syntax.error}`);
      }
      tokens = this.tokenize(input);
    } else if (Array.isArray(input)) {
      tokens = input;
      rawExpr = tokens.map((t) => t.raw || t.value).join(' ');
    } else {
      throw new Error('Invalid evaluate input: expected string or token array');
    }

    const mergedVars = { ...this.defaultVariables, ...variables };
    const rpn = this.toRPN(tokens);
    const evalStack = [];

    for (const token of rpn) {
      if (token.type === 'number') {
        evalStack.push(token.value);
      } else if (token.type === 'variable') {
        const varName = token.value;
        if (Object.prototype.hasOwnProperty.call(mergedVars, varName)) {
          const numVal = Number(mergedVars[varName]);
          if (Number.isNaN(numVal)) {
            throw new Error(`Variable "${varName}" evaluates to NaN`);
          }
          evalStack.push(numVal);
        } else {
          throw new Error(`Variable "${varName}" is undefined in parameter context`);
        }
      } else if (token.type === 'operator') {
        if (token.isUnary) {
          if (evalStack.length < 1) {
            throw new Error(`Malformed expression: insufficient operands for unary negation`);
          }
          const val = evalStack.pop();
          evalStack.push(-val);
        } else {
          if (evalStack.length < 2) {
            throw new Error(`Malformed expression: insufficient operands for operator "${token.value}"`);
          }
          const b = evalStack.pop();
          const a = evalStack.pop();
          const opMeta = this.operators[token.value];
          if (!opMeta) {
            throw new Error(`Unsupported operator "${token.value}"`);
          }
          evalStack.push(opMeta.exec(a, b));
        }
      } else if (token.type === 'function') {
        const fnName = token.value;
        const fn = this.functions[fnName];
        if (!fn) {
          throw new Error(`Unknown scientific function "${fnName}"`);
        }
        const count = token.argCount || 1;
        if (evalStack.length < count) {
          throw new Error(`Insufficient arguments for function "${fnName}"`);
        }
        const args = [];
        for (let k = 0; k < count; k++) {
          args.unshift(evalStack.pop());
        }
        const fnResult = fn(...args);
        evalStack.push(fnResult);
      }
    }

    if (evalStack.length !== 1) {
      throw new Error('Malformed expression evaluation stack result');
    }

    const result = evalStack[0];
    if (!Number.isFinite(result)) {
      throw new Error('Calculation result is not a finite number');
    }

    // Calculation history audit log entry
    const calcRecord = {
      id: `calc_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      timestamp: Date.now(),
      expression: rawExpr,
      variables: { ...mergedVars },
      result,
      rpn: rpn.map((t) => (t.type === 'function' ? `${t.value}[${t.argCount}]` : String(t.value)))
    };

    this.history.unshift(calcRecord);
    if (this.history.length > 100) {
      this.history.pop();
    }

    this.emit('evaluate', { ...calcRecord });
    this.emit('historyAdded', calcRecord);

    return result;
  }

  // --- History & Audit Log Management ---
  getHistory() {
    return [...this.history];
  }

  clearHistory() {
    this.history = [];
    this.emit('clearHistory');
    return true;
  }

  getCalculationById(id) {
    return this.history.find((entry) => entry.id === id) || null;
  }
}

export default QuantumForgeFormulaParser;

// Browser DOM controller for Quantum Forge Formula Evaluator Dashboard
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const parser = new QuantumForgeFormulaParser();

    const formulaInput = document.getElementById('formula-input');
    const evaluateBtn = document.getElementById('evaluate-btn');
    const clearBtn = document.getElementById('clear-btn');
    const warningBanner = document.getElementById('warning-banner');
    const resultDisplay = document.getElementById('result-display');
    const tokenStream = document.getElementById('token-stream');
    const rpnStream = document.getElementById('rpn-stream');
    const historyList = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const highContrastToggle = document.getElementById('high-contrast-toggle');

    // Variable slider and number input synchronization
    const varControls = [
      { name: 'qubit_fidelity', slider: 'slider-qubit-fidelity', input: 'var-qubit-fidelity' },
      { name: 'gate_error', slider: 'slider-gate-error', input: 'var-gate-error' },
      { name: 'coherence_time_t1', slider: 'slider-coherence-t1', input: 'var-coherence-t1' },
      { name: 'decoherence_t2', slider: 'slider-decoherence-t2', input: 'var-decoherence-t2' },
      { name: 'circuit_depth', slider: 'slider-circuit-depth', input: 'var-circuit-depth' },
      { name: 'entanglement_entropy', slider: 'slider-entanglement-entropy', input: 'var-entanglement-entropy' }
    ];

    function getVariables() {
      const vars = {};
      varControls.forEach(({ name, input }) => {
        const el = document.getElementById(input);
        if (el) {
          vars[name] = parseFloat(el.value) || 0;
        }
      });
      return vars;
    }

    function syncVariablePair(sourceEl, targetEl) {
      if (sourceEl && targetEl) {
        targetEl.value = sourceEl.value;
      }
    }

    varControls.forEach(({ slider, input }) => {
      const sEl = document.getElementById(slider);
      const iEl = document.getElementById(input);

      if (sEl && iEl) {
        sEl.addEventListener('input', () => {
          syncVariablePair(sEl, iEl);
          runEvaluation();
        });
        iEl.addEventListener('input', () => {
          syncVariablePair(iEl, sEl);
          runEvaluation();
        });
      }
    });

    // Preset pills click handler
    document.querySelectorAll('.formula-preset-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const formula = pill.getAttribute('data-formula');
        if (formula && formulaInput) {
          formulaInput.value = formula;
          runEvaluation();
        }
      });
    });

    // Syntax helper pills click handler
    document.querySelectorAll('.syntax-helper-pill').forEach((pill) => {
      pill.addEventListener('click', () => {
        const insertText = pill.getAttribute('data-insert') || pill.textContent.trim();
        if (formulaInput) {
          const start = formulaInput.selectionStart || formulaInput.value.length;
          const end = formulaInput.selectionEnd || formulaInput.value.length;
          const prev = formulaInput.value;
          formulaInput.value = prev.substring(0, start) + insertText + prev.substring(end);
          formulaInput.focus();
          const nextPos = start + insertText.length;
          formulaInput.setSelectionRange(nextPos, nextPos);
          runEvaluation();
        }
      });
    });

    function renderHistory() {
      if (!historyList) return;
      const history = parser.getHistory();
      if (history.length === 0) {
        historyList.innerHTML = '<div class="history-empty">No calculations recorded yet. Run a formula to generate audit trail.</div>';
        return;
      }

      historyList.innerHTML = history.slice(0, 10).map((item) => `
        <div class="history-item" data-id="${item.id}">
          <div class="history-item-top">
            <span class="history-expr">${escapeHtml(item.expression)}</span>
            <span class="history-result">${Number.isInteger(item.result) ? item.result : item.result.toFixed(6)}</span>
          </div>
          <div class="history-item-meta">
            <span class="history-time">${new Date(item.timestamp).toLocaleTimeString()}</span>
            <button type="button" class="history-replay-btn" data-formula="${escapeHtml(item.expression)}">Load Equation</button>
          </div>
        </div>
      `).join('');

      historyList.querySelectorAll('.history-replay-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const formula = btn.getAttribute('data-formula');
          if (formula && formulaInput) {
            formulaInput.value = formula;
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
      if (warningBanner) {
        warningBanner.style.display = 'none';
        warningBanner.textContent = '';
      }

      const expr = formulaInput?.value || '';
      try {
        const syntax = parser.validateSyntax(expr);
        if (!syntax.valid) {
          if (warningBanner) {
            warningBanner.style.display = 'block';
            warningBanner.textContent = `Syntax Error: ${syntax.error}`;
          }
          if (resultDisplay) resultDisplay.textContent = '---';
          return;
        }

        const tokens = parser.tokenize(expr);
        if (tokenStream) {
          tokenStream.textContent = tokens
            .map((t) => `[${t.type}:${t.raw || t.value}]`)
            .join(' ');
        }

        const rpn = parser.toRPN(tokens);
        if (rpnStream) {
          rpnStream.textContent = rpn
            .map((t) => (t.type === 'function' ? `${t.value}[${t.argCount}]` : String(t.value)))
            .join(' ');
        }

        const vars = getVariables();
        const result = parser.evaluate(tokens, vars);

        if (resultDisplay) {
          if (Math.abs(result) < 1e-4 && result !== 0) {
            resultDisplay.textContent = result.toExponential(4);
          } else if (Number.isInteger(result)) {
            resultDisplay.textContent = String(result);
          } else {
            resultDisplay.textContent = result.toFixed(6).replace(/\.?0+$/, '');
          }
        }

        renderHistory();
      } catch (err) {
        if (warningBanner) {
          warningBanner.style.display = 'block';
          warningBanner.textContent = `Evaluation Error: ${err.message}`;
        }
        if (resultDisplay) resultDisplay.textContent = 'Error';
      }
    }

    if (evaluateBtn) {
      evaluateBtn.addEventListener('click', runEvaluation);
    }

    if (formulaInput) {
      formulaInput.addEventListener('input', runEvaluation);
    }

    if (clearBtn && formulaInput) {
      clearBtn.addEventListener('click', () => {
        formulaInput.value = '';
        if (resultDisplay) resultDisplay.textContent = '0.0000';
        if (tokenStream) tokenStream.textContent = '';
        if (rpnStream) rpnStream.textContent = '';
        if (warningBanner) warningBanner.style.display = 'none';
      });
    }

    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', () => {
        parser.clearHistory();
        renderHistory();
      });
    }

    // High Contrast WCAG AAA toggle
    if (highContrastToggle) {
      highContrastToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
          document.body.classList.add('wcag-high-contrast');
        } else {
          document.body.classList.remove('wcag-high-contrast');
        }
      });
    }

    // Initial run
    runEvaluation();
  });
}
