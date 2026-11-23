import test from 'node:test';
import assert from 'node:assert/strict';
import { AgencyStudioVoiceCommander } from './voice-commander.js';

// 1. Default initialization and configuration options
test('AgencyStudioVoiceCommander - initializes with default configuration', () => {
  const commander = new AgencyStudioVoiceCommander();

  assert.equal(commander.isListening, false);
  assert.equal(commander.highContrast, false);
  assert.equal(commander.activePage, 'campaigns');
  assert.equal(commander.activeTheme, 'dark');
  assert.equal(commander.activeFilter, 'all');
  assert.equal(commander.activeCampaign, null);
  assert.deepEqual(commander.campaigns, []);
  assert.deepEqual(commander.history, []);
  assert.deepEqual(commander.spokenMessages, []);
  assert.equal(commander.lastSynthesizedSpeech, null);
  assert.equal(commander.lastExport, null);
});

test('AgencyStudioVoiceCommander - accepts custom configuration options', () => {
  const commander = new AgencyStudioVoiceCommander({
    highContrast: true,
    activePage: 'analytics',
    activeTheme: 'neon',
    activeFilter: 'video',
    confidenceThreshold: 0.85,
    speechSynthesisEnabled: false,
    lang: 'en-GB'
  });

  assert.equal(commander.highContrast, true);
  assert.equal(commander.activePage, 'analytics');
  assert.equal(commander.activeTheme, 'neon');
  assert.equal(commander.activeFilter, 'video');
  assert.equal(commander.options.confidenceThreshold, 0.85);
  assert.equal(commander.options.speechSynthesisEnabled, false);
  assert.equal(commander.options.lang, 'en-GB');
});

// 2. Handling of empty, null, and malformed transcripts
test('AgencyStudioVoiceCommander - handles empty, null, and malformed inputs in parseVoiceGrammar', () => {
  const commander = new AgencyStudioVoiceCommander();

  const emptyResult = commander.parseVoiceGrammar('');
  assert.equal(emptyResult.action, 'EMPTY');
  assert.equal(emptyResult.confidence, 0);

  const whitespaceResult = commander.parseVoiceGrammar('    ');
  assert.equal(whitespaceResult.action, 'EMPTY');

  const nullResult = commander.parseVoiceGrammar(null);
  assert.equal(nullResult.action, 'EMPTY');

  const undefinedResult = commander.parseVoiceGrammar(undefined);
  assert.equal(undefinedResult.action, 'EMPTY');

  const numberResult = commander.parseVoiceGrammar(12345);
  assert.equal(numberResult.action, 'EMPTY');

  const objectResult = commander.parseVoiceGrammar({ text: 'hello' });
  assert.equal(objectResult.action, 'EMPTY');
});

test('AgencyStudioVoiceCommander - handles empty or malformed inputs in processTranscript', () => {
  const commander = new AgencyStudioVoiceCommander();

  const res1 = commander.processTranscript('');
  assert.equal(res1.success, false);
  assert.equal(res1.action, 'EMPTY');
  assert.equal(commander.history.length, 1);
  assert.equal(commander.history[0].status, 'empty');

  const res2 = commander.processTranscript(null);
  assert.equal(res2.success, false);
  assert.equal(res2.action, 'EMPTY');
  assert.equal(commander.history.length, 2);
});

// 3. Grammar parsing for all actions with parameter extraction
test('AgencyStudioVoiceCommander - parses NAVIGATE_PAGE with all target routes', () => {
  const commander = new AgencyStudioVoiceCommander();

  const targets = [
    { input: 'go to campaigns', expected: 'campaigns' },
    { input: 'navigate to creatives', expected: 'creatives' },
    { input: 'open briefs', expected: 'briefs' },
    { input: 'view analytics', expected: 'analytics' },
    { input: 'show settings', expected: 'settings' },
    { input: 'page briefs', expected: 'briefs' },
    { input: 'switch to campaign', expected: 'campaigns' }
  ];

  for (const { input, expected } of targets) {
    const res = commander.parseVoiceGrammar(input);
    assert.equal(res.action, 'NAVIGATE_PAGE', `Failed action match for: ${input}`);
    assert.equal(res.params.page, expected, `Failed parameter extraction for: ${input}`);
    assert.ok(res.confidence > 0.9);
  }
});

test('AgencyStudioVoiceCommander - parses CREATE_CAMPAIGN with title and client extraction', () => {
  const commander = new AgencyStudioVoiceCommander();

  const res1 = commander.parseVoiceGrammar('create campaign Summer Launch for Nike');
  assert.equal(res1.action, 'CREATE_CAMPAIGN');
  assert.equal(res1.params.title, 'Summer Launch');
  assert.equal(res1.params.client, 'Nike');

  const res2 = commander.parseVoiceGrammar('new campaign Cyber Vision for Cyberdyne Systems');
  assert.equal(res2.action, 'CREATE_CAMPAIGN');
  assert.equal(res2.params.title, 'Cyber Vision');
  assert.equal(res2.params.client, 'Cyberdyne Systems');

  const res3 = commander.parseVoiceGrammar('start campaign Quantum Rebrand');
  assert.equal(res3.action, 'CREATE_CAMPAIGN');
  assert.equal(res3.params.title, 'Quantum Rebrand');
  assert.equal(res3.params.client, null);
});

test('AgencyStudioVoiceCommander - parses SWITCH_THEME with valid themes', () => {
  const commander = new AgencyStudioVoiceCommander();
  const themes = ['dark', 'neon', 'minimal', 'retro'];

  for (const theme of themes) {
    const res = commander.parseVoiceGrammar(`switch theme to ${theme}`);
    assert.equal(res.action, 'SWITCH_THEME');
    assert.equal(res.params.theme, theme);
  }

  const resShort = commander.parseVoiceGrammar('theme neon');
  assert.equal(resShort.action, 'SWITCH_THEME');
  assert.equal(resShort.params.theme, 'neon');
});

test('AgencyStudioVoiceCommander - parses FILTER_ASSETS with all media types', () => {
  const commander = new AgencyStudioVoiceCommander();
  const filters = ['video', 'copy', 'graphics', 'photography', 'all'];

  for (const filter of filters) {
    const res = commander.parseVoiceGrammar(`filter assets by ${filter}`);
    assert.equal(res.action, 'FILTER_ASSETS');
    assert.equal(res.params.filter, filter);
  }

  const resShort = commander.parseVoiceGrammar('filter copy');
  assert.equal(resShort.action, 'FILTER_ASSETS');
  assert.equal(resShort.params.filter, 'copy');
});

test('AgencyStudioVoiceCommander - parses TOGGLE_HIGH_CONTRAST accessibility intents', () => {
  const commander = new AgencyStudioVoiceCommander();

  const toggleRes = commander.parseVoiceGrammar('toggle high contrast');
  assert.equal(toggleRes.action, 'TOGGLE_HIGH_CONTRAST');
  assert.equal(toggleRes.params.mode, 'toggle');

  const onRes = commander.parseVoiceGrammar('enable high contrast');
  assert.equal(onRes.action, 'TOGGLE_HIGH_CONTRAST');
  assert.equal(onRes.params.enable, true);

  const offRes = commander.parseVoiceGrammar('turn off high contrast');
  assert.equal(offRes.action, 'TOGGLE_HIGH_CONTRAST');
  assert.equal(offRes.params.enable, false);
});

test('AgencyStudioVoiceCommander - parses EXPORT_BRIEF with formats', () => {
  const commander = new AgencyStudioVoiceCommander();

  const pdfRes = commander.parseVoiceGrammar('export brief as pdf');
  assert.equal(pdfRes.action, 'EXPORT_BRIEF');
  assert.equal(pdfRes.params.format, 'pdf');

  const jsonRes = commander.parseVoiceGrammar('export brief json');
  assert.equal(jsonRes.action, 'EXPORT_BRIEF');
  assert.equal(jsonRes.params.format, 'json');

  const mdRes = commander.parseVoiceGrammar('download brief markdown');
  assert.equal(mdRes.action, 'EXPORT_BRIEF');
  assert.equal(mdRes.params.format, 'markdown');

  const defaultRes = commander.parseVoiceGrammar('export brief');
  assert.equal(defaultRes.action, 'EXPORT_BRIEF');
  assert.equal(defaultRes.params.format, 'pdf');
});

test('AgencyStudioVoiceCommander - parses HELP and UNKNOWN fallback', () => {
  const commander = new AgencyStudioVoiceCommander();

  const helpRes = commander.parseVoiceGrammar('help');
  assert.equal(helpRes.action, 'HELP');

  const commandsRes = commander.parseVoiceGrammar('what can I say');
  assert.equal(commandsRes.action, 'HELP');

  const unknownRes = commander.parseVoiceGrammar('launch satellite to lunar orbit');
  assert.equal(unknownRes.action, 'UNKNOWN');
  assert.equal(unknownRes.confidence, 0.0);
});

// 4. Command execution and internal state mutations
test('AgencyStudioVoiceCommander - mutates state correctly upon command execution', () => {
  const commander = new AgencyStudioVoiceCommander();

  // Navigate
  commander.executeCommand({ action: 'NAVIGATE_PAGE', params: { page: 'analytics' }, confidence: 0.95 });
  assert.equal(commander.activePage, 'analytics');

  // Create Campaign
  commander.executeCommand({
    action: 'CREATE_CAMPAIGN',
    params: { title: 'Neon Horizon', client: 'Aetheria' },
    confidence: 0.95
  });
  assert.equal(commander.campaigns.length, 1);
  assert.equal(commander.activeCampaign.title, 'Neon Horizon');
  assert.equal(commander.activeCampaign.client, 'Aetheria');

  // Switch Theme
  commander.executeCommand({ action: 'SWITCH_THEME', params: { theme: 'retro' }, confidence: 0.95 });
  assert.equal(commander.activeTheme, 'retro');

  // Filter Assets
  commander.executeCommand({ action: 'FILTER_ASSETS', params: { filter: 'graphics' }, confidence: 0.95 });
  assert.equal(commander.activeFilter, 'graphics');

  // High Contrast
  commander.executeCommand({ action: 'TOGGLE_HIGH_CONTRAST', params: { enable: true }, confidence: 0.95 });
  assert.equal(commander.highContrast, true);
  commander.executeCommand({ action: 'TOGGLE_HIGH_CONTRAST', params: { mode: 'toggle' }, confidence: 0.95 });
  assert.equal(commander.highContrast, false);

  // Export Brief
  commander.executeCommand({ action: 'EXPORT_BRIEF', params: { format: 'json' }, confidence: 0.95 });
  assert.ok(commander.lastExport);
  assert.equal(commander.lastExport.format, 'json');
});

// 5. Command history logging and clearing
test('AgencyStudioVoiceCommander - logs command history with timestamps and unique IDs', () => {
  const commander = new AgencyStudioVoiceCommander();

  commander.processTranscript('go to creatives');
  commander.processTranscript('switch theme to neon');
  commander.processTranscript('unknown gibberish command');

  const history = commander.getHistory();
  assert.equal(history.length, 3);

  // Check structure of history items
  for (const item of history) {
    assert.ok(item.id.startsWith('cmd-'));
    assert.ok(item.timestamp);
    assert.ok(item.rawTranscript);
    assert.ok(item.action);
    assert.ok(item.status);
    assert.ok(item.feedback);
  }

  assert.equal(history[0].action, 'NAVIGATE_PAGE');
  assert.equal(history[1].action, 'SWITCH_THEME');
  assert.equal(history[2].action, 'UNKNOWN');
  assert.equal(history[2].status, 'unrecognized');

  // Clear history
  commander.clearHistory();
  assert.equal(commander.getHistory().length, 0);
});

// 6. Event emitter subscriptions and event dispatch
test('AgencyStudioVoiceCommander - supports on, off, and emit patterns', () => {
  const commander = new AgencyStudioVoiceCommander();

  let navigatedTo = null;
  const navHandler = (payload) => {
    navigatedTo = payload.page;
  };

  commander.on('navigate', navHandler);
  commander.processTranscript('open settings');
  assert.equal(navigatedTo, 'settings');

  // Unsubscribe
  commander.off('navigate', navHandler);
  commander.processTranscript('open briefs');
  assert.equal(navigatedTo, 'settings'); // Still old value because handler was detached

  // Multiple event emissions
  let contrastFired = false;
  commander.on('contrast-changed', () => {
    contrastFired = true;
  });
  commander.toggleHighContrast();
  assert.equal(contrastFired, true);
});

// 7. Headless speech synthesis fallback and microphone toggle
test('AgencyStudioVoiceCommander - headless speech synthesis records spoken messages', () => {
  const commander = new AgencyStudioVoiceCommander();

  commander.synthesizeResponse('Testing speech output');
  assert.equal(commander.lastSynthesizedSpeech, 'Testing speech output');
  assert.deepEqual(commander.spokenMessages, ['Testing speech output']);

  // Check supported flags in Node.js
  assert.equal(commander.isSpeechRecognitionSupported(), false);
  assert.equal(commander.isSpeechSynthesisSupported(), false);

  // Microphone toggle state
  assert.equal(commander.isListening, false);
  commander.startListening();
  assert.equal(commander.isListening, true);
  commander.stopListening();
  assert.equal(commander.isListening, false);
  commander.toggleListening();
  assert.equal(commander.isListening, true);
  commander.toggleListening();
  assert.equal(commander.isListening, false);
});

// 8. End-to-end processTranscript integration
test('AgencyStudioVoiceCommander - end-to-end processTranscript for valid and invalid commands', () => {
  const commander = new AgencyStudioVoiceCommander();

  // Test full flow for campaign creation
  const result1 = commander.processTranscript('create campaign Cyber Sprint for Nike', {
    id: 'custom-cmd-101'
  });

  assert.equal(result1.id, 'custom-cmd-101');
  assert.equal(result1.success, true);
  assert.equal(result1.action, 'CREATE_CAMPAIGN');
  assert.equal(result1.params.title, 'Cyber Sprint');
  assert.equal(result1.params.client, 'Nike');
  assert.ok(result1.feedback.includes('Cyber Sprint'));
  assert.equal(commander.activeCampaign.title, 'Cyber Sprint');
  assert.equal(commander.spokenMessages[commander.spokenMessages.length - 1], result1.feedback);

  // Test full flow for invalid / unknown command
  const result2 = commander.processTranscript('play jazz on the turntable');
  assert.equal(result2.success, false);
  assert.equal(result2.action, 'UNKNOWN');
  assert.ok(result2.feedback.includes('Command not recognized'));

  // Test high contrast toggling via method
  const hcState1 = commander.toggleHighContrast();
  assert.equal(hcState1, true);
  assert.equal(commander.highContrast, true);

  const hcState2 = commander.toggleHighContrast(false);
  assert.equal(hcState2, false);
  assert.equal(commander.highContrast, false);
});
