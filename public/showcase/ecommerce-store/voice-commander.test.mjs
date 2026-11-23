import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EcommerceStoreVoiceCommander } from './voice-commander.js';

test('EcommerceStoreVoiceCommander - default initialization and configuration options', () => {
  const commander = new EcommerceStoreVoiceCommander();

  assert.strictEqual(commander.isListening, false);
  assert.strictEqual(commander.status, 'IDLE');
  assert.strictEqual(commander.currentPage, 'products');
  assert.strictEqual(commander.activeCategory, 'all');
  assert.strictEqual(commander.highContrast, false);
  assert.deepStrictEqual(commander.cart, []);
  assert.deepStrictEqual(commander.wishlist, []);
  assert.strictEqual(commander.appliedPromo, null);
  assert.strictEqual(commander.lastSearchQuery, null);
  assert.deepStrictEqual(commander.searchHistory, []);
  assert.strictEqual(commander.isCheckingOut, false);
  assert.deepStrictEqual(commander.commandHistory, []);
  assert.deepStrictEqual(commander.spokenMessages, []);
  assert.strictEqual(commander.options.language, 'en-US');
  assert.strictEqual(commander.options.maxHistory, 50);

  // Custom options
  const custom = new EcommerceStoreVoiceCommander({
    language: 'en-GB',
    maxHistory: 15,
    initialPage: 'cart',
    initialCategory: 'electronics',
    highContrast: true,
    initialCart: [{ id: 'item_1', name: 'Headphones', quantity: 1, timestamp: Date.now() }],
    initialPromo: 'WELCOME10'
  });

  assert.strictEqual(custom.options.language, 'en-GB');
  assert.strictEqual(custom.options.maxHistory, 15);
  assert.strictEqual(custom.currentPage, 'cart');
  assert.strictEqual(custom.activeCategory, 'electronics');
  assert.strictEqual(custom.highContrast, true);
  assert.strictEqual(custom.cart.length, 1);
  assert.strictEqual(custom.cart[0].name, 'Headphones');
  assert.strictEqual(custom.appliedPromo, 'WELCOME10');
});

test('EcommerceStoreVoiceCommander - event emitter subscriptions, dispatching, and unregistering', () => {
  const commander = new EcommerceStoreVoiceCommander();
  const eventsReceived = [];

  const handler = (data) => {
    eventsReceived.push(data);
  };

  // Test subscription
  commander.on('testEvent', handler);
  commander.emit('testEvent', { step: 1 });
  assert.strictEqual(eventsReceived.length, 1);
  assert.deepStrictEqual(eventsReceived[0], { step: 1 });

  // Multiple listeners
  let secondReceived = null;
  const secondHandler = (data) => {
    secondReceived = data;
  };
  commander.on('testEvent', secondHandler);
  commander.emit('testEvent', { step: 2 });
  assert.strictEqual(eventsReceived.length, 2);
  assert.deepStrictEqual(secondReceived, { step: 2 });

  // Test unregistering single listener
  commander.off('testEvent', secondHandler);
  secondReceived = null;
  commander.emit('testEvent', { step: 3 });
  assert.strictEqual(eventsReceived.length, 3);
  assert.strictEqual(secondReceived, null);

  // Test unregistering all listeners for event
  commander.off('testEvent');
  commander.emit('testEvent', { step: 4 });
  assert.strictEqual(eventsReceived.length, 3);

  // Non-function handlers or invalid events handled gracefully
  assert.strictEqual(commander.on('invalid', null), commander);
  assert.strictEqual(commander.emit('nonExistentEvent', {}), false);
});

test('EcommerceStoreVoiceCommander - microphone toggling and status management', () => {
  const commander = new EcommerceStoreVoiceCommander();
  const stateChanges = [];

  commander.on('listeningStateChange', (data) => {
    stateChanges.push(data);
  });

  assert.strictEqual(commander.isListeningState(), false);

  // Start listening
  const started = commander.startListening();
  assert.strictEqual(started, true);
  assert.strictEqual(commander.isListeningState(), true);
  assert.strictEqual(commander.status, 'LISTENING');
  assert.strictEqual(stateChanges.length, 1);
  assert.strictEqual(stateChanges[0].isListening, true);

  // Idempotent start
  assert.strictEqual(commander.startListening(), true);
  assert.strictEqual(stateChanges.length, 1);

  // Stop listening
  const stopped = commander.stopListening();
  assert.strictEqual(stopped, false);
  assert.strictEqual(commander.isListeningState(), false);
  assert.strictEqual(commander.status, 'IDLE');
  assert.strictEqual(stateChanges.length, 2);
  assert.strictEqual(stateChanges[1].isListening, false);

  // Idempotent stop
  assert.strictEqual(commander.stopListening(), false);
  assert.strictEqual(stateChanges.length, 2);

  // Toggle listening
  const toggledOn = commander.toggleListening();
  assert.strictEqual(toggledOn, true);
  assert.strictEqual(commander.isListeningState(), true);

  const toggledOff = commander.toggleListening();
  assert.strictEqual(toggledOff, false);
  assert.strictEqual(commander.isListeningState(), false);
});

test('EcommerceStoreVoiceCommander - handling empty, null, whitespace, and malformed transcripts', () => {
  const commander = new EcommerceStoreVoiceCommander();

  // Null input
  const resNull = commander.parseVoiceGrammar(null);
  assert.strictEqual(resNull.matched, false);
  assert.strictEqual(resNull.action, 'UNKNOWN');
  assert.strictEqual(resNull.error, 'Empty transcript');

  // Undefined input
  const resUndef = commander.parseVoiceGrammar(undefined);
  assert.strictEqual(resUndef.matched, false);
  assert.strictEqual(resUndef.action, 'UNKNOWN');
  assert.strictEqual(resUndef.error, 'Empty transcript');

  // Empty string
  const resEmpty = commander.parseVoiceGrammar('');
  assert.strictEqual(resEmpty.matched, false);
  assert.strictEqual(resEmpty.action, 'UNKNOWN');
  assert.strictEqual(resEmpty.error, 'Empty transcript');

  // Whitespace only
  const resWhite = commander.parseVoiceGrammar('     ');
  assert.strictEqual(resWhite.matched, false);
  assert.strictEqual(resWhite.action, 'UNKNOWN');
  assert.strictEqual(resWhite.error, 'Empty transcript');

  // Non-string types
  const resNum = commander.parseVoiceGrammar(12345);
  assert.strictEqual(resNum.matched, false);
  assert.strictEqual(resNum.action, 'UNKNOWN');
  assert.strictEqual(resNum.error, 'Invalid transcript type');

  const resObj = commander.parseVoiceGrammar({ cmd: 'navigate' });
  assert.strictEqual(resObj.matched, false);
  assert.strictEqual(resObj.error, 'Invalid transcript type');

  const resArr = commander.parseVoiceGrammar(['cart']);
  assert.strictEqual(resArr.matched, false);
  assert.strictEqual(resArr.error, 'Invalid transcript type');

  // Process empty input safely through execution pipeline
  const executedRecord = commander.processTranscript('');
  assert.strictEqual(executedRecord.matched, false);
  assert.strictEqual(executedRecord.status, 'UNRECOGNIZED');
  assert.ok(executedRecord.response.includes('No voice input detected'));
});

test('EcommerceStoreVoiceCommander - grammar parsing: NAVIGATE_PAGE', () => {
  const commander = new EcommerceStoreVoiceCommander();

  const pages = ['products', 'cart', 'checkout', 'orders', 'wishlist'];
  for (const page of pages) {
    const res = commander.parseVoiceGrammar(`navigate to ${page}`);
    assert.strictEqual(res.matched, true);
    assert.strictEqual(res.action, 'NAVIGATE_PAGE');
    assert.strictEqual(res.payload.page, page);
  }

  // Synonym commands
  assert.strictEqual(commander.parseVoiceGrammar('go to cart').payload.page, 'cart');
  assert.strictEqual(commander.parseVoiceGrammar('open checkout').payload.page, 'checkout');
  assert.strictEqual(commander.parseVoiceGrammar('show orders').payload.page, 'orders');
  assert.strictEqual(commander.parseVoiceGrammar('view wishlist').payload.page, 'wishlist');
  assert.strictEqual(commander.parseVoiceGrammar('visit products page').payload.page, 'products');

  // Singular normalized forms
  assert.strictEqual(commander.parseVoiceGrammar('open product').payload.page, 'products');
  assert.strictEqual(commander.parseVoiceGrammar('view order').payload.page, 'orders');
  assert.strictEqual(commander.parseVoiceGrammar('go to home').payload.page, 'products');
});

test('EcommerceStoreVoiceCommander - grammar parsing: SEARCH_PRODUCTS', () => {
  const commander = new EcommerceStoreVoiceCommander();

  // "search for <query>"
  const res1 = commander.parseVoiceGrammar('search for wireless headphones');
  assert.strictEqual(res1.matched, true);
  assert.strictEqual(res1.action, 'SEARCH_PRODUCTS');
  assert.strictEqual(res1.payload.query, 'wireless headphones');

  // "search <query>"
  const res2 = commander.parseVoiceGrammar('search mechanical keyboard');
  assert.strictEqual(res2.matched, true);
  assert.strictEqual(res2.payload.query, 'mechanical keyboard');

  // "find <query>"
  const res3 = commander.parseVoiceGrammar('find usb-c multiport adapter');
  assert.strictEqual(res3.matched, true);
  assert.strictEqual(res3.payload.query, 'usb-c multiport adapter');

  // "lookup <query>"
  const res4 = commander.parseVoiceGrammar('lookup gaming monitor');
  assert.strictEqual(res4.matched, true);
  assert.strictEqual(res4.payload.query, 'gaming monitor');

  // "look for <query>"
  const res5 = commander.parseVoiceGrammar('look for running sneakers');
  assert.strictEqual(res5.matched, true);
  assert.strictEqual(res5.payload.query, 'running sneakers');
});

test('EcommerceStoreVoiceCommander - grammar parsing: FILTER_CATEGORY', () => {
  const commander = new EcommerceStoreVoiceCommander();
  const categories = ['electronics', 'apparel', 'home', 'books'];

  for (const cat of categories) {
    const res = commander.parseVoiceGrammar(`filter by ${cat}`);
    assert.strictEqual(res.matched, true);
    assert.strictEqual(res.action, 'FILTER_CATEGORY');
    assert.strictEqual(res.payload.category, cat);
  }

  // Variations
  assert.strictEqual(commander.parseVoiceGrammar('filter category apparel').payload.category, 'apparel');
  assert.strictEqual(commander.parseVoiceGrammar('category home').payload.category, 'home');
  assert.strictEqual(commander.parseVoiceGrammar('filter books').payload.category, 'books');
  assert.strictEqual(commander.parseVoiceGrammar('show category electronics').payload.category, 'electronics');
  assert.strictEqual(commander.parseVoiceGrammar('books category').payload.category, 'books');
  assert.strictEqual(commander.parseVoiceGrammar('filter by category all').payload.category, 'all');
});

test('EcommerceStoreVoiceCommander - grammar parsing: ADD_TO_CART', () => {
  const commander = new EcommerceStoreVoiceCommander();

  // Default quantity = 1
  const res1 = commander.parseVoiceGrammar('add mechanical keyboard to cart');
  assert.strictEqual(res1.matched, true);
  assert.strictEqual(res1.action, 'ADD_TO_CART');
  assert.strictEqual(res1.payload.product, 'mechanical keyboard');
  assert.strictEqual(res1.payload.quantity, 1);

  // Numeric quantity
  const res2 = commander.parseVoiceGrammar('add 2 wireless earbuds to cart');
  assert.strictEqual(res2.matched, true);
  assert.strictEqual(res2.payload.product, 'wireless earbuds');
  assert.strictEqual(res2.payload.quantity, 2);

  // Word quantity "three"
  const res3 = commander.parseVoiceGrammar('add three gaming mice to cart');
  assert.strictEqual(res3.matched, true);
  assert.strictEqual(res3.payload.product, 'gaming mice');
  assert.strictEqual(res3.payload.quantity, 3);

  // Word quantity "a"
  const res4 = commander.parseVoiceGrammar('add a smartwatch to cart');
  assert.strictEqual(res4.matched, true);
  assert.strictEqual(res4.payload.product, 'smartwatch');
  assert.strictEqual(res4.payload.quantity, 1);

  // Word quantity "dozen"
  const res5 = commander.parseVoiceGrammar('buy dozen notebooks');
  assert.strictEqual(res5.matched, true);
  assert.strictEqual(res5.payload.product, 'notebooks');
  assert.strictEqual(res5.payload.quantity, 12);

  // "buy <qty> <product>"
  const res6 = commander.parseVoiceGrammar('buy 4 running shoes');
  assert.strictEqual(res6.matched, true);
  assert.strictEqual(res6.payload.product, 'running shoes');
  assert.strictEqual(res6.payload.quantity, 4);

  // "order <product>"
  const res7 = commander.parseVoiceGrammar('order 1 curved monitor');
  assert.strictEqual(res7.matched, true);
  assert.strictEqual(res7.payload.product, 'curved monitor');
  assert.strictEqual(res7.payload.quantity, 1);

  // "add to cart <qty> <product>"
  const res8 = commander.parseVoiceGrammar('add to cart 2 titanium keyboards');
  assert.strictEqual(res8.matched, true);
  assert.strictEqual(res8.payload.product, 'titanium keyboards');
  assert.strictEqual(res8.payload.quantity, 2);
});

test('EcommerceStoreVoiceCommander - grammar parsing: TOGGLE_HIGH_CONTRAST', () => {
  const commander = new EcommerceStoreVoiceCommander();

  // Toggle mode
  const resToggle = commander.parseVoiceGrammar('toggle high contrast');
  assert.strictEqual(resToggle.matched, true);
  assert.strictEqual(resToggle.action, 'TOGGLE_HIGH_CONTRAST');
  assert.strictEqual(resToggle.payload.enabled, true); // initial is false

  // Explicit enable
  const resEnable = commander.parseVoiceGrammar('enable high contrast');
  assert.strictEqual(resEnable.matched, true);
  assert.strictEqual(resEnable.payload.enabled, true);

  const resTurnOn = commander.parseVoiceGrammar('turn on high contrast');
  assert.strictEqual(resTurnOn.matched, true);
  assert.strictEqual(resTurnOn.payload.enabled, true);

  // Explicit disable
  const resDisable = commander.parseVoiceGrammar('disable high contrast');
  assert.strictEqual(resDisable.matched, true);
  assert.strictEqual(resDisable.payload.enabled, false);

  const resTurnOff = commander.parseVoiceGrammar('turn off high contrast');
  assert.strictEqual(resTurnOff.matched, true);
  assert.strictEqual(resTurnOff.payload.enabled, false);

  // Accessibility aliases
  assert.strictEqual(commander.parseVoiceGrammar('accessibility mode').action, 'TOGGLE_HIGH_CONTRAST');
  assert.strictEqual(commander.parseVoiceGrammar('toggle accessibility').action, 'TOGGLE_HIGH_CONTRAST');
  assert.strictEqual(commander.parseVoiceGrammar('switch contrast').action, 'TOGGLE_HIGH_CONTRAST');
});

test('EcommerceStoreVoiceCommander - grammar parsing: APPLY_PROMO', () => {
  const commander = new EcommerceStoreVoiceCommander();

  // "apply promo <CODE>"
  const res1 = commander.parseVoiceGrammar('apply promo SAVE20');
  assert.strictEqual(res1.matched, true);
  assert.strictEqual(res1.action, 'APPLY_PROMO');
  assert.strictEqual(res1.payload.code, 'SAVE20');

  // "apply promo code <CODE>"
  const res2 = commander.parseVoiceGrammar('apply promo code BLACKFRIDAY25');
  assert.strictEqual(res2.matched, true);
  assert.strictEqual(res2.payload.code, 'BLACKFRIDAY25');

  // "use coupon <CODE>"
  const res3 = commander.parseVoiceGrammar('use coupon NSOC26');
  assert.strictEqual(res3.matched, true);
  assert.strictEqual(res3.payload.code, 'NSOC26');

  // "apply discount code <CODE>"
  const res4 = commander.parseVoiceGrammar('apply discount code DEAL50');
  assert.strictEqual(res4.matched, true);
  assert.strictEqual(res4.payload.code, 'DEAL50');

  // "promo code <CODE>"
  const res5 = commander.parseVoiceGrammar('promo code CYBER_MONDAY');
  assert.strictEqual(res5.matched, true);
  assert.strictEqual(res5.payload.code, 'CYBER_MONDAY');
});

test('EcommerceStoreVoiceCommander - grammar parsing: CHECKOUT', () => {
  const commander = new EcommerceStoreVoiceCommander();

  const checkoutPhrases = [
    'proceed to checkout',
    'checkout',
    'start checkout',
    'initiate checkout',
    'pay now',
    'complete order',
    'complete purchase'
  ];

  for (const phrase of checkoutPhrases) {
    const res = commander.parseVoiceGrammar(phrase);
    assert.strictEqual(res.matched, true);
    assert.strictEqual(res.action, 'CHECKOUT');
  }
});

test('EcommerceStoreVoiceCommander - grammar parsing: HELP & UNRECOGNIZED', () => {
  const commander = new EcommerceStoreVoiceCommander();

  const helpPhrases = ['help', 'what can i say', 'commands', 'show commands', 'list commands', 'voice commands'];
  for (const phrase of helpPhrases) {
    const res = commander.parseVoiceGrammar(phrase);
    assert.strictEqual(res.matched, true);
    assert.strictEqual(res.action, 'HELP');
  }

  // Unrecognized
  const unrec = commander.parseVoiceGrammar('fly spaceship to jupiter');
  assert.strictEqual(unrec.matched, false);
  assert.strictEqual(unrec.action, 'UNKNOWN');
});

test('EcommerceStoreVoiceCommander - command execution and internal state mutations', () => {
  const commander = new EcommerceStoreVoiceCommander();

  // 1. NAVIGATE_PAGE
  commander.executeCommand('NAVIGATE_PAGE', { page: 'cart' });
  assert.strictEqual(commander.currentPage, 'cart');

  // 2. SEARCH_PRODUCTS
  commander.executeCommand('SEARCH_PRODUCTS', { query: 'bluetooth speaker' });
  assert.strictEqual(commander.lastSearchQuery, 'bluetooth speaker');
  assert.deepStrictEqual(commander.searchHistory, ['bluetooth speaker']);

  // 3. FILTER_CATEGORY
  commander.executeCommand('FILTER_CATEGORY', { category: 'electronics' });
  assert.strictEqual(commander.activeCategory, 'electronics');

  // 4. ADD_TO_CART
  commander.executeCommand('ADD_TO_CART', { product: 'mechanical keyboard', quantity: 2 });
  assert.strictEqual(commander.cart.length, 1);
  assert.strictEqual(commander.cart[0].name, 'mechanical keyboard');
  assert.strictEqual(commander.cart[0].quantity, 2);

  commander.executeCommand('ADD_TO_CART', { product: 'wireless mouse', quantity: 1 });
  assert.strictEqual(commander.cart.length, 2);
  const totalItems = commander.cart.reduce((s, i) => s + i.quantity, 0);
  assert.strictEqual(totalItems, 3);

  // 5. TOGGLE_HIGH_CONTRAST
  commander.executeCommand('TOGGLE_HIGH_CONTRAST', { enabled: true });
  assert.strictEqual(commander.highContrast, true);

  commander.executeCommand('TOGGLE_HIGH_CONTRAST', { enabled: false });
  assert.strictEqual(commander.highContrast, false);

  // 6. APPLY_PROMO
  commander.executeCommand('APPLY_PROMO', { code: 'SAVE20' });
  assert.strictEqual(commander.appliedPromo, 'SAVE20');

  // 7. CHECKOUT
  commander.executeCommand('CHECKOUT', {});
  assert.strictEqual(commander.isCheckingOut, true);
  assert.strictEqual(commander.currentPage, 'checkout');

  // 8. HELP
  let helpDispatched = false;
  commander.on('helpRequested', () => {
    helpDispatched = true;
  });
  commander.executeCommand('HELP', {});
  assert.strictEqual(helpDispatched, true);
});

test('EcommerceStoreVoiceCommander - command history logging, unique ID generation, and clearing', () => {
  const commander = new EcommerceStoreVoiceCommander({ maxHistory: 3 });

  // Execute 4 commands to verify FIFO trimming
  const c1 = commander.executeCommand('NAVIGATE_PAGE', { page: 'cart' }, 'go to cart');
  const c2 = commander.executeCommand('FILTER_CATEGORY', { category: 'books' }, 'filter books');
  const c3 = commander.executeCommand('APPLY_PROMO', { code: 'DEAL10' }, 'apply promo DEAL10');
  const c4 = commander.executeCommand('HELP', {}, 'help');

  const history = commander.getCommandHistory();
  assert.strictEqual(history.length, 3); // Max history 3

  // Most recent command is first
  assert.strictEqual(history[0].id, c4.id);
  assert.strictEqual(history[1].id, c3.id);
  assert.strictEqual(history[2].id, c2.id);

  // Unique ID check
  assert.ok(c1.id.startsWith('cmd_'));
  assert.ok(c2.id.startsWith('cmd_'));
  assert.notStrictEqual(c1.id, c2.id);
  assert.notStrictEqual(c2.id, c3.id);

  // Check history record properties
  assert.strictEqual(typeof c1.timestamp, 'number');
  assert.strictEqual(typeof c1.executionTimeMs, 'number');
  assert.strictEqual(typeof c1.timeFormatted, 'string');
  assert.strictEqual(c1.matched, true);
  assert.strictEqual(c1.status, 'SUCCESS');

  // Clear history
  let clearedEventFired = false;
  commander.on('historyCleared', () => {
    clearedEventFired = true;
  });
  commander.clearHistory();
  assert.strictEqual(commander.getCommandHistory().length, 0);
  assert.strictEqual(clearedEventFired, true);
});

test('EcommerceStoreVoiceCommander - headless speech synthesis fallback and spokenMessages tracking', () => {
  const commander = new EcommerceStoreVoiceCommander();

  assert.deepStrictEqual(commander.getSpokenMessages(), []);
  assert.strictEqual(commander.getLastSpokenMessage(), null);

  let synthesizedEventData = null;
  commander.on('speechSynthesized', (data) => {
    synthesizedEventData = data;
  });

  const spoken = commander.synthesizeResponse('Added 2 mechanical keyboards to cart.');
  assert.strictEqual(spoken, 'Added 2 mechanical keyboards to cart.');
  assert.strictEqual(commander.getLastSpokenMessage(), 'Added 2 mechanical keyboards to cart.');
  assert.strictEqual(commander.spokenMessages.length, 1);
  assert.strictEqual(commander.spokenMessages[0], 'Added 2 mechanical keyboards to cart.');
  assert.strictEqual(synthesizedEventData.headless, true);
  assert.strictEqual(commander.status, 'IDLE');

  commander.synthesizeResponse('Navigating to checkout.');
  assert.strictEqual(commander.spokenMessages.length, 2);

  // Clear spoken messages
  commander.clearSpokenMessages();
  assert.strictEqual(commander.getSpokenMessages().length, 0);
});

test('EcommerceStoreVoiceCommander - grammar parsing: case-insensitivity and punctuation resilience', () => {
  const commander = new EcommerceStoreVoiceCommander();

  // Trailing punctuation: period, exclamation, question mark
  const r1 = commander.parseVoiceGrammar('NAVIGATE TO CART!');
  assert.strictEqual(r1.matched, true);
  assert.strictEqual(r1.action, 'NAVIGATE_PAGE');
  assert.strictEqual(r1.payload.page, 'cart');

  const r2 = commander.parseVoiceGrammar('Search for mechanical keyboard???');
  assert.strictEqual(r2.matched, true);
  assert.strictEqual(r2.action, 'SEARCH_PRODUCTS');
  assert.strictEqual(r2.payload.query, 'mechanical keyboard');

  const r3 = commander.parseVoiceGrammar('Apply Promo save20.');
  assert.strictEqual(r3.matched, true);
  assert.strictEqual(r3.action, 'APPLY_PROMO');
  assert.strictEqual(r3.payload.code, 'SAVE20');

  const r4 = commander.parseVoiceGrammar('ADD TWO SMARTWATCHES TO CART!');
  assert.strictEqual(r4.matched, true);
  assert.strictEqual(r4.action, 'ADD_TO_CART');
  assert.strictEqual(r4.payload.product, 'smartwatches');
  assert.strictEqual(r4.payload.quantity, 2);
});

test('EcommerceStoreVoiceCommander - end-to-end processTranscript integration', () => {
  const commander = new EcommerceStoreVoiceCommander();
  const executedActions = [];

  commander.on('commandExecuted', (entry) => {
    executedActions.push(entry.action);
  });

  // 1. Add item to cart with processTranscript
  const r1 = commander.processTranscript('add 2 wireless mouse to cart', 0.98);
  assert.strictEqual(r1.matched, true);
  assert.strictEqual(r1.action, 'ADD_TO_CART');
  assert.strictEqual(r1.confidence, 0.98);
  assert.strictEqual(commander.cart.length, 1);
  assert.strictEqual(commander.cart[0].quantity, 2);
  assert.strictEqual(commander.cart[0].name, 'wireless mouse');
  assert.ok(commander.getLastSpokenMessage().includes('Added 2 wireless mouse'));

  // 2. Filter category with options object
  const r2 = commander.processTranscript('filter by electronics', { confidence: 0.95 });
  assert.strictEqual(r2.matched, true);
  assert.strictEqual(r2.action, 'FILTER_CATEGORY');
  assert.strictEqual(r2.confidence, 0.95);
  assert.strictEqual(commander.activeCategory, 'electronics');

  // 3. Apply promo code
  const r3 = commander.processTranscript('apply promo NSOC26');
  assert.strictEqual(r3.matched, true);
  assert.strictEqual(r3.action, 'APPLY_PROMO');
  assert.strictEqual(commander.appliedPromo, 'NSOC26');

  // 4. Toggle high contrast
  const r4 = commander.processTranscript('toggle high contrast');
  assert.strictEqual(r4.matched, true);
  assert.strictEqual(commander.highContrast, true);

  // 5. Checkout
  const r5 = commander.processTranscript('proceed to checkout');
  assert.strictEqual(r5.matched, true);
  assert.strictEqual(r5.action, 'CHECKOUT');
  assert.strictEqual(commander.isCheckingOut, true);
  assert.strictEqual(commander.currentPage, 'checkout');

  // 6. Unknown voice input
  const r6 = commander.processTranscript('book a flight to london');
  assert.strictEqual(r6.matched, false);
  assert.strictEqual(r6.action, 'UNKNOWN');
  assert.strictEqual(r6.status, 'UNRECOGNIZED');
  assert.ok(r6.response.includes('not recognized'));

  // Verify all actions registered in event listener
  assert.deepStrictEqual(executedActions, [
    'ADD_TO_CART',
    'FILTER_CATEGORY',
    'APPLY_PROMO',
    'TOGGLE_HIGH_CONTRAST',
    'CHECKOUT',
    'UNKNOWN'
  ]);

  // History contains all 6 commands
  assert.strictEqual(commander.getCommandHistory().length, 6);
  // Spoken messages recorded for all 6 commands
  assert.strictEqual(commander.getSpokenMessages().length, 6);
});
