const MAX_LENGTH = 2048;
const MAX_TOKENS = 512;
const MAX_DEPTH = 64;
const NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

function syntax(message, position = 0) {
  throw new SyntaxError(`${message} (character ${position + 1}).`);
}

function parse(tokens, variables, syntaxOnly = false) {
  let cursor = 0;
  const peek = () => tokens[cursor];
  const take = value => {
    if (peek()?.value !== value) return false;
    cursor++;
    return true;
  };
  const depthGuard = depth => {
    if (depth > MAX_DEPTH) throw new RangeError('Expression nesting is too deep; simplify it.');
  };
  const finite = value => {
    if (!Number.isFinite(value)) throw new RangeError('The result is outside the finite real-number range.');
    return value;
  };
  const apply = (operator, left, right) => {
    if (syntaxOnly) return 0;
    if (operator === '/' && right === 0) throw new RangeError('Division by zero; change the denominator.');
    switch (operator) {
      case '+': return finite(left + right);
      case '-': return finite(left - right);
      case '*': return finite(left * right);
      case '/': return finite(left / right);
      case '^': return finite(left ** right);
      default: throw new SyntaxError('Unsupported operator.');
    }
  };

  function primary(depth) {
    depthGuard(depth);
    const token = tokens[cursor++];
    if (!token) syntax('Expected a number, variable or opening parenthesis', (tokens.at(-1)?.position ?? -1) + 1);
    if (token.type === 'number') return token.value;
    if (token.type === 'identifier') {
      if (syntaxOnly) return 0;
      // Read only own data properties: inherited names and getters are not bindings.
      const binding = Object.getOwnPropertyDescriptor(variables, token.value);
      if (!binding) throw new ReferenceError(`Unknown variable "${token.value}"; add it below.`);
      if (!('value' in binding) || typeof binding.value !== 'number' || !Number.isFinite(binding.value)) {
        throw new TypeError(`Variable "${token.value}" needs a finite numeric value.`);
      }
      return binding.value;
    }
    if (token.value === '(') {
      const result = expression(depth + 1);
      if (!take(')')) syntax('Expected a closing parenthesis', peek()?.position ?? token.position);
      return result;
    }
    syntax('Expected a number, variable or opening parenthesis', token.position);
  }

  function power(depth) {
    const left = primary(depth);
    // Exponents associate right; unary binds less tightly: -2^2 = -(2^2).
    return take('^') ? apply('^', left, unary(depth + 1)) : left;
  }

  function unary(depth) {
    depthGuard(depth);
    if (take('+')) return unary(depth + 1);
    if (take('-')) return -unary(depth + 1);
    return power(depth);
  }

  function term(depth) {
    let value = unary(depth);
    while (peek()?.value === '*' || peek()?.value === '/') {
      const operator = tokens[cursor++].value;
      value = apply(operator, value, unary(depth));
    }
    return value;
  }

  function expression(depth) {
    let value = term(depth);
    while (peek()?.value === '+' || peek()?.value === '-') {
      const operator = tokens[cursor++].value;
      value = apply(operator, value, term(depth));
    }
    return value;
  }

  const result = expression(0);
  if (cursor !== tokens.length) syntax('Unexpected token; put an operator between values', peek().position);
  return Object.is(result, -0) ? 0 : result;
}

/** Bounded arithmetic only: no functions, assignments, member access or JavaScript execution. */
export class SupplyChainLogisticsFormulaParser {
  tokenize(expr) {
    if (typeof expr !== 'string') throw new TypeError('The expression must be text.');
    if (expr.length > MAX_LENGTH) throw new RangeError(`Use at most ${MAX_LENGTH} characters.`);
    const tokens = [];
    let position = 0;
    while (position < expr.length) {
      if (/\s/.test(expr[position])) { position++; continue; }
      const rest = expr.slice(position);
      const number = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(rest);
      const identifier = /^[A-Za-z_][A-Za-z0-9_]*/.exec(rest);
      let raw;
      let type;
      if (number) { raw = number[0]; type = 'number'; }
      else if (identifier) { raw = identifier[0]; type = 'identifier'; }
      else if ('+-*/^()'.includes(rest[0])) { raw = rest[0]; type = 'symbol'; }
      else syntax('Use numbers, variable names and arithmetic operators only', position);
      const value = type === 'number' ? Number(raw) : raw;
      if (type === 'number' && !Number.isFinite(value)) throw new RangeError('Number is too large.');
      tokens.push({ type, value, position });
      if (tokens.length > MAX_TOKENS) throw new RangeError(`Use at most ${MAX_TOKENS} tokens.`);
      position += raw.length;
    }
    if (!tokens.length) syntax('Enter an expression');
    return tokens;
  }

  evaluate(tokens, variables = {}) {
    if (!Array.isArray(tokens) || !tokens.length || tokens.length > MAX_TOKENS) {
      throw new TypeError('Supply a non-empty, bounded token array from tokenize().');
    }
    for (const token of tokens) {
      const valid = token && Number.isInteger(token.position) && token.position >= 0 && token.position < MAX_LENGTH && (
        (token.type === 'number' && typeof token.value === 'number' && Number.isFinite(token.value)) ||
        (token.type === 'identifier' && typeof token.value === 'string' && NAME.test(token.value)) ||
        (token.type === 'symbol' && typeof token.value === 'string' && token.value.length === 1 && '+-*/^()'.includes(token.value))
      );
      if (!valid) throw new TypeError('Invalid arithmetic token.');
    }
    if (!variables || typeof variables !== 'object' || Array.isArray(variables)) {
      throw new TypeError('Variables must be an object of numeric bindings.');
    }
    return parse(tokens, variables);
  }

  /** Syntax-only check: an unknown variable or zero denominator can still be grammatical. */
  validateSyntax(expr) {
    try { parse(this.tokenize(expr), {}, true); return true; }
    catch { return false; }
  }
}

function mountCalculator(root) {
  const parser = new SupplyChainLogisticsFormulaParser();
  const formula = root.querySelector('#formula');
  const rows = root.querySelector('#variable-rows');
  const result = root.querySelector('#result');
  const error = root.querySelector('#formula-error');
  const addForm = root.querySelector('#add-variable');
  const nameInput = root.querySelector('#variable-name');
  const valueInput = root.querySelector('#variable-value');
  const addError = root.querySelector('#add-error');
  const format = new Intl.NumberFormat('en-US', { maximumSignificantDigits: 12 });

  function calculate() {
    try {
      const bindings = Object.create(null);
      for (const row of rows.children) {
        const value = row.querySelector('input[type="number"]').valueAsNumber;
        if (!Number.isFinite(value) || Math.abs(value) > 1e9) throw new TypeError(`Enter a value between -1 billion and 1 billion for ${row.dataset.name}.`);
        bindings[row.dataset.name] = value;
      }
      const value = parser.evaluate(parser.tokenize(formula.value), bindings);
      result.textContent = format.format(value);
      result.dataset.value = String(value);
      error.hidden = true;
      error.textContent = '';
      formula.removeAttribute('aria-invalid');
    } catch (cause) {
      result.textContent = '—';
      delete result.dataset.value;
      error.textContent = cause.message;
      error.hidden = false;
      formula.setAttribute('aria-invalid', 'true');
    }
  }

  function addVariable(name, value) {
    const row = document.createElement('div');
    row.className = 'variable-row';
    row.dataset.name = name;
    const label = document.createElement('label');
    label.htmlFor = `value-${name}`;
    label.textContent = name;
    const number = document.createElement('input');
    Object.assign(number, { type: 'number', id: label.htmlFor, value: String(value), min: '-1000000000', max: '1000000000', step: 'any' });
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.step = 'any';
    slider.setAttribute('aria-label', `${name} slider`);
    function syncSlider() {
      const current = number.valueAsNumber;
      if (!Number.isFinite(current)) return;
      slider.min = String(Math.min(0, current < 0 ? -1000 : 0, current));
      slider.max = String(Math.max(1000, current));
      slider.value = String(current);
      slider.setAttribute('aria-valuetext', String(current));
    }
    syncSlider();
    number.addEventListener('input', () => { syncSlider(); calculate(); });
    slider.addEventListener('input', () => {
      number.value = slider.value;
      slider.setAttribute('aria-valuetext', slider.value);
      calculate();
    });
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove-variable';
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', `Remove ${name}`);
    remove.addEventListener('click', () => { row.remove(); nameInput.focus(); calculate(); });
    row.append(label, number, remove, slider);
    rows.append(row);
  }

  addVariable('on_time', 940);
  addVariable('shipments', 1000);
  addForm.addEventListener('submit', event => {
    event.preventDefault();
    const name = nameInput.value.trim();
    const value = valueInput.valueAsNumber;
    let message = '';
    if (!NAME.test(name) || name.length > 32) message = 'Use a name of up to 32 letters, digits or underscores, starting with a letter or underscore.';
    else if ([...rows.children].some(row => row.dataset.name === name)) message = `Variable "${name}" already exists.`;
    else if (rows.children.length >= 12) message = 'Use at most 12 variables; remove one first.';
    else if (!Number.isFinite(value) || Math.abs(value) > 1e9) message = 'Enter a finite value between -1 billion and 1 billion.';
    addError.textContent = message;
    addError.hidden = !message;
    if (message) return;
    addVariable(name, value);
    nameInput.value = '';
    nameInput.focus();
    calculate();
  });
  formula.addEventListener('input', calculate);
  root.querySelector('#calculate').addEventListener('click', calculate);
  root.querySelectorAll('[data-insert]').forEach(button => button.addEventListener('click', () => {
    formula.setRangeText(button.dataset.insert, formula.selectionStart, formula.selectionEnd, 'end');
    formula.focus();
    calculate();
  }));
  calculate();
}

if (typeof document !== 'undefined') {
  const root = document.querySelector('[data-formula-calculator]');
  if (root) mountCalculator(root);
}
