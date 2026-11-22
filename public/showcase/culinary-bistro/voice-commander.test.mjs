import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CulinaryBistroVoiceCommander } from './voice-commander.js';

test('CulinaryBistroVoiceCommander - initializes with correct default state', () => {
  const commander = new CulinaryBistroVoiceCommander();

  assert.strictEqual(commander.isListening, false);
  assert.strictEqual(commander.status, 'IDLE');
  assert.strictEqual(commander.highContrast, false);
  assert.strictEqual(commander.activeFilter, null);
  assert.strictEqual(commander.kitchenQueue.length, 0);
  assert.strictEqual(commander.history.length, 0);
  assert.strictEqual(typeof commander.tables, 'object');
  assert.strictEqual(Object.keys(commander.tables).length, 8);
});

test('CulinaryBistroVoiceCommander - Event Emitter works for on, off, and emit', () => {
  const commander = new CulinaryBistroVoiceCommander();
  let receivedData = null;

  const handler = (data) => {
    receivedData = data;
  };

  commander.on('testEvent', handler);
  commander.emit('testEvent', { foo: 'bar' });
  assert.deepStrictEqual(receivedData, { foo: 'bar' });

  // Remove handler
  commander.off('testEvent', handler);
  receivedData = null;
  commander.emit('testEvent', { foo: 'baz' });
  assert.strictEqual(receivedData, null);
});

test('CulinaryBistroVoiceCommander - Grammar Parser: ORDER_ITEM', () => {
  const commander = new CulinaryBistroVoiceCommander();

  // Numeric quantity
  const res1 = commander.parseVoiceGrammar('order 2 truffle pasta');
  assert.strictEqual(res1.action, 'ORDER_ITEM');
  assert.strictEqual(res1.payload.quantity, 2);
  assert.strictEqual(res1.payload.item, 'truffle pasta');
  assert.strictEqual(res1.payload.table, null);

  // Word quantity
  const res2 = commander.parseVoiceGrammar('order three ribeye steak');
  assert.strictEqual(res2.action, 'ORDER_ITEM');
  assert.strictEqual(res2.payload.quantity, 3);
  assert.strictEqual(res2.payload.item, 'ribeye steak');

  // Default quantity 1
  const res3 = commander.parseVoiceGrammar('order tiramisu');
  assert.strictEqual(res3.action, 'ORDER_ITEM');
  assert.strictEqual(res3.payload.quantity, 1);
  assert.strictEqual(res3.payload.item, 'tiramisu');

  // "add <item> to table <n>"
  const res4 = commander.parseVoiceGrammar('add garlic bread to table 3');
  assert.strictEqual(res4.action, 'ORDER_ITEM');
  assert.strictEqual(res4.payload.quantity, 1);
  assert.strictEqual(res4.payload.item, 'garlic bread');
  assert.strictEqual(res4.payload.table, 3);

  // "order <quantity> <item> to table <n>"
  const res5 = commander.parseVoiceGrammar('order 4 espresso to table 5');
  assert.strictEqual(res5.action, 'ORDER_ITEM');
  assert.strictEqual(res5.payload.quantity, 4);
  assert.strictEqual(res5.payload.item, 'espresso');
  assert.strictEqual(res5.payload.table, 5);
});

test('CulinaryBistroVoiceCommander - Grammar Parser: CHECK_TABLE_STATUS', () => {
  const commander = new CulinaryBistroVoiceCommander();

  // Table status by number
  const res1 = commander.parseVoiceGrammar('table 4 status');
  assert.strictEqual(res1.action, 'CHECK_TABLE_STATUS');
  assert.strictEqual(res1.payload.table, 4);
  assert.strictEqual(res1.payload.all, false);

  // Check table <n>
  const res2 = commander.parseVoiceGrammar('check table 2');
  assert.strictEqual(res2.action, 'CHECK_TABLE_STATUS');
  assert.strictEqual(res2.payload.table, 2);

  // Word table number
  const res3 = commander.parseVoiceGrammar('table four status');
  assert.strictEqual(res3.action, 'CHECK_TABLE_STATUS');
  assert.strictEqual(res3.payload.table, 4);

  // Show reservations / all tables
  const res4 = commander.parseVoiceGrammar('show reservations');
  assert.strictEqual(res4.action, 'CHECK_TABLE_STATUS');
  assert.strictEqual(res4.payload.all, true);
});

test('CulinaryBistroVoiceCommander - Grammar Parser: CALL_SERVER', () => {
  const commander = new CulinaryBistroVoiceCommander();

  const res1 = commander.parseVoiceGrammar('call waiter');
  assert.strictEqual(res1.action, 'CALL_SERVER');
  assert.strictEqual(res1.payload.request, 'waiter');

  const res2 = commander.parseVoiceGrammar('request bill');
  assert.strictEqual(res2.action, 'CALL_SERVER');
  assert.strictEqual(res2.payload.request, 'bill');

  const res3 = commander.parseVoiceGrammar('need water');
  assert.strictEqual(res3.action, 'CALL_SERVER');
  assert.strictEqual(res3.payload.request, 'water');
});

test('CulinaryBistroVoiceCommander - Grammar Parser: DIETARY_FILTER', () => {
  const commander = new CulinaryBistroVoiceCommander();

  const res1 = commander.parseVoiceGrammar('show vegan options');
  assert.strictEqual(res1.action, 'DIETARY_FILTER');
  assert.strictEqual(res1.payload.filter, 'vegan');

  const res2 = commander.parseVoiceGrammar('gluten free menu');
  assert.strictEqual(res2.action, 'DIETARY_FILTER');
  assert.strictEqual(res2.payload.filter, 'gluten-free');

  const res3 = commander.parseVoiceGrammar('allergen filter');
  assert.strictEqual(res3.action, 'DIETARY_FILTER');
  assert.strictEqual(res3.payload.filter, 'allergen');
});

test('CulinaryBistroVoiceCommander - Grammar Parser: FIRE_KITCHEN_ORDER', () => {
  const commander = new CulinaryBistroVoiceCommander();

  const res1 = commander.parseVoiceGrammar('fire course 2');
  assert.strictEqual(res1.action, 'FIRE_KITCHEN_ORDER');
  assert.strictEqual(res1.payload.course, 2);
  assert.strictEqual(res1.payload.rush, true);

  const res2 = commander.parseVoiceGrammar('kitchen rush order');
  assert.strictEqual(res2.action, 'FIRE_KITCHEN_ORDER');
  assert.strictEqual(res2.payload.rush, true);

  const res3 = commander.parseVoiceGrammar('expedite order');
  assert.strictEqual(res3.action, 'FIRE_KITCHEN_ORDER');
  assert.strictEqual(res3.payload.rush, true);
});

test('CulinaryBistroVoiceCommander - Grammar Parser: TOGGLE_HIGH_CONTRAST & HELP & UNKNOWN', () => {
  const commander = new CulinaryBistroVoiceCommander();

  const res1 = commander.parseVoiceGrammar('toggle contrast');
  assert.strictEqual(res1.action, 'TOGGLE_HIGH_CONTRAST');

  const res2 = commander.parseVoiceGrammar('high contrast mode');
  assert.strictEqual(res2.action, 'TOGGLE_HIGH_CONTRAST');

  const res3 = commander.parseVoiceGrammar('accessibility mode');
  assert.strictEqual(res3.action, 'TOGGLE_HIGH_CONTRAST');

  const res4 = commander.parseVoiceGrammar('help');
  assert.strictEqual(res4.action, 'HELP');

  const res5 = commander.parseVoiceGrammar('list commands');
  assert.strictEqual(res5.action, 'HELP');

  const res6 = commander.parseVoiceGrammar('what can I say');
  assert.strictEqual(res6.action, 'HELP');

  const res7 = commander.parseVoiceGrammar('random unknown speech query');
  assert.strictEqual(res7.action, 'UNKNOWN');

  const res8 = commander.parseVoiceGrammar('');
  assert.strictEqual(res8.action, 'UNKNOWN');
});

test('CulinaryBistroVoiceCommander - executeCommand HELP, CALL_SERVER, and TOGGLE_HIGH_CONTRAST', () => {
  const commander = new CulinaryBistroVoiceCommander({ enableSpeechSynthesis: false });

  // HELP
  const helpRes = commander.executeCommand('HELP', {});
  assert.strictEqual(helpRes.status, 'SUCCESS');
  assert.match(helpRes.response, /Culinary Bistro Voice Commands/i);

  // CALL_SERVER
  const waiterRes = commander.executeCommand('CALL_SERVER', { request: 'waiter' });
  assert.strictEqual(waiterRes.status, 'SUCCESS');
  assert.match(waiterRes.response, /Server has been alerted/i);

  const waterRes = commander.executeCommand('CALL_SERVER', { request: 'water' });
  assert.strictEqual(waterRes.status, 'SUCCESS');
  assert.match(waterRes.response, /Carafe of chilled mineral water/i);

  // TOGGLE_HIGH_CONTRAST
  assert.strictEqual(commander.highContrast, false);
  const contrastRes = commander.executeCommand('TOGGLE_HIGH_CONTRAST', {});
  assert.strictEqual(contrastRes.status, 'SUCCESS');
  assert.strictEqual(commander.highContrast, true);
  assert.match(contrastRes.response, /enabled/i);
});

test('CulinaryBistroVoiceCommander - executeCommand mutates kitchen and table state for ORDER_ITEM', () => {
  const commander = new CulinaryBistroVoiceCommander({ enableSpeechSynthesis: false });

  const initialOrders = commander.kitchenQueue.length;
  const initialTable1Orders = commander.tables[1].orderCount;

  const result = commander.executeCommand('ORDER_ITEM', { quantity: 2, item: 'Truffle Tagliatelle', table: 1 });

  assert.strictEqual(result.status, 'SUCCESS');
  assert.strictEqual(commander.kitchenQueue.length, initialOrders + 1);
  assert.strictEqual(commander.kitchenQueue[0].item, 'Truffle Tagliatelle');
  assert.strictEqual(commander.kitchenQueue[0].quantity, 2);
  assert.strictEqual(commander.tables[1].orderCount, initialTable1Orders + 2);
  assert.match(result.response, /Ordered 2 Truffle Tagliatelle/i);
});

test('CulinaryBistroVoiceCommander - executeCommand CHECK_TABLE_STATUS', () => {
  const commander = new CulinaryBistroVoiceCommander({ enableSpeechSynthesis: false });

  // Single table
  const resTable4 = commander.executeCommand('CHECK_TABLE_STATUS', { table: 4, all: false });
  assert.strictEqual(resTable4.status, 'SUCCESS');
  assert.match(resTable4.response, /Table 4 is currently Reserved/i);

  // All reservations summary
  const resAll = commander.executeCommand('CHECK_TABLE_STATUS', { table: null, all: true });
  assert.strictEqual(resAll.status, 'SUCCESS');
  assert.match(resAll.response, /Culinary Bistro seating/i);

  // Non-existent table
  const resNonExistent = commander.executeCommand('CHECK_TABLE_STATUS', { table: 99, all: false });
  assert.strictEqual(resNonExistent.status, 'ERROR');
  assert.match(resNonExistent.response, /was not found/i);
});

test('CulinaryBistroVoiceCommander - executeCommand DIETARY_FILTER & FIRE_KITCHEN_ORDER', () => {
  const commander = new CulinaryBistroVoiceCommander({ enableSpeechSynthesis: false });

  // Order item first
  commander.executeCommand('ORDER_ITEM', { quantity: 1, item: 'Sea Bass', table: 3 });
  assert.strictEqual(commander.kitchenQueue[0].expedited, false);

  // Fire kitchen order
  const fireRes = commander.executeCommand('FIRE_KITCHEN_ORDER', { course: 2, rush: true });
  assert.strictEqual(fireRes.status, 'SUCCESS');
  assert.match(fireRes.response, /Course 2 fired/i);
  assert.strictEqual(commander.kitchenQueue[0].expedited, true);

  // Dietary filter
  const filterRes = commander.executeCommand('DIETARY_FILTER', { filter: 'vegan' });
  assert.strictEqual(filterRes.status, 'SUCCESS');
  assert.strictEqual(commander.activeFilter, 'vegan');
});

test('CulinaryBistroVoiceCommander - Listening controls: start, stop, toggle', () => {
  const commander = new CulinaryBistroVoiceCommander();

  let stateChangeNotified = null;
  commander.on('listeningStateChange', (payload) => {
    stateChangeNotified = payload;
  });

  commander.startListening();
  assert.strictEqual(commander.isListening, true);
  assert.strictEqual(commander.status, 'LISTENING');
  assert.strictEqual(stateChangeNotified?.isListening, true);

  commander.stopListening();
  assert.strictEqual(commander.isListening, false);
  assert.strictEqual(commander.status, 'IDLE');
  assert.strictEqual(stateChangeNotified?.isListening, false);

  commander.toggleListening();
  assert.strictEqual(commander.isListening, true);

  commander.toggleListening();
  assert.strictEqual(commander.isListening, false);
});

test('CulinaryBistroVoiceCommander - full pipeline processTranscript & history management', () => {
  const commander = new CulinaryBistroVoiceCommander({ enableSpeechSynthesis: false });

  let recognized = null;
  let executed = null;

  commander.on('commandRecognized', (e) => { recognized = e; });
  commander.on('commandExecuted', (e) => { executed = e; });

  const result = commander.processTranscript('request bill');

  assert.strictEqual(recognized?.parsed.action, 'CALL_SERVER');
  assert.strictEqual(executed?.action, 'CALL_SERVER');
  assert.strictEqual(result.status, 'SUCCESS');

  // History tracking
  const history = commander.getCommandHistory();
  assert.strictEqual(history.length, 1);
  assert.strictEqual(history[0].action, 'CALL_SERVER');
  assert.strictEqual(history[0].rawTranscript, 'request bill');

  // Clear history
  let cleared = false;
  commander.on('historyCleared', () => { cleared = true; });
  commander.clearHistory();
  assert.strictEqual(cleared, true);
  assert.strictEqual(commander.getCommandHistory().length, 0);
});

test('CulinaryBistroVoiceCommander - High contrast toggle functionality', () => {
  const commander = new CulinaryBistroVoiceCommander();

  let toggleEvent = null;
  commander.on('highContrastToggle', (e) => { toggleEvent = e; });

  assert.strictEqual(commander.highContrast, false);

  commander.toggleHighContrast();
  assert.strictEqual(commander.highContrast, true);
  assert.strictEqual(toggleEvent?.enabled, true);

  commander.toggleHighContrast();
  assert.strictEqual(commander.highContrast, false);
  assert.strictEqual(toggleEvent?.enabled, false);
});

test('CulinaryBistroVoiceCommander - synthesizeResponse works in headless mode without crashing', () => {
  const commander = new CulinaryBistroVoiceCommander();
  let synthesized = null;

  commander.on('speechSynthesized', (e) => {
    synthesized = e;
  });

  commander.synthesizeResponse('Test vocal confirmation');

  assert.strictEqual(synthesized?.text, 'Test vocal confirmation');
  assert.strictEqual(commander.status, 'IDLE');
});
