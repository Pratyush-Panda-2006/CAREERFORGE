import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LuxuryRealmsVoiceCommander } from './voice-commander.js';

test('LuxuryRealmsVoiceCommander - grammar regex matching recognizes known commands', () => {
  const commander = new LuxuryRealmsVoiceCommander({
    grammars: [
      { pattern: '\\b(book|reserve|reservation)\\b', command: 'book_stay', action: 'book_stay', confidence: 0.9 },
      { pattern: '\\b(check.in|checkin)\\b', command: 'check_in', action: 'check_in', confidence: 0.9 }
    ],
    commands: [
      { id: 'book_stay', response: 'Your luxury stay has been booked.' },
      { id: 'check_in', response: 'Checking you in now.' }
    ]
  });

  const book = commander.parseVoiceGrammar('please book a room');
  assert.strictEqual(book.command, 'book_stay');
  assert.strictEqual(book.action, 'book_stay');
  assert.strictEqual(book.confidence, 0.9);

  const checkin = commander.parseVoiceGrammar('i want to check in');
  assert.strictEqual(checkin.command, 'check_in');
  assert.strictEqual(checkin.action, 'check_in');
});

test('LuxuryRealmsVoiceCommander - command routing lookup returns correct responses', () => {
  const commander = new LuxuryRealmsVoiceCommander({
    grammars: [
      { pattern: '\\b(help|assist|concierge)\\b', command: 'help', action: 'help', confidence: 0.8 }
    ],
    commands: [
      { id: 'help', response: 'Available commands: book, check in, check out, spa, help.' }
    ]
  });

  const parsed = commander.parseVoiceGrammar('i need help');
  const routed = commander.routeCommand(parsed);
  assert.strictEqual(routed.handled, true);
  assert.strictEqual(routed.message, 'Available commands: book, check in, check out, spa, help.');
});

test('LuxuryRealmsVoiceCommander - fallback phrase handling for unknown commands', () => {
  const commander = new LuxuryRealmsVoiceCommander({
    grammars: [
      { pattern: '\\b(book|reserve)\\b', command: 'book_stay', action: 'book_stay', confidence: 0.9 }
    ],
    commands: [
      { id: 'book_stay', response: 'Your luxury stay has been booked.' }
    ]
  });

  const unknown = commander.parseVoiceGrammar('play some music');
  assert.strictEqual(unknown.command, 'unknown');
  assert.strictEqual(unknown.action, 'fallback');

  const routed = commander.routeCommand(unknown);
  assert.strictEqual(routed.handled, false);
  assert.ok(typeof routed.message === 'string' && routed.message.length > 0);
});

test('LuxuryRealmsVoiceCommander - record and retrieve command history', () => {
  const commander = new LuxuryRealmsVoiceCommander({ maxHistory: 5 });
  commander.recordCommand('book stay', 'Your luxury stay has been booked.', 'book_stay');
  commander.recordCommand('check in', 'Checking you in now.', 'check_in');

  const history = commander.getHistory();
  assert.strictEqual(history.length, 2);
  assert.strictEqual(history[0].transcript, 'check in');
  assert.strictEqual(history[1].transcript, 'book stay');
  assert.ok(history[0].id.startsWith('vc_'));

  commander.clearHistory();
  assert.strictEqual(commander.getHistory().length, 0);
});
