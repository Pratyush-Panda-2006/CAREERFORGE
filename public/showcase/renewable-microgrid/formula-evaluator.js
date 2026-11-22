/**
 * RenewableMicrogridFormulaParser
 * Mathematical expression tokenizer & dynamic KPI formula calculator for Renewable Microgrid.
 * Safe in-browser expression tokenizer and mathematical evaluator supporting
 * operator precedence (BODMAS/PEMDAS), variable parameter injection, and division-by-zero guards.
 */

export class RenewableMicrogridFormulaParser {
  constructor() {
    this.name = 'RenewableMicrogridFormulaParser';
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
   * @param {string} expr
   * @returns {Array<{ type: string, value: string|number }>}
   */
  tokenize(expr) {
    if (!expr || typeof expr !== 'string') return [];

    const tokens = [];
    let i = 0;
    const sanitized = expr.trim();

    while (i < sanitized.length) {
      const char = sanitized[i];

      if (/\s/.test(char)) {
        i++;
        continue;
      }

      if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(sanitized[i + 1] || ''))) {
        let numStr = '';
        while (i < sanitized.length && /[0-9.]/.test(sanitized[i])) {
          numStr += sanitized[i];
          i++;
        }
        tokens.push({ type: 'number', value: parseFloat(numStr) });
        continue;
      }

      if (/[a-zA-Z_]/.test(char)) {
        let varStr = '';
        while (i < sanitized.length && /[a-zA-Z0-9_]/.test(sanitized[i])) {
          varStr += sanitized[i];
          i++;
        }
        tokens.push({ type: 'variable', value: varStr });
        continue;
      }

      if ('+-*/%^'.includes(char)) {
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

    const first = tokens[0];
    const last = tokens[tokens.length - 1];

    if (first.type === 'operator' && first.value !== '-') {
      return { valid: false, error: `Expression cannot begin with operator "${first.value}"` };
    }
    if (last.type === 'operator') {
      return { valid: false, error: `Expression cannot end with dangling operator "${last.value}"` };
    }

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
      throw new Error('Malformed expression evaluation stack result');
    }

    return evalStack[0];
  }
}

// Browser DOM controller
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const parser = new RenewableMicrogridFormulaParser();

    const formulaInput = document.getElementById('formula-input');
    const evaluateBtn = document.getElementById('evaluate-btn');
    const loadSampleBtn = document.getElementById('load-sample-btn');
    const clearBtn = document.getElementById('clear-btn');
    const warningBanner = document.getElementById('warning-banner');
    const resultDisplay = document.getElementById('result-display');
    const tokenStream = document.getElementById('token-stream');
    const rpnStream = document.getElementById('rpn-stream');

    const getVariables = () => {
      const vars = {};
      const inputs = document.querySelectorAll('.var-input');
      inputs.forEach((inp) => {
        const varName = inp.getAttribute('data-var');
        if (varName) {
          vars[varName] = parseFloat(inp.value) || 0;
        }
      });
      return vars;
    };

    const runCalc = () => {
      if (!formulaInput) return;
      warningBanner.style.display = 'none';
      warningBanner.textContent = '';

      try {
        const expr = formulaInput.value;
        const vars = getVariables();
        const tokens = parser.tokenize(expr);
        const rpn = parser.toRPN(tokens);
        const result = parser.evaluate(expr, vars);

        resultDisplay.textContent = typeof result === 'number' ? (Number.isInteger(result) ? result : result.toFixed(2)) : result;

        if (tokenStream) {
          tokenStream.innerHTML = tokens
            .map((t) => `<span class="token-chip ${t.type}">${t.value}</span>`)
            .join('');
        }
        if (rpnStream) {
          rpnStream.innerHTML = rpn
            .map((t) => `<span class="token-chip ${t.type}">${t.value}</span>`)
            .join('');
        }
      } catch (err) {
        warningBanner.textContent = err.message;
        warningBanner.style.display = 'block';
        resultDisplay.textContent = 'ERR';
      }
    };

    if (evaluateBtn) evaluateBtn.addEventListener('click', runCalc);
    if (formulaInput) formulaInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') runCalc(); });
    if (loadSampleBtn) {
      loadSampleBtn.addEventListener('click', () => {
        formulaInput.value = '(solar_output + wind_output) * inverter_efficiency - grid_load';
        runCalc();
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        formulaInput.value = '';
        resultDisplay.textContent = '--';
        if (tokenStream) tokenStream.innerHTML = '';
        if (rpnStream) rpnStream.innerHTML = '';
      });
    }

    runCalc();
  });
}
