import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AiVoiceStudioVoiceCommander } from './voice-commander.js';

test('AiVoiceStudioVoiceCommander - initializes in idle state with default parameters', () => {
  const commander = new AiVoiceStudioVoiceCommander();
  assert.strictEqual(commander.isListeningState(), false);
  assert.strictEqual(commander.getCommandHistory().length, 0);
  assert.strictEqual(commander.currentModel, 'eleven-multilingual-v2');
  assert.strictEqual(commander.currentPitch, 1.0);
  assert.strictEqual(commander.currentSpeed, 1.0);
  assert.strictEqual(commander.isHighContrast, false);
  assert.ok(commander.getLastResponse().includes('standby'));
});

test('AiVoiceStudioVoiceCommander - toggles listening state correctly', () => {
  const commander = new AiVoiceStudioVoiceCommander();
  assert.strictEqual(commander.startListening(), true);
  assert.strictEqual(commander.isListeningState(), true);
  assert.strictEqual(commander.stopListening(), false);
  assert.strictEqual(commander.isListeningState(), false);
  assert.strictEqual(commander.toggleListening(), true);
  assert.strictEqual(commander.isListeningState(), true);
  assert.strictEqual(commander.toggleListening(), false);
  assert.strictEqual(commander.isListeningState(), false);
});

test('AiVoiceStudioVoiceCommander - parses model selection and voice generation grammars', () => {
  const commander = new AiVoiceStudioVoiceCommander();

  // Test "select model <name>"
  const res1 = commander.parseVoiceGrammar('select model eleven-multilingual-v2');
  assert.strictEqual(res1.matched, true);
  assert.strictEqual(res1.intent, 'SELECT_MODEL');
  assert.strictEqual(res1.parameters.model, 'eleven-multilingual-v2');
  assert.ok(res1.response.includes('eleven-multilingual-v2'));

  // Test "generate voice <model>"
  const res2 = commander.parseVoiceGrammar('generate voice nova');
  assert.strictEqual(res2.matched, true);
  assert.strictEqual(res2.intent, 'SELECT_MODEL');
  assert.strictEqual(res2.parameters.model, 'nova');

  // Test "switch to model <name>"
  const res3 = commander.parseVoiceGrammar('switch to model onyx');
  assert.strictEqual(res3.matched, true);
  assert.strictEqual(res3.parameters.model, 'onyx');

  // Test "choose voice <name>"
  const res4 = commander.parseVoiceGrammar('choose voice echo');
  assert.strictEqual(res4.matched, true);
  assert.strictEqual(res4.parameters.model, 'echo');
});

test('AiVoiceStudioVoiceCommander - parses pitch adjustments with level extraction and clamping', () => {
  const commander = new AiVoiceStudioVoiceCommander();

  // Test "adjust pitch high"
  const resHigh = commander.parseVoiceGrammar('adjust pitch high');
  assert.strictEqual(resHigh.matched, true);
  assert.strictEqual(resHigh.intent, 'ADJUST_PITCH');
  assert.strictEqual(resHigh.parameters.pitch, 1.5);
  assert.strictEqual(resHigh.parameters.raw, 'high');

  // Test "adjust pitch low"
  const resLow = commander.parseVoiceGrammar('adjust pitch low');
  assert.strictEqual(resLow.matched, true);
  assert.strictEqual(resLow.parameters.pitch, 0.7);

  // Test "adjust pitch 1.2"
  const resNum = commander.parseVoiceGrammar('adjust pitch 1.2');
  assert.strictEqual(resNum.matched, true);
  assert.strictEqual(resNum.parameters.pitch, 1.2);

  // Test "pitch default"
  const resDef = commander.parseVoiceGrammar('pitch default');
  assert.strictEqual(resDef.matched, true);
  assert.strictEqual(resDef.parameters.pitch, 1.0);

  // Test clamping for extreme values
  const resMax = commander.parseVoiceGrammar('adjust pitch 4.5');
  assert.strictEqual(resMax.parameters.pitch, 2.0);

  const resMin = commander.parseVoiceGrammar('set pitch 0.2');
  assert.strictEqual(resMin.parameters.pitch, 0.5);
});

test('AiVoiceStudioVoiceCommander - parses speed and tempo adjustments with multiplier extraction', () => {
  const commander = new AiVoiceStudioVoiceCommander();

  // Test "adjust speed 1.5x"
  const resSpeedX = commander.parseVoiceGrammar('adjust speed 1.5x');
  assert.strictEqual(resSpeedX.matched, true);
  assert.strictEqual(resSpeedX.intent, 'ADJUST_SPEED');
  assert.strictEqual(resSpeedX.parameters.speed, 1.5);

  // Test "adjust speed fast"
  const resFast = commander.parseVoiceGrammar('adjust speed fast');
  assert.strictEqual(resFast.matched, true);
  assert.strictEqual(resFast.parameters.speed, 1.5);

  // Test "adjust tempo slow"
  const resSlow = commander.parseVoiceGrammar('adjust tempo slow');
  assert.strictEqual(resSlow.matched, true);
  assert.strictEqual(resSlow.intent, 'ADJUST_SPEED');
  assert.strictEqual(resSlow.parameters.speed, 0.75);

  // Test "adjust tempo 0.8"
  const resNum = commander.parseVoiceGrammar('adjust tempo 0.8');
  assert.strictEqual(resNum.matched, true);
  assert.strictEqual(resNum.parameters.speed, 0.8);

  // Test "speed normal"
  const resNorm = commander.parseVoiceGrammar('speed normal');
  assert.strictEqual(resNorm.matched, true);
  assert.strictEqual(resNorm.parameters.speed, 1.0);
});

test('AiVoiceStudioVoiceCommander - parses speech rendering commands', () => {
  const commander = new AiVoiceStudioVoiceCommander();

  const res1 = commander.parseVoiceGrammar('render speech');
  assert.strictEqual(res1.matched, true);
  assert.strictEqual(res1.intent, 'RENDER_SPEECH');
  assert.ok(res1.response.includes('Rendering speech'));

  const res2 = commander.parseVoiceGrammar('synthesize audio');
  assert.strictEqual(res2.matched, true);
  assert.strictEqual(res2.intent, 'RENDER_SPEECH');
});

test('AiVoiceStudioVoiceCommander - parses audio export commands with format extraction', () => {
  const commander = new AiVoiceStudioVoiceCommander();

  // Test "export audio wav"
  const resWav = commander.parseVoiceGrammar('export audio wav');
  assert.strictEqual(resWav.matched, true);
  assert.strictEqual(resWav.intent, 'EXPORT_AUDIO');
  assert.strictEqual(resWav.parameters.format, 'wav');
  assert.ok(resWav.response.includes('WAV'));

  // Test "export mp3"
  const resMp3 = commander.parseVoiceGrammar('export mp3');
  assert.strictEqual(resMp3.matched, true);
  assert.strictEqual(resMp3.intent, 'EXPORT_AUDIO');
  assert.strictEqual(resMp3.parameters.format, 'mp3');

  // Test "download audio ogg"
  const resOgg = commander.parseVoiceGrammar('download audio ogg');
  assert.strictEqual(resOgg.matched, true);
  assert.strictEqual(resOgg.parameters.format, 'ogg');
});

test('AiVoiceStudioVoiceCommander - parses accessibility contrast and dark mode triggers', () => {
  const commander = new AiVoiceStudioVoiceCommander();

  // Test "toggle contrast"
  const resContrast = commander.parseVoiceGrammar('toggle contrast');
  assert.strictEqual(resContrast.matched, true);
  assert.strictEqual(resContrast.intent, 'TOGGLE_CONTRAST');
  assert.strictEqual(resContrast.parameters.highContrast, true);

  // Test "activate dark mode"
  const resDark = commander.parseVoiceGrammar('activate dark mode');
  assert.strictEqual(resDark.matched, true);
  assert.strictEqual(resDark.intent, 'ACTIVATE_DARK_MODE');
  assert.strictEqual(resDark.parameters.darkMode, true);
});

test('AiVoiceStudioVoiceCommander - parses audio preview and speech triggers', () => {
  const commander = new AiVoiceStudioVoiceCommander();

  const res1 = commander.parseVoiceGrammar('preview audio');
  assert.strictEqual(res1.matched, true);
  assert.strictEqual(res1.intent, 'PREVIEW_AUDIO');
  assert.ok(res1.response.includes('preview'));

  const res2 = commander.parseVoiceGrammar('speak text');
  assert.strictEqual(res2.matched, true);
  assert.strictEqual(res2.intent, 'PREVIEW_AUDIO');
});

test('AiVoiceStudioVoiceCommander - parses help and commands queries', () => {
  const commander = new AiVoiceStudioVoiceCommander();

  const resHelp = commander.parseVoiceGrammar('help');
  assert.strictEqual(resHelp.matched, true);
  assert.strictEqual(resHelp.intent, 'HELP');
  assert.ok(resHelp.response.includes('Supported commands'));

  const resWhat = commander.parseVoiceGrammar('what can i say');
  assert.strictEqual(resWhat.matched, true);
  assert.strictEqual(resWhat.intent, 'HELP');
});

test('AiVoiceStudioVoiceCommander - executes grammar callbacks to update commander state', () => {
  const commander = new AiVoiceStudioVoiceCommander();

  // Model update callback
  const parsedModel = commander.parseVoiceGrammar('select model nova');
  parsedModel.callback();
  assert.strictEqual(commander.currentModel, 'nova');

  // Pitch update callback
  const parsedPitch = commander.parseVoiceGrammar('adjust pitch high');
  parsedPitch.callback();
  assert.strictEqual(commander.currentPitch, 1.5);

  // Speed update callback
  const parsedSpeed = commander.parseVoiceGrammar('adjust speed 1.75x');
  parsedSpeed.callback();
  assert.strictEqual(commander.currentSpeed, 1.75);

  // Contrast update callback
  const parsedContrast = commander.parseVoiceGrammar('toggle contrast');
  parsedContrast.callback();
  assert.strictEqual(commander.isHighContrast, true);
});

test('AiVoiceStudioVoiceCommander - supports registering custom domain command grammars', () => {
  const commander = new AiVoiceStudioVoiceCommander();
  let customExecuted = false;

  const cmdId = commander.registerCommand(
    /vocal warm\s*up/i,
    () => {
      customExecuted = true;
    },
    'Executing vocal frequency warm up sequence.'
  );

  assert.ok(cmdId.startsWith('custom_'));

  const parsed = commander.parseVoiceGrammar('vocal warmup');
  assert.strictEqual(parsed.matched, true);
  assert.strictEqual(parsed.intent, 'CUSTOM_COMMAND');
  assert.strictEqual(parsed.response, 'Executing vocal frequency warm up sequence.');

  parsed.callback();
  assert.strictEqual(customExecuted, true);
});

test('AiVoiceStudioVoiceCommander - handles event subscriptions via on and emit', () => {
  const commander = new AiVoiceStudioVoiceCommander();
  let receivedModel = null;

  const unsubscribe = commander.on('modelChange', ({ model }) => {
    receivedModel = model;
  });

  commander.emit('modelChange', { model: 'alloy' });
  assert.strictEqual(receivedModel, 'alloy');

  unsubscribe();
  commander.emit('modelChange', { model: 'shimmer' });
  // Should remain alloy after unsubscribing
  assert.strictEqual(receivedModel, 'alloy');
});

test('AiVoiceStudioVoiceCommander - handles empty, whitespace, and unrecognized transcripts gracefully', () => {
  const commander = new AiVoiceStudioVoiceCommander();

  // Null input
  const resNull = commander.parseVoiceGrammar(null);
  assert.strictEqual(resNull.matched, false);
  assert.strictEqual(resNull.intent, 'UNKNOWN');

  // Empty string
  const resEmpty = commander.parseVoiceGrammar('');
  assert.strictEqual(resEmpty.matched, false);
  assert.strictEqual(resEmpty.intent, 'UNKNOWN');

  // Whitespace only
  const resSpace = commander.parseVoiceGrammar('   ');
  assert.strictEqual(resSpace.matched, false);
  assert.strictEqual(resSpace.intent, 'UNKNOWN');

  // Unrecognized sentence
  const resUnrecognized = commander.parseVoiceGrammar('order cheese pizza');
  assert.strictEqual(resUnrecognized.matched, false);
  assert.strictEqual(resUnrecognized.intent, 'FALLBACK');
  assert.ok(resUnrecognized.response.includes('not recognized'));
});

test('AiVoiceStudioVoiceCommander - records history, maintains max capacity, and clears history', () => {
  const commander = new AiVoiceStudioVoiceCommander({ maxHistory: 3 });

  commander.handleTranscript('select model nova');
  commander.handleTranscript('adjust pitch 1.2');
  commander.handleTranscript('render speech');

  let history = commander.getCommandHistory();
  assert.strictEqual(history.length, 3);
  assert.strictEqual(history[0].intent, 'RENDER_SPEECH');
  assert.strictEqual(history[1].intent, 'ADJUST_PITCH');
  assert.strictEqual(history[2].intent, 'SELECT_MODEL');

  // Exceed maxHistory
  commander.handleTranscript('export mp3');
  history = commander.getCommandHistory();
  assert.strictEqual(history.length, 3);
  assert.strictEqual(history[0].intent, 'EXPORT_AUDIO');

  // Clear history
  commander.clearHistory();
  assert.strictEqual(commander.getCommandHistory().length, 0);
});

test('AiVoiceStudioVoiceCommander - dispatches speech synthesis with parameters', () => {
  let spokenUtterance = null;
  const mockSynth = {
    speaking: false,
    cancel() {},
    speak(utterance) {
      spokenUtterance = utterance;
    }
  };

  const commander = new AiVoiceStudioVoiceCommander({ synth: mockSynth });
  const result = commander.synthesizeResponse('Neural voice synthesis online.', {
    pitch: 1.2,
    speed: 1.5
  });

  assert.strictEqual(result, 'Neural voice synthesis online.');
  assert.strictEqual(commander.getLastResponse(), 'Neural voice synthesis online.');
});
