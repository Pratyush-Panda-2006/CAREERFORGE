import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TravelOdysseyVoiceCommander } from './voice-commander.js';

describe('TravelOdysseyVoiceCommander Test Suite', () => {
  // 1. Default initialization and configuration options
  describe('1. Default Initialization and Configuration Options', () => {
    it('initializes with default options and valid internal state', () => {
      const commander = new TravelOdysseyVoiceCommander();
      const state = commander.getState();

      assert.equal(state.isListening, false);
      assert.equal(state.highContrast, false);
      assert.equal(state.currentPage, 'itinerary');
      assert.equal(state.currentDestination, null);
      assert.equal(state.budgetTier, 'moderate');
      assert.equal(state.speechEnabled, true);
      assert.equal(state.historyCount, 0);
      assert.equal(commander.lang, 'en-US');
    });

    it('accepts custom initialization configuration options', () => {
      const commander = new TravelOdysseyVoiceCommander({
        lang: 'en-GB',
        speechEnabled: false,
        speechRate: 1.2,
        speechPitch: 0.9,
        highContrast: true,
        defaultPage: 'flights',
        defaultDestination: 'Kyoto, Japan',
        defaultBudget: 'luxury'
      });
      const state = commander.getState();

      assert.equal(commander.lang, 'en-GB');
      assert.equal(state.speechEnabled, false);
      assert.equal(commander.speechRate, 1.2);
      assert.equal(commander.speechPitch, 0.9);
      assert.equal(state.highContrast, true);
      assert.equal(state.currentPage, 'flights');
      assert.equal(state.currentDestination, 'Kyoto, Japan');
      assert.equal(state.budgetTier, 'luxury');
    });

    it('exposes static GRAMMAR_REGISTRY containing all 8 target actions', () => {
      assert.ok(Array.isArray(TravelOdysseyVoiceCommander.GRAMMAR_REGISTRY));
      assert.equal(TravelOdysseyVoiceCommander.GRAMMAR_REGISTRY.length, 8);

      const actions = TravelOdysseyVoiceCommander.GRAMMAR_REGISTRY.map(item => item.action);
      assert.ok(actions.includes('NAVIGATE_PAGE'));
      assert.ok(actions.includes('BOOK_FLIGHT'));
      assert.ok(actions.includes('SEARCH_FLIGHTS'));
      assert.ok(actions.includes('SET_DESTINATION'));
      assert.ok(actions.includes('FILTER_BUDGET'));
      assert.ok(actions.includes('TOGGLE_HIGH_CONTRAST'));
      assert.ok(actions.includes('EXPORT_ITINERARY'));
      assert.ok(actions.includes('HELP'));
    });

    it('generates unique command IDs and formats destination text properly', () => {
      const id1 = TravelOdysseyVoiceCommander.generateId('cmd');
      const id2 = TravelOdysseyVoiceCommander.generateId('cmd');
      assert.notEqual(id1, id2);
      assert.ok(id1.startsWith('cmd_'));

      assert.equal(TravelOdysseyVoiceCommander.cleanText('  tokyo, japan!  '), 'tokyo, japan');
      assert.equal(TravelOdysseyVoiceCommander.formatDestination('new york, usa.'), 'New York, Usa');
      assert.equal(TravelOdysseyVoiceCommander.formatDestination(null), '');
    });
  });

  // 2. Handling of empty, null, and malformed transcripts
  describe('2. Handling of Empty, Null, and Malformed Transcripts', () => {
    it('gracefully handles null, undefined, non-string, and whitespace transcripts without throwing', () => {
      const commander = new TravelOdysseyVoiceCommander();

      const resNull = commander.processTranscript(null);
      assert.equal(resNull.success, false);
      assert.ok(resNull.error.includes('Empty or invalid'));

      const resUndefined = commander.processTranscript(undefined);
      assert.equal(resUndefined.success, false);
      assert.ok(resUndefined.error.includes('Empty or invalid'));

      const resEmpty = commander.processTranscript('');
      assert.equal(resEmpty.success, false);
      assert.equal(resEmpty.error, 'Empty transcript');

      const resSpaces = commander.processTranscript('    ');
      assert.equal(resSpaces.success, false);
      assert.equal(resSpaces.error, 'Empty transcript');

      const resNumber = commander.processTranscript(12345);
      assert.equal(resNumber.success, false);

      const resObj = commander.processTranscript({ text: 'navigate' });
      assert.equal(resObj.success, false);

      assert.equal(commander.getHistory().length, 0);
    });

    it('classifies ungrammatical voice inputs as UNKNOWN action without breaking state', () => {
      const commander = new TravelOdysseyVoiceCommander();
      const res = commander.processTranscript('quaternion hyperdrive initiate warp speed');

      assert.equal(res.success, false);
      assert.equal(res.command.action, 'UNKNOWN');
      assert.ok(res.command.feedback.includes("Say 'help'"));
      assert.equal(commander.getHistory().length, 1);
    });
  });

  // 3. Grammar parsing for all actions with parameter extraction
  describe('3. Grammar Parsing for All Actions with Parameter Extraction', () => {
    const commander = new TravelOdysseyVoiceCommander();

    it('parses NAVIGATE_PAGE for all canonical decks and synonyms', () => {
      // Flights
      let p = commander.parseIntent('navigate to flights');
      assert.equal(p.action, 'NAVIGATE_PAGE');
      assert.equal(p.parameters.page, 'flights');

      // Accommodations
      p = commander.parseIntent('open accommodations');
      assert.equal(p.action, 'NAVIGATE_PAGE');
      assert.equal(p.parameters.page, 'accommodations');

      p = commander.parseIntent('go to hotel');
      assert.equal(p.action, 'NAVIGATE_PAGE');
      assert.equal(p.parameters.page, 'accommodations');

      // Itinerary
      p = commander.parseIntent('show itinerary');
      assert.equal(p.action, 'NAVIGATE_PAGE');
      assert.equal(p.parameters.page, 'itinerary');

      p = commander.parseIntent('switch to schedule');
      assert.equal(p.action, 'NAVIGATE_PAGE');
      assert.equal(p.parameters.page, 'itinerary');

      // Map
      p = commander.parseIntent('view map');
      assert.equal(p.action, 'NAVIGATE_PAGE');
      assert.equal(p.parameters.page, 'map');

      p = commander.parseIntent('head to world map');
      assert.equal(p.action, 'NAVIGATE_PAGE');
      assert.equal(p.parameters.page, 'map');

      // Settings
      p = commander.parseIntent('open settings');
      assert.equal(p.action, 'NAVIGATE_PAGE');
      assert.equal(p.parameters.page, 'settings');

      p = commander.parseIntent('go to preferences');
      assert.equal(p.action, 'NAVIGATE_PAGE');
      assert.equal(p.parameters.page, 'settings');
    });

    it('parses BOOK_FLIGHT with destination extraction', () => {
      let p = commander.parseIntent('book flight to Tokyo');
      assert.equal(p.action, 'BOOK_FLIGHT');
      assert.equal(p.parameters.destination, 'Tokyo');

      p = commander.parseIntent('reserve a flight to Paris, France.');
      assert.equal(p.action, 'BOOK_FLIGHT');
      assert.equal(p.parameters.destination, 'Paris, France');

      p = commander.parseIntent('book flight');
      assert.equal(p.action, 'BOOK_FLIGHT');
      assert.equal(p.parameters.destination, null);
    });

    it('parses SEARCH_FLIGHTS with destination parameter extraction', () => {
      let p = commander.parseIntent('search flights to Honolulu');
      assert.equal(p.action, 'SEARCH_FLIGHTS');
      assert.equal(p.parameters.destination, 'Honolulu');

      p = commander.parseIntent('find flights to Zurich');
      assert.equal(p.action, 'SEARCH_FLIGHTS');
      assert.equal(p.parameters.destination, 'Zurich');

      p = commander.parseIntent('search flights');
      assert.equal(p.action, 'SEARCH_FLIGHTS');
      assert.equal(p.parameters.destination, null);

      p = commander.parseIntent('flights to Reykjavik');
      assert.equal(p.action, 'SEARCH_FLIGHTS');
      assert.equal(p.parameters.destination, 'Reykjavik');
    });

    it('parses SET_DESTINATION with city and country extraction', () => {
      let p = commander.parseIntent('set destination to Reykjavik, Iceland');
      assert.equal(p.action, 'SET_DESTINATION');
      assert.equal(p.parameters.destination, 'Reykjavik, Iceland');

      p = commander.parseIntent('change destination to Kyoto');
      assert.equal(p.action, 'SET_DESTINATION');
      assert.equal(p.parameters.destination, 'Kyoto');

      p = commander.parseIntent('travel to Rome');
      assert.equal(p.action, 'SET_DESTINATION');
      assert.equal(p.parameters.destination, 'Rome');

      p = commander.parseIntent('explore New York');
      assert.equal(p.action, 'SET_DESTINATION');
      assert.equal(p.parameters.destination, 'New York');
    });

    it('parses FILTER_BUDGET for luxury, moderate, and backpacker tiers and aliases', () => {
      let p = commander.parseIntent('filter budget luxury');
      assert.equal(p.action, 'FILTER_BUDGET');
      assert.equal(p.parameters.tier, 'luxury');

      p = commander.parseIntent('set budget to premium');
      assert.equal(p.action, 'FILTER_BUDGET');
      assert.equal(p.parameters.tier, 'luxury');

      p = commander.parseIntent('filter budget moderate');
      assert.equal(p.action, 'FILTER_BUDGET');
      assert.equal(p.parameters.tier, 'moderate');

      p = commander.parseIntent('standard budget');
      assert.equal(p.action, 'FILTER_BUDGET');
      assert.equal(p.parameters.tier, 'moderate');

      p = commander.parseIntent('filter budget backpacker');
      assert.equal(p.action, 'FILTER_BUDGET');
      assert.equal(p.parameters.tier, 'backpacker');

      p = commander.parseIntent('budget economy');
      assert.equal(p.action, 'FILTER_BUDGET');
      assert.equal(p.parameters.tier, 'backpacker');

      p = commander.parseIntent('set budget to cheap');
      assert.equal(p.action, 'FILTER_BUDGET');
      assert.equal(p.parameters.tier, 'backpacker');
    });

    it('parses TOGGLE_HIGH_CONTRAST with enable, disable, and toggle variations', () => {
      let p = commander.parseIntent('enable high contrast');
      assert.equal(p.action, 'TOGGLE_HIGH_CONTRAST');
      assert.equal(p.parameters.enabled, true);

      p = commander.parseIntent('disable high contrast');
      assert.equal(p.action, 'TOGGLE_HIGH_CONTRAST');
      assert.equal(p.parameters.enabled, false);

      p = commander.parseIntent('turn off high contrast');
      assert.equal(p.action, 'TOGGLE_HIGH_CONTRAST');
      assert.equal(p.parameters.enabled, false);

      // Default toggle when currently false
      p = commander.parseIntent('toggle high contrast');
      assert.equal(p.action, 'TOGGLE_HIGH_CONTRAST');
      assert.equal(p.parameters.enabled, true);
    });

    it('parses EXPORT_ITINERARY for json, pdf, and csv formats', () => {
      let p = commander.parseIntent('export itinerary as pdf');
      assert.equal(p.action, 'EXPORT_ITINERARY');
      assert.equal(p.parameters.format, 'pdf');

      p = commander.parseIntent('export itinerary as csv');
      assert.equal(p.action, 'EXPORT_ITINERARY');
      assert.equal(p.parameters.format, 'csv');

      p = commander.parseIntent('export itinerary as json');
      assert.equal(p.action, 'EXPORT_ITINERARY');
      assert.equal(p.parameters.format, 'json');

      p = commander.parseIntent('export itinerary');
      assert.equal(p.action, 'EXPORT_ITINERARY');
      assert.equal(p.parameters.format, 'json');
    });

    it('parses HELP for verbal guidance', () => {
      let p = commander.parseIntent('help');
      assert.equal(p.action, 'HELP');

      p = commander.parseIntent('voice commands');
      assert.equal(p.action, 'HELP');

      p = commander.parseIntent('what can I say');
      assert.equal(p.action, 'HELP');
    });
  });

  // 4. Command execution and internal state mutations
  describe('4. Command Execution and Internal State Mutations', () => {
    it('mutates internal state correctly on executing various commands', () => {
      const commander = new TravelOdysseyVoiceCommander();

      // Navigate Page
      commander.executeCommand({ action: 'NAVIGATE_PAGE', parameters: { page: 'map' }, feedback: 'Navigating to map deck.' });
      assert.equal(commander.currentPage, 'map');

      // Set Destination
      commander.executeCommand({ action: 'SET_DESTINATION', parameters: { destination: 'Tokyo' }, feedback: 'Expedition destination set to Tokyo.' });
      assert.equal(commander.currentDestination, 'Tokyo');

      // Filter Budget
      commander.executeCommand({ action: 'FILTER_BUDGET', parameters: { tier: 'luxury' }, feedback: 'Budget filter set to luxury tier.' });
      assert.equal(commander.budgetTier, 'luxury');

      // Toggle High Contrast
      commander.executeCommand({ action: 'TOGGLE_HIGH_CONTRAST', parameters: { enabled: true }, feedback: 'High contrast mode enabled.' });
      assert.equal(commander.highContrast, true);

      // Book Flight updates destination
      commander.executeCommand({ action: 'BOOK_FLIGHT', parameters: { destination: 'Paris' }, feedback: 'Booking expedition flight to Paris.' });
      assert.equal(commander.currentDestination, 'Paris');

      // State snapshot verification
      const state = commander.getState();
      assert.equal(state.currentPage, 'map');
      assert.equal(state.currentDestination, 'Paris');
      assert.equal(state.budgetTier, 'luxury');
      assert.equal(state.highContrast, true);
    });
  });

  // 5. Command history logging and clearing
  describe('5. Command History Logging and Clearing', () => {
    it('logs executed commands with unique IDs, timestamps, and parameters', () => {
      const commander = new TravelOdysseyVoiceCommander();
      commander.processTranscript('navigate to flights');
      commander.processTranscript('set destination to Oslo');

      const history = commander.getHistory();
      assert.equal(history.length, 2);

      // History is unshifted so most recent is first
      assert.equal(history[0].action, 'SET_DESTINATION');
      assert.equal(history[0].parameters.destination, 'Oslo');
      assert.ok(history[0].id.startsWith('cmd_'));
      assert.ok(!Number.isNaN(Date.parse(history[0].timestamp)));

      assert.equal(history[1].action, 'NAVIGATE_PAGE');
      assert.equal(history[1].parameters.page, 'flights');

      // History immutability check
      history.pop();
      assert.equal(commander.getHistory().length, 2);
    });

    it('clears command history upon clearHistory() invocation', () => {
      const commander = new TravelOdysseyVoiceCommander();
      commander.processTranscript('help');
      assert.equal(commander.getHistory().length, 1);

      let clearedEventFired = false;
      commander.on('historyClear', () => {
        clearedEventFired = true;
      });

      commander.clearHistory();
      assert.equal(commander.getHistory().length, 0);
      assert.equal(clearedEventFired, true);
    });
  });

  // 6. Event emitter subscriptions and event dispatch
  describe('6. Event Emitter Subscriptions and Event Dispatch', () => {
    it('supports on, off, unsubscribe, and emit lifecycle', () => {
      const commander = new TravelOdysseyVoiceCommander();
      let callCount = 0;
      let lastPayload = null;

      const unsubscribe = commander.on('testEvent', (payload) => {
        callCount++;
        lastPayload = payload;
      });

      commander.emit('testEvent', { value: 42 });
      assert.equal(callCount, 1);
      assert.equal(lastPayload.value, 42);

      unsubscribe();
      commander.emit('testEvent', { value: 99 });
      assert.equal(callCount, 1);
    });

    it('survives subscriber exceptions without breaking subsequent listeners', () => {
      const commander = new TravelOdysseyVoiceCommander();
      let secondCalled = false;

      commander.on('safeEvent', () => {
        throw new Error('Exploding listener');
      });

      commander.on('safeEvent', () => {
        secondCalled = true;
      });

      commander.emit('safeEvent', {});
      assert.equal(secondCalled, true);
    });

    it('dispatches command, stateChange, and speak events during transcript execution', () => {
      const commander = new TravelOdysseyVoiceCommander();
      const eventsCaptured = [];

      commander.on('command', (cmd) => eventsCaptured.push({ type: 'command', cmd }));
      commander.on('stateChange', (st) => eventsCaptured.push({ type: 'stateChange', st }));
      commander.on('speak', (spk) => eventsCaptured.push({ type: 'speak', spk }));

      commander.processTranscript('navigate to map');

      assert.ok(eventsCaptured.some(e => e.type === 'command' && e.cmd.action === 'NAVIGATE_PAGE'));
      assert.ok(eventsCaptured.some(e => e.type === 'stateChange' && e.st.currentPage === 'map'));
      assert.ok(eventsCaptured.some(e => e.type === 'speak' && e.spk.text.includes('Navigating')));
    });
  });

  // 7. Headless speech synthesis fallback and microphone toggle
  describe('7. Headless Speech Synthesis Fallback and Microphone Toggle', () => {
    it('uses headless speech fallback in non-browser Node.js runtime', () => {
      const commander = new TravelOdysseyVoiceCommander();
      let speakEventData = null;

      commander.on('speak', (data) => {
        speakEventData = data;
      });

      const res = commander.speak('Navigating to flights deck.');
      assert.equal(res.success, true);
      assert.equal(res.status, 'headless');
      assert.equal(res.synthesized, false);
      assert.equal(speakEventData.status, 'headless');
    });

    it('executes through mock SpeechSynthesis and UtteranceClass when injected', () => {
      let spokenUtterance = null;
      const mockSynth = {
        speak: (utterance) => {
          spokenUtterance = utterance;
        }
      };

      class MockUtterance {
        constructor(text) {
          this.text = text;
          this.rate = 1.0;
          this.pitch = 1.0;
          this.lang = 'en-US';
        }
      }

      const commander = new TravelOdysseyVoiceCommander({
        speechSynthesis: mockSynth,
        UtteranceClass: MockUtterance
      });

      const res = commander.speak('Expedition route confirmed.');
      assert.equal(res.success, true);
      assert.equal(res.status, 'synthesized');
      assert.equal(res.synthesized, true);
      assert.ok(spokenUtterance instanceof MockUtterance);
      assert.equal(spokenUtterance.text, 'Expedition route confirmed.');
    });

    it('respects speechEnabled = false by muting speech dispatch', () => {
      const commander = new TravelOdysseyVoiceCommander({ speechEnabled: false });
      const res = commander.speak('Muted announcement');

      assert.equal(res.status, 'muted');
    });

    it('toggles microphone listening state and emits listeningChange', () => {
      const commander = new TravelOdysseyVoiceCommander();
      const transitions = [];

      commander.on('listeningChange', ({ isListening }) => {
        transitions.push(isListening);
      });

      assert.equal(commander.isListening, false);

      commander.startListening();
      assert.equal(commander.isListening, true);

      commander.stopListening();
      assert.equal(commander.isListening, false);

      commander.toggleListening();
      assert.equal(commander.isListening, true);

      commander.toggleListening();
      assert.equal(commander.isListening, false);

      assert.deepEqual(transitions, [true, false, true, false]);
    });
  });

  // 8. End-to-end processTranscript integration
  describe('8. End-to-End processTranscript Integration', () => {
    it('executes a complete sequential voyage voice command itinerary', () => {
      const commander = new TravelOdysseyVoiceCommander({
        defaultPage: 'itinerary',
        defaultBudget: 'moderate'
      });

      // 1. Set destination
      const r1 = commander.processTranscript('set destination to Reykjavik, Iceland');
      assert.equal(r1.success, true);
      assert.equal(r1.command.action, 'SET_DESTINATION');
      assert.equal(commander.currentDestination, 'Reykjavik, Iceland');

      // 2. Filter budget
      const r2 = commander.processTranscript('filter budget luxury');
      assert.equal(r2.success, true);
      assert.equal(r2.command.action, 'FILTER_BUDGET');
      assert.equal(commander.budgetTier, 'luxury');

      // 3. Navigate page
      const r3 = commander.processTranscript('navigate to accommodations');
      assert.equal(r3.success, true);
      assert.equal(r3.command.action, 'NAVIGATE_PAGE');
      assert.equal(commander.currentPage, 'accommodations');

      // 4. Export itinerary
      const r4 = commander.processTranscript('export itinerary as pdf');
      assert.equal(r4.success, true);
      assert.equal(r4.command.action, 'EXPORT_ITINERARY');
      assert.equal(r4.command.parameters.format, 'pdf');

      // 5. Toggle high contrast
      const r5 = commander.processTranscript('toggle high contrast');
      assert.equal(r5.success, true);
      assert.equal(r5.command.action, 'TOGGLE_HIGH_CONTRAST');
      assert.equal(commander.highContrast, true);

      // Verify overall state
      const finalState = commander.getState();
      assert.equal(finalState.currentPage, 'accommodations');
      assert.equal(finalState.currentDestination, 'Reykjavik, Iceland');
      assert.equal(finalState.budgetTier, 'luxury');
      assert.equal(finalState.highContrast, true);
      assert.equal(finalState.historyCount, 5);

      // Verify all 5 history records exist in reverse chronological order
      const history = commander.getHistory();
      assert.equal(history.length, 5);
      assert.equal(history[0].action, 'TOGGLE_HIGH_CONTRAST');
      assert.equal(history[1].action, 'EXPORT_ITINERARY');
      assert.equal(history[2].action, 'NAVIGATE_PAGE');
      assert.equal(history[3].action, 'FILTER_BUDGET');
      assert.equal(history[4].action, 'SET_DESTINATION');
    });
  });
});
