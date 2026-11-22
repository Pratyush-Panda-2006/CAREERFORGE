import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DocsPortalVoiceCommander,
  DOCS_SECTIONS,
  DOCS_COMMAND_ACTIONS
} from './voice-commander.js';

test('DocsPortalVoiceCommander - initializes with default values and idle state', () => {
  const commander = new DocsPortalVoiceCommander();

  assert.strictEqual(commander.isListeningState(), false);
  assert.strictEqual(commander.getStatus(), 'Idle');
  assert.strictEqual(commander.highContrast, false);
  assert.strictEqual(commander.fontSizeZoom, 100);
  assert.strictEqual(commander.currentSection, 'overview');
  assert.strictEqual(commander.lastQuery, '');
  assert.strictEqual(commander.lastCopied, null);
  assert.strictEqual(commander.getCommandHistory().length, 0);
  assert.ok(commander.getLastResponse().includes('Docs Portal Voice Commander standby'));
});

test('DocsPortalVoiceCommander - accepts custom initialization options', () => {
  const commander = new DocsPortalVoiceCommander({
    maxHistory: 10,
    highContrast: true,
    fontSizeZoom: 130,
    currentSection: 'api-reference'
  });

  assert.strictEqual(commander.highContrast, true);
  assert.strictEqual(commander.fontSizeZoom, 130);
  assert.strictEqual(commander.currentSection, 'api-reference');
  assert.strictEqual(commander.maxHistory, 10);
});

test('DocsPortalVoiceCommander - starts, stops, and toggles listening state in headless simulator', () => {
  const commander = new DocsPortalVoiceCommander();

  // Test start
  const started = commander.startListening();
  assert.strictEqual(started, true);
  assert.strictEqual(commander.isListeningState(), true);
  assert.strictEqual(commander.getStatus(), 'Listening');

  // Test start when already listening
  assert.strictEqual(commander.startListening(), true);

  // Test stop
  const stopped = commander.stopListening();
  assert.strictEqual(stopped, false);
  assert.strictEqual(commander.isListeningState(), false);
  assert.strictEqual(commander.getStatus(), 'Idle');

  // Test toggle
  assert.strictEqual(commander.toggleListening(), true);
  assert.strictEqual(commander.isListeningState(), true);
  assert.strictEqual(commander.toggleListening(), false);
  assert.strictEqual(commander.isListeningState(), false);
});

test('DocsPortalVoiceCommander - parses SEARCH_DOCS grammar and extracts query parameter', () => {
  const commander = new DocsPortalVoiceCommander();

  // "search docs for authentication"
  const res1 = commander.parseVoiceGrammar('search docs for authentication');
  assert.strictEqual(res1.matched, true);
  assert.strictEqual(res1.action, DOCS_COMMAND_ACTIONS.SEARCH_DOCS);
  assert.strictEqual(res1.payload.query, 'authentication');
  assert.strictEqual(res1.response, 'Searching documentation for "authentication".');

  // "find webhooks"
  const res2 = commander.parseVoiceGrammar('find webhooks');
  assert.strictEqual(res2.matched, true);
  assert.strictEqual(res2.action, DOCS_COMMAND_ACTIONS.SEARCH_DOCS);
  assert.strictEqual(res2.payload.query, 'webhooks');

  // "search api tokens"
  const res3 = commander.parseVoiceGrammar('search api tokens');
  assert.strictEqual(res3.matched, true);
  assert.strictEqual(res3.action, DOCS_COMMAND_ACTIONS.SEARCH_DOCS);
  assert.strictEqual(res3.payload.query, 'api tokens');

  // "lookup rate limits"
  const res4 = commander.parseVoiceGrammar('lookup rate limits');
  assert.strictEqual(res4.matched, true);
  assert.strictEqual(res4.action, DOCS_COMMAND_ACTIONS.SEARCH_DOCS);
  assert.strictEqual(res4.payload.query, 'rate limits');
});

test('DocsPortalVoiceCommander - parses NAVIGATE_SECTION grammar and maps known documentation sections', () => {
  const commander = new DocsPortalVoiceCommander();

  // "go to api reference"
  const res1 = commander.parseVoiceGrammar('go to api reference');
  assert.strictEqual(res1.matched, true);
  assert.strictEqual(res1.action, DOCS_COMMAND_ACTIONS.NAVIGATE_SECTION);
  assert.strictEqual(res1.payload.slug, 'api-reference');
  assert.strictEqual(res1.payload.title, 'API Reference');
  assert.strictEqual(res1.response, 'Navigating to API Reference section.');

  // "open guides"
  const res2 = commander.parseVoiceGrammar('open guides');
  assert.strictEqual(res2.matched, true);
  assert.strictEqual(res2.action, DOCS_COMMAND_ACTIONS.NAVIGATE_SECTION);
  assert.strictEqual(res2.payload.slug, 'guides');
  assert.strictEqual(res2.payload.title, 'Guides');

  // "navigate to tutorials"
  const res3 = commander.parseVoiceGrammar('navigate to tutorials');
  assert.strictEqual(res3.matched, true);
  assert.strictEqual(res3.action, DOCS_COMMAND_ACTIONS.NAVIGATE_SECTION);
  assert.strictEqual(res3.payload.slug, 'tutorials');
  assert.strictEqual(res3.payload.title, 'Tutorials');

  // "jump to changelog"
  const res4 = commander.parseVoiceGrammar('jump to changelog');
  assert.strictEqual(res4.matched, true);
  assert.strictEqual(res4.action, DOCS_COMMAND_ACTIONS.NAVIGATE_SECTION);
  assert.strictEqual(res4.payload.slug, 'changelog');
  assert.strictEqual(res4.payload.title, 'Changelog');

  // Arbitrary custom section navigation
  const res5 = commander.parseVoiceGrammar('open security guidelines');
  assert.strictEqual(res5.matched, true);
  assert.strictEqual(res5.action, DOCS_COMMAND_ACTIONS.NAVIGATE_SECTION);
  assert.strictEqual(res5.payload.slug, 'security-guidelines');
});

test('DocsPortalVoiceCommander - parses COPY_CODE grammar patterns', () => {
  const commander = new DocsPortalVoiceCommander();

  for (const phrase of ['copy code snippet', 'copy example', 'copy block', 'copy code', 'copy']) {
    const res = commander.parseVoiceGrammar(phrase);
    assert.strictEqual(res.matched, true);
    assert.strictEqual(res.action, DOCS_COMMAND_ACTIONS.COPY_CODE);
    assert.strictEqual(res.payload.copied, true);
    assert.strictEqual(res.response, 'Code snippet copied to clipboard.');
  }
});

test('DocsPortalVoiceCommander - parses READ_ARTICLE voice commands', () => {
  const commander = new DocsPortalVoiceCommander({ currentSection: 'guides' });

  for (const phrase of ['read section', 'read aloud', 'speak summary', 'read article', 'narrate section']) {
    const res = commander.parseVoiceGrammar(phrase);
    assert.strictEqual(res.matched, true);
    assert.strictEqual(res.action, DOCS_COMMAND_ACTIONS.READ_ARTICLE);
    assert.strictEqual(res.payload.mode, 'read-aloud');
    assert.strictEqual(res.response, 'Reading active documentation article aloud.');
  }
});

test('DocsPortalVoiceCommander - parses TOGGLE_HIGH_CONTRAST accessibility commands', () => {
  const commander = new DocsPortalVoiceCommander({ highContrast: false });

  // Toggle mode
  const res1 = commander.parseVoiceGrammar('toggle contrast');
  assert.strictEqual(res1.matched, true);
  assert.strictEqual(res1.action, DOCS_COMMAND_ACTIONS.TOGGLE_HIGH_CONTRAST);
  assert.strictEqual(res1.payload.highContrast, true);
  assert.strictEqual(res1.response, 'High contrast mode enabled.');

  // Explicit enable
  const res2 = commander.parseVoiceGrammar('enable contrast');
  assert.strictEqual(res2.payload.highContrast, true);

  // Explicit disable
  const res3 = commander.parseVoiceGrammar('disable contrast');
  assert.strictEqual(res3.payload.highContrast, false);
  assert.strictEqual(res3.response, 'High contrast mode disabled.');

  // Accessibility mode alias
  const res4 = commander.parseVoiceGrammar('accessibility mode');
  assert.strictEqual(res4.action, DOCS_COMMAND_ACTIONS.TOGGLE_HIGH_CONTRAST);
});

test('DocsPortalVoiceCommander - parses ZOOM_FONT commands and calculates zoom step levels', () => {
  const commander = new DocsPortalVoiceCommander({ fontSizeZoom: 100 });

  // Increase font size
  const incRes = commander.parseVoiceGrammar('increase font size');
  assert.strictEqual(incRes.matched, true);
  assert.strictEqual(incRes.action, DOCS_COMMAND_ACTIONS.ZOOM_FONT);
  assert.strictEqual(incRes.payload.direction, 'increase');
  assert.strictEqual(incRes.payload.zoomLevel, 115);
  assert.strictEqual(incRes.response, 'Font size increased to 115%.');

  // Zoom in alias
  const zoomInRes = commander.parseVoiceGrammar('zoom in');
  assert.strictEqual(zoomInRes.payload.direction, 'increase');

  // Decrease font size
  const decRes = commander.parseVoiceGrammar('decrease font size');
  assert.strictEqual(decRes.matched, true);
  assert.strictEqual(decRes.action, DOCS_COMMAND_ACTIONS.ZOOM_FONT);
  assert.strictEqual(decRes.payload.direction, 'decrease');
  assert.strictEqual(decRes.payload.zoomLevel, 85);
  assert.strictEqual(decRes.response, 'Font size decreased to 85%.');

  // Reset zoom
  const resetRes = commander.parseVoiceGrammar('reset zoom');
  assert.strictEqual(resetRes.matched, true);
  assert.strictEqual(resetRes.action, DOCS_COMMAND_ACTIONS.ZOOM_FONT);
  assert.strictEqual(resetRes.payload.direction, 'reset');
  assert.strictEqual(resetRes.payload.zoomLevel, 100);
  assert.strictEqual(resetRes.response, 'Font zoom reset to 100%.');
});

test('DocsPortalVoiceCommander - parses HELP commands with full command listing', () => {
  const commander = new DocsPortalVoiceCommander();

  for (const phrase of ['help', 'list commands', 'what can I say', 'show commands', 'available commands']) {
    const res = commander.parseVoiceGrammar(phrase);
    assert.strictEqual(res.matched, true);
    assert.strictEqual(res.action, DOCS_COMMAND_ACTIONS.HELP);
    assert.ok(res.payload.commands.includes('SEARCH_DOCS'));
    assert.ok(res.payload.commands.includes('NAVIGATE_SECTION'));
    assert.ok(res.response.includes('Available voice commands'));
  }
});

test('DocsPortalVoiceCommander - handles unknown commands and empty transcripts with fallback', () => {
  const commander = new DocsPortalVoiceCommander();

  // Empty string
  const emptyRes = commander.parseVoiceGrammar('');
  assert.strictEqual(emptyRes.matched, false);
  assert.strictEqual(emptyRes.action, DOCS_COMMAND_ACTIONS.UNKNOWN_COMMAND);
  assert.strictEqual(emptyRes.confidence, 0);

  // Null / undefined safe fallback
  const nullRes = commander.parseVoiceGrammar(null);
  assert.strictEqual(nullRes.matched, false);

  // Unrecognized sentence
  const unkRes = commander.parseVoiceGrammar('order cheese pizza');
  assert.strictEqual(unkRes.matched, false);
  assert.strictEqual(unkRes.action, DOCS_COMMAND_ACTIONS.UNKNOWN_COMMAND);
  assert.ok(unkRes.response.includes('order cheese pizza'));
  assert.ok(unkRes.response.includes('Command not recognized'));
});

test('DocsPortalVoiceCommander - executes commands and mutates state accurately', () => {
  const commander = new DocsPortalVoiceCommander();

  // 1. Search docs
  commander.executeCommand(DOCS_COMMAND_ACTIONS.SEARCH_DOCS, { query: 'oauth authorization' });
  assert.strictEqual(commander.lastQuery, 'oauth authorization');
  assert.strictEqual(commander.getState().lastQuery, 'oauth authorization');

  // 2. Navigate section
  commander.executeCommand(DOCS_COMMAND_ACTIONS.NAVIGATE_SECTION, { slug: 'tutorials', title: 'Tutorials' });
  assert.strictEqual(commander.currentSection, 'tutorials');

  // 3. Copy code
  commander.executeCommand(DOCS_COMMAND_ACTIONS.COPY_CODE, { codeSnippet: 'npm i @careerforge/docs-portal' });
  assert.strictEqual(commander.lastCopied, 'npm i @careerforge/docs-portal');

  // 4. Toggle high contrast
  commander.executeCommand(DOCS_COMMAND_ACTIONS.TOGGLE_HIGH_CONTRAST, {});
  assert.strictEqual(commander.highContrast, true);
  commander.executeCommand(DOCS_COMMAND_ACTIONS.TOGGLE_HIGH_CONTRAST, { highContrast: false });
  assert.strictEqual(commander.highContrast, false);

  // 5. Zoom font size with boundaries
  commander.executeCommand(DOCS_COMMAND_ACTIONS.ZOOM_FONT, { direction: 'increase' });
  assert.strictEqual(commander.fontSizeZoom, 115);
  commander.executeCommand(DOCS_COMMAND_ACTIONS.ZOOM_FONT, { direction: 'decrease' });
  assert.strictEqual(commander.fontSizeZoom, 100);
  commander.executeCommand(DOCS_COMMAND_ACTIONS.ZOOM_FONT, { direction: 'reset' });
  assert.strictEqual(commander.fontSizeZoom, 100);

  // Test boundaries: min 70, max 200
  commander.executeCommand(DOCS_COMMAND_ACTIONS.ZOOM_FONT, { zoomLevel: 250 });
  assert.strictEqual(commander.fontSizeZoom, 200);
  commander.executeCommand(DOCS_COMMAND_ACTIONS.ZOOM_FONT, { zoomLevel: 40 });
  assert.strictEqual(commander.fontSizeZoom, 70);
});

test('DocsPortalVoiceCommander - implements Event Emitter pattern (on, off, emit)', () => {
  const commander = new DocsPortalVoiceCommander();
  const events = [];

  const unsubscribe = commander.on('command-executed', (data) => {
    events.push(data);
  });

  commander.executeCommand(DOCS_COMMAND_ACTIONS.SEARCH_DOCS, { query: 'endpoints' });
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].action, DOCS_COMMAND_ACTIONS.SEARCH_DOCS);
  assert.strictEqual(events[0].payload.query, 'endpoints');

  // Unsubscribe
  unsubscribe();
  commander.executeCommand(DOCS_COMMAND_ACTIONS.NAVIGATE_SECTION, { slug: 'guides' });
  assert.strictEqual(events.length, 1); // Not increased after off()
});

test('DocsPortalVoiceCommander - tracks command history and limits by maxHistory', () => {
  const commander = new DocsPortalVoiceCommander({ maxHistory: 3 });

  commander.dispatchCommand('search docs for auth');
  commander.dispatchCommand('go to api reference');
  commander.dispatchCommand('copy code snippet');

  let history = commander.getCommandHistory();
  assert.strictEqual(history.length, 3);
  assert.strictEqual(history[0].action, DOCS_COMMAND_ACTIONS.COPY_CODE);
  assert.strictEqual(history[1].action, DOCS_COMMAND_ACTIONS.NAVIGATE_SECTION);
  assert.strictEqual(history[2].action, DOCS_COMMAND_ACTIONS.SEARCH_DOCS);

  // Dispatching 4th command drops oldest
  commander.dispatchCommand('help');
  history = commander.getCommandHistory();
  assert.strictEqual(history.length, 3);
  assert.strictEqual(history[0].action, DOCS_COMMAND_ACTIONS.HELP);

  // Clear history
  commander.clearHistory();
  assert.strictEqual(commander.getCommandHistory().length, 0);
});

test('DocsPortalVoiceCommander - synthesizes speech response and transitions status', () => {
  let spoken = null;
  const mockSynth = {
    cancel() {},
    speak(msg) {
      spoken = msg;
    }
  };

  const commander = new DocsPortalVoiceCommander({ speechSynth: mockSynth });
  const result = commander.synthesizeResponse('Testing speech synthesis dispatcher.');

  assert.strictEqual(result, 'Testing speech synthesis dispatcher.');
  assert.strictEqual(spoken, 'Testing speech synthesis dispatcher.');
  assert.strictEqual(commander.getLastResponse(), 'Testing speech synthesis dispatcher.');
  assert.strictEqual(commander.getStatus(), 'Idle');
});

test('DocsPortalVoiceCommander - allows custom command registration and priority routing', () => {
  const commander = new DocsPortalVoiceCommander();

  commander.registerCommand(
    'custom_deploy',
    /deploy to production/i,
    'DEPLOY_PRODUCTION',
    'Deployment initiated to production cluster.'
  );

  const res = commander.parseVoiceGrammar('please deploy to production right now');
  assert.strictEqual(res.matched, true);
  assert.strictEqual(res.action, 'DEPLOY_PRODUCTION');
  assert.strictEqual(res.response, 'Deployment initiated to production cluster.');
});

test('DocsPortalVoiceCommander - dispatchCommand executes full lifecycle seamlessly', () => {
  const commander = new DocsPortalVoiceCommander();

  const outcome = commander.dispatchCommand('go to api reference');
  assert.strictEqual(outcome.parsed.matched, true);
  assert.strictEqual(outcome.execResult.success, true);
  assert.strictEqual(commander.currentSection, 'api-reference');
  assert.strictEqual(commander.getCommandHistory().length, 1);
  assert.strictEqual(commander.getCommandHistory()[0].action, DOCS_COMMAND_ACTIONS.NAVIGATE_SECTION);
});
