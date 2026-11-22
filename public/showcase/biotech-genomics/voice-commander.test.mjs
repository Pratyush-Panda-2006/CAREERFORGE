import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BiotechGenomicsVoiceCommander } from './voice-commander.js';

describe('BiotechGenomicsVoiceCommander', () => {
  describe('Initialization & State', () => {
    it('initializes with default options and expected state', () => {
      const commander = new BiotechGenomicsVoiceCommander();
      assert.equal(commander.lang, 'en-US');
      assert.equal(commander.confidenceThreshold, 0.5);
      assert.equal(commander.continuous, true);
      assert.equal(commander.interimResults, true);
      assert.equal(commander.autoSynthesizeFeedback, true);
      assert.equal(commander.isListening, false);
      assert.equal(commander.isSpeaking, false);
      assert.equal(commander.highContrast, false);
      assert.equal(commander.darkMode, true);
      assert.ok(Array.isArray(commander.commands));
      assert.ok(commander.commands.length >= 10);
      assert.deepEqual(commander.getCommandHistory(), []);
    });

    it('accepts custom initialization options', () => {
      const commander = new BiotechGenomicsVoiceCommander({
        lang: 'en-GB',
        confidenceThreshold: 0.8,
        continuous: false,
        interimResults: false,
        autoSynthesizeFeedback: false,
        historyLimit: 25,
        highContrast: true,
        darkMode: false
      });
      assert.equal(commander.lang, 'en-GB');
      assert.equal(commander.confidenceThreshold, 0.8);
      assert.equal(commander.continuous, false);
      assert.equal(commander.interimResults, false);
      assert.equal(commander.autoSynthesizeFeedback, false);
      assert.equal(commander.historyLimit, 25);
      assert.equal(commander.highContrast, true);
      assert.equal(commander.darkMode, false);
    });
  });

  describe('Event Emitter Functionality', () => {
    it('subscribes, emits, and unsubscribes from events properly', () => {
      const commander = new BiotechGenomicsVoiceCommander();
      let callCount = 0;
      let lastData = null;

      const unsubscribe = commander.on('test_event', (data) => {
        callCount++;
        lastData = data;
      });

      commander.emit('test_event', { sample: 42 });
      assert.equal(callCount, 1);
      assert.deepEqual(lastData, { sample: 42 });

      commander.emit('test_event', { sample: 99 });
      assert.equal(callCount, 2);
      assert.deepEqual(lastData, { sample: 99 });

      // Unsubscribe via returned function
      unsubscribe();
      commander.emit('test_event', { sample: 100 });
      assert.equal(callCount, 2);
    });

    it('supports unregistering via off() method', () => {
      const commander = new BiotechGenomicsVoiceCommander();
      let count = 0;
      const fn = () => count++;

      commander.on('custom', fn);
      commander.emit('custom');
      assert.equal(count, 1);

      commander.off('custom', fn);
      commander.emit('custom');
      assert.equal(count, 1);
    });

    it('throws TypeError if subscriber is not a function', () => {
      const commander = new BiotechGenomicsVoiceCommander();
      assert.throws(() => {
        commander.on('test', null);
      }, TypeError);
    });
  });

  describe('Transcript Normalization', () => {
    it('normalizes transcripts by lowercasing, stripping punctuation and trimming', () => {
      const commander = new BiotechGenomicsVoiceCommander();
      assert.equal(commander.normalizeTranscript('   Search Gene BRCA1...   '), 'search gene brca1');
      assert.equal(commander.normalizeTranscript('FILTER VARIANT PATHOGENIC?!'), 'filter variant pathogenic');
      assert.equal(commander.normalizeTranscript(''), '');
      assert.equal(commander.normalizeTranscript(null), '');
      assert.equal(commander.normalizeTranscript(undefined), '');
    });

    it('strips polite conversational filler prefixes', () => {
      const commander = new BiotechGenomicsVoiceCommander();
      assert.equal(commander.normalizeTranscript('Please search gene TP53'), 'search gene tp53');
      assert.equal(commander.normalizeTranscript('Hey biotech, zoom sequence 5x!'), 'zoom sequence 5x');
      assert.equal(commander.normalizeTranscript('Can you filter sequence fasta?'), 'filter sequence fasta');
      assert.equal(commander.normalizeTranscript('Could you reset view?'), 'reset view');
    });
  });

  describe('Voice Grammar Parsing & Parameter Extraction', () => {
    it('parses "search gene <name>" and extracts gene symbol parameter', () => {
      const commander = new BiotechGenomicsVoiceCommander();
      const parsed1 = commander.parseVoiceGrammar('search gene BRCA1');
      assert.equal(parsed1.matched, true);
      assert.equal(parsed1.intent, 'search_gene');
      assert.equal(parsed1.parameters.gene, 'brca1');

      const parsed2 = commander.parseVoiceGrammar('find gene TP53');
      assert.equal(parsed2.matched, true);
      assert.equal(parsed2.intent, 'search_gene');
      assert.equal(parsed2.parameters.gene, 'tp53');

      const parsed3 = commander.parseVoiceGrammar('Please lookup gene EGFR.');
      assert.equal(parsed3.matched, true);
      assert.equal(parsed3.intent, 'search_gene');
      assert.equal(parsed3.parameters.gene, 'egfr');
    });

    it('parses "filter sequence <type>" and extracts sequence filter type', () => {
      const commander = new BiotechGenomicsVoiceCommander();
      const parsed = commander.parseVoiceGrammar('filter sequence fasta');
      assert.equal(parsed.matched, true);
      assert.equal(parsed.intent, 'filter_sequence');
      assert.equal(parsed.parameters.target, 'sequence');
      assert.equal(parsed.parameters.type, 'fasta');
    });

    it('parses "filter variant <type>" and extracts variant classification', () => {
      const commander = new BiotechGenomicsVoiceCommander();
      const parsed1 = commander.parseVoiceGrammar('filter variant missense');
      assert.equal(parsed1.matched, true);
      assert.equal(parsed1.intent, 'filter_variant');
      assert.equal(parsed1.parameters.target, 'variant');
      assert.equal(parsed1.parameters.type, 'missense');

      const parsed2 = commander.parseVoiceGrammar('display variant pathogenic');
      assert.equal(parsed2.matched, true);
      assert.equal(parsed2.intent, 'filter_variant');
      assert.equal(parsed2.parameters.type, 'pathogenic');
    });

    it('parses "zoom sequence <level>" and extracts zoom scale level', () => {
      const commander = new BiotechGenomicsVoiceCommander();
      const parsed1 = commander.parseVoiceGrammar('zoom sequence 10x');
      assert.equal(parsed1.matched, true);
      assert.equal(parsed1.intent, 'zoom_sequence');
      assert.equal(parsed1.parameters.level, '10x');

      const parsed2 = commander.parseVoiceGrammar('zoom sequence in');
      assert.equal(parsed2.matched, true);
      assert.equal(parsed2.parameters.level, 'in');

      const parsed3 = commander.parseVoiceGrammar('zoom sequence 500bp');
      assert.equal(parsed3.matched, true);
      assert.equal(parsed3.parameters.level, '500bp');
    });

    it('parses "reset view" and restores canvas zoom overview', () => {
      const commander = new BiotechGenomicsVoiceCommander();
      const parsed1 = commander.parseVoiceGrammar('reset view');
      assert.equal(parsed1.matched, true);
      assert.equal(parsed1.intent, 'reset_view');
      assert.equal(parsed1.parameters.action, 'reset');

      const parsed2 = commander.parseVoiceGrammar('restore canvas');
      assert.equal(parsed2.matched, true);
      assert.equal(parsed2.intent, 'reset_view');
    });

    it('parses "export genome data" and "export fasta" format options', () => {
      const commander = new BiotechGenomicsVoiceCommander();
      const parsed1 = commander.parseVoiceGrammar('export genome data');
      assert.equal(parsed1.matched, true);
      assert.equal(parsed1.intent, 'export_data');
      assert.equal(parsed1.parameters.format, 'genome data');

      const parsed2 = commander.parseVoiceGrammar('export fasta');
      assert.equal(parsed2.matched, true);
      assert.equal(parsed2.intent, 'export_data');
      assert.equal(parsed2.parameters.format, 'fasta');

      const parsed3 = commander.parseVoiceGrammar('download json');
      assert.equal(parsed3.matched, true);
      assert.equal(parsed3.parameters.format, 'json');
    });

    it('parses accessibility commands: "toggle contrast" & "activate dark mode"', () => {
      const commander = new BiotechGenomicsVoiceCommander();
      const parsedContrast = commander.parseVoiceGrammar('toggle contrast');
      assert.equal(parsedContrast.matched, true);
      assert.equal(parsedContrast.intent, 'toggle_contrast');

      const parsedDark = commander.parseVoiceGrammar('activate dark mode');
      assert.equal(parsedDark.matched, true);
      assert.equal(parsedDark.intent, 'activate_dark_mode');
    });

    it('parses speech triggers: "read sequence details" and "read summary"', () => {
      const commander = new BiotechGenomicsVoiceCommander();
      const parsedDetails = commander.parseVoiceGrammar('read sequence details');
      assert.equal(parsedDetails.matched, true);
      assert.equal(parsedDetails.intent, 'read_details');

      const parsedSummary = commander.parseVoiceGrammar('read summary');
      assert.equal(parsedSummary.matched, true);
      assert.equal(parsedSummary.intent, 'read_summary');
    });

    it('handles fallback for unrecognized command phrases', () => {
      const commander = new BiotechGenomicsVoiceCommander();
      const parsed = commander.parseVoiceGrammar('launch interstellar rocket to mars');
      assert.equal(parsed.matched, false);
      assert.equal(parsed.intent, 'unknown');
      assert.deepEqual(parsed.parameters, {});
      assert.equal(parsed.handler, null);
    });

    it('handles empty or whitespace-only phrases gracefully', () => {
      const commander = new BiotechGenomicsVoiceCommander();
      const parsed = commander.parseVoiceGrammar('   ');
      assert.equal(parsed.matched, false);
      assert.equal(parsed.intent, 'unknown');
      assert.equal(parsed.confidence, 0);
    });
  });

  describe('Custom Command Registration', () => {
    it('registers custom commands with regex patterns and executes handlers', async () => {
      const commander = new BiotechGenomicsVoiceCommander({ autoSynthesizeFeedback: false });
      let handlerCalled = false;

      commander.registerCommand(
        /^crispr\s+target\s+([a-z0-9]+)$/i,
        (match) => {
          handlerCalled = true;
          return `Targeting CRISPR site ${match.parameters.param1}`;
        },
        'Target CRISPR site',
        { id: 'crispr_target' }
      );

      const parsed = commander.parseVoiceGrammar('crispr target exon4');
      assert.equal(parsed.matched, true);
      assert.equal(parsed.commandId, 'crispr_target');

      const execution = await commander.executeTranscript('crispr target exon4');
      assert.equal(handlerCalled, true);
      assert.equal(execution.status, 'executed');
      assert.equal(execution.feedback, 'Targeting CRISPR site exon4');
    });

    it('registers custom command using string pattern with token interpolation', async () => {
      const commander = new BiotechGenomicsVoiceCommander({ autoSynthesizeFeedback: false });

      commander.registerCommand(
        'align sequence :target',
        (match) => `Aligning against ${match.parameters.target}`,
        'Align sequence against reference',
        { id: 'align_sequence', intent: 'align_sequence' }
      );

      const parsed = commander.parseVoiceGrammar('align sequence hg38');
      assert.equal(parsed.matched, true);
      assert.equal(parsed.parameters.target, 'hg38');

      const result = await commander.executeTranscript('align sequence hg38');
      assert.equal(result.status, 'executed');
      assert.equal(result.feedback, 'Aligning against hg38');
    });

    it('unregisters commands cleanly using unregisterCommand()', () => {
      const commander = new BiotechGenomicsVoiceCommander();
      commander.registerCommand(
        /^custom\s+cmd$/i,
        () => 'Custom done',
        'Custom command',
        { id: 'my_custom_cmd' }
      );

      assert.equal(commander.parseVoiceGrammar('custom cmd').matched, true);
      const removed = commander.unregisterCommand('my_custom_cmd');
      assert.equal(removed, true);
      assert.equal(commander.parseVoiceGrammar('custom cmd').matched, false);
    });

    it('throws when registering invalid command patterns or handlers', () => {
      const commander = new BiotechGenomicsVoiceCommander();
      assert.throws(() => commander.registerCommand(null, () => {}), /required/);
      assert.throws(() => commander.registerCommand('test', 'not a function'), TypeError);
    });
  });

  describe('Command Execution & State Updates', () => {
    it('executes "search gene BRCA1" and updates active gene context and emits action', async () => {
      const commander = new BiotechGenomicsVoiceCommander({ autoSynthesizeFeedback: false });
      let emittedData = null;
      commander.on('action_search', (data) => {
        emittedData = data;
      });

      const res = await commander.executeTranscript('search gene BRCA1');
      assert.equal(res.status, 'executed');
      assert.equal(commander.context.activeGene, 'BRCA1');
      assert.deepEqual(emittedData, { gene: 'BRCA1' });
      assert.equal(res.feedback, 'Searching genome database for gene BRCA1');
    });

    it('executes "filter sequence fasta" and updates activeFilter context', async () => {
      const commander = new BiotechGenomicsVoiceCommander({ autoSynthesizeFeedback: false });
      let emittedData = null;
      commander.on('action_filter', (data) => {
        emittedData = data;
      });

      const res = await commander.executeTranscript('filter sequence fasta');
      assert.equal(res.status, 'executed');
      assert.equal(commander.context.activeFilter, 'fasta');
      assert.deepEqual(emittedData, { target: 'sequence', type: 'fasta' });
    });

    it('executes "filter variant pathogenic" and updates activeVariant context', async () => {
      const commander = new BiotechGenomicsVoiceCommander({ autoSynthesizeFeedback: false });
      const res = await commander.executeTranscript('filter variant pathogenic');
      assert.equal(res.status, 'executed');
      assert.equal(commander.context.activeVariant, 'pathogenic');
    });

    it('executes "zoom sequence 5x" and "reset view" canvas updates', async () => {
      const commander = new BiotechGenomicsVoiceCommander({ autoSynthesizeFeedback: false });

      await commander.executeTranscript('zoom sequence 5x');
      assert.equal(commander.context.activeZoom, '5x');

      await commander.executeTranscript('reset view');
      assert.equal(commander.context.activeZoom, '1x');
    });

    it('executes accessibility actions and toggles high contrast state', async () => {
      const commander = new BiotechGenomicsVoiceCommander({ autoSynthesizeFeedback: false });
      assert.equal(commander.highContrast, false);

      let contrastPayload = null;
      commander.on('contrast_toggled', (payload) => {
        contrastPayload = payload;
      });

      await commander.executeTranscript('toggle contrast');
      assert.equal(commander.highContrast, true);
      assert.deepEqual(contrastPayload, { highContrast: true });

      await commander.executeTranscript('toggle contrast');
      assert.equal(commander.highContrast, false);
      assert.deepEqual(contrastPayload, { highContrast: false });
    });

    it('handles simulated spoken input via simulateSpokenInput() helper', async () => {
      const commander = new BiotechGenomicsVoiceCommander({ autoSynthesizeFeedback: false });
      let simulated = null;
      commander.on('simulated_speech', (data) => {
        simulated = data;
      });

      const result = await commander.simulateSpokenInput('export fasta', 0.99);
      assert.equal(result.status, 'executed');
      assert.equal(result.confidence, 0.99);
      assert.deepEqual(simulated, { transcript: 'export fasta', confidence: 0.99 });
    });

    it('records failed status if command handler throws an error', async () => {
      const commander = new BiotechGenomicsVoiceCommander({ autoSynthesizeFeedback: false });
      commander.registerCommand(
        /^error\s+trigger$/i,
        () => {
          throw new Error('Simulated laboratory sensor failure');
        },
        'Failing command',
        { id: 'failing_cmd' }
      );

      let failedPayload = null;
      commander.on('command_failed', (data) => {
        failedPayload = data;
      });

      const result = await commander.executeTranscript('error trigger');
      assert.equal(result.status, 'failed');
      assert.equal(result.error, 'Simulated laboratory sensor failure');
      assert.ok(failedPayload);
      assert.equal(failedPayload.status, 'failed');
    });
  });

  describe('Command History Tracking', () => {
    it('appends executed and unrecognized commands into history list', async () => {
      const commander = new BiotechGenomicsVoiceCommander({ autoSynthesizeFeedback: false });
      assert.equal(commander.getCommandHistory().length, 0);

      await commander.executeTranscript('search gene TP53');
      await commander.executeTranscript('unknown alien speech');

      const history = commander.getCommandHistory();
      assert.equal(history.length, 2);
      assert.equal(history[0].intent, 'unknown'); // Most recent first
      assert.equal(history[0].status, 'unrecognized');
      assert.equal(history[1].intent, 'search_gene');
      assert.equal(history[1].status, 'executed');
    });

    it('enforces history limit and truncates oldest items FIFO', async () => {
      const commander = new BiotechGenomicsVoiceCommander({
        historyLimit: 3,
        autoSynthesizeFeedback: false
      });

      await commander.executeTranscript('search gene G1');
      await commander.executeTranscript('search gene G2');
      await commander.executeTranscript('search gene G3');
      assert.equal(commander.getCommandHistory().length, 3);

      await commander.executeTranscript('search gene G4');
      const history = commander.getCommandHistory();
      assert.equal(history.length, 3);
      assert.equal(history[0].parameters.gene, 'g4');
      assert.equal(history[2].parameters.gene, 'g2');
    });

    it('clears command history and emits history_cleared event', async () => {
      const commander = new BiotechGenomicsVoiceCommander({ autoSynthesizeFeedback: false });
      await commander.executeTranscript('search gene BRCA2');
      assert.equal(commander.getCommandHistory().length, 1);

      let clearedEventFired = false;
      commander.on('history_cleared', () => {
        clearedEventFired = true;
      });

      commander.clearHistory();
      assert.equal(commander.getCommandHistory().length, 0);
      assert.equal(clearedEventFired, true);
    });
  });

  describe('Speech Recognition & Listening Controls', () => {
    it('toggles listening state and emits listening_start and listening_stop', () => {
      const commander = new BiotechGenomicsVoiceCommander();
      let started = false;
      let stopped = false;

      commander.on('listening_start', () => { started = true; });
      commander.on('listening_stop', () => { stopped = true; });

      const state1 = commander.toggleListening();
      assert.equal(state1, true);
      assert.equal(commander.isListening, true);
      assert.equal(started, true);

      const state2 = commander.toggleListening();
      assert.equal(state2, false);
      assert.equal(commander.isListening, false);
      assert.equal(stopped, true);
    });

    it('calling startListening() when already listening returns true idempotently', () => {
      const commander = new BiotechGenomicsVoiceCommander();
      commander.startListening();
      assert.equal(commander.isListening, true);
      const res = commander.startListening();
      assert.equal(res, true);
      assert.equal(commander.isListening, true);
    });

    it('calling stopListening() when not listening returns false', () => {
      const commander = new BiotechGenomicsVoiceCommander();
      assert.equal(commander.isListening, false);
      const res = commander.stopListening();
      assert.equal(res, false);
    });
  });

  describe('Speech Synthesis Dispatcher', () => {
    it('synthesizes response in headless mode and resolves cleanly', async () => {
      const commander = new BiotechGenomicsVoiceCommander();
      let startEventFired = false;
      let endEventFired = false;

      commander.on('speech_start', (d) => {
        startEventFired = true;
        assert.equal(d.text, 'CRISPR base editing in progress');
      });
      commander.on('speech_end', (d) => {
        endEventFired = true;
        assert.equal(d.text, 'CRISPR base editing in progress');
      });

      const res = await commander.synthesizeResponse('CRISPR base editing in progress', {
        pitch: 1.2,
        rate: 0.9
      });

      assert.equal(res.spoken, true);
      assert.equal(startEventFired, true);
      assert.equal(endEventFired, true);
      assert.equal(commander.isSpeaking, false);
    });

    it('returns spoken:false for empty or whitespace messages', async () => {
      const commander = new BiotechGenomicsVoiceCommander();
      const res = await commander.synthesizeResponse('    ');
      assert.equal(res.spoken, false);
      assert.equal(res.reason, 'empty_message');
    });

    it('cancels speech cleanly via cancelSpeech()', () => {
      const commander = new BiotechGenomicsVoiceCommander();
      let cancelled = false;
      commander.on('speech_cancelled', () => {
        cancelled = true;
      });

      commander.cancelSpeech();
      assert.equal(commander.isSpeaking, false);
      assert.equal(cancelled, true);
    });
  });

  describe('Accessibility Controls', () => {
    it('manages high-contrast mode transitions', () => {
      const commander = new BiotechGenomicsVoiceCommander();
      assert.equal(commander.highContrast, false);

      commander.toggleContrast(true);
      assert.equal(commander.highContrast, true);

      commander.toggleContrast(false);
      assert.equal(commander.highContrast, false);
    });

    it('manages dark mode state transitions', () => {
      const commander = new BiotechGenomicsVoiceCommander();
      assert.equal(commander.darkMode, true);

      commander.setDarkMode(false);
      assert.equal(commander.darkMode, false);

      commander.setDarkMode(true);
      assert.equal(commander.darkMode, true);
    });
  });
});
