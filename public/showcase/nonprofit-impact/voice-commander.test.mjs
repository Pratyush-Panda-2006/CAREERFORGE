import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { NonprofitImpactVoiceCommander } from './voice-commander.js';

describe('NonprofitImpactVoiceCommander', () => {
  it('initializes with default status idle and empty history', () => {
    const commander = new NonprofitImpactVoiceCommander();
    assert.equal(commander.status, 'idle');
    assert.deepEqual(commander.getHistory(), []);
  });

  it('correctly matches navigation grammar', () => {
    const commander = new NonprofitImpactVoiceCommander();
    const result1 = commander.parseVoiceGrammar('go to overview');
    assert.equal(result1.matched, true);
    assert.equal(result1.action, 'NAVIGATE');
    assert.equal(result1.target, 'overview');

    const result2 = commander.parseVoiceGrammar('show the dashboard');
    assert.equal(result2.matched, true);
    assert.equal(result2.action, 'NAVIGATE');
  });

  it('correctly matches metrics and stats view grammar', () => {
    const commander = new NonprofitImpactVoiceCommander();
    const result = commander.parseVoiceGrammar('view the metrics');
    assert.equal(result.matched, true);
    assert.equal(result.action, 'VIEW');
    assert.equal(result.target, 'metrics');
  });

  it('correctly matches accessibility contrast toggle grammar', () => {
    const commander = new NonprofitImpactVoiceCommander();
    const result = commander.parseVoiceGrammar('toggle high contrast mode');
    assert.equal(result.matched, true);
    assert.equal(result.action, 'TOGGLE_A11Y');
    assert.equal(result.target, 'high-contrast');
  });

  it('correctly parses campaign filter grammar with captured parameter', () => {
    const commander = new NonprofitImpactVoiceCommander();
    const result = commander.parseVoiceGrammar('filter by campaign clean water');
    assert.equal(result.matched, true);
    assert.equal(result.action, 'FILTER');
    assert.equal(result.target, 'campaign');
    assert.equal(result.param, 'clean water');
    assert.match(result.feedback, /clean water/i);
  });

  it('correctly parses export report grammar with file format parameter', () => {
    const commander = new NonprofitImpactVoiceCommander();
    const resultPdf = commander.parseVoiceGrammar('export report as pdf');
    assert.equal(resultPdf.matched, true);
    assert.equal(resultPdf.action, 'EXPORT');
    assert.equal(resultPdf.param, 'pdf');

    const resultCsv = commander.parseVoiceGrammar('download the impact report as csv');
    assert.equal(resultCsv.matched, true);
    assert.equal(resultCsv.param, 'csv');

    const resultDefault = commander.parseVoiceGrammar('export report');
    assert.equal(resultDefault.matched, true);
    assert.equal(resultDefault.param, 'pdf');
  });

  it('correctly parses accessibility audit trigger grammar', () => {
    const commander = new NonprofitImpactVoiceCommander();
    const result = commander.parseVoiceGrammar('run accessibility audit');
    assert.equal(result.matched, true);
    assert.equal(result.action, 'AUDIT');
    assert.equal(result.target, 'accessibility');
  });

  it('handles help and command list query', () => {
    const commander = new NonprofitImpactVoiceCommander();
    const result = commander.parseVoiceGrammar('what can i say');
    assert.equal(result.matched, true);
    assert.equal(result.action, 'HELP');
  });

  it('handles unrecognized fallback phrase appropriately', () => {
    const commander = new NonprofitImpactVoiceCommander();
    const result = commander.parseVoiceGrammar('order a pizza');
    assert.equal(result.matched, false);
    assert.equal(result.commandId, 'FALLBACK_UNRECOGNIZED');
    assert.match(result.feedback, /not recognized/i);
  });

  it('handles empty or non-string input safely', () => {
    const commander = new NonprofitImpactVoiceCommander();
    const emptyResult = commander.parseVoiceGrammar('');
    assert.equal(emptyResult.matched, false);

    const nullResult = commander.parseVoiceGrammar(null);
    assert.equal(nullResult.matched, false);
  });

  it('manages command execution history and clear action', () => {
    const commander = new NonprofitImpactVoiceCommander();
    commander.executeCommand('view metrics');
    commander.executeCommand('run accessibility audit');
    assert.equal(commander.getHistory().length, 2);

    commander.executeCommand('clear command history');
    assert.equal(commander.getHistory().length, 0);
  });

  it('synthesizes speech with mock speech synthesis', () => {
    let spokenText = null;
    let cancelled = false;
    const mockSynthesis = {
      speak: (utterance) => {
        spokenText = utterance.text;
        utterance.onstart?.();
        utterance.onend?.();
      },
      cancel: () => {
        cancelled = true;
      }
    };
    globalThis.SpeechSynthesisUtterance = class {
      constructor(text) {
        this.text = text;
      }
    };

    const commander = new NonprofitImpactVoiceCommander({ speechSynthesis: mockSynthesis });
    const success = commander.synthesizeResponse('Testing audio feedback');
    assert.equal(success, true);
    assert.equal(cancelled, true);
    assert.equal(spokenText, 'Testing audio feedback');
    assert.equal(commander.status, 'idle');
  });
});
