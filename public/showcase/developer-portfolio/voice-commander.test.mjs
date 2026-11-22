import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DeveloperPortfolioVoiceCommander } from './voice-commander.js';

test('DeveloperPortfolioVoiceCommander - initializes with expected default state', () => {
  const commander = new DeveloperPortfolioVoiceCommander();

  assert.strictEqual(commander.status, 'idle');
  assert.strictEqual(commander.isListening, false);
  assert.strictEqual(commander.currentSection, 'home');
  assert.strictEqual(commander.activeFilter, null);
  assert.strictEqual(commander.isHighContrast, false);
  assert.strictEqual(commander.currentTheme, 'dark');
  assert.deepStrictEqual(commander.getCommandHistory(), []);
  assert.strictEqual(commander.options.lang, 'en-US');
});

test('DeveloperPortfolioVoiceCommander - accepts custom configuration options', () => {
  const commander = new DeveloperPortfolioVoiceCommander({
    lang: 'en-GB',
    continuous: false,
    autoSynthesize: false,
    synthRate: 1.2
  });

  assert.strictEqual(commander.options.lang, 'en-GB');
  assert.strictEqual(commander.options.continuous, false);
  assert.strictEqual(commander.options.autoSynthesize, false);
  assert.strictEqual(commander.options.synthRate, 1.2);
});

test('DeveloperPortfolioVoiceCommander - parses NAVIGATE_SECTION grammar correctly', () => {
  const commander = new DeveloperPortfolioVoiceCommander();

  // Test cases required by Issue #2042 specification
  const cases = [
    { input: 'go to projects', expectedSection: 'projects' },
    { input: 'show about me', expectedSection: 'about' },
    { input: 'open experience', expectedSection: 'experience' },
    { input: 'view contact', expectedSection: 'contact' },
    { input: 'jump to skills', expectedSection: 'skills' },
    { input: 'scroll to education', expectedSection: 'education' },
    { input: 'navigate to home', expectedSection: 'home' }
  ];

  for (const { input, expectedSection } of cases) {
    const res = commander.parseVoiceGrammar(input);
    assert.strictEqual(res.action, 'NAVIGATE_SECTION', `Failed for "${input}"`);
    assert.strictEqual(res.payload.section, expectedSection, `Incorrect section for "${input}"`);
    assert.ok(res.confidence > 0.8);
  }
});

test('DeveloperPortfolioVoiceCommander - handles case-insensitivity and punctuation in section grammar', () => {
  const commander = new DeveloperPortfolioVoiceCommander();

  const res1 = commander.parseVoiceGrammar('  GO TO PROJECTS!  ');
  assert.strictEqual(res1.action, 'NAVIGATE_SECTION');
  assert.strictEqual(res1.payload.section, 'projects');

  const res2 = commander.parseVoiceGrammar('Show About Me.');
  assert.strictEqual(res2.action, 'NAVIGATE_SECTION');
  assert.strictEqual(res2.payload.section, 'about');
});

test('DeveloperPortfolioVoiceCommander - parses FILTER_TECH_STACK grammar correctly', () => {
  const commander = new DeveloperPortfolioVoiceCommander();

  // Test cases required by Issue #2042 specification
  const reactRes = commander.parseVoiceGrammar('filter by react');
  assert.strictEqual(reactRes.action, 'FILTER_TECH_STACK');
  assert.strictEqual(reactRes.payload.tech, 'react');
  assert.strictEqual(reactRes.payload.clear, false);

  const pythonRes = commander.parseVoiceGrammar('show python projects');
  assert.strictEqual(pythonRes.action, 'FILTER_TECH_STACK');
  assert.strictEqual(pythonRes.payload.tech, 'python');
  assert.strictEqual(pythonRes.payload.clear, false);

  const tsRes = commander.parseVoiceGrammar('filter typescript');
  assert.strictEqual(tsRes.action, 'FILTER_TECH_STACK');
  assert.strictEqual(tsRes.payload.tech, 'typescript');
  assert.strictEqual(tsRes.payload.clear, false);

  const nodeRes = commander.parseVoiceGrammar('filter by node.js');
  assert.strictEqual(nodeRes.action, 'FILTER_TECH_STACK');
  assert.strictEqual(nodeRes.payload.tech, 'node.js');
  assert.strictEqual(nodeRes.payload.clear, false);

  const clearRes1 = commander.parseVoiceGrammar('clear tech filter');
  assert.strictEqual(clearRes1.action, 'FILTER_TECH_STACK');
  assert.strictEqual(clearRes1.payload.tech, null);
  assert.strictEqual(clearRes1.payload.clear, true);

  const clearRes2 = commander.parseVoiceGrammar('reset filter');
  assert.strictEqual(clearRes2.action, 'FILTER_TECH_STACK');
  assert.strictEqual(clearRes2.payload.clear, true);

  const clearRes3 = commander.parseVoiceGrammar('show all projects');
  assert.strictEqual(clearRes3.action, 'FILTER_TECH_STACK');
  assert.strictEqual(clearRes3.payload.clear, true);
});

test('DeveloperPortfolioVoiceCommander - parses DOWNLOAD_RESUME grammar correctly', () => {
  const commander = new DeveloperPortfolioVoiceCommander();

  const inputs = ['download resume', 'get cv', 'save resume', 'export cv'];
  for (const input of inputs) {
    const res = commander.parseVoiceGrammar(input);
    assert.strictEqual(res.action, 'DOWNLOAD_RESUME', `Failed for "${input}"`);
  }
});

test('DeveloperPortfolioVoiceCommander - parses READ_BIO grammar correctly', () => {
  const commander = new DeveloperPortfolioVoiceCommander();

  const inputs = ['read bio', 'tell me about yourself', 'read summary', 'who are you', 'describe yourself'];
  for (const input of inputs) {
    const res = commander.parseVoiceGrammar(input);
    assert.strictEqual(res.action, 'READ_BIO', `Failed for "${input}"`);
  }
});

test('DeveloperPortfolioVoiceCommander - parses TOGGLE_HIGH_CONTRAST grammar correctly', () => {
  const commander = new DeveloperPortfolioVoiceCommander();

  const inputs = ['toggle contrast', 'high contrast mode', 'accessibility mode', 'enable high contrast'];
  for (const input of inputs) {
    const res = commander.parseVoiceGrammar(input);
    assert.strictEqual(res.action, 'TOGGLE_HIGH_CONTRAST', `Failed for "${input}"`);
  }
});

test('DeveloperPortfolioVoiceCommander - parses TOGGLE_THEME grammar correctly', () => {
  const commander = new DeveloperPortfolioVoiceCommander();

  const toggleRes = commander.parseVoiceGrammar('switch theme');
  assert.strictEqual(toggleRes.action, 'TOGGLE_THEME');
  assert.strictEqual(toggleRes.payload.theme, 'toggle');

  const darkRes = commander.parseVoiceGrammar('toggle dark mode');
  assert.strictEqual(darkRes.action, 'TOGGLE_THEME');
  assert.strictEqual(darkRes.payload.theme, 'dark');

  const lightRes = commander.parseVoiceGrammar('light mode');
  assert.strictEqual(lightRes.action, 'TOGGLE_THEME');
  assert.strictEqual(lightRes.payload.theme, 'light');
});

test('DeveloperPortfolioVoiceCommander - parses HELP grammar correctly', () => {
  const commander = new DeveloperPortfolioVoiceCommander();

  const inputs = ['help', 'list commands', 'what can I say', 'available commands'];
  for (const input of inputs) {
    const res = commander.parseVoiceGrammar(input);
    assert.strictEqual(res.action, 'HELP', `Failed for "${input}"`);
    assert.ok(Array.isArray(res.payload.commands));
    assert.ok(res.payload.commands.length > 0);
  }
});

test('DeveloperPortfolioVoiceCommander - handles unknown or invalid voice grammar', () => {
  const commander = new DeveloperPortfolioVoiceCommander();

  const unknown1 = commander.parseVoiceGrammar('order pizza');
  assert.strictEqual(unknown1.action, 'UNKNOWN');
  assert.strictEqual(unknown1.payload.raw, 'order pizza');

  const unknown2 = commander.parseVoiceGrammar('');
  assert.strictEqual(unknown2.action, 'UNKNOWN');

  const unknown3 = commander.parseVoiceGrammar(null);
  assert.strictEqual(unknown3.action, 'UNKNOWN');

  const unknown4 = commander.parseVoiceGrammar(12345);
  assert.strictEqual(unknown4.action, 'UNKNOWN');
});

test('DeveloperPortfolioVoiceCommander - executes commands and mutates state appropriately', () => {
  const commander = new DeveloperPortfolioVoiceCommander();

  // 1. Navigation
  const navResult = commander.executeCommand('NAVIGATE_SECTION', { section: 'projects' }, 'go to projects');
  assert.strictEqual(navResult.success, true);
  assert.strictEqual(commander.currentSection, 'projects');
  assert.match(navResult.message, /projects/i);

  // 2. Filter Tech
  const filterResult = commander.executeCommand('FILTER_TECH_STACK', { tech: 'react', clear: false });
  assert.strictEqual(filterResult.success, true);
  assert.strictEqual(commander.activeFilter, 'react');

  // 3. Clear Tech Filter
  const clearResult = commander.executeCommand('FILTER_TECH_STACK', { tech: null, clear: true });
  assert.strictEqual(clearResult.success, true);
  assert.strictEqual(commander.activeFilter, null);

  // 4. Toggle High Contrast
  const contrastOn = commander.executeCommand('TOGGLE_HIGH_CONTRAST');
  assert.strictEqual(commander.isHighContrast, true);
  assert.match(contrastOn.message, /enabled/i);

  const contrastOff = commander.executeCommand('TOGGLE_HIGH_CONTRAST');
  assert.strictEqual(commander.isHighContrast, false);
  assert.match(contrastOff.message, /disabled/i);

  // 5. Toggle Theme
  commander.executeCommand('TOGGLE_THEME', { theme: 'toggle' });
  assert.strictEqual(commander.currentTheme, 'light');

  commander.executeCommand('TOGGLE_THEME', { theme: 'dark' });
  assert.strictEqual(commander.currentTheme, 'dark');

  // 6. Read Bio
  const bioResult = commander.executeCommand('READ_BIO');
  assert.strictEqual(bioResult.success, true);
  assert.strictEqual(bioResult.message, DeveloperPortfolioVoiceCommander.BIO_SUMMARY);

  // 7. Download Resume
  const resumeResult = commander.executeCommand('DOWNLOAD_RESUME');
  assert.strictEqual(resumeResult.success, true);
  assert.match(resumeResult.message, /resume download/i);

  // 8. Help
  const helpResult = commander.executeCommand('HELP');
  assert.strictEqual(helpResult.success, true);
  assert.match(helpResult.message, /Available commands/i);

  // 9. Unknown
  const unknownResult = commander.executeCommand('UNKNOWN', {}, 'make coffee');
  assert.strictEqual(unknownResult.success, false);
  assert.match(unknownResult.message, /not recognized/i);
});

test('DeveloperPortfolioVoiceCommander - tracks command history and supports clearHistory', () => {
  const commander = new DeveloperPortfolioVoiceCommander();

  commander.executeCommand('NAVIGATE_SECTION', { section: 'experience' }, 'open experience');
  commander.executeCommand('FILTER_TECH_STACK', { tech: 'python' }, 'show python projects');

  const history = commander.getCommandHistory();
  assert.strictEqual(history.length, 2);
  assert.strictEqual(history[0].action, 'NAVIGATE_SECTION');
  assert.strictEqual(history[0].status, 'success');
  assert.strictEqual(history[1].action, 'FILTER_TECH_STACK');
  assert.ok(history[0].id.startsWith('cmd_'));
  assert.ok(history[0].timestamp);

  // Verify getCommandHistory returns a shallow copy
  history.push({ fake: true });
  assert.strictEqual(commander.getCommandHistory().length, 2);

  // Clear history
  const cleared = commander.clearHistory();
  assert.deepStrictEqual(cleared, []);
  assert.strictEqual(commander.getCommandHistory().length, 0);
});

test('DeveloperPortfolioVoiceCommander - event emitter pattern works for on, off, emit', () => {
  const commander = new DeveloperPortfolioVoiceCommander();
  const eventsCaptured = [];

  const commandHandler = (data) => eventsCaptured.push({ type: 'command', data });
  const statusHandler = (data) => eventsCaptured.push({ type: 'status', data });
  const clearHandler = () => eventsCaptured.push({ type: 'clear' });

  commander.on('command', commandHandler);
  commander.on('statusChange', statusHandler);
  commander.on('historyClear', clearHandler);

  commander.executeCommand('NAVIGATE_SECTION', { section: 'skills' }, 'jump to skills');
  assert.ok(eventsCaptured.some(e => e.type === 'command' && e.data.action === 'NAVIGATE_SECTION'));
  assert.ok(eventsCaptured.some(e => e.type === 'status'));

  commander.clearHistory();
  assert.ok(eventsCaptured.some(e => e.type === 'clear'));

  // Test off() unregistration
  commander.off('command', commandHandler);
  const countBefore = eventsCaptured.filter(e => e.type === 'command').length;
  commander.executeCommand('READ_BIO');
  const countAfter = eventsCaptured.filter(e => e.type === 'command').length;
  assert.strictEqual(countBefore, countAfter);
});

test('DeveloperPortfolioVoiceCommander - headless speech simulator end-to-end integration', () => {
  const commander = new DeveloperPortfolioVoiceCommander();

  let capturedSpeechResult = null;
  commander.on('speechResult', (data) => {
    capturedSpeechResult = data;
  });

  const res = commander.simulateSpeechInput('jump to skills');

  assert.strictEqual(capturedSpeechResult.transcript, 'jump to skills');
  assert.strictEqual(capturedSpeechResult.simulated, true);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.action, 'NAVIGATE_SECTION');
  assert.strictEqual(commander.currentSection, 'skills');

  const history = commander.getCommandHistory();
  assert.strictEqual(history.length, 1);
  assert.strictEqual(history[0].transcript, 'jump to skills');
});

test('DeveloperPortfolioVoiceCommander - listening lifecycle management', () => {
  const commander = new DeveloperPortfolioVoiceCommander();

  assert.strictEqual(commander.isListening, false);
  assert.strictEqual(commander.status, 'idle');

  // Start
  const started = commander.startListening();
  assert.strictEqual(started, true);
  assert.strictEqual(commander.isListening, true);
  assert.strictEqual(commander.status, 'listening');

  // Re-start should return false
  assert.strictEqual(commander.startListening(), false);

  // Stop
  const stopped = commander.stopListening();
  assert.strictEqual(stopped, true);
  assert.strictEqual(commander.isListening, false);
  assert.strictEqual(commander.status, 'idle');

  // Re-stop should return false
  assert.strictEqual(commander.stopListening(), false);

  // Toggle
  const toggledOn = commander.toggleListening();
  assert.strictEqual(toggledOn, true);
  assert.strictEqual(commander.isListening, true);

  const toggledOff = commander.toggleListening();
  assert.strictEqual(toggledOff, false);
  assert.strictEqual(commander.isListening, false);
});

test('DeveloperPortfolioVoiceCommander - synthesizeResponse resolves in headless mode', async () => {
  const commander = new DeveloperPortfolioVoiceCommander();

  let capturedSynthesis = null;
  commander.on('synthesize', (data) => {
    capturedSynthesis = data;
  });

  const res = await commander.synthesizeResponse('Navigating to experience section.');

  assert.strictEqual(res.message, 'Navigating to experience section.');
  assert.strictEqual(commander.lastSpokenMessage, 'Navigating to experience section.');
  assert.strictEqual(capturedSynthesis.message, 'Navigating to experience section.');
  assert.strictEqual(commander.status, 'idle');
});
