import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  FestivalHubFormulaParser,
  DEFAULT_VARIABLES,
  KPI_PRESETS,
  SUPPORTED_FUNCTIONS
} from './formula-evaluator.js';

describe('FestivalHubFormulaParser', () => {
  describe('Initialization', () => {
    it('instantiates correctly with proper name, operators, and defaults', () => {
      const parser = new FestivalHubFormulaParser();
      assert.equal(parser.name, 'FestivalHubFormulaParser');
      assert.ok(parser.operators['+']);
      assert.ok(parser.operators['-']);
      assert.ok(parser.operators['*']);
      assert.ok(parser.operators['/']);
      assert.ok(parser.operators['%']);
      assert.ok(parser.operators['^']);
      assert.ok(parser.operators['NEG']);
      assert.equal(parser.defaultVariables.general_admission_price, 150.00);
      assert.equal(parser.defaultVariables.venue_capacity, 15000);
      assert.equal(parser.presets.length, 6);
      assert.deepEqual(parser.getHistory(), []);
    });

    it('allows custom default variables in constructor', () => {
      const customVars = { ...DEFAULT_VARIABLES, general_admission_price: 200.00 };
      const parser = new FestivalHubFormulaParser(customVars);
      assert.equal(parser.defaultVariables.general_admission_price, 200.00);
    });
  });

  describe('Tokenization', () => {
    const parser = new FestivalHubFormulaParser();

    it('tokenizes integers and floating point numbers', () => {
      const tokens = parser.tokenize('150 + 350.50 * .75');
      assert.equal(tokens.length, 5);
      assert.equal(tokens[0].value, 150);
      assert.equal(tokens[2].value, 350.5);
      assert.equal(tokens[4].value, 0.75);
    });

    it('tokenizes scientific notation numbers', () => {
      const tokens = parser.tokenize('1e5 + 2.5e-3 * 1.5E+2');
      assert.equal(tokens.length, 5);
      assert.equal(tokens[0].value, 100000);
      assert.equal(tokens[2].value, 0.0025);
      assert.equal(tokens[4].value, 150);
    });

    it('tokenizes variables and operators', () => {
      const tokens = parser.tokenize('ga_attendees * general_admission_price');
      assert.equal(tokens.length, 3);
      assert.equal(tokens[0].type, 'variable');
      assert.equal(tokens[0].value, 'ga_attendees');
      assert.equal(tokens[1].type, 'operator');
      assert.equal(tokens[1].value, '*');
      assert.equal(tokens[2].type, 'variable');
      assert.equal(tokens[2].value, 'general_admission_price');
    });

    it('tokenizes unary minus and unary plus correctly', () => {
      const tokens = parser.tokenize('-5 + (+10) * -artist_budget');
      assert.equal(tokens[0].type, 'unary');
      assert.equal(tokens[0].value, 'NEG');
      assert.equal(tokens[1].value, 5);

      // Verify unary minus inside multiplication
      const multTokens = parser.tokenize('3 * -5');
      assert.equal(multTokens[0].value, 3);
      assert.equal(multTokens[1].value, '*');
      assert.equal(multTokens[2].type, 'unary');
      assert.equal(multTokens[2].value, 'NEG');
      assert.equal(multTokens[3].value, 5);
    });

    it('tokenizes functions and commas', () => {
      const tokens = parser.tokenize('min(ga_attendees, 15000) + sqrt(venue_capacity)');
      assert.equal(tokens[0].type, 'function');
      assert.equal(tokens[0].value, 'min');
      assert.equal(tokens[1].value, '(');
      assert.equal(tokens[3].type, 'comma');
      assert.equal(tokens[7].type, 'function');
      assert.equal(tokens[7].value, 'sqrt');
    });

    it('throws error on illegal characters', () => {
      assert.throws(() => parser.tokenize('100 $ 20'), /Unexpected character in formula: "\$"/);
      assert.throws(() => parser.tokenize('20 @ 5'), /Unexpected character in formula: "@"/);
    });
  });

  describe('Syntax Validation', () => {
    const parser = new FestivalHubFormulaParser();

    it('validates correct expressions', () => {
      assert.equal(parser.validateSyntax('(general_admission_price * ga_attendees) + 500').valid, true);
      assert.equal(parser.validateSyntax('sqrt(16) + min(1, 2)').valid, true);
      assert.equal(parser.validateSyntax('-5 + 10 * (-2)').valid, true);
    });

    it('rejects empty or whitespace expressions', () => {
      assert.equal(parser.validateSyntax('').valid, false);
      assert.equal(parser.validateSyntax('   ').valid, false);
    });

    it('rejects unbalanced parentheses', () => {
      assert.equal(parser.validateSyntax('(2 + 3').valid, false);
      assert.equal(parser.validateSyntax('2 + 3) * 4').valid, false);
      assert.equal(parser.validateSyntax('((2 + 3) * 4').valid, false);
    });

    it('rejects empty parentheses pair', () => {
      assert.equal(parser.validateSyntax('()').valid, false);
      assert.equal(parser.validateSyntax('2 + ()').valid, false);
    });

    it('rejects consecutive operators and dangling operators', () => {
      assert.equal(parser.validateSyntax('2 + * 3').valid, false);
      assert.equal(parser.validateSyntax('2 * / 3').valid, false);
      assert.equal(parser.validateSyntax('5 +').valid, false);
      assert.equal(parser.validateSyntax('* 5').valid, false);
      assert.equal(parser.validateSyntax('( * 5 )').valid, false);
      assert.equal(parser.validateSyntax('( 5 + )').valid, false);
    });

    it('rejects missing operators between adjacent values or after parens', () => {
      assert.equal(parser.validateSyntax('2 3').valid, false);
      assert.equal(parser.validateSyntax('2 ga_attendees').valid, false);
      assert.equal(parser.validateSyntax('(2 + 3) 4').valid, false);
      assert.equal(parser.validateSyntax('4 (2 + 3)').valid, false);
    });

    it('rejects functions not followed by parenthesis', () => {
      assert.equal(parser.validateSyntax('sqrt 16').valid, false);
      assert.equal(parser.validateSyntax('10 + sqrt').valid, false);
    });

    it('rejects commas outside of function parentheses', () => {
      assert.equal(parser.validateSyntax('1, 2').valid, false);
      assert.equal(parser.validateSyntax(', 5').valid, false);
    });
  });

  describe('Operator Precedence & BODMAS / PEMDAS', () => {
    const parser = new FestivalHubFormulaParser();

    it('evaluates multiplication and division before addition and subtraction', () => {
      assert.equal(parser.evaluate('2 + 3 * 4'), 14);
      assert.equal(parser.evaluate('20 - 10 / 2'), 15);
      assert.equal(parser.evaluate('(2 + 3) * 4'), 20);
      assert.equal(parser.evaluate('100 - (20 + 5) * 2'), 50);
    });

    it('evaluates left-associative operations correctly', () => {
      assert.equal(parser.evaluate('10 - 4 + 2'), 8);
      assert.equal(parser.evaluate('100 / 5 / 2'), 10);
    });

    it('evaluates modulo with multiplication precedence', () => {
      assert.equal(parser.evaluate('14 % 4 * 2'), 4);
      assert.equal(parser.evaluate('10 + 14 % 4'), 12);
    });

    it('evaluates exponentiation as right-associative with highest precedence', () => {
      // 2 ^ 3 ^ 2 = 2 ^ (3 ^ 2) = 2 ^ 9 = 512
      assert.equal(parser.evaluate('2 ^ 3 ^ 2'), 512);
      // (2 ^ 3) ^ 2 = 8 ^ 2 = 64
      assert.equal(parser.evaluate('(2 ^ 3) ^ 2'), 64);
      // 2 * 3 ^ 2 = 2 * 9 = 18
      assert.equal(parser.evaluate('2 * 3 ^ 2'), 18);
    });

    it('evaluates unary minus correctly with operators and powers', () => {
      assert.equal(parser.evaluate('3 * -5'), -15);
      assert.equal(parser.evaluate('-5 + 2'), -3);
      assert.equal(parser.evaluate('-2 ^ 2'), -4);
      assert.equal(parser.evaluate('(-2) ^ 2'), 4);
      assert.equal(parser.evaluate('2 ^ -3'), 0.125);
    });
  });

  describe('Mathematical Functions', () => {
    const parser = new FestivalHubFormulaParser();

    it('evaluates single-argument functions: sqrt, log, ln, exp, abs', () => {
      assert.equal(parser.evaluate('sqrt(144)'), 12);
      assert.equal(parser.evaluate('log(1000)'), 3);
      assert.equal(Math.round(parser.evaluate('ln(exp(5))')), 5);
      assert.equal(parser.evaluate('exp(0)'), 1);
      assert.equal(parser.evaluate('abs(-42.5)'), 42.5);
    });

    it('evaluates rounding functions: round, floor, ceil', () => {
      assert.equal(parser.evaluate('round(4.4)'), 4);
      assert.equal(parser.evaluate('round(4.6)'), 5);
      assert.equal(parser.evaluate('floor(4.9)'), 4);
      assert.equal(parser.evaluate('ceil(4.1)'), 5);
    });

    it('evaluates multi-argument functions: pow, min, max', () => {
      assert.equal(parser.evaluate('pow(2, 5)'), 32);
      assert.equal(parser.evaluate('pow(3, 3)'), 27);
      assert.equal(parser.evaluate('min(15, 30)'), 15);
      assert.equal(parser.evaluate('max(15, 30)'), 30);
      assert.equal(parser.evaluate('min(50, 10, 25)'), 10);
      assert.equal(parser.evaluate('max(50, 100, 25)'), 100);
    });

    it('evaluates deeply nested functions', () => {
      assert.equal(parser.evaluate('max(min(10, 20), abs(-15))'), 15);
      assert.equal(parser.evaluate('sqrt(pow(3, 2) + pow(4, 2))'), 5);
    });
  });

  describe('Variable Substitution', () => {
    it('evaluates expressions using default variables', () => {
      const parser = new FestivalHubFormulaParser();
      // 150 * 12000 = 1,800,000
      assert.equal(parser.evaluate('general_admission_price * ga_attendees'), 1800000);
    });

    it('allows parameter override during evaluation', () => {
      const parser = new FestivalHubFormulaParser();
      const customVars = { ga_attendees: 10000, general_admission_price: 200 };
      // 200 * 10000 = 2,000,000
      assert.equal(parser.evaluate('general_admission_price * ga_attendees', customVars), 2000000);
    });

    it('throws descriptive error on undefined variables', () => {
      const parser = new FestivalHubFormulaParser();
      assert.throws(
        () => parser.evaluate('general_admission_price + unknown_festival_cost'),
        /Variable "unknown_festival_cost" is undefined in parameter context/
      );
    });
  });

  describe('Division-by-Zero and Numerical Domain Guards', () => {
    const parser = new FestivalHubFormulaParser();

    it('guards against division by zero in division operator', () => {
      assert.throws(
        () => parser.evaluate('1000 / 0'),
        /Division by zero is undefined/
      );
      assert.throws(
        () => parser.evaluate('500 / (10 - 10)'),
        /Division by zero is undefined/
      );
    });

    it('guards against modulo by zero', () => {
      assert.throws(
        () => parser.evaluate('50 % 0'),
        /Division by zero in modulo operation/
      );
    });

    it('guards against square root of negative numbers', () => {
      assert.throws(
        () => parser.evaluate('sqrt(-9)'),
        /Square root of negative number is undefined/
      );
    });

    it('guards against log and ln of non-positive numbers', () => {
      assert.throws(
        () => parser.evaluate('log(0)'),
        /Logarithm of non-positive number is undefined/
      );
      assert.throws(
        () => parser.evaluate('ln(-10)'),
        /Natural logarithm of non-positive number is undefined/
      );
    });
  });

  describe('Calculation Audit History Log', () => {
    it('records calculation history with timestamps, latency, and unique IDs', () => {
      const parser = new FestivalHubFormulaParser();
      assert.equal(parser.getHistory().length, 0);

      const res = parser.evaluate('150 * 10');
      assert.equal(res, 1500);

      const history = parser.getHistory();
      assert.equal(history.length, 1);
      assert.ok(history[0].id.startsWith('calc_'));
      assert.ok(history[0].timestamp);
      assert.equal(history[0].result, 1500);
      assert.equal(typeof history[0].latencyMs, 'number');
      assert.equal(history[0].expression, '150 * 10');
    });

    it('clears calculation history properly', () => {
      const parser = new FestivalHubFormulaParser();
      parser.evaluate('10 + 20');
      parser.evaluate('30 + 40');
      assert.equal(parser.getHistory().length, 2);

      parser.clearHistory();
      assert.equal(parser.getHistory().length, 0);
    });
  });

  describe('Event Emitter', () => {
    it('emits evaluate, error, and historyChange events', () => {
      const parser = new FestivalHubFormulaParser();
      let evalEvent = null;
      let errorEvent = null;
      let historyEvent = null;

      parser.on('evaluate', (data) => { evalEvent = data; });
      parser.on('error', (data) => { errorEvent = data; });
      parser.on('historyChange', (data) => { historyEvent = data; });

      parser.evaluate('100 + 200');
      assert.ok(evalEvent);
      assert.equal(evalEvent.result, 300);
      assert.ok(historyEvent);
      assert.equal(historyEvent.length, 1);

      assert.throws(() => parser.evaluate('100 / 0'));
      assert.ok(errorEvent);
      assert.ok(errorEvent.error.includes('Division by zero is undefined'));
    });

    it('unsubscribes listeners using off or unsubscribe callback', () => {
      const parser = new FestivalHubFormulaParser();
      let callCount = 0;
      const listener = () => { callCount++; };

      const unsub = parser.on('evaluate', listener);
      parser.evaluate('1 + 1');
      assert.equal(callCount, 1);

      unsub();
      parser.evaluate('2 + 2');
      assert.equal(callCount, 1);
    });
  });

  describe('Festival Hub KPI Presets', () => {
    const parser = new FestivalHubFormulaParser();

    it('Preset 1: Total Ticket Revenue evaluates to $2,325,000.00', () => {
      const preset = parser.presets.find(p => p.id === 'ticket_revenue');
      assert.ok(preset);
      // (150 * 12000) + (350 * 1500) = 1,800,000 + 525,000 = 2,325,000
      const result = parser.evaluate(preset.formula);
      assert.equal(result, 2325000);
      assert.equal(parser.formatResult(result, '$'), '$2,325,000');
    });

    it('Preset 2: Total Concessions & Merch evaluates to $945,000.00', () => {
      const preset = parser.presets.find(p => p.id === 'concessions_merch');
      assert.ok(preset);
      // (12000 + 1500) * (45 + 25) = 13500 * 70 = 945,000
      const result = parser.evaluate(preset.formula);
      assert.equal(result, 945000);
      assert.equal(parser.formatResult(result, '$'), '$945,000');
    });

    it('Preset 3: Gross Festival Revenue evaluates to $3,520,000.00', () => {
      const preset = parser.presets.find(p => p.id === 'gross_revenue');
      assert.ok(preset);
      // 2,325,000 + 945,000 + 250,000 = 3,520,000
      const result = parser.evaluate(preset.formula);
      assert.equal(result, 3520000);
      assert.equal(parser.formatResult(result, '$'), '$3,520,000');
    });

    it('Preset 4: Net Festival Profit evaluates to $1,375,000.00', () => {
      const preset = parser.presets.find(p => p.id === 'net_profit');
      assert.ok(preset);
      // (2,325,000 + 250,000) - (850,000 + 350,000) = 2,575,000 - 1,200,000 = 1,375,000
      const result = parser.evaluate(preset.formula);
      assert.equal(result, 1375000);
      assert.equal(parser.formatResult(result, '$'), '$1,375,000');
    });

    it('Preset 5: Venue Capacity Utilization (%) evaluates to 90%', () => {
      const preset = parser.presets.find(p => p.id === 'capacity_utilization');
      assert.ok(preset);
      // ((12000 + 1500) / 15000) * 100 = (13500 / 15000) * 100 = 90
      const result = parser.evaluate(preset.formula);
      assert.equal(result, 90);
      assert.equal(parser.formatResult(result, '%'), '90%');
    });

    it('Preset 6: Artist Cost Per Attendee evaluates to ~$62.96', () => {
      const preset = parser.presets.find(p => p.id === 'artist_cost_per_attendee');
      assert.ok(preset);
      // 850000 / (12000 + 1500) = 850000 / 13500 = 62.96296296...
      const result = parser.evaluate(preset.formula);
      assert.ok(Math.abs(result - 62.96296) < 0.001);
      assert.equal(parser.formatResult(result, '$/pax'), '62.96 $/pax');
    });
  });
});
