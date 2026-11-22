import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FintechVaultVoiceCommander } from './voice-commander.js';

test('FintechVaultVoiceCommander - initializes with default state', () => {
  const commander = new FintechVaultVoiceCommander();

  assert.strictEqual(commander.status, 'idle');
  assert.strictEqual(commander.isListening, false);
  assert.strictEqual(commander.vaultState.isLocked, false);
  assert.strictEqual(commander.vaultState.highContrast, false);
  assert.strictEqual(commander.vaultState.balance, 1250000.00);
  assert.strictEqual(commander.vaultState.currency, 'USD');
  assert.strictEqual(commander.getCommandHistory().length, 0);
  assert.strictEqual(commander.vaultState.auditLog.length, 1);
});

test('FintechVaultVoiceCommander - accepts custom options upon construction', () => {
  const commander = new FintechVaultVoiceCommander({
    initialBalance: 500000,
    initialLocked: true,
    initialHighContrast: true,
    currency: 'EUR'
  });

  assert.strictEqual(commander.vaultState.balance, 500000);
  assert.strictEqual(commander.vaultState.isLocked, true);
  assert.strictEqual(commander.vaultState.highContrast, true);
  assert.strictEqual(commander.vaultState.currency, 'EUR');
});

test('FintechVaultVoiceCommander - parses SHOW_VAULT_BALANCE grammar variations', () => {
  const commander = new FintechVaultVoiceCommander();
  const variations = [
    'show balance',
    'check balance',
    'view vault balance',
    'check vault balance',
    'vault balance',
    'what is my balance',
    'check my balance',
    'Show Balance.',
    'VIEW VAULT BALANCE'
  ];

  for (const phrase of variations) {
    const parsed = commander.parseVoiceGrammar(phrase);
    assert.strictEqual(parsed.action, 'SHOW_VAULT_BALANCE', `Failed for phrase: "${phrase}"`);
    assert.ok(parsed.confidence > 0.9);
  }
});

test('FintechVaultVoiceCommander - parses TRANSFER_FUNDS with parameter extraction', () => {
  const commander = new FintechVaultVoiceCommander();

  // Parameterized with amount and recipient
  const p1 = commander.parseVoiceGrammar('transfer 500 to alice');
  assert.strictEqual(p1.action, 'TRANSFER_FUNDS');
  assert.strictEqual(p1.payload.amount, 500);
  assert.strictEqual(p1.payload.recipient, 'alice');

  const p2 = commander.parseVoiceGrammar('transfer $1000 to Zurich Vault');
  assert.strictEqual(p2.action, 'TRANSFER_FUNDS');
  assert.strictEqual(p2.payload.amount, 1000);
  assert.strictEqual(p2.payload.recipient, 'zurich vault');

  const p3 = commander.parseVoiceGrammar('send 250.75 dollars to Bob');
  assert.strictEqual(p3.action, 'TRANSFER_FUNDS');
  assert.strictEqual(p3.payload.amount, 250.75);
  assert.strictEqual(p3.payload.recipient, 'bob');

  const p4 = commander.parseVoiceGrammar('wire 5000 usd to Treasury Enclave');
  assert.strictEqual(p4.action, 'TRANSFER_FUNDS');
  assert.strictEqual(p4.payload.amount, 5000);
  assert.strictEqual(p4.payload.recipient, 'treasury enclave');

  // Generic transfer phrases without parameters
  const genericPhrases = ['send funds', 'wire money', 'transfer funds', 'wire funds', 'transfer money'];
  for (const phrase of genericPhrases) {
    const res = commander.parseVoiceGrammar(phrase);
    assert.strictEqual(res.action, 'TRANSFER_FUNDS', `Failed on generic phrase: ${phrase}`);
    assert.strictEqual(res.payload.amount, null);
    assert.strictEqual(res.payload.recipient, null);
  }

  // Recipient only or amount only
  const pRecOnly = commander.parseVoiceGrammar('transfer to Charlie');
  assert.strictEqual(pRecOnly.action, 'TRANSFER_FUNDS');
  assert.strictEqual(pRecOnly.payload.recipient, 'charlie');
  assert.strictEqual(pRecOnly.payload.amount, null);

  const pAmtOnly = commander.parseVoiceGrammar('transfer 750');
  assert.strictEqual(pAmtOnly.action, 'TRANSFER_FUNDS');
  assert.strictEqual(pAmtOnly.payload.amount, 750);
  assert.strictEqual(pAmtOnly.payload.recipient, null);
});

test('FintechVaultVoiceCommander - parses LOCK_VAULT and UNLOCK_VAULT grammars', () => {
  const commander = new FintechVaultVoiceCommander();

  const lockPhrases = ['lock vault', 'freeze account', 'emergency freeze', 'lock account', 'freeze'];
  for (const phrase of lockPhrases) {
    const res = commander.parseVoiceGrammar(phrase);
    assert.strictEqual(res.action, 'LOCK_VAULT', `Failed on: ${phrase}`);
  }

  const unlockPhrases = ['unlock vault', 'authenticate user', 'verify biometrics', 'unfreeze account', 'authenticate'];
  for (const phrase of unlockPhrases) {
    const res = commander.parseVoiceGrammar(phrase);
    assert.strictEqual(res.action, 'UNLOCK_VAULT', `Failed on: ${phrase}`);
  }
});

test('FintechVaultVoiceCommander - parses VIEW_AUDIT_LOG and TOGGLE_HIGH_CONTRAST grammars', () => {
  const commander = new FintechVaultVoiceCommander();

  const auditPhrases = ['show audit log', 'view transactions', 'compliance history', 'audit log', 'transaction history'];
  for (const phrase of auditPhrases) {
    const res = commander.parseVoiceGrammar(phrase);
    assert.strictEqual(res.action, 'VIEW_AUDIT_LOG', `Failed on: ${phrase}`);
  }

  const contrastPhrases = ['toggle contrast', 'high contrast mode', 'accessibility mode', 'high contrast', 'toggle accessibility'];
  for (const phrase of contrastPhrases) {
    const res = commander.parseVoiceGrammar(phrase);
    assert.strictEqual(res.action, 'TOGGLE_HIGH_CONTRAST', `Failed on: ${phrase}`);
  }
});

test('FintechVaultVoiceCommander - parses HELP and fallback for unknown inputs', () => {
  const commander = new FintechVaultVoiceCommander();

  const helpPhrases = ['help', 'list commands', 'what can I say', 'commands', 'help me?'];
  for (const phrase of helpPhrases) {
    const res = commander.parseVoiceGrammar(phrase);
    assert.strictEqual(res.action, 'HELP', `Failed on: ${phrase}`);
  }

  const unknownPhrases = ['order pizza', 'turn on the lights', 'weather today', '', null, undefined];
  for (const phrase of unknownPhrases) {
    const res = commander.parseVoiceGrammar(phrase);
    assert.strictEqual(res.action, 'UNKNOWN', `Failed on: ${phrase}`);
  }
});

test('FintechVaultVoiceCommander - executes SHOW_VAULT_BALANCE and records audit trail', () => {
  const commander = new FintechVaultVoiceCommander({ initialBalance: 750000 });
  const result = commander.executeCommand('SHOW_VAULT_BALANCE');

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.balance, 750000);
  assert.match(result.response, /750,000/);

  const logs = commander.vaultState.auditLog;
  const lastLog = logs[logs.length - 1];
  assert.strictEqual(lastLog.action, 'SHOW_BALANCE');
});

test('FintechVaultVoiceCommander - executes TRANSFER_FUNDS deducting balance', () => {
  const commander = new FintechVaultVoiceCommander({ initialBalance: 10000 });

  let eventEmitted = false;
  commander.on('funds-transferred', (data) => {
    eventEmitted = true;
    assert.strictEqual(data.amount, 2500);
    assert.strictEqual(data.recipient, 'Alice');
    assert.strictEqual(data.newBalance, 7500);
  });

  const res = commander.executeCommand('TRANSFER_FUNDS', { amount: 2500, recipient: 'Alice' });
  assert.strictEqual(res.success, true);
  assert.strictEqual(commander.vaultState.balance, 7500);
  assert.strictEqual(eventEmitted, true);
  assert.match(res.response, /Alice/);
});

test('FintechVaultVoiceCommander - rejects transfer exceeding balance', () => {
  const commander = new FintechVaultVoiceCommander({ initialBalance: 500 });
  const res = commander.executeCommand('TRANSFER_FUNDS', { amount: 1000, recipient: 'Bob' });

  assert.strictEqual(res.success, false);
  assert.strictEqual(res.error, 'INSUFFICIENT_FUNDS');
  assert.strictEqual(commander.vaultState.balance, 500); // Balance unchanged
});

test('FintechVaultVoiceCommander - handles partial transfer parameters gracefully', () => {
  const commander = new FintechVaultVoiceCommander();

  const resGeneric = commander.executeCommand('TRANSFER_FUNDS', {});
  assert.strictEqual(resGeneric.success, true);
  assert.strictEqual(resGeneric.pending, true);

  const resNoAmt = commander.executeCommand('TRANSFER_FUNDS', { recipient: 'Charlie' });
  assert.strictEqual(resNoAmt.success, false);
  assert.strictEqual(resNoAmt.error, 'MISSING_AMOUNT');

  const resNoRec = commander.executeCommand('TRANSFER_FUNDS', { amount: 500 });
  assert.strictEqual(resNoRec.success, false);
  assert.strictEqual(resNoRec.error, 'MISSING_RECIPIENT');

  const resNegative = commander.executeCommand('TRANSFER_FUNDS', { amount: -50, recipient: 'Eve' });
  assert.strictEqual(resNegative.success, false);
  assert.strictEqual(resNegative.error, 'INVALID_AMOUNT');
});

test('FintechVaultVoiceCommander - enforces vault lock state and biometric unlock', () => {
  const commander = new FintechVaultVoiceCommander({ initialBalance: 20000 });

  let lockEvent = false;
  let unlockEvent = false;
  commander.on('vault-locked', () => { lockEvent = true; });
  commander.on('vault-unlocked', () => { unlockEvent = true; });

  // Lock vault
  const lockRes = commander.executeCommand('LOCK_VAULT');
  assert.strictEqual(lockRes.success, true);
  assert.strictEqual(commander.vaultState.isLocked, true);
  assert.strictEqual(lockEvent, true);

  // Attempting protected commands while locked
  const balanceAttempt = commander.executeCommand('SHOW_VAULT_BALANCE');
  assert.strictEqual(balanceAttempt.success, false);
  assert.strictEqual(balanceAttempt.error, 'VAULT_LOCKED');
  assert.match(balanceAttempt.response, /Access denied/);

  const transferAttempt = commander.executeCommand('TRANSFER_FUNDS', { amount: 500, recipient: 'Alice' });
  assert.strictEqual(transferAttempt.success, false);
  assert.strictEqual(transferAttempt.error, 'VAULT_LOCKED');

  // Help command is allowed while locked
  const helpAttempt = commander.executeCommand('HELP');
  assert.strictEqual(helpAttempt.success, true);

  // Unlock vault
  const unlockRes = commander.executeCommand('UNLOCK_VAULT');
  assert.strictEqual(unlockRes.success, true);
  assert.strictEqual(commander.vaultState.isLocked, false);
  assert.strictEqual(unlockEvent, true);

  // Now protected commands work again
  const balanceAfter = commander.executeCommand('SHOW_VAULT_BALANCE');
  assert.strictEqual(balanceAfter.success, true);
});

test('FintechVaultVoiceCommander - toggles high contrast accessibility state', () => {
  const commander = new FintechVaultVoiceCommander();
  assert.strictEqual(commander.vaultState.highContrast, false);

  let toggledContrastVal = null;
  commander.on('contrast-toggled', ({ highContrast }) => {
    toggledContrastVal = highContrast;
  });

  const res1 = commander.executeCommand('TOGGLE_HIGH_CONTRAST');
  assert.strictEqual(res1.success, true);
  assert.strictEqual(commander.vaultState.highContrast, true);
  assert.strictEqual(toggledContrastVal, true);

  const res2 = commander.executeCommand('TOGGLE_HIGH_CONTRAST');
  assert.strictEqual(res2.success, true);
  assert.strictEqual(commander.vaultState.highContrast, false);
  assert.strictEqual(toggledContrastVal, false);
});

test('FintechVaultVoiceCommander - retrieves compliance audit log', () => {
  const commander = new FintechVaultVoiceCommander();
  commander.executeCommand('SHOW_VAULT_BALANCE');
  commander.executeCommand('LOCK_VAULT');

  const res = commander.executeCommand('VIEW_AUDIT_LOG');
  assert.strictEqual(res.success, true);
  assert.ok(res.totalLogs >= 3);
  assert.ok(Array.isArray(res.auditLogs));
});

test('FintechVaultVoiceCommander - maintains and clears command history', () => {
  const commander = new FintechVaultVoiceCommander();
  commander.executeCommand('SHOW_VAULT_BALANCE');
  commander.executeCommand('HELP');

  const history = commander.getCommandHistory();
  assert.strictEqual(history.length, 2);
  assert.strictEqual(history[0].action, 'HELP');
  assert.strictEqual(history[1].action, 'SHOW_VAULT_BALANCE');
  assert.ok(history[0].timestamp);
  assert.ok(history[0].id);

  let clearedEmitted = false;
  commander.on('history-cleared', () => { clearedEmitted = true; });

  const cleared = commander.clearHistory();
  assert.strictEqual(cleared.length, 0);
  assert.strictEqual(commander.getCommandHistory().length, 0);
  assert.strictEqual(clearedEmitted, true);
});

test('FintechVaultVoiceCommander - event emitter works with subscription and unsubscription', () => {
  const commander = new FintechVaultVoiceCommander();
  let calls = 0;

  const unsubscribe = commander.on('test-event', (data) => {
    calls++;
    assert.strictEqual(data.val, 42);
  });

  commander.emit('test-event', { val: 42 });
  assert.strictEqual(calls, 1);

  // Unsubscribe
  unsubscribe();
  commander.emit('test-event', { val: 42 });
  assert.strictEqual(calls, 1);
});

test('FintechVaultVoiceCommander - listening controls and simulator toggle', () => {
  const commander = new FintechVaultVoiceCommander();
  assert.strictEqual(commander.isListening, false);

  let listeningEmitted = false;
  let stoppedEmitted = false;
  commander.on('listening', () => { listeningEmitted = true; });
  commander.on('stopped', () => { stoppedEmitted = true; });

  const started = commander.startListening();
  assert.strictEqual(started, true);
  assert.strictEqual(commander.isListening, true);
  assert.strictEqual(commander.status, 'listening');
  assert.strictEqual(listeningEmitted, true);

  // Redundant start returns false
  assert.strictEqual(commander.startListening(), false);

  const stopped = commander.stopListening();
  assert.strictEqual(stopped, true);
  assert.strictEqual(commander.isListening, false);
  assert.strictEqual(commander.status, 'idle');
  assert.strictEqual(stoppedEmitted, true);

  // Toggle listening
  const toggledOn = commander.toggleListening();
  assert.strictEqual(toggledOn, true);
  assert.strictEqual(commander.isListening, true);

  const toggledOff = commander.toggleListening();
  assert.strictEqual(toggledOff, false);
  assert.strictEqual(commander.isListening, false);
});

test('FintechVaultVoiceCommander - processTranscript executes end-to-end voice pipeline', () => {
  const commander = new FintechVaultVoiceCommander();

  const result = commander.processTranscript('transfer $500 to security reserve');
  assert.strictEqual(result.success, true);
  assert.strictEqual(result.action, 'TRANSFER_FUNDS');
  assert.strictEqual(result.transfer.amount, 500);
  assert.strictEqual(result.transfer.recipient, 'security reserve');

  const history = commander.getCommandHistory();
  assert.strictEqual(history.length, 1);
  assert.strictEqual(history[0].transcript, 'transfer $500 to security reserve');
});
