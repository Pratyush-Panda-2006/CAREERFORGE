import test from 'node:test';
import assert from 'node:assert/strict';
import { MusicDawStudioFilterEngine, SAMPLE_MUSIC_DATA } from './search-filter.js';

test('MusicDawStudioFilterEngine - case-insensitive keyword search', () => {
  const engine = new MusicDawStudioFilterEngine(SAMPLE_MUSIC_DATA);
  const synth = engine.filterByKeyword('synth');
  assert.equal(synth.length, 1);
  assert.equal(synth[0].name, 'Cyberpunk Arp Lead');

  const upperQuery = engine.filterByKeyword('AMBIENT');
  assert.equal(upperQuery.length, 1);
  assert.equal(upperQuery[0].name, 'Dreamy Ambient Pad Chords');
});

test('MusicDawStudioFilterEngine - compound tag filtering', () => {
  const engine = new MusicDawStudioFilterEngine(SAMPLE_MUSIC_DATA);
  engine.toggleTag('drums');
  let drumTracks = engine.getFilteredAndSorted();
  assert.equal(drumTracks.length, 2); // Vintage Vinyl & Glitch Percussion

  engine.toggleTag('vintage');
  let vintageDrums = engine.getFilteredAndSorted();
  assert.equal(vintageDrums.length, 1);
  assert.equal(vintageDrums[0].name, 'Vintage Vinyl Drum Break');

  // Untoggle
  engine.toggleTag('vintage');
  assert.equal(engine.getFilteredAndSorted().length, 2);
});

test('MusicDawStudioFilterEngine - multi-column ascending/descending sorting precision', () => {
  const engine = new MusicDawStudioFilterEngine(SAMPLE_MUSIC_DATA);

  // BPM ascending
  engine.sort('bpm', 'asc');
  let sortedBpmAsc = engine.getFilteredAndSorted();
  assert.equal(sortedBpmAsc[0].bpm, 95);
  assert.equal(sortedBpmAsc[sortedBpmAsc.length - 1].bpm, 140);

  // BPM descending
  engine.sort('bpm', 'desc');
  let sortedBpmDesc = engine.getFilteredAndSorted();
  assert.equal(sortedBpmDesc[0].bpm, 140);
  assert.equal(sortedBpmDesc[sortedBpmDesc.length - 1].bpm, 95);

  // Name alphabetical
  engine.sort('name', 'asc');
  let sortedNameAsc = engine.getFilteredAndSorted();
  assert.equal(sortedNameAsc[0].name, 'Analog Warmth 808 Bass');
});

test('MusicDawStudioFilterEngine - combined search, tag, and sort', () => {
  const engine = new MusicDawStudioFilterEngine(SAMPLE_MUSIC_DATA);
  engine.filterByKeyword('Drum');
  engine.toggleTag('drums');
  engine.sort('bpm', 'desc');

  const results = engine.getFilteredAndSorted();
  assert.equal(results.length, 1);
  assert.equal(results[0].name, 'Vintage Vinyl Drum Break');
});

test('MusicDawStudioFilterEngine - reset filters restores complete dataset', () => {
  const engine = new MusicDawStudioFilterEngine(SAMPLE_MUSIC_DATA);
  engine.filterByKeyword('nonexistent-sample');
  assert.equal(engine.getFilteredAndSorted().length, 0);

  engine.resetFilters();
  assert.equal(engine.getFilteredAndSorted().length, SAMPLE_MUSIC_DATA.length);
});
