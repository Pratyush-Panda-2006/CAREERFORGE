import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  RealEstateLuxeVoiceCommander,
  parseAmount,
  parseBedrooms,
  calculateMortgagePayment
} from './voice-commander.js';

describe('RealEstateLuxeVoiceCommander - Utilities', () => {
  it('parses numeric amounts from various colloquial speech formats', () => {
    assert.strictEqual(parseAmount('5000000'), 5000000);
    assert.strictEqual(parseAmount('$5M'), 5000000);
    assert.strictEqual(parseAmount('5 million'), 5000000);
    assert.strictEqual(parseAmount('five million'), 5000000);
    assert.strictEqual(parseAmount('2.5m'), 2500000);
    assert.strictEqual(parseAmount('500k'), 500000);
    assert.strictEqual(parseAmount('$1,500,000'), 1500000);
    assert.strictEqual(parseAmount('1 billion'), 1000000000);
    assert.strictEqual(parseAmount('10 billion'), 10000000000);
    assert.strictEqual(parseAmount(''), null);
    assert.strictEqual(parseAmount('invalid amount text'), null);
  });

  it('parses bedroom counts from voice strings', () => {
    assert.strictEqual(parseBedrooms('4 bedrooms'), 4);
    assert.strictEqual(parseBedrooms('minimum 5 beds'), 5);
    assert.strictEqual(parseBedrooms('three bedrooms'), 3);
    assert.strictEqual(parseBedrooms('at least 2 beds'), 2);
    assert.strictEqual(parseBedrooms('1 bed'), 1);
    assert.strictEqual(parseBedrooms('no numbers here'), null);
    assert.strictEqual(parseBedrooms(''), null);
  });

  it('calculates luxury mortgage payments accurately', () => {
    // $5,000,000 with 20% down ($4,000,000 principal), 6.5% interest, 30 years
    const payment = calculateMortgagePayment(5000000, 20, 6.5, 30);
    assert.strictEqual(typeof payment, 'number');
    assert.strictEqual(payment > 25000 && payment < 26000, true);

    // 0% interest edge-case
    const zeroInterestPayment = calculateMortgagePayment(1200000, 0, 0, 10);
    assert.strictEqual(zeroInterestPayment, 10000);
  });
});

describe('RealEstateLuxeVoiceCommander - Voice Grammar Parsing', () => {
  const commander = new RealEstateLuxeVoiceCommander();

  it('parses SEARCH_PROPERTY commands with cities and property types', () => {
    const res1 = commander.parseVoiceGrammar('search properties in Aspen');
    assert.strictEqual(res1.action, 'SEARCH_PROPERTY');
    assert.strictEqual(res1.payload.city, 'Aspen');
    assert.strictEqual(res1.payload.propertyType, null);

    const res2 = commander.parseVoiceGrammar('find penthouses');
    assert.strictEqual(res2.action, 'SEARCH_PROPERTY');
    assert.strictEqual(res2.payload.city, null);
    assert.strictEqual(res2.payload.propertyType, 'penthouse');

    const res3 = commander.parseVoiceGrammar('show villas in Aspen');
    assert.strictEqual(res3.action, 'SEARCH_PROPERTY');
    assert.strictEqual(res3.payload.city, 'Aspen');
    assert.strictEqual(res3.payload.propertyType, 'villa');

    const res4 = commander.parseVoiceGrammar('search luxury estates');
    assert.strictEqual(res4.action, 'SEARCH_PROPERTY');
    assert.strictEqual(res4.payload.propertyType, 'estate');

    const res5 = commander.parseVoiceGrammar('find penthouses in Miami');
    assert.strictEqual(res5.action, 'SEARCH_PROPERTY');
    assert.strictEqual(res5.payload.city, 'Miami');
    assert.strictEqual(res5.payload.propertyType, 'penthouse');
  });

  it('parses FILTER_PRICE commands for above, under, and between modes', () => {
    const aboveRes = commander.parseVoiceGrammar('filter price above 5000000');
    assert.strictEqual(aboveRes.action, 'FILTER_PRICE');
    assert.strictEqual(aboveRes.payload.mode, 'above');
    assert.strictEqual(aboveRes.payload.minPrice, 5000000);
    assert.strictEqual(aboveRes.payload.maxPrice, null);

    const underRes = commander.parseVoiceGrammar('budget under $10M');
    assert.strictEqual(underRes.action, 'FILTER_PRICE');
    assert.strictEqual(underRes.payload.mode, 'under');
    assert.strictEqual(underRes.payload.minPrice, null);
    assert.strictEqual(underRes.payload.maxPrice, 10000000);

    const betweenRes = commander.parseVoiceGrammar('price between 2 million and 5 million');
    assert.strictEqual(betweenRes.action, 'FILTER_PRICE');
    assert.strictEqual(betweenRes.payload.mode, 'between');
    assert.strictEqual(betweenRes.payload.minPrice, 2000000);
    assert.strictEqual(betweenRes.payload.maxPrice, 5000000);
  });

  it('parses FILTER_BEDROOMS commands', () => {
    const res1 = commander.parseVoiceGrammar('4 bedrooms');
    assert.strictEqual(res1.action, 'FILTER_BEDROOMS');
    assert.strictEqual(res1.payload.bedrooms, 4);

    const res2 = commander.parseVoiceGrammar('minimum 5 beds');
    assert.strictEqual(res2.action, 'FILTER_BEDROOMS');
    assert.strictEqual(res2.payload.bedrooms, 5);

    const res3 = commander.parseVoiceGrammar('three bedrooms');
    assert.strictEqual(res3.action, 'FILTER_BEDROOMS');
    assert.strictEqual(res3.payload.bedrooms, 3);
  });

  it('parses SCHEDULE_VIEWING commands for private tours and VIP showings', () => {
    const res1 = commander.parseVoiceGrammar('schedule viewing for Villa Azure');
    assert.strictEqual(res1.action, 'SCHEDULE_VIEWING');
    assert.strictEqual(res1.payload.type, 'viewing');
    assert.strictEqual(res1.payload.property, 'Villa Azure');

    const res2 = commander.parseVoiceGrammar('book private tour');
    assert.strictEqual(res2.action, 'SCHEDULE_VIEWING');
    assert.strictEqual(res2.payload.type, 'private_tour');
    assert.strictEqual(res2.payload.property, 'Featured Luxury Property');

    const res3 = commander.parseVoiceGrammar('request VIP showing for Penthouse 88');
    assert.strictEqual(res3.action, 'SCHEDULE_VIEWING');
    assert.strictEqual(res3.payload.type, 'vip_showing');
    assert.strictEqual(res3.payload.property, 'Penthouse 88');
  });

  it('parses CALCULATE_MORTGAGE commands', () => {
    const res1 = commander.parseVoiceGrammar('calculate mortgage');
    assert.strictEqual(res1.action, 'CALCULATE_MORTGAGE');

    const res2 = commander.parseVoiceGrammar('estimate monthly payment');
    assert.strictEqual(res2.action, 'CALCULATE_MORTGAGE');
  });

  it('parses TOGGLE_HIGH_CONTRAST commands', () => {
    assert.strictEqual(commander.parseVoiceGrammar('toggle contrast').action, 'TOGGLE_HIGH_CONTRAST');
    assert.strictEqual(commander.parseVoiceGrammar('high contrast mode').action, 'TOGGLE_HIGH_CONTRAST');
    assert.strictEqual(commander.parseVoiceGrammar('accessibility mode').action, 'TOGGLE_HIGH_CONTRAST');
  });

  it('parses HELP commands', () => {
    assert.strictEqual(commander.parseVoiceGrammar('help').action, 'HELP');
    assert.strictEqual(commander.parseVoiceGrammar('list commands').action, 'HELP');
    assert.strictEqual(commander.parseVoiceGrammar('what can I say').action, 'HELP');
  });

  it('falls back to UNKNOWN for unrecognized speech input', () => {
    const res = commander.parseVoiceGrammar('order a pepperoni pizza');
    assert.strictEqual(res.action, 'UNKNOWN');
    assert.strictEqual(res.confidence, 0);
  });
});

describe('RealEstateLuxeVoiceCommander - Execution & State Management', () => {
  it('initializes with default IDLE state and empty filter portfolio', () => {
    const commander = new RealEstateLuxeVoiceCommander();
    assert.strictEqual(commander.state, 'IDLE');
    assert.strictEqual(commander.isListening, false);
    assert.strictEqual(commander.isHighContrast, false);
    assert.deepStrictEqual(commander.filters, {
      city: null,
      propertyType: null,
      minPrice: null,
      maxPrice: null,
      bedrooms: null
    });
    assert.strictEqual(commander.getCommandHistory().length, 0);
  });

  it('toggles listening states and triggers appropriate lifecycle events', () => {
    const commander = new RealEstateLuxeVoiceCommander();
    const events = [];

    commander.on('listeningStarted', () => events.push('started'));
    commander.on('listeningStopped', () => events.push('stopped'));
    commander.on('stateChanged', ({ state }) => events.push(`state:${state}`));

    commander.startListening();
    assert.strictEqual(commander.isListening, true);
    assert.strictEqual(commander.state, 'LISTENING');

    commander.stopListening();
    assert.strictEqual(commander.isListening, false);
    assert.strictEqual(commander.state, 'IDLE');

    commander.toggleListening();
    assert.strictEqual(commander.isListening, true);

    commander.toggleListening();
    assert.strictEqual(commander.isListening, false);

    assert.ok(events.includes('started'));
    assert.ok(events.includes('stopped'));
    assert.ok(events.includes('state:LISTENING'));
    assert.ok(events.includes('state:IDLE'));
  });

  it('executes SEARCH_PROPERTY and mutates filters and responses', () => {
    const commander = new RealEstateLuxeVoiceCommander();
    const record = commander.executeCommand('SEARCH_PROPERTY', {
      city: 'Aspen',
      propertyType: 'villa',
      rawTranscript: 'show villas in Aspen'
    });

    assert.strictEqual(commander.filters.city, 'Aspen');
    assert.strictEqual(commander.filters.propertyType, 'villa');
    assert.strictEqual(record.status, 'executed');
    assert.strictEqual(record.success, true);
    assert.ok(record.response.includes('Aspen'));
    assert.ok(record.response.includes('villa'));
  });

  it('executes FILTER_PRICE and updates price constraints', () => {
    const commander = new RealEstateLuxeVoiceCommander();
    commander.executeCommand('FILTER_PRICE', {
      mode: 'between',
      minPrice: 2000000,
      maxPrice: 6000000,
      rawTranscript: 'price between 2M and 6M'
    });

    assert.strictEqual(commander.filters.minPrice, 2000000);
    assert.strictEqual(commander.filters.maxPrice, 6000000);
  });

  it('executes FILTER_BEDROOMS and updates minimum bedroom count', () => {
    const commander = new RealEstateLuxeVoiceCommander();
    commander.executeCommand('FILTER_BEDROOMS', {
      bedrooms: 4,
      rawTranscript: '4 bedrooms'
    });

    assert.strictEqual(commander.filters.bedrooms, 4);
  });

  it('executes SCHEDULE_VIEWING and constructs concierge confirmation', () => {
    const commander = new RealEstateLuxeVoiceCommander();
    const record = commander.executeCommand('SCHEDULE_VIEWING', {
      property: 'Bel Air Sanctuary',
      type: 'vip_showing',
      rawTranscript: 'request VIP showing for Bel Air Sanctuary'
    });

    assert.strictEqual(record.success, true);
    assert.ok(record.response.includes('Bel Air Sanctuary'));
    assert.ok(record.response.includes('VIP showing'));
  });

  it('executes CALCULATE_MORTGAGE and outputs monthly payment estimates', () => {
    const commander = new RealEstateLuxeVoiceCommander();
    commander.filters.maxPrice = 8000000;
    const record = commander.executeCommand('CALCULATE_MORTGAGE', {
      rawTranscript: 'calculate mortgage'
    });

    assert.strictEqual(record.success, true);
    assert.ok(record.response.includes('$8,000,000'));
    assert.ok(record.response.includes('month'));
  });

  it('executes TOGGLE_HIGH_CONTRAST and emits contrastToggled event', () => {
    const commander = new RealEstateLuxeVoiceCommander();
    let emittedContrast = null;
    commander.on('contrastToggled', (val) => {
      emittedContrast = val;
    });

    const record1 = commander.executeCommand('TOGGLE_HIGH_CONTRAST', { rawTranscript: 'toggle contrast' });
    assert.strictEqual(commander.isHighContrast, true);
    assert.strictEqual(emittedContrast, true);
    assert.ok(record1.response.includes('enabled'));

    const record2 = commander.executeCommand('TOGGLE_HIGH_CONTRAST', { rawTranscript: 'toggle contrast' });
    assert.strictEqual(commander.isHighContrast, false);
    assert.strictEqual(emittedContrast, false);
    assert.ok(record2.response.includes('disabled'));
  });

  it('executes HELP command and lists capabilities', () => {
    const commander = new RealEstateLuxeVoiceCommander();
    const record = commander.executeCommand('HELP', { rawTranscript: 'help' });
    assert.strictEqual(record.success, true);
    assert.ok(record.response.includes('search properties'));
    assert.ok(record.response.includes('private tour'));
  });

  it('executes UNKNOWN command gracefully without failing', () => {
    const commander = new RealEstateLuxeVoiceCommander();
    const record = commander.executeCommand('UNKNOWN', { rawTranscript: 'play hip hop' });
    assert.strictEqual(record.success, false);
    assert.strictEqual(record.status, 'unrecognized');
    assert.ok(record.response.includes('Say "help"'));
  });
});

describe('RealEstateLuxeVoiceCommander - Simulation, History & Events', () => {
  it('simulates end-to-end voice speech recognition seamlessly', () => {
    const commander = new RealEstateLuxeVoiceCommander();
    const parsedEvents = [];
    const executionEvents = [];

    commander.on('commandParsed', (p) => parsedEvents.push(p));
    commander.on('commandExecuted', (e) => executionEvents.push(e));

    const result = commander.simulateSpeech('find penthouses in Aspen');
    assert.strictEqual(result.action, 'SEARCH_PROPERTY');
    assert.strictEqual(result.payload.city, 'Aspen');
    assert.strictEqual(result.payload.propertyType, 'penthouse');
    assert.strictEqual(result.success, true);

    assert.strictEqual(parsedEvents.length, 1);
    assert.strictEqual(executionEvents.length, 1);
    assert.strictEqual(commander.state, 'IDLE');
  });

  it('maintains command history log and supports clearHistory', () => {
    const commander = new RealEstateLuxeVoiceCommander();
    let historyClearedEmitted = false;
    commander.on('historyCleared', () => {
      historyClearedEmitted = true;
    });

    commander.simulateSpeech('budget under $5M');
    commander.simulateSpeech('book private tour');
    commander.simulateSpeech('unknown statement');

    const history = commander.getCommandHistory();
    assert.strictEqual(history.length, 3);
    assert.strictEqual(history[0].action, 'FILTER_PRICE');
    assert.strictEqual(history[1].action, 'SCHEDULE_VIEWING');
    assert.strictEqual(history[2].action, 'UNKNOWN');
    assert.strictEqual(history[2].status, 'unrecognized');

    const cleared = commander.clearHistory();
    assert.strictEqual(cleared.length, 0);
    assert.strictEqual(commander.getCommandHistory().length, 0);
    assert.strictEqual(historyClearedEmitted, true);
  });

  it('manages event listeners with on, off, and emit', () => {
    const commander = new RealEstateLuxeVoiceCommander();
    let callCount = 0;
    const listener = () => { callCount++; };

    commander.on('customEvent', listener);
    commander.emit('customEvent');
    assert.strictEqual(callCount, 1);

    commander.off('customEvent', listener);
    commander.emit('customEvent');
    assert.strictEqual(callCount, 1);
  });

  it('supports custom recognition, synthesis, and configuration options', () => {
    const customRecognition = {
      lang: 'fr-FR',
      start() {},
      stop() {}
    };
    const customSynthesis = {
      speak() {},
      cancel() {}
    };
    const commander = new RealEstateLuxeVoiceCommander({
      lang: 'fr-FR',
      continuous: true,
      interimResults: true,
      recognition: customRecognition,
      synthesis: customSynthesis
    });

    assert.strictEqual(commander.lang, 'fr-FR');
    assert.strictEqual(commander.continuous, true);
    assert.strictEqual(commander.interimResults, true);
    assert.strictEqual(commander.speechRecognition, customRecognition);
    assert.strictEqual(commander.speechSynthesis, customSynthesis);
  });

  it('handles mock recognition abort and listener exceptions safely', () => {
    const commander = new RealEstateLuxeVoiceCommander();
    assert.strictEqual(commander.speechRecognition.isMock, true);
    commander.startListening();
    assert.strictEqual(commander.isListening, true);
    commander.speechRecognition.abort();
    assert.strictEqual(commander.isListening, false);

    // Listener exception safety test
    commander.on('brokenEvent', () => {
      throw new Error('Intentional error in listener');
    });
    assert.doesNotThrow(() => {
      commander.emit('brokenEvent');
    });
  });

  it('safely handles empty or missing transcripts', () => {
    const commander = new RealEstateLuxeVoiceCommander();
    const res1 = commander.parseVoiceGrammar('');
    assert.strictEqual(res1.action, 'UNKNOWN');

    const res2 = commander.parseVoiceGrammar(null);
    assert.strictEqual(res2.action, 'UNKNOWN');

    const res3 = commander.parseVoiceGrammar(undefined);
    assert.strictEqual(res3.action, 'UNKNOWN');
  });
});
