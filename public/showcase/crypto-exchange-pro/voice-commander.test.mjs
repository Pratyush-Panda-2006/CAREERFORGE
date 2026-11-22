import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CryptoExchangeProVoiceCommander,
  SUPPORTED_CRYPTO_ASSETS,
  DEFAULT_CRYPTO_TICKERS,
  normalizeTranscript,
  resolveAssetSymbol,
  DEFAULT_FALLBACK_PHRASE
} from './voice-commander.js';

test('normalizeTranscript - normalizes text, word numbers, and punctuation', () => {
  assert.strictEqual(normalizeTranscript('  BUY 0.5 BTC!  '), 'buy 0.5 btc');
  assert.strictEqual(normalizeTranscript('Buy point five BTC'), 'buy 0.5 btc');
  assert.strictEqual(normalizeTranscript('Buy half ETH?'), 'buy 0.5 eth');
  assert.strictEqual(normalizeTranscript('sell one eth'), 'sell 1 eth');
  assert.strictEqual(normalizeTranscript('purchase two solana'), 'purchase 2 solana');
});

test('resolveAssetSymbol - correctly resolves aliases and pairs', () => {
  assert.strictEqual(resolveAssetSymbol('bitcoin'), 'BTC');
  assert.strictEqual(resolveAssetSymbol('ether'), 'ETH');
  assert.strictEqual(resolveAssetSymbol('solana'), 'SOL');
  assert.strictEqual(resolveAssetSymbol('dogecoin'), 'DOGE');
  assert.strictEqual(resolveAssetSymbol('btc/usdt'), 'BTC/USDT');
  assert.strictEqual(resolveAssetSymbol('eth/usdt'), 'ETH/USDT');
});

test('CryptoExchangeProVoiceCommander - initializes with default state and custom options', () => {
  const commander = new CryptoExchangeProVoiceCommander({
    activeMarket: 'SOL/USDT',
    portfolio: { SOL: 100, USDT: 50000 }
  });

  assert.strictEqual(commander.activeMarket, 'SOL/USDT');
  assert.strictEqual(commander.portfolio.SOL, 100);
  assert.strictEqual(commander.portfolio.USDT, 50000);
  assert.strictEqual(commander.isListening, false);
  assert.strictEqual(commander.getCommandHistory().length, 0);
});

test('CryptoExchangeProVoiceCommander - handles empty or whitespace transcripts', () => {
  const commander = new CryptoExchangeProVoiceCommander();
  const emptyRes = commander.parseVoiceGrammar('');
  assert.strictEqual(emptyRes.matched, false);
  assert.strictEqual(emptyRes.intent, 'UNKNOWN');
  assert.strictEqual(emptyRes.confidence, 0);

  const whitespaceRes = commander.parseVoiceGrammar('   \t\n  ');
  assert.strictEqual(whitespaceRes.matched, false);
  assert.strictEqual(whitespaceRes.intent, 'UNKNOWN');
});

test('CryptoExchangeProVoiceCommander - parses buy order grammars accurately', () => {
  const commander = new CryptoExchangeProVoiceCommander();

  // "buy 0.5 btc"
  const res1 = commander.parseVoiceGrammar('buy 0.5 btc');
  assert.strictEqual(res1.matched, true);
  assert.strictEqual(res1.intent, 'BUY_ORDER');
  assert.strictEqual(res1.action, 'BUY');
  assert.strictEqual(res1.params.amount, 0.5);
  assert.strictEqual(res1.params.asset, 'BTC');
  assert.strictEqual(res1.params.pair, 'BTC/USDT');
  assert.strictEqual(typeof res1.execute, 'function');
  assert(res1.response.includes('Buy order staged: 0.5 BTC'));

  // "buy 2 eth"
  const res2 = commander.parseVoiceGrammar('buy 2 eth');
  assert.strictEqual(res2.matched, true);
  assert.strictEqual(res2.params.amount, 2);
  assert.strictEqual(res2.params.asset, 'ETH');

  // "buy 500 sol"
  const res3 = commander.parseVoiceGrammar('buy 500 sol');
  assert.strictEqual(res3.matched, true);
  assert.strictEqual(res3.params.amount, 500);
  assert.strictEqual(res3.params.asset, 'SOL');

  // Word number: "purchase point five bitcoin"
  const res4 = commander.parseVoiceGrammar('purchase point five bitcoin');
  assert.strictEqual(res4.matched, true);
  assert.strictEqual(res4.params.amount, 0.5);
  assert.strictEqual(res4.params.asset, 'BTC');
});

test('CryptoExchangeProVoiceCommander - parses sell order grammars accurately', () => {
  const commander = new CryptoExchangeProVoiceCommander();

  // "sell 100 usdt"
  const res1 = commander.parseVoiceGrammar('sell 100 usdt');
  assert.strictEqual(res1.matched, true);
  assert.strictEqual(res1.intent, 'SELL_ORDER');
  assert.strictEqual(res1.action, 'SELL');
  assert.strictEqual(res1.params.amount, 100);
  assert.strictEqual(res1.params.asset, 'USDT');

  // "sell 1.5 eth"
  const res2 = commander.parseVoiceGrammar('sell 1.5 eth');
  assert.strictEqual(res2.matched, true);
  assert.strictEqual(res2.params.amount, 1.5);
  assert.strictEqual(res2.params.asset, 'ETH');

  // "short 25 sol"
  const res3 = commander.parseVoiceGrammar('short 25 sol');
  assert.strictEqual(res3.matched, true);
  assert.strictEqual(res3.params.amount, 25);
  assert.strictEqual(res3.params.asset, 'SOL');
});

test('CryptoExchangeProVoiceCommander - validates trade safety and limits', () => {
  const commander = new CryptoExchangeProVoiceCommander({ maxOrderCapUsd: 500000 });

  // Invalid non-positive amount
  const resZero = commander.parseVoiceGrammar('buy 0 btc');
  assert.strictEqual(resZero.matched, false);
  assert.strictEqual(resZero.action, 'VALIDATION_FAILED');
  assert(resZero.response.includes('positive number'));

  // Invalid negative amount
  const resNeg = commander.parseVoiceGrammar('sell -5 eth');
  assert.strictEqual(resNeg.matched, false);
  assert.strictEqual(resNeg.action, 'VALIDATION_FAILED');

  // Safety threshold exceeded (e.g. 100 BTC @ $68,500 = $6.85M > $500k cap)
  const resExcess = commander.parseVoiceGrammar('buy 100 btc');
  assert.strictEqual(resExcess.matched, false);
  assert.strictEqual(resExcess.action, 'SAFETY_LIMIT_EXCEEDED');
  assert(resExcess.response.includes('safety alert'));
});

test('CryptoExchangeProVoiceCommander - parses ticker price check quotes', () => {
  const commander = new CryptoExchangeProVoiceCommander();

  // "check price btc"
  const res1 = commander.parseVoiceGrammar('check price btc');
  assert.strictEqual(res1.matched, true);
  assert.strictEqual(res1.intent, 'CHECK_PRICE');
  assert.strictEqual(res1.action, 'PRICE_QUOTE');
  assert.strictEqual(res1.params.asset, 'BTC');
  assert.strictEqual(res1.params.price, DEFAULT_CRYPTO_TICKERS.BTC.price);

  // "quote eth"
  const res2 = commander.parseVoiceGrammar('quote eth');
  assert.strictEqual(res2.matched, true);
  assert.strictEqual(res2.params.asset, 'ETH');

  // "what is the price of solana"
  const res3 = commander.parseVoiceGrammar('what is the price of solana');
  assert.strictEqual(res3.matched, true);
  assert.strictEqual(res3.params.asset, 'SOL');
});

test('CryptoExchangeProVoiceCommander - handles order cancellation grammar', () => {
  const commander = new CryptoExchangeProVoiceCommander();

  // Specific order ID: "cancel order 104"
  const res1 = commander.parseVoiceGrammar('cancel order 104');
  assert.strictEqual(res1.matched, true);
  assert.strictEqual(res1.intent, 'CANCEL_ORDER');
  assert.strictEqual(res1.params.orderId, '104');
  assert.strictEqual(res1.params.all, false);

  // Cancel all: "cancel all orders"
  const res2 = commander.parseVoiceGrammar('cancel all orders');
  assert.strictEqual(res2.matched, true);
  assert.strictEqual(res2.intent, 'CANCEL_ORDER');
  assert.strictEqual(res2.params.all, true);

  // "abort orders"
  const res3 = commander.parseVoiceGrammar('abort orders');
  assert.strictEqual(res3.matched, true);
  assert.strictEqual(res3.params.all, true);
});

test('CryptoExchangeProVoiceCommander - handles market switching grammar', () => {
  const commander = new CryptoExchangeProVoiceCommander();

  const res1 = commander.parseVoiceGrammar('switch market btc/usdt');
  assert.strictEqual(res1.matched, true);
  assert.strictEqual(res1.intent, 'SWITCH_MARKET');
  assert.strictEqual(res1.params.market, 'BTC/USDT');
  assert.strictEqual(commander.activeMarket, 'BTC/USDT');

  const res2 = commander.parseVoiceGrammar('switch to eth/usdt');
  assert.strictEqual(res2.matched, true);
  assert.strictEqual(res2.params.market, 'ETH/USDT');
  assert.strictEqual(commander.activeMarket, 'ETH/USDT');
});

test('CryptoExchangeProVoiceCommander - reads portfolio balance summary', () => {
  const commander = new CryptoExchangeProVoiceCommander({
    portfolio: { BTC: 2.0, USDT: 10000 }
  });

  const res = commander.parseVoiceGrammar('read portfolio balance');
  assert.strictEqual(res.matched, true);
  assert.strictEqual(res.intent, 'PORTFOLIO_BALANCE');
  assert.strictEqual(res.action, 'PORTFOLIO_READ');
  assert(res.params.totalUsd > 10000);
  assert(res.response.includes('Portfolio summary'));
});

test('CryptoExchangeProVoiceCommander - handles accessibility directives', () => {
  const commander = new CryptoExchangeProVoiceCommander();

  const res1 = commander.parseVoiceGrammar('toggle contrast');
  assert.strictEqual(res1.matched, true);
  assert.strictEqual(res1.intent, 'ACCESSIBILITY_ACTION');
  assert.strictEqual(res1.params.action, 'toggle_contrast');

  const res2 = commander.parseVoiceGrammar('activate dark mode');
  assert.strictEqual(res2.matched, true);
  assert.strictEqual(res2.params.action, 'activate_dark_mode');

  const res3 = commander.parseVoiceGrammar('increase font size');
  assert.strictEqual(res3.matched, true);
  assert.strictEqual(res3.params.action, 'increase_font');
});

test('CryptoExchangeProVoiceCommander - stages, confirms, and executes order workflow', () => {
  const commander = new CryptoExchangeProVoiceCommander({
    portfolio: { BTC: 1.0, USDT: 100000 }
  });

  let stagedEventEmitted = false;
  let executedEventEmitted = false;

  commander.on('order:staged', (order) => {
    stagedEventEmitted = true;
    assert.strictEqual(order.asset, 'BTC');
    assert.strictEqual(order.amount, 0.5);
  });

  commander.on('order:executed', (order) => {
    executedEventEmitted = true;
    assert.strictEqual(order.status, 'FILLED');
  });

  // Stage order via voice grammar
  const stageRes = commander.parseVoiceGrammar('buy 0.5 btc');
  assert.strictEqual(stageRes.matched, true);
  assert.strictEqual(stagedEventEmitted, true);
  assert(commander.pendingOrder !== null);

  // Confirm staged order via voice confirmation directive
  const confirmRes = commander.parseVoiceGrammar('confirm order');
  assert.strictEqual(confirmRes.matched, true);
  assert.strictEqual(executedEventEmitted, true);
  assert.strictEqual(commander.pendingOrder, null);
  assert.strictEqual(commander.portfolio.BTC, 1.5);
});

test('CryptoExchangeProVoiceCommander - stages and cancels/rejects order', () => {
  const commander = new CryptoExchangeProVoiceCommander();

  let cancelledEventEmitted = false;
  commander.on('order:cancelled', () => {
    cancelledEventEmitted = true;
  });

  commander.parseVoiceGrammar('sell 1.5 eth');
  assert(commander.pendingOrder !== null);

  const rejectRes = commander.parseVoiceGrammar('reject order');
  assert.strictEqual(rejectRes.matched, true);
  assert.strictEqual(cancelledEventEmitted, true);
  assert.strictEqual(commander.pendingOrder, null);
});

test('CryptoExchangeProVoiceCommander - registers and executes custom command grammar', () => {
  const commander = new CryptoExchangeProVoiceCommander();

  commander.registerCommand(
    'flash_loan_calc',
    /flash\s+loan\s+(\d+)/i,
    (raw, match) => {
      const amt = match[1];
      return `Estimated flash loan fee for ${amt} USDT is 0.09%.`;
    },
    'Flash Loan Calculation'
  );

  const res = commander.parseVoiceGrammar('flash loan 10000');
  assert.strictEqual(res.matched, true);
  assert.strictEqual(res.command, 'flash_loan_calc');
  assert(res.response.includes('Estimated flash loan fee'));
});

test('CryptoExchangeProVoiceCommander - handles fallback for unrecognized phrases', () => {
  const commander = new CryptoExchangeProVoiceCommander();

  const res = commander.parseVoiceGrammar('teleport to the moon');
  assert.strictEqual(res.matched, false);
  assert.strictEqual(res.intent, 'FALLBACK');
  assert.strictEqual(res.action, 'FALLBACK');
  assert.strictEqual(res.confidence, 0);
  assert.strictEqual(res.response, DEFAULT_FALLBACK_PHRASE);

  const history = commander.getCommandHistory();
  assert.strictEqual(history.length, 1);
  assert.strictEqual(history[0].action, 'FALLBACK');
});

test('CryptoExchangeProVoiceCommander - event emitter on/off/emit operations', () => {
  const commander = new CryptoExchangeProVoiceCommander();
  let calls = 0;
  const handler = (data) => {
    calls++;
  };

  commander.on('test-event', handler);
  commander.emit('test-event', { val: 1 });
  assert.strictEqual(calls, 1);

  commander.off('test-event', handler);
  commander.emit('test-event', { val: 2 });
  assert.strictEqual(calls, 1);
});

test('CryptoExchangeProVoiceCommander - clears history cleanly', () => {
  const commander = new CryptoExchangeProVoiceCommander();
  commander.parseVoiceGrammar('quote btc');
  commander.parseVoiceGrammar('read portfolio balance');
  assert.strictEqual(commander.getCommandHistory().length, 2);

  commander.clearHistory();
  assert.strictEqual(commander.getCommandHistory().length, 0);
});

test('CryptoExchangeProVoiceCommander - synthesizeResponse resolves false when SpeechSynthesis is unavailable', async () => {
  const commander = new CryptoExchangeProVoiceCommander({ speechSynth: null });
  const result = await commander.synthesizeResponse('Test audio readout');
  assert.strictEqual(result, false);
});

test('CryptoExchangeProVoiceCommander - simulateVoiceInput dispatches parsed grammar', () => {
  const commander = new CryptoExchangeProVoiceCommander();
  const parsed = commander.simulateVoiceInput('quote sol');
  assert.strictEqual(parsed.matched, true);
  assert.strictEqual(parsed.intent, 'CHECK_PRICE');
  assert.strictEqual(parsed.params.asset, 'SOL');
});

test('CryptoExchangeProVoiceCommander - toggleListening starts and stops listening', async () => {
  let started = false;
  let stopped = false;

  class MockRecognition {
    start() { started = true; if (this.onstart) this.onstart(); }
    stop() { stopped = true; if (this.onend) this.onend(); }
  }

  const commander = new CryptoExchangeProVoiceCommander({
    speechRecognition: MockRecognition
  });

  await commander.startListening();
  assert.strictEqual(commander.isListening, true);
  assert.strictEqual(started, true);

  commander.stopListening();
  assert.strictEqual(commander.isListening, false);
  assert.strictEqual(stopped, true);
});

test('CryptoExchangeProVoiceCommander - synthesizeResponse works with mock SpeechSynthesis', async () => {
  let spokenText = null;
  const mockSynth = {
    cancel() {},
    speak(utterance) {
      spokenText = utterance.text;
      if (utterance.onend) utterance.onend();
    }
  };

  // Mock global SpeechSynthesisUtterance if not in browser
  globalThis.SpeechSynthesisUtterance = class {
    constructor(text) {
      this.text = text;
    }
  };

  const commander = new CryptoExchangeProVoiceCommander({ speechSynth: mockSynth });
  const success = await commander.synthesizeResponse('Order executed successfully.');
  assert.strictEqual(success, true);
  assert.strictEqual(spokenText, 'Order executed successfully.');
});

test('CryptoExchangeProVoiceCommander - handles complex word-based amounts', () => {
  const commander = new CryptoExchangeProVoiceCommander();

  const res1 = commander.parseVoiceGrammar('buy a quarter btc');
  assert.strictEqual(res1.matched, true);
  assert.strictEqual(res1.params.amount, 0.25);
  assert.strictEqual(res1.params.asset, 'BTC');

  const res2 = commander.parseVoiceGrammar('sell five hundred usdt');
  assert.strictEqual(res2.matched, true);
  assert.strictEqual(res2.params.amount, 500);
});

test('CryptoExchangeProVoiceCommander - handles help and status vocal grammars', () => {
  const commander = new CryptoExchangeProVoiceCommander();

  const helpRes = commander.parseVoiceGrammar('what can i say');
  assert.strictEqual(helpRes.matched, true);
  assert.strictEqual(helpRes.intent, 'HELP');
  assert(helpRes.response.includes('Available vocal commands'));

  const statusRes = commander.parseVoiceGrammar('system status');
  assert.strictEqual(statusRes.matched, true);
  assert.strictEqual(statusRes.intent, 'STATUS');
  assert(statusRes.response.includes('operational'));
});

test('CryptoExchangeProVoiceCommander - handles reset directive and clears history', () => {
  const commander = new CryptoExchangeProVoiceCommander();
  commander.parseVoiceGrammar('buy 0.5 btc');
  assert.strictEqual(commander.getCommandHistory().length, 1);
  assert(commander.pendingOrder !== null);

  const resetRes = commander.parseVoiceGrammar('clear history');
  assert.strictEqual(resetRes.matched, true);
  assert.strictEqual(resetRes.intent, 'RESET');
  assert.strictEqual(commander.pendingOrder, null);
  // Only the reset command itself was added to history
  assert.strictEqual(commander.getCommandHistory().length, 1);
  assert.strictEqual(commander.getCommandHistory()[0].intent, 'RESET');
});

