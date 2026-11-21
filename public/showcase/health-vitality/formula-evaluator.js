/**
 * Health Vitality - Mathematical Expression Parser & Dynamic KPI Formula Calculator
 * Safe in-browser expression tokenizer and mathematical evaluator supporting
 * operator precedence (BODMAS/PEMDAS), variable parameter injection, and division-by-zero guards.
 */

export class HealthVitalityFormulaParser {
  constructor() {
    this.name = 'HealthVitalityFormulaParser';
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
  }

  /**
   * Tokenizes mathematical expression string into numbers, variables, operators, and parentheses.
   * @param {string} expr - Raw mathematical string
   * @returns {Array<{ type: string, value: string|number }>}
   */
  tokenize(expr) {
    if (!expr || typeof expr !== 'string') return [];

    const tokens = [];
    let i = 0;
    const sanitized = expr.trim();

    while (i < sanitized.length) {
      const char = sanitized[i];

      // Whitespace
      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // Numbers (integers or floating-point)
      if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(sanitized[i + 1] || ''))) {
        let numStr = '';
        while (i < sanitized.length && /[0-9.]/.test(sanitized[i])) {
          numStr += sanitized[i];
          i++;
        }
        tokens.push({ type: 'number', value: parseFloat(numStr) });
        continue;
      }

      // Variables (e.g. heart_rate, target_vo2, x1)
      if (/[a-zA-Z_]/.test(char)) {
        let varStr = '';
        while (i < sanitized.length && /[a-zA-Z0-9_]/.test(sanitized[i])) {
          varStr += sanitized[i];
          i++;
        }
        tokens.push({ type: 'variable', value: varStr });
        continue;
      }

      // Operators
      if ('+-*/%^'.includes(char)) {
        // Detect unary negative/positive
        const prevToken = tokens[tokens.length - 1];
        if (
          (char === '-' || char === '+') &&
          (!prevToken || prevToken.type === 'operator' || prevToken.value === '(')
        ) {
          if (char === '-') {
            tokens.push({ type: 'number', value: 0 });
            tokens.push({ type: 'operator', value: '-' });
          }
          i++;
          continue;
        }

        tokens.push({ type: 'operator', value: char });
        i++;
        continue;
      }

      // Parentheses
      if (char === '(' || char === ')') {
        tokens.push({ type: 'paren', value: char });
        i++;
        continue;
      }

      throw new Error(`Unexpected character in formula: "${char}" at index ${i}`);
    }

    return tokens;
  }

  /**
   * Validates expression syntax and parentheses balance.
   * @param {string} expr - Expression string
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

    // Check parentheses balance
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

    // Check operator placement
    const first = tokens[0];
    const last = tokens[tokens.length - 1];

    if (first.type === 'operator' && first.value !== '-') {
      return { valid: false, error: `Expression cannot begin with operator "${first.value}"` };
    }
    if (last.type === 'operator') {
      return { valid: false, error: `Expression cannot end with dangling operator "${last.value}"` };
    }

    // Check adjacent tokens
    for (let i = 0; i < tokens.length - 1; i++) {
      const current = tokens[i];
      const next = tokens[i + 1];

      if (current.type === 'operator' && next.type === 'operator') {
        return { valid: false, error: `Consecutive operators "${current.value}${next.value}" are not allowed` };
      }
      if (current.value === '(' && next.type === 'operator') {
        return { valid: false, error: `Operator "${next.value}" immediately following opening parenthesis` };
      }
      if (current.type === 'operator' && next.value === ')') {
        return { valid: false, error: `Dangling operator "${current.value}" before closing parenthesis` };
      }
      if (current.value === '(' && next.value === ')') {
        return { valid: false, error: 'Empty parentheses pair "()" is invalid' };
      }
    }

    return { valid: true };
  }

  /**
   * Converts infix tokens to Reverse Polish Notation (RPN) using Dijkstra's Shunting-Yard algorithm.
   * @param {Array<object>} tokens
   * @returns {Array<object>}
   */
  toRPN(tokens) {
    const outputQueue = [];
    const operatorStack = [];

    for (const token of tokens) {
      if (token.type === 'number' || token.type === 'variable') {
        outputQueue.push(token);
      } else if (token.type === 'operator') {
        const op1 = token.value;
        const op1Meta = this.operators[op1];

        while (operatorStack.length > 0) {
          const top = operatorStack[operatorStack.length - 1];
          if (top.value === '(') break;

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
   * Evaluates token stream or expression with variable parameter injection.
   * @param {string|Array<object>} input - Raw formula string or token list
   * @param {Record<string, number>} [variables={}] - Variable substitutions
   * @returns {number} Computed result
   */
  evaluate(input, variables = {}) {
    let tokens;
    if (typeof input === 'string') {
      const syntax = this.validateSyntax(input);
      if (!syntax.valid) {
        throw new Error(`Syntax Error: ${syntax.error}`);
      }
      tokens = this.tokenize(input);
    } else if (Array.isArray(input)) {
      tokens = input;
    } else {
      throw new Error('Invalid evaluate input: expected string or token array');
    }

    const rpn = this.toRPN(tokens);
    const evalStack = [];

    for (const token of rpn) {
      if (token.type === 'number') {
        evalStack.push(token.value);
      } else if (token.type === 'variable') {
        const varName = token.value;
        if (Object.prototype.hasOwnProperty.call(variables, varName)) {
          evalStack.push(Number(variables[varName]));
        } else {
          throw new Error(`Variable "${varName}" is undefined in parameter context`);
        }
      } else if (token.type === 'operator') {
        if (evalStack.length < 2) {
          throw new Error(`Malformed expression: insufficient operands for operator "${token.value}"`);
        }
        const b = evalStack.pop();
        const a = evalStack.pop();
        const opMeta = this.operators[token.value];
        evalStack.push(opMeta.exec(a, b));
      }
    }

    if (evalStack.length !== 1) {
      throw new Error('Malformed expression: multiple values remained on evaluation stack');
    }

    return evalStack[0];
  }

  /**
   * Binds interactive calculator controls to DOM elements.
   * @param {HTMLElement} container
   */
  renderToDOM(container) {
    if (!container) return;

    const formulaInput = container.querySelector('#formula-input');
    const evaluateBtn = container.querySelector('#evaluate-btn');
    const errorBanner = container.querySelector('#error-banner');
    const resultDisplay = container.querySelector('#kpi-result');
    const tokensDisplay = container.querySelector('#rpn-tokens');
    const pills = container.querySelectorAll('.pill');

    const getVariables = () => {
      const vars = {};
      const sliders = container.querySelectorAll('.param-slider');
      sliders.forEach((slider) => {
        const id = slider.id.replace('slider-', '');
        vars[id] = parseFloat(slider.value);
      });
      return vars;
    };

    const updateCalculations = () => {
      const formula = formulaInput.value;
      const vars = getVariables();

      try {
        const validation = this.validateSyntax(formula);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        const res = this.evaluate(formula, vars);
        errorBanner.classList.add('hidden');
        errorBanner.textContent = '';
        resultDisplay.textContent = Number.isInteger(res) ? res : res.toFixed(2);

        const tokens = this.tokenize(formula);
        tokensDisplay.textContent = `Parsed ${tokens.length} tokens successfully`;
      } catch (err) {
        errorBanner.classList.remove('hidden');
        errorBanner.textContent = err.message;
        resultDisplay.textContent = 'Error';
        tokensDisplay.textContent = 'Evaluation halted';
      }
    };

    container.querySelectorAll('.param-slider').forEach((slider) => {
      slider.addEventListener('input', (e) => {
        const id = e.target.id.replace('slider-', '');
        const valSpan = container.querySelector(`#val-${id}`);
        if (valSpan) valSpan.textContent = e.target.value;
        updateCalculations();
      });
    });

    pills.forEach((pill) => {
      pill.addEventListener('click', () => {
        const insertText = pill.getAttribute('data-insert');
        formulaInput.value += insertText;
        updateCalculations();
      });
    });

    if (evaluateBtn) {
      evaluateBtn.addEventListener('click', updateCalculations);
    }
    if (formulaInput) {
      formulaInput.addEventListener('input', updateCalculations);
    }

    updateCalculations();
  }
}
