import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RoboticsAutomataWhiteboardCanvas } from './canvas-whiteboard.js';

test('RoboticsAutomataWhiteboardCanvas - point distance interpolation and smoothing', () => {
  const wb = new RoboticsAutomataWhiteboardCanvas({ smoothing: 0.5 });
  const p1 = wb._smoothPoint({ x: 0, y: 0 }, { x: 100, y: 100 }, 0.5);
  assert.strictEqual(p1.x, 50);
  assert.strictEqual(p1.y, 50);

  const d = wb._distance({ x: 0, y: 0 }, { x: 3, y: 4 });
  assert.strictEqual(d, 5);
});

test('RoboticsAutomataWhiteboardCanvas - stroke history boundary limits', () => {
  const wb = new RoboticsAutomataWhiteboardCanvas({ maxHistory: 3 });
  for (let i = 0; i < 5; i++) {
    wb.startStroke(i * 10, i * 10);
    wb.endStroke();
  }
  const history = wb.getHistory();
  assert.strictEqual(history.length, 3);
  assert.strictEqual(history[0].points[0].x, 20);
  assert.strictEqual(history[2].points[0].x, 40);
});

test('RoboticsAutomataWhiteboardCanvas - SVG path serialization', () => {
  const wb = new RoboticsAutomataWhiteboardCanvas({ strokeColor: '#ff0000', strokeWidth: 5 });
  wb.startStroke(10, 20);
  wb.continueStroke(30, 40);
  wb.endStroke();

  const svg = wb.exportSVG();
  assert.ok(typeof svg === 'string' && svg.length > 0);
  assert.ok(svg.includes('<svg'));
  assert.ok(svg.includes('</svg>'));
  assert.ok(svg.includes('#ff0000'));
  assert.ok(svg.includes('stroke-width="5"'));
  assert.ok(svg.includes('M 10 20'));
});

test('RoboticsAutomataWhiteboardCanvas - undo and redo stacks', () => {
  const wb = new RoboticsAutomataWhiteboardCanvas({ maxHistory: 10 });
  wb.startStroke(0, 0);
  wb.endStroke();
  wb.startStroke(100, 100);
  wb.endStroke();

  assert.strictEqual(wb.getHistory().length, 2);

  const undone = wb.undo();
  assert.ok(undone);
  assert.strictEqual(wb.getHistory().length, 1);

  const redone = wb.redo();
  assert.ok(redone);
  assert.strictEqual(wb.getHistory().length, 2);

  wb.clear();
  assert.strictEqual(wb.getHistory().length, 0);
  assert.strictEqual(wb.undo(), null);
  assert.strictEqual(wb.redo(), null);
});
