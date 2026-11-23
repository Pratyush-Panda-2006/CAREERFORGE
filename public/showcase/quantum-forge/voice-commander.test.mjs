import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { QuantumForgeVoiceCommander } from './voice-commander.js';

describe('QuantumForgeVoiceCommander', () => {
  it('initializes with default configuration', () => {
    const cmd = new QuantumForgeVoiceCommander();
    assert.equal(cmd.isListening, false);
    assert.equal(cmd.highContrast, false);
    assert.equal(cmd.activeView, 'overview');
  });

  it('handles empty and null transcripts gracefully', () => {
    const cmd = new QuantumForgeVoiceCommander();
    const res = cmd.parseVoiceGrammar('');
    assert.equal(res.action, 'EMPTY');
    assert.equal(cmd.parseVoiceGrammar(null).action, 'EMPTY');
  });

  it('parses navigation and theme commands', () => {
    const cmd = new QuantumForgeVoiceCommander();
    const nav = cmd.parseVoiceGrammar('navigate to telemetry');
    assert.equal(nav.action, 'NAVIGATE_VIEW');
    assert.equal(nav.params.view, 'telemetry');

    const theme = cmd.parseVoiceGrammar('switch theme to neon');
    assert.equal(theme.action, 'SWITCH_THEME');
    assert.equal(theme.params.theme, 'neon');
  });

  it('executes commands and tracks command history', () => {
    const cmd = new QuantumForgeVoiceCommander();
    const res = cmd.processTranscript('go to qubits');
    assert.equal(res.success, true);
    assert.equal(cmd.activeView, 'qubits');
    assert.equal(cmd.getHistory().length, 1);
  });

  it('toggles microphone state and high contrast', () => {
    const cmd = new QuantumForgeVoiceCommander();
    assert.equal(cmd.isListening, false);
    cmd.startListening();
    assert.equal(cmd.isListening, true);
    cmd.stopListening();
    assert.equal(cmd.isListening, false);

    assert.equal(cmd.toggleHighContrast(), true);
    assert.equal(cmd.toggleHighContrast(false), false);
  });
});
