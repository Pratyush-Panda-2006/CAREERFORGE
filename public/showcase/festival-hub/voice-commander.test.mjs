import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  FestivalHubVoiceCommander,
  INTENTS,
  PAGES,
  GENRES,
  PASS_TIERS
} from './voice-commander.js';

describe('FestivalHubVoiceCommander', () => {
  let commander;

  beforeEach(() => {
    commander = new FestivalHubVoiceCommander();
  });

  // ==========================================
  // 1. Initialization and Configuration Options
  // ==========================================
  describe('Initialization and Configuration', () => {
    it('initializes with default options', () => {
      assert.equal(commander.highContrast, false);
      assert.equal(commander.synthEnabled, true);
      assert.equal(commander.rate, 1.0);
      assert.equal(commander.pitch, 1.0);
      assert.equal(commander.lang, 'en-US');
      assert.equal(commander.continuous, false);
      assert.equal(commander.interimResults, false);
      assert.equal(commander.confidenceThreshold, 0.5);
      assert.equal(commander.isListening, false);
      assert.deepEqual(commander.spokenMessages, []);
      assert.deepEqual(commander.commandHistory, []);
      assert.equal(commander.state.currentPage, 'lineup');
      assert.equal(commander.state.activeGenreFilter, null);
      assert.equal(commander.state.selectedPassTier, null);
      assert.equal(commander.state.searchedArtist, null);
      assert.deepEqual(commander.state.reminders, []);
    });

    it('accepts custom initialization options', () => {
      let customCallbackCalled = false;
      const custom = new FestivalHubVoiceCommander({
        highContrast: true,
        synthEnabled: false,
        rate: 1.5,
        pitch: 0.8,
        lang: 'en-GB',
        continuous: true,
        interimResults: true,
        confidenceThreshold: 0.8,
        onCommand: () => {
          customCallbackCalled = true;
        },
        debug: true
      });

      assert.equal(custom.highContrast, true);
      assert.equal(custom.synthEnabled, false);
      assert.equal(custom.rate, 1.5);
      assert.equal(custom.pitch, 0.8);
      assert.equal(custom.lang, 'en-GB');
      assert.equal(custom.continuous, true);
      assert.equal(custom.interimResults, true);
      assert.equal(custom.confidenceThreshold, 0.8);
      assert.equal(custom.debug, true);
      assert.equal(custom.state.highContrast, true);

      custom.processTranscript('help');
      assert.equal(customCallbackCalled, true);
    });

    it('registers grammar definitions in grammarRegistry', () => {
      assert.ok(Array.isArray(commander.grammarRegistry));
      assert.ok(commander.grammarRegistry.length >= 7);
      const intents = commander.grammarRegistry.map(g => g.intent);
      assert.ok(intents.includes(INTENTS.NAVIGATE_PAGE));
      assert.ok(intents.includes(INTENTS.FIND_ARTIST));
      assert.ok(intents.includes(INTENTS.FILTER_GENRE));
      assert.ok(intents.includes(INTENTS.BOOK_PASS));
      assert.ok(intents.includes(INTENTS.TOGGLE_HIGH_CONTRAST));
      assert.ok(intents.includes(INTENTS.SET_REMINDER));
      assert.ok(intents.includes(INTENTS.HELP));
    });
  });

  // ==========================================
  // 2. Handling of Empty, Null, Malformed Input
  // ==========================================
  describe('Malformed & Edge Case Inputs', () => {
    it('gracefully handles null and undefined transcripts', () => {
      const resNull = commander.parseIntent(null);
      assert.equal(resNull.action, INTENTS.UNKNOWN);
      assert.equal(resNull.status, 'error');
      assert.equal(resNull.error, 'Empty or invalid transcript');

      const resUndef = commander.parseIntent(undefined);
      assert.equal(resUndef.action, INTENTS.UNKNOWN);
      assert.equal(resUndef.status, 'error');
    });

    it('gracefully handles non-string inputs', () => {
      const resNum = commander.parseIntent(12345);
      assert.equal(resNum.action, INTENTS.UNKNOWN);
      assert.equal(resNum.status, 'error');

      const resObj = commander.parseIntent({ text: 'lineup' });
      assert.equal(resObj.action, INTENTS.UNKNOWN);
      assert.equal(resObj.status, 'error');

      const resBool = commander.parseIntent(true);
      assert.equal(resBool.action, INTENTS.UNKNOWN);
      assert.equal(resBool.status, 'error');
    });

    it('gracefully handles empty and whitespace strings', () => {
      const resEmpty = commander.parseIntent('');
      assert.equal(resEmpty.action, INTENTS.UNKNOWN);
      assert.equal(resEmpty.status, 'error');

      const resSpaces = commander.parseIntent('   \t\n  ');
      assert.equal(resSpaces.action, INTENTS.UNKNOWN);
      assert.equal(resSpaces.status, 'error');
    });

    it('strips trailing punctuation before parsing', () => {
      const res1 = commander.parseIntent('go to lineup!');
      assert.equal(res1.action, INTENTS.NAVIGATE_PAGE);
      assert.equal(res1.params.page, 'lineup');

      const res2 = commander.parseIntent('what can i say?');
      assert.equal(res2.action, INTENTS.HELP);
    });

    it('handles unrecognized words as UNKNOWN without throwing', () => {
      const resUnknown = commander.parseIntent('fluffy purple dinosaur spaceship');
      assert.equal(resUnknown.action, INTENTS.UNKNOWN);
      assert.equal(resUnknown.status, 'unrecognized');
      assert.ok(resUnknown.feedback.includes('not recognized'));
    });
  });

  // ==========================================
  // 3. Grammar Parsing & Parameter Extraction
  // ==========================================
  describe('Grammar Parsing & Parameter Extraction', () => {
    it('parses NAVIGATE_PAGE intents across all supported destinations', () => {
      for (const page of PAGES) {
        const direct = commander.parseIntent(page);
        assert.equal(direct.action, INTENTS.NAVIGATE_PAGE);
        assert.equal(direct.params.page, page);

        const phrase = commander.parseIntent(`go to ${page}`);
        assert.equal(phrase.action, INTENTS.NAVIGATE_PAGE);
        assert.equal(phrase.params.page, page);

        const openPhrase = commander.parseIntent(`open the ${page} page`);
        assert.equal(openPhrase.action, INTENTS.NAVIGATE_PAGE);
        assert.equal(openPhrase.params.page, page);
      }
    });

    it('parses FIND_ARTIST with artist name extraction', () => {
      const res1 = commander.parseIntent('find artist Daft Punk');
      assert.equal(res1.action, INTENTS.FIND_ARTIST);
      assert.equal(res1.params.artist, 'Daft Punk');

      const res2 = commander.parseIntent('search for Justice');
      assert.equal(res2.action, INTENTS.FIND_ARTIST);
      assert.equal(res2.params.artist, 'Justice');

      const res3 = commander.parseIntent('who is Fred Again');
      assert.equal(res3.action, INTENTS.FIND_ARTIST);
      assert.equal(res3.params.artist, 'Fred Again');

      const res4 = commander.parseIntent('find Skrillex');
      assert.equal(res4.action, INTENTS.FIND_ARTIST);
      assert.equal(res4.params.artist, 'Skrillex');
    });

    it('parses FILTER_GENRE with normalized genre extraction', () => {
      const genresToTest = [
        { input: 'filter genre electronic', expected: 'electronic' },
        { input: 'filter by rock', expected: 'rock' },
        { input: 'genre jazz', expected: 'jazz' },
        { input: 'indie genre', expected: 'indie' },
        { input: 'filter hip hop', expected: 'hiphop' },
        { input: 'show hip-hop music', expected: 'hiphop' },
        { input: 'show electronic artists', expected: 'electronic' }
      ];

      for (const { input, expected } of genresToTest) {
        const res = commander.parseIntent(input);
        assert.equal(res.action, INTENTS.FILTER_GENRE);
        assert.equal(res.params.genre, expected);
      }
    });

    it('parses BOOK_PASS with tier extraction', () => {
      for (const tier of PASS_TIERS) {
        const p1 = commander.parseIntent(`book ${tier} pass`);
        assert.equal(p1.action, INTENTS.BOOK_PASS);
        assert.equal(p1.params.passTier, tier);

        const p2 = commander.parseIntent(`buy a ${tier} ticket`);
        assert.equal(p2.action, INTENTS.BOOK_PASS);
        assert.equal(p2.params.passTier, tier);

        const p3 = commander.parseIntent(`reserve ${tier}`);
        assert.equal(p3.action, INTENTS.BOOK_PASS);
        assert.equal(p3.params.passTier, tier);
      }
    });

    it('parses TOGGLE_HIGH_CONTRAST accessibility intents', () => {
      const phrases = [
        'toggle high contrast',
        'enable high contrast mode',
        'disable high contrast',
        'high contrast mode',
        'toggle contrast',
        'switch high-contrast'
      ];

      for (const phrase of phrases) {
        const res = commander.parseIntent(phrase);
        assert.equal(res.action, INTENTS.TOGGLE_HIGH_CONTRAST);
      }
    });

    it('parses SET_REMINDER with target, artist, and stage extraction', () => {
      const res1 = commander.parseIntent('set reminder for Odesza at Sunset Stage');
      assert.equal(res1.action, INTENTS.SET_REMINDER);
      assert.equal(res1.params.target, 'Odesza at Sunset Stage');
      assert.equal(res1.params.artist, 'Odesza');
      assert.equal(res1.params.stage, 'Sunset Stage');

      const res2 = commander.parseIntent('remind me about Daft Punk');
      assert.equal(res2.action, INTENTS.SET_REMINDER);
      assert.equal(res2.params.target, 'Daft Punk');
      assert.equal(res2.params.artist, 'Daft Punk');
      assert.equal(res2.params.stage, null);
    });

    it('parses HELP intents', () => {
      const helpPhrases = ['help', 'what can i say', 'voice commands', 'list commands', 'commands'];
      for (const phrase of helpPhrases) {
        const res = commander.parseIntent(phrase);
        assert.equal(res.action, INTENTS.HELP);
      }
    });
  });

  // ==========================================
  // 4. Command Execution & State Mutations
  // ==========================================
  describe('Command Execution & State Mutations', () => {
    it('mutates currentPage on NAVIGATE_PAGE', () => {
      assert.equal(commander.state.currentPage, 'lineup');
      commander.executeCommand(INTENTS.NAVIGATE_PAGE, { page: 'stages' });
      assert.equal(commander.state.currentPage, 'stages');

      commander.executeCommand(INTENTS.NAVIGATE_PAGE, { page: 'schedule' });
      assert.equal(commander.state.currentPage, 'schedule');
    });

    it('mutates searchedArtist on FIND_ARTIST', () => {
      commander.executeCommand(INTENTS.FIND_ARTIST, { artist: 'Deadmau5' });
      assert.equal(commander.state.searchedArtist, 'Deadmau5');
      assert.equal(commander.state.lastSearchQuery, 'Deadmau5');
    });

    it('mutates activeGenreFilter on FILTER_GENRE', () => {
      commander.executeCommand(INTENTS.FILTER_GENRE, { genre: 'electronic' });
      assert.equal(commander.state.activeGenreFilter, 'electronic');

      commander.executeCommand(INTENTS.FILTER_GENRE, { genre: 'jazz' });
      assert.equal(commander.state.activeGenreFilter, 'jazz');
    });

    it('mutates selectedPassTier on BOOK_PASS', () => {
      commander.executeCommand(INTENTS.BOOK_PASS, { passTier: 'vip' });
      assert.equal(commander.state.selectedPassTier, 'vip');

      commander.executeCommand(INTENTS.BOOK_PASS, { passTier: 'weekend' });
      assert.equal(commander.state.selectedPassTier, 'weekend');
    });

    it('toggles highContrast state and emits contrastChange', () => {
      let emittedVal = null;
      commander.on('contrastChange', ({ highContrast }) => {
        emittedVal = highContrast;
      });

      assert.equal(commander.highContrast, false);
      const res1 = commander.toggleHighContrast();
      assert.equal(res1, true);
      assert.equal(commander.highContrast, true);
      assert.equal(commander.state.highContrast, true);
      assert.equal(emittedVal, true);

      const res2 = commander.toggleHighContrast();
      assert.equal(res2, false);
      assert.equal(commander.highContrast, false);
      assert.equal(emittedVal, false);

      // Explicit set
      commander.toggleHighContrast(true);
      assert.equal(commander.highContrast, true);
      commander.toggleHighContrast(false);
      assert.equal(commander.highContrast, false);
    });

    it('appends to reminders on SET_REMINDER', () => {
      assert.equal(commander.state.reminders.length, 0);

      commander.executeCommand(INTENTS.SET_REMINDER, {
        target: 'Disclosure at Neon Stage',
        artist: 'Disclosure',
        stage: 'Neon Stage'
      });

      assert.equal(commander.state.reminders.length, 1);
      assert.equal(commander.state.reminders[0].artist, 'Disclosure');
      assert.equal(commander.state.reminders[0].stage, 'Neon Stage');
      assert.ok(commander.state.reminders[0].id.startsWith('rem-'));
    });

    it('returns appropriate audio feedback strings for all commands', () => {
      const fbNav = commander.executeCommand(INTENTS.NAVIGATE_PAGE, { page: 'map' });
      assert.equal(fbNav, 'Navigating to map page.');

      const fbArtist = commander.executeCommand(INTENTS.FIND_ARTIST, { artist: 'Calvin Harris' });
      assert.equal(fbArtist, 'Searching for artist Calvin Harris.');

      const fbGenre = commander.executeCommand(INTENTS.FILTER_GENRE, { genre: 'rock' });
      assert.equal(fbGenre, 'Filtering lineup by rock music.');

      const fbPass = commander.executeCommand(INTENTS.BOOK_PASS, { passTier: 'vip' });
      assert.equal(fbPass, 'Booking VIP festival pass.');

      const fbHelp = commander.executeCommand(INTENTS.HELP);
      assert.ok(fbHelp.includes('Available commands:'));
    });
  });

  // ==========================================
  // 5. Command History Logging & Unique IDs
  // ==========================================
  describe('Command History Logging & Unique IDs', () => {
    it('generates unique command IDs with prefix', () => {
      const id1 = commander.generateCommandId();
      const id2 = commander.generateCommandId();
      assert.notEqual(id1, id2);
      assert.ok(id1.startsWith('cmd-'));
      assert.ok(id2.startsWith('cmd-'));
    });

    it('logs command executions with timestamp, ID, and confidence', () => {
      commander.processTranscript('go to schedule', { confidence: 0.95 });
      commander.processTranscript('find artist Tycho', { confidence: 0.88 });

      const history = commander.getHistory();
      assert.equal(history.length, 2);
      assert.equal(history[0].action, INTENTS.FIND_ARTIST);
      assert.equal(history[0].confidence, 0.88);
      assert.equal(history[1].action, INTENTS.NAVIGATE_PAGE);
      assert.equal(history[1].confidence, 0.95);
      assert.ok(history[0].id);
      assert.ok(history[0].timestamp);
    });

    it('clears command history and emits historyClear event', () => {
      let clearEmitted = false;
      commander.on('historyClear', () => {
        clearEmitted = true;
      });

      commander.processTranscript('go to map');
      assert.equal(commander.getHistory().length, 1);

      commander.clearHistory();
      assert.equal(commander.getHistory().length, 0);
      assert.equal(clearEmitted, true);
    });
  });

  // ==========================================
  // 6. Event Emitter Subscriptions and Dispatching
  // ==========================================
  describe('Event Emitter Pattern', () => {
    it('subscribes and receives events via on() and emit()', () => {
      let received = null;
      const handler = (data) => {
        received = data;
      };

      commander.on('customTestEvent', handler);
      commander.emit('customTestEvent', { value: 42 });

      assert.deepEqual(received, { value: 42 });
    });

    it('unsubscribes specific handler via off()', () => {
      let count = 0;
      const handler = () => {
        count++;
      };

      commander.on('tick', handler);
      commander.emit('tick');
      assert.equal(count, 1);

      commander.off('tick', handler);
      commander.emit('tick');
      assert.equal(count, 1);
    });

    it('removes all handlers for an event when off() is called without handler', () => {
      let countA = 0;
      let countB = 0;
      commander.on('shared', () => countA++);
      commander.on('shared', () => countB++);

      commander.emit('shared');
      assert.equal(countA, 1);
      assert.equal(countB, 1);

      commander.off('shared');
      commander.emit('shared');
      assert.equal(countA, 1);
      assert.equal(countB, 1);
    });

    it('dispatches specific semantic events on processTranscript', () => {
      let navEvent = null;
      let artistEvent = null;
      let genreEvent = null;
      let passEvent = null;
      let reminderEvent = null;
      let helpEvent = null;

      commander.on('navigate', (p) => (navEvent = p));
      commander.on('findArtist', (p) => (artistEvent = p));
      commander.on('filterGenre', (p) => (genreEvent = p));
      commander.on('bookPass', (p) => (passEvent = p));
      commander.on('setReminder', (p) => (reminderEvent = p));
      commander.on('help', (p) => (helpEvent = p));

      commander.processTranscript('open stages');
      assert.deepEqual(navEvent, { page: 'stages' });

      commander.processTranscript('find artist Rufus Du Sol');
      assert.deepEqual(artistEvent, { artist: 'Rufus Du Sol' });

      commander.processTranscript('filter genre rock');
      assert.deepEqual(genreEvent, { genre: 'rock' });

      commander.processTranscript('book weekend pass');
      assert.deepEqual(passEvent, { passTier: 'weekend', tier: 'weekend' });

      commander.processTranscript('set reminder for Rufus Du Sol');
      assert.equal(reminderEvent.artist, 'Rufus Du Sol');

      commander.processTranscript('help');
      assert.ok(Array.isArray(helpEvent.commands));
    });
  });

  // ==========================================
  // 7. Headless Speech Synthesis & Mic Toggling
  // ==========================================
  describe('Headless Speech Synthesis & Microphone', () => {
    it('records spoken messages in headless fallback array', () => {
      assert.deepEqual(commander.spokenMessages, []);
      commander.speak('Welcome to Festival Hub');
      commander.speak('Navigating to schedule');

      assert.equal(commander.spokenMessages.length, 2);
      assert.equal(commander.spokenMessages[0], 'Welcome to Festival Hub');
      assert.equal(commander.spokenMessages[1], 'Navigating to schedule');

      commander.clearSpokenMessages();
      assert.deepEqual(commander.spokenMessages, []);
    });

    it('ignores invalid speech text', () => {
      commander.speak(null);
      commander.speak(12345);
      commander.speak('');
      assert.equal(commander.spokenMessages.length, 0);
    });

    it('toggles microphone state safely in headless mode', () => {
      let listeningEvents = [];
      commander.on('listeningChange', ({ isListening }) => {
        listeningEvents.push(isListening);
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

      assert.deepEqual(listeningEvents, [true, false, true, false]);
    });
  });

  // ==========================================
  // 8. End-to-End processTranscript Integration
  // ==========================================
  describe('End-to-End Integration', () => {
    it('processes complete lifecycle of voice command', () => {
      let commandEvent = null;
      commander.on('command', (rec) => {
        commandEvent = rec;
      });

      const record = commander.processTranscript('book vip pass', { confidence: 0.98 });

      assert.equal(record.action, INTENTS.BOOK_PASS);
      assert.equal(record.params.passTier, 'vip');
      assert.equal(record.confidence, 0.98);
      assert.equal(record.status, 'success');
      assert.equal(commander.state.selectedPassTier, 'vip');
      assert.equal(commander.spokenMessages.length, 1);
      assert.equal(commander.spokenMessages[0], 'Booking VIP festival pass.');
      assert.equal(commandEvent.id, record.id);
    });

    it('handles unrecognized command and provides helpful feedback', () => {
      const record = commander.processTranscript('teleport to the moon');
      assert.equal(record.action, INTENTS.UNKNOWN);
      assert.equal(record.status, 'unrecognized');
      assert.ok(record.feedback.includes('Command not recognized'));
    });

    it('emits error event when processing empty or invalid input', () => {
      let errorPayload = null;
      commander.on('error', (err) => {
        errorPayload = err;
      });

      const record = commander.processTranscript('');
      assert.equal(record.status, 'error');
      assert.ok(errorPayload);
      assert.ok(errorPayload.message.includes('Empty or invalid transcript'));
    });

    it('manages multiple sequential reminders correctly', () => {
      commander.processTranscript('set reminder for Odesza at Sunset Stage');
      commander.processTranscript('set reminder for Madeon at Main Stage');

      assert.equal(commander.state.reminders.length, 2);
      assert.equal(commander.state.reminders[0].artist, 'Odesza');
      assert.equal(commander.state.reminders[0].stage, 'Sunset Stage');
      assert.equal(commander.state.reminders[1].artist, 'Madeon');
      assert.equal(commander.state.reminders[1].stage, 'Main Stage');
    });

    it('supports getState and resetState helpers', () => {
      commander.processTranscript('filter genre jazz');
      commander.processTranscript('book weekend pass');

      const st = commander.getState();
      assert.equal(st.activeGenreFilter, 'jazz');
      assert.equal(st.selectedPassTier, 'weekend');

      commander.resetState();
      const resetSt = commander.getState();
      assert.equal(resetSt.activeGenreFilter, null);
      assert.equal(resetSt.selectedPassTier, null);
    });
  });
});
