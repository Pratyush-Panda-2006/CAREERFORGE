import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PodcastAudioStreamVoiceCommander,
  parseSeconds,
  parsePlaybackRate,
  PODCAST_GRAMMARS
} from './voice-commander.js';

test('Helper functions - parseSeconds converts numbers, words, and invalid inputs', () => {
  assert.strictEqual(parseSeconds(30), 30);
  assert.strictEqual(parseSeconds('15'), 15);
  assert.strictEqual(parseSeconds('45s'), 45);
  assert.strictEqual(parseSeconds('ten'), 10);
  assert.strictEqual(parseSeconds('fifteen'), 15);
  assert.strictEqual(parseSeconds('thirty'), 30);
  assert.strictEqual(parseSeconds('sixty'), 60);
  assert.strictEqual(parseSeconds('invalid'), null);
  assert.strictEqual(parseSeconds(''), null);
  assert.strictEqual(parseSeconds(null), null);
});

test('Helper functions - parsePlaybackRate converts floats, x-suffixes, phrases, and clamps', () => {
  assert.strictEqual(parsePlaybackRate(1.5), 1.5);
  assert.strictEqual(parsePlaybackRate('1.5x'), 1.5);
  assert.strictEqual(parsePlaybackRate('2x'), 2.0);
  assert.strictEqual(parsePlaybackRate('0.75'), 0.75);
  assert.strictEqual(parsePlaybackRate('half'), 0.5);
  assert.strictEqual(parsePlaybackRate('double'), 2.0);
  assert.strictEqual(parsePlaybackRate('one and a half'), 1.5);
  assert.strictEqual(parsePlaybackRate('normal'), 1.0);
  // Clamped bounds between 0.5 and 3.0
  assert.strictEqual(parsePlaybackRate('0.1'), 0.5);
  assert.strictEqual(parsePlaybackRate('5.0'), 3.0);
  assert.strictEqual(parsePlaybackRate('invalid'), null);
});

test('PodcastAudioStreamVoiceCommander - initializes in idle state with default playback', () => {
  const commander = new PodcastAudioStreamVoiceCommander();
  assert.strictEqual(commander.isListeningState(), false);
  assert.strictEqual(commander.getCommandHistory().length, 0);

  const state = commander.getPlaybackState();
  assert.strictEqual(state.isPlaying, false);
  assert.strictEqual(state.playbackRate, 1.0);
  assert.ok(state.duration > 0);
  assert.ok(state.currentEpisode.title.includes('Episode 142'));
  assert.ok(commander.getLastResponse().includes('Podcast Voice Commander initialized'));
});

test('PodcastAudioStreamVoiceCommander - manages listening lifecycle and emits events', () => {
  const commander = new PodcastAudioStreamVoiceCommander();
  let startEvents = 0;
  let stopEvents = 0;

  commander.on('listening_start', () => { startEvents++; });
  commander.on('listening_stop', () => { stopEvents++; });

  assert.strictEqual(commander.startListening(), true);
  assert.strictEqual(commander.isListeningState(), true);
  assert.strictEqual(startEvents, 1);

  // Calling startListening again when already active
  assert.strictEqual(commander.startListening(), true);
  assert.strictEqual(startEvents, 1);

  assert.strictEqual(commander.stopListening(), false);
  assert.strictEqual(commander.isListeningState(), false);
  assert.strictEqual(stopEvents, 1);

  // Toggle listening
  const toggledOn = commander.toggleListening();
  assert.strictEqual(toggledOn, true);
  assert.strictEqual(commander.isListeningState(), true);

  const toggledOff = commander.toggleListening();
  assert.strictEqual(toggledOff, false);
  assert.strictEqual(commander.isListeningState(), false);
});

test('PodcastAudioStreamVoiceCommander - parses PLAY_EPISODE grammar and extracts parameters', () => {
  const commander = new PodcastAudioStreamVoiceCommander();

  const res1 = commander.parseVoiceGrammar('play episode 142');
  assert.strictEqual(res1.matched, true);
  assert.strictEqual(res1.intent, 'PLAY_EPISODE');
  assert.strictEqual(res1.params.episode, '142');
  assert.ok(res1.confidence >= 0.9);
  assert.ok(res1.response.includes('142'));

  const res2 = commander.parseVoiceGrammar('start episode The Future of Web Audio');
  assert.strictEqual(res2.matched, true);
  assert.strictEqual(res2.intent, 'PLAY_EPISODE');
  assert.strictEqual(res2.params.episode, 'The Future of Web Audio');

  const res3 = commander.parseVoiceGrammar('listen to track #7');
  assert.strictEqual(res3.matched, true);
  assert.strictEqual(res3.intent, 'PLAY_EPISODE');
  assert.strictEqual(res3.params.episode, '7');
});

test('PodcastAudioStreamVoiceCommander - parses playback controls (RESUME_PLAYBACK and PAUSE_PLAYBACK)', () => {
  const commander = new PodcastAudioStreamVoiceCommander();

  const resResume = commander.parseVoiceGrammar('resume audio');
  assert.strictEqual(resResume.matched, true);
  assert.strictEqual(resResume.intent, 'RESUME_PLAYBACK');
  assert.ok(resResume.response.includes('Resuming'));

  const resContinue = commander.parseVoiceGrammar('continue podcast');
  assert.strictEqual(resContinue.matched, true);
  assert.strictEqual(resContinue.intent, 'RESUME_PLAYBACK');

  const resPause = commander.parseVoiceGrammar('pause audio');
  assert.strictEqual(resPause.matched, true);
  assert.strictEqual(resPause.intent, 'PAUSE_PLAYBACK');
  assert.ok(resPause.response.includes('paused'));

  const resStop = commander.parseVoiceGrammar('stop playback');
  assert.strictEqual(resStop.matched, true);
  assert.strictEqual(resStop.intent, 'PAUSE_PLAYBACK');
});

test('PodcastAudioStreamVoiceCommander - parses SKIP_FORWARD duration grammar and defaults', () => {
  const commander = new PodcastAudioStreamVoiceCommander();

  const res1 = commander.parseVoiceGrammar('skip forward 30 seconds');
  assert.strictEqual(res1.matched, true);
  assert.strictEqual(res1.intent, 'SKIP_FORWARD');
  assert.strictEqual(res1.params.seconds, 30);
  assert.ok(res1.response.includes('30 seconds'));

  const res2 = commander.parseVoiceGrammar('skip ahead 15s');
  assert.strictEqual(res2.matched, true);
  assert.strictEqual(res2.intent, 'SKIP_FORWARD');
  assert.strictEqual(res2.params.seconds, 15);

  const res3 = commander.parseVoiceGrammar('fast forward 45 secs');
  assert.strictEqual(res3.matched, true);
  assert.strictEqual(res3.intent, 'SKIP_FORWARD');
  assert.strictEqual(res3.params.seconds, 45);

  const resWord = commander.parseVoiceGrammar('skip forward twenty seconds');
  assert.strictEqual(resWord.matched, true);
  assert.strictEqual(resWord.intent, 'SKIP_FORWARD');
  assert.strictEqual(resWord.params.seconds, 20);

  // Default duration when no seconds specified
  const resDefault = commander.parseVoiceGrammar('skip forward');
  assert.strictEqual(resDefault.matched, true);
  assert.strictEqual(resDefault.intent, 'SKIP_FORWARD');
  assert.strictEqual(resDefault.params.seconds, 30);
});

test('PodcastAudioStreamVoiceCommander - parses REWIND duration grammar and defaults', () => {
  const commander = new PodcastAudioStreamVoiceCommander();

  const res1 = commander.parseVoiceGrammar('rewind 15 seconds');
  assert.strictEqual(res1.matched, true);
  assert.strictEqual(res1.intent, 'REWIND');
  assert.strictEqual(res1.params.seconds, 15);
  assert.ok(res1.response.includes('15 seconds'));

  const res2 = commander.parseVoiceGrammar('skip back 30 seconds');
  assert.strictEqual(res2.matched, true);
  assert.strictEqual(res2.intent, 'REWIND');
  assert.strictEqual(res2.params.seconds, 30);

  const res3 = commander.parseVoiceGrammar('go back 10s');
  assert.strictEqual(res3.matched, true);
  assert.strictEqual(res3.intent, 'REWIND');
  assert.strictEqual(res3.params.seconds, 10);

  const resWord = commander.parseVoiceGrammar('rewind fifteen seconds');
  assert.strictEqual(resWord.matched, true);
  assert.strictEqual(resWord.intent, 'REWIND');
  assert.strictEqual(resWord.params.seconds, 15);

  // Default duration when no seconds specified
  const resDefault = commander.parseVoiceGrammar('rewind');
  assert.strictEqual(resDefault.matched, true);
  assert.strictEqual(resDefault.intent, 'REWIND');
  assert.strictEqual(resDefault.params.seconds, 15);
});

test('PodcastAudioStreamVoiceCommander - parses ADJUST_SPEED / playback rate grammars', () => {
  const commander = new PodcastAudioStreamVoiceCommander();

  const res1 = commander.parseVoiceGrammar('adjust speed 1.5x');
  assert.strictEqual(res1.matched, true);
  assert.strictEqual(res1.intent, 'ADJUST_SPEED');
  assert.strictEqual(res1.params.rate, 1.5);
  assert.ok(res1.response.includes('1.5x'));

  const res2 = commander.parseVoiceGrammar('play at 2x');
  assert.strictEqual(res2.matched, true);
  assert.strictEqual(res2.intent, 'ADJUST_SPEED');
  assert.strictEqual(res2.params.rate, 2.0);

  const res3 = commander.parseVoiceGrammar('playback rate 1.25');
  assert.strictEqual(res3.matched, true);
  assert.strictEqual(res3.intent, 'ADJUST_SPEED');
  assert.strictEqual(res3.params.rate, 1.25);

  const res4 = commander.parseVoiceGrammar('set speed to 0.75');
  assert.strictEqual(res4.matched, true);
  assert.strictEqual(res4.intent, 'ADJUST_SPEED');
  assert.strictEqual(res4.params.rate, 0.75);

  const res5 = commander.parseVoiceGrammar('change speed to double');
  assert.strictEqual(res5.matched, true);
  assert.strictEqual(res5.intent, 'ADJUST_SPEED');
  assert.strictEqual(res5.params.rate, 2.0);
});

test('PodcastAudioStreamVoiceCommander - parses SEARCH_PODCAST query grammar', () => {
  const commander = new PodcastAudioStreamVoiceCommander();

  const res1 = commander.parseVoiceGrammar('search podcast web audio dsp');
  assert.strictEqual(res1.matched, true);
  assert.strictEqual(res1.intent, 'SEARCH_PODCAST');
  assert.strictEqual(res1.params.query, 'web audio dsp');
  assert.ok(res1.response.includes('web audio dsp'));

  const res2 = commander.parseVoiceGrammar('find episode machine learning voice');
  assert.strictEqual(res2.matched, true);
  assert.strictEqual(res2.intent, 'SEARCH_PODCAST');
  assert.strictEqual(res2.params.query, 'machine learning voice');

  const res3 = commander.parseVoiceGrammar('search for modern frontends');
  assert.strictEqual(res3.matched, true);
  assert.strictEqual(res3.intent, 'SEARCH_PODCAST');
  assert.strictEqual(res3.params.query, 'modern frontends');
});

test('PodcastAudioStreamVoiceCommander - parses BOOKMARK_TIMESTAMP and TOGGLE_CONTRAST grammars', () => {
  const commander = new PodcastAudioStreamVoiceCommander();

  const resBookmark1 = commander.parseVoiceGrammar('bookmark timestamp');
  assert.strictEqual(resBookmark1.matched, true);
  assert.strictEqual(resBookmark1.intent, 'BOOKMARK_TIMESTAMP');
  assert.ok(resBookmark1.response.includes('Timestamp bookmarked'));

  const resBookmark2 = commander.parseVoiceGrammar('save highlight');
  assert.strictEqual(resBookmark2.matched, true);
  assert.strictEqual(resBookmark2.intent, 'BOOKMARK_TIMESTAMP');

  const resContrast1 = commander.parseVoiceGrammar('toggle contrast');
  assert.strictEqual(resContrast1.matched, true);
  assert.strictEqual(resContrast1.intent, 'TOGGLE_CONTRAST');
  assert.ok(resContrast1.response.includes('high-contrast'));

  const resContrast2 = commander.parseVoiceGrammar('activate dark mode');
  assert.strictEqual(resContrast2.matched, true);
  assert.strictEqual(resContrast2.intent, 'TOGGLE_CONTRAST');
});

test('PodcastAudioStreamVoiceCommander - parses READ_SUMMARY and HELP grammars', () => {
  const commander = new PodcastAudioStreamVoiceCommander();

  const resSummary1 = commander.parseVoiceGrammar('read episode summary');
  assert.strictEqual(resSummary1.matched, true);
  assert.strictEqual(resSummary1.intent, 'READ_SUMMARY');
  assert.ok(resSummary1.response.includes('show notes'));

  const resSummary2 = commander.parseVoiceGrammar('read show notes');
  assert.strictEqual(resSummary2.matched, true);
  assert.strictEqual(resSummary2.intent, 'READ_SUMMARY');

  const resHelp = commander.parseVoiceGrammar('help commands');
  assert.strictEqual(resHelp.matched, true);
  assert.strictEqual(resHelp.intent, 'HELP');
  assert.ok(resHelp.response.includes('Available commands'));
});

test('PodcastAudioStreamVoiceCommander - handles empty or unrecognized speech with fallback', () => {
  const commander = new PodcastAudioStreamVoiceCommander();

  // Empty string
  const emptyRes = commander.parseVoiceGrammar('');
  assert.strictEqual(emptyRes.matched, false);
  assert.strictEqual(emptyRes.intent, 'UNKNOWN');
  assert.strictEqual(emptyRes.confidence, 0);

  // Whitespace only
  const whiteRes = commander.parseVoiceGrammar('   \t\n  ');
  assert.strictEqual(whiteRes.matched, false);
  assert.strictEqual(whiteRes.intent, 'UNKNOWN');

  // Unrecognized phrase
  const fallbackRes = commander.parseVoiceGrammar('beam me up scotty to the enterprise');
  assert.strictEqual(fallbackRes.matched, false);
  assert.strictEqual(fallbackRes.intent, 'FALLBACK');
  assert.strictEqual(fallbackRes.confidence, 0);
  assert.ok(fallbackRes.response.includes('not recognized'));
});

test('PodcastAudioStreamVoiceCommander - registers custom commands with handlers', () => {
  const commander = new PodcastAudioStreamVoiceCommander();
  let customExecuted = false;

  commander.registerCommand(
    'boost_bass',
    /boost\s+(?:the\s+)?bass/i,
    () => {
      customExecuted = true;
      return { bassBoosted: true };
    },
    'Bass frequencies amplified by 6dB.'
  );

  const res = commander.parseVoiceGrammar('boost the bass');
  assert.strictEqual(res.matched, true);
  assert.strictEqual(res.intent, 'BOOST_BASS');
  assert.strictEqual(res.confidence, 1.0);
  assert.strictEqual(res.response, 'Bass frequencies amplified by 6dB.');

  assert.strictEqual(customExecuted, false);
  res.callback();
  assert.strictEqual(customExecuted, true);
});

test('PodcastAudioStreamVoiceCommander - executeCommand mutates playback state accurately', () => {
  const commander = new PodcastAudioStreamVoiceCommander();
  const initialTime = commander.getPlaybackState().currentTime;

  // 1. Skip forward 30 seconds
  commander.executeCommand('skip forward 30 seconds');
  assert.strictEqual(commander.getPlaybackState().currentTime, initialTime + 30);

  // 2. Rewind 15 seconds
  commander.executeCommand('rewind 15 seconds');
  assert.strictEqual(commander.getPlaybackState().currentTime, initialTime + 15);

  // 3. Adjust speed
  commander.executeCommand('adjust speed 1.75x');
  assert.strictEqual(commander.getPlaybackState().playbackRate, 1.75);

  // 4. Play and Pause toggles
  commander.executeCommand('resume audio');
  assert.strictEqual(commander.getPlaybackState().isPlaying, true);

  commander.executeCommand('pause audio');
  assert.strictEqual(commander.getPlaybackState().isPlaying, false);

  // 5. Add bookmark
  const initialBookmarksCount = commander.getPlaybackState().bookmarks.length;
  commander.executeCommand('bookmark timestamp');
  assert.strictEqual(commander.getPlaybackState().bookmarks.length, initialBookmarksCount + 1);

  // 6. Play new episode
  commander.executeCommand('play episode Scalable Microservices Architecture');
  assert.ok(commander.getPlaybackState().currentEpisode.title.includes('Scalable Microservices Architecture'));
  assert.strictEqual(commander.getPlaybackState().isPlaying, true);
});

test('PodcastAudioStreamVoiceCommander - records and clears command history', () => {
  const commander = new PodcastAudioStreamVoiceCommander({ maxHistory: 3 });

  commander.executeCommand('skip forward 30 seconds');
  commander.executeCommand('rewind 15 seconds');
  commander.executeCommand('bookmark timestamp');

  let history = commander.getCommandHistory();
  assert.strictEqual(history.length, 3);
  assert.strictEqual(history[0].intent, 'BOOKMARK_TIMESTAMP');
  assert.strictEqual(history[1].intent, 'REWIND');
  assert.strictEqual(history[2].intent, 'SKIP_FORWARD');

  // Push 4th command, should cap at maxHistory (3)
  commander.executeCommand('pause audio');
  history = commander.getCommandHistory();
  assert.strictEqual(history.length, 3);
  assert.strictEqual(history[0].intent, 'PAUSE_PLAYBACK');

  // Clear history
  commander.clearHistory();
  assert.strictEqual(commander.getCommandHistory().length, 0);
});

test('PodcastAudioStreamVoiceCommander - Event Emitter support (on, off, emit)', () => {
  const commander = new PodcastAudioStreamVoiceCommander();
  let receivedData = null;

  const unsubscribe = commander.on('test_event', (data) => {
    receivedData = data;
  });

  commander.emit('test_event', { success: true, count: 42 });
  assert.deepStrictEqual(receivedData, { success: true, count: 42 });

  // Unsubscribe
  unsubscribe();
  commander.emit('test_event', { success: false });
  assert.deepStrictEqual(receivedData, { success: true, count: 42 });
});

test('PodcastAudioStreamVoiceCommander - speech synthesis dispatch with mock and headless fallback', () => {
  let spokenText = null;
  const mockSynth = {
    cancel() {},
    speak(utterance) {
      spokenText = utterance;
    }
  };

  const commander = new PodcastAudioStreamVoiceCommander({ speechSynth: mockSynth });
  const result = commander.synthesizeResponse('Podcast speech synthesis test.');
  assert.strictEqual(result, 'Podcast speech synthesis test.');
  assert.strictEqual(spokenText, 'Podcast speech synthesis test.');
  assert.strictEqual(commander.getLastResponse(), 'Podcast speech synthesis test.');

  // Headless / null speechSynth
  const headlessCommander = new PodcastAudioStreamVoiceCommander({ speechSynth: null });
  const headlessResult = headlessCommander.synthesizeResponse('Silent headless message.');
  assert.strictEqual(headlessResult, 'Silent headless message.');
});

test('PodcastAudioStreamVoiceCommander - time formatting helper converts seconds to MM:SS and HH:MM:SS', () => {
  const commander = new PodcastAudioStreamVoiceCommander();
  assert.strictEqual(commander.formatTime(0), '00:00');
  assert.strictEqual(commander.formatTime(65), '01:05');
  assert.strictEqual(commander.formatTime(145), '02:25');
  assert.strictEqual(commander.formatTime(3600), '01:00:00');
  assert.strictEqual(commander.formatTime(3665), '01:01:05');
});
