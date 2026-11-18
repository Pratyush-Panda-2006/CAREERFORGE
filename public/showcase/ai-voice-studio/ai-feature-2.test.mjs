import test from 'node:test';
import assert from 'node:assert/strict';
import { AiVoiceStudioFilterEngine } from './filter-engine.js';

test('AiVoiceStudioFilterEngine - filterByKeyword performs case-insensitive search across name, type, accent, and tags', () => {
  const engine = new AiVoiceStudioFilterEngine();

  // Search by voice name
  const aura = engine.filterByKeyword('aura');
  assert.equal(aura.length, 1);
  assert.equal(aura[0].id, 'vs-1');

  // Search by accent uppercase
  const british = engine.filterByKeyword('BRITISH');
  assert.equal(british.length, 1);
  assert.equal(british[0].name, 'Sol Modern Conversational');

  // Search by tag
  const cinematic = engine.filterByKeyword('cinematic');
  assert.equal(cinematic.length, 1);
  assert.equal(cinematic[0].id, 'vs-3');

  // Search with no matches
  const none = engine.filterByKeyword('nonexistent-robot');
  assert.equal(none.length, 0);

  // Clear query restores all
  const all = engine.filterByKeyword('');
  assert.equal(all.length, 6);
});

test('AiVoiceStudioFilterEngine - compound tag filtering strictly enforces all selected tags', () => {
  const engine = new AiVoiceStudioFilterEngine();

  // Single tag filter
  engine.toggleTag('studio');
  const studioVoices = engine.apply();
  assert.equal(studioVoices.length, 1);
  assert.equal(studioVoices[0].id, 'vs-1');

  engine.clearTags();

  // Compound tags: 'calm' and 'soft'
  engine.toggleTag('calm');
  engine.toggleTag('soft');
  const calmSoft = engine.apply();
  assert.equal(calmSoft.length, 1);
  assert.equal(calmSoft[0].id, 'vs-4');

  // Clear tags
  engine.clearTags();
  assert.equal(engine.apply().length, 6);
});

test('AiVoiceStudioFilterEngine - sort handles ascending and descending ordering accurately', () => {
  const engine = new AiVoiceStudioFilterEngine();

  // Clarity score descending
  const byClarityDesc = engine.sort('clarityScore', 'desc');
  assert.equal(byClarityDesc[0].clarityScore, 99.4); // Aura
  assert.equal(byClarityDesc[byClarityDesc.length - 1].clarityScore, 96.9); // Titan

  // Latency ascending (fastest first)
  const byLatencyAsc = engine.sort('latencyMs', 'asc');
  assert.equal(byLatencyAsc[0].latencyMs, 1.4); // Lyra
  assert.equal(byLatencyAsc[byLatencyAsc.length - 1].latencyMs, 3.4); // Zephyr

  // Sample rate descending
  const bySampleRateDesc = engine.sort('sampleRate', 'desc');
  assert.equal(bySampleRateDesc[0].sampleRate, 96000); // Zephyr
});

test('AiVoiceStudioFilterEngine - setRange filters items within numerical boundaries', () => {
  const engine = new AiVoiceStudioFilterEngine();

  // Latency range between 1.5ms and 2.0ms
  engine.setRange('latencyMs', 1.5, 2.0);
  const lowLatency = engine.apply();
  assert.equal(lowLatency.length, 2); // Sol (1.8ms) and Titan (1.9ms)
  assert.ok(lowLatency.every(v => v.latencyMs >= 1.5 && v.latencyMs <= 2.0));

  // Clear range
  engine.setRange('latencyMs', null, null);
  assert.equal(engine.apply().length, 6);
});

test('AiVoiceStudioFilterEngine - reset completely restores default state and parameters', () => {
  const engine = new AiVoiceStudioFilterEngine();
  engine.filterByKeyword('zephyr');
  engine.toggleTag('hd');
  engine.sort('latencyMs', 'desc');

  assert.equal(engine.apply().length, 1);

  const resetItems = engine.reset();
  assert.equal(resetItems.length, 6);
  assert.equal(engine.getActiveTags().length, 0);
  assert.equal(engine.searchQuery, '');
  assert.equal(engine.sortField, 'clarityScore');
  assert.equal(engine.sortDirection, 'desc');
});

test('AiVoiceStudioFilterEngine - subscribe alerts callbacks on filter adjustments', () => {
  const engine = new AiVoiceStudioFilterEngine();
  let callCount = 0;
  let lastState = null;

  const unsubscribe = engine.subscribe(state => {
    callCount++;
    lastState = state;
  });

  engine.filterByKeyword('Aura');
  assert.equal(callCount, 1);
  assert.equal(lastState.query, 'aura');
  assert.equal(lastState.count, 1);

  engine.toggleTag('podcast');
  assert.equal(callCount, 2);
  assert.ok(lastState.tags.includes('podcast'));

  unsubscribe();
  engine.clearTags();
  assert.equal(callCount, 2); // Unsubscribed
});
