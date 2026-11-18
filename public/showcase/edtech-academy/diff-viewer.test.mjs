import test from 'node:test';
import assert from 'node:assert/strict';
import { EdtechAcademyDiffInspector } from './diff-viewer.js';

test('EdtechAcademyDiffInspector - computes diff on identical text', () => {
  const inspector = new EdtechAcademyDiffInspector();
  const text = 'module: 1\ncredits: 4\ngrade: A';
  const result = inspector.computeDiff(text, text);

  assert.equal(result.metrics.additions, 0);
  assert.equal(result.metrics.deletions, 0);
  assert.equal(result.metrics.unchanged, 3);
  assert.equal(result.metrics.changePercentage, 0);
  assert.equal(result.lines.length, 3);
});

test('EdtechAcademyDiffInspector - computes additions and deletions accurately', () => {
  const inspector = new EdtechAcademyDiffInspector();
  const oldText = 'term: spring\nexam: closed-book';
  const newText = 'term: spring\nexam: open-book\ncalculator: permitted';

  const result = inspector.computeDiff(oldText, newText);

  assert.ok(result.metrics.additions >= 1);
  assert.ok(result.metrics.deletions >= 1);
  assert.ok(result.metrics.changePercentage > 0);
});

test('EdtechAcademyDiffInspector - handles empty strings gracefully', () => {
  const inspector = new EdtechAcademyDiffInspector();
  const result = inspector.computeDiff('', '');

  assert.equal(result.metrics.additions, 0);
  assert.equal(result.metrics.deletions, 0);
  assert.equal(result.metrics.changePercentage, 0);
});

test('EdtechAcademyDiffInspector - loads built-in edtech presets', () => {
  const inspector = new EdtechAcademyDiffInspector();
  const keys = inspector.getPresetKeys();

  assert.ok(keys.includes('syllabusRevision'));
  assert.ok(keys.includes('quizQuestionTuning'));
  assert.ok(keys.includes('rubricCriteria'));

  const syllabus = inspector.getPreset('syllabusRevision');
  assert.ok(syllabus.left.includes('Fall 2025'));
  assert.ok(syllabus.right.includes('Fall 2026'));
});
