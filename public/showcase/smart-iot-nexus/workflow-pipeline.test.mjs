import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SmartIotNexusPipelineEngine } from './workflow-pipeline.js';

test('SmartIotNexusPipelineEngine - transitions device tasks between columns accurately', () => {
  const engine = new SmartIotNexusPipelineEngine();
  const cols = engine.getColumns();

  assert.strictEqual(cols.backlog.tasks.length, 2);
  assert.strictEqual(cols.in_progress.tasks.length, 1);

  const moved = engine.moveCard('IOT-101', 'backlog', 'in_progress');
  assert.strictEqual(moved, true);

  assert.strictEqual(cols.backlog.tasks.length, 1);
  assert.strictEqual(cols.in_progress.tasks.length, 2);
  assert.strictEqual(cols.in_progress.tasks[1].id, 'IOT-101');
});

test('SmartIotNexusPipelineEngine - enforces WIP limit threshold guards on fleet stages', () => {
  const engine = new SmartIotNexusPipelineEngine({
    columns: {
      prov: { id: 'prov', title: 'Provisioning', wipLimit: 2, tasks: [{ id: 'D1' }] },
      flash: { id: 'flash', title: 'Flashing', wipLimit: 1, tasks: [{ id: 'D2' }] }
    }
  });

  assert.strictEqual(engine.checkWipLimit('flash'), true);
  assert.throws(() => {
    engine.moveCard('D1', 'prov', 'flash');
  }, /WIP limit exceeded/);
});

test('SmartIotNexusPipelineEngine - adds edge task and exports valid state JSON', () => {
  const engine = new SmartIotNexusPipelineEngine();
  const card = engine.addCard('backlog', {
    id: 'IOT-999',
    title: 'CAN-Bus Telemetry Bridge Firmware',
    desc: 'Automotive ISO-TP diagnostic PID sniffer over Wi-Fi bridge',
    priority: 'high',
    assignee: 'Embedded Dev Liam'
  });

  assert.strictEqual(card.id, 'IOT-999');
  assert.strictEqual(engine.getColumns().backlog.tasks.some(t => t.id === 'IOT-999'), true);

  const jsonStr = engine.exportPipelineJSON();
  const parsed = JSON.parse(jsonStr);
  assert.ok(parsed.backlog);
  assert.ok(parsed.backlog.tasks.some(t => t.id === 'IOT-999'));
});

test('SmartIotNexusPipelineEngine - removes card accurately', () => {
  const engine = new SmartIotNexusPipelineEngine();
  const removed = engine.removeCard('IOT-100');

  assert.ok(removed);
  assert.strictEqual(removed.id, 'IOT-100');
  assert.strictEqual(engine.getColumns().completed.tasks.length, 0);
});
