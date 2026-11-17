import test from 'node:test';
import assert from 'node:assert/strict';
import { RoboticsAutomataExportEngine, SAMPLE_ROBOT_EXPORT_DATA } from './export-engine.js';

test('RoboticsAutomataExportEngine - CSV escaping of commas and quotes', () => {
  const engine = new RoboticsAutomataExportEngine();
  const testData = [
    { id: '1', note: 'Standard robot' },
    { id: '2', note: 'Manipulator, with comma' },
    { id: '3', note: 'Arm "6-DOF" model' },
    { id: '4', note: 'Complex, "nested" note, with comma' }
  ];

  const csv = engine.toCSVString(testData);
  assert.ok(csv.includes('id,note'));
  assert.ok(csv.includes('"Manipulator, with comma"'));
  assert.ok(csv.includes('"Arm ""6-DOF"" model"'));
  assert.ok(csv.includes('"Complex, ""nested"" note, with comma"'));
});

test('RoboticsAutomataExportEngine - valid JSON blob creation and structure', () => {
  const engine = new RoboticsAutomataExportEngine();
  const blob = engine.toJSONBlob(SAMPLE_ROBOT_EXPORT_DATA);
  assert.equal(blob.type, 'application/json');

  let rawJson = '';
  if (typeof Blob !== 'undefined' && blob instanceof Blob) {
    assert.equal(blob.type, 'application/json');
  } else {
    rawJson = blob.data;
    const parsed = JSON.parse(rawJson);
    assert.equal(parsed.length, SAMPLE_ROBOT_EXPORT_DATA.length);
    assert.equal(parsed[0].id, 'BOT-01');
  }
});

test('RoboticsAutomataExportEngine - CSV blob MIME type is text/csv', () => {
  const engine = new RoboticsAutomataExportEngine();
  const blob = engine.toCSVBlob(SAMPLE_ROBOT_EXPORT_DATA);
  assert.ok(blob.type.includes('text/csv'));
});

test('RoboticsAutomataExportEngine - generateMarkdownSummary format', () => {
  const engine = new RoboticsAutomataExportEngine();
  const md = engine.generateMarkdownSummary(SAMPLE_ROBOT_EXPORT_DATA);
  assert.ok(md.includes('# Robotics Fleet Diagnostics Report'));
  assert.ok(md.includes('| BOT-01 | Cobot Arm V6 - "Titan" | Manipulator | 10 |'));
});

test('RoboticsAutomataExportEngine - escapeCSVField edge cases', () => {
  const engine = new RoboticsAutomataExportEngine();
  assert.equal(engine.escapeCSVField(null), '');
  assert.equal(engine.escapeCSVField(undefined), '');
  assert.equal(engine.escapeCSVField(100), '100');
  assert.equal(engine.escapeCSVField('actuator\nline'), '"actuator\nline"');
});
